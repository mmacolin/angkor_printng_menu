import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useSite } from '../lib/site';
import { localize, useLang } from '../lib/i18n';
import type { Product } from '../lib/types';
import ProductImage from './ProductImage';

export default function ProductCard({
  product,
  categoryName,
  eager,
  onShare,
}: {
  product: Product;
  categoryName?: string;
  eager?: boolean;
  /** Wholesaler view only. */
  onShare?: (p: Product) => void;
}) {
  const { linkTo } = useSite();
  const { lang, t } = useLang();
  const p = localize(product, lang);
  const finishing = p.finishing_options.filter((f) => f.toLowerCase() !== 'none');
  const highlights = [...p.materials.slice(0, 1), ...finishing.slice(0, 1)];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <Link to={linkTo(`/p/${product.slug}`)} className="focus-ring flex flex-1 flex-col rounded-2xl">
        <div className="relative aspect-square overflow-hidden">
          <ProductImage
            src={product.images[0]}
            name={p.name}
            initialsFrom={product.name}
            comingSoon={t.photoComingSoon}
            eager={eager}
            className="transition duration-300 group-hover:scale-[1.03]"
          />
          {!product.in_stock && (
            <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">{t.unavailable}</span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          {categoryName && <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">{categoryName}</p>}
          <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-ink sm:text-base">{p.name}</h3>
          {highlights.length > 0 && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{highlights.join(' · ')}</p>}
          {p.sizes.length > 0 && (
            <p className="mt-auto pt-2 text-[11px] text-slate-400">
              {t.sizesCount(p.sizes.length)}
              {finishing.length > 0 && ` · ${t.finishingCount(finishing.length)}`}
            </p>
          )}
        </div>
      </Link>
      {onShare && (
        <button
          type="button"
          onClick={() => onShare(product)}
          aria-label={t.shareProductNamed(p.name)}
          className="focus-ring absolute right-2 top-2 rounded-full bg-white/90 p-2 text-brand-blue-dark shadow ring-1 ring-black/5 active:scale-90"
        >
          <Share2 size={16} />
        </button>
      )}
    </article>
  );
}
