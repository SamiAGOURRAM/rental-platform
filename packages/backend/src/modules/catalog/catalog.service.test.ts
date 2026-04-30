import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogService } from './catalog.service.js';
import { catalogRepository } from './catalog.repository.js';
import { availabilityService } from './availability.service.js';
import type {
  Product,
  ProductImage,
  Category,
  CapsuleWardrobe,
  CapsuleWardrobeItem,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../common/errors/index.js';
import type { ProductId } from '../../common/types/branded.js';

vi.mock('./catalog.repository.js', () => ({
  catalogRepository: {
    findProducts: vi.fn(),
    findProductById: vi.fn(),
    findCategories: vi.fn(),
    findCapsules: vi.fn(),
    findCapsuleBySlug: vi.fn(),
    findProductsForCapsule: vi.fn(),
    countUnitsByProductAndCity: vi.fn(),
    countOverlapsByProductAndCity: vi.fn(),
  },
}));

vi.mock('./availability.service.js', () => ({
  availabilityService: {
    getAvailabilityByProduct: vi.fn(),
    checkLineItems: vi.fn(),
  },
}));

// ── Mock factories ─────────────────────────────────────────────

const d = (n: number) => new Prisma.Decimal(n);

type ProductWithImages = Product & { images: ProductImage[]; category: Category };

const mockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  slug: 'dresses',
  nameEn: 'Dresses',
  nameFr: 'Robes',
  nameEs: 'Vestidos',
  parentId: null,
  sortOrder: 1,
  icon: 'dress-icon',
  ...overrides,
});

const mockImage = (overrides: Partial<ProductImage> = {}): ProductImage => ({
  id: 'img-1',
  productId: 'prod-1',
  url: '/uploads/products/img1.jpg',
  altText: 'Test image',
  sortOrder: 0,
  isPrimary: true,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

const mockProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'prod-1',
    categoryId: 'cat-1',
    sku: 'SKU-001',
    nameEn: 'Test Product',
    nameFr: 'Produit Test',
    nameEs: 'Producto de Prueba',
    descriptionEn: 'A test product',
    descriptionFr: 'Un produit test',
    descriptionEs: 'Un producto de prueba',
    brand: 'TestBrand',
    sizeEu: 'M',
    sizeUk: '10',
    sizeUs: '8',
    color: 'Black',
    material: 'Cotton',
    weightGrams: 300,
    gender: 'women',
    season: 'all_season',
    condition: 'excellent',
    cycleCount: 5,
    maxCycles: 20,
    purchasePrice: d(100),
    rentalPricePerDay: d(15.99),
    source: 'wholesale',
    status: 'available',
    city: 'paris',
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    retiredAt: null,
    images: [mockImage()],
    category: mockCategory(),
    ...overrides,
  }) as ProductWithImages;

type CapsuleWithItems = CapsuleWardrobe & {
  items: (CapsuleWardrobeItem & { category: Category })[];
};

const mockCapsule = (overrides: Partial<CapsuleWithItems> = {}): CapsuleWithItems =>
  ({
    id: 'cap-1',
    slug: 'summer-essentials',
    nameEn: 'Summer Essentials',
    nameFr: 'Essentiels Été',
    nameEs: 'Esenciales de Verano',
    descriptionEn: 'Must-haves for summer',
    descriptionFr: "Indispensables pour l'été",
    descriptionEs: 'Imprescindibles para el verano',
    categoryType: 'casual',
    season: 'spring_summer',
    gender: 'women',
    basePrice: d(49.99),
    imageUrl: '/images/capsules/summer.jpg',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    items: [],
    ...overrides,
  }) as CapsuleWithItems;

const mockCapsuleItem = (
  overrides: Partial<CapsuleWardrobeItem & { category: Category }> = {},
): CapsuleWardrobeItem & { category: Category } =>
  ({
    id: 'cwi-1',
    capsuleId: 'cap-1',
    categoryId: 'cat-1',
    quantity: 2,
    isRequired: true,
    category: mockCategory(),
    ...overrides,
  }) as CapsuleWardrobeItem & { category: Category };

const dateRange = { start: new Date('2026-06-01'), end: new Date('2026-06-05') };

function pid(id: string): ProductId {
  return id as ProductId;
}

