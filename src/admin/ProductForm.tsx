import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { removeStoredImages, saveProduct, slugify } from '../lib/api';
import type { Category, Product, ProductInput, Spec } from '../lib/types';
import { Button, Field, Toggle, inputClass } from './ui';
import TagInput from './TagInput';
import ImageUploader from './ImageUploader';

const EMPTY: ProductInput = {
  slug: '',
  sku: '',
  name: '',
  name_km: '',
  category_id: null,
  description: '',
  description_km: '',
  specifications: [{ label: '', value: '' }],
  specifications_km: [],
  materials: [],
  materials_km: [],
  sizes: [],
  sizes_km: [],
  finishing_options: [],
  finishing_options_km: [],
  images: [],
  in_stock: true,
  is_published: true,
  sort_order: 0,
};

type EditLang = 'en' | 'km';

/** Field keys for the text content, per language. */
const KEYS = {
  en: { name: 'name', description: 'description', specifications: 'specifications', materials: 'materials', sizes: 'sizes', finishing_options: 'finishing_options' },
  km: { name: 'name_km', description: 'description_km', specifications: 'specifications_km', materials: 'materials_km', sizes: 'sizes_km', finishing_options: 'finishing_options_km' },
} as const;

export default function ProductForm({
  product,
  categories,
  onCancel,
  onSaved,
  notifyError,
}: {
  product: Product | null;
  categories: Category[];
  onCancel: () => void;
  onSaved: (p: Product, isNew: boolean) => void;
  notifyError: (e: unknown) => void;
}) {
  const isNew = !product;
  const [form, setForm] = useState<ProductInput>(() =>
    product ? { ...product, specifications: product.specifications.length ? product.specifications : [{ label: '', value: '' }] } : EMPTY,
  );
  const [editLang, setEditLang] = useState<EditLang>('en');
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const uploadedThisEdit = useRef<string[]>([]);
  const originalImages = useRef<string[]>(product?.images ?? []);

  const k = KEYS[editLang];
  const km = editLang === 'km';

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setName = (name: string) =>
    setForm((f) => (km ? { ...f, name_km: name } : { ...f, name, slug: slugTouched ? f.slug : slugify(name) }));

  const specs: Spec[] = form[k.specifications];
  const setSpecs = (next: Spec[]) => set(k.specifications, next);

  /** Start the Khmer specifications from the English labels, ready to translate. */
  const copySpecsFromEnglish = () => setSpecs(form.specifications.filter((s) => s.label || s.value).map((s) => ({ ...s })));

  const cancel = async () => {
    // Remove photos uploaded during this edit that were never saved.
    await removeStoredImages(uploadedThisEdit.current);
    onCancel();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setEditLang('en');
      return notifyError(new Error('Please enter the product name in English.'));
    }
    setSaving(true);
    try {
      const saved = await saveProduct({ ...form, name: form.name.trim(), name_km: form.name_km.trim(), slug: slugify(form.slug || form.name) });
      // Clean up photos that were removed from this product.
      const dropped = [...originalImages.current, ...uploadedThisEdit.current].filter((u) => !saved.images.includes(u));
      await removeStoredImages(dropped);
      onSaved(saved, isNew);
    } catch (err) {
      notifyError(err);
      setSaving(false);
    }
  };

  const hint = (en: string) => (km && en ? `English: ${en}` : undefined);

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" className="px-2" onClick={cancel} aria-label="Back to products">
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold text-ink">{isNew ? 'Add product' : `Edit ${product.name}`}</h1>
      </div>

      <div className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
        <Field label="Photos" hint="The first photo is the cover shown in the catalogue. Use the arrows to reorder. Photos are shared by both languages.">
          <ImageUploader
            images={form.images}
            onChange={(images) => set('images', images)}
            onUploaded={(url) => {
              uploadedThisEdit.current.push(url);
              setForm((f) => ({ ...f, images: [...f.images, url] }));
            }}
            onError={notifyError}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select value={form.category_id ?? ''} onChange={(e) => set('category_id', e.target.value || null)} className={inputClass}>
              <option value="">— No category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.name_km ? ` / ${c.name_km}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Product code (SKU)" hint="Optional. Shown to customers as “Code”.">
            <input value={form.sku ?? ''} onChange={(e) => set('sku', e.target.value)} className={inputClass} placeholder="e.g. BC-PRM" />
          </Field>
        </div>

        {/* ---------- Language tabs for the text content ---------- */}
        <div className="rounded-2xl border border-slate-200">
          <div role="tablist" aria-label="Content language" className="flex border-b border-slate-200 bg-slate-50 p-1">
            {(
              [
                ['en', 'English'],
                ['km', 'ខ្មែរ Khmer'],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={editLang === code}
                onClick={() => setEditLang(code)}
                className={`focus-ring flex-1 rounded-xl px-3 py-2 text-sm font-bold ${editLang === code ? 'bg-white text-brand-blue-dark shadow-sm ring-1 ring-slate-200' : 'text-slate-500'}`}
              >
                {label}
                {code === 'km' && !form.name_km.trim() && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">not yet</span>}
              </button>
            ))}
          </div>

          <div className="space-y-5 p-4" lang={editLang}>
            {km && (
              <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
                Fill in the Khmer text. Any field left empty shows the English version to Khmer readers, so you can translate a little at a time.
              </p>
            )}

            <Field label={km ? 'ឈ្មោះផលិតផល (Product name)' : 'Product name *'} hint={hint(form.name)}>
              <input
                value={form[k.name]}
                onChange={(e) => setName(e.target.value)}
                required={!km}
                className={inputClass}
                placeholder={km ? form.name : 'e.g. Premium Business Cards'}
              />
            </Field>

            <Field label={km ? 'ការពិពណ៌នា (Description)' : 'Description'}>
              <textarea
                value={form[k.description]}
                onChange={(e) => set(k.description, e.target.value)}
                rows={4}
                className={inputClass}
                placeholder={km ? form.description : 'Short description of the product. Do not include prices or contact details.'}
              />
            </Field>

            <div>
              <p className="mb-1 text-sm font-semibold text-ink">{km ? 'លក្ខណៈបច្ចេកទេស (Specifications)' : 'Specifications'}</p>
              <p className="mb-2 text-xs text-slate-500">
                {km ? 'Leave empty to show the English specifications.' : 'e.g. “Paper weight” → “350 gsm”, “Minimum quantity” → “100 pieces”.'}
              </p>
              {km && specs.length === 0 && form.specifications.some((s) => s.label || s.value) && (
                <Button variant="secondary" className="mb-2 py-2" onClick={copySpecsFromEnglish}>
                  Copy English specifications to translate
                </Button>
              )}
              <div className="space-y-2">
                {specs.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={s.label}
                      onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      placeholder="Label"
                      aria-label={`Specification ${i + 1} label`}
                      className={`${inputClass} w-2/5`}
                    />
                    <input
                      value={s.value}
                      onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                      placeholder="Value"
                      aria-label={`Specification ${i + 1} value`}
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setSpecs(specs.filter((_, j) => j !== i))}
                      aria-label="Remove specification"
                      className="rounded-xl px-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="mt-2 py-2" onClick={() => setSpecs([...specs, { label: '', value: '' }])}>
                <Plus size={16} /> Add specification
              </Button>
            </div>

            <Field label={km ? 'សម្ភារៈ (Materials)' : 'Materials'} hint={km ? hint(form.materials.join(', ')) : 'Type one and press Enter.'}>
              <TagInput value={form[k.materials]} onChange={(v) => set(k.materials, v)} placeholder={km ? 'ខ្មែរ…' : 'e.g. Art card 350gsm'} />
            </Field>
            <Field label={km ? 'ទំហំ (Sizes)' : 'Sizes'} hint={km ? hint(form.sizes.join(', ')) : 'Type one and press Enter.'}>
              <TagInput value={form[k.sizes]} onChange={(v) => set(k.sizes, v)} placeholder={km ? 'ខ្មែរ…' : 'e.g. A5, 90 × 54 mm'} />
            </Field>
            <Field label={km ? 'ជម្រើសបញ្ចប់ (Finishing options)' : 'Finishing options'} hint={km ? hint(form.finishing_options.join(', ')) : 'Type one and press Enter.'}>
              <TagInput value={form[k.finishing_options]} onChange={(v) => set(k.finishing_options, v)} placeholder={km ? 'ខ្មែរ…' : 'e.g. Matte lamination'} />
            </Field>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <span>
              <span className="block text-sm font-semibold text-ink">Available</span>
              <span className="block text-xs text-slate-500">Off shows “Currently unavailable”</span>
            </span>
            <Toggle checked={form.in_stock} onChange={(v) => set('in_stock', v)} label="Available" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <span>
              <span className="block text-sm font-semibold text-ink">Visible in catalogue</span>
              <span className="block text-xs text-slate-500">Off hides it from everyone</span>
            </span>
            <Toggle checked={form.is_published} onChange={(v) => set('is_published', v)} label="Visible in catalogue" />
          </div>
        </div>

        <details className="rounded-xl bg-slate-50 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-600">Advanced</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Link name" hint={isNew ? 'Used in the product link. Filled in automatically.' : 'Changing this breaks links already shared for this product.'}>
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value);
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Display order" hint="Lower numbers appear first.">
              <input type="number" value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value) || 0)} className={inputClass} />
            </Field>
          </div>
        </details>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 flex justify-end gap-2 border-t border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
        <Button variant="secondary" onClick={cancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
