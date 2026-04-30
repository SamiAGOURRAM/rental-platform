import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useCart, type CartItem } from '@/context/CartContext';

// ─── Gradient (same deterministic logic) ─────────────────────────────────────
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

// ─── Item row ─────────────────────────────────────────────────────────────────
function ItemRow({
  item,
  onRemove,
  onQtyChange,
  onCityChange,
}: {
  item: CartItem;
  onRemove: () => void;
  onQtyChange: (q: number) => void;
  onCityChange: (c: string) => void;
}) {
  return (
    <div className="flex items-start gap-4 py-5">
      <Link to={`/collection/${item.id}`} className="shrink-0">
        <div className="h-24 w-18 overflow-hidden rounded-lg">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${itemGradient(item.id)}`} />
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.2px] text-stone">
          {item.category}
        </span>
        <Link
          to={`/collection/${item.id}`}
          className="font-serif text-[18px] font-semibold leading-tight text-ink transition-colors hover:text-brand"
        >
          {item.name}
        </Link>
        <p className="font-sans text-[13px] text-stone">{item.brand}</p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {/* Quantity stepper */}
          <div className="flex items-center gap-2 rounded-full border border-sand bg-white px-1">
            <button
              onClick={() => onQtyChange(Math.max(1, item.quantity - 1))}
              className="flex h-7 w-7 cursor-pointer items-center justify-center font-sans text-[16px] text-stone hover:text-ink"
            >
              −
            </button>
            <span className="min-w-[1rem] text-center font-sans text-[13px] font-semibold text-ink">
              {item.quantity}
            </span>
            <button
              onClick={() => onQtyChange(item.quantity + 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center font-sans text-[16px] text-stone hover:text-ink"
            >
              +
            </button>
          </div>

          {/* City selector */}
          <select
            value={item.city}
            onChange={(e) => onCityChange(e.target.value)}
            className="h-8 cursor-pointer rounded-full border border-sand bg-white px-3 font-sans text-[12px] font-medium text-charcoal outline-none hover:border-charcoal"
          >
            <option value="paris">Paris</option>
            <option value="nice">Nice</option>
            <option value="lyon">Lyon</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col items-end gap-3 shrink-0">
        <p className="font-sans text-[15px] font-semibold text-ink">
          €{(item.pricePerDay * item.quantity).toFixed(2)}
          <span className="ml-1 font-normal text-stone text-[13px]">/ day</span>
        </p>
        <button
          onClick={onRemove}
          className="cursor-pointer font-sans text-[12px] font-medium text-stone underline decoration-sand underline-offset-2 transition-colors hover:text-ink hover:decoration-ink"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Order summary ────────────────────────────────────────────────────────────
function OrderSummary({ items, totalPerDay }: { items: CartItem[]; totalPerDay: number }) {
  const today = new Date().toISOString().split('T')[0]!;
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const navigate = useNavigate();

  const days =
    start && end
      ? Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
      : null;
  const subtotal = days ? days * totalPerDay : null;
  const cleaningFee = items.length > 0 ? items.length * 2 : null;
  const total = subtotal && cleaningFee ? subtotal + cleaningFee : null;

  return (
    <div className="rounded-2xl border border-linen bg-white p-6 shadow-lifted">
      <h2 className="font-serif text-xl font-semibold text-ink">Your Trip</h2>

      {/* Dates */}
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
            Pick-up
          </label>
          <input
            type="date"
            value={start}
            min={today}
            onChange={(e) => setStart(e.target.value)}
            className="h-10 w-full rounded-default border-[1.5px] border-sand bg-ivory px-3 font-sans text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
            Return
          </label>
          <input
            type="date"
            value={end}
            min={start || today}
            onChange={(e) => setEnd(e.target.value)}
            className="h-10 w-full rounded-default border-[1.5px] border-sand bg-ivory px-3 font-sans text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
      </div>

      {/* Summary lines */}
      <div className="mt-6 space-y-3 border-t border-linen pt-5">
        <div className="flex items-baseline justify-between font-sans text-[13px]">
          <span className="text-stone">
            {items.length} {items.length === 1 ? 'piece' : 'pieces'}
          </span>
          <span className="font-medium text-charcoal">€{totalPerDay.toFixed(2)} / day</span>
        </div>

        {days && (
          <div className="flex items-baseline justify-between font-sans text-[13px]">
            <span className="text-stone">
              {days} {days === 1 ? 'day' : 'days'}
            </span>
            <span className="font-medium text-charcoal">× €{totalPerDay.toFixed(2)}</span>
          </div>
        )}

        {cleaningFee && (
          <div className="flex items-baseline justify-between font-sans text-[13px]">
            <span className="text-stone">Cleaning &amp; care</span>
            <span className="font-medium text-charcoal">€{cleaningFee.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-baseline justify-between font-sans text-[13px]">
          <span className="text-stone">Insurance</span>
          <span className="font-medium text-brand">Included</span>
        </div>
      </div>

      {/* Total */}
      {total && (
        <div className="mt-4 flex items-baseline justify-between border-t border-linen pt-4 font-sans">
          <span className="text-[14px] font-semibold text-ink">Total</span>
          <span className="text-[22px] font-semibold text-ink">€{total.toFixed(2)}</span>
        </div>
      )}

      <div className="mt-5 space-y-3">
        <Button
          variant="primary"
          size="lg"
          className={cn('w-full', !days && 'opacity-60')}
          onClick={() => {
            if (!days) return;
            navigate('/checkout');
          }}
        >
          {total ? `Reserve for €${total.toFixed(2)}` : 'Choose dates to reserve'}
        </Button>
        <p className="text-center font-sans text-[11px] text-stone">
          No payment until pick-up · Free cancellation 72h before
        </p>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      {/* Visual placeholder */}
      <div className="mb-8 grid grid-cols-3 gap-2 opacity-40">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`h-28 w-20 rounded-lg bg-gradient-to-br ${gradients[i % gradients.length]}`}
          />
        ))}
      </div>
      <h2 className="font-serif text-[28px] font-semibold text-ink">Your capsule is empty</h2>
      <p className="mx-auto mt-3 max-w-sm font-sans text-base leading-relaxed text-stone">
        Add pieces from the collection to build your perfect travel wardrobe.
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
export function CapsulePage() {
  const { items, removeItem, setQuantity, setCity, totalPerDay } = useCart();

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
              <span className="text-ink">My Capsule</span>
            </nav>
            <h1 className="font-serif text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.3px] text-ink">
              My Capsule
            </h1>
            {items.length > 0 && (
              <p className="mt-2 font-sans text-[14px] text-stone">
                {items.length} {items.length === 1 ? 'piece' : 'pieces'} · Paris
              </p>
            )}
          </Container>
        </div>

        <Container className="py-10 lg:py-14">
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
              {/* Item list */}
              <div>
                <div className="divide-y divide-linen">
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onRemove={() => removeItem(item.id)}
                      onQtyChange={(q) => setQuantity(item.id, q)}
                      onCityChange={(c) => setCity(item.id, c)}
                    />
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-linen pt-6">
                  <Link
                    to="/collection"
                    className="flex items-center gap-2 font-sans text-[13px] font-medium text-stone transition-colors hover:text-ink"
                  >
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                      <path
                        d="M13 5H1M5 9L1 5l4-4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Continue browsing
                  </Link>
                  <p className="font-sans text-[13px] text-stone">
                    <span className="font-semibold text-ink">€{totalPerDay.toFixed(2)}</span> / day
                    total
                  </p>
                </div>
              </div>

              {/* Order summary — sticky */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                <OrderSummary items={items} totalPerDay={totalPerDay} />
              </div>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
