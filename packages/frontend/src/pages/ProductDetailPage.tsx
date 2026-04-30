import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useProduct } from '@/hooks/useProduct';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import type { ProductDetail } from '@/api/catalog';

// ─── Gradient fallback (same logic as ProductCard) ───────────────────────────
const gradients = [
  'from-[#e8f0ed] to-[#f5f0e3]',
  'from-[#f5f0e3] to-[#e7e5e4]',
  'from-[#e7e5e4] to-[#f5f5f4]',
  'from-[#d6d3d1] to-[#e8f0ed]',
  'from-[#f5f0e3] to-[#fafaf9]',
  'from-[#e8f0ed] to-[#e7e5e4]',
];
function deterministicGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return gradients[Math.abs(h) % gradients.length]!;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-default border border-sand px-3 py-1 font-sans text-[12px] font-medium capitalize text-charcoal">
      {children}
    </span>
  );
}

// ─── Accordion section ───────────────────────────────────────────────────────
function AccordionSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-linen">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between py-4"
      >
        <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.9px] text-ink">
          {title}
        </span>
        <svg
          width="11"
          height="7"
          viewBox="0 0 11 7"
          fill="none"
          className={cn(
            'shrink-0 text-stone transition-transform duration-200',
            open && 'rotate-180',
          )}
        >
          <path
            d="M1 1l4.5 4.5L10 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

// ─── Condition label ─────────────────────────────────────────────────────────
function conditionLabel(condition: string) {
  if (condition === 'EXCELLENT') return 'Excellent condition';
  if (condition === 'GOOD') return 'Good condition';
  return 'Well-loved';
}

