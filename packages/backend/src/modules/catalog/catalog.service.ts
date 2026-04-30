import { catalogRepository, type CatalogProductFilter } from './catalog.repository.js';
import { availabilityService } from './availability.service.js';
import { NotFoundError } from '../../common/errors/index.js';
import { buildPaginatedResult } from '../../common/utils/pagination.js';
import type { ProductId } from '../../common/types/branded.js';
import type { PaginationParams, PaginatedResult } from '../../common/types/pagination.js';
import type { DateRange } from '../../common/utils/date.js';
import type { Product, ProductImage, Category } from '@prisma/client';

type Locale = 'en' | 'fr' | 'es';

type ProductWithImages = Product & { images: ProductImage[]; category: Category };

function localizeProduct(product: ProductWithImages, locale: Locale) {
  return {
    id: product.id,
    name: product[`name${capitalize(locale)}` as keyof ProductWithImages] as string,
    description: product[`description${capitalize(locale)}` as keyof ProductWithImages] as string,
    brand: product.brand,
    category: {
      id: product.category.id,
      slug: product.category.slug,
      name: product.category[`name${capitalize(locale)}` as keyof Category] as string,
    },
    primaryImageUrl: product.images[0]?.url ?? null,
    images: product.images.map((img) => ({ url: img.url, altText: img.altText })),
    sizeEu: product.sizeEu,
    sizeUk: product.sizeUk,
    sizeUs: product.sizeUs,
    color: product.color,
    material: product.material,
    weightGrams: product.weightGrams,
    gender: product.gender,
    season: product.season,
    condition: product.condition,
    cycleCount: product.cycleCount,
    maxCycles: product.maxCycles,
    lifecyclePercentage: Math.round((product.cycleCount / product.maxCycles) * 100),
    rentalPricePerDay: Number(product.rentalPricePerDay),
    city: product.city,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface SearchProductsParams {
  city?: string;
  dateRange?: DateRange;
  categoryId?: string;
  gender?: string;
  season?: string;
  sizes?: string[];
  brands?: string[];
  maxPricePerDay?: number;
  conditions?: string[];
  q?: string;
  locale: Locale;
  pagination: PaginationParams;
}

export class CatalogService {
  async searchProducts(params: SearchProductsParams): Promise<
    PaginatedResult<
      ReturnType<typeof localizeProduct> & {
        availability: { city: string; total: number; available: number }[];
      }
    >
  > {
    // Date-window + city → pre-filter to product IDs that have ≥1 available unit
    let availableIds: string[] | undefined;
    if (params.dateRange && params.city) {
      const avail = await availabilityService.getAvailabilityByProduct(
        params.city,
        params.dateRange,
      );
      availableIds = Array.from(avail.values())
        .filter((a) => a.availableCount > 0)
        .map((a) => a.productId);
      if (availableIds.length === 0) {
        return { items: [], nextCursor: null, totalCount: 0 };
      }
    }

    const filter: CatalogProductFilter = {
      city: params.city,
      availableIds,
      categoryId: params.categoryId,
      gender: params.gender,
      season: params.season,
      sizes: params.sizes,
      brands: params.brands,
      maxPricePerDay: params.maxPricePerDay,
      conditions: params.conditions,
      q: params.q,
    };

    const { items, total } = await catalogRepository.findProducts(
      filter,
      params.pagination.limit,
      params.pagination.cursor,
    );

    const productIds = items.map((p) => p.id);
    const availabilityByCity = await this.buildAvailabilityByCity(productIds, params.dateRange);

    const localized = items.map((p) => ({
      ...localizeProduct(p, params.locale),
      availability: availabilityByCity.get(p.id) ?? [],
    }));
    return buildPaginatedResult(
      localized as Array<(typeof localized)[number] & { id: string }>,
      params.pagination.limit,
      total,
    );
  }

  /** For each productId, return per-city availability counts. */
  private async buildAvailabilityByCity(
    productIds: string[],
    dateRange?: DateRange,
  ): Promise<Map<string, { city: string; total: number; available: number }[]>> {
    if (productIds.length === 0) return new Map();
    // Group the saleable units by (productId, city)
    const units = await catalogRepository.countUnitsByProductAndCity(productIds);

    // If a date range is provided, also subtract overlaps per (productId, city)
    let overlapsByKey = new Map<string, number>();
    if (dateRange) {
      overlapsByKey = await catalogRepository.countOverlapsByProductAndCity(productIds, dateRange);
    }

    const out = new Map<string, { city: string; total: number; available: number }[]>();
    for (const row of units) {
      const key = `${row.productId}:${row.city}`;
      const reserved = overlapsByKey.get(key) ?? 0;
      const entry = out.get(row.productId) ?? [];
      entry.push({
        city: row.city,
        total: row.total,
        available: Math.max(0, row.total - reserved),
      });
      out.set(row.productId, entry);
    }
    return out;
  }

  async getProduct(id: ProductId, locale: Locale, dateRange?: DateRange) {
    const product = await catalogRepository.findProductById(id);
    if (!product) throw new NotFoundError('Product', id);
    const availabilityByCity = await this.buildAvailabilityByCity([product.id], dateRange);
    return {
      ...localizeProduct(product, locale),
      availability: availabilityByCity.get(product.id) ?? [],
    };
  }

  async getCategories(locale: Locale) {
    const categories = await catalogRepository.findCategories();
    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c[`name${capitalize(locale)}` as keyof typeof c] as string,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      icon: c.icon,
    }));
  }

  async getCapsules(params: {
    season?: string;
    gender?: string;
    categoryType?: string;
    locale: Locale;
  }) {
    const capsules = await catalogRepository.findCapsules(params);
    return capsules.map((c) => this.serializeCapsule(c, params.locale));
  }

  async getCapsule(slug: string, locale: Locale) {
    const capsule = await catalogRepository.findCapsuleBySlug(slug);
    if (!capsule) throw new NotFoundError('Capsule wardrobe', slug);

    const base = this.serializeCapsule(capsule, locale);

    // Enrich each item with recommended products matching capsule's category.
    // Filter loosely — if capsule is gendered, also allow unisex; if season-specific, also allow all_season.
    const itemsWithSuggestions = await Promise.all(
      base.items.map(async (slot) => {
        const { items: recs } = await catalogRepository.findProductsForCapsule(
          {
            city: 'paris',
            categoryId: slot.categoryId,
            genders: capsule.gender === 'unisex' ? undefined : [capsule.gender, 'unisex'],
            seasons: capsule.season === 'all_season' ? undefined : [capsule.season, 'all_season'],
          },
          6,
        );
        return {
          ...slot,
          suggestions: recs.map((p) => localizeProduct(p, locale)),
        };
      }),
    );

    return { ...base, items: itemsWithSuggestions };
  }

  private serializeCapsule(
    c: Awaited<ReturnType<typeof catalogRepository.findCapsules>>[number],
    locale: Locale,
  ) {
    return {
      id: c.id,
      slug: c.slug,
      name: c[`name${capitalize(locale)}` as keyof typeof c] as string,
      description: c[`description${capitalize(locale)}` as keyof typeof c] as string,
      categoryType: c.categoryType,
      season: c.season,
      gender: c.gender,
      basePrice: Number(c.basePrice),
      imageUrl: c.imageUrl,
      items: c.items.map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.category[
          `name${capitalize(locale)}` as keyof typeof item.category
        ] as string,
        quantity: item.quantity,
        isRequired: item.isRequired,
      })),
    };
  }

  async checkAvailability(
    items: Array<{ productId: ProductId; quantity: number; city: string }>,
    dateRange: DateRange,
  ) {
    return availabilityService.checkLineItems(items, dateRange);
  }
}

export const catalogService = new CatalogService();
