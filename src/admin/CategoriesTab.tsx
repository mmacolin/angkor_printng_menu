import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { deleteCategory, fetchCategories, saveCategory } from '../lib/api';
import type { Category } from '../lib/types';
import { Button, inputClass } from './ui';

interface Props {
  notify: (text: string) => void;
  notifyError: (e: unknown) => void;
}

export default function CategoriesTab({ notify, notifyError }: Props) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; sort_order: number }>>({});
  const [newName, setNewName] = useState('');

  const load = useCallback(() => {
    fetchCategories()
      .then((c) => {
        setCategories(c);
        setDrafts(Object.fromEntries(c.map((x) => [x.id, { name: x.name, sort_order: x.sort_order }])));
      })
      .catch(notifyError);
  }, [notifyError]);

  useEffect(load, [load]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const maxOrder = Math.max(0, ...(categories ?? []).map((c) => c.sort_order));
      await saveCategory({ name, sort_order: maxOrder + 1 });
      setNewName('');
      notify(`Added category “${name}”`);
      load();
    } catch (e) {
      notifyError(e);
    }
  };

  const save = async (c: Category) => {
    const d = drafts[c.id];
    if (!d?.name.trim()) return notifyError(new Error('Category name cannot be empty.'));
    try {
      await saveCategory({ id: c.id, name: d.name.trim(), sort_order: d.sort_order });
      notify('Category saved');
      load();
    } catch (e) {
      notifyError(e);
    }
  };

  const remove = async (c: Category) => {
    if (!window.confirm(`Delete category “${c.name}”? Products in it will stay in the catalogue but show no category.`)) return;
    try {
      await deleteCategory(c.id);
      notify(`Deleted “${c.name}”`);
      load();
    } catch (e) {
      notifyError(e);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-ink">Add a category</p>
        <div className="mt-2 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder="e.g. Calendars"
            className={inputClass}
          />
          <Button onClick={add} disabled={!newName.trim()}>
            <Plus size={18} /> Add
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="grid grid-cols-[1fr_5rem_auto] gap-2 border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Name</span>
          <span>Order</span>
          <span className="sr-only">Actions</span>
        </div>
        {categories === null ? (
          <p className="p-4 text-center text-slate-500">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="p-4 text-center text-slate-500">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => {
              const d = drafts[c.id] ?? { name: c.name, sort_order: c.sort_order };
              const dirty = d.name !== c.name || d.sort_order !== c.sort_order;
              return (
                <li key={c.id} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2 px-4 py-2">
                  <input
                    value={d.name}
                    onChange={(e) => setDrafts((all) => ({ ...all, [c.id]: { ...d, name: e.target.value } }))}
                    aria-label="Category name"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={d.sort_order}
                    onChange={(e) => setDrafts((all) => ({ ...all, [c.id]: { ...d, sort_order: Number(e.target.value) || 0 } }))}
                    aria-label="Display order"
                    className={inputClass}
                  />
                  <div className="flex gap-1">
                    <Button variant={dirty ? 'primary' : 'ghost'} className="px-2.5" disabled={!dirty} onClick={() => save(c)} aria-label="Save category">
                      <Save size={16} />
                    </Button>
                    <Button variant="ghost" className="px-2.5 text-red-600 hover:bg-red-50" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">Categories with no visible products are not shown in the public catalogue. Lower order numbers appear first.</p>
    </div>
  );
}
