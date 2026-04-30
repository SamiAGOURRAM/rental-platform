import { Link } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useFavorites, type FavoriteItem } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';

// ─── Gradient (deterministic) ─────────────────────────────────────────────────
const gradients = [
  'from-[#e8f0ed] to-[#f5f0e3]',
  'from-[#f5f0e3] to-[#e7e5e4]',
  'from-[#e7e5e4] to-[#f5f5f4]',
  'from-[#d6d3d1] to-[#e8f0ed]',
  'from-[#f5f0e3] to-[#fafaf9]',
  'from-[#e8f0ed] to-[#e7e5e4]',
];
function itemGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return gradients[Math.abs(h) % gradients.length]!;
}

// ─── Favorite card ────────────────────────────────────────────────────────────
function FavoriteCard({ item }: { item: FavoriteItem }) {
  const { toggleFavorite } = useFavorites();
  const { isInCart, addItem, removeItem } = useCart();

  const inCart = isInCart(item.id);

  return (
    <article className="group relative overflow-hidden rounded-xl bg-white shadow-lifted transition-all duration-300 hover:-translate-y-0.5 hover:shadow-hover">
      {/* Image */}
      <Link to={`/collection/${item.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={`${item.name} by ${item.brand}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${itemGradient(item.id)}`} />
          )}
        </div>
      </Link>

      {/* Remove heart — top right */}
      <button
        onClick={() => toggleFavorite(item)}
        title="Remove from saved"
        className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-brand shadow-sm backdrop-blur-sm transition-all hover:bg-white"
      >
        <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
          <path
            d="M7.5 13s-6-4.35-6-8a3.5 3.5 0 0 1 6-2.45A3.5 3.5 0 0 1 13.5 5c0 3.65-6 8-6 8z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Info */}
      <div className="p-4 pb-3">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-stone">
          {item.category}
        </span>
        <Link to={`/collection/${item.id}`}>
          <h3 className="mt-1 font-serif text-[19px] font-semibold leading-tight text-ink transition-colors hover:text-brand">
            {item.name}
          </h3>
        </Link>
        <p className="mt-0.5 font-sans text-[13px] text-stone">{item.brand}</p>
        <p className="mt-2 font-sans text-[15px] font-semibold text-ink">
          €{item.pricePerDay}
          <span className="ml-1 font-normal text-stone text-[13px]">/ day</span>
        </p>
      </div>

      {/* Add to capsule */}
      <div className="px-4 pb-4">
        <button
          onClick={() =>
            inCart
              ? removeItem(item.id)
              : addItem({
                  id: item.id,
                  name: item.name,
                  brand: item.brand,
                  category: item.category,
                  pricePerDay: item.pricePerDay,
                  imageUrl: item.imageUrl,
                })
          }
          className={cn(
            'w-full cursor-pointer rounded-default border-[1.5px] py-2 font-sans text-[12px] font-semibold uppercase tracking-[0.8px] transition-all duration-200',
            inCart
              ? 'border-brand bg-brand/5 text-brand'
              : 'border-sand text-charcoal hover:border-brand hover:text-brand',
          )}
        >
          {inCart ? 'In Capsule' : 'Add to Capsule'}
        </button>
      </div>
    </article>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="mb-8 flex items-center justify-center">
        <div className="relative">
          {/* Overlapping gradient cards */}
          <div className="absolute -left-8 top-2 h-32 w-24 -rotate-6 rounded-xl bg-gradient-to-br from-[#e8f0ed] to-[#f5f0e3] opacity-60" />
          <div className="absolute -right-8 top-2 h-32 w-24 rotate-6 rounded-xl bg-gradient-to-br from-[#f5f0e3] to-[#e7e5e4] opacity-60" />
          <div className="relative z-10 flex h-32 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-[#e7e5e4] to-[#f5f5f4] shadow-lifted">
            <svg width="28" height="26" viewBox="0 0 28 26" fill="none" className="text-stone/50">
              <path
                d="M14 24.5S1 17.5 1 9.5a6.5 6.5 0 0 1 13-1.1A6.5 6.5 0 0 1 27 9.5c0 8-13 15-13 15z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
      <h2 className="font-serif text-[28px] font-semibold text-ink">Nothing saved yet</h2>
      <p className="mx-auto mt-3 max-w-sm font-sans text-base leading-relaxed text-stone">
        Heart pieces as you browse — they&rsquo;ll live here for when you&rsquo;re ready to pack.
      </p>
      <div className="mt-8">
        <Button variant="primary" size="lg" href="/collection">
          Browse the Collection
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const { addItem, isInCart } = useCart();

  const allInCapsule = favorites.length > 0 && favorites.every((f) => isInCart(f.id));

  const addAllToCapsule = () => {
    favorites.forEach((item) => {
      if (!isInCart(item.id)) {
        addItem({
          id: item.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          pricePerDay: item.pricePerDay,
          imageUrl: item.imageUrl,
        });
      }
    });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        {/* Header */}
        <div className="border-b border-linen bg-ivory">
          <Container className="py-10 pt-16">
            <nav className="mb-3 flex items-center gap-1.5 font-sans text-[12px] text-stone">
              <Link to="/collection" className="transition-colors hover:text-ink">
                Collection
              </Link>
              <span className="text-sand">/</span>
              <span className="text-ink">Saved Pieces</span>
            </nav>

            <div className="flex items-end justify-between">
              <div>
                <h1 className="font-serif text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.3px] text-ink">
                  Saved Pieces
                </h1>
                {favorites.length > 0 && (
                  <p className="mt-2 font-sans text-[14px] text-stone">
                    {favorites.length} {favorites.length === 1 ? 'piece' : 'pieces'} saved
                  </p>
                )}
              </div>

              {/* Bulk action */}
              {favorites.length > 1 && (
                <div className="flex items-center gap-4">
                  {!allInCapsule && (
                    <button
                      onClick={addAllToCapsule}
                      className="cursor-pointer font-sans text-[13px] font-semibold text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand"
                    >
                      Add all to capsule
                    </button>
                  )}
                  <button
                    onClick={() => favorites.forEach((f) => toggleFavorite(f))}
                    className="cursor-pointer font-sans text-[13px] font-medium text-stone underline decoration-sand underline-offset-2 transition-colors hover:text-ink"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </Container>
        </div>

        <Container className="py-10 lg:py-12">
          {favorites.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
              {favorites.map((item) => (
                <FavoriteCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
