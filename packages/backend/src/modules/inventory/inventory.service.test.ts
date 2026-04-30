import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from './inventory.service.js';
import { inventoryRepository } from './inventory.repository.js';
import { eventBus } from '../../common/events/event-bus.js';
import type { Product, ProductImage, ProductCondition, InventoryUnit } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../common/errors/index.js';
import type { ProductId, UserId, OrderId } from '../../common/types/branded.js';

vi.mock('./inventory.repository.js', () => ({
  inventoryRepository: {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addImage: vi.fn(),
    appendLifecycleLog: vi.fn().mockResolvedValue({} as any),
    getLifecycleLog: vi.fn(),
    listUnitsForProduct: vi.fn(),
    createUnits: vi.fn(),
    updateUnit: vi.fn(),
    getUnit: vi.fn(),
  },
}));

vi.mock('../../common/events/event-bus.js', () => ({
  eventBus: { emit: vi.fn() },
}));

// ── factories ─────────────────────────────────────────────────

const mockProduct = (
  overrides: Partial<Product & { images: ProductImage[] }> = {},
): Product & { images: ProductImage[] } =>
  ({
    id: 'prod-1',
    nameEn: 'Test Product',
    nameFr: 'Produit Test',
    nameEs: 'Producto de prueba',
    descriptionEn: 'Test description',
    descriptionFr: 'Description test',
    descriptionEs: 'Descripción de prueba',
    brand: 'TestBrand',
    sizeEu: 'M',
    color: 'Blue',
    material: 'Cotton',
    weightGrams: 500,
    gender: 'unisex',
    season: 'all_season',
    condition: 'new' as ProductCondition,
    cycleCount: 0,
    maxCycles: 20,
    rentalPricePerDay: 100 as any,
    purchasePrice: 5000 as any,
    status: 'available',
    city: 'Paris',
    source: 'manual',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    categoryId: 'cat-1',
    images: [],
    ...overrides,
  }) as Product & { images: ProductImage[] };

