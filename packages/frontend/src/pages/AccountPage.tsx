import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { useAuth } from '@/context/AuthContext';
import { getOrders, type Order } from '@/api/orders';
import { requestEmailVerification, setPassword } from '@/api/auth';
import {
  getProfile,
  getAddresses,
  updateProfile,
  createAddress,
  updateAddress,
  deleteAddress,
  type Address,
  type UserProfile,
} from '@/api/user';
import { getOrderStatusMeta, isPastOrderStatus, normalizeOrderStatus } from '@/lib/order-status';
import { TravelTab } from '@/components/account/TravelTab';

type Tab = 'overview' | 'orders' | 'travel' | 'profile';
type PastDateFilter = 'all' | '3m' | '12m';
type PastStatusFilter = 'all' | 'returned' | 'inspecting' | 'completed' | 'cancelled' | 'refunded';

interface AddressFormState {
  label: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  countryCode: string;
  instructions: string;
  isDefault: boolean;
}

type AddressFormErrors = Partial<Record<keyof AddressFormState, string>>;

const ORDERS_PAGE_SIZE = 20;

const PAST_STATUS_FILTERS: Array<{ value: PastStatusFilter; label: string }> = [
  { value: 'all', label: 'All past' },
  { value: 'returned', label: 'Returned' },
  { value: 'inspecting', label: 'Inspecting' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const PAST_DATE_FILTERS: Array<{ value: PastDateFilter; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: '3m', label: 'Last 3 months' },
  { value: '12m', label: 'Last 12 months' },
];

const EMPTY_ADDRESS_FORM: AddressFormState = {
  label: 'Hotel',
  line1: '',
  line2: '',
  city: 'Paris',
  postalCode: '',
  countryCode: 'FR',
  instructions: '',
  isDefault: false,
};

const EMPTY_ADDRESS_ERRORS: AddressFormErrors = {};

function formatDateForApi(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getFromDateForFilter(filter: PastDateFilter): string | undefined {
  if (filter === 'all') return undefined;

  const now = new Date();
  const monthsBack = filter === '3m' ? 3 : 12;
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, now.getUTCDate()),
  );
  return formatDateForApi(target);
}

function getPastOrdersByStatus(orders: Order[], status: PastStatusFilter): Order[] {
  const pastOnly = orders.filter((order) => isPastOrderStatus(order.status));
  if (status === 'all') return pastOnly;

  return pastOnly.filter((order) => normalizeOrderStatus(order.status) === status);
}

function validateAddressForm(form: AddressFormState): AddressFormErrors {
  const errors: AddressFormErrors = {};

  if (form.label.trim().length < 2) {
    errors.label = 'Use at least 2 characters for the label.';
  }

  if (form.line1.trim().length < 5) {
    errors.line1 = 'Enter a complete street address.';
  }

  if (form.city.trim().length < 2) {
    errors.city = 'City must have at least 2 characters.';
  }

  if (!/^[A-Za-z0-9 -]{3,12}$/.test(form.postalCode.trim())) {
    errors.postalCode = 'Postal code should be 3 to 12 letters/numbers.';
  }

  if (!/^[A-Z]{2}$/.test(form.countryCode.trim().toUpperCase())) {
    errors.countryCode = 'Country code must be exactly 2 letters (e.g. FR).';
  }

  if (form.instructions.trim().length > 200) {
    errors.instructions = 'Instructions should stay under 200 characters.';
  }

  return errors;
}

