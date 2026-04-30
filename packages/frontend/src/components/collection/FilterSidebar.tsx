import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Category } from '@/api/catalog';

export interface SidebarFilters {
  season: string | null;
  size: string | null;
  brand: string | null;
  maxPricePerDay: number | null;
}

interface FilterSidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  selectedGender: string | null;
  onGenderChange: (g: string | null) => void;
  filters: SidebarFilters;
  onFiltersChange: (f: SidebarFilters) => void;
  activeFilterCount: number;
  onClearAll: () => void;
}

const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
const euSizes = ['34', '36', '38', '40', '42', '44', '46', '48', '50'];
const brands = [
  'A.P.C.',
  'Ba&sh',
  'Cos',
  'Ganni',
  'Isabel Marant',
  'Reformation',
  'Sandro',
  'Theory',
  'Toteme',
  'Vince',
];
const priceOptions = [
  { label: 'Under €5 / day', value: 5 },
  { label: 'Under €8 / day', value: 8 },
  { label: 'Under €12 / day', value: 12 },
  { label: 'Under €20 / day', value: 20 },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="7"
      viewBox="0 0 11 7"
      fill="none"
      className={cn('shrink-0 text-stone transition-transform duration-200', open && 'rotate-180')}
    >
      <path
        d="M1 1l4.5 4.5L10 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Section({
  title,
  activeCount = 0,
  defaultOpen = false,
  children,
}: {
  title: string;
  activeCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-linen">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between py-3.5"
      >
        <span className="flex items-center gap-2 font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-ink">
          {title}
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold leading-none text-ivory">
              {activeCount}
            </span>
          )}
        </span>
        <Chevron open={open} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

function OptionList({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string | null;
  onSelect: (v: string | null) => void;
}) {
  return (
    <ul>
      {options.map((opt) => (
        <li key={opt}>
          <button
            onClick={() => onSelect(selected === opt ? null : opt)}
            className={cn(
              'w-full cursor-pointer px-0.5 py-1.5 text-left font-sans text-[13px] transition-colors duration-150',
              selected === opt
                ? 'font-semibold text-ink'
                : 'font-normal text-stone hover:text-charcoal',
            )}
          >
            {opt}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function FilterSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedGender,
  onGenderChange,
  filters,
  onFiltersChange,
  activeFilterCount,
  onClearAll,
}: FilterSidebarProps) {
  const parentCategories = categories.filter((c) => !c.parentId);

  const set = <K extends keyof SidebarFilters>(key: K, value: SidebarFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  // Normalize display: capitalize first letter for display, lowercase for state
  const genderDisplay = selectedGender
    ? selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1)
    : null;
  const seasonDisplay = filters.season
    ? filters.season.charAt(0).toUpperCase() + filters.season.slice(1)
    : null;

  return (
    <aside className="hidden w-48 shrink-0 lg:block">
      <div className="sticky top-20">
        {/* Category links */}
        <nav className="pb-3">
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              'w-full cursor-pointer px-0.5 py-1.5 text-left font-sans text-[13px] transition-colors',
              selectedCategory === null
                ? 'font-semibold text-ink'
                : 'font-normal text-stone hover:text-charcoal',
            )}
          >
            All
          </button>
          {parentCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                'w-full cursor-pointer px-0.5 py-1.5 text-left font-sans text-[13px] transition-colors',
                selectedCategory === cat.id
                  ? 'font-semibold text-ink'
                  : 'font-normal text-stone hover:text-charcoal',
              )}
            >
              {cat.name}
            </button>
          ))}
        </nav>

        {/* Filter accordions */}
        <div className="border-t border-linen">
          <Section title="Gender" activeCount={selectedGender ? 1 : 0} defaultOpen>
            <OptionList
              options={['Women', 'Men', 'Unisex']}
              selected={genderDisplay}
              onSelect={(v) => onGenderChange(v ? v.toLowerCase() : null)}
            />
          </Section>

          <Section title="Season" activeCount={filters.season ? 1 : 0}>
            <OptionList
              options={seasons}
              selected={seasonDisplay}
              onSelect={(v) => set('season', v ? v.toLowerCase() : null)}
            />
          </Section>

          <Section title="Size (EU)" activeCount={filters.size ? 1 : 0}>
            <OptionList
              options={euSizes}
              selected={filters.size}
              onSelect={(v) => set('size', v)}
            />
          </Section>

          <Section title="Brand" activeCount={filters.brand ? 1 : 0}>
            <OptionList
              options={brands}
              selected={filters.brand}
              onSelect={(v) => set('brand', v)}
            />
          </Section>

          <Section title="Max Price / Day" activeCount={filters.maxPricePerDay ? 1 : 0}>
            <ul>
              {priceOptions.map((opt) => (
                <li key={opt.label}>
                  <button
                    onClick={() =>
                      set('maxPricePerDay', filters.maxPricePerDay === opt.value ? null : opt.value)
                    }
                    className={cn(
                      'w-full cursor-pointer px-0.5 py-1.5 text-left font-sans text-[13px] transition-colors',
                      filters.maxPricePerDay === opt.value
                        ? 'font-semibold text-ink'
                        : 'font-normal text-stone hover:text-charcoal',
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={onClearAll}
            className="mt-5 cursor-pointer font-sans text-[12px] font-medium text-stone underline decoration-sand underline-offset-2 transition-colors hover:text-ink"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>
    </aside>
  );
}
