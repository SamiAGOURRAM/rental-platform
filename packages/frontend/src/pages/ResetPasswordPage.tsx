import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { requestPasswordReset, confirmPasswordReset } from '@/api/auth';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        <Container className="py-24">
          <div className="mx-auto max-w-md">
            {token ? <SetNewPasswordForm token={token} /> : <RequestResetForm />}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function RequestResetForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <h1 className="font-serif text-[32px] font-semibold text-ink">Check your inbox</h1>
        <p className="mt-3 font-sans text-[15px] text-stone">
          If an account exists for {email}, we&rsquo;ve sent a link to reset your password. The link
          expires in 1 hour.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block font-sans text-[14px] font-semibold text-brand underline underline-offset-2"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-serif text-[32px] font-semibold text-ink">Forgot your password?</h1>
      <p className="mt-2 font-sans text-[14px] text-stone">
        Enter your email and we&rsquo;ll send you a reset link.
      </p>
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
        <button
          type="submit"
          disabled={submitting}
          className="h-11 w-full cursor-pointer rounded-default bg-brand font-sans text-[14px] font-semibold text-ivory transition-all hover:bg-brand/90 disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="text-center font-sans text-[13px] text-stone">
          <Link to="/login" className="underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </form>
    </>
  );
}

function SetNewPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch {
      setError('This reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="font-serif text-[32px] font-semibold text-ink">Password updated</h1>
        <p className="mt-3 font-sans text-[15px] text-stone">
          You can now sign in with your new password.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block h-11 rounded-default bg-brand px-6 font-sans text-[14px] font-semibold leading-[44px] text-ivory"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-serif text-[32px] font-semibold text-ink">Set a new password</h1>
      <p className="mt-2 font-sans text-[14px] text-stone">
        Choose a strong password — at least 8 characters.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
            New password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
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
          className="h-11 w-full cursor-pointer rounded-default bg-brand font-sans text-[14px] font-semibold text-ivory transition-all hover:bg-brand/90 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </>
  );
}
