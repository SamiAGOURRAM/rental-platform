import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Container } from '@/components/layout/Container';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { getAddresses, createAddress, type Address } from '@/api/user';
import { createOrder, type DeliveryMethod } from '@/api/orders';
import { createCheckoutSession } from '@/api/payments';
import { getAppConfig, type DeliveryMethodConfig } from '@/api/config';
import { ApiError } from '@/api/client';
import { AuthGateway } from '@/components/auth/AuthGateway';

// ─── Gradient ─────────────────────────────────────────────────────────────────
const gradients = [
  'from-[#e8f0ed] to-[#f5f0e3]',
  'from-[#f5f0e3] to-[#e7e5e4]',
  'from-[#e7e5e4] to-[#f5f5f4]',
  'from-[#d6d3d1] to-[#e8f0ed]',
];
function itemGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return gradients[Math.abs(h) % gradients.length]!;
}

// ─── Step header ──────────────────────────────────────────────────────────────
function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8 border-b border-linen last:border-b-0">
      <div className="flex items-center gap-3 mb-6">
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full font-sans text-[12px] font-bold',
            done ? 'bg-brand/20 text-brand' : 'bg-brand text-ivory',
          )}
        >
          {done ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4l3 3 5-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            n
          )}
        </span>
        <h2 className="font-serif text-[22px] font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ─── Delivery options ─────────────────────────────────────────────────────────
const DEFAULT_DELIVERY_OPTIONS: DeliveryMethodConfig[] = [
  {
    value: 'personal',
    labelKey: 'delivery.method.personal.label',
    descriptionKey: 'delivery.method.personal.description',
    outboundFee: 0,
    returnFee: 0,
    totalFee: 0,
  },
  {
    value: 'mondial_relay',
    labelKey: 'delivery.method.mondialRelay.label',
    descriptionKey: 'delivery.method.mondialRelay.description',
    outboundFee: 4.5,
    returnFee: 4.5,
    totalFee: 9.0,
  },
  {
    value: 'chronopost',
    labelKey: 'delivery.method.chronopost.label',
    descriptionKey: 'delivery.method.chronopost.description',
    outboundFee: 9.9,
    returnFee: 9.9,
    totalFee: 19.8,
  },
  {
    value: 'colissimo',
    labelKey: 'delivery.method.colissimo.label',
    descriptionKey: 'delivery.method.colissimo.description',
    outboundFee: 7.0,
    returnFee: 7.0,
    totalFee: 14.0,
  },
];

function formatDeliveryLabel(key: string): string {
  const labels: Record<string, string> = {
    'delivery.method.personal.label': 'Personal Handoff',
    'delivery.method.personal.description': 'We bring it to your hotel in Paris',
    'delivery.method.mondialRelay.label': 'Mondial Relay',
    'delivery.method.mondialRelay.description': 'Pick up at a relay point near you',
    'delivery.method.chronopost.label': 'Chronopost Express',
    'delivery.method.chronopost.description': 'Next-day delivery to your address',
    'delivery.method.colissimo.label': 'Colissimo',
    'delivery.method.colissimo.description': 'Standard 2–3 day delivery',
  };
  return labels[key] ?? key;
}

// ─── Address types ────────────────────────────────────────────────────────────
interface AddressInput {
  label: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  countryCode: string;
  instructions: string;
}

const emptyAddress: AddressInput = {
  label: 'Hotel',
  line1: '',
  line2: '',
  city: 'Paris',
  postalCode: '',
  countryCode: 'FR',
  instructions: '',
};

interface GuestContactInput {
  email: string;
  firstName: string;
  lastName: string;
}

const emptyGuestContact: GuestContactInput = {
  email: '',
  firstName: '',
  lastName: '',
};

function ContactForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: GuestContactInput;
  submitLabel: string;
  onSubmit: (data: GuestContactInput) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<GuestContactInput>(initial ?? emptyGuestContact);
  const set = (k: keyof GuestContactInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const inputClass =
    'h-10 w-full rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[14px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-3 rounded-xl border border-linen bg-pearl p-5"
    >
      <div>
        <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
          Email
        </label>
        <input
          value={form.email}
          onChange={set('email')}
          required
          type="email"
          autoComplete="email"
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
            First name
          </label>
          <input
            value={form.firstName}
            onChange={set('firstName')}
            required
            autoComplete="given-name"
            className={inputClass}
            placeholder="Florence"
          />
        </div>
        <div>
          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
            Last name
          </label>
          <input
            value={form.lastName}
            onChange={set('lastName')}
            required
            autoComplete="family-name"
            className={inputClass}
            placeholder="Baron"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="cursor-pointer rounded-default bg-brand px-5 py-2 font-sans text-[13px] font-semibold text-ivory transition-all hover:bg-brand/90"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer font-sans text-[13px] font-medium text-stone underline underline-offset-2 hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ContactPill({ contact, onEdit }: { contact: GuestContactInput; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-brand/25 bg-brand/5 p-4">
      <div>
        <p className="font-sans text-[13px] font-semibold text-brand">
          {contact.firstName} {contact.lastName}
        </p>
        <p className="font-sans text-[13px] text-charcoal">{contact.email}</p>
      </div>
      <button
        onClick={onEdit}
        className="cursor-pointer font-sans text-[12px] font-semibold text-brand underline underline-offset-2 hover:text-brand/70 shrink-0 ml-4"
      >
        Edit
      </button>
    </div>
  );
}

// ─── Inline address form ──────────────────────────────────────────────────────
function AddressForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: AddressInput;
  submitLabel: string;
  onSubmit: (data: AddressInput) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<AddressInput>(initial ?? emptyAddress);
  const set =
    (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const inputClass =
    'h-10 w-full rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[14px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-3 rounded-xl border border-linen bg-pearl p-5"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
            Label
          </label>
          <input
            value={form.label}
            onChange={set('label')}
            required
            className={inputClass}
            placeholder="Hotel, Airbnb…"
          />
        </div>
        <div>
          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
            City
          </label>
          <input value={form.city} onChange={set('city')} required className={inputClass} />
        </div>
      </div>
      <div>
        <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
          Address line 1
        </label>
        <input
          value={form.line1}
          onChange={set('line1')}
          required
          className={inputClass}
          placeholder="15 Rue de Rivoli"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
            Line 2 (optional)
          </label>
          <input
            value={form.line2}
            onChange={set('line2')}
            className={inputClass}
            placeholder="Room 204"
          />
        </div>
        <div>
          <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
            Postal code
          </label>
          <input
            value={form.postalCode}
            onChange={set('postalCode')}
            required
            className={inputClass}
            placeholder="75001"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone">
          Delivery instructions (optional)
        </label>
        <textarea
          value={form.instructions}
          onChange={set('instructions')}
          rows={2}
          className="w-full rounded-default border-[1.5px] border-sand bg-white px-3 py-2 font-sans text-[14px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15 resize-none"
          placeholder="Ring the bell at reception…"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="cursor-pointer rounded-default bg-brand px-5 py-2 font-sans text-[13px] font-semibold text-ivory transition-all hover:bg-brand/90"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer font-sans text-[13px] font-medium text-stone underline underline-offset-2 hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Confirmed address pill ───────────────────────────────────────────────────
function AddressPill({ address, onEdit }: { address: AddressInput; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-brand/25 bg-brand/5 p-4">
      <div>
        <p className="font-sans text-[13px] font-semibold text-brand">{address.label}</p>
        <p className="font-sans text-[13px] text-charcoal">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}, {address.postalCode} {address.city}
        </p>
        {address.instructions && (
          <p className="mt-0.5 font-sans text-[12px] text-stone italic">"{address.instructions}"</p>
        )}
      </div>
      <button
        onClick={onEdit}
        className="cursor-pointer font-sans text-[12px] font-semibold text-brand underline underline-offset-2 hover:text-brand/70 shrink-0 ml-4"
      >
        Edit
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CheckoutPage() {
  const { items, totalPerDay, clearCart } = useCart();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const today = new Date().toISOString().split('T')[0]!;
  const [rentalStart, setRentalStart] = useState(searchParams.get('start') ?? '');
  const [rentalEnd, setRentalEnd] = useState(searchParams.get('end') ?? '');
  const [delivery, setDelivery] = useState<DeliveryMethod>('personal');
  const [deliveryMethods, setDeliveryMethods] =
    useState<DeliveryMethodConfig[]>(DEFAULT_DELIVERY_OPTIONS);

  // Load config on mount
  useEffect(() => {
    getAppConfig()
      .then((config) => {
        if (config.deliveryMethods?.length > 0) {
          setDeliveryMethods(config.deliveryMethods);
        }
      })
      .catch((err) => {
        console.error('[Checkout] Failed to load app config:', err);
        // Keep default delivery methods as fallback
      });
  }, []);

  // Logged-in: saved addresses from API
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // Guest: address collected in state, created after auth
  const [guestContact, setGuestContact] = useState<GuestContactInput | null>(null);
  const [editingGuestContact, setEditingGuestContact] = useState(false);
  const [guestAddress, setGuestAddress] = useState<AddressInput | null>(null);
  const [editingGuest, setEditingGuest] = useState(false);

  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved addresses when user is authenticated
  useEffect(() => {
    if (!user) return;
    getAddresses()
      .then((addrs) => {
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) ?? addrs[0];
        if (def && !selectedAddressId) setSelectedAddressId(def.id);
      })
      .catch((err) => {
        console.error('[Checkout] Failed to load addresses:', err);
        setError('Could not load your saved addresses. Please add a new one.');
      });
  }, [user]);

  // After auth completes, trigger the pending checkout
  useEffect(() => {
    if (user && pendingSubmit) {
      setPendingSubmit(false);
      void proceedWithCheckout();
    }
  }, [user, pendingSubmit]);

  // ── Calculations ─────────────────────────────────────────────────────────
  const days =
    rentalStart && rentalEnd
      ? Math.max(
          1,
          Math.ceil((new Date(rentalEnd).getTime() - new Date(rentalStart).getTime()) / 86400000) +
            1,
        )
      : null;
  const subtotal = days ? days * totalPerDay : null;
  const deliveryCost = deliveryMethods.find((m) => m.value === delivery)?.totalFee ?? 0;
  const total = subtotal ? subtotal + deliveryCost : null;

  const contactReady = user ? true : !!guestContact;
  const addressReady = user ? !!selectedAddressId : !!guestAddress;
  const datesReady = !!rentalStart && !!rentalEnd;
  const canSubmit = datesReady && contactReady && addressReady && items.length > 0 && !submitting;

  // ── Checkout logic ────────────────────────────────────────────────────────
  async function proceedWithCheckout() {
    setError(null);
    setSubmitting(true);
    try {
      let addressId = selectedAddressId;

      // Guest flow: create address now that we're authenticated
      if (!addressId && guestAddress) {
        const saved = await createAddress({ ...guestAddress, isDefault: true });
        addressId = saved.id;
        setSelectedAddressId(saved.id);
        setSavedAddresses([saved]);
      }

      if (!addressId) {
        setError('Please add a delivery address.');
        setSubmitting(false);
        return;
      }

      const order = await createOrder({
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity, city: i.city })),
        rentalStart,
        rentalEnd,
        deliveryMethod: delivery,
        addressId,
      });

      // Cart is now committed to an order — clear it before redirect
      clearCart();

      const origin = window.location.origin;
      const session = await createCheckoutSession(
        order.id,
        `${origin}/orders/${order.id}?payment=success`,
        `${origin}/checkout`,
      );

      window.location.href = session.url;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'PRODUCT_UNAVAILABLE')
          setError('Some items are no longer available for those dates.');
        else if (err.code === 'INVALID_DATE_RANGE' || err.code === 'MIN_RENTAL_DAYS')
          setError(err.message);
        else setError('Could not complete your reservation. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  }

  function handlePayClick() {
    if (!canSubmit) return;
    if (!user) {
      setGatewayOpen(true);
      return;
    }
    void proceedWithCheckout();
  }

  // ── Saved-address save handler (logged-in users adding a new address) ─────
  async function handleSaveNewAddress(data: AddressInput) {
    try {
      const addr = await createAddress({ ...data, isDefault: savedAddresses.length === 0 });
      setSavedAddresses((p) => [...p, addr]);
      setSelectedAddressId(addr.id);
      setShowNewAddressForm(false);
    } catch {
      // silently ignore — user can retry
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ivory gap-4">
        <p className="font-serif text-2xl text-ink">Your capsule is empty</p>
        <Link to="/collection" className="font-sans text-sm text-brand underline">
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        {/* Page header */}
        <div className="border-b border-linen">
          <Container className="py-8 pt-12">
            <nav className="mb-3 flex items-center gap-1.5 font-sans text-[12px] text-stone">
              <Link to="/capsule" className="hover:text-ink">
                My Capsule
              </Link>
              <span className="text-sand">/</span>
              <span className="text-ink">Checkout</span>
            </nav>
            <h1 className="font-serif text-[clamp(28px,4vw,38px)] font-semibold text-ink">
              Checkout
            </h1>
            <p className="mt-1 font-sans text-[14px] text-stone">
              {user ? (
                <>
                  Reserving as{' '}
                  <span className="font-medium text-ink">
                    {user.firstName} {user.lastName}
                  </span>
                </>
              ) : (
                'Fill in contact and delivery details first, then confirm as guest or create your account.'
              )}
            </p>
          </Container>
        </div>

        <Container className="py-8 lg:py-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
            {/* ── Left: steps ─────────────────────────────────────────────── */}
            <div>
              {/* Step 1: Items */}
              <Step n={1} title="Your items" done={items.length > 0}>
                <div className="divide-y divide-linen rounded-xl border border-linen bg-white">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4">
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className={`h-full w-full bg-gradient-to-br ${itemGradient(item.id)}`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-[11px] uppercase tracking-wider text-stone">
                          {item.category}
                        </p>
                        <p className="font-serif text-[16px] font-semibold text-ink truncate">
                          {item.name}
                        </p>
                        <p className="font-sans text-[13px] text-stone">{item.brand}</p>
                      </div>
                      <p className="font-sans text-[14px] font-semibold text-ink shrink-0">
                        €{item.pricePerDay}/day
                      </p>
                    </div>
                  ))}
                </div>
              </Step>

              {/* Step 2: Rental dates */}
              <Step n={2} title="Rental dates" done={datesReady}>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
                      Pick-up
                    </label>
                    <input
                      type="date"
                      value={rentalStart}
                      min={today}
                      onChange={(e) => setRentalStart(e.target.value)}
                      className="h-11 rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
                      Return
                    </label>
                    <input
                      type="date"
                      value={rentalEnd}
                      min={rentalStart || today}
                      onChange={(e) => setRentalEnd(e.target.value)}
                      className="h-11 rounded-default border-[1.5px] border-sand bg-white px-4 font-sans text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15"
                    />
                  </div>
                  {days && (
                    <p className="self-end pb-2.5 font-sans text-sm font-semibold text-brand">
                      {days} day{days > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </Step>

              {/* Step 3: Contact details */}
              <Step n={3} title="Contact details" done={contactReady}>
                {user && (
                  <div className="rounded-xl border border-brand/25 bg-brand/5 p-4">
                    <p className="font-sans text-[13px] font-semibold text-brand">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="font-sans text-[13px] text-charcoal">{user.email}</p>
                  </div>
                )}

                {!user && (
                  <>
                    {guestContact && !editingGuestContact ? (
                      <ContactPill
                        contact={guestContact}
                        onEdit={() => setEditingGuestContact(true)}
                      />
                    ) : (
                      <ContactForm
                        initial={guestContact ?? undefined}
                        submitLabel="Confirm contact"
                        onSubmit={(data) => {
                          setGuestContact(data);
                          setEditingGuestContact(false);
                        }}
                        onCancel={guestContact ? () => setEditingGuestContact(false) : undefined}
                      />
                    )}
                  </>
                )}
              </Step>

              {/* Step 4: Delivery method */}
              <Step n={4} title="Delivery method" done>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {deliveryMethods.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDelivery(opt.value)}
                      className={cn(
                        'cursor-pointer rounded-xl border-[1.5px] p-4 text-left transition-all duration-200',
                        delivery === opt.value
                          ? 'border-brand bg-brand/5'
                          : 'border-sand bg-white hover:border-ash',
                      )}
                    >
                      <p
                        className={cn(
                          'font-sans text-[14px] font-semibold',
                          delivery === opt.value ? 'text-brand' : 'text-ink',
                        )}
                      >
                        {formatDeliveryLabel(opt.labelKey)}
                      </p>
                      <p className="mt-0.5 font-sans text-[12px] text-stone">
                        {formatDeliveryLabel(opt.descriptionKey)}
                      </p>
                      <p
                        className={cn(
                          'mt-2 font-sans text-[13px] font-semibold',
                          delivery === opt.value ? 'text-brand' : 'text-charcoal',
                        )}
                      >
                        {opt.totalFee === 0 ? 'Free' : `€${opt.totalFee.toFixed(2)}`}
                      </p>
                    </button>
                  ))}
                </div>
              </Step>

              {/* Step 5: Delivery address */}
              <Step n={5} title="Delivery address" done={addressReady}>
                {/* ── Logged-in: saved addresses ── */}
                {user && (
                  <>
                    {savedAddresses.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {savedAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={cn(
                              'w-full cursor-pointer rounded-xl border-[1.5px] p-4 text-left transition-all',
                              selectedAddressId === addr.id
                                ? 'border-brand bg-brand/5'
                                : 'border-sand bg-white hover:border-ash',
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p
                                  className={cn(
                                    'font-sans text-[14px] font-semibold',
                                    selectedAddressId === addr.id ? 'text-brand' : 'text-ink',
                                  )}
                                >
                                  {addr.label}
                                </p>
                                <p className="font-sans text-[13px] text-stone">
                                  {addr.line1}
                                  {addr.line2 ? `, ${addr.line2}` : ''}
                                </p>
                                <p className="font-sans text-[13px] text-stone">
                                  {addr.postalCode} {addr.city}
                                </p>
                              </div>
                              {selectedAddressId === addr.id && (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="mt-0.5 shrink-0 text-brand"
                                >
                                  <circle
                                    cx="8"
                                    cy="8"
                                    r="7"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  />
                                  <circle cx="8" cy="8" r="3" fill="currentColor" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                        {!showNewAddressForm && (
                          <button
                            onClick={() => setShowNewAddressForm(true)}
                            className="cursor-pointer font-sans text-[13px] font-semibold text-brand underline underline-offset-2"
                          >
                            + Add another address
                          </button>
                        )}
                      </div>
                    )}
                    {(showNewAddressForm || savedAddresses.length === 0) && (
                      <AddressForm
                        submitLabel="Save address"
                        onSubmit={handleSaveNewAddress}
                        onCancel={
                          savedAddresses.length > 0 ? () => setShowNewAddressForm(false) : undefined
                        }
                      />
                    )}
                  </>
                )}

                {/* ── Guest: collect address in state, submit at end ── */}
                {!user && (
                  <>
                    {guestAddress && !editingGuest ? (
                      <AddressPill address={guestAddress} onEdit={() => setEditingGuest(true)} />
                    ) : (
                      <AddressForm
                        initial={guestAddress ?? undefined}
                        submitLabel="Confirm address"
                        onSubmit={(data) => {
                          setGuestAddress(data);
                          setEditingGuest(false);
                        }}
                        onCancel={guestAddress ? () => setEditingGuest(false) : undefined}
                      />
                    )}
                  </>
                )}
              </Step>
            </div>

            {/* ── Right: order summary (sticky) ───────────────────────────── */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-linen bg-white p-6 shadow-lifted">
                <h3 className="font-serif text-xl font-semibold text-ink">Order Summary</h3>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between font-sans text-[13px]">
                    <span className="text-stone">
                      {items.length} {items.length === 1 ? 'piece' : 'pieces'}
                    </span>
                    <span className="font-medium text-charcoal">
                      €{totalPerDay.toFixed(2)} / day
                    </span>
                  </div>
                  {days && (
                    <div className="flex justify-between font-sans text-[13px]">
                      <span className="text-stone">
                        {days} day{days > 1 ? 's' : ''} × €{totalPerDay.toFixed(2)}
                      </span>
                      <span className="font-medium text-charcoal">
                        €{(days * totalPerDay).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between font-sans text-[13px]">
                    <span className="text-stone">Delivery &amp; return</span>
                    <span
                      className={cn(
                        'font-medium',
                        deliveryCost === 0 ? 'text-brand' : 'text-charcoal',
                      )}
                    >
                      {deliveryCost === 0 ? 'Free' : `€${deliveryCost.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-sans text-[13px]">
                    <span className="text-stone">Insurance</span>
                    <span className="font-medium text-brand">Included</span>
                  </div>
                </div>

                {total && (
                  <div className="mt-4 flex justify-between border-t border-linen pt-4 font-sans">
                    <span className="text-[14px] font-semibold text-ink">Total</span>
                    <span className="text-[22px] font-semibold text-ink">€{total.toFixed(2)}</span>
                  </div>
                )}

                {/* Checklist */}
                <div className="mt-4 space-y-1.5 border-t border-linen pt-4">
                  {[
                    { label: 'Items selected', done: items.length > 0 },
                    { label: 'Rental dates', done: datesReady },
                    { label: 'Contact details', done: contactReady },
                    { label: 'Delivery method', done: true },
                    { label: 'Delivery address', done: addressReady },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-2 font-sans text-[12px]">
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold shrink-0',
                          done ? 'bg-brand/20 text-brand' : 'bg-linen text-sand',
                        )}
                      >
                        {done ? '✓' : '·'}
                      </span>
                      <span className={done ? 'text-charcoal' : 'text-stone'}>{label}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="mt-4 rounded-default bg-red-50 px-4 py-3 font-sans text-[13px] text-red-700">
                    {error}
                  </p>
                )}

                <button
                  onClick={handlePayClick}
                  disabled={!canSubmit}
                  className={cn(
                    'mt-5 h-12 w-full cursor-pointer rounded-default font-sans text-[14px] font-semibold text-ivory transition-all duration-200',
                    canSubmit
                      ? 'bg-brand hover:bg-brand/90 active:scale-[0.98]'
                      : 'bg-ash cursor-not-allowed',
                  )}
                >
                  {submitting
                    ? 'Processing…'
                    : total
                      ? `Pay €${total.toFixed(2)} with Stripe`
                      : 'Complete all steps to pay'}
                </button>

                {!user && canSubmit && (
                  <p className="mt-2.5 text-center font-sans text-[11px] text-stone">
                    Next step: confirm email as guest or create an account.
                  </p>
                )}
                {user && (
                  <p className="mt-2.5 text-center font-sans text-[11px] text-stone">
                    Secured by Stripe · No payment until confirmed
                  </p>
                )}
              </div>
            </div>
          </div>
        </Container>
      </main>

      {/* Auth gateway — fires only on "Pay" when not authenticated */}
      <AuthGateway
        isOpen={gatewayOpen}
        onClose={() => setGatewayOpen(false)}
        intent="checkout"
        prefill={guestContact ?? undefined}
        onSuccess={() => {
          setGatewayOpen(false);
          setPendingSubmit(true);
        }}
      />
    </>
  );
}
