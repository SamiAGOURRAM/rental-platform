/** Generate a human-readable order number like RNT-2026-A3F7 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `RNT-${year}-${suffix}`;
}
