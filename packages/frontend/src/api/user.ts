import { fetchApi } from './client';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  locale: string;
  emailVerified?: boolean;
  isGuest?: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  countryCode: string;
  instructions: string | null;
  isDefault: boolean;
}

export interface CreateAddressData {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  countryCode?: string;
  instructions?: string;
  isDefault?: boolean;
}

export type UpdateAddressData = Partial<CreateAddressData>;

export function getProfile(): Promise<UserProfile> {
  return fetchApi('/users/me');
}

export function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<Partial<UserProfile>> {
  return fetchApi('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
}

export function getAddresses(): Promise<Address[]> {
  return fetchApi('/users/me/addresses');
}

export function createAddress(data: CreateAddressData): Promise<Address> {
  return fetchApi('/users/me/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAddress(id: string, data: UpdateAddressData): Promise<Address> {
  return fetchApi(`/users/me/addresses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

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

export function getTravelLog(): Promise<TravelLog> {
  return fetchApi('/users/me/travel-log');
}

export function deleteAddress(id: string): Promise<void> {
  return fetchApi(`/users/me/addresses/${id}`, {
    method: 'DELETE',
  });
}
