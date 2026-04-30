import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { config } from '../../config/index.js';
import { prisma } from '../../config/database.js';
import { RefreshTokenReusedError } from '../../common/errors/index.js';
import type { UserRole } from '@prisma/client';
import type { UserId } from '../../common/types/branded.js';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  locale: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export class TokenService {
  generateAccessToken(userId: UserId, role: UserRole, locale: string): string {
    return jwt.sign(
      { sub: userId, role, locale } satisfies AccessTokenPayload,
      config.JWT_ACCESS_SECRET,
      // expiresIn accepts string like '15m' — cast needed due to @types/jsonwebtoken strict overloads
      { expiresIn: config.JWT_ACCESS_EXPIRY as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );
  }

  generateRefreshToken(): { raw: string; hash: string } {
    const raw = randomBytes(40).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  async storeRefreshToken(userId: UserId, hash: string): Promise<Date> {
    // Parse expiry string like "30d" to milliseconds
    const expiryMs = this.parseExpiry(config.JWT_REFRESH_EXPIRY);
    const expiresAt = new Date(Date.now() + expiryMs);

    await prisma.refreshToken.create({
      data: { userId, tokenHash: hash, expiresAt },
    });

    return expiresAt;
  }

  async rotateRefreshToken(
    oldHash: string,
    userId: UserId,
    role: UserRole,
    locale: string,
  ): Promise<TokenPair | null> {
    const existing = await prisma.refreshToken.findFirst({
      where: { userId, tokenHash: oldHash },
    });

    if (!existing) return null;

    // Theft detection: if token was already revoked, revoke ALL user tokens
    // This runs outside the transaction so it persists even when we throw.
    if (existing.revokedAt !== null) {
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      throw new RefreshTokenReusedError();
    }

    // Check expiry
    if (existing.expiresAt < new Date()) return null;

    return prisma.$transaction(async (tx) => {
      // Revoke old token
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });

      // Issue new pair
      const accessToken = this.generateAccessToken(userId, role, locale);
      const { raw, hash } = this.generateRefreshToken();
      const expiryMs = this.parseExpiry(config.JWT_REFRESH_EXPIRY);
      const refreshTokenExpiresAt = new Date(Date.now() + expiryMs);

      const newToken = await tx.refreshToken.create({
        data: { userId, tokenHash: hash, expiresAt: refreshTokenExpiresAt },
      });

      // Link old token to new one for audit
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { rotatedToId: newToken.id },
      });

      return { accessToken, refreshToken: raw, refreshTokenExpiresAt };
    });
  }

  async revokeRefreshToken(hash: string, userId: UserId): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000; // 30d fallback
    }
  }
}

export const tokenService = new TokenService();
