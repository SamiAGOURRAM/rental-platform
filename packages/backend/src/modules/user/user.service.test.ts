import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service.js';
import { userRepository } from './user.repository.js';
import { prisma } from '../../config/database.js';
import type { User, Address } from '@prisma/client';

vi.mock('./user.repository.js', () => ({
  userRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    findAddresses: vi.fn(),
    findAddress: vi.fn(),
    createAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
  },
}));

describe('UserService', () => {
  let service: UserService;
  const userId = 'u1' as User['id'];
  const addressId = 'a1' as Address['id'];

  beforeEach(() => {
    service = new UserService();
    vi.clearAllMocks();
  });

  // ── getProfile ───────────────────────────────────────────────

  describe('getProfile', () => {
    const mockUser = {
      id: userId,
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Dupont',
      phone: '+33600000001',
      locale: 'fr',
      emailVerifiedAt: new Date('2026-01-01'),
      authProvider: 'email',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
    } as User;

    it('returns the user when found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('throws NotFoundError when user does not exist', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  // ── updateProfile ────────────────────────────────────────────

  describe('updateProfile', () => {
    const mockUser = {
      id: userId,
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Dupont',
      phone: '+33600000001',
      locale: 'fr',
      emailVerifiedAt: new Date('2026-01-01'),
      authProvider: 'email',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
    } as User;

    const updateData = {
      firstName: 'Alicia',
      lastName: 'Smith',
      phone: '+447000000001',
      locale: 'en' as const,
    };

    it('updates firstName, lastName, phone, and locale', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.update).mockResolvedValue(updatedUser as User);

      const result = await service.updateProfile(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.update).toHaveBeenCalledWith(userId, updateData);
    });

    it('throws NotFoundError when user does not exist', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(service.updateProfile(userId, updateData)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  // ── getAddresses ─────────────────────────────────────────────

  describe('getAddresses', () => {
    it('returns addresses from repository', async () => {
      const mockAddresses = [
        {
          id: 'a1',
          userId,
          label: 'Home',
          line1: '1 Rue de Paris',
          line2: null,
          city: 'Paris',
          postalCode: '75001',
          countryCode: 'FR',
          isDefault: true,
          instructions: null,
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 'a2',
          userId,
          label: 'Office',
          line1: '10 Avenue des Champs',
          line2: 'Floor 3',
          city: 'Paris',
          postalCode: '75008',
          countryCode: 'FR',
          isDefault: false,
          instructions: 'Ring buzzer B',
          createdAt: new Date('2026-02-01'),
        },
      ] as Address[];

      vi.mocked(userRepository.findAddresses).mockResolvedValue(mockAddresses);

      const result = await service.getAddresses(userId);

      expect(result).toEqual(mockAddresses);
      expect(userRepository.findAddresses).toHaveBeenCalledWith(userId);
    });
  });

  // ── createAddress ────────────────────────────────────────────

  describe('createAddress', () => {
    it('creates address with default countryCode=FR and isDefault=false', async () => {
      const input = { label: 'Home', line1: '1 Rue de Paris', city: 'Paris', postalCode: '75001' };
      const created = {
        id: 'a1',
        userId,
        ...input,
        line2: null,
        countryCode: 'FR',
        isDefault: false,
        instructions: null,
        createdAt: new Date('2026-01-01'),
      } as Address;

      vi.mocked(userRepository.createAddress).mockResolvedValue(created);

      const result = await service.createAddress(userId, input);

      expect(result).toEqual(created);
      expect(userRepository.createAddress).toHaveBeenCalledWith(userId, {
        label: 'Home',
        line1: '1 Rue de Paris',
        line2: null,
        city: 'Paris',
        postalCode: '75001',
        countryCode: 'FR',
        instructions: null,
        isDefault: false,
      });
    });

    it('passes through custom values when provided', async () => {
      const input = {
        label: 'Office',
        line1: '10 Avenue des Champs',
        line2: 'Floor 3',
        city: 'Paris',
        postalCode: '75008',
        countryCode: 'DE',
        instructions: 'Ring buzzer B',
        isDefault: true,
      };
      const created = { id: 'a2', userId, ...input, createdAt: new Date('2026-01-01') } as Address;

      vi.mocked(userRepository.createAddress).mockResolvedValue(created);

      const result = await service.createAddress(userId, input);

      expect(result).toEqual(created);
      expect(userRepository.createAddress).toHaveBeenCalledWith(userId, {
        label: 'Office',
        line1: '10 Avenue des Champs',
        line2: 'Floor 3',
        city: 'Paris',
        postalCode: '75008',
        countryCode: 'DE',
        instructions: 'Ring buzzer B',
        isDefault: true,
      });
    });
  });

  // ── updateAddress ────────────────────────────────────────────

  describe('updateAddress', () => {
    const mockAddress = {
      id: addressId,
      userId,
      label: 'Home',
      line1: '1 Rue de Paris',
      line2: null,
      city: 'Paris',
      postalCode: '75001',
      countryCode: 'FR',
      isDefault: true,
      instructions: null,
      createdAt: new Date('2026-01-01'),
    } as Address;

    it('updates existing address', async () => {
      const data = { label: 'New Home', city: 'Lyon' };
      const updated = { ...mockAddress, ...data };

      vi.mocked(userRepository.findAddress).mockResolvedValue(mockAddress);
      vi.mocked(userRepository.updateAddress).mockResolvedValue(updated as Address);

      const result = await service.updateAddress(addressId, userId, data);

      expect(result).toEqual(updated);
      expect(userRepository.findAddress).toHaveBeenCalledWith(addressId, userId);
      expect(userRepository.updateAddress).toHaveBeenCalledWith(addressId, userId, data);
    });

    it('throws NotFoundError when address does not exist', async () => {
      vi.mocked(userRepository.findAddress).mockResolvedValue(null);

      await expect(service.updateAddress(addressId, userId, {})).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  // ── deleteAddress ────────────────────────────────────────────

  describe('deleteAddress', () => {
    const mockAddress = {
      id: addressId,
      userId,
      label: 'Home',
      line1: '1 Rue de Paris',
      line2: null,
      city: 'Paris',
      postalCode: '75001',
      countryCode: 'FR',
      isDefault: true,
      instructions: null,
      createdAt: new Date('2026-01-01'),
    } as Address;

    it('deletes existing address', async () => {
      vi.mocked(userRepository.findAddress).mockResolvedValue(mockAddress);
      vi.mocked(userRepository.deleteAddress).mockResolvedValue(undefined);

      await service.deleteAddress(addressId, userId);

      expect(userRepository.findAddress).toHaveBeenCalledWith(addressId, userId);
      expect(userRepository.deleteAddress).toHaveBeenCalledWith(addressId, userId);
    });

    it('throws NotFoundError when address does not exist', async () => {
      vi.mocked(userRepository.findAddress).mockResolvedValue(null);

      await expect(service.deleteAddress(addressId, userId)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  // ── getTravelLog ─────────────────────────────────────────────

  describe('getTravelLog', () => {
    const mockOrder = (overrides: Record<string, unknown> = {}) => ({
      id: 'o1',
      orderNumber: 'ORD-001',
      status: 'completed',
      rentalStart: new Date('2026-06-01'),
      rentalEnd: new Date('2026-06-05'),
      total: 120.5,
      carbonSavedKg: 3.5,
      address: { city: 'Paris', countryCode: 'FR' },
      items: [
        {
          productId: 'p1',
          product: {
            id: 'p1',
            nameEn: 'Silk Dress',
            nameFr: 'Robe en soie',
            nameEs: 'Vestido de seda',
            brand: 'Chanel',
            images: [{ url: 'https://example.com/img1.jpg', isPrimary: true }],
          },
        },
      ],
      ...overrides,
    });

    const mockOrder2 = (overrides: Record<string, unknown> = {}) => ({
      id: 'o2',
      orderNumber: 'ORD-002',
      status: 'active_rental',
      rentalStart: new Date('2026-07-01'),
      rentalEnd: new Date('2026-07-04'),
      total: 80,
      carbonSavedKg: 2.1,
      address: { city: 'Lyon', countryCode: 'FR' },
      items: [
        {
          productId: 'p2',
          product: {
            id: 'p2',
            nameEn: 'Cashmere Scarf',
            nameFr: 'Écharpe en cachemire',
            nameEs: 'Bufanda de cachemira',
            brand: 'Hermès',
            images: [],
          },
        },
        {
          productId: 'p3',
          product: {
            id: 'p3',
            nameEn: 'Leather Gloves',
            nameFr: 'Gants en cuir',
            nameEs: 'Guantes de cuero',
            brand: 'Dior',
            images: [{ url: 'https://example.com/img3.jpg', isPrimary: true }],
          },
        },
      ],
      ...overrides,
    });

    it('returns aggregated travel data with trips, cities visited, CO2 saved', async () => {
      const orders = [mockOrder(), mockOrder2()];

      vi.mocked(prisma.order.findMany).mockResolvedValue(orders as any);

      const result = await service.getTravelLog(userId, 'en');

      expect(result.tripsCount).toBe(2);
      expect(result.citiesVisited).toBe(2);
      expect(result.totalPiecesRented).toBe(3);
      expect(result.totalCo2SavedKg).toBe(5.6);
      expect(result.trips).toHaveLength(2);

      const trip1 = result.trips.find((t) => t.orderId === 'o1');
      expect(trip1).toBeDefined();
      expect(trip1!.city).toBe('Paris');
      expect(trip1!.countryCode).toBe('FR');
      expect(trip1!.rentalStart).toBe('2026-06-01');
      expect(trip1!.rentalEnd).toBe('2026-06-05');
      expect(trip1!.carbonSavedKg).toBe(3.5);
      expect(trip1!.totalAmount).toBe(120.5);
      expect(trip1!.items).toHaveLength(1);
      expect(trip1!.items[0].productId).toBe('p1');
      expect(trip1!.items[0].name).toBe('Silk Dress');
      expect(trip1!.items[0].brand).toBe('Chanel');
      expect(trip1!.items[0].imageUrl).toBe('https://example.com/img1.jpg');

      const trip2 = result.trips.find((t) => t.orderId === 'o2');
      expect(trip2).toBeDefined();
      expect(trip2!.items).toHaveLength(2);
      // imageUrl fallback when images array is empty
      expect(trip2!.items[0].imageUrl).toBeNull();

      expect(result.cities).toHaveLength(2);
      expect(result.cities[0].city).toBeDefined();
      expect(result.cities[1].city).toBeDefined();
    });

    it('returns zero counts when there are no orders', async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([]);

      const result = await service.getTravelLog(userId, 'en');

      expect(result.tripsCount).toBe(0);
      expect(result.citiesVisited).toBe(0);
      expect(result.totalPiecesRented).toBe(0);
      expect(result.totalCo2SavedKg).toBe(0);
      expect(result.trips).toEqual([]);
      expect(result.cities).toEqual([]);
    });

    it('uses English names when locale is en', async () => {
      const orders = [mockOrder()];

      vi.mocked(prisma.order.findMany).mockResolvedValue(orders as any);

      const result = await service.getTravelLog(userId, 'en');

      expect(result.trips[0].items[0].name).toBe('Silk Dress');
    });

    it('uses French names when locale is fr', async () => {
      const orders = [mockOrder()];

      vi.mocked(prisma.order.findMany).mockResolvedValue(orders as any);

      const result = await service.getTravelLog(userId, 'fr');

      expect(result.trips[0].items[0].name).toBe('Robe en soie');
    });

    it('uses Spanish names when locale is es', async () => {
      const orders = [mockOrder()];

      vi.mocked(prisma.order.findMany).mockResolvedValue(orders as any);

      const result = await service.getTravelLog(userId, 'es');

      expect(result.trips[0].items[0].name).toBe('Vestido de seda');
    });

    it('falls back to nameEn when locale-specific name is missing', async () => {
      const order = mockOrder();

      (order.items[0].product as any).nameFr = undefined;
      const orders = [order];

      vi.mocked(prisma.order.findMany).mockResolvedValue(orders as any);

      const result = await service.getTravelLog(userId, 'fr');

      expect(result.trips[0].items[0].name).toBe('Silk Dress');
    });

    it('excludes cancelled and pending_payment orders', async () => {
      // The service only queries countedStatuses — the findMany call
      // already filters, so this test verifies the filter is applied correctly.
      const orders = [mockOrder()];
      vi.mocked(prisma.order.findMany).mockResolvedValue(orders as any);

      await service.getTravelLog(userId, 'en');

      const findManyCall = vi.mocked(prisma.order.findMany).mock.calls[0][0];
      expect(findManyCall.where.status.in).not.toContain('cancelled');
      expect(findManyCall.where.status.in).not.toContain('pending_payment');
      expect(findManyCall.where.status.in).toContain('completed');
      expect(findManyCall.where.status.in).toContain('active_rental');
      expect(findManyCall.where.status.in).toContain('returned');
    });
  });
});
