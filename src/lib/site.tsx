import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_BRAND, fetchBrand, fetchContacts } from './api';
import type { Brand, Contacts } from './types';

/**
 * Contact visibility for shared links.
 *
 * A link generated with "Hide Angkor Printing Contact" switched on carries `?hc=1`.
 * Once a visitor arrives through such a link, the choice is remembered for the rest
 * of the browser-tab session, so moving between pages (or clearing the query string)
 * keeps contacts hidden. In hidden mode the contact details are never requested from
 * the server, so they are not present in the page, its metadata or network responses.
 */
export const HIDE_CONTACT_PARAM = 'hc';
const SESSION_KEY = 'angkor.hideContact';

function readHiddenFromUrl(search: string): boolean {
  return new URLSearchParams(search).get(HIDE_CONTACT_PARAM) === '1';
}

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* private mode etc. — the URL parameter still carries the setting */
  }
}

/** Decided once, before first render, so contacts are never fetched by mistake. */
function initialContactsHidden(): boolean {
  const hidden = readHiddenFromUrl(window.location.search) || readSession();
  if (hidden) writeSession();
  return hidden;
}

/** Builds an absolute share URL for a public path. */
export function buildShareUrl(path: string, hideContact: boolean): string {
  const url = new URL(path, window.location.origin);
  if (hideContact) url.searchParams.set(HIDE_CONTACT_PARAM, '1');
  else url.searchParams.delete(HIDE_CONTACT_PARAM);
  return url.toString();
}

interface SiteState {
  brand: Brand;
  contactsHidden: boolean;
  /** null while loading, when hidden, or if loading failed. */
  contacts: Contacts | null;
  /** Internal link that preserves the hidden-contact setting. */
  linkTo: (path: string) => string;
}

const SiteContext = createContext<SiteState | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [contactsHidden] = useState(initialContactsHidden);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [contacts, setContacts] = useState<Contacts | null>(null);

  useEffect(() => {
    fetchBrand().then(setBrand);
  }, []);

  useEffect(() => {
    if (contactsHidden) return; // never request contact data on a hidden-contact page
    fetchContacts()
      .then(setContacts)
      .catch((e) => console.warn('Could not load contact details', e));
  }, [contactsHidden]);

  const value = useMemo<SiteState>(
    () => ({
      brand,
      contactsHidden,
      contacts: contactsHidden ? null : contacts,
      linkTo: (path: string) => (contactsHidden ? `${path}${path.includes('?') ? '&' : '?'}${HIDE_CONTACT_PARAM}=1` : path),
    }),
    [brand, contactsHidden, contacts],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteState {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}

/**
 * Keeps `?hc=1` in the address bar on hidden-contact pages, so that if a customer
 * copies the URL from the browser, the link they pass on still hides contacts.
 */
export function KeepContactParam() {
  const { contactsHidden } = useSite();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!contactsHidden) return;
    const params = new URLSearchParams(location.search);
    if (params.get(HIDE_CONTACT_PARAM) === '1') return;
    params.set(HIDE_CONTACT_PARAM, '1');
    navigate({ pathname: location.pathname, search: `?${params}`, hash: location.hash }, { replace: true });
  }, [contactsHidden, location, navigate]);

  return null;
}

export function logoSrc(brand: Brand): string {
  return brand.logo_url || '/logo.png';
}
