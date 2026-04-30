import { Container } from '@/components/layout/Container';
import { SectionLabel } from '@/components/ui/SectionLabel';

const stats = [
  { value: '1,240', unit: 'kg', label: 'CO\u2082 Saved' },
  { value: '860', unit: '', label: 'Garments Circulated' },
  { value: '3,200', unit: 'km', label: 'Car Travel Avoided' },
  { value: '4,100', unit: '', label: 'Tree Days of Absorption' },
];

export function SustainabilitySection() {
  return (
    <section id="impact" className="bg-night py-20 lg:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel dark>Our Impact</SectionLabel>
          <h2 className="mt-4 font-serif text-[clamp(28px,4vw,36px)] font-semibold leading-[1.20] tracking-[-0.3px] text-ivory">
            Fashion That Gives Back
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed text-ash">
            Every rental replaces a purchase. Every returned garment is professionally cleaned and
            re-circulated. When a piece reaches the end of its rental life, we donate it to partner
            organizations.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-serif text-[clamp(40px,6vw,72px)] font-semibold leading-none text-accent">
                {stat.value}
                {stat.unit && (
                  <span className="ml-1 text-[0.4em] font-normal text-ash">{stat.unit}</span>
                )}
              </div>
              <p className="mt-3 font-sans text-xs font-semibold uppercase tracking-[1.5px] text-ash">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom message */}
        <div className="mx-auto mt-16 max-w-lg text-center">
          <p className="font-serif text-xl leading-relaxed text-stone italic">
            &ldquo;The most sustainable garment is the one that&rsquo;s already been made.&rdquo;
          </p>
        </div>
      </Container>
    </section>
  );
}
