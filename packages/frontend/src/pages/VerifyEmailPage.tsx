import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { confirmEmailVerification } from '@/api/auth';

type Status = 'pending' | 'success' | 'error';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    confirmEmailVerification(token)
      .then(() => setStatus('success'))
      .catch(() => {
        setStatus('error');
        setMessage('This verification link is invalid or has expired.');
      });
  }, [token]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        <Container className="py-24">
          <div className="mx-auto max-w-md text-center">
            <h1 className="font-serif text-[32px] font-semibold text-ink">
              {status === 'pending' && 'Verifying your email…'}
              {status === 'success' && 'Email verified'}
              {status === 'error' && 'Verification failed'}
            </h1>
            <p className="mt-3 font-sans text-[15px] text-stone">
              {status === 'pending' && 'One moment while we confirm your address.'}
              {status === 'success' && 'Thanks for confirming — your account is now fully active.'}
              {status === 'error' && message}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/account"
                className="h-11 rounded-default bg-brand px-6 font-sans text-[14px] font-semibold leading-[44px] text-ivory transition-all hover:bg-brand/90"
              >
                Go to my account
              </Link>
              {status === 'error' && (
                <Link
                  to="/login"
                  className="h-11 rounded-default border-[1.5px] border-sand bg-white px-6 font-sans text-[14px] font-semibold leading-[40px] text-ink"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