// ─── Image gallery ────────────────────────────────────────────────────────────
function Gallery({ product }: { product: ProductDetail }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const images = product.images ?? [];
  const gradient = deterministicGradient(product.id);

  const activeImage = images[activeIdx];

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-pearl">
        {activeImage ? (
          <img
            src={activeImage.url}
            alt={activeImage.altText ?? product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'h-16 w-12 cursor-pointer overflow-hidden rounded-lg transition-all duration-200',
                i === activeIdx
                  ? 'ring-2 ring-brand ring-offset-1'
                  : 'opacity-60 hover:opacity-100',
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rental calculator ────────────────────────────────────────────────────────
function RentalForm({
  product,
  onReserve,
}: {
  product: ProductDetail;
  onReserve: (start: string, end: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0]!;
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const days =
    start && end
      ? Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
      : null;
  const total = days ? days * product.rentalPricePerDay : null;

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
            Pick-up
          </label>
          <input
            type="date"
            value={start}
            min={today}
            onChange={(e) => setStart(e.target.value)}
            className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
            Return
          </label>
          <input
            type="date"
            value={end}
            min={start || today}
            onChange={(e) => setEnd(e.target.value)}
            className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
      </div>

      {total && (
        <div className="rounded-xl bg-pearl px-5 py-4">
          <div className="flex items-baseline justify-between font-sans">
            <span className="text-[13px] text-stone">
              {days} {days === 1 ? 'day' : 'days'} × €{product.rentalPricePerDay}
            </span>
            <span className="text-[18px] font-semibold text-ink">€{total}</span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-stone">Cleaning &amp; insurance included</p>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => {
          if (start && end) onReserve(start, end);
        }}
      >
        {total ? `Reserve for €${total}` : 'Reserve This Piece'}
      </Button>

      <p className="text-center font-sans text-[12px] text-stone">
        Free cancellation up to 72h before pick-up
      </p>
    </div>
  );
}

// ─── Sustainability bar ───────────────────────────────────────────────────────
function LifecycleBar({ percentage }: { percentage: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-sans text-[12px] text-stone">
        <span>Lifecycle</span>
        <span className="font-semibold text-ink">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-linen">
        <div
          className="h-full rounded-full bg-brand transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <Container className="py-12">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-[3/4] animate-pulse rounded-2xl bg-linen" />
        <div className="space-y-4">
          <div className="h-3 w-20 animate-pulse rounded bg-linen" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-linen" />
          <div className="h-4 w-24 animate-pulse rounded bg-linen" />
          <div className="h-8 w-32 animate-pulse rounded bg-linen" />
          <div className="h-px w-full bg-linen" />
          <div className="flex gap-2">
            {[40, 56, 64].map((w) => (
              <div key={w} className="h-8 animate-pulse rounded bg-linen" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

function CityPin() {
  return (
    <svg width="10" height="13" viewBox="0 0 10 13" fill="none" className="shrink-0">
      <path
        d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 1 1 5 3.25a1.75 1.75 0 0 1 0 3.5z"
        fill="currentColor"
      />
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const MAX_PER_ORDER = 5;
const LOW_STOCK_THRESHOLD = 3;

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { product, loading, error } = useProduct(id);
  const { isInCart, addItem, removeItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Cities where this product has any stock
  const citiesWithStock = useMemo(
    () => (product?.availability ?? []).filter((a) => a.total > 0),
    [product],
  );

  const [selectedCity, setSelectedCity] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  // Default the city once we know where the stock is
  useEffect(() => {
    if (!selectedCity && citiesWithStock.length > 0) {
      setSelectedCity(citiesWithStock[0]!.city);
    }
  }, [citiesWithStock, selectedCity]);

  const cityAvailability = citiesWithStock.find((c) => c.city === selectedCity);
  const maxQty = Math.min(MAX_PER_ORDER, cityAvailability?.available ?? MAX_PER_ORDER);
  const outOfStock = !cityAvailability || cityAvailability.available === 0;

  // Clamp quantity if the user switches to a city with less stock
  useEffect(() => {
    if (quantity > maxQty) setQuantity(Math.max(1, maxQty));
  }, [maxQty, quantity]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        {loading && <Skeleton />}

        {error && !loading && (
          <Container className="py-24 text-center">
            <p className="font-serif text-2xl text-ink">Product not found</p>
            <Link
              to="/collection"
              className="mt-4 inline-block font-sans text-sm text-brand underline"
            >
              Back to collection
            </Link>
          </Container>
        )}

        {product && (
          <>
            {/* Breadcrumb */}
            <div className="border-b border-linen">
              <Container>
                <nav className="flex items-center gap-1.5 py-3.5 font-sans text-[12px] text-stone">
                  <Link to="/collection" className="transition-colors hover:text-ink">
                    Collection
                  </Link>
                  <span className="text-sand">/</span>
                  <Link
                    to={`/collection?category=${product.category.id}`}
                    className="transition-colors hover:text-ink"
                  >
                    {product.category.name}
                  </Link>
                  <span className="text-sand">/</span>
                  <span className="text-ink">{product.name}</span>
                </nav>
              </Container>
            </div>

            {/* Product section */}
            <Container className="py-10 lg:py-14">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px] lg:gap-14 xl:gap-20">
                {/* Gallery — scrolls naturally */}
                <Gallery product={product} />

                {/* Info panel — sticky on desktop */}
                <div className="lg:sticky lg:top-20 lg:self-start">
                  {/* Category */}
                  <div className="flex items-center justify-between">
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-stone">
                      {product.category.name}
                    </p>
                    {citiesWithStock.length > 0 && (
                      <span className="flex items-center gap-1 font-sans text-[12px] font-medium capitalize text-stone">
                        <CityPin />
                        {citiesWithStock.length === 1
                          ? citiesWithStock[0]!.city
                          : `${citiesWithStock.length} cities`}
                      </span>
                    )}
                  </div>

                  <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.3px] text-ink">
                    {product.name}
                  </h1>
                  <p className="mt-1 font-sans text-[14px] text-stone">{product.brand}</p>

                  {/* Price */}
                  <p className="mt-5 font-sans">
                    <span className="text-[32px] font-semibold text-ink">
                      €{product.rentalPricePerDay}
                    </span>
                    <span className="ml-1.5 text-[15px] text-stone">/ day</span>
                  </p>

                  {/* Chips */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Chip>EU {product.sizeEu}</Chip>
                    {product.sizeUk && <Chip>UK {product.sizeUk}</Chip>}
                    {product.sizeUs && <Chip>US {product.sizeUs}</Chip>}
                    {product.color && <Chip>{product.color}</Chip>}
                    {product.material && <Chip>{product.material}</Chip>}
                    <Chip>{product.gender}</Chip>
                    <Chip>{product.season.replace('_', ' ')}</Chip>
                  </div>

                  <div className="my-6 border-t border-linen" />

                  {/* City + quantity selector */}
                  {citiesWithStock.length > 0 && (
                    <div className="mb-5 space-y-3">
                      {citiesWithStock.length > 1 && (
                        <div>
                          <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
                            Pick-up city
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {citiesWithStock.map((c) => (
                              <button
                                key={c.city}
                                onClick={() => setSelectedCity(c.city)}
                                className={cn(
                                  'cursor-pointer rounded-full border px-3.5 py-1.5 font-sans text-[12px] font-medium capitalize transition-colors',
                                  selectedCity === c.city
                                    ? 'border-ink bg-ink text-ivory'
                                    : 'border-sand bg-white text-charcoal hover:border-charcoal',
                                )}
                              >
                                {c.city}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div>
                          <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
                            Quantity
                          </label>
                          <div className="flex items-center gap-2 rounded-full border border-sand bg-white px-1 w-fit">
                            <button
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              disabled={quantity <= 1}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center font-sans text-[16px] text-stone hover:text-ink disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] text-center font-sans text-[13px] font-semibold text-ink">
                              {quantity}
                            </span>
                            <button
                              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                              disabled={quantity >= maxQty}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center font-sans text-[16px] text-stone hover:text-ink disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {cityAvailability &&
                          cityAvailability.available > 0 &&
                          cityAvailability.available <= LOW_STOCK_THRESHOLD && (
                            <p className="mt-6 font-sans text-[12px] font-medium text-brand">
                              Only {cityAvailability.available} left in {selectedCity}
                            </p>
                          )}
                        {outOfStock && (
                          <p className="mt-6 font-sans text-[12px] font-medium text-red-600">
                            Out of stock in {selectedCity}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rental form */}
                  <RentalForm
                    product={product}
                    onReserve={(start, end) => {
                      if (!isInCart(product.id)) {
                        addItem({
                          id: product.id,
                          name: product.name,
                          brand: product.brand,
                          category: product.category.name,
                          pricePerDay: product.rentalPricePerDay,
                          imageUrl: product.primaryImageUrl,
                          quantity,
                          city: selectedCity || 'paris',
                        });
                      }
                      navigate(`/checkout?start=${start}&end=${end}`);
                    }}
                  />

                  {/* Secondary actions: Favorite + Capsule */}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        toggleFavorite({
                          id: product.id,
                          name: product.name,
                          brand: product.brand,
                          category: product.category.name,
                          pricePerDay: product.rentalPricePerDay,
                          imageUrl: product.primaryImageUrl,
                        })
                      }
                      className={cn(
                        'flex cursor-pointer items-center justify-center gap-2 rounded-default border-[1.5px] py-2.5 font-sans text-[13px] font-medium transition-all duration-200',
                        isFavorite(product.id)
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-sand text-charcoal hover:border-brand hover:text-brand',
                      )}
                    >
                      <svg width="14" height="13" viewBox="0 0 14 13" fill="none">
                        {isFavorite(product.id) ? (
                          <path
                            d="M7 12.5s-6-4.1-6-7.5a3.5 3.5 0 0 1 6-2.45A3.5 3.5 0 0 1 13 5c0 3.4-6 7.5-6 7.5z"
                            fill="currentColor"
                          />
                        ) : (
                          <path
                            d="M7 12.5s-6-4.1-6-7.5a3.5 3.5 0 0 1 6-2.45A3.5 3.5 0 0 1 13 5c0 3.4-6 7.5-6 7.5z"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                      {isFavorite(product.id) ? 'Saved' : 'Save'}
                    </button>

                    <button
                      disabled={!isInCart(product.id) && outOfStock}
                      onClick={() => {
                        if (isInCart(product.id)) {
                          removeItem(product.id);
                        } else {
                          addItem({
                            id: product.id,
                            name: product.name,
                            brand: product.brand,
                            category: product.category.name,
                            pricePerDay: product.rentalPricePerDay,
                            imageUrl: product.primaryImageUrl,
                            quantity,
                            city: selectedCity || 'paris',
                          });
                        }
                      }}
                      className={cn(
                        'flex cursor-pointer items-center justify-center gap-2 rounded-default border-[1.5px] py-2.5 font-sans text-[13px] font-medium transition-all duration-200',
                        isInCart(product.id)
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-sand text-charcoal hover:border-brand hover:text-brand',
                        !isInCart(product.id) && outOfStock && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                        {isInCart(product.id) ? (
                          <path
                            d="M4 7h6"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        ) : (
                          <path
                            d="M7 4v6M4 7h6"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                      {isInCart(product.id)
                        ? 'In Capsule'
                        : quantity > 1
                          ? `Add ${quantity} to Capsule`
                          : 'Add to Capsule'}
                    </button>
                  </div>

                  <div className="my-6 border-t border-linen" />

                  {/* Accordions */}
                  {product.description && (
                    <AccordionSection title="Description" defaultOpen>
                      <p className="font-sans text-[14px] leading-relaxed text-stone">
                        {product.description}
                      </p>
                    </AccordionSection>
                  )}

                  <AccordionSection title="Condition &amp; Care">
                    <div className="space-y-3">
                      <p className="font-sans text-[14px] text-stone">
                        <span className="font-semibold text-ink">
                          {conditionLabel(product.condition)}
                        </span>{' '}
                        — professionally cleaned and inspected before every rental.
                      </p>
                      <p className="font-sans text-[13px] text-stone">
                        Rental cycle: {product.cycleCount} / {product.maxCycles}
                      </p>
                    </div>
                  </AccordionSection>

                  <AccordionSection title="Sustainability">
                    <div className="space-y-4">
                      <LifecycleBar percentage={product.lifecyclePercentage} />
                      <p className="font-sans text-[13px] leading-relaxed text-stone">
                        This piece has completed{' '}
                        <span className="font-semibold text-ink">{product.cycleCount}</span> rental
                        cycles. By renting instead of buying, each traveler avoids adding ~
                        {product.weightGrams
                          ? `${(product.weightGrams / 1000).toFixed(1)} kg`
                          : 'an item'}{' '}
                        to their luggage — and to landfill.
                      </p>
                    </div>
                  </AccordionSection>
                </div>
              </div>
            </Container>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
