import { useEffect, useId, useState } from 'react';
import { Check, Copy, ExternalLink, EyeOff, Lock, Send, Share2, X } from 'lucide-react';
import { buildShareUrl, useSite } from '../lib/site';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older mobile browsers / non-secure contexts.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

/**
 * Lets a wholesaler copy/share a product or the full catalogue, optionally hiding
 * Angkor Printing's contact details on the shared page.
 */
export default function ShareDialog({
  kind,
  path,
  title,
  onClose,
}: {
  kind: 'product' | 'catalogue';
  path: string;
  title: string;
  onClose: () => void;
}) {
  const { contactsHidden } = useSite();
  // If this page is already a hidden-contact page, any link shared onward stays hidden.
  const [hideContact, setHideContact] = useState(contactsHidden);
  const [copied, setCopied] = useState(false);
  const toggleId = useId();

  const url = buildShareUrl(path, contactsHidden || hideContact);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => setCopied(false), [url]);

  const handleCopy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* user cancelled */
    }
  };

  const shareText = encodeURIComponent(`${title}\n${url}`);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${toggleId}-title`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={`${toggleId}-title`} className="text-lg font-bold text-ink">
              {kind === 'product' ? 'Share this product' : 'Share the full catalogue'}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="focus-ring -m-1 rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Hide contact toggle */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
          <label htmlFor={toggleId} className={`flex items-center gap-3 ${contactsHidden ? '' : 'cursor-pointer'}`}>
            <EyeOff size={20} className="shrink-0 text-brand-blue-dark" aria-hidden />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-ink">Hide Angkor Printing Contact</span>
              <span className="block text-xs text-slate-500">
                {contactsHidden
                  ? 'This page already hides contact details, so links shared from here stay hidden.'
                  : 'Your customer will see products and branding, but no phone, WhatsApp, Telegram, email or address.'}
              </span>
            </span>
            {contactsHidden ? (
              <Lock size={18} className="shrink-0 text-slate-400" aria-label="Locked on" />
            ) : (
              <span className="relative inline-flex shrink-0 items-center">
                <input
                  id={toggleId}
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={hideContact}
                  onChange={(e) => setHideContact(e.target.checked)}
                />
                <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-brand-blue-dark peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-blue" />
                <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </span>
            )}
          </label>
        </div>

        {/* Link */}
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Link to share</p>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Share link"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white active:scale-95 ${copied ? 'bg-emerald-600' : 'bg-brand-blue-dark'}`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Share targets */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="focus-ring col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-yellow px-3 py-2.5 text-sm font-bold text-ink active:scale-95"
            >
              <Share2 size={16} /> Share via…
            </button>
          )}
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-ink active:scale-95"
          >
            WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-ink active:scale-95"
          >
            <Send size={16} /> Telegram
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-blue-dark hover:underline"
          >
            <ExternalLink size={15} /> Preview what your customer sees
          </a>
        </div>
      </div>
    </div>
  );
}
