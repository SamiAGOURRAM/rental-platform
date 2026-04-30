import { useState, useMemo, useRef, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { CollectionHero } from '@/components/collection/CollectionHero';
import { FilterBar } from '@/components/collection/FilterBar';
import { FilterSidebar, type SidebarFilters } from '@/components/collection/FilterSidebar';
import { FilterPanel } from '@/components/collection/FilterPanel';
import { ProductGrid } from '@/components/collection/ProductGrid';
import { useCollectionProducts } from '@/hooks/useCollectionProducts';
import { useCategories } from '@/hooks/useCategories';
import type { Product } from '@/api/catalog';

const fallbackProducts: Product[] = [
  {
    id: '1',
    name: 'Linen Blazer',
    brand: 'Sandro',
    category: { id: '1', slug: 'outerwear', name: 'Outerwear' },
    primaryImageUrl: null,
    sizeEu: '38',
    color: 'charcoal',
    material: 'linen',
    gender: 'women',
    season: 'spring',
    rentalPricePerDay: 8,
    city: 'paris',
    description: '',
  },
  {
    id: '2',
    name: 'Silk Midi Skirt',
    brand: 'Reformation',
    category: { id: '2', slug: 'skirts', name: 'Skirts' },
    primaryImageUrl: null,
    sizeEu: '36',
    color: 'cream',
    material: 'silk',
    gender: 'women',
    season: 'summer',
    rentalPricePerDay: 6,
    city: 'paris',
    description: '',
  },
  {
    id: '3',
    name: 'Cotton Poplin Shirt',
    brand: 'A.P.C.',
    category: { id: '3', slug: 'tops', name: 'Tops' },
    primaryImageUrl: null,
    sizeEu: '40',
    color: 'white',
    material: 'cotton',
    gender: 'women',
    season: 'spring',
    rentalPricePerDay: 5,
    city: 'paris',
    description: '',
  },
  {
    id: '4',
    name: 'Tailored Trousers',
    brand: 'Cos',
    category: { id: '4', slug: 'bottoms', name: 'Bottoms' },
    primaryImageUrl: null,
    sizeEu: '38',
    color: 'navy',
    material: 'wool',
    gender: 'women',
    season: 'autumn',
    rentalPricePerDay: 6,
    city: 'paris',
    description: '',
  },
  {
    id: '5',
    name: 'Cashmere Wrap',
    brand: 'Vince',
    category: { id: '5', slug: 'accessories', name: 'Accessories' },
    primaryImageUrl: null,
    sizeEu: 'M',
    color: 'camel',
    material: 'cashmere',
    gender: 'women',
    season: 'winter',
    rentalPricePerDay: 10,
    city: 'paris',
    description: '',
  },
  {
    id: '6',
    name: 'Merino Knit Dress',
    brand: 'Theory',
    category: { id: '6', slug: 'dresses', name: 'Dresses' },
    primaryImageUrl: null,
    sizeEu: '38',
    color: 'black',
    material: 'merino',
    gender: 'women',
    season: 'autumn',
    rentalPricePerDay: 9,
    city: 'paris',
    description: '',
  },
  {
    id: '7',
    name: 'Relaxed Denim',
    brand: 'Toteme',
    category: { id: '4', slug: 'bottoms', name: 'Bottoms' },
    primaryImageUrl: null,
    sizeEu: '38',
    color: 'indigo',
    material: 'denim',
    gender: 'women',
    season: 'summer',
    rentalPricePerDay: 7,
    city: 'paris',
    description: '',
  },
  {
    id: '8',
    name: 'Evening Blouse',
    brand: 'Ba&sh',
    category: { id: '3', slug: 'tops', name: 'Tops' },
    primaryImageUrl: null,
    sizeEu: '36',
    color: 'ivory',
    material: 'silk',
    gender: 'women',
    season: 'spring',
    rentalPricePerDay: 7,
    city: 'paris',
    description: '',
  },
  {
    id: '9',
    name: 'Wool Overcoat',
    brand: 'Isabel Marant',
    category: { id: '1', slug: 'outerwear', name: 'Outerwear' },
    primaryImageUrl: null,
    sizeEu: '40',
    color: 'camel',
    material: 'wool',
    gender: 'women',
    season: 'winter',
    rentalPricePerDay: 12,
    city: 'paris',
    description: '',
  },
  {
    id: '10',
    name: 'Linen Midi Dress',
    brand: 'Ganni',
    category: { id: '6', slug: 'dresses', name: 'Dresses' },
    primaryImageUrl: null,
    sizeEu: '38',
    color: 'sage',
    material: 'linen',
    gender: 'women',
    season: 'summer',
    rentalPricePerDay: 8,
    city: 'paris',
    description: '',
  },
  {
    id: '11',
    name: 'Structured Blazer',
    brand: 'Theory',
    category: { id: '1', slug: 'outerwear', name: 'Outerwear' },
    primaryImageUrl: null,
    sizeEu: '50',
    color: 'black',
    material: 'wool',
    gender: 'men',
    season: 'autumn',
    rentalPricePerDay: 10,
    city: 'paris',
    description: '',
  },
  {
    id: '12',
    name: 'Slim Chinos',
    brand: 'Cos',
    category: { id: '4', slug: 'bottoms', name: 'Bottoms' },
    primaryImageUrl: null,
    sizeEu: '48',
    color: 'stone',
    material: 'cotton',
    gender: 'men',
    season: 'spring',
    rentalPricePerDay: 5,
    city: 'paris',
    description: '',
  },
  {
    id: '13',
    name: 'Oxford Button-Down',
    brand: 'A.P.C.',
    category: { id: '3', slug: 'tops', name: 'Tops' },
    primaryImageUrl: null,
    sizeEu: '50',
    color: 'white',
    material: 'cotton',
    gender: 'men',
    season: 'spring',
    rentalPricePerDay: 5,
    city: 'paris',
    description: '',
  },
  {
    id: '14',
    name: 'Wool Topcoat',
    brand: 'Sandro',
    category: { id: '1', slug: 'outerwear', name: 'Outerwear' },
    primaryImageUrl: null,
    sizeEu: '48',
    color: 'navy',
    material: 'wool',
    gender: 'men',
    season: 'winter',
    rentalPricePerDay: 11,
    city: 'paris',
    description: '',
  },
  {
    id: '15',
    name: 'Linen Camp Shirt',
    brand: 'Cos',
    category: { id: '3', slug: 'tops', name: 'Tops' },
    primaryImageUrl: null,
    sizeEu: '50',
    color: 'sage',
    material: 'linen',
    gender: 'men',
    season: 'summer',
    rentalPricePerDay: 6,
    city: 'paris',
    description: '',
  },
  {
    id: '16',
    name: 'Pleated Trousers',
    brand: 'Toteme',
    category: { id: '4', slug: 'bottoms', name: 'Bottoms' },
    primaryImageUrl: null,
    sizeEu: '48',
    color: 'charcoal',
    material: 'wool',
    gender: 'men',
    season: 'autumn',
    rentalPricePerDay: 7,
    city: 'paris',
    description: '',
  },
];

const fallbackCategories = [
  { id: '1', slug: 'outerwear', name: 'Outerwear', parentId: null },
  { id: '3', slug: 'tops', name: 'Tops', parentId: null },
  { id: '4', slug: 'bottoms', name: 'Bottoms', parentId: null },
  { id: '6', slug: 'dresses', name: 'Dresses', parentId: null },
  { id: '2', slug: 'skirts', name: 'Skirts', parentId: null },
  { id: '5', slug: 'accessories', name: 'Accessories', parentId: null },
];

function sortProducts(items: Product[], sortBy: string): Product[] {
  const sorted = [...items];
  if (sortBy === 'price_asc') sorted.sort((a, b) => a.rentalPricePerDay - b.rentalPricePerDay);
  if (sortBy === 'price_desc') sorted.sort((a, b) => b.rentalPricePerDay - a.rentalPricePerDay);
  return sorted;
}

export function CollectionPage() {
  const [city, setCity] = useState('');
  const [rentalStart, setRentalStart] = useState('');
  const [rentalEnd, setRentalEnd] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [sidebarFilters, setSidebarFilters] = useState<SidebarFilters>({
    season: null,
    size: null,
    brand: null,
    maxPricePerDay: null,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState('default');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const activeFilters = useMemo(
    () => ({
      city: city || undefined,
      categoryId: selectedCategory ?? undefined,
      gender: selectedGender ?? undefined,
      season: sidebarFilters.season ?? undefined,
      size: sidebarFilters.size ?? undefined,
      brand: sidebarFilters.brand ?? undefined,
      maxPricePerDay: sidebarFilters.maxPricePerDay ?? undefined,
      rentalStart: rentalStart || undefined,
      rentalEnd: rentalEnd || undefined,
      q: debouncedQuery || undefined,
    }),
    [
      city,
      selectedCategory,
      selectedGender,
      sidebarFilters,
      rentalStart,
      rentalEnd,
      debouncedQuery,
    ],
  );

  const activeFilterCount = [
    selectedCategory,
    selectedGender,
    sidebarFilters.season,
    sidebarFilters.size,
    sidebarFilters.brand,
    sidebarFilters.maxPricePerDay,
  ].filter(Boolean).length;

  const { products, loading, loadingMore, total, hasMore, loadMore } =
    useCollectionProducts(activeFilters);

  const { categories } = useCategories();

  const backendAlive = useRef(false);
  if (products.length > 0) backendAlive.current = true;

  const usingFallback = !backendAlive.current && !loading;

  const filteredFallback = useMemo(() => {
    if (!usingFallback) return [];
    const q = debouncedQuery.toLowerCase();
    const result = fallbackProducts.filter((p) => {
      if (city && p.city !== city) return false;
      if (selectedGender && p.gender !== selectedGender) return false;
      if (selectedCategory && p.category.id !== selectedCategory) return false;
      if (sidebarFilters.season && p.season !== sidebarFilters.season) return false;
      if (sidebarFilters.brand && p.brand !== sidebarFilters.brand) return false;
      if (sidebarFilters.maxPricePerDay && p.rentalPricePerDay > sidebarFilters.maxPricePerDay)
        return false;
      if (q && ![p.name, p.brand, p.color, p.material].some((f) => f.toLowerCase().includes(q)))
        return false;
      return true;
    });
    return sortProducts(result, sortBy);
  }, [
    usingFallback,
    city,
    selectedGender,
    selectedCategory,
    sidebarFilters,
    sortBy,
    debouncedQuery,
  ]);

  const displayProducts = usingFallback ? filteredFallback : sortProducts(products, sortBy);
  const displayCategories = categories.length > 0 ? categories : fallbackCategories;
  const displayTotal = usingFallback ? filteredFallback.length : total;
  const selectedCategoryName = selectedCategory
    ? (displayCategories.find((c) => c.id === selectedCategory)?.name ?? null)
    : null;

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedGender(null);
    setSidebarFilters({ season: null, size: null, brand: null, maxPricePerDay: null });
  };

  return (
    <>
      <Navbar />
      <main>
        <CollectionHero
          city={city}
          onCityChange={setCity}
          rentalStart={rentalStart}
          rentalEnd={rentalEnd}
          onStartChange={setRentalStart}
          onEndChange={setRentalEnd}
        />

        <FilterBar
          selectedGender={selectedGender}
          selectedCategoryName={selectedCategoryName}
          onClearCategory={() => setSelectedCategory(null)}
          onClearAll={clearAllFilters}
          query={query}
          onQueryChange={setQuery}
          sidebarVisible={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeFilterCount={activeFilterCount}
          onOpenMobileFilters={() => setMobilePanelOpen(true)}
        />

        <section className="bg-ivory py-8 lg:py-10">
          <Container>
            <div className="flex items-start gap-10 lg:gap-12">
              {sidebarOpen && (
                <FilterSidebar
                  categories={displayCategories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  selectedGender={selectedGender}
                  onGenderChange={setSelectedGender}
                  filters={sidebarFilters}
                  onFiltersChange={setSidebarFilters}
                  activeFilterCount={activeFilterCount}
                  onClearAll={clearAllFilters}
                />
              )}
              <ProductGrid
                products={displayProducts}
                loading={loading}
                loadingMore={loadingMore}
                total={displayTotal}
                hasMore={!usingFallback && hasMore}
                onLoadMore={loadMore}
                onClearFilters={clearAllFilters}
              />
            </div>
          </Container>
        </section>

        {/* Mobile filter panel */}
        <FilterPanel
          open={mobilePanelOpen}
          onClose={() => setMobilePanelOpen(false)}
          filters={{
            season: sidebarFilters.season,
            size: sidebarFilters.size,
            brand: sidebarFilters.brand,
            maxPricePerDay: sidebarFilters.maxPricePerDay,
            gender: selectedGender,
          }}
          onApply={(f) => {
            setSidebarFilters({
              season: f.season,
              size: f.size,
              brand: f.brand,
              maxPricePerDay: f.maxPricePerDay,
            });
            setSelectedGender(f.gender);
          }}
        />
      </main>
      <Footer />
    </>
  );
}
