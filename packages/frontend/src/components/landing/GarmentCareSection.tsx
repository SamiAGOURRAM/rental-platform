import { Container } from '@/components/layout/Container';
import { SectionLabel } from '@/components/ui/SectionLabel';

const stages = [
  {
    number: '01',
    title: 'Curated',
    description:
      'Hand-selected from premium brands. Each piece meets our quality, material, and style standards.',
  },
  {
    number: '02',
    title: 'Cleaned',
    description:
      'Professionally dry-cleaned and steamed. Inspected for quality before every rental.',
  },
  {
    number: '03',
    title: 'Delivered',
    description: 'Pressed, packaged, and delivered to your accommodation before you arrive.',
  },
  {
    number: '04',
    title: 'Worn',
    description: 'Enjoy your trip. The clothes are yours for the duration of your rental period.',
  },
  {
    number: '05',
    title: 'Returned',
    description:
      'Leave them at your hotel reception. We pick up within 24 hours, no effort required.',
  },
  {
    number: '06',
    title: 'Re-circulated',
    description:
      'Back to our atelier for cleaning and inspection. Ready for the next traveler. At end-of-life, donated.',
  },
];

export function GarmentCareSection() {
  return (
    <section className="bg-pearl py-20 lg:py-32">
      <Container>
        <div className="text-center">
          <SectionLabel>The Lifecycle</SectionLabel>
          <h2 className="mt-4 font-serif text-[clamp(28px,4vw,36px)] font-semibold leading-[1.20] tracking-[-0.3px] text-ink">
            Every Garment, Cared For
          </h2>
          <p className="mx-auto mt-4 max-w-lg font-sans text-base leading-relaxed text-stone">
            From the moment a piece enters our collection to the day it finds a permanent home,
            every step is handled with intention.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6 lg:gap-4">
          {stages.map((stage) => (
            <div
              key={stage.number}
              className="rounded-xl bg-white p-5 shadow-lifted transition-all duration-300 hover:-translate-y-0.5 hover:shadow-hover"
            >
              <span className="font-serif text-[40px] font-semibold leading-none text-sand">
                {stage.number}
              </span>
              <h3 className="mt-1 font-serif text-[20px] font-semibold leading-tight text-ink">
                {stage.title}
              </h3>
              <p className="mt-2 font-sans text-[13px] leading-relaxed text-stone">
                {stage.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
