import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Container } from '@/components/layout/Container';
import {
  getDashboard,
  getAdminOrders,
  getAdminDeliveries,
  getInventory,
  transitionOrderStatus,
  markCleaned,
  markDonated,
  getAdminCustomers,
  getAdminCustomer,
  getAdminCapsules,
  createCapsule,
  updateCapsule,
  deactivateCapsule,
  type DashboardStats,
  type UpcomingDelivery,
  type AdminProduct,
  type AdminCustomer,
  type AdminCustomerDetail,
  type AdminCapsule,
  type CapsuleInput,
  type PaginatedAdmin,
} from '@/api/admin';
import { getOrderStatusMeta } from '@/lib/order-status';
import type { Order } from '@/api/orders';
import { ProductFormDrawer } from '@/components/admin/ProductFormDrawer';
import { UnitsDrawer } from '@/components/admin/UnitsDrawer';

type AdminTab = 'dashboard' | 'orders' | 'inventory' | 'capsules' | 'customers' | 'deliveries';

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: ['active_rental'],
  active_rental: ['return_initiated'],
  return_initiated: ['return_in_transit'],
  return_in_transit: ['returned'],
  returned: ['inspecting'],
  inspecting: ['completed'],
  completed: [],
  cancelled: [],
  refunded: [],
  pending_payment: ['cancelled'],
};

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-linen bg-white p-5">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
        {label}
      </p>
      <p className="mt-1 font-serif text-[28px] font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 font-sans text-[12px] text-stone">{sub}</p>}
    </div>
  );
}

function DashboardSection() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="py-12 text-center">
        <Spinner />
      </div>
    );
  if (!stats) return <p className="text-stone">Could not load dashboard.</p>;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Active rentals" value={stats.activeRentals} />
        <KPI label="Pending orders" value={stats.pendingOrders} sub="Awaiting preparation" />
        <KPI label="Revenue (total)" value={`€${(stats.totalRevenueCents / 100).toFixed(0)}`} />
        <KPI
          label="Inventory"
          value={stats.inventory.available}
          sub={`of ${stats.inventory.total} · ${stats.inventory.donated} donated`}
        />
      </div>

      <section>
        <h2 className="mb-3 font-serif text-[22px] font-semibold text-ink">Upcoming deliveries</h2>
        <DeliveryTable deliveries={stats.upcomingDeliveries} />
      </section>
    </div>
  );
}

function Spinner() {
  return (
    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-linen border-t-brand" />
  );
}

