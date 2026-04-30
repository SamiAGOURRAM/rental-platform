import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/layout/Container';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Button } from '@/components/ui/Button';
import { getCapsules, type Capsule } from '@/api/catalog';

const fallbackGradients = [
  'from-[#e8f0ed] to-[#d6d3d1]',
  'from-[#f5f0e3] to-[#e7e5e4]',
  'from-[#d6d3d1] to-[#e8f0ed]',
];

export function CapsuleWardrobesSection() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCapsules({ locale: 'en' })
      .then((list) => {
        if (mounted) setCapsules(list);
      })
      .catch((err) => {
        console.warn('[CapsuleWardrobesSection] failed to load capsules:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="capsules" className="bg-ivory py-20 lg:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Capsule Wardrobes</SectionLabel>
          <h2 className="mt-4 font-serif text-[clamp(28px,4vw,36px)] font-semibold leading-[1.20] tracking-[-0.3px] text-ink">
            Five Pieces. Five Days. Zero Compromise.
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed text-stone">
            Our stylists curate complete travel wardrobes around your destination, season, and
            style. Each capsule includes everything you need — from a day blazer to an evening
            dress.
          </p>
        </div>

        <div className="mt-16 space-y-20 lg:space-y-28">
          {loading && capsules.length === 0 ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-8 lg:flex-row lg:gap-16">
                <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-linen lg:w-3/5" />
                <div className="w-full space-y-3 lg:w-2/5">
                  <div className="h-4 w-40 animate-pulse rounded bg-linen" />
                  <div className="h-8 w-2/3 animate-pulse rounded bg-linen" />
                  <div className="h-20 animate-pulse rounded bg-linen" />
                </div>
              </div>
            ))
          ) : capsules.length === 0 ? (
            <p className="text-center font-sans text-sm text-stone">
              Our stylist-curated capsules will appear here soon.
            </p>
          ) : (
            capsules.map((capsule, index) => {
              const isReversed = index % 2 !== 0;
              const pieces = capsule.items.reduce((s, it) => s + it.quantity, 0);
              const gradient = fallbackGradients[index % fallbackGradients.length];
              return (
                <div
                  key={capsule.id}
                  className={`flex flex-col items-center gap-8 lg:gap-16 ${
                    isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'
                  }`}
                >
                  <Link to={`/capsules/${capsule.slug}`} className="w-full lg:w-3/5">
                    <div
                      className={`aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} transition-all duration-300 hover:shadow-hover`}
                    >
                      {capsule.imageUrl && (
                        <img
                          src={capsule.imageUrl}
                          alt={capsule.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </Link>

                  <div className="w-full lg:w-2/5">
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
                      {pieces} pieces &middot; {capsule.season.replace('_', ' ')}
                    </span>

                    <h3 className="mt-3 font-serif text-[clamp(24px,3vw,32px)] font-semibold leading-tight text-ink">
                      <Link to={`/capsules/${capsule.slug}`} className="hover:text-brand">
                        {capsule.name}
                      </Link>
                    </h3>

                    <p className="mt-3 font-sans text-base leading-relaxed text-stone">
                      {capsule.description}
                    </p>

                    <p className="mt-4 font-sans text-lg font-semibold text-ink">
                      From €{capsule.basePrice.toFixed(0)}
                    </p>

                    <div className="mt-6">
                      <Button variant="outline" href={`/capsules/${capsule.slug}`}>
                        View Capsule
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Container>
    </section>
  );
}
