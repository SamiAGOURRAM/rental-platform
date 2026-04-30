import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CartItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  pricePerDay: number;
  imageUrl: string | null;
  /** Units of this garment to rent (default 1). */
  quantity: number;
  /** City where the units are held. */
  city: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, 'quantity' | 'city'> & { quantity?: number; city?: string },
  ) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setQuantity: (id: string, quantity: number) => void;
  setCity: (id: string, city: string) => void;
  isInCart: (id: string) => boolean;
  totalPerDay: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'mv_capsule_v2';

function migrate(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => ({
    id: String(it.id),
    name: String(it.name ?? ''),
    brand: String(it.brand ?? ''),
    category: String(it.category ?? ''),
    pricePerDay: Number(it.pricePerDay ?? 0),
    imageUrl: it.imageUrl ?? null,
    quantity: Number(it.quantity ?? 1),
    city: String(it.city ?? 'paris'),
  }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return migrate(JSON.parse(stored));
      // fall back to legacy key
      const legacy = localStorage.getItem('mv_capsule');
      return legacy ? migrate(JSON.parse(legacy)) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback<CartContextValue['addItem']>((item) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [
        ...prev,
        {
          ...item,
          quantity: item.quantity ?? 1,
          city: item.city ?? 'paris',
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
    );
  }, []);

  const setCity = useCallback((id: string, city: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, city } : i)));
  }, []);

  const isInCart = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const totalPerDay = items.reduce((sum, i) => sum + i.pricePerDay * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        setQuantity,
        setCity,
        isInCart,
        totalPerDay,
        count,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
