import { userRepository } from './user.repository.js';
import { NotFoundError } from '../../common/errors/index.js';
import { prisma } from '../../config/database.js';
import type { User, Address } from '@prisma/client';
import type { UserId, AddressId } from '../../common/types/branded.js';

export interface TravelLogTrip {
  orderId: string;
  orderNumber: string;
  status: string;
  rentalStart: string;
  rentalEnd: string;
  city: string;
  countryCode: string;
  totalAmount: number;
  carbonSavedKg: number;
  items: { productId: string; name: string; brand: string; imageUrl: string | null }[];
}

export interface TravelLog {
  tripsCount: number;
  citiesVisited: number;
  totalPiecesRented: number;
  totalCo2SavedKg: number;
  trips: TravelLogTrip[];
  cities: { city: string; countryCode: string; tripsCount: number }[];
}

export class UserService {
  async getProfile(userId: UserId): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    return user;
  }

  async updateProfile(
    userId: UserId,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'locale'>>,
  ): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    return userRepository.update(userId, data);
  }

  async getAddresses(userId: UserId): Promise<Address[]> {
    return userRepository.findAddresses(userId);
  }

  async createAddress(
    userId: UserId,
    data: {
      label: string;
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      countryCode?: string;
      instructions?: string;
      isDefault?: boolean;
    },
  ): Promise<Address> {
    return userRepository.createAddress(userId, {
      label: data.label,
      line1: data.line1,
      line2: data.line2 ?? null,
      city: data.city,
      postalCode: data.postalCode,
      countryCode: data.countryCode ?? 'FR',
      instructions: data.instructions ?? null,
      isDefault: data.isDefault ?? false,
    });
  }

  async updateAddress(
    id: AddressId,
    userId: UserId,
    data: Partial<{
      label: string;
      line1: string;
      line2: string | null;
      city: string;
      postalCode: string;
      countryCode: string;
      instructions: string | null;
      isDefault: boolean;
    }>,
  ): Promise<Address> {
    const existing = await userRepository.findAddress(id, userId);
    if (!existing) throw new NotFoundError('Address', id);
    return userRepository.updateAddress(id, userId, data);
  }

  async deleteAddress(id: AddressId, userId: UserId): Promise<void> {
    const existing = await userRepository.findAddress(id, userId);
    if (!existing) throw new NotFoundError('Address', id);
    await userRepository.deleteAddress(id, userId);
  }

  async getTravelLog(userId: UserId, locale: 'en' | 'fr' | 'es' = 'en'): Promise<TravelLog> {
    // Only count orders that actually happened (not cancelled/pending_payment)
    const countedStatuses = [
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
      'active_rental',
      'return_initiated',
      'return_in_transit',
      'returned',
      'inspecting',
      'completed',
    ] as const;

    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: { in: countedStatuses as unknown as Array<(typeof countedStatuses)[number]> },
      },
      include: {
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { rentalStart: 'desc' },
    });

    const nameKey = `name${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as const;

    const trips: TravelLogTrip[] = orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      rentalStart: o.rentalStart.toISOString().slice(0, 10),
      rentalEnd: o.rentalEnd.toISOString().slice(0, 10),
      city: o.address.city,
      countryCode: o.address.countryCode,
      totalAmount: Number(o.total),
      carbonSavedKg: o.carbonSavedKg ? Number(o.carbonSavedKg) : 0,
      items: o.items.map((it) => ({
        productId: it.productId,
        name: (it.product as unknown as Record<string, string>)[nameKey] ?? it.product.nameEn,
        brand: it.product.brand,
        imageUrl: it.product.images[0]?.url ?? null,
      })),
    }));

    const cityMap = new Map<string, { city: string; countryCode: string; tripsCount: number }>();
    for (const t of trips) {
      const key = `${t.countryCode}:${t.city.toLowerCase()}`;
      const existing = cityMap.get(key);
      if (existing) existing.tripsCount += 1;
      else cityMap.set(key, { city: t.city, countryCode: t.countryCode, tripsCount: 1 });
    }

    return {
      tripsCount: trips.length,
      citiesVisited: cityMap.size,
      totalPiecesRented: trips.reduce((s, t) => s + t.items.length, 0),
      totalCo2SavedKg: Math.round(trips.reduce((s, t) => s + t.carbonSavedKg, 0) * 1000) / 1000,
      trips,
      cities: Array.from(cityMap.values()).sort((a, b) => b.tripsCount - a.tripsCount),
    };
  }
}

export const userService = new UserService();
