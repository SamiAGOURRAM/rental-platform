import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { authRepository } from './auth.repository.js';
import { tokenService } from './token.service.js';
import { verificationService } from './verification.service.js';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';

vi.mock('./auth.repository.js', () => ({
  authRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    upgradeGuestToAccount: vi.fn(),
    updateGuestProfile: vi.fn(),
    releaseDeletedEmailReservation: vi.fn(),
  },
}));

vi.mock('./token.service.js', () => ({
  tokenService: {
    generateAccessToken: vi.fn().mockReturnValue('access-token'),
    generateRefreshToken: vi.fn().mockReturnValue({ raw: 'refresh-raw', hash: 'refresh-hash' }),
    storeRefreshToken: vi.fn().mockResolvedValue(new Date('2026-12-31')),
    rotateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    hashToken: vi.fn().mockReturnValue('hashed-token'),
  },
}));

vi.mock('./verification.service.js', () => ({
  verificationService: {
    sendEmailVerification: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  const userId = 'u1';
  const mockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: userId,
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Alice',
      lastName: 'Dupont',
      role: 'customer',
      locale: 'fr',
      emailVerified: false,
      emailVerifiedAt: null,
      isGuest: false,
      phone: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
      ...overrides,
    }) as User;

  beforeEach(() => {
    service = new AuthService();
    vi.clearAllMocks();
  });

  // ── register ─────────────────────────────────────────────────

  describe('register', () => {
    it('creates a new user and returns token pair', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(authRepository.create).mockResolvedValue(mockUser());

      const result = await service.register({
        email: 'alice@example.com',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Dupont',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.user.email).toBe('alice@example.com');
        expect(result.value.tokenPair.accessToken).toBe('access-token');
        expect(result.value.tokenPair.refreshToken).toBe('refresh-raw');
      }
      expect(authRepository.create).toHaveBeenCalled();
      expect(verificationService.sendEmailVerification).toHaveBeenCalled();
    });

    it('fails when email already exists for a non-guest account', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(mockUser({ isGuest: false }));

      const result = await service.register({
        email: 'alice@example.com',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Dupont',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('upgrades an existing guest to a regular account', async () => {
      const guest = mockUser({ isGuest: true });
      vi.mocked(authRepository.findByEmail).mockResolvedValue(guest);
      vi.mocked(authRepository.upgradeGuestToAccount).mockResolvedValue(
        mockUser({ isGuest: false }),
      );

      const result = await service.register({
        email: 'alice@example.com',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Dupont',
      });

      expect(result.ok).toBe(true);
      expect(authRepository.upgradeGuestToAccount).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ passwordHash: 'hashed-password' }),
      );
    });

    it('recovers from soft-deleted email conflict', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(authRepository.create)
        .mockRejectedValueOnce({ code: 'P2002' })
        .mockResolvedValueOnce(mockUser());
      vi.mocked(authRepository.releaseDeletedEmailReservation).mockResolvedValue(true);

      const result = await service.register({
        email: 'alice@example.com',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Dupont',
      });

      expect(result.ok).toBe(true);
      expect(authRepository.releaseDeletedEmailReservation).toHaveBeenCalledWith(
        'alice@example.com',
      );
      expect(authRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  // ── guestCheckout ────────────────────────────────────────────

  describe('guestCheckout', () => {
    it('creates a new guest user', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(authRepository.create).mockResolvedValue(mockUser({ isGuest: true }));

      const result = await service.guestCheckout({
        email: 'guest@example.com',
        firstName: 'Guest',
        lastName: 'User',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.user.isGuest).toBe(true);
      }
      expect(authRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isGuest: true }),
      );
    });

    it('updates an existing guest profile', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(mockUser({ isGuest: true }));
      vi.mocked(authRepository.updateGuestProfile).mockResolvedValue(
        mockUser({ isGuest: true, firstName: 'Updated' }),
      );

      const result = await service.guestCheckout({
        email: 'guest@example.com',
        firstName: 'Updated',
        lastName: 'User',
      });

      expect(result.ok).toBe(true);
      expect(authRepository.updateGuestProfile).toHaveBeenCalled();
    });

    it('fails when email belongs to a non-guest account', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(mockUser({ isGuest: false }));

      const result = await service.guestCheckout({
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Dupont',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });
  });

  // ── login ────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token pair for valid credentials', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(mockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login('alice@example.com', 'password123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.user.email).toBe('alice@example.com');
      }
    });

    it('fails for invalid password', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(mockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const result = await service.login('alice@example.com', 'wrong');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('fails for non-existent user', async () => {
      vi.mocked(authRepository.findByEmail).mockResolvedValue(null);

      const result = await service.login('nobody@example.com', 'password123');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  // ── refresh ──────────────────────────────────────────────────

  describe('refresh', () => {
    it('returns new token pair for valid refresh token', async () => {
      vi.mocked(authRepository.findById).mockResolvedValue(mockUser());
      vi.mocked(tokenService.rotateRefreshToken).mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        refreshTokenExpiresAt: new Date('2026-12-31'),
      });

      const result = await service.refresh('raw-token', userId as any);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.accessToken).toBe('new-access');
      }
    });

    it('fails when user not found', async () => {
      vi.mocked(authRepository.findById).mockResolvedValue(null);

      const result = await service.refresh('raw-token', userId as any);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('fails when token is invalid or expired', async () => {
      vi.mocked(authRepository.findById).mockResolvedValue(mockUser());
      vi.mocked(tokenService.rotateRefreshToken).mockResolvedValue(null);

      const result = await service.refresh('raw-token', userId as any);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('throws RefreshTokenReusedError when token reuse is detected', async () => {
      vi.mocked(authRepository.findById).mockResolvedValue(mockUser());
      const { RefreshTokenReusedError } =
        await import('../../common/errors/refresh-token-reused.error.js');
      vi.mocked(tokenService.rotateRefreshToken).mockRejectedValue(new RefreshTokenReusedError());

      await expect(service.refresh('raw-token', userId as any)).rejects.toMatchObject({
        code: 'REFRESH_REVOKED',
        statusCode: 401,
      });
    });
  });

  // ── setPassword ──────────────────────────────────────────────

  describe('setPassword', () => {
    it('upgrades guest to account with password', async () => {
      vi.mocked(authRepository.findById).mockResolvedValue(mockUser());
      vi.mocked(authRepository.upgradeGuestToAccount).mockResolvedValue(
        mockUser({ isGuest: false }),
      );

      await service.setPassword(userId as any, 'newpassword123');

      expect(authRepository.upgradeGuestToAccount).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ passwordHash: 'hashed-password' }),
      );
    });

    it('throws NotFoundError when user does not exist', async () => {
      vi.mocked(authRepository.findById).mockResolvedValue(null);

      await expect(service.setPassword(userId as any, 'newpassword123')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  // ── logout ───────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      vi.mocked(tokenService.revokeRefreshToken).mockResolvedValue(undefined);

      await service.logout('raw-token', userId as any);

      expect(tokenService.hashToken).toHaveBeenCalledWith('raw-token');
      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('hashed-token', userId);
    });
  });
});
