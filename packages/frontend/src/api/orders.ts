import { fetchApi } from './client';

export type DeliveryMethod = 'personal' | 'mondial_relay' | 'chronopost' | 'colissimo';

export interface OrderItem {
  productId: string;
  productName: string;
  brand: string;
  pricePerDay: number;
  days: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  rentalStart: string;
  rentalEnd: string;
  deliveryMethod: DeliveryMethod;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

interface RawOrderProduct {
  id: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  brand?: string;
}

interface RawOrderItem {
  productId?: string;
  priceAtTime?: number | string;
  pricePerDay?: number | string;
  subtotal?: number | string;
  brand?: string;
  productName?: string;
  product?: RawOrderProduct;
}

interface RawOrder {
  id: string;
  orderNumber: string;
  status: string;
  rentalStart: string;
  rentalEnd: string;
  deliveryMethod: DeliveryMethod;
  total?: number | string;
  totalAmount?: number | string;
  items?: RawOrderItem[];
  createdAt: string;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function rentalDays(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(diff / 86400000) + 1);
}

function getProductName(item: RawOrderItem): string {
  if (item.productName) return item.productName;
  if (item.product?.nameEn) return item.product.nameEn;
  if (item.product?.nameFr) return item.product.nameFr;
  if (item.product?.nameEs) return item.product.nameEs;
  return 'Rental piece';
}

function mapRawItem(item: RawOrderItem, start: string, end: string): OrderItem {
  const days = rentalDays(start, end);
  const pricePerDay = toNumber(item.pricePerDay ?? item.priceAtTime);
  const subtotal = toNumber(item.subtotal ?? pricePerDay * days);

  return {
    productId: item.product?.id ?? item.productId ?? '',
    productName: getProductName(item),
    brand: item.product?.brand ?? item.brand ?? '',
    pricePerDay,
    days,
    subtotal,
  };
}

function mapRawOrder(raw: RawOrder): Order {
  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    status: raw.status,
    rentalStart: raw.rentalStart,
    rentalEnd: raw.rentalEnd,
    deliveryMethod: raw.deliveryMethod,
    totalAmount: toNumber(raw.totalAmount ?? raw.total),
    items: (raw.items ?? []).map((item) => mapRawItem(item, raw.rentalStart, raw.rentalEnd)),
    createdAt: raw.createdAt,
  };
}

function hasItems(raw: RawOrder): boolean {
  return Array.isArray(raw.items);
}

export interface OrderLineItem {
  productId: string;
  quantity: number;
  city: string;
}

export interface CreateOrderData {
  /** Preferred: explicit line items. */
  items?: OrderLineItem[];
  /** Legacy: flat list of product IDs (qty=1 each, city='paris'). */
  productIds?: string[];
  rentalStart: string;
  rentalEnd: string;
  deliveryMethod: DeliveryMethod;
  addressId: string;
  notes?: string;
}

export interface GetOrdersParams {
  limit?: number;
  cursor?: string;
  status?: string;
  fromDate?: string;
}

export async function createOrder(data: CreateOrderData): Promise<Order> {
  const raw = await fetchApi<RawOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify({ ...data, locale: 'en' }),
  });

  return mapRawOrder(raw);
}

export async function getOrders(
  params?: GetOrdersParams,
): Promise<{ items: Order[]; totalCount: number; nextCursor: string | null }> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  if (params?.cursor) search.set('cursor', params.cursor);
  if (params?.status) search.set('status', params.status);
  if (params?.fromDate) search.set('fromDate', params.fromDate);

  const path = search.toString() ? `/orders?${search.toString()}` : '/orders';
  const raw = await fetchApi<{ items: RawOrder[]; totalCount: number; nextCursor: string | null }>(
    path,
  );
  return {
    items: raw.items.map(mapRawOrder),
    totalCount: raw.totalCount,
    nextCursor: raw.nextCursor,
  };
}

export async function getOrder(id: string): Promise<Order> {
  const raw = await fetchApi<RawOrder>(`/orders/${id}`);
  return mapRawOrder(raw);
}

export async function cancelOrder(id: string): Promise<Order> {
  const raw = await fetchApi<RawOrder>(`/orders/${id}/cancel`, { method: 'POST' });
  if (hasItems(raw)) return mapRawOrder(raw);

  // Cancel endpoint returns a lightweight order payload; fetch full detail for UI.
  return getOrder(id);
}
