import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { getCapsule, type CapsuleDetail } from '@/api/catalog';
import { useCart } from '@/context/CartContext';
import { toast } from '@/lib/toast';

export function CapsuleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [capsule, setCapsule] = useState<CapsuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    setLoading(true);
    getCapsule(slug)
      .then((c) => {
        if (mounted) setCapsule(c);
      })
      .catch((err) => {
        console.warn('[CapsuleDetailPage] failed to load capsule:', err);
        toast.error('Could not load capsule. Please try again.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  function handleAddAll() {
    if (!capsule) return;
    setAdding(true);
    for (const slot of capsule.items) {
      const toAdd = slot.suggestions.slice(0, slot.quantity);
      for (const p of toAdd) {
        addItem({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category.name,
          pricePerDay: p.rentalPricePerDay,
          imageUrl: p.primaryImageUrl ?? null,
        });
      }
    }
    setTimeout(() => navigate('/capsule'), 400);
  }

  const totalPieces = capsule ? capsule.items.reduce((sum, s) => sum + s.quantity, 0) : 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        {loading && (
          <Container className="py-24 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-linen border-t-brand" />
          </Container>
        )}

        {!loading && !capsule && (
          <Container className="py-24 text-center">
            <p className="font-serif text-2xl text-ink">Capsule not found</p>
            <Link
              to="/#capsules"
              className="mt-4 inline-block font-sans text-sm text-brand underline"
            >
              Back to capsules
            </Link>
          </Container>
        )}

        {capsule && (
          <>
            {/* Hero */}
            <section className="bg-gradient-to-br from-linen/60 to-ivory">
              <Container className="py-14 lg:py-20">
                <nav className="mb-3 flex items-center gap-1.5 font-sans text-[12px] text-stone">
                  <Link to="/" className="hover:text-ink">
                    Home
                  </Link>
                  <span className="text-sand">/</span>
                  <Link to="/#capsules" className="hover:text-ink">
                    Capsules
                  </Link>
                  <span className="text-sand">/</span>
                  <span className="text-ink">{capsule.name}</span>
                </nav>
                <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
                  <div>
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
                      {capsule.categoryType} · {capsule.season.replace('_', ' ')} · {capsule.gender}
                    </span>
                    <h1 className="mt-3 font-serif text-[clamp(32px,5vw,48px)] font-semibold leading-[1.1] text-ink">
                      {capsule.name}
                    </h1>
                    <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-stone">
                      {capsule.description}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-6">
                      <div>
                        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
                          Pieces
                        </p>
                        <p className="mt-0.5 font-serif text-[26px] font-semibold text-ink">
                          {totalPieces}
                        </p>
                      </div>
                      <div>
                        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
                          From
                        </p>
                        <p className="mt-0.5 font-serif text-[26px] font-semibold text-ink">
                          €{capsule.basePrice.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <aside className="rounded-2xl border border-linen bg-white p-6 shadow-lifted">
                    <h2 className="font-serif text-xl font-semibold text-ink">What's included</h2>
                    <ul className="mt-4 space-y-2.5">
                      {capsule.items.map((slot) => (
                        <li
                          key={slot.categoryId}
                          className="flex items-center justify-between font-sans text-[14px]"
                        >
                          <span className="text-charcoal">{slot.categoryName}</span>
                          <span className="font-semibold text-ink">×{slot.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 space-y-2">
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleAddAll}
                        disabled={adding}
                      >
                        {adding ? 'Adding...' : 'Add suggested pieces'}
                      </Button>
                      <p className="text-center font-sans text-[11px] text-stone">
                        We'll pre-fill your capsule with our top picks. You can swap any piece.
                      </p>
                    </div>
                  </aside>
                </div>
              </Container>
            </section>

            {/* Per-slot pieces */}
            <Container className="py-14 lg:py-20">
              <div className="space-y-16">
                {capsule.items.map((slot) => (
                  <section key={slot.categoryId}>
                    <div className="mb-6 flex items-end justify-between">
                      <div>
                        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-stone">
                          {slot.quantity} {slot.quantity === 1 ? 'piece' : 'pieces'}
                        </p>
                        <h2 className="mt-1 font-serif text-[28px] font-semibold text-ink">
                          {slot.categoryName}
                        </h2>
                      </div>
                      <Link
                        to={`/collection?categoryId=${slot.categoryId}`}
                        className="font-sans text-[13px] font-medium text-brand underline underline-offset-2"
                      >
                        See all
                      </Link>
                    </div>

                    {slot.suggestions.length === 0 ? (
                      <div className="rounded-xl border border-linen bg-white p-8 text-center">
                        <p className="font-sans text-[14px] text-stone">
                          No available pieces in this category right now.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
                        {slot.suggestions.slice(0, 4).map((p) => (
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
                    )}
                  </section>
                ))}
              </div>
            </Container>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