function hasAddressErrors(errors: AddressFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function StatusBadge({ status }: { status: string }) {
  const meta = getOrderStatusMeta(status);
  return (
    <span className={`rounded-full px-3 py-1 font-sans text-[11px] font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function formatOrderRange(order: Order) {
  return `${new Date(order.rentalStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} -> ${new Date(order.rentalEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function orderDurationDays(order: Order): number {
  const diff = new Date(order.rentalEnd).getTime() - new Date(order.rentalStart).getTime();
  return Math.max(1, Math.ceil(diff / 86400000) + 1);
}

function sortAddresses(list: Address[]): Address[] {
  return [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

function OrderRow({ order }: { order: Order }) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex items-center justify-between rounded-xl border border-linen bg-white p-5 transition-all hover:border-sand hover:shadow-lifted"
    >
      <div>
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[0.8px] text-stone">
          Order #{order.orderNumber}
        </p>
        <p className="mt-0.5 font-serif text-[17px] font-semibold text-ink">
          {order.items.length} {order.items.length === 1 ? 'piece' : 'pieces'}
        </p>
        <p className="mt-0.5 font-sans text-[13px] text-stone">{formatOrderRange(order)}</p>
      </div>
      <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
        <StatusBadge status={order.status} />
        <p className="font-sans text-[15px] font-semibold text-ink">
          EUR {order.totalAmount.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}

export function AccountPage() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotalCount, setOrdersTotalCount] = useState(0);
  const [nextOrdersCursor, setNextOrdersCursor] = useState<string | null>(null);
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);

  const [filteredPastOrders, setFilteredPastOrders] = useState<Order[]>([]);
  const [filteredPastTotalCount, setFilteredPastTotalCount] = useState(0);
  const [nextFilteredPastCursor, setNextFilteredPastCursor] = useState<string | null>(null);
  const [loadingFilteredPast, setLoadingFilteredPast] = useState(false);
  const [loadingMoreFilteredPast, setLoadingMoreFilteredPast] = useState(false);
  const [filteredPastError, setFilteredPastError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [pastStatusFilter, setPastStatusFilter] = useState<PastStatusFilter>('all');
  const [pastDateFilter, setPastDateFilter] = useState<PastDateFilter>('all');

  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressEditingId, setAddressEditingId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [addressFormErrors, setAddressFormErrors] =
    useState<AddressFormErrors>(EMPTY_ADDRESS_ERRORS);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressDeletingId, setAddressDeletingId] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAccountData() {
      setLoading(true);
      setError(null);

      const [ordersResult, profileResult, addressesResult] = await Promise.allSettled([
        getOrders({ limit: ORDERS_PAGE_SIZE }),
        getProfile(),
        getAddresses(),
      ]);

      if (!isMounted) return;

      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value.items);
        setOrdersTotalCount(ordersResult.value.totalCount);
        setNextOrdersCursor(ordersResult.value.nextCursor);
      } else {
        setError('Could not load your orders right now.');
      }

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
        setProfileForm({
          firstName: profileResult.value.firstName,
          lastName: profileResult.value.lastName,
          phone: profileResult.value.phone ?? '',
        });
      } else {
        setError((prev) => prev ?? 'Could not load your profile right now.');
      }

      if (addressesResult.status === 'fulfilled') {
        setAddresses(sortAddresses(addressesResult.value));
      }

      setLoading(false);
    }

    void loadAccountData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== 'orders') return;

    let isMounted = true;

    async function loadFilteredPastOrders() {
      setLoadingFilteredPast(true);
      setFilteredPastError(null);

      try {
        const result = await getOrders({
          limit: ORDERS_PAGE_SIZE,
          status: pastStatusFilter === 'all' ? undefined : pastStatusFilter,
          fromDate: getFromDateForFilter(pastDateFilter),
        });

        if (!isMounted) return;

        setFilteredPastOrders(getPastOrdersByStatus(result.items, pastStatusFilter));
        setFilteredPastTotalCount(result.totalCount);
        setNextFilteredPastCursor(result.nextCursor);
      } catch {
        if (!isMounted) return;

        setFilteredPastError('Could not load filtered past orders right now.');
        setFilteredPastOrders([]);
        setFilteredPastTotalCount(0);
        setNextFilteredPastCursor(null);
      } finally {
        if (isMounted) {
          setLoadingFilteredPast(false);
        }
      }
    }

    void loadFilteredPastOrders();

    return () => {
      isMounted = false;
    };
  }, [tab, pastStatusFilter, pastDateFilter]);

  async function reloadAddresses() {
    const latest = await getAddresses();
    setAddresses(sortAddresses(latest));
  }

  function updateAddressFormField<K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) {
    setAddressForm((prev) => ({ ...prev, [key]: value }));
    setAddressFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  async function handleLoadMoreOrders() {
    if (!nextOrdersCursor || loadingMoreOrders) return;

    setLoadingMoreOrders(true);
    try {
      const result = await getOrders({ limit: ORDERS_PAGE_SIZE, cursor: nextOrdersCursor });
      setOrders((prev) => {
        const byId = new Map(prev.map((order) => [order.id, order]));
        for (const order of result.items) byId.set(order.id, order);

        return Array.from(byId.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      });
      setOrdersTotalCount(result.totalCount);
      setNextOrdersCursor(result.nextCursor);
    } finally {
      setLoadingMoreOrders(false);
    }
  }

  async function handleLoadMoreFilteredPastOrders() {
    if (!nextFilteredPastCursor || loadingMoreFilteredPast) return;

    setLoadingMoreFilteredPast(true);
    setFilteredPastError(null);

    try {
      const result = await getOrders({
        limit: ORDERS_PAGE_SIZE,
        cursor: nextFilteredPastCursor,
        status: pastStatusFilter === 'all' ? undefined : pastStatusFilter,
        fromDate: getFromDateForFilter(pastDateFilter),
      });

      setFilteredPastOrders((prev) => {
        const merged = [...prev, ...getPastOrdersByStatus(result.items, pastStatusFilter)];
        const byId = new Map(merged.map((order) => [order.id, order]));
        return Array.from(byId.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      });
      setFilteredPastTotalCount(result.totalCount);
      setNextFilteredPastCursor(result.nextCursor);
    } catch {
      setFilteredPastError('Could not load more past orders right now.');
    } finally {
      setLoadingMoreFilteredPast(false);
    }
  }

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();

    const firstName = profileForm.firstName.trim();
    const lastName = profileForm.lastName.trim();
    const phone = profileForm.phone.trim();

    if (!firstName || !lastName) return;

    setProfileSaving(true);
    try {
      await updateProfile({
        firstName,
        lastName,
        phone: phone || undefined,
      });

      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          firstName,
          lastName,
          phone: phone || null,
        };
      });

      await refreshProfile();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } finally {
      setProfileSaving(false);
    }
  }

  function openCreateAddressForm() {
    setAddressEditingId(null);
    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      isDefault: addresses.length === 0,
    });
    setAddressFormErrors(EMPTY_ADDRESS_ERRORS);
    setAddressError(null);
    setAddressFormOpen(true);
  }

  function openEditAddressForm(address: Address) {
    setAddressEditingId(address.id);
    setAddressForm({
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      postalCode: address.postalCode,
      countryCode: address.countryCode,
      instructions: address.instructions ?? '',
      isDefault: address.isDefault,
    });
    setAddressFormErrors(EMPTY_ADDRESS_ERRORS);
    setAddressError(null);
    setAddressFormOpen(true);
  }

  async function handleAddressSave(e: FormEvent) {
    e.preventDefault();

    const normalizedForm: AddressFormState = {
      ...addressForm,
      label: addressForm.label.trim(),
      line1: addressForm.line1.trim(),
      line2: addressForm.line2.trim(),
      city: addressForm.city.trim(),
      postalCode: addressForm.postalCode.trim(),
      countryCode: addressForm.countryCode.trim().toUpperCase() || 'FR',
      instructions: addressForm.instructions.trim(),
    };

    const validationErrors = validateAddressForm(normalizedForm);
    setAddressFormErrors(validationErrors);
    if (hasAddressErrors(validationErrors)) return;

    const payload = {
      label: normalizedForm.label,
      line1: normalizedForm.line1,
      line2: normalizedForm.line2 || undefined,
      city: normalizedForm.city,
      postalCode: normalizedForm.postalCode,
      countryCode: normalizedForm.countryCode,
      instructions: normalizedForm.instructions || undefined,
      isDefault: addressForm.isDefault,
    };

    setAddressSaving(true);
    setAddressError(null);
    try {
      if (addressEditingId) {
        await updateAddress(addressEditingId, payload);
      } else {
        await createAddress(payload);
      }
      await reloadAddresses();
      setAddressFormOpen(false);
      setAddressEditingId(null);
      setAddressFormErrors(EMPTY_ADDRESS_ERRORS);
    } catch {
      setAddressError('Could not save this address right now.');
    } finally {
      setAddressSaving(false);
    }
  }

  async function handleSetDefaultAddress(addressId: string) {
    setAddressError(null);
    try {
      await updateAddress(addressId, { isDefault: true });
      await reloadAddresses();
    } catch {
      setAddressError('Could not set default address right now.');
    }
  }

  async function handleDeleteAddress(addressId: string) {
    setAddressDeletingId(addressId);
    setAddressError(null);
    try {
      await deleteAddress(addressId);
      await reloadAddresses();

      if (addressEditingId === addressId) {
        setAddressFormOpen(false);
        setAddressEditingId(null);
      }
    } catch {
      setAddressError('Could not delete this address right now.');
    } finally {
      setAddressDeletingId(null);
    }
  }

  const inputClass =
    'h-11 w-full rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15';
  const inputErrorClass = 'border-red-400 focus:border-red-500 focus:ring-red-100';

  function getAddressInputClass(field: keyof AddressFormState): string {
    const hasError = Boolean(addressFormErrors[field]);
    return `h-10 w-full rounded-default border-[1.5px] bg-white px-3 font-sans text-[13px] text-ink outline-none transition-colors ${
      hasError
        ? inputErrorClass
        : 'border-sand focus:border-brand focus:ring-[3px] focus:ring-brand/15'
    }`;
  }

  const activeOrders = useMemo(
    () => orders.filter((order) => !isPastOrderStatus(order.status)),
    [orders],
  );
  const pastOrders = useMemo(
    () => orders.filter((order) => isPastOrderStatus(order.status)),
    [orders],
  );

  // Realized orders = all orders that actually happened (exclude pending, cancelled, refunded)
  const realizedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !['pending_payment', 'cancelled', 'refunded'].includes(
            normalizeOrderStatus(order.status),
          ),
      ),
    [orders],
  );

  const totalSpent = useMemo(
    () => realizedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    [realizedOrders],
  );
  const totalPiecesRented = useMemo(
    () => realizedOrders.reduce((sum, order) => sum + order.items.length, 0),
    [realizedOrders],
  );
  const totalRentalDays = useMemo(
    () => realizedOrders.reduce((sum, order) => sum + orderDurationDays(order), 0),
    [realizedOrders],
  );

  const returnedOrCompletedCount = useMemo(
    () =>
      realizedOrders.filter((order) =>
        ['returned', 'completed'].includes(normalizeOrderStatus(order.status)),
      ).length,
    [realizedOrders],
  );

  const completionRate =
    realizedOrders.length > 0
      ? Math.round((returnedOrCompletedCount / realizedOrders.length) * 100)
      : 0;
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

  const upcomingOrder = useMemo(() => {
    if (activeOrders.length === 0) return null;
    return [...activeOrders].sort(
      (a, b) => new Date(a.rentalStart).getTime() - new Date(b.rentalStart).getTime(),
    )[0];
  }, [activeOrders]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        <div className="border-b border-linen bg-ivory">
          <Container className="py-8 pt-12">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-sans text-[12px] uppercase tracking-[1px] text-stone">
                  My Account
                </p>
                <h1 className="mt-1 font-serif text-[clamp(24px,3.5vw,36px)] font-semibold text-ink">
                  {profile
                    ? `${profile.firstName} ${profile.lastName}`
                    : `Welcome, ${user?.firstName ?? ''}`}
                </h1>
                <p className="mt-1 font-sans text-[14px] text-stone">
                  {profile?.email ?? user?.email}
                </p>
                {profile?.createdAt && (
                  <p className="mt-1 font-sans text-[12px] text-stone">
                    Member since{' '}
                    {new Date(profile.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="cursor-pointer font-sans text-[13px] font-medium text-stone underline underline-offset-2 transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </div>

            <div className="mt-6 flex gap-0 border-b border-linen">
              {(
                [
                  { key: 'overview', label: 'Overview' },
                  { key: 'orders', label: `Orders (${ordersTotalCount || orders.length})` },
                  { key: 'travel', label: 'Travel' },
                  { key: 'profile', label: 'Profile' },
                ] as { key: Tab; label: string }[]
              ).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`relative cursor-pointer px-5 py-3 font-sans text-[13px] font-medium transition-colors ${
                    tab === item.key ? 'text-ink' : 'text-stone hover:text-charcoal'
                  }`}
                >
                  {item.label}
                  {tab === item.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
                  )}
                </button>
              ))}
            </div>
          </Container>
        </div>

        <Container className="py-8 lg:py-10">
          {profile && profile.emailVerified === false && <EmailVerifyBanner />}
          {(profile?.isGuest || user?.isGuest) && <GuestBanner />}
          {loading && (
            <div className="py-12 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-linen border-t-brand" />
            </div>
          )}

          {!loading && error && (
            <div className="mb-6 rounded-default bg-red-50 px-4 py-3 font-sans text-[13px] text-red-700">
              {error}
            </div>
          )}

          {!loading && tab === 'overview' && (
            <div className="space-y-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-linen bg-white p-4">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Active orders
                  </p>
                  <p className="mt-1 font-serif text-[28px] font-semibold text-ink">
                    {activeOrders.length}
                  </p>
                </div>
                <div className="rounded-xl border border-linen bg-white p-4">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Past orders
                  </p>
                  <p className="mt-1 font-serif text-[28px] font-semibold text-ink">
                    {pastOrders.length}
                  </p>
                </div>
                <div className="rounded-xl border border-linen bg-white p-4">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Total spent
                  </p>
                  <p className="mt-1 font-serif text-[28px] font-semibold text-ink">
                    EUR {totalSpent.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-linen bg-white p-4">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Completion rate
                  </p>
                  <p className="mt-1 font-serif text-[28px] font-semibold text-ink">
                    {completionRate}%
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-linen bg-white p-5">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Pieces rented
                  </p>
                  <p className="mt-1 font-serif text-[26px] font-semibold text-ink">
                    {totalPiecesRented}
                  </p>
                </div>
                <div className="rounded-xl border border-linen bg-white p-5">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Total rental days
                  </p>
                  <p className="mt-1 font-serif text-[26px] font-semibold text-ink">
                    {totalRentalDays}
                  </p>
                </div>
                <div className="rounded-xl border border-linen bg-white p-5">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                    Upcoming pickup
                  </p>
                  {upcomingOrder ? (
                    <>
                      <p className="mt-1 font-serif text-[26px] font-semibold text-ink">
                        {new Date(upcomingOrder.rentalStart).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                      <p className="font-sans text-[12px] text-stone">
                        Order #{upcomingOrder.orderNumber}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 font-sans text-[13px] text-stone">No upcoming pickup</p>
                  )}
                </div>
              </div>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-serif text-[22px] font-semibold text-ink">Current orders</h2>
                  <button
                    onClick={() => setTab('orders')}
                    className="cursor-pointer font-sans text-[12px] font-semibold text-brand underline underline-offset-2"
                  >
                    View all
                  </button>
                </div>

                {activeOrders.length === 0 ? (
                  <div className="rounded-xl border border-linen bg-white p-6 text-center">
                    <p className="font-serif text-[20px] font-semibold text-ink">
                      No active orders
                    </p>
                    <p className="mt-1 font-sans text-[14px] text-stone">
                      Your next reservation will appear here.
                    </p>
                    <Link
                      to="/collection"
                      className="mt-4 inline-block rounded-default bg-brand px-6 py-2.5 font-sans text-[13px] font-semibold text-ivory transition-all hover:bg-brand/90"
                    >
                      Browse the Collection
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeOrders.slice(0, 4).map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="mb-3 font-serif text-[22px] font-semibold text-ink">Past orders</h2>
                {pastOrders.length === 0 ? (
                  <div className="rounded-xl border border-linen bg-white p-6 text-center">
                    <p className="font-sans text-[14px] text-stone">
                      Your completed and returned rentals will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastOrders.slice(0, 4).map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </section>

              <div className="rounded-xl border border-linen bg-white p-5">
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Default delivery address
                </p>
                {defaultAddress ? (
                  <>
                    <p className="mt-1 font-sans text-[14px] font-semibold text-ink">
                      {defaultAddress.label}
                    </p>
                    <p className="font-sans text-[13px] text-stone">{defaultAddress.line1}</p>
                    <p className="font-sans text-[13px] text-stone">
                      {defaultAddress.postalCode} {defaultAddress.city}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 font-sans text-[13px] text-stone">No saved address yet.</p>
                )}
              </div>
            </div>
          )}

          {!loading && tab === 'orders' && (
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 font-serif text-[22px] font-semibold text-ink">
                  Current & upcoming
                </h2>
                {activeOrders.length === 0 ? (
                  <div className="rounded-xl border border-linen bg-white p-6 text-center">
                    <p className="font-sans text-[14px] text-stone">No current orders right now.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeOrders.map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <h2 className="font-serif text-[22px] font-semibold text-ink">Past orders</h2>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {PAST_STATUS_FILTERS.map((option) => {
                        const isActive = pastStatusFilter === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => setPastStatusFilter(option.value)}
                            className={`cursor-pointer rounded-full border px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
                              isActive
                                ? 'border-ink bg-ink text-ivory'
                                : 'border-sand bg-white text-charcoal hover:border-charcoal'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PAST_DATE_FILTERS.map((option) => {
                        const isActive = pastDateFilter === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => setPastDateFilter(option.value)}
                            className={`cursor-pointer rounded-full border px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
                              isActive
                                ? 'border-brand bg-brand/10 text-brand'
                                : 'border-sand bg-white text-charcoal hover:border-charcoal'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {filteredPastError && (
                  <p className="mb-3 rounded-default bg-red-50 px-4 py-2.5 font-sans text-[13px] text-red-700">
                    {filteredPastError}
                  </p>
                )}

                {!filteredPastError && (
                  <p className="mb-3 font-sans text-[12px] text-stone">
                    Loaded {filteredPastOrders.length} past{' '}
                    {filteredPastOrders.length === 1 ? 'order' : 'orders'}
                    {pastStatusFilter !== 'all' ? ` (filtered from ${filteredPastTotalCount})` : ''}
                  </p>
                )}

                {loadingFilteredPast ? (
                  <div className="rounded-xl border border-linen bg-white p-6 text-center">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-linen border-t-brand" />
                  </div>
                ) : filteredPastOrders.length === 0 ? (
                  <div className="rounded-xl border border-linen bg-white p-6 text-center">
                    <p className="font-sans text-[14px] text-stone">
                      No past orders match your filters.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {filteredPastOrders.map((order) => (
                        <OrderRow key={order.id} order={order} />
                      ))}
                    </div>

                    {nextFilteredPastCursor && (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={handleLoadMoreFilteredPastOrders}
                          disabled={loadingMoreFilteredPast}
                          className="cursor-pointer rounded-default border-[1.5px] border-sand px-4 py-2 font-sans text-[13px] font-medium text-charcoal transition-colors hover:bg-pearl disabled:opacity-60"
                        >
                          {loadingMoreFilteredPast
                            ? 'Loading more...'
                            : 'Load more filtered orders'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {nextOrdersCursor && (
                <div className="flex justify-center">
                  <button
                    onClick={handleLoadMoreOrders}
                    disabled={loadingMoreOrders}
                    className="cursor-pointer rounded-default border-[1.5px] border-sand px-4 py-2 font-sans text-[13px] font-medium text-charcoal transition-colors hover:bg-pearl disabled:opacity-60"
                  >
                    {loadingMoreOrders ? 'Loading more...' : 'Load more orders'}
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && tab === 'travel' && <TravelTab />}

          {!loading && tab === 'profile' && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="max-w-xl">
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                        First name
                      </label>
                      <input
                        value={profileForm.firstName}
                        onChange={(e) =>
                          setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))
                        }
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                        Last name
                      </label>
                      <input
                        value={profileForm.lastName}
                        onChange={(e) =>
                          setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))
                        }
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                      Email
                    </label>
                    <input
                      value={profile?.email ?? user?.email ?? ''}
                      disabled
                      className={`${inputClass} cursor-not-allowed bg-pearl text-stone`}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                      Phone (optional)
                    </label>
                    <input
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className={inputClass}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="cursor-pointer rounded-default bg-brand px-6 py-2.5 font-sans text-[13px] font-semibold text-ivory transition-all hover:bg-brand/90 disabled:opacity-60"
                    >
                      {profileSaving ? 'Saving...' : 'Save changes'}
                    </button>
                    {profileSaved && <p className="font-sans text-[13px] text-brand">Saved!</p>}
                  </div>
                </form>
              </div>

              <aside>
                <div className="rounded-xl border border-linen bg-white p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-[20px] font-semibold text-ink">
                      Delivery addresses
                    </h3>
                    <button
                      onClick={openCreateAddressForm}
                      className="cursor-pointer font-sans text-[12px] font-semibold text-brand underline underline-offset-2"
                    >
                      + Add
                    </button>
                  </div>

                  {addressError && (
                    <p className="mt-3 rounded-default bg-red-50 px-3 py-2 font-sans text-[12px] text-red-700">
                      {addressError}
                    </p>
                  )}

                  {addresses.length === 0 ? (
                    <p className="mt-3 font-sans text-[13px] text-stone">
                      No saved addresses yet. Add one now for faster checkout.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {addresses.map((address) => (
                        <div key={address.id} className="rounded-default border border-linen p-3">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="font-sans text-[13px] font-semibold text-ink">
                              {address.label}
                            </p>
                            {address.isDefault && (
                              <span className="rounded-full bg-brand/10 px-2 py-0.5 font-sans text-[10px] font-semibold text-brand">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="font-sans text-[12px] text-stone">
                            {address.line1}
                            {address.line2 ? `, ${address.line2}` : ''}
                          </p>
                          <p className="font-sans text-[12px] text-stone">
                            {address.postalCode} {address.city}, {address.countryCode}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-3">
                            {!address.isDefault && (
                              <button
                                onClick={() => {
                                  void handleSetDefaultAddress(address.id);
                                }}
                                className="cursor-pointer font-sans text-[11px] font-medium text-brand underline underline-offset-2"
                              >
                                Make default
                              </button>
                            )}
                            <button
                              onClick={() => openEditAddressForm(address)}
                              className="cursor-pointer font-sans text-[11px] font-medium text-stone underline underline-offset-2 hover:text-ink"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                void handleDeleteAddress(address.id);
                              }}
                              disabled={addressDeletingId === address.id}
                              className="cursor-pointer font-sans text-[11px] font-medium text-red-700 underline underline-offset-2 disabled:opacity-60"
                            >
                              {addressDeletingId === address.id ? 'Removing...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {addressFormOpen && (
                    <form
                      onSubmit={handleAddressSave}
                      className="mt-5 space-y-3 border-t border-linen pt-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone">
                          {addressEditingId ? 'Edit address' : 'New address'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressFormOpen(false);
                            setAddressEditingId(null);
                          }}
                          className="cursor-pointer font-sans text-[11px] font-medium text-stone underline underline-offset-2"
                        >
                          Close
                        </button>
                      </div>

                      <div>
                        <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
                          Label
                        </label>
                        <input
                          value={addressForm.label}
                          onChange={(e) => updateAddressFormField('label', e.target.value)}
                          required
                          className={getAddressInputClass('label')}
                          placeholder="Hotel, Airbnb..."
                        />
                        {addressFormErrors.label && (
                          <p className="mt-1 font-sans text-[11px] text-red-700">
                            {addressFormErrors.label}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
                          Address line 1
                        </label>
                        <input
                          value={addressForm.line1}
                          onChange={(e) => updateAddressFormField('line1', e.target.value)}
                          required
                          className={getAddressInputClass('line1')}
                          placeholder="15 Rue de Rivoli"
                        />
                        {addressFormErrors.line1 && (
                          <p className="mt-1 font-sans text-[11px] text-red-700">
                            {addressFormErrors.line1}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
                            City
                          </label>
                          <input
                            value={addressForm.city}
                            onChange={(e) => updateAddressFormField('city', e.target.value)}
                            required
                            className={getAddressInputClass('city')}
                          />
                          {addressFormErrors.city && (
                            <p className="mt-1 font-sans text-[11px] text-red-700">
                              {addressFormErrors.city}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
                            Postal code
                          </label>
                          <input
                            value={addressForm.postalCode}
                            onChange={(e) => updateAddressFormField('postalCode', e.target.value)}
                            required
                            className={getAddressInputClass('postalCode')}
                            placeholder="75001"
                          />
                          {addressFormErrors.postalCode && (
                            <p className="mt-1 font-sans text-[11px] text-red-700">
                              {addressFormErrors.postalCode}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
                            Line 2 (optional)
                          </label>
                          <input
                            value={addressForm.line2}
                            onChange={(e) => updateAddressFormField('line2', e.target.value)}
                            className={getAddressInputClass('line2')}
                            placeholder="Room 204"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
                            Country code
                          </label>
                          <input
                            value={addressForm.countryCode}
                            onChange={(e) =>
                              updateAddressFormField('countryCode', e.target.value.toUpperCase())
                            }
                            className={getAddressInputClass('countryCode')}
                            placeholder="FR"
                            maxLength={2}
                          />
                          {addressFormErrors.countryCode && (
                            <p className="mt-1 font-sans text-[11px] text-red-700">
                              {addressFormErrors.countryCode}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
                          Instructions (optional)
                        </label>
                        <textarea
                          value={addressForm.instructions}
                          onChange={(e) => updateAddressFormField('instructions', e.target.value)}
                          rows={2}
                          className={`w-full resize-none rounded-default border-[1.5px] bg-white px-3 py-2 font-sans text-[13px] text-ink outline-none transition-colors ${
                            addressFormErrors.instructions
                              ? inputErrorClass
                              : 'border-sand focus:border-brand focus:ring-[3px] focus:ring-brand/15'
                          }`}
                          placeholder="Ring at reception..."
                        />
                        {addressFormErrors.instructions && (
                          <p className="mt-1 font-sans text-[11px] text-red-700">
                            {addressFormErrors.instructions}
                          </p>
                        )}
                      </div>

                      <label className="flex items-center gap-2 font-sans text-[12px] text-charcoal">
                        <input
                          type="checkbox"
                          checked={addressForm.isDefault}
                          onChange={(e) => updateAddressFormField('isDefault', e.target.checked)}
                          className="h-4 w-4 rounded border-sand text-brand focus:ring-brand/20"
                        />
                        Set as default address
                      </label>

                      <button
                        type="submit"
                        disabled={addressSaving}
                        className="cursor-pointer rounded-default bg-brand px-4 py-2 font-sans text-[13px] font-semibold text-ivory transition-all hover:bg-brand/90 disabled:opacity-60"
                      >
                        {addressSaving
                          ? 'Saving...'
                          : addressEditingId
                            ? 'Save address'
                            : 'Add address'}
                      </button>
                    </form>
                  )}
                </div>
              </aside>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

function EmailVerifyBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  async function handleResend() {
    setSending(true);
    setError(false);
    try {
      await requestEmailVerification();
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-default border border-amber-200 bg-amber-50 px-4 py-3">
      <div>
        <p className="font-sans text-[13px] font-semibold text-amber-900">
          Please verify your email address
        </p>
        <p className="mt-0.5 font-sans text-[12px] text-amber-800">
          {sent
            ? 'We just sent a new link — check your inbox.'
            : error
              ? "Couldn't send right now. Please try again in a moment."
              : 'Confirm your email to unlock order notifications and password reset.'}
        </p>
      </div>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending}
          className="h-9 cursor-pointer rounded-default bg-amber-900 px-4 font-sans text-[12px] font-semibold text-ivory transition-all hover:bg-amber-900/90 disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  );
}

function GuestBanner() {
  const [showForm, setShowForm] = useState(false);
  const [password, setPasswordValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await setPassword(password);
      setDone(true);
    } catch {
      setError('Could not set your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mb-6 rounded-default border border-brand/20 bg-brand/5 px-4 py-3">
        <p className="font-sans text-[13px] font-semibold text-brand">
          Password set! Your account is now fully secure.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-default border border-linen bg-white px-4 py-3">
      {!showForm ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-sans text-[13px] font-semibold text-ink">Complete your account</p>
            <p className="mt-0.5 font-sans text-[12px] text-stone">
              You checked out as a guest. Set a password so you can log back in from any device.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="h-9 cursor-pointer rounded-default bg-brand px-4 font-sans text-[12px] font-semibold text-ivory transition-all hover:bg-brand/90"
          >
            Set password
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="font-sans text-[13px] font-semibold text-ink">Create a password</p>
            <p className="font-sans text-[12px] text-stone">Min. 8 characters</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-10 w-full rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[14px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
          {error && (
            <p className="rounded-default bg-red-50 px-3 py-2 font-sans text-[12px] text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="h-9 cursor-pointer rounded-default bg-brand px-4 font-sans text-[12px] font-semibold text-ivory transition-all hover:bg-brand/90 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save password'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="h-9 cursor-pointer font-sans text-[12px] font-medium text-stone underline underline-offset-2 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
