export interface OrderStatusMeta {
  label: string;
  color: string;
  bucket: 'active' | 'past';
}

const ORDER_STATUS_META: Record<string, OrderStatusMeta> = {
  pending_payment: {
    label: 'Awaiting payment',
    color: 'text-amber-700 bg-amber-50',
    bucket: 'active',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-brand bg-brand/10',
    bucket: 'active',
  },
  preparing: {
    label: 'Preparing',
    color: 'text-blue-700 bg-blue-50',
    bucket: 'active',
  },
  out_for_delivery: {
    label: 'Out for delivery',
    color: 'text-blue-700 bg-blue-50',
    bucket: 'active',
  },
  delivered: {
    label: 'Delivered',
    color: 'text-brand bg-brand/10',
    bucket: 'active',
  },
  active_rental: {
    label: 'Active rental',
    color: 'text-brand bg-brand/10',
    bucket: 'active',
  },
  return_initiated: {
    label: 'Return initiated',
    color: 'text-brand bg-brand/10',
    bucket: 'active',
  },
  return_in_transit: {
    label: 'Return in transit',
    color: 'text-brand bg-brand/10',
    bucket: 'active',
  },
  returned: {
    label: 'Returned',
    color: 'text-stone bg-pearl',
    bucket: 'past',
  },
  inspecting: {
    label: 'Inspecting',
    color: 'text-stone bg-pearl',
    bucket: 'past',
  },
  completed: {
    label: 'Completed',
    color: 'text-stone bg-pearl',
    bucket: 'past',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700 bg-red-50',
    bucket: 'past',
  },
  refunded: {
    label: 'Refunded',
    color: 'text-red-700 bg-red-50',
    bucket: 'past',
  },
};

const FALLBACK_STATUS: OrderStatusMeta = {
  label: 'In progress',
  color: 'text-stone bg-pearl',
  bucket: 'active',
};

export function normalizeOrderStatus(status: string): string {
  return status.trim().toLowerCase();
}

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  const key = normalizeOrderStatus(status);
  const exact = ORDER_STATUS_META[key];
  if (exact) return exact;

  return {
    ...FALLBACK_STATUS,
    label: key.replace(/_/g, ' '),
  };
}

export function isPastOrderStatus(status: string): boolean {
  return getOrderStatusMeta(status).bucket === 'past';
}

export function canCancelOrderStatus(status: string): boolean {
  const normalized = normalizeOrderStatus(status);
  return ['pending_payment', 'confirmed', 'preparing'].includes(normalized);
}
