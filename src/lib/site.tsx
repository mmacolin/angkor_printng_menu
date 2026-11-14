import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_BRAND, fetchBrand, fetchContacts } from './api';
import { LANG_PARAM, type Lang } from './i18n';
import type { Brand, Contacts } from './types';

/**
 * Two views of the same products:
 *
 *  - Wholesaler view (normal site): Angkor Printing name, logo and contact details.
 *  - Customer view (any link a wholesaler shares, marked `?s=1`): the same product
 *    information with Angkor Printing's name, logo and contacts hidden.
 *
 * In the customer view the branding and contact tables are never requested, so
 * they are not in the page, its title, its metadata or its network traffic.
 * Once a visitor arrives through a shared link the customer view is remembered
 * for the rest of the browser-tab session, so moving between pages or deleting
 * `?s=1` from the address bar does not reveal anything.
 */
export const CUSTOMER_PARAM = 's';
const SESSION_KEY = 'angkor.customerView';

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Decided once, before first render, so branding/contacts are never fetched by mistake. */
function initialCustomerView(): boolean {
  const fromUrl = new URLSearchParams(window.location.search).get(CUSTOMER_PARAM) === '1';
  const customer = fromUrl || readSession();
  if (customer) {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* private mode etc. — the URL parameter still carries the setting */
    }
  }
  return customer;
}

/**
 * The one public address of the catalogue. Share links always use it, even when
 * the page is opened from a Vercel preview URL. Override with VITE_SITE_URL.
 * (On localhost, links use the local address so the site can be tested.)
 */
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://angkorprintngmenu.vercel.app').replace(/\/+$/, '');

function shareOrigin(): string {
  const { hostname, origin } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' ? origin : SITE_URL;
}

/** The link a wholesaler sends to a customer. */
export function buildShareUrl(path: string, lang: Lang): string {
  const url = new URL(path, shareOrigin());
  url.searchParams.set(CUSTOMER_PARAM, '1');
  if (lang === 'km') url.searchParams.set(LANG_PARAM, 'km');
  return url.toString();
}

interface SiteState {
  /** True on pages opened from a wholesaler's shared link. */
  isCustomerView: boolean;
  /** Angkor Printing branding — null in the customer view. */
  brand: Brand | null;
  /** Contact details — null in the customer view, while loading, or if loading failed. */
  contacts: Contacts | null;
  /** Internal link that stays in the current view. */
  linkTo: (path: string) => string;
}

const SiteContext = createContext<SiteState | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [isCustomerView] = useState(initialCustomerView);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [contacts, setContacts] = useState<Contacts | null>(null);

  useEffect(() => {
    if (isCustomerView) return; // never request Angkor branding or contacts for customers
    fetchBrand().then(setBrand);
    fetchContacts()
      .then(setContacts)
      .catch((e) => console.warn('Could not load contact details', e));
  }, [isCustomerView]);

  // Wholesaler view: show the Angkor Printing logo as the browser-tab icon.
  // (index.html ships a neutral icon so customer pages carry no branding.)
  useEffect(() => {
    if (isCustomerView) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = logoSrc(brand);
  }, [isCustomerView, brand]);

  const value = useMemo<SiteState>(
    () => ({
      isCustomerView,
      brand: isCustomerView ? null : brand,
      contacts: isCustomerView ? null : contacts,
      linkTo: (path: string) => (isCustomerView ? `${path}${path.includes('?') ? '&' : '?'}${CUSTOMER_PARAM}=1` : path),
    }),
    [isCustomerView, brand, contacts],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteState {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}

/**
 * Keeps `?s=1` in the address bar in the customer view, so a link copied from the
 * browser is still a customer link.
 */
export function KeepCustomerParam() {
  const { isCustomerView } = useSite();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCustomerView) return;
    const params = new URLSearchParams(location.search);
    if (params.get(CUSTOMER_PARAM) === '1') return;
    params.set(CUSTOMER_PARAM, '1');
    navigate({ pathname: location.pathname, search: `?${params}`, hash: location.hash }, { replace: true });
  }, [isCustomerView, location, navigate]);

  return null;
}

export function logoSrc(brand: Brand): string {
  return brand.logo_url || '/logo.png';
}

export function brandName(brand: Brand, lang: Lang): string {
  return (lang === 'km' && brand.brand_name_km) || brand.brand_name;
}

export function brandTagline(brand: Brand, lang: Lang): string {
  return (lang === 'km' && brand.tagline_km) || brand.tagline;
}

/** Sets the browser tab title. Customer pages never include the brand name. */
export function usePageTitle(title: string | null) {
  const { brand } = useSite();
  useEffect(() => {
    if (title === null) return;
    document.title = brand ? `${title} — ${brand.brand_name}` : title;
  }, [title, brand]);
}
