import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { requestMagicLink } from '@/api/auth';

export function LoginPage() {
  const { login, verifyMagicLink } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') ?? '/collection';
  const magicToken = params.get('magic');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Magic link states
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicSubmitting, setMagicSubmitting] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [magicVerifying, setMagicVerifying] = useState(false);

  // Auto-verify magic link token from URL
  useEffect(() => {
    if (!magicToken) return;
    setMagicVerifying(true);
    verifyMagicLink(magicToken)
      .then(() => navigate(redirect, { replace: true }))
      .catch(() => {
        setError(
          'This magic link has expired or already been used. Please sign in or request a new link.',
        );
        setMagicVerifying(false);
      });
  }, [magicToken, verifyMagicLink, navigate, redirect]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setMagicError(null);
    setMagicSubmitting(true);
    try {
      await requestMagicLink(email.trim());
      setMagicSent(true);
    } catch {
      setMagicError('Could not send the magic link. Please try again.');
    } finally {
      setMagicSubmitting(false);
    }
  }

  if (magicVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-linen border-t-brand" />
          <p className="mt-4 font-sans text-[14px] text-stone">Signing you in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: editorial panel */}
      <div className="hidden flex-col justify-between bg-night p-12 lg:flex lg:w-[45%]">
        <a href="/" className="font-serif text-2xl font-semibold text-ivory">
          Maison Voyageur
        </a>
        <div>
          <p className="font-serif text-[clamp(28px,3vw,40px)] font-semibold leading-[1.15] text-ivory">
            The wardrobe you need,
            <br />
            waiting where you land.
          </p>
          <p className="mt-4 font-sans text-[15px] leading-relaxed text-ivory/60">
            Premium travel clothing, available by the day. No extra luggage. No compromises.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 opacity-30">
          {[
            'from-[#e8f0ed] to-[#f5f0e3]',
            'from-[#f5f0e3] to-[#e7e5e4]',
            'from-[#e7e5e4] to-[#f5f5f4]',
          ].map((g, i) => (
            <div key={i} className={`h-24 rounded-xl bg-gradient-to-br ${g}`} />
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-ivory px-6 py-12">
        {/* Mobile logo */}
        <a href="/" className="mb-10 font-serif text-2xl font-semibold text-ink lg:hidden">
          Maison Voyageur
        </a>

        <div className="w-full max-w-[400px]">
          <h1 className="font-serif text-[32px] font-semibold leading-tight text-ink">
            {magicMode ? 'Sign in with email' : 'Welcome back'}
          </h1>
          <p className="mt-2 font-sans text-[14px] text-stone">
            Don&rsquo;t have an account?{' '}
            <Link
              to={`/register${redirect !== '/collection' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="font-semibold text-brand underline underline-offset-2"
            >
              Create one
            </Link>
          </p>

          {!magicMode ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Password
                  </label>
                  <Link
                    to="/reset-password"
                    className="font-sans text-[12px] text-stone underline underline-offset-2 hover:text-ink"
                  >
                    Forgot?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
                />
              </div>

              {error && (
                <div className="space-y-2">
                  <p className="rounded-default bg-red-50 px-4 py-3 font-sans text-[13px] text-red-700">
                    {error}
                  </p>
                  {error.includes('Invalid email or password') && (
                    <button
                      type="button"
                      onClick={() => {
                        setMagicMode(true);
                        setError(null);
                      }}
                      className="font-sans text-[13px] text-brand underline underline-offset-2"
                    >
                      Or send a magic link to your email
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 h-11 w-full cursor-pointer rounded-default bg-brand font-sans text-[14px] font-semibold text-ivory transition-all duration-200 hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMagicMode(true);
                    setError(null);
                  }}
                  className="font-sans text-[12px] text-stone underline underline-offset-2 hover:text-ink"
                >
                  Prefer a password-free sign-in?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSendMagicLink} className="mt-8 space-y-4">
              {magicSent ? (
                <div className="rounded-default bg-brand/5 px-4 py-3">
                  <p className="font-sans text-[13px] text-brand">
                    Magic link sent! Check your inbox (and spam folder).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMagicSent(false);
                      setMagicMode(false);
                    }}
                    className="mt-2 font-sans text-[12px] text-stone underline underline-offset-2 hover:text-ink"
                  >
                    Back to password sign-in
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
                    />
                  </div>

                  {magicError && (
                    <p className="rounded-default bg-red-50 px-4 py-3 font-sans text-[13px] text-red-700">
                      {magicError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={magicSubmitting}
                    className="mt-2 h-11 w-full cursor-pointer rounded-default bg-brand font-sans text-[14px] font-semibold text-ivory transition-all duration-200 hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {magicSubmitting ? 'Sending…' : 'Send magic link'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMagicMode(false);
                        setMagicError(null);
                      }}
                      className="font-sans text-[12px] text-stone underline underline-offset-2 hover:text-ink"
                    >
                      Back to password sign-in
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          <p className="mt-6 text-center font-sans text-[12px] text-stone">
            By continuing, you agree to our <span className="underline">Terms of Service</span> and{' '}
            <span className="underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
