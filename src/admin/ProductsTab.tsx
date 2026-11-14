import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminFetchProducts, deleteProduct, fetchCategories, setProductField } from '../lib/api';
import type { Category, Product } from '../lib/types';
import ProductImage from '../components/ProductImage';
import { Button, Toggle, inputClass } from './ui';
import ProductForm from './ProductForm';

interface Props {
  notify: (text: string) => void;
  notifyError: (e: unknown) => void;
}

export default function ProductsTab({ notify, notifyError }: Props) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const load = useCallback(() => {
    Promise.all([adminFetchProducts(), fetchCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch(notifyError);
  }, [notifyError]);

  useEffect(load, [load]);

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (categoryFilter === 'all' || (categoryFilter === 'none' ? !p.category_id : p.category_id === categoryFilter)) &&
        (!q || `${p.name} ${p.sku ?? ''} ${categoryName.get(p.category_id ?? '') ?? ''}`.toLowerCase().includes(q)),
    );
  }, [products, query, categoryFilter, categoryName]);

  const toggle = async (p: Product, field: 'in_stock' | 'is_published', value: boolean) => {
    // Optimistic update so the switch responds instantly.
    setProducts((list) => list?.map((x) => (x.id === p.id ? { ...x, [field]: value } : x)) ?? null);
    try {
      await setProductField(p.id, { [field]: value });
      notify(
        field === 'in_stock'
          ? `${p.name} marked ${value ? 'available' : 'unavailable'}`
          : `${p.name} is now ${value ? 'visible in' : 'hidden from'} the catalogue`,
      );
    } catch (e) {
      setProducts((list) => list?.map((x) => (x.id === p.id ? { ...x, [field]: !value } : x)) ?? null);
      notifyError(e);
    }
  };

  const doDelete = async (p: Product) => {
    try {
      await deleteProduct(p);
      setProducts((list) => list?.filter((x) => x.id !== p.id) ?? null);
      notify(`Deleted ${p.name}`);
    } catch (e) {
      notifyError(e);
    } finally {
      setConfirmDelete(null);
    }
  };

  if (editing) {
    return (
      <ProductForm
        product={editing === 'new' ? null : editing}
        categories={categories}
        onCancel={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          setEditing(null);
          notify(isNew ? `Added ${saved.name}` : `Saved ${saved.name}`);
          load();
        }}
        notifyError={notifyError}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, code or category"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${inputClass} sm:w-52`} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">No category</option>
        </select>
        <Button onClick={() => setEditing('new')}>
          <Plus size={18} /> Add product
        </Button>
      </div>

      {products === null ? (
        <p className="mt-8 text-center text-slate-500">Loading products…</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-500">
            {filtered.length} of {products.length} products
          </p>

          {/* Table on larger screens */}
          <div className="mt-2 hidden overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3 text-center">Available</th>
                  <th className="px-4 py-3 text-center">Visible</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className={p.is_published ? '' : 'bg-slate-50/60 text-slate-400'}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                          <ProductImage src={p.images[0]} name={p.name} />
                        </div>
                        <span className="font-semibold text-ink">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{categoryName.get(p.category_id ?? '') ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.sku ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Toggle checked={p.in_stock} onChange={(v) => toggle(p, 'in_stock', v)} label={`${p.name} available`} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Toggle checked={p.is_published} onChange={(v) => toggle(p, 'is_published', v)} label={`${p.name} visible in catalogue`} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" className="px-2.5" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                          <Pencil size={16} /> Edit
                        </Button>
                        <Button variant="ghost" className="px-2.5 text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(p)} aria-label={`Delete ${p.name}`}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on phones */}
          <ul className="mt-2 space-y-2 md:hidden">
            {filtered.map((p) => (
              <li key={p.id} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    <ProductImage src={p.images[0]} name={p.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{p.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {categoryName.get(p.category_id ?? '') ?? 'No category'}
                      {p.sku && ` · ${p.sku}`}
                    </p>
                  </div>
                  <Button variant="secondary" className="px-3 py-2" onClick={() => setEditing(p)}>
                    <Pencil size={15} />
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Toggle checked={p.in_stock} onChange={(v) => toggle(p, 'in_stock', v)} label={`${p.name} available`} /> Available
                  </span>
                  <span className="flex items-center gap-2">
                    <Toggle checked={p.is_published} onChange={(v) => toggle(p, 'is_published', v)} label={`${p.name} visible`} /> Visible
                  </span>
                  <button type="button" onClick={() => setConfirmDelete(p)} className="ml-auto rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${p.name}`}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {filtered.length === 0 && <p className="mt-8 text-center text-slate-500">No products found.</p>}

          <p className="mt-4 text-xs text-slate-500">
            <strong>Available</strong> off shows “Currently unavailable” on the product. <strong>Visible</strong> off hides the product from the catalogue
            entirely.
          </p>
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-ink">Delete “{confirmDelete.name}”?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This permanently removes the product and its photos. Links already shared to this product will stop working. To hide it temporarily,
              switch off <strong>Visible</strong> instead.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => doDelete(confirmDelete)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
