import { cn } from '@/lib/utils';
import type { Category } from '@/api/catalog';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
}

export function CategorySidebar({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategorySidebarProps) {
  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <aside className="hidden w-44 shrink-0 lg:block">
      <div className="sticky top-32 pt-2">
        <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-stone">
          Category
        </p>
        <nav className="flex flex-col gap-0.5">
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              'w-full cursor-pointer rounded-sm px-2 py-1.5 text-left font-sans text-[14px] transition-colors duration-150',
              selectedCategory === null
                ? 'font-semibold text-ink'
                : 'font-medium text-stone hover:text-charcoal',
            )}
          >
            All
          </button>
          {parentCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                'w-full cursor-pointer rounded-sm px-2 py-1.5 text-left font-sans text-[14px] transition-colors duration-150',
                selectedCategory === cat.id
                  ? 'font-semibold text-ink'
                  : 'font-medium text-stone hover:text-charcoal',
              )}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