function DeliveryTable({ deliveries }: { deliveries: UpcomingDelivery[] }) {
  if (deliveries.length === 0) {
    return (
      <div className="rounded-xl border border-linen bg-white p-6 text-center">
        <p className="font-sans text-[14px] text-stone">No upcoming deliveries.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-linen bg-white">
      <table className="w-full font-sans text-[13px]">
        <thead className="border-b border-linen bg-pearl/40 text-left text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
          <tr>
            <th className="px-4 py-3">Scheduled</th>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id} className="border-b border-linen last:border-0">
              <td className="px-4 py-3 text-charcoal">
                {new Date(d.scheduledAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </td>
              <td className="px-4 py-3 font-semibold text-ink">#{d.orderNumber}</td>
              <td className="px-4 py-3 text-charcoal">{d.customerName}</td>
              <td className="px-4 py-3 text-charcoal">{d.city}</td>
              <td className="px-4 py-3 text-charcoal">
                {d.direction} · {d.type}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-pearl px-2.5 py-0.5 text-[11px] font-semibold text-charcoal">
                  {d.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersSection() {
  const [page, setPage] = useState<PaginatedAdmin<Order> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await getAdminOrders({
        status: statusFilter || undefined,
        limit: 30,
      });
      setPage(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleTransition(newStatus: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await transitionOrderStatus(selected.id, newStatus);
      setSelected(updated);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const statuses = [
    '',
    'pending_payment',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'active_rental',
    'return_initiated',
    'returned',
    'inspecting',
    'completed',
    'cancelled',
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
              statusFilter === s
                ? 'border-ink bg-ink text-ivory'
                : 'border-sand bg-white text-charcoal hover:border-charcoal'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Spinner />
        </div>
      ) : !page || page.items.length === 0 ? (
        <div className="rounded-xl border border-linen bg-white p-6 text-center">
          <p className="font-sans text-[14px] text-stone">No orders match this filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-linen bg-white">
          <table className="w-full font-sans text-[13px]">
            <thead className="border-b border-linen bg-pearl/40 text-left text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Rental</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((order) => {
                const meta = getOrderStatusMeta(order.status);
                return (
                  <tr key={order.id} className="border-b border-linen last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">#{order.orderNumber}</td>
                    <td className="px-4 py-3 text-charcoal">
                      {new Date(order.rentalStart).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      →{' '}
                      {new Date(order.rentalEnd).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 text-charcoal">{order.items.length}</td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      €{order.totalAmount.toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(order)}
                        className="cursor-pointer font-sans text-[12px] font-semibold text-brand underline underline-offset-2"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Drawer onClose={() => setSelected(null)} title={`Order #${selected.orderNumber}`}>
          <p className="font-sans text-[12px] text-stone">
            {new Date(selected.rentalStart).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {' → '}
            {new Date(selected.rentalEnd).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <div className="mt-4">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
              Current status
            </p>
            <p className="mt-1 font-serif text-[20px] font-semibold text-ink">
              {getOrderStatusMeta(selected.status).label}
            </p>
          </div>

          <div className="mt-6">
            <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
              Transitions
            </p>
            <div className="flex flex-wrap gap-2">
              {(ORDER_STATUS_TRANSITIONS[selected.status] ?? []).map((next) => (
                <button
                  key={next}
                  disabled={busy}
                  onClick={() => handleTransition(next)}
                  className="cursor-pointer rounded-default bg-brand px-4 py-2 font-sans text-[13px] font-semibold text-ivory transition-colors hover:bg-brand/90 disabled:opacity-60"
                >
                  → {next.replace(/_/g, ' ')}
                </button>
              ))}
              {(ORDER_STATUS_TRANSITIONS[selected.status] ?? []).length === 0 && (
                <p className="font-sans text-[13px] text-stone">No transitions available.</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
              Items ({selected.items.length})
            </p>
            <ul className="space-y-2">
              {selected.items.map((it) => (
                <li
                  key={it.productId}
                  className="flex items-center justify-between font-sans text-[13px]"
                >
                  <span className="text-charcoal">
                    {it.productName} <span className="text-stone">— {it.brand}</span>
                  </span>
                  <span className="font-semibold text-ink">€{it.subtotal.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function InventorySection() {
  const [page, setPage] = useState<PaginatedAdmin<AdminProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewingUnits, setViewingUnits] = useState<AdminProduct | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await getInventory({
        status: statusFilter || undefined,
        limit: 50,
      });
      setPage(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleClean(id: string) {
    await markCleaned(id);
    await load();
  }

  async function handleDonate(id: string) {
    if (!confirm('Mark this product as donated? It will no longer be rentable.')) return;
    await markDonated(id);
    await load();
  }

  const statuses = [
    '',
    'available',
    'reserved',
    'rented',
    'in_cleaning',
    'in_inspection',
    'retired',
    'donated',
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
                statusFilter === s
                  ? 'border-ink bg-ink text-ivory'
                  : 'border-sand bg-white text-charcoal hover:border-charcoal'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="cursor-pointer rounded-default bg-brand px-4 py-2 font-sans text-[13px] font-semibold text-ivory hover:bg-brand/90"
        >
          + Add garment
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Spinner />
        </div>
      ) : !page || page.items.length === 0 ? (
        <div className="rounded-xl border border-linen bg-white p-6 text-center">
          <p className="font-sans text-[14px] text-stone">No products match this filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-linen bg-white">
          <table className="w-full font-sans text-[13px]">
            <thead className="border-b border-linen bg-pearl/40 text-left text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cycles</th>
                <th className="px-4 py-3">Price/day</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((p) => (
                <tr key={p.id} className="border-b border-linen last:border-0">
                  <td className="px-4 py-3 font-mono text-[12px] text-stone">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{p.nameEn}</td>
                  <td className="px-4 py-3 text-charcoal">{p.brand}</td>
                  <td className="px-4 py-3 text-charcoal">{p.sizeEu}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-pearl px-2.5 py-0.5 text-[11px] font-semibold text-charcoal">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-charcoal">
                    {p.cycleCount}/{p.maxCycles}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">€{p.rentalPricePerDay}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setViewingUnits(p)}
                        className="cursor-pointer font-sans text-[12px] font-semibold text-brand underline underline-offset-2"
                      >
                        Units
                      </button>
                      <button
                        onClick={() => setEditing(p)}
                        className="cursor-pointer font-sans text-[12px] font-semibold text-charcoal underline underline-offset-2"
                      >
                        Edit
                      </button>
                      {p.status === 'in_cleaning' && (
                        <button
                          onClick={() => handleClean(p.id)}
                          className="cursor-pointer font-sans text-[12px] font-semibold text-charcoal underline underline-offset-2"
                        >
                          Mark cleaned
                        </button>
                      )}
                      {p.status === 'retired' && (
                        <button
                          onClick={() => handleDonate(p.id)}
                          className="cursor-pointer font-sans text-[12px] font-semibold text-red-700 underline underline-offset-2"
                        >
                          Donate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <ProductFormDrawer
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void load();
          }}
        />
      )}

      {viewingUnits && (
        <UnitsDrawer
          product={viewingUnits}
          onClose={() => {
            setViewingUnits(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function DeliveriesSection() {
  const [items, setItems] = useState<UpcomingDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDeliveries(50)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="py-12 text-center">
        <Spinner />
      </div>
    );
  return <DeliveryTable deliveries={items} />;
}

function CapsulesSection() {
  const [capsules, setCapsules] = useState<AdminCapsule[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; nameEn: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminCapsule | 'new' | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [caps, cats] = await Promise.all([getAdminCapsules(), fetchCategoriesRaw()]);
      setCapsules(caps);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this capsule? It will no longer appear to customers.')) return;
    await deactivateCapsule(id);
    await load();
  }

  if (loading)
    return (
      <div className="py-12 text-center">
        <Spinner />
      </div>
    );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="font-sans text-[13px] text-stone">
          {capsules.length} capsule{capsules.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => setEditing('new')}
          className="h-9 cursor-pointer rounded-default bg-brand px-4 font-sans text-[13px] font-semibold text-ivory transition-all hover:bg-brand/90"
        >
          + New capsule
        </button>
      </div>

      {capsules.length === 0 ? (
        <div className="rounded-default border border-linen bg-white px-4 py-12 text-center font-sans text-[14px] text-stone">
          No capsules yet. Create the first pre-built wardrobe.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {capsules.map((c) => (
            <div
              key={c.id}
              className={`rounded-default border border-linen bg-white p-4 transition-colors ${
                c.isActive ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-serif text-[18px] font-semibold text-ink">{c.nameEn}</p>
                  <p className="mt-0.5 font-sans text-[12px] text-stone">{c.slug}</p>
                </div>
                {!c.isActive && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                    Inactive
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 font-sans text-[11px] text-charcoal">
                <span className="rounded-full bg-ivory px-2 py-0.5 capitalize">
                  {c.categoryType}
                </span>
                <span className="rounded-full bg-ivory px-2 py-0.5 capitalize">
                  {c.season.replace('_', ' ')}
                </span>
                <span className="rounded-full bg-ivory px-2 py-0.5 capitalize">{c.gender}</span>
              </div>
              <p className="mt-3 font-sans text-[13px] text-charcoal">
                {c.items.length} item{c.items.length === 1 ? '' : 's'} · €
                {Number(c.basePrice).toFixed(2)} base
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setEditing(c)}
                  className="h-8 cursor-pointer rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[12px] font-semibold text-ink transition-colors hover:bg-ivory"
                >
                  Edit
                </button>
                {c.isActive && (
                  <button
                    onClick={() => handleDeactivate(c.id)}
                    className="h-8 cursor-pointer rounded-default font-sans text-[12px] font-medium text-stone underline underline-offset-2 hover:text-ink"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <CapsuleFormDrawer
          capsule={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

async function fetchCategoriesRaw(): Promise<Array<{ id: string; nameEn: string }>> {
  const { getCategories } = await import('@/api/catalog');
  const cats = await getCategories('en');
  return cats.map((c) => ({ id: c.id, nameEn: c.name }));
}

const CAPSULE_CATEGORY_TYPES = ['beach', 'business', 'city', 'winter', 'wedding', 'casual'];
const CAPSULE_SEASONS = ['spring_summer', 'fall_winter', 'all_season'];
const CAPSULE_GENDERS = ['men', 'women', 'unisex'];

function CapsuleFormDrawer({
  capsule,
  categories,
  onClose,
  onSaved,
}: {
  capsule: AdminCapsule | null;
  categories: Array<{ id: string; nameEn: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = capsule === null;
  const [form, setForm] = useState<CapsuleInput>(() => ({
    slug: capsule?.slug ?? '',
    nameEn: capsule?.nameEn ?? '',
    nameFr: capsule?.nameFr ?? '',
    nameEs: capsule?.nameEs ?? '',
    descriptionEn: capsule?.descriptionEn ?? '',
    descriptionFr: capsule?.descriptionFr ?? '',
    descriptionEs: capsule?.descriptionEs ?? '',
    categoryType: capsule?.categoryType ?? 'city',
    season: capsule?.season ?? 'all_season',
    gender: capsule?.gender ?? 'unisex',
    basePrice: capsule ? Number(capsule.basePrice) : 0,
    imageUrl: capsule?.imageUrl ?? '',
    isActive: capsule?.isActive ?? true,
    items:
      capsule?.items.map((i) => ({
        categoryId: i.categoryId,
        quantity: i.quantity,
        isRequired: i.isRequired,
      })) ?? [],
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof CapsuleInput>(key: K, value: CapsuleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addItem() {
    const firstUnused = categories.find((c) => !form.items.some((i) => i.categoryId === c.id));
    if (!firstUnused) return;
    update('items', [...form.items, { categoryId: firstUnused.id, quantity: 1, isRequired: true }]);
  }

  function updateItem(idx: number, patch: Partial<CapsuleInput['items'][number]>) {
    update(
      'items',
      form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }

  function removeItem(idx: number) {
    update(
      'items',
      form.items.filter((_, i) => i !== idx),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.items.length === 0) {
      setError('A capsule needs at least one item.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setError('Slug must be lowercase letters, digits and dashes only.');
      return;
    }
    setSaving(true);
    try {
      const payload: CapsuleInput = {
        ...form,
        imageUrl: form.imageUrl?.trim() || null,
      };
      if (isNew) {
        await createCapsule(payload);
      } else {
        await updateCapsule(capsule!.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer onClose={onClose} title={isNew ? 'New capsule' : `Edit · ${capsule!.nameEn}`}>
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-[13px]">
        <Field label="Slug" hint="URL identifier · lowercase, dashes">
          <input
            value={form.slug}
            onChange={(e) => update('slug', e.target.value)}
            required
            placeholder="city-business-week"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Name · EN">
            <input
              value={form.nameEn}
              onChange={(e) => update('nameEn', e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Name · FR">
            <input
              value={form.nameFr}
              onChange={(e) => update('nameFr', e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Name · ES">
            <input
              value={form.nameEs}
              onChange={(e) => update('nameEs', e.target.value)}
              required
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Description · EN">
          <textarea
            value={form.descriptionEn}
            onChange={(e) => update('descriptionEn', e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Description · FR">
            <textarea
              value={form.descriptionFr}
              onChange={(e) => update('descriptionFr', e.target.value)}
              rows={2}
              className={inputCls}
            />
          </Field>
          <Field label="Description · ES">
            <textarea
              value={form.descriptionEs}
              onChange={(e) => update('descriptionEs', e.target.value)}
              rows={2}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Type">
            <select
              value={form.categoryType}
              onChange={(e) => update('categoryType', e.target.value)}
              className={inputCls}
            >
              {CAPSULE_CATEGORY_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Season">
            <select
              value={form.season}
              onChange={(e) => update('season', e.target.value)}
              className={inputCls}
            >
              {CAPSULE_SEASONS.map((v) => (
                <option key={v} value={v}>
                  {v.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
              className={inputCls}
            >
              {CAPSULE_GENDERS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Base price (€)">
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.basePrice}
              onChange={(e) => update('basePrice', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Image URL (optional)">
            <input
              value={form.imageUrl ?? ''}
              onChange={(e) => update('imageUrl', e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">Items</p>
            <button
              type="button"
              onClick={addItem}
              disabled={form.items.length >= categories.length}
              className="cursor-pointer text-[12px] font-semibold text-brand underline underline-offset-2 disabled:opacity-40"
            >
              + Add item
            </button>
          </div>
          {form.items.length === 0 ? (
            <p className="text-stone">No items yet.</p>
          ) : (
            <ul className="space-y-2">
              {form.items.map((it, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 rounded-default border border-linen p-2"
                >
                  <select
                    value={it.categoryId}
                    onChange={(e) => updateItem(idx, { categoryId: e.target.value })}
                    className={`${inputCls} flex-1`}
                  >
                    {categories.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={form.items.some(
                          (other, i) => i !== idx && other.categoryId === c.id,
                        )}
                      >
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })
                    }
                    className={`${inputCls} w-20`}
                  />
                  <label className="flex items-center gap-1 text-[12px] text-charcoal">
                    <input
                      type="checkbox"
                      checked={it.isRequired}
                      onChange={(e) => updateItem(idx, { isRequired: e.target.checked })}
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="cursor-pointer text-[12px] text-stone underline underline-offset-2 hover:text-ink"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isNew && (
          <label className="flex items-center gap-2 text-charcoal">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => update('isActive', e.target.checked)}
            />
            Active
          </label>
        )}

        {error && (
          <p className="rounded-default bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
        )}

        <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-linen bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 cursor-pointer rounded-default border-[1.5px] border-sand bg-white font-semibold text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 flex-1 cursor-pointer rounded-default bg-brand font-semibold text-ivory transition-all hover:bg-brand/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isNew ? 'Create capsule' : 'Save changes'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

const inputCls =
  'h-9 w-full rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[13px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
          {label}
        </label>
        {hint && <span className="text-[11px] text-stone">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CustomersSection() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [viewing, setViewing] = useState<AdminCustomerDetail | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    getAdminCustomers({ q: debouncedQuery, limit: 25 })
      .then((res) => {
        setCustomers(res.items);
        setTotal(res.totalCount);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  async function openCustomer(id: string) {
    setViewingLoading(true);
    try {
      const detail = await getAdminCustomer(id);
      setViewing(detail);
    } finally {
      setViewingLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-[360px]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name…"
            className="h-10 w-full rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[14px] text-ink outline-none transition-colors placeholder:text-ash focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
        <p className="font-sans text-[13px] text-stone">{total} customers</p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Spinner />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-default border border-linen bg-white px-4 py-12 text-center font-sans text-[14px] text-stone">
          No customers match that search.
        </div>
      ) : (
        <div className="overflow-hidden rounded-default border border-linen bg-white">
          <table className="w-full border-collapse font-sans text-[13px]">
            <thead className="bg-ivory">
              <tr className="text-left text-[11px] uppercase tracking-[0.9px] text-stone">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3 font-semibold">Total spent</th>
                <th className="px-4 py-3 font-semibold">Last order</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openCustomer(c.id)}
                  className="cursor-pointer border-t border-linen transition-colors hover:bg-ivory"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-charcoal">{c.email}</td>
                  <td className="px-4 py-3 text-charcoal">{c.orderCount}</td>
                  <td className="px-4 py-3 text-charcoal">
                    €{(c.totalSpentCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-stone">
                    {c.lastOrderAt
                      ? new Date(c.lastOrderAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.isGuest ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        Guest
                      </span>
                    ) : c.emailVerified ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                        Verified
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                        Unverified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(viewing || viewingLoading) && (
        <Drawer
          onClose={() => setViewing(null)}
          title={viewing ? `${viewing.firstName} ${viewing.lastName}` : 'Loading…'}
        >
          {viewingLoading || !viewing ? (
            <div className="py-12 text-center">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-6 font-sans text-[13px]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.9px] text-stone">Contact</p>
                <p className="mt-1 text-ink">{viewing.email}</p>
                {viewing.phone && <p className="text-charcoal">{viewing.phone}</p>}
                <p className="mt-1 text-[12px] text-stone">
                  Joined{' '}
                  {new Date(viewing.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-default border border-linen bg-ivory p-3">
                  <p className="text-[11px] uppercase tracking-[0.9px] text-stone">Total orders</p>
                  <p className="mt-1 font-serif text-[22px] font-semibold text-ink">
                    {viewing.totalOrders}
                  </p>
                </div>
                <div className="rounded-default border border-linen bg-ivory p-3">
                  <p className="text-[11px] uppercase tracking-[0.9px] text-stone">
                    Lifetime spend
                  </p>
                  <p className="mt-1 font-serif text-[22px] font-semibold text-ink">
                    €{(viewing.totalSpentCents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
              {viewing.addresses.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.9px] text-stone">Addresses</p>
                  <ul className="mt-2 space-y-2">
                    {viewing.addresses.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-default border border-linen p-2.5 text-charcoal"
                      >
                        <p className="font-semibold text-ink">{a.label}</p>
                        <p>
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ''}
                        </p>
                        <p>
                          {a.postalCode} {a.city}
                          {a.countryCode ? `, ${a.countryCode}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-[0.9px] text-stone">Recent orders</p>
                {viewing.recentOrders.length === 0 ? (
                  <p className="mt-2 text-stone">No orders yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {viewing.recentOrders.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between rounded-default border border-linen p-2.5"
                      >
                        <div>
                          <p className="font-medium text-ink">
                            {getOrderStatusMeta(o.status).label}
                          </p>
                          <p className="text-[12px] text-stone">
                            {new Date(o.rentalStart).toLocaleDateString('en-GB')} –{' '}
                            {new Date(o.rentalEnd).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <p className="font-semibold text-ink">
                          €{(o.totalAmountCents / 100).toFixed(2)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Drawer>
      )}
    </div>
  );
}

function Drawer({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-[90%] max-w-[480px] flex-col bg-white shadow-floating">
        <div className="flex items-start justify-between border-b border-linen p-5">
          <h3 className="font-serif text-[22px] font-semibold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="cursor-pointer font-sans text-[13px] font-medium text-stone underline underline-offset-2"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('dashboard');

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'orders', label: 'Orders' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'capsules', label: 'Capsules' },
    { key: 'customers', label: 'Customers' },
    { key: 'deliveries', label: 'Deliveries' },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        <div className="border-b border-linen bg-ivory">
          <Container className="py-8 pt-12">
            <p className="font-sans text-[12px] uppercase tracking-[1px] text-stone">Admin</p>
            <h1 className="mt-1 font-serif text-[clamp(24px,3.5vw,36px)] font-semibold text-ink">
              Operations
            </h1>

            <div className="mt-6 flex gap-0 border-b border-linen">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative cursor-pointer px-5 py-3 font-sans text-[13px] font-medium transition-colors ${
                    tab === t.key ? 'text-ink' : 'text-stone hover:text-charcoal'
                  }`}
                >
                  {t.label}
                  {tab === t.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
                  )}
                </button>
              ))}
            </div>
          </Container>
        </div>

        <Container className="py-8 lg:py-10">
          {tab === 'dashboard' && <DashboardSection />}
          {tab === 'orders' && <OrdersSection />}
          {tab === 'inventory' && <InventorySection />}
          {tab === 'capsules' && <CapsulesSection />}
          {tab === 'customers' && <CustomersSection />}
          {tab === 'deliveries' && <DeliveriesSection />}
        </Container>
      </main>
    </>
  );
}
