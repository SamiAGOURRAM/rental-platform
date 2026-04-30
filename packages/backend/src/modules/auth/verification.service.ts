import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { config } from '../../config/index.js';
import { emailChannel } from '../notification/channels/email.channel.js';
import { renderVerifyEmail } from '../notification/templates/verify-email.js';
import { renderPasswordReset } from '../notification/templates/password-reset.js';
import { renderMagicLink } from '../notification/templates/magic-link.js';
import { NotFoundError, ConflictError, UnauthorizedError } from '../../common/errors/index.js';
import type { UserId } from '../../common/types/branded.js';
import { asUserId } from '../../common/types/branded.js';
import { tokenService } from './token.service.js';
import type { TokenPair } from './token.service.js';

type Locale = 'en' | 'fr' | 'es';

const VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1h
const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15m
const TOKEN_BYTES = 32; // 64-char hex
const BCRYPT_ROUNDS = 12;

function generateRawToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export class VerificationService {
  /** Generate a verification token, store it, and email the user a clickable link. */
  async sendEmailVerification(userId: UserId): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);
    if (user.emailVerified) return; // already verified — no-op

    // Invalidate any prior unused tokens of this type for this user
    await prisma.verificationToken.updateMany({
      where: { userId, type: 'email_verify', usedAt: null },
      data: { usedAt: new Date() },
    });

    const { raw, hash } = generateRawToken();
    await prisma.verificationToken.create({
      data: {
        userId,
        type: 'email_verify',
        tokenHash: hash,
        expiresAt: new Date(Date.now() + VERIFY_EXPIRY_MS),
      },
    });

    const verifyUrl = `${config.FRONTEND_URL}/verify-email?token=${raw}`;
    const rendered = renderVerifyEmail(
      { firstName: user.firstName, verifyUrl },
      (user.locale ?? 'en') as Locale,
    );
    await emailChannel.sendEmail({ to: user.email, ...rendered });
  }

  /** Consume a verification token — marks the user's email as verified. */
  async verifyEmail(rawToken: string): Promise<{ userId: UserId }> {
    const hash = hashToken(rawToken);
    const token = await prisma.verificationToken.findUnique({ where: { tokenHash: hash } });
    if (!token || token.type !== 'email_verify' || token.usedAt || token.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: token.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      prisma.verificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { userId: asUserId(token.userId) };
  }

  /** Generate a magic-link token and email the link. Works for guests and regular users. Silent if email not found. */
  async sendMagicLink(email: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user) return; // silent — don't reveal whether email exists

    await prisma.verificationToken.updateMany({
      where: { userId: user.id, type: 'magic_link', usedAt: null },
      data: { usedAt: new Date() },
    });

    const { raw, hash } = generateRawToken();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'magic_link',
        tokenHash: hash,
        expiresAt: new Date(Date.now() + MAGIC_LINK_EXPIRY_MS),
      },
    });

    const magicUrl = `${config.FRONTEND_URL}/login?magic=${raw}`;
    const rendered = renderMagicLink(
      { firstName: user.firstName, magicUrl },
      (user.locale ?? 'en') as Locale,
    );
    await emailChannel.sendEmail({ to: user.email, ...rendered });
  }

  /** Consume a magic-link token and issue a fresh session. */
  async verifyMagicLink(
    rawToken: string,
  ): Promise<{ tokenPair: TokenPair; userId: UserId; role: string; locale: string }> {
    const hash = hashToken(rawToken);
    const token = await prisma.verificationToken.findUnique({ where: { tokenHash: hash } });
    if (!token || token.type !== 'magic_link' || token.usedAt || token.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired magic link');
    }

    const user = await prisma.user.findUnique({ where: { id: token.userId } });
    if (!user) throw new NotFoundError('User', token.userId);

    const accessToken = tokenService.generateAccessToken(asUserId(user.id), user.role, user.locale);
    const { raw: refreshRaw, hash: refreshHash } = tokenService.generateRefreshToken();
    const refreshTokenExpiresAt = await tokenService.storeRefreshToken(
      asUserId(user.id),
      refreshHash,
    );

    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    return {
      tokenPair: { accessToken, refreshToken: refreshRaw, refreshTokenExpiresAt },
      userId: asUserId(user.id),
      role: user.role,
      locale: user.locale,
    };
  }

  /** Generate a password-reset token and email the link. Silent if email not found (no enumeration). Guests are now allowed. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user) return; // silent

    await prisma.verificationToken.updateMany({
      where: { userId: user.id, type: 'password_reset', usedAt: null },
      data: { usedAt: new Date() },
    });

    const { raw, hash } = generateRawToken();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'password_reset',
        tokenHash: hash,
        expiresAt: new Date(Date.now() + RESET_EXPIRY_MS),
      },
    });

    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${raw}`;
    const rendered = renderPasswordReset(
      { firstName: user.firstName, resetUrl },
      (user.locale ?? 'en') as Locale,
    );
    await emailChannel.sendEmail({ to: user.email, ...rendered });
  }

  /** Consume a password-reset token and set the new password. Also upgrades a guest to a regular account. */
  async resetPassword(rawToken: string, newPassword: string): Promise<{ userId: UserId }> {
    if (newPassword.length < 8) {
      throw new ConflictError('Password must be at least 8 characters');
    }
    const hash = hashToken(rawToken);
    const token = await prisma.verificationToken.findUnique({ where: { tokenHash: hash } });
    if (!token || token.type !== 'password_reset' || token.usedAt || token.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash, isGuest: false },
      }),
      prisma.verificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      // Kill all refresh tokens — force re-login everywhere
      prisma.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { userId: asUserId(token.userId) };
  }
}

export const verificationService = new VerificationService();
