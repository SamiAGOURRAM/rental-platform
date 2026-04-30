import { fetchApi } from './client';
import type { Order } from './orders';

export interface DashboardStats {
  activeRentals: number;
  pendingOrders: number;
  totalRevenueCents: number;
  inventory: { total: number; available: number; donated: number };
  upcomingDeliveries: UpcomingDelivery[];
}

export interface UpcomingDelivery {
  id: string;
  orderId: string;
  orderNumber: string;
  type: string;
  direction: string;
  status: string;
  scheduledAt: string;
  city: string;
  customerName: string;
}

export interface AdminProduct {
  id: string;
  sku: string;
  nameEn: string;
  nameFr: string;
  nameEs: string;
  brand: string;
  status: string;
  condition: string;
  city: string;
  categoryId: string;
  gender: string;
  season: string;
  sizeEu: string;
  color: string;
  weightGrams: number;
  maxCycles: number;
  cycleCount: number;
  purchasePrice: number;
  rentalPricePerDay: number;
  source: string;
  createdAt: string;
  primaryImageUrl?: string | null;
}

export interface PaginatedAdmin<T> {
  items: T[];
  totalCount: number;
  nextCursor: string | null;
}

export function getDashboard(): Promise<DashboardStats> {
  return fetchApi('/admin/dashboard');
}

export function getAdminOrders(params?: {
  status?: string;
  userId?: string;
  limit?: number;
  cursor?: string;
}): Promise<PaginatedAdmin<Order>> {
  const sp = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') sp.set(k, String(v));
    }
  }
  const q = sp.toString();
  return fetchApi(`/admin/orders${q ? `?${q}` : ''}`);
}

export function transitionOrderStatus(
  orderId: string,
  status: string,
  reason?: string,
): Promise<Order> {
  return fetchApi(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export function getAdminDeliveries(limit = 20): Promise<UpcomingDelivery[]> {
  return fetchApi(`/admin/deliveries?limit=${limit}`);
}

export function getInventory(params?: {
  status?: string;
  city?: string;
  categoryId?: string;
  limit?: number;
  cursor?: string;
}): Promise<PaginatedAdmin<AdminProduct>> {
  const sp = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') sp.set(k, String(v));
    }
  }
  const q = sp.toString();
  return fetchApi(`/inventory${q ? `?${q}` : ''}`);
}

export interface CreateProductData {
  categoryId: string;
  sku: string;
  nameEn: string;
  nameFr: string;
  nameEs: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs: string;
  brand: string;
  sizeEu: string;
  color: string;
  weightGrams: number;
  gender: 'men' | 'women' | 'unisex';
  season: 'spring_summer' | 'fall_winter' | 'all_season';
  maxCycles: number;
  purchasePrice: number;
  rentalPricePerDay: number;
  source: 'vinted' | 'wholesale' | 'donated_in' | 'direct_purchase';
  material?: string;
  condition?: 'new' | 'excellent' | 'good' | 'fair';
  city?: string;
}

export function createProduct(data: CreateProductData): Promise<AdminProduct> {
  return fetchApi('/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProduct(id: string, data: Partial<CreateProductData>): Promise<AdminProduct> {
  return fetchApi(`/inventory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function uploadImage(
  file: File,
): Promise<{ url: string; filename: string; bytes: number; mimeType: string }> {
  const { getAccessToken } = await import('./client');
  const token = getAccessToken();
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`/api/v1/inventory/uploads/image`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Upload failed (${response.status})`);
  }
  const json = await response.json();
  return json.data;
}

export function addProductImage(
  productId: string,
  data: { url: string; altText?: string; sortOrder?: number; isPrimary?: boolean },
): Promise<{
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}> {
  return fetchApi(`/inventory/${productId}/images`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function markCleaned(productId: string): Promise<AdminProduct> {
  return fetchApi(`/inventory/${productId}/clean`, { method: 'POST' });
}

export function markDonated(productId: string): Promise<AdminProduct> {
  return fetchApi(`/inventory/${productId}/donate`, { method: 'POST' });
}

export interface InventoryUnit {
  id: string;
  productId: string;
  city: string;
  status: string;
  condition: string;
  cycleCount: number;
  createdAt: string;
  retiredAt: string | null;
}

export function listProductUnits(productId: string): Promise<InventoryUnit[]> {
  return fetchApi(`/inventory/${productId}/units`);
}

export function addProductUnits(
  productId: string,
  data: { city: string; quantity: number },
): Promise<InventoryUnit[]> {
  return fetchApi(`/inventory/${productId}/units`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function cleanUnit(unitId: string): Promise<InventoryUnit> {
  return fetchApi(`/inventory/units/${unitId}/clean`, { method: 'POST' });
}

export function retireUnit(unitId: string): Promise<InventoryUnit> {
  return fetchApi(`/inventory/units/${unitId}/retire`, { method: 'POST' });
}

export function donateUnit(unitId: string): Promise<InventoryUnit> {
  return fetchApi(`/inventory/units/${unitId}/donate`, { method: 'POST' });
}

export interface AdminCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isGuest: boolean;
  emailVerified: boolean;
  locale: string;
  createdAt: string;
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
}

export interface AdminCustomerDetail extends Omit<
  AdminCustomer,
  'orderCount' | 'totalSpentCents' | 'lastOrderAt'
> {
  phone: string | null;
  totalOrders: number;
  totalSpentCents: number;
  addresses: Array<{
    id: string;
    label: string;
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    countryCode: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    rentalStart: string;
    rentalEnd: string;
    totalAmountCents: number;
    createdAt: string;
  }>;
}

export function getAdminCustomers(params?: {
  q?: string;
  limit?: number;
  cursor?: string;
}): Promise<PaginatedAdmin<AdminCustomer>> {
  const sp = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') sp.set(k, String(v));
    }
  }
  const q = sp.toString();
  return fetchApi(`/admin/customers${q ? `?${q}` : ''}`);
}

export function getAdminCustomer(id: string): Promise<AdminCustomerDetail> {
  return fetchApi(`/admin/customers/${id}`);
}

export interface AdminCapsuleItem {
  id: string;
  categoryId: string;
  quantity: number;
  isRequired: boolean;
  category: { id: string; slug: string; nameEn: string; nameFr: string; nameEs: string };
}

export interface AdminCapsule {
  id: string;
  slug: string;
  nameEn: string;
  nameFr: string;
  nameEs: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs: string;
  categoryType: string;
  season: string;
  gender: string;
  basePrice: string | number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  items: AdminCapsuleItem[];
}

export interface CapsuleInput {
  slug: string;
  nameEn: string;
  nameFr: string;
  nameEs: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs: string;
  categoryType: string;
  season: string;
  gender: string;
  basePrice: number;
  imageUrl?: string | null;
  isActive?: boolean;
  items: Array<{ categoryId: string; quantity: number; isRequired: boolean }>;
}

export function getAdminCapsules(): Promise<AdminCapsule[]> {
  return fetchApi(`/admin/capsules`);
}

export function createCapsule(data: CapsuleInput): Promise<AdminCapsule> {
  return fetchApi(`/admin/capsules`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateCapsule(id: string, data: Partial<CapsuleInput>): Promise<AdminCapsule> {
  return fetchApi(`/admin/capsules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deactivateCapsule(id: string): Promise<void> {
  return fetchApi(`/admin/capsules/${id}`, { method: 'DELETE' });
}
