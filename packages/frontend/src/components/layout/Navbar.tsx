import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Container } from './Container';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from './NotificationBell';

const navLinks = [
  { label: 'Collection', href: '/collection' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Capsule Wardrobes', href: '/#capsules' },
  { label: 'Our Impact', href: '/#impact' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count: cartCount } = useCart();
  const { count: favCount } = useFavorites();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 z-50 w-full border-b border-linen bg-ivory/60 backdrop-blur-[12px]">
      <Container className="flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="font-serif text-2xl font-semibold text-ink">
          Maison Voyageur
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-sans text-[15px] font-medium text-charcoal transition-colors duration-200 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop: favorites + capsule + CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {favCount > 0 && (
            <Link
              to="/favorites"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-pearl hover:text-ink"
            >
              <svg width="16" height="15" viewBox="0 0 16 15" fill="none">
                <path
                  d="M8 14s-7-4.8-7-8.75A3.75 3.75 0 0 1 8 2.5a3.75 3.75 0 0 1 7 2.75C15 9.2 8 14 8 14z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-ivory">
                {favCount}
              </span>
            </Link>
          )}

          {user && <NotificationBell />}

          <Link
            to="/capsule"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-pearl hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="1.5"
                y="5.5"
                width="13"
                height="9"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M5 5.5V4a3 3 0 0 1 6 0v1.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-ivory">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Link
                  to="/admin"
                  className="rounded-full border border-linen bg-white px-3 py-1.5 font-sans text-[12px] font-semibold text-ink transition-colors hover:border-sand hover:bg-pearl"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/account"
                className="flex items-center gap-2 rounded-full border border-linen bg-white px-4 py-1.5 font-sans text-[13px] font-medium text-ink transition-colors hover:border-sand hover:bg-pearl"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-ivory">
                  {user.firstName.charAt(0).toUpperCase()}
                </span>
                {user.firstName}
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/register')}>
                Create account
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-[5px] md:hidden"
          aria-label="Open menu"
        >
          <span className="h-[1.5px] w-5 rounded-full bg-ink transition-all" />
          <span className="h-[1.5px] w-5 rounded-full bg-ink transition-all" />
          <span className="h-[1.5px] w-3.5 rounded-full bg-ink transition-all" />
        </button>
      </Container>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 flex h-full w-[80%] max-w-[360px] flex-col bg-white shadow-floating">
            {/* Close */}
            <div className="flex h-16 items-center justify-end px-5">
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-pearl transition-colors hover:bg-linen"
                aria-label="Close menu"
              >
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute h-[1.5px] w-5 rotate-45 rounded-full bg-ink" />
                  <span className="absolute h-[1.5px] w-5 -rotate-45 rounded-full bg-ink" />
                </span>
              </button>
            </div>

            {/* Links */}
            <nav className="flex flex-col px-5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex h-14 items-center border-b border-linen font-sans text-lg font-medium text-ink transition-colors hover:text-brand"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto space-y-3 p-5">
              {user ? (
                <>
                  <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-12 w-full items-center justify-center rounded-default border border-linen bg-white font-sans text-[14px] font-medium text-ink"
                  >
                    My Account ({user.firstName})
                  </Link>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate('/');
                      setMobileOpen(false);
                    }}
                    className="w-full font-sans text-[13px] text-stone underline underline-offset-2"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      navigate('/login');
                      setMobileOpen(false);
                    }}
                  >
                    Sign in
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      navigate('/register');
                      setMobileOpen(false);
                    }}
                  >
                    Create account
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
