import type { ReactNode } from 'react';
import { Globe, Mail, MapPin, MessageCircle, Phone, Send, ThumbsUp } from 'lucide-react';
import { useSite } from '../lib/site';
import type { Contacts } from '../lib/types';

interface Item {
  key: keyof Contacts;
  label: string;
  value: string;
  href: string;
  icon: ReactNode;
}

const digits = (s: string) => s.replace(/[^\d]/g, '');
const withProtocol = (s: string) => (/^https?:\/\//i.test(s) ? s : `https://${s}`);

function buildItems(c: Contacts): Item[] {
  const items: Item[] = [];
  if (c.whatsapp) items.push({ key: 'whatsapp', label: 'WhatsApp', value: c.whatsapp, href: `https://wa.me/${digits(c.whatsapp)}`, icon: <MessageCircle size={18} /> });
  if (c.telegram) {
    const handle = c.telegram.replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '');
    items.push({ key: 'telegram', label: 'Telegram', value: `@${handle}`, href: `https://t.me/${handle}`, icon: <Send size={18} /> });
  }
  if (c.phone) items.push({ key: 'phone', label: 'Call', value: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, '')}`, icon: <Phone size={18} /> });
  if (c.email) items.push({ key: 'email', label: 'Email', value: c.email, href: `mailto:${c.email}`, icon: <Mail size={18} /> });
  if (c.facebook) items.push({ key: 'facebook', label: 'Facebook', value: c.facebook.replace(/^https?:\/\/(www\.)?/i, ''), href: withProtocol(c.facebook), icon: <ThumbsUp size={18} /> });
  if (c.website) items.push({ key: 'website', label: 'Website', value: c.website.replace(/^https?:\/\//i, ''), href: withProtocol(c.website), icon: <Globe size={18} /> });
  if (c.address)
    items.push({
      key: 'address',
      label: 'Address',
      value: c.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`,
      icon: <MapPin size={18} />,
    });
  return items;
}

/**
 * Angkor Printing's direct contact details.
 * Renders nothing on pages opened from a "Hide Angkor Printing Contact" link.
 */
export default function ContactLinks({ variant }: { variant: 'footer' | 'product' }) {
  const { contacts, contactsHidden, brand } = useSite();
  if (contactsHidden || !contacts) return null;

  const items = buildItems(contacts);
  if (!items.length) return null;

  if (variant === 'product') {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Contact {brand.brand_name}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items
            .filter((i) => i.key !== 'address')
            .map((i) => (
              <a
                key={i.key}
                href={i.href}
                target={i.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-3 py-2.5 text-sm font-semibold text-white active:scale-95"
              >
                {i.icon}
                {i.label}
              </a>
            ))}
        </div>
      </section>
    );
  }

  return (
    <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
      {items.map((i) => (
        <li key={i.key}>
          <a
            href={i.href}
            target={i.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="focus-ring inline-flex items-start gap-2 rounded hover:text-brand-blue-dark"
          >
            <span className="mt-0.5 text-brand-blue">{i.icon}</span>
            <span className="break-words">{i.value}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
