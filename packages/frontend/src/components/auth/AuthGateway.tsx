import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';

interface AuthGatewayPrefill {
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  intent?: 'default' | 'checkout';
  prefill?: AuthGatewayPrefill;
}

type Mode = 'guest' | 'create' | 'signin';

export function AuthGateway({ isOpen, onClose, onSuccess, intent = 'default', prefill }: Props) {
  const checkoutIntent = intent === 'checkout';
  const { login, register, guestCheckout } = useAuth();

  const [mode, setMode] = useState<Mode>(checkoutIntent ? 'guest' : 'signin');

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setMode(checkoutIntent ? 'guest' : 'signin');
    setEmail(prefill?.email ?? '');
    setFirstName(prefill?.firstName ?? '');
    setLastName(prefill?.lastName ?? '');
    setPassword('');
    setShowPassword(false);
    setSubmitting(false);
    setError(null);

    setTimeout(() => emailRef.current?.focus(), 100);
  }, [isOpen, checkoutIntent, prefill?.email, prefill?.firstName, prefill?.lastName]);

  function switchMode(next: Mode) {
    if (!checkoutIntent && next === 'guest') return;
    setMode(next);
    setPassword('');
    setError(null);
    setTimeout(() => emailRef.current?.focus(), 60);
  }

  async function handleGuestConfirm(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim()) return;

    setError(null);
    setSubmitting(true);
    try {
      await guestCheckout({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMode('signin');
        setError('An account with this email already exists. Sign in to continue.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim() || !password) return;

    setError(null);
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMode('signin');
        setError('An account with this email already exists. Sign in to continue.');
      } else if (err instanceof ApiError && err.status === 422) {
        setError('Password must be at least 8 characters.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Wrong email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const title =
    mode === 'signin'
      ? 'Welcome back'
      : mode === 'create'
        ? 'Create your account'
        : 'Continue as guest';

  const subtitle =
    mode === 'signin'
      ? 'Sign in to continue.'
      : mode === 'create'
        ? 'Save your details and manage future rentals in one click.'
        : "No account needed. We'll send your receipt to this email. Create an account anytime later.";

  const inputClass =
    'h-12 w-full rounded-xl border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full animate-slide-up rounded-t-3xl bg-ivory shadow-floating sm:max-w-md sm:rounded-3xl"
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both' }}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-sand" />
        </div>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-pearl text-stone transition-colors hover:bg-linen hover:text-ink"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 1l10 10M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="px-6 pb-8 pt-6 sm:px-8 sm:pt-8">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.2px] text-stone">
            Maison Voyageur
          </p>
          <h2 className="mt-1 font-serif text-[26px] font-semibold leading-tight text-ink">
            {title}
          </h2>
          <p className="mt-1 font-sans text-[14px] leading-relaxed text-stone">{subtitle}</p>

          <div className="mt-5 flex rounded-xl border border-linen bg-white p-1">
            {checkoutIntent && (
              <button
                type="button"
                onClick={() => switchMode('guest')}
                className={`flex-1 cursor-pointer rounded-[10px] py-2 font-sans text-[13px] font-semibold transition-all ${
                  mode === 'guest'
                    ? 'bg-ink text-ivory shadow-sm'
                    : 'text-stone hover:text-charcoal'
                }`}
              >
                Guest
              </button>
            )}
            <button
              type="button"
              onClick={() => switchMode('create')}
              className={`flex-1 cursor-pointer rounded-[10px] py-2 font-sans text-[13px] font-semibold transition-all ${
                mode === 'create' ? 'bg-ink text-ivory shadow-sm' : 'text-stone hover:text-charcoal'
              }`}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 cursor-pointer rounded-[10px] py-2 font-sans text-[13px] font-semibold transition-all ${
                mode === 'signin' ? 'bg-ink text-ivory shadow-sm' : 'text-stone hover:text-charcoal'
              }`}
            >
              Sign in
            </button>
          </div>

          {mode === 'guest' && (
            <form onSubmit={handleGuestConfirm} className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    placeholder="Florence"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    placeholder="Baron"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Email
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 font-sans text-[13px] text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 h-12 w-full cursor-pointer rounded-xl bg-brand font-sans text-[15px] font-semibold text-ivory transition-all hover:bg-brand/90 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? 'Confirming...' : 'Continue as guest ->'}
              </button>
            </form>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateAccount} className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    placeholder="Florence"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    placeholder="Baron"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Email
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-stone transition-colors hover:text-ink"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
                        <path
                          d="M1 6.5C3 3 5.5 1.5 8.5 1.5S14 3 16 6.5c-2 3.5-4.5 5-7.5 5S3 10 1 6.5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle cx="8.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.3" />
                        <path
                          d="M2 1l13 11"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
                        <path
                          d="M1 5.5C3 2 5.5 0.5 8.5 0.5S14 2 16 5.5c-2 3.5-4.5 5-7.5 5S3 9 1 5.5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle cx="8.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 font-sans text-[13px] text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 h-12 w-full cursor-pointer rounded-xl bg-brand font-sans text-[15px] font-semibold text-ivory transition-all hover:bg-brand/90 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? 'Setting up your account...' : 'Create account and continue ->'}
              </button>
            </form>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="mt-5 space-y-3">
              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Email
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="........"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-stone transition-colors hover:text-ink"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
                        <path
                          d="M1 6.5C3 3 5.5 1.5 8.5 1.5S14 3 16 6.5c-2 3.5-4.5 5-7.5 5S3 10 1 6.5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle cx="8.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.3" />
                        <path
                          d="M2 1l13 11"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
                        <path
                          d="M1 5.5C3 2 5.5 0.5 8.5 0.5S14 2 16 5.5c-2 3.5-4.5 5-7.5 5S3 9 1 5.5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle cx="8.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 font-sans text-[13px] text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 h-12 w-full cursor-pointer rounded-xl bg-brand font-sans text-[15px] font-semibold text-ivory transition-all hover:bg-brand/90 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? 'Signing in...' : 'Sign in and continue ->'}
              </button>
            </form>
          )}

          <p className="mt-5 text-center font-sans text-[11px] text-stone">
            By continuing you agree to our{' '}
            <span className="underline decoration-sand">Terms of Service</span> and{' '}
            <span className="underline decoration-sand">Privacy Policy</span>.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (min-width: 640px) {
          @keyframes slideUp {
            from { transform: translateY(16px) scale(0.97); opacity: 0; }
            to   { transform: translateY(0)    scale(1);    opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
