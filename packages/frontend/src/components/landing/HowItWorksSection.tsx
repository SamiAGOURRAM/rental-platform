import { Container } from '@/components/layout/Container';
import { SectionLabel } from '@/components/ui/SectionLabel';

const steps = [
  {
    number: '01',
    title: 'Choose Your Pieces',
    description:
      'Browse our curated collection of premium garments. Filter by destination, dates, and occasion. Each piece is hand-selected from luxury brands.',
  },
  {
    number: '02',
    title: 'We Deliver to You',
    description:
      'Your wardrobe arrives at your hotel or rental before you do. Pressed, steamed, and ready to wear. No suitcase wrestling required.',
  },
  {
    number: '03',
    title: 'Wear, Return, Repeat',
    description:
      'Enjoy your trip in beautiful clothes. When you leave, simply drop them at your hotel reception. We handle everything from there.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-pearl py-20 lg:py-32">
      <Container>
        <div className="text-center">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mt-4 font-serif text-[clamp(28px,4vw,36px)] font-semibold leading-[1.20] tracking-[-0.3px] text-ink">
            Three Steps to a Lighter Suitcase
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3 lg:gap-20">
          {steps.map((step) => (
            <div key={step.number} className="text-center md:text-left">
              <span className="font-serif text-[80px] font-semibold leading-none text-sand">
                {step.number}
              </span>
              <h3 className="mt-2 font-serif text-[24px] font-semibold leading-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-3 font-sans text-base leading-relaxed text-stone">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
