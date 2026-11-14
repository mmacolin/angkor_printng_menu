import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fetchCategories, fetchProducts } from '../lib/api';
import { usePageTitle, useSite } from '../lib/site';
import { categoryLabel, localize, useLang } from '../lib/i18n';
import type { Category, Product } from '../lib/types';
import ProductCard from '../components/ProductCard';
import ShareDialog from '../components/ShareDialog';

/** Searches English and Khmer text, so either language finds the product. */
function matches(p: Product, categoryNames: string, q: string) {
  if (!q) return true;
  const haystack = [
    p.name,
    p.name_km,
    p.sku ?? '',
    p.description,
    p.description_km,
    categoryNames,
    ...p.materials,
    ...p.materials_km,
    ...p.sizes,
    ...p.sizes_km,
    ...p.finishing_options,
    ...p.finishing_options_km,
    ...[...p.specifications, ...p.specifications_km].flatMap((s) => [s.label, s.value]),
  ]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export default function CataloguePage() {
  const { isCustomerView } = useSite();
  const { lang, t } = useLang();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sharing, setSharing] = useState<Product | null>(null);

  usePageTitle(t.productCatalogue);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch((e) => {
        console.error(e);
        setError('load');
      });
  }, []);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryName = (id: string | null) => categoryLabel(categoryById.get(id ?? ''), lang);

  // Only show categories that actually contain products.
  const usedCategories = useMemo(
    () => categories.filter((c) => products?.some((p) => p.category_id === c.id)),
    [categories, products],
  );

  const visible = useMemo(
    () =>
      (products ?? []).filter(
        (p) =>
          (activeCategory === 'all' || p.category_id === activeCategory) &&
          matches(p, `${categoryById.get(p.category_id ?? '')?.name ?? ''} ${categoryById.get(p.category_id ?? '')?.name_km ?? ''}`, query.trim()),
      ),
    [products, activeCategory, query, categoryById],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-4">
      {/* Search */}
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchLabel}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-[15px] shadow-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t.clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category chips */}
      {usedCategories.length > 0 && (
        <nav aria-label="Categories" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ id: 'all', label: t.allProducts }, ...usedCategories.map((c) => ({ id: c.id, label: categoryLabel(c, lang) }))].map((c) => {
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                aria-pressed={active}
                className={`focus-ring shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  active ? 'bg-brand-blue-dark text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* Results */}
      {error ? (
        <p className="mt-10 rounded-2xl bg-red-50 p-4 text-center text-sm text-red-700">{t.loadError}</p>
      ) : products === null ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              <div className="aspect-square bg-slate-200" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-3/4 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-500" aria-live="polite">
            {t.productCount(visible.length)}
          </p>
          {visible.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
              <p className="font-semibold text-ink">{t.noMatches}</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-sm font-semibold text-brand-blue-dark hover:underline"
              >
                {t.showAll}
              </button>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  categoryName={categoryName(p.category_id)}
                  eager={i < 4}
                  onShare={isCustomerView ? undefined : setSharing}
                />
              ))}
            </div>
          )}
        </>
      )}

      {sharing && !isCustomerView && (
        <ShareDialog kind="product" path={`/p/${sharing.slug}`} title={localize(sharing, lang).name} onClose={() => setSharing(null)} />
      )}
    </div>
  );
}
