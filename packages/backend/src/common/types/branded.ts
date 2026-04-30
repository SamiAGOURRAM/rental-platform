/** Branded primitive — prevents accidentally passing a UserId where a ProductId is expected */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type AddressId = Brand<string, 'AddressId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type CapsuleId = Brand<string, 'CapsuleId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type DeliveryId = Brand<string, 'DeliveryId'>;
export type CarbonSavingId = Brand<string, 'CarbonSavingId'>;

/** Cast a raw string to a branded ID — only at system boundaries (DB reads, request parsing) */
export function asUserId(id: string): UserId {
  return id as UserId;
}
export function asProductId(id: string): ProductId {
  return id as ProductId;
}
export function asOrderId(id: string): OrderId {
  return id as OrderId;
}
export function asAddressId(id: string): AddressId {
  return id as AddressId;
}
export function asCategoryId(id: string): CategoryId {
  return id as CategoryId;
}
export function asCapsuleId(id: string): CapsuleId {
  return id as CapsuleId;
}
export function asPaymentId(id: string): PaymentId {
  return id as PaymentId;
}
export function asDeliveryId(id: string): DeliveryId {
  return id as DeliveryId;
}
