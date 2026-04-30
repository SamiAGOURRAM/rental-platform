import { cn } from '@/lib/utils';

interface FilterBarProps {
  // Breadcrumb
  selectedGender: string | null;
  selectedCategoryName: string | null;
  onClearCategory: () => void;
  onClearAll: () => void;
  // Search
  query: string;
  onQueryChange: (q: string) => void;
  // Right side
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  sortBy: string;
  onSortChange: (s: string) => void;
  activeFilterCount: number;
  onOpenMobileFilters: () => void;
}

function SidebarToggleIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
      <rect
        x="0.75"
        y="0.75"
        width="16.5"
        height="12.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <line x1="5.5" y1="0.75" x2="5.5" y2="13.25" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function FilterBar({
  selectedGender,
  selectedCategoryName,
  onClearCategory,
  onClearAll,
  query,
  onQueryChange,
  sidebarVisible,
  onToggleSidebar,
  sortBy,
  onSortChange,
  activeFilterCount,
  onOpenMobileFilters,
}: FilterBarProps) {
  const hasGender = !!selectedGender;
  const hasCategory = !!selectedCategoryName;

  return (
    <div className="sticky top-16 z-40 border-b border-linen bg-ivory/90 backdrop-blur-[12px]">
      <div className="flex items-center justify-between px-6 py-3 lg:px-12 xl:px-16">
        {/* Left: filter breadcrumb */}
        <nav className="flex items-center gap-1.5 font-sans text-[13px]">
          <button
            onClick={onClearAll}
            className={cn(
              'cursor-pointer transition-colors duration-150',
              hasGender || hasCategory ? 'text-stone hover:text-ink' : 'font-medium text-ink',
            )}
          >
            All
          </button>

          {hasGender && (
            <>
              <span className="text-sand">/</span>
              <button
                onClick={hasCategory ? onClearCategory : onClearAll}
                className={cn(
                  'cursor-pointer capitalize transition-colors duration-150',
                  hasCategory ? 'text-stone hover:text-ink' : 'font-semibold text-ink',
                )}
              >
                {selectedGender}
              </button>
            </>
          )}

          {hasCategory && (
            <>
              <span className="text-sand">/</span>
              <span className="font-semibold text-ink">{selectedCategoryName}</span>
            </>
          )}
        </nav>

        {/* Right: controls */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M9.5 9.5L13 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search pieces…"
              className="h-8 w-[180px] rounded-default border-[1.5px] border-sand bg-white pl-8 pr-3 font-sans text-[13px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
          {/* Desktop: sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            className={cn(
              'hidden cursor-pointer items-center gap-2 font-sans text-[13px] font-medium transition-colors lg:flex',
              sidebarVisible ? 'text-ink' : 'text-stone hover:text-charcoal',
            )}
            title={sidebarVisible ? 'Hide filters' : 'Show filters'}
          >
            <SidebarToggleIcon />
            {sidebarVisible ? 'Hide filters' : 'Show filters'}
          </button>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-8 cursor-pointer appearance-none rounded-default border-[1.5px] border-sand bg-white pl-3 pr-7 font-sans text-[13px] font-medium text-charcoal outline-none transition-colors focus:border-brand"
            >
              <option value="default">Sort by</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone"
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
            >
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Mobile: filters button */}
          <button
            onClick={onOpenMobileFilters}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-default border-[1.5px] border-sand px-3 py-1 font-sans text-[13px] font-medium text-charcoal transition-all lg:hidden',
              activeFilterCount > 0 && 'border-brand text-brand',
            )}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-ivory">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
