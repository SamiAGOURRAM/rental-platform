import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') ?? '/collection';

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('An account with this email already exists.');
      } else if (err instanceof ApiError && err.status === 422) {
        setError('Please check your details — password must be at least 8 characters.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden flex-col justify-between bg-night p-12 lg:flex lg:w-[45%]">
        <a href="/" className="font-serif text-2xl font-semibold text-ivory">
          Maison Voyageur
        </a>
        <div>
          <p className="font-serif text-[clamp(28px,3vw,40px)] font-semibold leading-[1.15] text-ivory">
            Pack lighter.
            <br />
            Travel better.
          </p>
          <p className="mt-4 font-sans text-[15px] leading-relaxed text-ivory/60">
            Join thousands of travelers who rent premium clothing instead of over-packing.
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
        <a href="/" className="mb-10 font-serif text-2xl font-semibold text-ink lg:hidden">
          Maison Voyageur
        </a>

        <div className="w-full max-w-[400px]">
          <h1 className="font-serif text-[32px] font-semibold leading-tight text-ink">
            Create your account
          </h1>
          <p className="mt-2 font-sans text-[14px] text-stone">
            Already have an account?{' '}
            <Link
              to={`/login${redirect !== '/collection' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="font-semibold text-brand underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
                  First name
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={set('firstName')}
                  required
                  autoComplete="given-name"
                  placeholder="Florence"
                  className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Last name
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={set('lastName')}
                  required
                  autoComplete="family-name"
                  placeholder="Baron"
                  className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
              />
            </div>

            {error && (
              <p className="rounded-default bg-red-50 px-4 py-3 font-sans text-[13px] text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 h-11 w-full cursor-pointer rounded-default bg-brand font-sans text-[14px] font-semibold text-ivory transition-all hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center font-sans text-[12px] text-stone">
            By continuing, you agree to our <span className="underline">Terms of Service</span> and{' '}
            <span className="underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
