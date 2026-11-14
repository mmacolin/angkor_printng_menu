import { useEffect, useId, useState } from 'react';
import { Check, Copy, EyeOff, ExternalLink, Send, Share2, X } from 'lucide-react';
import { buildShareUrl } from '../lib/site';
import { useLang } from '../lib/i18n';

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
 * Wholesaler-only. Every link created here opens the customer view:
 * same products, no Angkor Printing name, logo or contact details.
 */
export default function ShareDialog({
  kind,
  path,
  title,
  onClose,
}: {
  kind: 'product' | 'catalogue';
  path: string;
  /** Text sent along with the link. Must not contain the brand name. */
  title: string;
  onClose: () => void;
}) {
  const { lang, t } = useLang();
  const [copied, setCopied] = useState(false);
  const titleId = useId();

  const url = buildShareUrl(path, lang);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {kind === 'product' ? t.shareTitleProduct : t.shareTitleCatalogue}
            </h2>
            {kind === 'product' && <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{title}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t.close} className="focus-ring -m-1 rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
          <EyeOff size={18} className="mt-0.5 shrink-0 text-brand-blue-dark" aria-hidden />
          {t.shareExplainer}
        </p>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-slate-500">{t.linkToShare}</p>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={t.linkToShare}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white active:scale-95 ${copied ? 'bg-emerald-600' : 'bg-brand-blue-dark'}`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? t.copied : t.copy}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="focus-ring col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-yellow px-3 py-2.5 text-sm font-bold text-ink active:scale-95"
            >
              <Share2 size={16} /> {t.shareVia}
            </button>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`}
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
            <ExternalLink size={15} /> {t.preview}
          </a>
        </div>
      </div>
    </div>
  );
}
