import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { authRepository } from './auth.repository.js';
import { tokenService } from './token.service.js';
import { verificationService } from './verification.service.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../common/errors/index.js';
import type { Result } from '../../common/types/result.js';
import { ok, fail } from '../../common/types/result.js';
import type { TokenPair } from './token.service.js';
import type { UserId } from '../../common/types/branded.js';
import { asUserId } from '../../common/types/branded.js';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  locale?: string;
}

export interface GuestCheckoutInput {
  email: string;
  firstName: string;
  lastName: string;
  locale?: string;
}

export interface LoginResult {
  tokenPair: TokenPair;
  user: {
    id: UserId;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    locale: string;
    emailVerified: boolean;
    isGuest: boolean;
  };
}

const BCRYPT_ROUNDS = 12;

export class AuthService {
  async register(input: RegisterInput): Promise<Result<LoginResult, ConflictError>> {
    const email = input.email.toLowerCase();
    const existing = await authRepository.findByEmail(email);
    if (existing && !existing.isGuest) {
      return fail(new ConflictError('An account with this email already exists'));
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const locale = input.locale ?? existing?.locale ?? 'fr';

    const user = existing?.isGuest
      ? await authRepository.upgradeGuestToAccount(asUserId(existing.id), {
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          locale,
        })
      : await this.createUserWithDeletedEmailRecovery({
          email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          locale,
        });

    const tokenPair = await this.issueTokenPair(asUserId(user.id), user.role, user.locale);

    // Fire email verification (non-blocking; errors shouldn't break signup)
    verificationService.sendEmailVerification(asUserId(user.id)).catch((err) => {
      console.warn('[Auth] Failed to send verification email:', err);
    });

    return ok(this.toLoginResult(user, tokenPair));
  }

  async guestCheckout(input: GuestCheckoutInput): Promise<Result<LoginResult, ConflictError>> {
    const email = input.email.toLowerCase();
    const existing = await authRepository.findByEmail(email);

    if (existing && !existing.isGuest) {
      return fail(new ConflictError('An account with this email already exists. Please sign in.'));
    }

    const locale = input.locale ?? existing?.locale ?? 'fr';

    const user = existing?.isGuest
      ? await authRepository.updateGuestProfile(asUserId(existing.id), {
          firstName: input.firstName,
          lastName: input.lastName,
          locale,
        })
      : await this.createUserWithDeletedEmailRecovery({
          email,
          // Guests authenticate through session tokens only; password is randomized.
          passwordHash: await bcrypt.hash(randomBytes(40).toString('hex'), BCRYPT_ROUNDS),
          firstName: input.firstName,
          lastName: input.lastName,
          locale,
          isGuest: true,
        });

    const tokenPair = await this.issueTokenPair(asUserId(user.id), user.role, user.locale);

    return ok(this.toLoginResult(user, tokenPair));
  }

  async login(email: string, password: string): Promise<Result<LoginResult, UnauthorizedError>> {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      // Constant-time comparison even on not found to prevent email enumeration
      await bcrypt.compare(password, '$2b$12$invalidhashforconstanttime000000000000000000000');
      return fail(new UnauthorizedError('Invalid email or password'));
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return fail(new UnauthorizedError('Invalid email or password'));
    }

    const tokenPair = await this.issueTokenPair(asUserId(user.id), user.role, user.locale);

    return ok(this.toLoginResult(user, tokenPair));
  }

  async refresh(
    rawRefreshToken: string,
    userId: UserId,
  ): Promise<Result<TokenPair, UnauthorizedError>> {
    const user = await authRepository.findById(userId);
    if (!user) return fail(new UnauthorizedError('User not found'));

    const hash = tokenService.hashToken(rawRefreshToken);
    const newPair = await tokenService.rotateRefreshToken(
      hash,
      asUserId(user.id),
      user.role,
      user.locale,
    );

    if (!newPair) {
      return fail(new UnauthorizedError('Invalid or expired refresh token'));
    }

    return ok(newPair);
  }

  async logout(rawRefreshToken: string, userId: UserId): Promise<void> {
    const hash = tokenService.hashToken(rawRefreshToken);
    await tokenService.revokeRefreshToken(hash, userId);
  }

  async setPassword(userId: UserId, password: string): Promise<void> {
    const user = await authRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await authRepository.upgradeGuestToAccount(userId, {
      passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      locale: user.locale,
    });
  }

  private async issueTokenPair(
    userId: UserId,
    role: Parameters<typeof tokenService.generateAccessToken>[1],
    locale: string,
  ): Promise<TokenPair> {
    const accessToken = tokenService.generateAccessToken(userId, role, locale);
    const { raw, hash } = tokenService.generateRefreshToken();
    const refreshTokenExpiresAt = await tokenService.storeRefreshToken(userId, hash);
    return { accessToken, refreshToken: raw, refreshTokenExpiresAt };
  }

  private async createUserWithDeletedEmailRecovery(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    locale: string;
    isGuest?: boolean;
  }) {
    try {
      return await authRepository.create(data);
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;

      const released = await authRepository.releaseDeletedEmailReservation(data.email);
      if (!released) throw err;

      return authRepository.create(data);
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const code = (err as { code?: unknown }).code;
    return code === 'P2002';
  }

  private toLoginResult(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      locale: string;
      emailVerified?: boolean;
      isGuest?: boolean;
    },
    tokenPair: TokenPair,
  ): LoginResult {
    return {
      tokenPair,
      user: {
        id: asUserId(user.id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locale: user.locale,
        emailVerified: user.emailVerified ?? false,
        isGuest: user.isGuest ?? false,
      },
    };
  }
}

export const authService = new AuthService();