// ── describe CatalogService ────────────────────────────────────

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    service = new CatalogService();
    vi.clearAllMocks();
  });

  // ── searchProducts ──────────────────────────────────────────

  describe('searchProducts', () => {
    const defaultParams = {
      locale: 'en' as const,
      pagination: { limit: 20 },
    };

    it('with city+dateRange: calls availabilityService, passes availableIds to repo', async () => {
      const prod = mockProduct();
      vi.mocked(availabilityService.getAvailabilityByProduct).mockResolvedValue(
        new Map([
          ['prod-1', { productId: 'prod-1', city: 'paris', totalUnits: 3, availableCount: 2 }],
        ]),
      );
      vi.mocked(catalogRepository.findProducts).mockResolvedValue({ items: [prod], total: 1 });
      vi.mocked(catalogRepository.countUnitsByProductAndCity).mockResolvedValue([
        { productId: 'prod-1', city: 'paris', total: 3 },
      ]);
      vi.mocked(catalogRepository.countOverlapsByProductAndCity).mockResolvedValue(new Map());

      const result = await service.searchProducts({
        ...defaultParams,
        city: 'paris',
        dateRange,
      });

      expect(availabilityService.getAvailabilityByProduct).toHaveBeenCalledWith('paris', dateRange);
      expect(catalogRepository.findProducts).toHaveBeenCalledWith(
        expect.objectContaining({ availableIds: ['prod-1'] }),
        expect.any(Number),
        undefined,
      );
      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('short-circuits when no available IDs found', async () => {
      vi.mocked(availabilityService.getAvailabilityByProduct).mockResolvedValue(
        new Map([
          ['prod-1', { productId: 'prod-1', city: 'paris', totalUnits: 1, availableCount: 0 }],
        ]),
      );

      const result = await service.searchProducts({
        ...defaultParams,
        city: 'paris',
        dateRange,
      });

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.totalCount).toBe(0);
      expect(catalogRepository.findProducts).not.toHaveBeenCalled();
    });

    it('skips availability check when no city or dateRange', async () => {
      const prod = mockProduct();
      vi.mocked(catalogRepository.findProducts).mockResolvedValue({ items: [prod], total: 1 });
      vi.mocked(catalogRepository.countUnitsByProductAndCity).mockResolvedValue([]);

      await service.searchProducts({ ...defaultParams });
      expect(availabilityService.getAvailabilityByProduct).not.toHaveBeenCalled();

      await service.searchProducts({ ...defaultParams, city: 'paris' });
      expect(availabilityService.getAvailabilityByProduct).not.toHaveBeenCalled();

      await service.searchProducts({ ...defaultParams, dateRange });
      expect(availabilityService.getAvailabilityByProduct).not.toHaveBeenCalled();
    });

    it('builds availabilityByCity map with total/available counts', async () => {
      const prod = mockProduct();
      vi.mocked(catalogRepository.findProducts).mockResolvedValue({ items: [prod], total: 1 });
      vi.mocked(catalogRepository.countUnitsByProductAndCity).mockResolvedValue([
        { productId: 'prod-1', city: 'paris', total: 5 },
        { productId: 'prod-1', city: 'nice', total: 3 },
      ]);
      vi.mocked(catalogRepository.countOverlapsByProductAndCity).mockResolvedValue(new Map());

      const result = await service.searchProducts({ ...defaultParams });

      expect(result.items[0].availability).toEqual([
        { city: 'paris', total: 5, available: 5 },
        { city: 'nice', total: 3, available: 3 },
      ]);
    });

    it('with dateRange: subtracts overlaps from availability counts', async () => {
      const prod = mockProduct();
      vi.mocked(catalogRepository.findProducts).mockResolvedValue({ items: [prod], total: 1 });
      vi.mocked(catalogRepository.countUnitsByProductAndCity).mockResolvedValue([
        { productId: 'prod-1', city: 'paris', total: 10 },
      ]);
      vi.mocked(catalogRepository.countOverlapsByProductAndCity).mockResolvedValue(
        new Map([['prod-1:paris', 4]]),
      );

      const result = await service.searchProducts({
        ...defaultParams,
        dateRange,
      });

      expect(result.items[0].availability).toEqual([{ city: 'paris', total: 10, available: 6 }]);
      expect(catalogRepository.countOverlapsByProductAndCity).toHaveBeenCalledWith(
        ['prod-1'],
        dateRange,
      );
    });

    it('without dateRange: does not call countOverlaps', async () => {
      const prod = mockProduct();
      vi.mocked(catalogRepository.findProducts).mockResolvedValue({ items: [prod], total: 1 });
      vi.mocked(catalogRepository.countUnitsByProductAndCity).mockResolvedValue([
        { productId: 'prod-1', city: 'paris', total: 2 },
      ]);

      await service.searchProducts({ ...defaultParams });

      expect(catalogRepository.countOverlapsByProductAndCity).not.toHaveBeenCalled();
    });
  });

  // ── getProduct ──────────────────────────────────────────────

  describe('getProduct', () => {
    it('returns localized product with availability', async () => {
      const prod = mockProduct();
      vi.mocked(catalogRepository.findProductById).mockResolvedValue(prod);
      vi.mocked(catalogRepository.countUnitsByProductAndCity).mockResolvedValue([
        { productId: 'prod-1', city: 'paris', total: 4 },
      ]);
      vi.mocked(catalogRepository.countOverlapsByProductAndCity).mockResolvedValue(new Map());

      const result = await service.getProduct(pid('prod-1'), 'en');

      expect(result.id).toBe('prod-1');
      expect(result.name).toBe('Test Product');
      expect(result.category.name).toBe('Dresses');
      expect(result.rentalPricePerDay).toBe(15.99);
      expect(result.availability).toEqual([{ city: 'paris', total: 4, available: 4 }]);
    });

    it('throws NotFoundError when product does not exist', async () => {
      vi.mocked(catalogRepository.findProductById).mockResolvedValue(null);

      await expect(service.getProduct(pid('nonexistent'), 'en')).rejects.toThrow(NotFoundError);
    });

    it.each([
      ['en', 'Test Product'],
      ['fr', 'Produit Test'],
      ['es', 'Producto de Prueba'],
    ])('localizes name correctly for locale %s', async (locale, expectedName) => {
      const prod = mockProduct();
      vi.mocked(catalogRepository.findProductById).mockResolvedValue(prod);
      vi.mocked(catalogRepository.countUnitsByProductAndCity).mockResolvedValue([]);

      const result = await service.getProduct(pid('prod-1'), locale as 'en' | 'fr' | 'es');

      expect(result.name).toBe(expectedName);
    });
  });

  // ── getCategories ───────────────────────────────────────────

  describe('getCategories', () => {
    it('localizes category name based on locale', async () => {
      vi.mocked(catalogRepository.findCategories).mockResolvedValue([
        mockCategory({ id: 'cat-1', nameEn: 'Dresses', nameFr: 'Robes', nameEs: 'Vestidos' }),
        mockCategory({ id: 'cat-2', nameEn: 'Shoes', nameFr: 'Chaussures', nameEs: 'Zapatos' }),
      ]);

      const en = await service.getCategories('en');
      expect(en[0].name).toBe('Dresses');
      expect(en[1].name).toBe('Shoes');

      const fr = await service.getCategories('fr');
      expect(fr[0].name).toBe('Robes');
      expect(fr[1].name).toBe('Chaussures');

      const es = await service.getCategories('es');
      expect(es[0].name).toBe('Vestidos');
      expect(es[1].name).toBe('Zapatos');
    });
  });

  // ── getCapsules ─────────────────────────────────────────────

  describe('getCapsules', () => {
    it('filters by params and maps localized fields', async () => {
      const capsule = mockCapsule({
        slug: 'summer-essentials',
        nameEn: 'Summer Essentials',
        nameFr: 'Essentiels Été',
        nameEs: 'Esenciales de Verano',
        season: 'spring_summer',
        gender: 'women',
        items: [mockCapsuleItem({ categoryId: 'cat-1', quantity: 2, isRequired: true })],
      });
      vi.mocked(catalogRepository.findCapsules).mockResolvedValue([capsule]);

      const result = await service.getCapsules({
        season: 'spring_summer',
        gender: 'women',
        locale: 'fr',
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Essentiels Été');
      expect(result[0].season).toBe('spring_summer');
      expect(result[0].basePrice).toBe(49.99);
      expect(result[0].items[0].categoryName).toBe('Robes');
      expect(result[0].items[0].quantity).toBe(2);
      expect(catalogRepository.findCapsules).toHaveBeenCalledWith(
        expect.objectContaining({
          season: 'spring_summer',
          gender: 'women',
        }),
      );
    });
  });

  // ── getCapsule ──────────────────────────────────────────────

  describe('getCapsule', () => {
    it('throws NotFoundError when capsule does not exist', async () => {
      vi.mocked(catalogRepository.findCapsuleBySlug).mockResolvedValue(null);

      await expect(service.getCapsule('nonexistent', 'en')).rejects.toThrow(NotFoundError);
    });

    it('enriches items with suggestions from findProductsForCapsule', async () => {
      const capsule = mockCapsule({
        slug: 'business-casual',
        gender: 'women',
        season: 'all_season',
        items: [
          mockCapsuleItem({
            categoryId: 'cat-1',
            quantity: 1,
            isRequired: true,
            category: mockCategory({ id: 'cat-1', nameEn: 'Blazers' }),
          }),
        ],
      });
      vi.mocked(catalogRepository.findCapsuleBySlug).mockResolvedValue(capsule);

      const suggestedProduct = mockProduct({
        id: 'prod-rec-1',
        categoryId: 'cat-1',
        nameEn: 'Recommended Blazer',
      });
      vi.mocked(catalogRepository.findProductsForCapsule).mockResolvedValue({
        items: [suggestedProduct],
        total: 1,
      });

      const result = await service.getCapsule('business-casual', 'en');

      expect(result.items[0].suggestions).toHaveLength(1);
      expect(result.items[0].suggestions![0].id).toBe('prod-rec-1');
      expect(result.items[0].suggestions![0].name).toBe('Recommended Blazer');
      expect(catalogRepository.findProductsForCapsule).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'paris',
          categoryId: 'cat-1',
        }),
        6,
      );
    });
  });

  // ── checkAvailability ───────────────────────────────────────

  describe('checkAvailability', () => {
    it('delegates to availabilityService.checkLineItems', async () => {
      const items = [{ productId: pid('prod-1'), quantity: 2, city: 'paris' }];
      vi.mocked(availabilityService.checkLineItems).mockResolvedValue({
        ok: true,
        unavailable: [],
      });

      const result = await service.checkAvailability(items, dateRange);

      expect(result).toEqual({ ok: true, unavailable: [] });
      expect(availabilityService.checkLineItems).toHaveBeenCalledWith(items, dateRange);
    });
  });
});