const mockImage = (overrides: Partial<ProductImage> = {}): ProductImage => ({
  id: 'img-1',
  productId: 'prod-1',
  url: 'https://example.com/img.jpg',
  altText: 'Test image',
  sortOrder: 0,
  isPrimary: false,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

const mockUnit = (overrides: Partial<InventoryUnit> = {}): InventoryUnit => ({
  id: 'unit-1',
  productId: 'prod-1',
  city: 'Paris',
  condition: 'new' as ProductCondition,
  status: 'available',
  cycleCount: 0,
  retiredAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('InventoryService', () => {
  let service: InventoryService;
  const productId = 'prod-1' as any as ProductId;
  const userId = 'user-1' as any as UserId;
  const orderId = 'order-1' as any as OrderId;
  const unitId = 'unit-1';

  beforeEach(() => {
    service = new InventoryService();
    vi.clearAllMocks();
  });

  // ── getProduct ─────────────────────────────────────────────────

  describe('getProduct', () => {
    it('returns product with images', async () => {
      const product = mockProduct({
        images: [mockImage(), mockImage({ id: 'img-2', sortOrder: 1 })],
      });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);

      const result = await service.getProduct(productId);

      expect(result).toBe(product);
      expect(result.images).toHaveLength(2);
    });

    it('throws NotFoundError when product does not exist', async () => {
      vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

      await expect(service.getProduct(productId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── listProducts ───────────────────────────────────────────────

  describe('listProducts', () => {
    it('returns paginated result from repository', async () => {
      const items = [mockProduct({ id: 'p1' }), mockProduct({ id: 'p2' })];
      vi.mocked(inventoryRepository.findMany).mockResolvedValue({ items, total: 20 });

      const result = await service.listProducts({}, { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(20);
      expect(result.nextCursor).toBeNull(); // items ≤ limit means no next page
    });
  });

  // ── createProduct ──────────────────────────────────────────────

  describe('createProduct', () => {
    it('creates product and appends lifecycle log', async () => {
      const created = mockProduct();
      vi.mocked(inventoryRepository.create).mockResolvedValue(created as any);

      const result = await service.createProduct(
        { nameEn: 'New', nameFr: 'Nouveau', nameEs: 'Nuevo', categoryId: 'cat-1' } as any,
        userId,
      );

      expect(result).toBe(created);
      expect(inventoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameEn: 'New',
          category: { connect: { id: 'cat-1' } },
        }),
      );
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        created.id,
        'added_to_inventory',
        userId,
        undefined,
        'Initial inventory entry',
      );
    });
  });

  // ── updateProduct ──────────────────────────────────────────────

  describe('updateProduct', () => {
    it('updates an existing product', async () => {
      const existing = mockProduct();
      const updated = mockProduct({ nameEn: 'Updated' });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(existing);
      vi.mocked(inventoryRepository.update).mockResolvedValue(updated as any);

      const result = await service.updateProduct(productId, { nameEn: 'Updated' });

      expect(result.nameEn).toBe('Updated');
      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, { nameEn: 'Updated' });
    });

    it('throws NotFoundError when product does not exist', async () => {
      vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

      await expect(service.updateProduct(productId, { nameEn: 'Updated' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  // ── recordInspection ───────────────────────────────────────────

  describe('recordInspection', () => {
    const inspectionInput = {
      damageFound: false,
      notes: 'All good',
    };

    it('updates condition via calculateCondition, sets status to in_cleaning, emits event', async () => {
      const product = mockProduct({ status: 'in_inspection', cycleCount: 2, maxCycles: 20 });
      const updated = mockProduct({
        status: 'in_cleaning',
        condition: 'excellent' as ProductCondition,
      });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.update).mockResolvedValue(updated as any);

      const result = await service.recordInspection(productId, orderId, inspectionInput, userId);

      expect(result.status).toBe('in_cleaning');
      // calculateCondition(2, 20) = 2/20 = 0.1 <= 0.25 → 'excellent'
      expect(result.condition).toBe('excellent');
      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, {
        condition: 'excellent',
        status: 'in_cleaning',
      });
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        productId,
        'inspected',
        userId,
        orderId,
        'All good',
      );
      expect(eventBus.emit).toHaveBeenCalledWith('INSPECTION_DONE', {
        productId,
        orderId,
        damageFound: false,
        newCondition: 'excellent',
      });
    });

    it('with damage sets condition to fair and appends extra lifecycle log', async () => {
      const product = mockProduct({ status: 'in_inspection', cycleCount: 0, maxCycles: 20 });
      const updated = mockProduct({ status: 'in_cleaning', condition: 'fair' as ProductCondition });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.update).mockResolvedValue(updated as any);

      await service.recordInspection(
        productId,
        orderId,
        { damageFound: true, notes: 'Scratches' },
        userId,
      );

      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, {
        condition: 'fair',
        status: 'in_cleaning',
      });
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledTimes(2);
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        productId,
        'condition_changed',
        userId,
        orderId,
        'Condition downgraded to fair due to damage',
      );
      expect(eventBus.emit).toHaveBeenCalledWith('INSPECTION_DONE', {
        productId,
        orderId,
        damageFound: true,
        newCondition: 'fair',
      });
    });

    it('with conditionOverride uses the override value', async () => {
      const product = mockProduct({ status: 'in_inspection', cycleCount: 0, maxCycles: 20 });
      const updated = mockProduct({ status: 'in_cleaning', condition: 'good' as ProductCondition });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.update).mockResolvedValue(updated as any);

      await service.recordInspection(
        productId,
        orderId,
        { damageFound: false, conditionOverride: 'good' as ProductCondition },
        userId,
      );

      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, {
        condition: 'good',
        status: 'in_cleaning',
      });
      expect(eventBus.emit).toHaveBeenCalledWith('INSPECTION_DONE', {
        productId,
        orderId,
        damageFound: false,
        newCondition: 'good',
      });
    });

    it('throws ConflictError when product status is not in_inspection', async () => {
      const product = mockProduct({ status: 'available' });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);

      await expect(
        service.recordInspection(productId, orderId, inspectionInput, userId),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws NotFoundError when product does not exist', async () => {
      vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

      await expect(
        service.recordInspection(productId, orderId, inspectionInput, userId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── markCleaned ────────────────────────────────────────────────

  describe('markCleaned', () => {
    it('increments cycle, recalculates condition and price, sets status to available', async () => {
      // cycleCount=0, maxCycles=20 → computeNextCycle → {1, 'excellent', false}
      // price = 100 * 0.9 / 1.0 = 90
      const product = mockProduct({
        status: 'in_cleaning',
        cycleCount: 0,
        maxCycles: 20,
        condition: 'new' as ProductCondition,
        rentalPricePerDay: 100 as any,
      });
      const updated = mockProduct({
        status: 'available',
        cycleCount: 1,
        condition: 'excellent' as ProductCondition,
        rentalPricePerDay: 90 as any,
      });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.update).mockResolvedValue(updated as any);

      const result = await service.markCleaned(productId, userId);

      expect(result.status).toBe('available');
      expect(result.cycleCount).toBe(1);
      expect(result.condition).toBe('excellent');
      expect(inventoryRepository.update).toHaveBeenCalledWith(
        productId,
        expect.objectContaining({
          cycleCount: 1,
          condition: 'excellent',
          status: 'available',
          rentalPricePerDay: 90,
        }),
      );
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        productId,
        'cleaned',
        userId,
        undefined,
        'Cycle 1/20',
      );
    });

    it('sets status to retired and emits PRODUCT_END_OF_LIFE when end of life', async () => {
      // cycleCount=19, maxCycles=20 → computeNextCycle → {20, 'end_of_life', true}
      const product = mockProduct({
        status: 'in_cleaning',
        cycleCount: 19,
        maxCycles: 20,
        condition: 'new' as ProductCondition,
        rentalPricePerDay: 100 as any,
      });
      const updated = mockProduct({
        status: 'retired',
        cycleCount: 20,
        condition: 'end_of_life' as ProductCondition,
        rentalPricePerDay: 50 as any,
        retiredAt: new Date(),
      });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.update).mockResolvedValue(updated as any);

      const result = await service.markCleaned(productId, userId);

      expect(result.status).toBe('retired');
      expect(eventBus.emit).toHaveBeenCalledWith('PRODUCT_END_OF_LIFE', {
        productId,
        cycleCount: 20,
      });
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        productId,
        'cleaned',
        userId,
        undefined,
        'Cycle 20/20',
      );
    });

    it('throws ConflictError when product status is not in_cleaning', async () => {
      const product = mockProduct({ status: 'available' });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);

      await expect(service.markCleaned(productId, userId)).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws NotFoundError when product does not exist', async () => {
      vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

      await expect(service.markCleaned(productId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── markDonated ────────────────────────────────────────────────

  describe('markDonated', () => {
    it('sets retired product status to donated and appends log', async () => {
      const product = mockProduct({ status: 'retired', cycleCount: 15 });
      const updated = mockProduct({ status: 'donated', cycleCount: 15 });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.update).mockResolvedValue(updated as any);

      const result = await service.markDonated(productId, userId);

      expect(result.status).toBe('donated');
      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, { status: 'donated' });
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        productId,
        'donated',
        userId,
        undefined,
        'Donated after 15 cycles',
      );
    });

    it('throws ConflictError when product status is not retired', async () => {
      const product = mockProduct({ status: 'available' });
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);

      await expect(service.markDonated(productId, userId)).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws NotFoundError when product does not exist', async () => {
      vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

      await expect(service.markDonated(productId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── reserveProducts / releaseReservation / markRented / markReturned ─

  describe('reserveProducts', () => {
    it('sets status to reserved for each product', async () => {
      vi.mocked(inventoryRepository.update).mockResolvedValue(
        mockProduct({ status: 'reserved' }) as any,
      );

      await service.reserveProducts([productId], orderId);

      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, { status: 'reserved' });
    });
  });

  describe('releaseReservation', () => {
    it('sets status to available for each product', async () => {
      vi.mocked(inventoryRepository.update).mockResolvedValue(
        mockProduct({ status: 'available' }) as any,
      );

      await service.releaseReservation([productId]);

      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, { status: 'available' });
    });
  });

  describe('markRented', () => {
    it('sets status to rented and appends lifecycle log for each product', async () => {
      vi.mocked(inventoryRepository.update).mockResolvedValue(
        mockProduct({ status: 'rented' }) as any,
      );

      await service.markRented([productId], orderId, userId);

      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, { status: 'rented' });
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        productId,
        'rented',
        userId,
        orderId,
      );
    });
  });

  describe('markReturned', () => {
    it('sets status to in_inspection and appends lifecycle log for each product', async () => {
      vi.mocked(inventoryRepository.update).mockResolvedValue(
        mockProduct({ status: 'in_inspection' }) as any,
      );

      await service.markReturned([productId], orderId, userId);

      expect(inventoryRepository.update).toHaveBeenCalledWith(productId, {
        status: 'in_inspection',
      });
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        productId,
        'returned',
        userId,
        orderId,
      );
    });
  });

  // ── listUnits ──────────────────────────────────────────────────

  describe('listUnits', () => {
    it('delegates to repository', async () => {
      const units = [mockUnit(), mockUnit({ id: 'unit-2', city: 'Lyon' })];
      vi.mocked(inventoryRepository.listUnitsForProduct).mockResolvedValue(units);

      const result = await service.listUnits(productId);

      expect(result).toBe(units);
      expect(inventoryRepository.listUnitsForProduct).toHaveBeenCalledWith(productId);
    });
  });

  // ── addUnits ───────────────────────────────────────────────────

  describe('addUnits', () => {
    it('creates units and appends lifecycle log', async () => {
      const product = mockProduct();
      const units = [mockUnit(), mockUnit({ id: 'unit-2' })];
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.createUnits).mockResolvedValue(units);

      const result = await service.addUnits(productId, 'Paris', 2, userId);

      expect(result).toBe(units);
      expect(inventoryRepository.createUnits).toHaveBeenCalledWith(productId, 'Paris', 2);
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        productId,
        'added_to_inventory',
        userId,
        undefined,
        '+2 unit(s) in Paris',
      );
    });

    it('throws NotFoundError when product does not exist', async () => {
      vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

      await expect(service.addUnits(productId, 'Paris', 2, userId)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  // ── markUnitCleaned ────────────────────────────────────────────

  describe('markUnitCleaned', () => {
    it('cleans unit in in_cleaning status and increments cycle', async () => {
      const product = mockProduct({ maxCycles: 20 });
      const unit = mockUnit({ status: 'in_cleaning', cycleCount: 3, productId: 'prod-1' });
      const updatedUnit = mockUnit({
        status: 'available',
        cycleCount: 4,
        condition: 'excellent' as ProductCondition,
        productId: 'prod-1',
      });
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(unit);
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.updateUnit).mockResolvedValue(updatedUnit);

      const result = await service.markUnitCleaned(unitId, userId);

      expect(result.status).toBe('available');
      expect(result.cycleCount).toBe(4);
      expect(inventoryRepository.updateUnit).toHaveBeenCalledWith(
        unitId,
        expect.objectContaining({ cycleCount: 4, condition: 'excellent', status: 'available' }),
      );
    });

    it('cleans unit in in_inspection status', async () => {
      const product = mockProduct({ maxCycles: 20 });
      const unit = mockUnit({ status: 'in_inspection', cycleCount: 0, productId: 'prod-1' });
      const updatedUnit = mockUnit({
        status: 'available',
        cycleCount: 1,
        condition: 'excellent' as ProductCondition,
        productId: 'prod-1',
      });
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(unit);
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.updateUnit).mockResolvedValue(updatedUnit);

      const result = await service.markUnitCleaned(unitId, userId);

      expect(result.status).toBe('available');
      expect(result.cycleCount).toBe(1);
    });

    it('throws NotFoundError when unit does not exist', async () => {
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(null);

      await expect(service.markUnitCleaned(unitId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ConflictError when unit status is not in_cleaning or in_inspection', async () => {
      const unit = mockUnit({ status: 'rented' });
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(unit);

      await expect(service.markUnitCleaned(unitId, userId)).rejects.toBeInstanceOf(ConflictError);
    });

    it('sets unit to retired when end of life', async () => {
      const product = mockProduct({ maxCycles: 20 });
      const unit = mockUnit({ status: 'in_cleaning', cycleCount: 19, productId: 'prod-1' });
      const updatedUnit = mockUnit({
        status: 'retired',
        cycleCount: 20,
        condition: 'end_of_life' as ProductCondition,
        productId: 'prod-1',
        retiredAt: new Date(),
      });
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(unit);
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.updateUnit).mockResolvedValue(updatedUnit);

      const result = await service.markUnitCleaned(unitId, userId);

      expect(result.status).toBe('retired');
      expect(inventoryRepository.updateUnit).toHaveBeenCalledWith(
        unitId,
        expect.objectContaining({ status: 'retired', retiredAt: expect.any(Date) }),
      );
    });
  });

  // ── retireUnit ─────────────────────────────────────────────────

  describe('retireUnit', () => {
    it('sets any status unit to retired and appends log', async () => {
      const unit = mockUnit({ status: 'available', cycleCount: 10 });
      const updatedUnit = mockUnit({ status: 'retired', cycleCount: 10, retiredAt: new Date() });
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(unit);
      vi.mocked(inventoryRepository.updateUnit).mockResolvedValue(updatedUnit);

      const result = await service.retireUnit(unitId, userId);

      expect(result.status).toBe('retired');
      expect(inventoryRepository.updateUnit).toHaveBeenCalledWith(unitId, {
        status: 'retired',
        retiredAt: expect.any(Date),
      });
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        unit.productId,
        'marked_for_donation',
        userId,
        undefined,
        'Unit unit-1 retired',
      );
    });

    it('throws NotFoundError when unit does not exist', async () => {
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(null);

      await expect(service.retireUnit(unitId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── donateUnit ─────────────────────────────────────────────────

  describe('donateUnit', () => {
    it('sets retired unit to donated', async () => {
      const unit = mockUnit({ status: 'retired', cycleCount: 15 });
      const updatedUnit = mockUnit({ status: 'donated', cycleCount: 15 });
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(unit);
      vi.mocked(inventoryRepository.updateUnit).mockResolvedValue(updatedUnit);

      const result = await service.donateUnit(unitId, userId);

      expect(result.status).toBe('donated');
      expect(inventoryRepository.updateUnit).toHaveBeenCalledWith(unitId, { status: 'donated' });
      expect(inventoryRepository.appendLifecycleLog).toHaveBeenCalledWith(
        unit.productId,
        'donated',
        userId,
        undefined,
        'Unit unit-1 donated after 15 cycles',
      );
    });

    it('throws ConflictError when unit is not retired', async () => {
      const unit = mockUnit({ status: 'available' });
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(unit);

      await expect(service.donateUnit(unitId, userId)).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws NotFoundError when unit does not exist', async () => {
      vi.mocked(inventoryRepository.getUnit).mockResolvedValue(null);

      await expect(service.donateUnit(unitId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── addImage ───────────────────────────────────────────────────

  describe('addImage', () => {
    it('adds image with defaults when optional fields are omitted', async () => {
      const product = mockProduct();
      const image = mockImage();
      vi.mocked(inventoryRepository.findById).mockResolvedValue(product);
      vi.mocked(inventoryRepository.addImage).mockResolvedValue(image);

      const result = await service.addImage(productId, { url: 'https://example.com/img.jpg' });

      expect(result).toBe(image);
      expect(inventoryRepository.addImage).toHaveBeenCalledWith(productId, {
        url: 'https://example.com/img.jpg',
        altText: null,
        sortOrder: 0,
        isPrimary: false,
      });
    });

    it('throws NotFoundError when product does not exist', async () => {
      vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

      await expect(
        service.addImage(productId, { url: 'https://example.com/img.jpg' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
