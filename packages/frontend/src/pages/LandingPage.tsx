import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturedCollectionSection } from '@/components/landing/FeaturedCollectionSection';
import { CapsuleWardrobesSection } from '@/components/landing/CapsuleWardrobesSection';
import { SustainabilitySection } from '@/components/landing/SustainabilitySection';
import { GarmentCareSection } from '@/components/landing/GarmentCareSection';
import { CtaSection } from '@/components/landing/CtaSection';

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturedCollectionSection />
        <CapsuleWardrobesSection />
        <SustainabilitySection />
        <GarmentCareSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
