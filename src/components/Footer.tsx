import { logoSrc, useSite } from '../lib/site';
import ContactLinks from './ContactLinks';

export default function Footer() {
  const { brand, contactsHidden } = useSite();

  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
          <img src={logoSrc(brand)} alt="" width={36} height={36} className="h-9 w-9 rounded-md object-cover ring-1 ring-black/10" />
          <div className="leading-tight">
            <p className="font-bold text-brand-blue-dark">{brand.brand_name}</p>
            {brand.tagline && <p className="text-xs text-slate-500">{brand.tagline}</p>}
          </div>
        </div>

        {!contactsHidden && (
          <div className="mt-5">
            <ContactLinks variant="footer" />
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} {brand.brand_name}. Product information for reference.
        </p>
      </div>
    </footer>
  );
}
