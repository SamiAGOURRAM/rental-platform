import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/Button';
import type { Product } from '@/api/catalog';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onClearFilters: () => void;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl bg-white shadow-lifted">
      <div className="aspect-[3/4] bg-gradient-to-br from-linen to-pearl" />
      <div className="space-y-2.5 p-4">
        <div className="h-3 w-16 rounded bg-linen" />
        <div className="h-5 w-3/4 rounded bg-linen" />
        <div className="h-3 w-1/2 rounded bg-pearl" />
        <div className="h-4 w-20 rounded bg-linen" />
      </div>
    </div>
  );
}

export function ProductGrid({
  products,
  loading,
  loadingMore,
  total,
  hasMore,
  onLoadMore,
  onClearFilters,
}: ProductGridProps) {
  return (
    <div className="min-w-0 flex-1">
      {/* Result count */}
      {!loading && (
        <p className="mb-5 font-sans text-sm text-stone">
          {total} {total === 1 ? 'piece' : 'pieces'}
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="py-20 text-center">
          <h3 className="font-serif text-2xl font-semibold text-ink">No pieces found</h3>
          <p className="mx-auto mt-3 max-w-md font-sans text-base text-stone">
            We couldn&rsquo;t find any garments matching your current filters. Try adjusting your
            search or clearing some filters.
          </p>
          <div className="mt-6">
            <Button variant="outline" onClick={onClearFilters}>
              Clear All Filters
            </Button>
          </div>
        </div>
      )}

      {/* Product grid */}
      {!loading && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                brand={product.brand}
                category={product.category.name}
                pricePerDay={product.rentalPricePerDay}
                imageUrl={product.primaryImageUrl}
              />
            ))}
            {loadingMore &&
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`loading-${i}`} />)}
          </div>

          {/* Load more */}
          {hasMore && !loadingMore && (
            <div className="mt-12 text-center">
              <Button variant="outline" onClick={onLoadMore}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
