import { useEffect, useState } from 'react';
import {
  listProductUnits,
  addProductUnits,
  cleanUnit,
  retireUnit,
  donateUnit,
  type InventoryUnit,
  type AdminProduct,
} from '@/api/admin';

interface Props {
  product: AdminProduct;
  onClose: () => void;
}

const UNIT_STATUS_COLORS: Record<string, string> = {
  available: 'bg-brand/10 text-brand',
  reserved: 'bg-amber-100 text-amber-700',
  rented: 'bg-blue-100 text-blue-700',
  in_cleaning: 'bg-purple-100 text-purple-700',
  in_inspection: 'bg-purple-100 text-purple-700',
  retired: 'bg-stone-200 text-stone-700',
  donated: 'bg-stone-200 text-stone-700',
};

export function UnitsDrawer({ product, onClose }: Props) {
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCity, setAddCity] = useState('paris');
  const [addQty, setAddQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setUnits(await listProductUnits(product.id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  async function handleAdd() {
    setBusy(true);
    setError(null);
    try {
      await addProductUnits(product.id, { city: addCity, quantity: addQty });
      setAddQty(1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add units.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnitAction(unitId: string, action: 'clean' | 'retire' | 'donate') {
    setBusy(true);
    setError(null);
    try {
      if (action === 'clean') await cleanUnit(unitId);
      else if (action === 'retire') await retireUnit(unitId);
      else await donateUnit(unitId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action}.`);
    } finally {
      setBusy(false);
    }
  }

  // Group by city
  const byCity = units.reduce<Record<string, InventoryUnit[]>>((acc, u) => {
    (acc[u.city] ??= []).push(u);
    return acc;
  }, {});

  const totalAvailable = units.filter((u) => u.status === 'available').length;
  const totalNonRetired = units.filter(
    (u) => u.status !== 'retired' && u.status !== 'donated',
  ).length;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-[95%] max-w-[640px] flex-col bg-white shadow-floating">
        <div className="flex items-start justify-between border-b border-linen p-5">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.9px] text-stone">
              Inventory units
            </p>
            <h3 className="mt-1 font-serif text-[22px] font-semibold text-ink">{product.nameEn}</h3>
            <p className="mt-0.5 font-sans text-[12px] text-stone">
              {product.sku} · {totalAvailable} available of {totalNonRetired} active units
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer font-sans text-[13px] font-medium text-stone underline underline-offset-2"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Add units */}
          <section className="border-b border-linen bg-pearl/40 p-5">
            <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
              Restock
            </p>
            <div className="flex items-end gap-3">
              <div>
                <label className="block font-sans text-[11px] text-stone">City</label>
                <select
                  value={addCity}
                  onChange={(e) => setAddCity(e.target.value)}
                  className="mt-1 h-10 rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[13px] text-ink outline-none focus:border-brand"
                >
                  <option value="paris">Paris</option>
                  <option value="nice">Nice</option>
                  <option value="lyon">Lyon</option>
                </select>
              </div>
              <div>
                <label className="block font-sans text-[11px] text-stone">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={addQty}
                  onChange={(e) => setAddQty(Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="mt-1 h-10 w-24 rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[13px] text-ink outline-none focus:border-brand"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={busy}
                className="h-10 cursor-pointer rounded-default bg-brand px-4 font-sans text-[13px] font-semibold text-ivory transition-colors hover:bg-brand/90 disabled:opacity-60"
              >
                + Add {addQty} unit{addQty > 1 ? 's' : ''}
              </button>
            </div>
          </section>

          {error && (
            <p className="mx-5 mt-4 rounded-default bg-red-50 px-3 py-2 font-sans text-[13px] text-red-700">
              {error}
            </p>
          )}

          {/* Units by city */}
          <section className="p-5">
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-linen border-t-brand" />
              </div>
            ) : Object.keys(byCity).length === 0 ? (
              <p className="text-center font-sans text-[13px] text-stone">
                No units yet. Add some above to make this product rentable.
              </p>
            ) : (
              Object.entries(byCity).map(([city, list]) => (
                <div key={city} className="mb-6">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h4 className="font-serif text-[17px] font-semibold capitalize text-ink">
                      {city}
                    </h4>
                    <span className="font-sans text-[12px] text-stone">{list.length} unit(s)</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-linen">
                    <table className="w-full font-sans text-[12px]">
                      <thead className="border-b border-linen bg-pearl/40 text-left text-[10px] font-semibold uppercase tracking-[0.9px] text-stone">
                        <tr>
                          <th className="px-3 py-2">Unit ID</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Condition</th>
                          <th className="px-3 py-2">Cycles</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((u) => (
                          <tr key={u.id} className="border-b border-linen last:border-0">
                            <td className="px-3 py-2 font-mono text-[11px] text-stone">
                              {u.id.slice(0, 8)}…
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${UNIT_STATUS_COLORS[u.status] ?? 'bg-pearl text-charcoal'}`}
                              >
                                {u.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 capitalize text-charcoal">{u.condition}</td>
                            <td className="px-3 py-2 text-charcoal">
                              {u.cycleCount}/{product.maxCycles}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-2">
                                {(u.status === 'in_inspection' || u.status === 'in_cleaning') && (
                                  <button
                                    onClick={() => handleUnitAction(u.id, 'clean')}
                                    disabled={busy}
                                    className="cursor-pointer font-sans text-[11px] font-semibold text-brand underline underline-offset-2 disabled:opacity-60"
                                  >
                                    Mark cleaned
                                  </button>
                                )}
                                {u.status === 'available' && (
                                  <button
                                    onClick={() => handleUnitAction(u.id, 'retire')}
                                    disabled={busy}
                                    className="cursor-pointer font-sans text-[11px] font-semibold text-stone underline underline-offset-2 disabled:opacity-60"
                                  >
                                    Retire
                                  </button>
                                )}
                                {u.status === 'retired' && (
                                  <button
                                    onClick={() => handleUnitAction(u.id, 'donate')}
                                    disabled={busy}
                                    className="cursor-pointer font-sans text-[11px] font-semibold text-red-700 underline underline-offset-2 disabled:opacity-60"
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
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
