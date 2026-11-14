import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { brandName, brandTagline, logoSrc, useSite } from '../lib/site';
import { LanguageSwitcher, useLang } from '../lib/i18n';
import ShareDialog from './ShareDialog';

export default function Header() {
  const { brand, linkTo } = useSite();
  const { lang, t } = useLang();
  const [shareOpen, setShareOpen] = useState(false);

  // Customer view: neutral header — no Angkor Printing name, logo or colours.
  if (!brand) {
    return (
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to={linkTo('/')} className="focus-ring rounded-lg text-lg font-extrabold text-ink">
            {t.productCatalogue}
          </Link>
          <LanguageSwitcher className="ml-auto bg-slate-100" />
        </div>
      </header>
    );
  }

  const name = brandName(brand, lang);
  const tagline = brandTagline(brand, lang);

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-brand-yellow/95 backdrop-blur supports-[backdrop-filter]:bg-brand-yellow/85">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3">
        <Link to={linkTo('/')} className="focus-ring flex min-w-0 items-center gap-2.5 rounded-lg">
          <img
            src={logoSrc(brand)}
            alt={`${brand.brand_name} logo`}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-black/10"
          />
          <span className="min-w-0 leading-tight">
            <span className="block text-[15px] font-extrabold leading-tight text-brand-blue-dark sm:text-lg">{name}</span>
            {tagline && <span className="block truncate text-xs font-medium text-ink/70">{tagline}</span>}
          </span>
        </Link>

        <LanguageSwitcher className="ml-auto" />
        <button
          type="button"
          aria-label={t.shareCatalogue}
          onClick={() => setShareOpen(true)}
          className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-blue-dark px-3 py-2 text-sm font-semibold text-white shadow-sm active:scale-95 sm:px-3.5"
        >
          <Share2 size={16} aria-hidden />
          <span className="hidden sm:inline">{t.shareCatalogue}</span>
        </button>
      </div>

      {shareOpen && <ShareDialog kind="catalogue" path="/" title={t.productCatalogue} onClose={() => setShareOpen(false)} />}
    </header>
  );
}
