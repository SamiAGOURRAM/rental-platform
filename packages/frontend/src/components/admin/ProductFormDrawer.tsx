import { useEffect, useState, type FormEvent } from 'react';
import {
  createProduct,
  updateProduct,
  addProductImage,
  addProductUnits,
  uploadImage,
  type AdminProduct,
  type CreateProductData,
} from '@/api/admin';
import { getCategories, type Category } from '@/api/catalog';
import { toast } from '@/lib/toast';

interface Props {
  initial?: AdminProduct | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: CreateProductData = {
  categoryId: '',
  sku: '',
  nameEn: '',
  nameFr: '',
  nameEs: '',
  descriptionEn: '',
  descriptionFr: '',
  descriptionEs: '',
  brand: '',
  sizeEu: 'M',
  color: '',
  weightGrams: 300,
  gender: 'unisex',
  season: 'all_season',
  maxCycles: 30,
  purchasePrice: 50,
  rentalPricePerDay: 5,
  source: 'wholesale',
  material: '',
  condition: 'new',
  city: 'paris',
};

export function ProductFormDrawer({ initial, onClose, onSaved }: Props) {
  const isEdit = !!initial;
  const [form, setForm] = useState<CreateProductData>(() => {
    if (!initial) return EMPTY;
    return {
      categoryId: initial.categoryId,
      sku: initial.sku,
      nameEn: initial.nameEn,
      nameFr: initial.nameFr,
      nameEs: initial.nameEs,
      descriptionEn: '',
      descriptionFr: '',
      descriptionEs: '',
      brand: initial.brand,
      sizeEu: initial.sizeEu,
      color: initial.color,
      weightGrams: initial.weightGrams,
      gender: initial.gender as CreateProductData['gender'],
      season: initial.season as CreateProductData['season'],
      maxCycles: initial.maxCycles,
      purchasePrice: initial.purchasePrice,
      rentalPricePerDay: initial.rentalPricePerDay,
      source: initial.source as CreateProductData['source'],
      material: '',
      condition: initial.condition as CreateProductData['condition'],
      city: initial.city,
    };
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [addingImage, setAddingImage] = useState(false);
  // Initial stock distribution — only used on create
  const [initialStock, setInitialStock] = useState<Record<string, number>>({
    paris: 1,
    nice: 0,
    lyon: 0,
  });

  useEffect(() => {
    getCategories('en')
      .then(setCategories)
      .catch((err) => {
        console.warn('[ProductFormDrawer] failed to load categories:', err);
        toast.error('Could not load categories. Please try again.');
      });
  }, []);

  function setField<K extends keyof CreateProductData>(key: K, value: CreateProductData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && initial) {
        await updateProduct(initial.id, form);
      } else {
        const created = await createProduct(form);
        // Create initial inventory units per city
        for (const [city, qty] of Object.entries(initialStock)) {
          if (qty > 0) {
            await addProductUnits(created.id, { city, quantity: qty });
          }
        }
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddImage() {
    if (!initial || !imageUrl) return;
    setAddingImage(true);
    try {
      await addProductImage(initial.id, { url: imageUrl, isPrimary: true });
      setImageUrl('');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add image.');
    } finally {
      setAddingImage(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !initial) return;
    if (!/^image\//.test(file.type)) {
      setError('Please pick an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image is too large (8 MB max).');
      return;
    }
    setAddingImage(true);
    setError(null);
    try {
      const uploaded = await uploadImage(file);
      await addProductImage(initial.id, { url: uploaded.url, isPrimary: true });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setAddingImage(false);
    }
  }

  const inputClass =
    'h-10 w-full rounded-default border-[1.5px] border-sand bg-white px-3 font-sans text-[13px] text-ink outline-none transition-colors focus:border-brand focus:ring-[3px] focus:ring-brand/15';
  const labelClass =
    'mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-[95%] max-w-[560px] flex-col bg-white shadow-floating">
        <div className="flex items-start justify-between border-b border-linen p-5">
          <h3 className="font-serif text-[22px] font-semibold text-ink">
            {isEdit ? 'Edit garment' : 'New garment'}
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer font-sans text-[13px] font-medium text-stone underline underline-offset-2"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <p className="rounded-default bg-red-50 px-3 py-2 font-sans text-[13px] text-red-700">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>SKU</label>
              <input
                className={inputClass}
                value={form.sku}
                onChange={(e) => setField('sku', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Brand</label>
              <input
                className={inputClass}
                value={form.brand}
                onChange={(e) => setField('brand', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select
              className={inputClass}
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
              required
            >
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Name (EN)</label>
            <input
              className={inputClass}
              value={form.nameEn}
              onChange={(e) => setField('nameEn', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name (FR)</label>
              <input
                className={inputClass}
                value={form.nameFr}
                onChange={(e) => setField('nameFr', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Name (ES)</label>
              <input
                className={inputClass}
                value={form.nameEs}
                onChange={(e) => setField('nameEs', e.target.value)}
                required
              />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className={labelClass}>Description (EN)</label>
              <textarea
                className={`${inputClass} h-24 resize-none py-2`}
                value={form.descriptionEn}
                onChange={(e) => setField('descriptionEn', e.target.value)}
                required
              />
              <p className="mt-1 font-sans text-[11px] text-stone">
                FR/ES will use the same text; edit individually later.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Gender</label>
              <select
                className={inputClass}
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value as CreateProductData['gender'])}
              >
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Season</label>
              <select
                className={inputClass}
                value={form.season}
                onChange={(e) => setField('season', e.target.value as CreateProductData['season'])}
              >
                <option value="spring_summer">Spring/Summer</option>
                <option value="fall_winter">Fall/Winter</option>
                <option value="all_season">All Season</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Size (EU)</label>
              <input
                className={inputClass}
                value={form.sizeEu}
                onChange={(e) => setField('sizeEu', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Color</label>
              <input
                className={inputClass}
                value={form.color}
                onChange={(e) => setField('color', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Weight (g)</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.weightGrams}
                onChange={(e) => setField('weightGrams', Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Purchase price (€)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className={inputClass}
                value={form.purchasePrice}
                onChange={(e) => setField('purchasePrice', Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Rental/day (€)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className={inputClass}
                value={form.rentalPricePerDay}
                onChange={(e) => setField('rentalPricePerDay', Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Max cycles</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.maxCycles}
                onChange={(e) => setField('maxCycles', Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Source</label>
              <select
                className={inputClass}
                value={form.source}
                onChange={(e) => setField('source', e.target.value as CreateProductData['source'])}
              >
                <option value="wholesale">Wholesale</option>
                <option value="vinted">Vinted</option>
                <option value="donated_in">Donated in</option>
                <option value="direct_purchase">Direct purchase</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Condition</label>
              <select
                className={inputClass}
                value={form.condition ?? 'new'}
                onChange={(e) =>
                  setField('condition', e.target.value as CreateProductData['condition'])
                }
              >
                <option value="new">New</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>
          </div>

          {!isEdit && (
            <section className="rounded-xl border border-dashed border-sand bg-pearl/30 p-4">
              <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                Initial stock
              </p>
              <p className="mb-3 font-sans text-[12px] text-stone">
                How many physical units ship with this product, per city. You can restock more
                later.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(['paris', 'nice', 'lyon'] as const).map((city) => (
                  <div key={city}>
                    <label className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-stone capitalize">
                      {city}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={initialStock[city] ?? 0}
                      onChange={(e) =>
                        setInitialStock((prev) => ({
                          ...prev,
                          [city]: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 font-sans text-[11px] text-stone">
                Total:{' '}
                <span className="font-semibold text-ink">
                  {Object.values(initialStock).reduce((s, n) => s + (n || 0), 0)}
                </span>{' '}
                unit(s)
              </p>
            </section>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full cursor-pointer rounded-default bg-brand py-2.5 font-sans text-[13px] font-semibold text-ivory transition-colors hover:bg-brand/90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create garment'}
            </button>
          </div>

          {isEdit && initial && (
            <section className="mt-6 border-t border-linen pt-5">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                Add image
              </p>

              <label
                className={`mt-2 flex h-24 w-full cursor-pointer items-center justify-center rounded-default border-[1.5px] border-dashed border-sand bg-pearl/50 px-3 text-center font-sans text-[13px] text-stone transition-colors hover:border-brand hover:text-brand ${addingImage ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileUpload}
                  disabled={addingImage}
                  className="sr-only"
                />
                <span>
                  {addingImage ? 'Uploading…' : 'Click to upload an image'}
                  <br />
                  <span className="text-[11px]">JPEG / PNG / WebP / AVIF · up to 8 MB</span>
                </span>
              </label>

              <div className="mt-3">
                <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
                  Or paste a URL
                </p>
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!imageUrl || addingImage}
                    onClick={handleAddImage}
                    className="cursor-pointer rounded-default border-[1.5px] border-sand px-3 py-2 font-sans text-[13px] font-medium text-charcoal hover:bg-pearl disabled:opacity-60"
                  >
                    {addingImage ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
}
