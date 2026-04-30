import { useEffect, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/Button';
import { getProducts, type Product } from '@/api/catalog';

export function FeaturedCollectionSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getProducts({ limit: 8, locale: 'en' })
      .then((res) => {
        if (mounted) setProducts(res.items);
      })
      .catch((err) => {
        console.warn('[FeaturedCollectionSection] failed to load products:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="collection" className="bg-ivory py-20 lg:py-32">
      <Container>
        <div className="text-center">
          <SectionLabel>The Collection</SectionLabel>
          <h2 className="mt-4 font-serif text-[clamp(28px,4vw,36px)] font-semibold leading-[1.20] tracking-[-0.3px] text-ink">
            Pieces Worth Traveling For
          </h2>
          <p className="mx-auto mt-4 max-w-lg font-sans text-base leading-relaxed text-stone">
            Hand-selected from premium brands. Every garment inspected, cleaned, and ready for your
            next adventure.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
          {loading && products.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-linen" />
              ))
            : products.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  brand={p.brand}
                  category={p.category.name}
                  pricePerDay={p.rentalPricePerDay}
                  imageUrl={p.primaryImageUrl}
                />
              ))}
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline" href="/collection">
            View Full Collection
          </Button>
        </div>
      </Container>
    </section>
  );
}
