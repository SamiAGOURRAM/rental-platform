import { prisma } from '../../config/database.js';
import type { User } from '@prisma/client';
import type { UserId } from '../../common/types/branded.js';
import { asUserId } from '../../common/types/branded.js';

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async findById(id: UserId): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    locale: string;
    isGuest?: boolean;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        isGuest: data.isGuest ?? false,
        firstName: data.firstName,
        lastName: data.lastName,
        locale: data.locale,
        role: 'customer',
      },
    });
  }

  /**
   * If a soft-deleted user still occupies this email, anonymize it so the email
   * can be reused by a new account.
   */
  async releaseDeletedEmailReservation(email: string): Promise<boolean> {
    const normalized = email.toLowerCase();
    const deletedUser = await prisma.user.findFirst({
      where: {
        email: normalized,
        deletedAt: { not: null },
      },
      select: { id: true },
    });

    if (!deletedUser) return false;

    await prisma.user.update({
      where: { id: deletedUser.id },
      data: {
        email: `${deletedUser.id}.deleted.${Date.now()}@deleted.local`,
      },
    });

    return true;
  }

  async updateGuestProfile(
    userId: UserId,
    data: { firstName: string; lastName: string; locale: string },
  ): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        locale: data.locale,
      },
    });
  }

  async upgradeGuestToAccount(
    userId: UserId,
    data: { passwordHash: string; firstName: string; lastName: string; locale: string },
  ): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        locale: data.locale,
        isGuest: false,
      },
    });
  }

  async updatePassword(userId: UserId, newHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }

  asUserId(id: string): UserId {
    return asUserId(id);
  }
}

export const authRepository = new AuthRepository();
