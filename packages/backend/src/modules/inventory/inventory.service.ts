import { inventoryRepository, type ProductFilter } from './inventory.repository.js';
import {
  computeNextCycle,
  calculateCondition,
  CONDITION_PRICE_FACTOR,
} from './lifecycle.service.js';
import { eventBus } from '../../common/events/event-bus.js';
import { NotFoundError, ConflictError } from '../../common/errors/index.js';
import type { Product, ProductImage, Prisma } from '@prisma/client';
import type { ProductId, UserId, OrderId } from '../../common/types/branded.js';
import type { PaginationParams } from '../../common/types/pagination.js';
import { buildPaginatedResult } from '../../common/utils/pagination.js';
import type { PaginatedResult } from '../../common/types/pagination.js';
import { asProductId } from '../../common/types/branded.js';

export interface InspectionInput {
  damageFound: boolean;
  notes?: string;
  conditionOverride?: Product['condition'];
}

export class InventoryService {
  async getProduct(id: ProductId): Promise<Product & { images: ProductImage[] }> {
    const product = await inventoryRepository.findById(id);
    if (!product) throw new NotFoundError('Product', id);
    return product;
  }

  async listProducts(
    filter: ProductFilter,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Product & { images: ProductImage[] }>> {
    const { items, total } = await inventoryRepository.findMany(filter, pagination);
    return buildPaginatedResult(items, pagination.limit, total);
  }

  async createProduct(
    data: Omit<Prisma.ProductCreateInput, 'category'> & { categoryId: string },
    adminId: UserId,
  ): Promise<Product> {
    const { categoryId, ...rest } = data;
    const product = await inventoryRepository.create({
      ...rest,
      category: { connect: { id: categoryId } },
    });

    await inventoryRepository.appendLifecycleLog(
      asProductId(product.id),
      'added_to_inventory',
      adminId,
      undefined,
      'Initial inventory entry',
    );

    return product;
  }

  async updateProduct(id: ProductId, data: Prisma.ProductUpdateInput): Promise<Product> {
    const existing = await inventoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Product', id);
    return inventoryRepository.update(id, data);
  }

  async recordInspection(
    productId: ProductId,
    orderId: OrderId,
    inspection: InspectionInput,
    adminId: UserId,
  ): Promise<Product> {
    const product = await inventoryRepository.findById(productId);
    if (!product) throw new NotFoundError('Product', productId);

    if (product.status !== 'in_inspection') {
      throw new ConflictError(
        `Product must be in 'in_inspection' status to record inspection (current: ${product.status})`,
      );
    }

    // Determine next condition
    const newCondition =
      inspection.conditionOverride ??
      (inspection.damageFound ? 'fair' : calculateCondition(product.cycleCount, product.maxCycles));

    // Update product condition and status
    const updated = await inventoryRepository.update(productId, {
      condition: newCondition,
      status: 'in_cleaning',
    });

    await inventoryRepository.appendLifecycleLog(
      productId,
      'inspected',
      adminId,
      orderId,
      inspection.notes,
    );

    if (inspection.damageFound) {
      await inventoryRepository.appendLifecycleLog(
        productId,
        'condition_changed',
        adminId,
        orderId,
        `Condition downgraded to ${newCondition} due to damage`,
      );
    }

    // Emit inspection done event
    eventBus.emit('INSPECTION_DONE', {
      productId,
      orderId,
      damageFound: inspection.damageFound,
      newCondition,
    });

    return updated;
  }

  async markCleaned(productId: ProductId, adminId: UserId): Promise<Product> {
    const product = await inventoryRepository.findById(productId);
    if (!product) throw new NotFoundError('Product', productId);

    if (product.status !== 'in_cleaning') {
      throw new ConflictError(
        `Product must be in 'in_cleaning' status to mark as cleaned (current: ${product.status})`,
      );
    }

    // Increment cycle count and recalculate condition
    const { newCycleCount, newCondition, isEndOfLife } = computeNextCycle(
      product.cycleCount,
      product.maxCycles,
    );

    // Adjust rental price based on new condition
    const newPrice =
      (Number(product.rentalPricePerDay) * CONDITION_PRICE_FACTOR[newCondition]) /
      CONDITION_PRICE_FACTOR[product.condition];

    const newStatus = isEndOfLife ? 'retired' : 'available';

    const updated = await inventoryRepository.update(productId, {
      cycleCount: newCycleCount,
      condition: newCondition,
      status: newStatus,
      rentalPricePerDay: Math.round(newPrice * 100) / 100,
      ...(isEndOfLife && { retiredAt: new Date() }),
    });

    await inventoryRepository.appendLifecycleLog(
      productId,
      'cleaned',
      adminId,
      undefined,
      `Cycle ${newCycleCount}/${product.maxCycles}`,
    );

    if (isEndOfLife) {
      eventBus.emit('PRODUCT_END_OF_LIFE', {
        productId,
        cycleCount: newCycleCount,
      });
    }

    return updated;
  }

  async markDonated(productId: ProductId, adminId: UserId): Promise<Product> {
    const product = await inventoryRepository.findById(productId);
    if (!product) throw new NotFoundError('Product', productId);

    if (product.status !== 'retired') {
      throw new ConflictError(
        `Product must be in 'retired' status to mark as donated (current: ${product.status})`,
      );
    }

    const updated = await inventoryRepository.update(productId, {
      status: 'donated',
    });

    await inventoryRepository.appendLifecycleLog(
      productId,
      'donated',
      adminId,
      undefined,
      `Donated after ${product.cycleCount} cycles`,
    );

    return updated;
  }

  async reserveProducts(productIds: ProductId[], _orderId: OrderId): Promise<void> {
    // Called atomically within order creation transaction — sets status to 'reserved'
    await Promise.all(
      productIds.map((id) => inventoryRepository.update(id, { status: 'reserved' })),
    );
  }

  async releaseReservation(productIds: ProductId[]): Promise<void> {
    await Promise.all(
      productIds.map((id) => inventoryRepository.update(id, { status: 'available' })),
    );
  }

  async markRented(productIds: ProductId[], orderId: OrderId, adminId: UserId): Promise<void> {
    await Promise.all(
      productIds.map(async (id) => {
        await inventoryRepository.update(id, { status: 'rented' });
        await inventoryRepository.appendLifecycleLog(id, 'rented', adminId, orderId);
      }),
    );
  }

  async markReturned(productIds: ProductId[], orderId: OrderId, adminId: UserId): Promise<void> {
    await Promise.all(
      productIds.map(async (id) => {
        await inventoryRepository.update(id, { status: 'in_inspection' });
        await inventoryRepository.appendLifecycleLog(id, 'returned', adminId, orderId);
      }),
    );
  }

  async listUnits(productId: ProductId) {
    return inventoryRepository.listUnitsForProduct(productId);
  }

  async addUnits(productId: ProductId, city: string, quantity: number, adminId: UserId) {
    const existing = await inventoryRepository.findById(productId);
    if (!existing) throw new NotFoundError('Product', productId);
    const created = await inventoryRepository.createUnits(productId, city, quantity);
    await inventoryRepository.appendLifecycleLog(
      productId,
      'added_to_inventory',
      adminId,
      undefined,
      `+${quantity} unit(s) in ${city}`,
    );
    return created;
  }

  async markUnitCleaned(unitId: string, adminId: UserId) {
    const unit = await inventoryRepository.getUnit(unitId);
    if (!unit) throw new NotFoundError('InventoryUnit', unitId);
    if (unit.status !== 'in_cleaning' && unit.status !== 'in_inspection') {
      throw new ConflictError(`Unit status is '${unit.status}', cannot mark cleaned`);
    }
    const { newCycleCount, newCondition, isEndOfLife } = computeNextCycle(
      unit.cycleCount,
      (await inventoryRepository.findById(unit.productId as ProductId))!.maxCycles,
    );
    const updated = await inventoryRepository.updateUnit(unitId, {
      cycleCount: newCycleCount,
      condition: newCondition,
      status: isEndOfLife ? 'retired' : 'available',
      ...(isEndOfLife && { retiredAt: new Date() }),
    });
    await inventoryRepository.appendLifecycleLog(
      unit.productId as ProductId,
      'cleaned',
      adminId,
      undefined,
      `Unit ${unitId} cleaned (cycle ${newCycleCount})`,
    );
    return updated;
  }

  async retireUnit(unitId: string, adminId: UserId) {
    const unit = await inventoryRepository.getUnit(unitId);
    if (!unit) throw new NotFoundError('InventoryUnit', unitId);
    const updated = await inventoryRepository.updateUnit(unitId, {
      status: 'retired',
      retiredAt: new Date(),
    });
    await inventoryRepository.appendLifecycleLog(
      unit.productId as ProductId,
      'marked_for_donation',
      adminId,
      undefined,
      `Unit ${unitId} retired`,
    );
    return updated;
  }

  async donateUnit(unitId: string, adminId: UserId) {
    const unit = await inventoryRepository.getUnit(unitId);
    if (!unit) throw new NotFoundError('InventoryUnit', unitId);
    if (unit.status !== 'retired') {
      throw new ConflictError(`Unit must be retired before donation (current: ${unit.status})`);
    }
    const updated = await inventoryRepository.updateUnit(unitId, { status: 'donated' });
    await inventoryRepository.appendLifecycleLog(
      unit.productId as ProductId,
      'donated',
      adminId,
      undefined,
      `Unit ${unitId} donated after ${unit.cycleCount} cycles`,
    );
    return updated;
  }

  async addImage(
    productId: ProductId,
    data: { url: string; altText?: string; sortOrder?: number; isPrimary?: boolean },
  ): Promise<ProductImage> {
    const product = await inventoryRepository.findById(productId);
    if (!product) throw new NotFoundError('Product', productId);

    return inventoryRepository.addImage(productId, {
      url: data.url,
      altText: data.altText ?? null,
      sortOrder: data.sortOrder ?? 0,
      isPrimary: data.isPrimary ?? false,
    });
  }
}

export const inventoryService = new InventoryService();
