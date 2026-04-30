import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface FavoriteItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  pricePerDay: number;
  imageUrl: string | null;
}

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = 'mv_favorites';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as FavoriteItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) =>
      prev.some((f) => f.id === item.id) ? prev.filter((f) => f.id !== item.id) : [...prev, item],
    );
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  return (
    <FavoritesContext.Provider
      value={{ favorites, toggleFavorite, isFavorite, count: favorites.length }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
