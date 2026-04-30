import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Filters {
  season: string | null;
  size: string | null;
  brand: string | null;
  maxPricePerDay: number | null;
  gender: string | null;
}

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (filters: Filters) => void;
}

const seasons = ['spring', 'summer', 'autumn', 'winter'];
const sizes = ['XS', 'S', 'M', 'L', 'XL'];
const brands = [
  'Sandro',
  'Reformation',
  'A.P.C.',
  'Cos',
  'Vince',
  'Theory',
  'Toteme',
  'Ba&sh',
  'Isabel Marant',
  'Ganni',
];
const priceOptions = [
  { label: 'Any price', value: null },
  { label: 'Under 5 EUR/day', value: 5 },
  { label: 'Under 8 EUR/day', value: 8 },
  { label: 'Under 12 EUR/day', value: 12 },
  { label: 'Under 20 EUR/day', value: 20 },
];

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-linen py-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between"
      >
        <span className="font-sans text-sm font-semibold text-ink">{title}</span>
        <span className="font-sans text-lg leading-none text-stone">{open ? '\u2212' : '+'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function PillGroup({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(selected === opt ? null : opt)}
          className={cn(
            'cursor-pointer rounded-default px-3.5 py-2 font-sans text-[13px] font-medium capitalize transition-all duration-200',
            selected === opt ? 'bg-ink text-ivory' : 'bg-pearl text-charcoal hover:bg-linen',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function FilterPanel({ open, onClose, filters, onApply }: FilterPanelProps) {
  const [draft, setDraft] = useState<Filters>(filters);

  // Sync draft when panel opens
  const prevOpen = useState(open)[0];
  if (open && !prevOpen) {
    // Will sync on next render via effect — but for simplicity, we init from props
  }

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const clearDraft = () =>
    setDraft({
      season: null,
      size: null,
      brand: null,
      maxPricePerDay: null,
      gender: null,
    });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-white shadow-floating">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-linen px-6">
          <h2 className="font-serif text-xl font-semibold text-ink">Filters</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-pearl transition-colors hover:bg-linen"
            aria-label="Close filters"
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute h-[1.5px] w-5 rotate-45 rounded-full bg-ink" />
              <span className="absolute h-[1.5px] w-5 -rotate-45 rounded-full bg-ink" />
            </span>
          </button>
        </div>

        {/* Scrollable filter sections */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Gender (visible on mobile — hidden in FilterBar on mobile) */}
          <FilterSection title="Gender">
            <PillGroup
              options={['women', 'men', 'unisex']}
              selected={draft.gender}
              onSelect={(v) => update('gender', v)}
            />
          </FilterSection>

          <FilterSection title="Season">
            <PillGroup
              options={seasons}
              selected={draft.season}
              onSelect={(v) => update('season', v)}
            />
          </FilterSection>

          <FilterSection title="Size (EU)">
            <PillGroup options={sizes} selected={draft.size} onSelect={(v) => update('size', v)} />
          </FilterSection>

          <FilterSection title="Brand">
            <PillGroup
              options={brands}
              selected={draft.brand}
              onSelect={(v) => update('brand', v)}
            />
          </FilterSection>

          <FilterSection title="Max Price">
            <div className="flex flex-col gap-2">
              {priceOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => update('maxPricePerDay', opt.value)}
                  className={cn(
                    'cursor-pointer rounded-default px-3.5 py-2.5 text-left font-sans text-[13px] font-medium transition-all duration-200',
                    draft.maxPricePerDay === opt.value
                      ? 'bg-ink text-ivory'
                      : 'text-charcoal hover:bg-pearl',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterSection>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 border-t border-linen p-6">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              clearDraft();
              onApply({
                season: null,
                size: null,
                brand: null,
                maxPricePerDay: null,
                gender: null,
              });
              onClose();
            }}
          >
            Clear All
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Show Results
          </Button>
        </div>
      </div>
    </div>
  );
}
