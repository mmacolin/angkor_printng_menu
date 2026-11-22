import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Category, Product, Spec } from './types';

export type Lang = 'en' | 'km';
export const LANG_PARAM = 'lang';
const STORAGE_KEY = 'angkor.lang';

const strings = {
  en: {
    productCatalogue: 'Product Catalogue',
    searchPlaceholder: 'Search products, materials, sizes…',
    searchLabel: 'Search products',
    clearSearch: 'Clear search',
    allProducts: 'All products',
    productCount: (n: number) => `${n} product${n === 1 ? '' : 's'}`,
    noMatches: 'No products match your search.',
    showAll: 'Show all products',
    loadError: 'The catalogue could not be loaded. Please check your connection and try again.',
    unavailable: 'Currently unavailable',
    sizesCount: (n: number) => `${n} size${n === 1 ? '' : 's'}`,
    finishingCount: (n: number) => `${n} finishing option${n === 1 ? '' : 's'}`,
    code: 'Code',
    specifications: 'Specifications',
    materials: 'Materials',
    sizes: 'Sizes',
    finishing: 'Finishing options',
    photoComingSoon: 'Photo coming soon',
    showPhoto: (n: number) => `Show photo ${n}`,
    photoCount: (n: number) => `${n} photos`,
    photoOf: (i: number, n: number) => `Photo ${i} of ${n}`,
    tapToEnlarge: 'Tap to enlarge',
    previousPhoto: 'Previous photo',
    nextPhoto: 'Next photo',
    notFound: 'This page could not be found.',
    productGone: 'This product is no longer in the catalogue.',
    browse: 'Browse the catalogue',
    footerNote: 'Product information for reference.',
    // Wholesaler-only
    share: 'Share',
    shareCatalogue: 'Share catalogue',
    shareProduct: 'Share this product',
    shareProductNamed: (name: string) => `Share ${name}`,
    shareTitleProduct: 'Share this product with your customer',
    shareTitleCatalogue: 'Share the full catalogue with your customer',
    shareExplainer:
      'Your customer will see the same product information, but without our name, logo or contact details.',
    linkToShare: 'Link to share',
    copy: 'Copy',
    copied: 'Copied',
    shareVia: 'Share via…',
    preview: 'Preview what your customer sees',
    close: 'Close',
    contactUs: (brand: string) => `Contact ${brand}`,
    call: 'Call',
    email: 'Email',
    address: 'Address',
  },
  km: {
    productCatalogue: 'កាតាឡុកផលិតផល',
    searchPlaceholder: 'ស្វែងរកផលិតផល សម្ភារៈ ទំហំ…',
    searchLabel: 'ស្វែងរកផលិតផល',
    clearSearch: 'សម្អាតការស្វែងរក',
    allProducts: 'ផលិតផលទាំងអស់',
    productCount: (n: number) => `ផលិតផល ${n}`,
    noMatches: 'រកមិនឃើញផលិតផលដែលត្រូវនឹងការស្វែងរក។',
    showAll: 'បង្ហាញផលិតផលទាំងអស់',
    loadError: 'មិនអាចផ្ទុកកាតាឡុកបានទេ។ សូមពិនិត្យការតភ្ជាប់ ហើយព្យាយាមម្តងទៀត។',
    unavailable: 'មិនទាន់មានស្តុក',
    sizesCount: (n: number) => `${n} ទំហំ`,
    finishingCount: (n: number) => `${n} ជម្រើសបញ្ចប់`,
    code: 'លេខកូដ',
    specifications: 'លក្ខណៈបច្ចេកទេស',
    materials: 'សម្ភារៈ',
    sizes: 'ទំហំ',
    finishing: 'ជម្រើសបញ្ចប់ (Finishing)',
    photoComingSoon: 'រូបភាពនឹងមកដល់ឆាប់ៗ',
    showPhoto: (n: number) => `បង្ហាញរូបភាពទី ${n}`,
    photoCount: (n: number) => `រូបភាព ${n}`,
    photoOf: (i: number, n: number) => `រូបភាពទី ${i} នៃ ${n}`,
    tapToEnlarge: 'ចុចដើម្បីពង្រីក',
    previousPhoto: 'រូបភាពមុន',
    nextPhoto: 'រូបភាពបន្ទាប់',
    notFound: 'រកមិនឃើញទំព័រនេះទេ។',
    productGone: 'ផលិតផលនេះលែងមាននៅក្នុងកាតាឡុកហើយ។',
    browse: 'មើលកាតាឡុក',
    footerNote: 'ព័ត៌មានផលិតផលសម្រាប់ជាឯកសារយោង។',
    share: 'ចែករំលែក',
    shareCatalogue: 'ចែករំលែកកាតាឡុក',
    shareProduct: 'ចែករំលែកផលិតផលនេះ',
    shareProductNamed: (name: string) => `ចែករំលែក ${name}`,
    shareTitleProduct: 'ចែករំលែកផលិតផលនេះទៅអតិថិជនរបស់អ្នក',
    shareTitleCatalogue: 'ចែករំលែកកាតាឡុកទាំងមូលទៅអតិថិជនរបស់អ្នក',
    shareExplainer: 'អតិថិជនរបស់អ្នកនឹងឃើញព័ត៌មានផលិតផលដូចគ្នា ប៉ុន្តែគ្មានឈ្មោះ ឡូហ្គោ ឬព័ត៌មានទំនាក់ទំនងរបស់យើងទេ។',
    linkToShare: 'តំណសម្រាប់ចែករំលែក',
    copy: 'ចម្លង',
    copied: 'បានចម្លង',
    shareVia: 'ចែករំលែកតាម…',
    preview: 'មើលអ្វីដែលអតិថិជនរបស់អ្នកនឹងឃើញ',
    close: 'បិទ',
    contactUs: (brand: string) => `ទំនាក់ទំនង ${brand}`,
    call: 'ហៅទូរស័ព្ទ',
    email: 'អ៊ីមែល',
    address: 'អាសយដ្ឋាន',
  },
} as const;

