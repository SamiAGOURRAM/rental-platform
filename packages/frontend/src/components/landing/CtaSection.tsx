import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';

export function CtaSection() {
  return (
    <section className="relative bg-night py-24 lg:py-36">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(194,166,107,0.06),transparent_70%)]" />

      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-[clamp(36px,5vw,52px)] font-semibold leading-[1.10] tracking-[-0.4px] text-ivory">
            Pack Less.
            <br />
            Experience More.
          </h2>

          <p className="mx-auto mt-6 max-w-md font-sans text-lg leading-relaxed text-ash">
            Join the travelers who have discovered a lighter way to dress beautifully.
          </p>

          <div className="mt-10">
            <Button variant="premium" size="lg">
              Start Your First Rental
            </Button>
          </div>

          <p className="mt-6 font-sans text-sm text-stone">
            No subscription required. Rent as you travel.
          </p>
        </div>
      </Container>
    </section>
  );
}
