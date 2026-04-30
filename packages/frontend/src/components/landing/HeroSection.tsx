import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { SectionLabel } from '@/components/ui/SectionLabel';

export function HeroSection() {
  return (
    <section className="relative mt-16 min-h-[calc(100vh-64px)] overflow-hidden bg-night">
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/video/hero-poster.jpg"
          className="h-full w-full object-cover"
          style={{ objectPosition: 'center 15%' }}
        >
          <source src="/video/hero.webm" type="video/webm" />
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-night/90 via-night/70 to-night/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-night/40" />
      </div>

      {/* Content */}
      <Container className="relative z-10 flex min-h-[calc(100vh-64px)] items-center">
        <div className="max-w-2xl">
          <SectionLabel dark className="mb-6">
            Travel Light. Dress Beautifully.
          </SectionLabel>

          <h1 className="font-serif text-[clamp(36px,5.5vw,56px)] font-semibold leading-[1.08] tracking-[-0.5px] text-ivory">
            Your Wardrobe,
            <br />
            <span className="bg-gradient-to-r from-ivory to-ash bg-clip-text text-transparent">
              Waiting at Your Destination
            </span>
          </h1>

          <p className="mt-6 max-w-lg font-sans text-lg leading-relaxed text-sand">
            Premium clothing delivered to your hotel. No overpacking, no airline fees, no compromise
            on style. Rent designer pieces for your trip, return them when you leave.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button variant="premium" size="lg" href="/collection">
              Explore the Collection
            </Button>
            <Button
              variant="ghost"
              size="lg"
              href="#how-it-works"
              className="text-sand hover:bg-ivory/[0.08] hover:text-ivory"
            >
              See How It Works
            </Button>
          </div>

          <p className="mt-8 font-sans text-sm text-stone">
            Currently available in Paris&ensp;&mdash;&ensp;more cities coming soon
          </p>
        </div>
      </Container>

      {/* Bottom fade line */}
      <div className="absolute bottom-0 left-0 right-0 z-10 h-px bg-gradient-to-r from-transparent via-night-border to-transparent" />
    </section>
  );
}
