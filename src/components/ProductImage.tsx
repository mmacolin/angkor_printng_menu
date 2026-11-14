import { Printer } from 'lucide-react';

// Neutral colours (no brand yellow), as these tiles also appear in the customer view.
const PALETTES = [
  ['#5792cc', '#2f6aa6'],
  ['#64748b', '#475569'],
  ['#6aa5dd', '#5792cc'],
  ['#2f6aa6', '#1e4f80'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Product photo, or a neutral placeholder tile when no photo has been uploaded yet. */
export default function ProductImage({
  src,
  name,
  className = '',
  eager = false,
  comingSoon = 'Photo coming soon',
  initialsFrom,
}: {
  src?: string;
  name: string;
  className?: string;
  eager?: boolean;
  comingSoon?: string;
  /** Text used for the placeholder initials and colour (defaults to `name`). Pass the English name so Khmer view looks the same. */
  initialsFrom?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-full w-full bg-slate-100 object-cover ${className}`}
      />
    );
  }

  const seed = initialsFrom ?? name;
  const [from, to] = PALETTES[hash(seed) % PALETTES.length];
  const initials = seed
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div
      role="img"
      aria-label={`${name} (${comingSoon})`}
      className={`flex h-full w-full flex-col items-center justify-center gap-1 text-white ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <Printer size={28} className="opacity-80" aria-hidden />
      <span className="text-2xl font-extrabold tracking-wider">{initials}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest opacity-80">{comingSoon}</span>
    </div>
  );
}
