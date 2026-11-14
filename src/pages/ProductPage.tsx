import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { fetchCategories, fetchProductBySlug } from '../lib/api';
import { usePageTitle, useSite } from '../lib/site';
import { categoryLabel, localize, useLang } from '../lib/i18n';
import type { Category, Product } from '../lib/types';
import ProductImage from '../components/ProductImage';
import ShareDialog from '../components/ShareDialog';
import ContactLinks from '../components/ContactLinks';
import NotFound from './NotFound';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Section title={title}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-slate-200">
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { isCustomerView, linkTo } = useSite();
  const { lang, t } = useLang();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProduct(undefined);
    setActiveImage(0);
    window.scrollTo(0, 0);
    Promise.all([fetchProductBySlug(slug), fetchCategories()])
      .then(([p, cats]) => {
        if (cancelled) return;
        setProduct(p);
        setCategory(cats.find((c) => c.id === p?.category_id));
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setProduct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const p = product ? localize(product, lang) : null;
  usePageTitle(p ? p.name : null);

  if (product === null) return <NotFound message={t.productGone} />;

  if (product === undefined || !p) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 py-6">
        <div className="aspect-square rounded-3xl bg-slate-200 md:w-1/2" />
        <div className="mt-4 h-6 w-2/3 rounded bg-slate-200" />
      </div>
    );
  }

  const images = product.images;
  const categoryName = categoryLabel(category, lang);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-3">
      <Link to={linkTo('/')} className="focus-ring inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold text-brand-blue-dark">
        <ArrowLeft size={16} /> {t.allProducts}
      </Link>

      <div className="mt-2 grid gap-6 md:grid-cols-2 md:gap-10">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <ProductImage src={images[activeImage]} name={p.name} initialsFrom={product.name} comingSoon={t.photoComingSoon} eager />
          </div>
          {images.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={t.showPhoto(i + 1)}
                  aria-current={i === activeImage}
                  className={`focus-ring h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ${i === activeImage ? 'ring-brand-blue' : 'ring-transparent opacity-70'}`}
                >
                  <ProductImage src={src} name={`${p.name} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            {categoryName && <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">{categoryName}</p>}
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {product.sku && (
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">
                  {t.code}: {product.sku}
                </span>
              )}
              {!product.in_stock && <span className="rounded-md bg-slate-900 px-2 py-1 font-semibold text-white">{t.unavailable}</span>}
            </div>
            {p.description && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{p.description}</p>}
          </div>

          {!isCustomerView && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-yellow px-4 py-3 text-base font-bold text-ink shadow-sm active:scale-[0.98] sm:w-auto"
            >
              <Share2 size={18} /> {t.shareProduct}
            </button>
          )}

          {p.specifications.length > 0 && (
            <Section title={t.specifications}>
              <dl className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                {p.specifications.map((s, i) => (
                  <div key={`${s.label}-${i}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-2.5 text-sm">
                    <dt className="font-medium text-slate-500">{s.label}</dt>
                    <dd className="text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          <Chips title={t.materials} items={p.materials} />
          <Chips title={t.sizes} items={p.sizes} />
          <Chips title={t.finishing} items={p.finishing_options} />

          {/* Renders nothing in the customer view. */}
          <ContactLinks variant="product" />
        </div>
      </div>

      {shareOpen && !isCustomerView && <ShareDialog kind="product" path={`/p/${product.slug}`} title={p.name} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
