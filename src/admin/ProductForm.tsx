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
  category_id: null,
  description: '',
  specifications: [{ label: '', value: '' }],
  materials: [],
  sizes: [],
  finishing_options: [],
  images: [],
  in_stock: true,
  is_published: true,
  sort_order: 0,
};

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
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const uploadedThisEdit = useRef<string[]>([]);
  const originalImages = useRef<string[]>(product?.images ?? []);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setName = (name: string) => setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));

  const setSpec = (i: number, patch: Partial<Spec>) =>
    set(
      'specifications',
      form.specifications.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    );

  const cancel = async () => {
    // Remove photos uploaded during this edit that were never saved.
    await removeStoredImages(uploadedThisEdit.current);
    onCancel();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return notifyError(new Error('Please enter a product name.'));
    setSaving(true);
    try {
      const saved = await saveProduct({ ...form, name: form.name.trim(), slug: slugify(form.slug || form.name) });
      // Clean up photos that were removed from this product.
      const dropped = [...originalImages.current, ...uploadedThisEdit.current].filter((u) => !saved.images.includes(u));
      await removeStoredImages(dropped);
      onSaved(saved, isNew);
    } catch (err) {
      notifyError(err);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" className="px-2" onClick={cancel} aria-label="Back to products">
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold text-ink">{isNew ? 'Add product' : `Edit ${product.name}`}</h1>
      </div>

      <div className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
        <Field label="Photos" hint="The first photo is the cover shown in the catalogue. Use the arrows to reorder.">
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

        <Field label="Product name *">
          <input value={form.name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="e.g. Premium Business Cards" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select value={form.category_id ?? ''} onChange={(e) => set('category_id', e.target.value || null)} className={inputClass}>
              <option value="">— No category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Product code (SKU)" hint="Optional. Shown to customers as “Code”.">
            <input value={form.sku ?? ''} onChange={(e) => set('sku', e.target.value)} className={inputClass} placeholder="e.g. BC-PRM" />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Short description of the product and what it is used for. Do not include prices or contact details."
          />
        </Field>

        <div>
          <p className="mb-1 text-sm font-semibold text-ink">Specifications</p>
          <p className="mb-2 text-xs text-slate-500">e.g. “Paper weight” → “350 gsm”, “Minimum quantity” → “100 pieces”.</p>
          <div className="space-y-2">
            {form.specifications.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input value={s.label} onChange={(e) => setSpec(i, { label: e.target.value })} placeholder="Label" aria-label={`Specification ${i + 1} label`} className={`${inputClass} w-2/5`} />
                <input value={s.value} onChange={(e) => setSpec(i, { value: e.target.value })} placeholder="Value" aria-label={`Specification ${i + 1} value`} className={`${inputClass} flex-1`} />
                <button
                  type="button"
                  onClick={() => set('specifications', form.specifications.filter((_, j) => j !== i))}
                  aria-label="Remove specification"
                  className="rounded-xl px-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-2 py-2" onClick={() => set('specifications', [...form.specifications, { label: '', value: '' }])}>
            <Plus size={16} /> Add specification
          </Button>
        </div>

        <Field label="Materials" hint="Type one and press Enter.">
          <TagInput value={form.materials} onChange={(v) => set('materials', v)} placeholder="e.g. Art card 350gsm" />
        </Field>
        <Field label="Sizes" hint="Type one and press Enter.">
          <TagInput value={form.sizes} onChange={(v) => set('sizes', v)} placeholder="e.g. A5, 90 × 54 mm" />
        </Field>
        <Field label="Finishing options" hint="Type one and press Enter.">
          <TagInput value={form.finishing_options} onChange={(v) => set('finishing_options', v)} placeholder="e.g. Matte lamination" />
        </Field>

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
              <span className="block text-xs text-slate-500">Off hides it from customers</span>
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
