import { Container } from './Container';

const footerLinks = {
  explore: [
    { label: 'Collection', href: '#collection' },
    { label: 'Capsule Wardrobes', href: '#capsules' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Our Impact', href: '#impact' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Sustainability', href: '/sustainability' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press', href: '/press' },
  ],
  support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
    { label: 'Shipping & Returns', href: '/shipping' },
    { label: 'Size Guide', href: '/size-guide' },
  ],
};

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
];

export function Footer() {
  return (
    <footer className="border-t border-night-border bg-night">
      <Container className="pb-8 pt-16">
        {/* Columns */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="font-serif text-2xl font-semibold text-ivory">
              Maison Voyageur
            </a>
            <p className="mt-3 max-w-[240px] font-sans text-sm leading-relaxed text-ash">
              Premium travel clothing, delivered to your destination. Rent beautifully, travel
              lightly.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-[1.5px] text-ash">
              Explore
            </h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-sans text-sm text-ash transition-colors duration-200 hover:text-ivory"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-[1.5px] text-ash">
              Company
            </h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-sans text-sm text-ash transition-colors duration-200 hover:text-ivory"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-[1.5px] text-ash">
              Support
            </h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-sans text-sm text-ash transition-colors duration-200 hover:text-ivory"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 border-t border-night-border" />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-sans text-xs text-ash">
            &copy; {new Date().getFullYear()} Maison Voyageur. All rights reserved.
          </p>

          {/* Language */}
          <div className="flex items-center gap-1 font-sans text-xs">
            {languages.map((lang, i) => (
              <span key={lang.code} className="flex items-center">
                {i > 0 && <span className="mx-1.5 text-night-border">/</span>}
                <button
                  className={`cursor-pointer transition-colors duration-200 ${
                    lang.code === 'en' ? 'text-ivory' : 'text-ash hover:text-ivory'
                  }`}
                >
                  {lang.label}
                </button>
              </span>
            ))}
          </div>

          {/* Legal */}
          <div className="flex items-center gap-4 font-sans text-xs text-ash">
            <a href="/privacy" className="transition-colors duration-200 hover:text-ivory">
              Privacy Policy
            </a>
            <a href="/terms" className="transition-colors duration-200 hover:text-ivory">
              Terms
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
