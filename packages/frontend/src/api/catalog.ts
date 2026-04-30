import { fetchApi } from './client';

export interface ProductAvailability {
  city: string;
  total: number;
  available: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: { id: string; slug: string; name: string };
  primaryImageUrl: string | null;
  sizeEu: string;
  color: string;
  material: string;
  gender: string;
  season: string;
  rentalPricePerDay: number;
  city: string;
  availability?: ProductAvailability[];
}

export interface ProductDetail extends Product {
  images: { url: string; altText: string | null }[];
  sizeUk: string | null;
  sizeUs: string | null;
  weightGrams: number | null;
  condition: string;
  cycleCount: number;
  maxCycles: number;
  lifecyclePercentage: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

export interface CapsuleSlot {
  categoryId: string;
  categoryName: string;
  quantity: number;
  isRequired: boolean;
}

export interface Capsule {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryType: string;
  season: string;
  gender: string;
  basePrice: number;
  imageUrl: string | null;
  items: CapsuleSlot[];
}

export interface CapsuleDetail extends Capsule {
  items: (CapsuleSlot & { suggestions: Product[] })[];
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  nextCursor: string | null;
}

export interface ProductFilters {
  locale?: string;
  limit?: number;
  cursor?: string;
  city?: string;
  categoryId?: string;
  gender?: string;
  season?: string;
  size?: string;
  brand?: string;
  maxPricePerDay?: number;
  rentalStart?: string;
  rentalEnd?: string;
  q?: string;
}

export function getProducts(params?: ProductFilters): Promise<PaginatedResponse<Product>> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
  }
  const query = searchParams.toString();
  return fetchApi(`/catalog/products${query ? `?${query}` : ''}`);
}

export function getProduct(id: string): Promise<ProductDetail> {
  return fetchApi(`/catalog/products/${id}?locale=en`);
}

export function getCategories(locale?: string): Promise<Category[]> {
  const query = locale ? `?locale=${locale}` : '';
  return fetchApi(`/catalog/categories${query}`);
}

export function getCapsules(params?: {
  locale?: string;
  season?: string;
  gender?: string;
  categoryType?: string;
}): Promise<Capsule[]> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return fetchApi(`/catalog/capsules${query ? `?${query}` : ''}`);
}

export function getCapsule(slug: string, locale = 'en'): Promise<CapsuleDetail> {
  return fetchApi(`/catalog/capsules/${slug}?locale=${locale}`);
}