export type Strings = { [K in keyof (typeof strings)['en']]: (typeof strings)['en'][K] extends (...a: infer A) => string ? (...a: A) => string : string };

function initialLang(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get(LANG_PARAM);
  if (fromUrl === 'km' || fromUrl === 'en') return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'km' || stored === 'en') return stored;
  } catch {
    /* storage blocked */
  }
  return 'en';
}

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Strings;
}

const LangContext = createContext<LangState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: strings[lang] as Strings }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangState {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Product content in the chosen language. Khmer falls back to English field by
// field, so a partly translated product still shows complete information.
// ---------------------------------------------------------------------------

const pick = (km: string | undefined, en: string, lang: Lang) => (lang === 'km' && km?.trim() ? km : en);
const pickList = <T,>(km: T[] | undefined, en: T[], lang: Lang) => (lang === 'km' && km && km.length ? km : en);

export interface LocalizedProduct {
  name: string;
  description: string;
  specifications: Spec[];
  materials: string[];
  sizes: string[];
  finishing_options: string[];
}

export function localize(p: Product, lang: Lang): LocalizedProduct {
  return {
    name: pick(p.name_km, p.name, lang),
    description: pick(p.description_km, p.description, lang),
    specifications: pickList(p.specifications_km, p.specifications, lang),
    materials: pickList(p.materials_km, p.materials, lang),
    sizes: pickList(p.sizes_km, p.sizes, lang),
    finishing_options: pickList(p.finishing_options_km, p.finishing_options, lang),
  };
}

export function categoryLabel(c: Category | undefined, lang: Lang): string {
  if (!c) return '';
  return pick(c.name_km, c.name, lang);
}

/** Header switch: EN | ខ្មែរ */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label="Language / ភាសា" className={`inline-flex shrink-0 rounded-full bg-white/70 p-0.5 text-xs font-bold ring-1 ring-black/10 ${className}`}>
      {(
        [
          ['en', 'EN'],
          ['km', 'ខ្មែរ'],
        ] as const
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          lang={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`focus-ring rounded-full px-2.5 py-1.5 transition ${lang === code ? 'bg-brand-blue-dark text-white' : 'text-ink/70 hover:text-ink'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
