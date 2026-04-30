import { Container } from '@/components/layout/Container';
import { SectionLabel } from '@/components/ui/SectionLabel';

const CITIES = [
  { value: '', label: 'Any city' },
  { value: 'paris', label: 'Paris' },
  { value: 'nice', label: 'Nice' },
  { value: 'lyon', label: 'Lyon' },
] as const;

interface CollectionHeroProps {
  city: string;
  onCityChange: (value: string) => void;
  rentalStart: string;
  rentalEnd: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export function CollectionHero({
  city,
  onCityChange,
  rentalStart,
  rentalEnd,
  onStartChange,
  onEndChange,
}: CollectionHeroProps) {
  const today = new Date().toISOString().split('T')[0]!;

  const rentalDays =
    rentalStart && rentalEnd
      ? Math.max(
          1,
          Math.ceil((new Date(rentalEnd).getTime() - new Date(rentalStart).getTime()) / 86400000),
        )
      : null;

  return (
    <section className="border-b border-linen bg-ivory pb-10 pt-28">
      <Container>
        <div className="max-w-2xl">
          <SectionLabel className="mb-3">The Collection</SectionLabel>
          <h1 className="font-serif text-[clamp(32px,4.5vw,44px)] font-semibold leading-[1.12] tracking-[-0.4px] text-ink">
            Pieces Worth Traveling For
          </h1>
          <p className="mt-3 max-w-lg font-sans text-base leading-relaxed text-stone">
            Browse our curated selection of premium garments. Set your destination and travel dates
            to see what&rsquo;s available.
          </p>
        </div>

        {/* Location + Date Range */}
        <div className="mt-8 flex flex-wrap items-end gap-4">
          {/* City */}
          <div>
            <label
              htmlFor="rental-city"
              className="mb-1.5 block font-sans text-xs font-medium uppercase tracking-[1px] text-stone"
            >
              Destination
            </label>
            <div className="relative">
              <select
                id="rental-city"
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                className="h-11 appearance-none rounded-default border-[1.5px] border-sand bg-white pl-4 pr-9 font-sans text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
              >
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {/* Chevron */}
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone">
                <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                  <path
                    d="M1 1l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-2.5 hidden h-px w-4 bg-sand sm:block" />

          {/* Pick-up */}
          <div>
            <label
              htmlFor="rental-start"
              className="mb-1.5 block font-sans text-xs font-medium uppercase tracking-[1px] text-stone"
            >
              Pick-up
            </label>
            <input
              id="rental-start"
              type="date"
              value={rentalStart}
              min={today}
              onChange={(e) => onStartChange(e.target.value)}
              className="h-11 rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>

          {/* Return */}
          <div>
            <label
              htmlFor="rental-end"
              className="mb-1.5 block font-sans text-xs font-medium uppercase tracking-[1px] text-stone"
            >
              Return
            </label>
            <input
              id="rental-end"
              type="date"
              value={rentalEnd}
              min={rentalStart || today}
              onChange={(e) => onEndChange(e.target.value)}
              className="h-11 rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>

          {rentalDays && (
            <p className="pb-2.5 font-sans text-sm text-brand">
              {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
