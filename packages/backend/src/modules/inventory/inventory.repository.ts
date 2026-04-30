import { prisma } from '../../config/database.js';
import type {
  Product,
  ProductImage,
  ProductLifecycleLog,
  ProductCondition,
  ProductStatus,
  Prisma,
} from '@prisma/client';
import type { ProductId, UserId } from '../../common/types/branded.js';
import type { PaginationParams } from '../../common/types/pagination.js';

export interface ProductFilter {
  status?: ProductStatus;
  city?: string;
  categoryId?: string;
  gender?: string;
  season?: string;
  sizeEu?: string;
  brand?: string;
  condition?: ProductCondition[];
}

export class InventoryRepository {
  async findById(id: ProductId): Promise<(Product & { images: ProductImage[] }) | null> {
    return prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findMany(
    filter: ProductFilter,
    pagination: PaginationParams,
  ): Promise<{ items: (Product & { images: ProductImage[] })[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      ...(filter.status && { status: filter.status }),
      ...(filter.city && { city: filter.city }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...(filter.gender && { gender: filter.gender as Product['gender'] }),
      ...(filter.season && { season: filter.season as Product['season'] }),
      ...(filter.sizeEu && { sizeEu: filter.sizeEu }),
      ...(filter.brand && { brand: { contains: filter.brand, mode: 'insensitive' } }),
      ...(filter.condition?.length && { condition: { in: filter.condition } }),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' } } },
        take: pagination.limit + 1,
        ...(pagination.cursor && { skip: 1, cursor: { id: pagination.cursor } }),
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({ data });
  }

  async update(id: ProductId, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({ where: { id }, data });
  }

  async addImage(
    productId: ProductId,
    data: Omit<ProductImage, 'id' | 'productId' | 'createdAt'>,
  ): Promise<ProductImage> {
    return prisma.productImage.create({ data: { ...data, productId } });
  }

  async appendLifecycleLog(
    productId: ProductId,
    eventType: ProductLifecycleLog['eventType'],
    performedBy: UserId,
    orderId?: string,
    notes?: string,
  ): Promise<ProductLifecycleLog> {
    return prisma.productLifecycleLog.create({
      data: { productId, eventType, performedBy, orderId, notes },
    });
  }

  async getLifecycleLog(productId: ProductId): Promise<ProductLifecycleLog[]> {
    return prisma.productLifecycleLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listUnitsForProduct(productId: ProductId) {
    return prisma.inventoryUnit.findMany({
      where: { productId },
      orderBy: [{ city: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createUnits(
    productId: ProductId,
    city: string,
    quantity: number,
    condition: ProductCondition = 'new',
  ) {
    const created = [];
    for (let i = 0; i < quantity; i++) {
      const u = await prisma.inventoryUnit.create({
        data: { productId, city, condition, status: 'available', cycleCount: 0 },
      });
      created.push(u);
    }
    return created;
  }

  async updateUnit(unitId: string, data: Prisma.InventoryUnitUpdateInput) {
    return prisma.inventoryUnit.update({ where: { id: unitId }, data });
  }

  async getUnit(unitId: string) {
    return prisma.inventoryUnit.findUnique({ where: { id: unitId } });
  }
}

export const inventoryRepository = new InventoryRepository();
