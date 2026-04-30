import { prisma } from '../../config/database.js';
import type {
  Product,
  ProductImage,
  Category,
  CapsuleWardrobe,
  CapsuleWardrobeItem,
  Prisma,
} from '@prisma/client';
import type { ProductId } from '../../common/types/branded.js';
import type { DateRange } from '../../common/utils/date.js';

const SALEABLE_UNIT_STATUSES = [
  'available',
  'reserved',
  'rented',
  'in_cleaning',
  'in_inspection',
] as const;
const ACTIVE_ORDER_STATUSES = [
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'active_rental',
  'return_initiated',
  'return_in_transit',
  'returned',
  'inspecting',
] as const;
const CLEANING_BUFFER_DAYS = 2;

export interface CatalogProductFilter {
  city?: string;
  availableIds?: string[];
  categoryId?: string;
  gender?: string;
  season?: string;
  sizes?: string[];
  brands?: string[];
  maxPricePerDay?: number;
  conditions?: string[];
  q?: string;
}

type ProductWithImages = Product & { images: ProductImage[]; category: Category };
type CapsuleWithItems = CapsuleWardrobe & {
  items: (CapsuleWardrobeItem & { category: Category })[];
};

export class CatalogRepository {
  async findProducts(
    filter: CatalogProductFilter,
    limit: number,
    cursor?: string,
  ): Promise<{ items: ProductWithImages[]; total: number }> {
    // A product is listable if it has at least one non-retired inventory unit.
    // If a city filter is given, require the unit to be in that city.
    const inventoryFilter: Prisma.InventoryUnitListRelationFilter = {
      some: {
        status: { in: ['available', 'reserved', 'rented', 'in_cleaning', 'in_inspection'] },
        ...(filter.city && { city: filter.city }),
      },
    };

    const where: Prisma.ProductWhereInput = {
      inventoryUnits: inventoryFilter,
      ...(filter.availableIds && { id: { in: filter.availableIds } }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...(filter.gender && { gender: filter.gender as Product['gender'] }),
      ...(filter.season && { season: filter.season as Product['season'] }),
      ...(filter.sizes?.length && { sizeEu: { in: filter.sizes } }),
      ...(filter.brands?.length && { brand: { in: filter.brands } }),
      ...(filter.maxPricePerDay && { rentalPricePerDay: { lte: filter.maxPricePerDay } }),
      ...(filter.conditions?.length && {
        condition: { in: filter.conditions as Product['condition'][] },
      }),
      ...(filter.q &&
        filter.q.trim().length > 0 && {
          OR: [
            { nameEn: { contains: filter.q, mode: 'insensitive' } },
            { nameFr: { contains: filter.q, mode: 'insensitive' } },
            { nameEs: { contains: filter.q, mode: 'insensitive' } },
            { brand: { contains: filter.q, mode: 'insensitive' } },
            { color: { contains: filter.q, mode: 'insensitive' } },
            { material: { contains: filter.q, mode: 'insensitive' } },
          ],
        }),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: true,
        },
        take: limit + 1,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async findProductById(
    id: ProductId,
  ): Promise<(Product & { images: ProductImage[]; category: Category }) | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
      },
    });
  }

  async findCategories(): Promise<Category[]> {
    return prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findCapsules(filter: {
    season?: string;
    gender?: string;
    categoryType?: string;
  }): Promise<CapsuleWithItems[]> {
    return prisma.capsuleWardrobe.findMany({
      where: {
        isActive: true,
        ...(filter.season && { season: filter.season as CapsuleWardrobe['season'] }),
        ...(filter.gender && { gender: filter.gender as CapsuleWardrobe['gender'] }),
        ...(filter.categoryType && {
          categoryType: filter.categoryType as CapsuleWardrobe['categoryType'],
        }),
      },
      include: {
        items: { include: { category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProductsForCapsule(
    filter: { city: string; categoryId: string; genders?: string[]; seasons?: string[] },
    limit: number,
  ): Promise<{ items: ProductWithImages[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      city: filter.city,
      status: 'available',
      categoryId: filter.categoryId,
      ...(filter.genders && { gender: { in: filter.genders as Product['gender'][] } }),
      ...(filter.seasons && { season: { in: filter.seasons as Product['season'][] } }),
    };
    const items = await prisma.product.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return { items, total: items.length };
  }

  async findCapsuleBySlug(slug: string): Promise<CapsuleWithItems | null> {
    return prisma.capsuleWardrobe.findUnique({
      where: { slug, isActive: true },
      include: { items: { include: { category: true } } },
    });
  }

  async countUnitsByProductAndCity(
    productIds: string[],
  ): Promise<Array<{ productId: string; city: string; total: number }>> {
    if (productIds.length === 0) return [];
    const rows = await prisma.inventoryUnit.groupBy({
      by: ['productId', 'city'],
      where: {
        productId: { in: productIds },
        status: {
          in: SALEABLE_UNIT_STATUSES as unknown as (typeof SALEABLE_UNIT_STATUSES)[number][],
        },
      },
      _count: { _all: true },
    });
    return rows.map((r) => ({ productId: r.productId, city: r.city, total: r._count._all }));
  }

  async countOverlapsByProductAndCity(
    productIds: string[],
    dateRange: DateRange,
  ): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const startWithBuffer = new Date(dateRange.start);
    startWithBuffer.setUTCDate(startWithBuffer.getUTCDate() - CLEANING_BUFFER_DAYS);

    const items = await prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          status: {
            in: ACTIVE_ORDER_STATUSES as unknown as (typeof ACTIVE_ORDER_STATUSES)[number][],
          },
          rentalStart: { lte: dateRange.end },
          rentalEnd: { gte: startWithBuffer },
        },
      },
      select: { productId: true, city: true, quantity: true },
    });

    const out = new Map<string, number>();
    for (const it of items) {
      const key = `${it.productId}:${it.city}`;
      out.set(key, (out.get(key) ?? 0) + it.quantity);
    }
    return out;
  }
}

export const catalogRepository = new CatalogRepository();
