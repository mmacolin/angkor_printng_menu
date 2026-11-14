import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Upload } from 'lucide-react';
import { fetchBrand, fetchContacts, removeStoredImages, saveBrand, saveContacts, uploadImage } from '../lib/api';
import type { Brand, Contacts } from '../lib/types';
import { Button, Field, inputClass } from './ui';

interface Props {
  notify: (text: string) => void;
  notifyError: (e: unknown) => void;
}

const CONTACT_FIELDS: { key: keyof Contacts; label: string; placeholder: string; hint?: string }[] = [
  { key: 'phone', label: 'Phone', placeholder: '+855 12 345 678' },
  { key: 'whatsapp', label: 'WhatsApp number', placeholder: '85512345678', hint: 'Country code + number, digits only.' },
  { key: 'telegram', label: 'Telegram username', placeholder: 'angkorprinting', hint: 'Without the @.' },
  { key: 'email', label: 'Email', placeholder: 'sales@example.com' },
  { key: 'facebook', label: 'Facebook page', placeholder: 'facebook.com/yourpage' },
  { key: 'website', label: 'Website', placeholder: 'www.example.com' },
];

export default function BrandingTab({ notify, notifyError }: Props) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [contacts, setContacts] = useState<Contacts | null>(null);
  const [savedLogo, setSavedLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetchBrand(), fetchContacts()])
      .then(([b, c]) => {
        setBrand(b);
        setSavedLogo(b.logo_url);
        setContacts(c);
      })
      .catch(notifyError);
  }, [notifyError]);

  if (!brand || !contacts) return <p className="mt-8 text-center text-slate-500">Loading…</p>;

  const onLogo = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return notifyError(new Error('Logo must be smaller than 2 MB.'));
    setUploading(true);
    try {
      const url = await uploadImage(file, 'brand');
      setBrand((b) => (b ? { ...b, logo_url: url } : b));
    } catch (e) {
      notifyError(e);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await Promise.all([saveBrand(brand), saveContacts(contacts)]);
      if (savedLogo && savedLogo !== brand.logo_url) await removeStoredImages([savedLogo]);
      setSavedLogo(brand.logo_url);
      notify('Branding and contact details saved');
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-ink">Branding</h2>
          <p className="text-sm text-slate-500">
            Shown to wholesalers on the normal catalogue. Automatically hidden on links wholesalers share with their customers.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <img src={brand.logo_url || '/logo.png'} alt="Current logo" className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200" />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload new logo'}
            </Button>
            {brand.logo_url && (
              <Button variant="ghost" onClick={() => setBrand({ ...brand, logo_url: null })}>
                <RotateCcw size={16} /> Use default logo
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLogo(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <Field label="Brand name" hint="Required. Shown to wholesalers only.">
          <input value={brand.brand_name} onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })} placeholder="Angkor Printing" className={inputClass} />
        </Field>
        <Field label="Brand name in Khmer" hint="Optional. Shown when the site is set to ខ្មែរ.">
          <input value={brand.brand_name_km} onChange={(e) => setBrand({ ...brand, brand_name_km: e.target.value })} lang="km" className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tagline" hint="Short line under the brand name, e.g. “Product Catalogue”.">
            <input value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Tagline in Khmer">
            <input value={brand.tagline_km} onChange={(e) => setBrand({ ...brand, tagline_km: e.target.value })} lang="km" placeholder="កាតាឡុកផលិតផល" className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-ink">Contact details</h2>
          <p className="text-sm text-slate-500">
            Shown to wholesalers. Automatically hidden — and never sent to the browser — on links wholesalers share with customers. Leave a field empty
            to not show it.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTACT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <input value={contacts[f.key]} onChange={(e) => setContacts({ ...contacts, [f.key]: e.target.value })} placeholder={f.placeholder} className={inputClass} />
            </Field>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address">
            <textarea value={contacts.address} onChange={(e) => setContacts({ ...contacts, address: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Address in Khmer">
            <textarea value={contacts.address_km} onChange={(e) => setContacts({ ...contacts, address_km: e.target.value })} rows={2} lang="km" className={inputClass} />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
        <Button onClick={save} disabled={busy || uploading}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
