import { prisma } from '../../config/database.js';
import type { User, Address } from '@prisma/client';
import type { UserId, AddressId } from '../../common/types/branded.js';

export class UserRepository {
  async findById(id: UserId): Promise<User | null> {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async update(
    id: UserId,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'locale'>>,
  ): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async softDelete(id: UserId): Promise<void> {
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ─── Addresses ───────────────────────────────────────────────

  async findAddresses(userId: UserId): Promise<Address[]> {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findAddress(id: AddressId, userId: UserId): Promise<Address | null> {
    return prisma.address.findFirst({ where: { id, userId } });
  }

  async createAddress(
    userId: UserId,
    data: Omit<Address, 'id' | 'userId' | 'createdAt'>,
  ): Promise<Address> {
    // If this is set as default, unset others first
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return prisma.address.create({ data: { ...data, userId } });
  }

  async updateAddress(
    id: AddressId,
    userId: UserId,
    data: Partial<Omit<Address, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<Address> {
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return prisma.address.update({ where: { id }, data });
  }

  async deleteAddress(id: AddressId, userId: UserId): Promise<void> {
    await prisma.address.deleteMany({ where: { id, userId } });
  }
}

export const userRepository = new UserRepository();
