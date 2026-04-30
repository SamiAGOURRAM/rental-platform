import { fetchApi } from './client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified?: boolean;
  isGuest?: boolean;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export function login(email: string, password: string): Promise<AuthResult> {
  return fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResult> {
  return fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function guestCheckout(data: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResult> {
  return fetchApi('/auth/guest-checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function refresh(): Promise<{ accessToken: string; refreshToken?: string }> {
  return fetchApi('/auth/refresh', { method: 'POST' });
}

export function logout(): Promise<void> {
  return fetchApi('/auth/logout', { method: 'POST' });
}

export function requestEmailVerification(): Promise<void> {
  return fetchApi('/auth/email/verify/request', { method: 'POST' });
}

export function confirmEmailVerification(token: string): Promise<void> {
  return fetchApi('/auth/email/verify/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function requestPasswordReset(email: string): Promise<void> {
  return fetchApi('/auth/password/reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function confirmPasswordReset(token: string, password: string): Promise<void> {
  return fetchApi('/auth/password/reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export function requestMagicLink(email: string): Promise<void> {
  return fetchApi('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyMagicLink(token: string): Promise<AuthResult> {
  return fetchApi('/auth/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function setPassword(password: string): Promise<void> {
  return fetchApi('/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
