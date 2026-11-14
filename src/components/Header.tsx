import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { logoSrc, useSite } from '../lib/site';
import ShareDialog from './ShareDialog';

export default function Header() {
  const { brand, linkTo } = useSite();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-brand-yellow/95 backdrop-blur supports-[backdrop-filter]:bg-brand-yellow/85">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link to={linkTo('/')} className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
          <img
            src={logoSrc(brand)}
            alt={`${brand.brand_name} logo`}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-black/10"
          />
          <span className="min-w-0 leading-tight">
            <span className="block text-[15px] font-extrabold leading-tight text-brand-blue-dark sm:text-lg">
              {brand.brand_name}
            </span>
            {brand.tagline && <span className="block truncate text-xs font-medium text-ink/70">{brand.tagline}</span>}
          </span>
        </Link>

        <button
          type="button"
          aria-label="Share catalogue"
          onClick={() => setShareOpen(true)}
          className="focus-ring ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-blue-dark px-3 py-2 text-sm font-semibold text-white shadow-sm active:scale-95 sm:px-3.5"
        >
          <Share2 size={16} aria-hidden />
          <span className="sm:hidden">Share</span>
          <span className="hidden sm:inline">Share catalogue</span>
        </button>
      </div>

      {shareOpen && <ShareDialog kind="catalogue" path="/" title={`${brand.brand_name} catalogue`} onClose={() => setShareOpen(false)} />}
    </header>
  );
}
