import { brandName, brandTagline, logoSrc, useSite } from '../lib/site';
import { useLang } from '../lib/i18n';
import ContactLinks from './ContactLinks';

export default function Footer() {
  const { brand } = useSite();
  const { lang, t } = useLang();

  // Customer view: no Angkor Printing name, logo or contact details.
  if (!brand) {
    return (
      <footer className="mt-10 border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-400">{t.footerNote}</p>
      </footer>
    );
  }

  const name = brandName(brand, lang);
  const tagline = brandTagline(brand, lang);

  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
          <img src={logoSrc(brand)} alt="" width={36} height={36} className="h-9 w-9 rounded-md object-cover ring-1 ring-black/10" />
          <div className="leading-tight">
            <p className="font-bold text-brand-blue-dark">{name}</p>
            {tagline && <p className="text-xs text-slate-500">{tagline}</p>}
          </div>
        </div>

        <div className="mt-5">
          <ContactLinks variant="footer" />
        </div>

        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} {brand.brand_name}. {t.footerNote}
        </p>
      </div>
    </footer>
  );
}
