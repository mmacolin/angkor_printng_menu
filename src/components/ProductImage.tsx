import { Printer } from 'lucide-react';

const PALETTES = [
  ['#5792cc', '#2f6aa6'],
  ['#f8c327', '#e0aa0c'],
  ['#6aa5dd', '#5792cc'],
  ['#2f6aa6', '#1e4f80'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Product photo, or a branded placeholder tile when no photo has been uploaded yet. */
export default function ProductImage({
  src,
  name,
  className = '',
  eager = false,
}: {
  src?: string;
  name: string;
  className?: string;
  eager?: boolean;
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

  const [from, to] = PALETTES[hash(name) % PALETTES.length];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div
      role="img"
      aria-label={`${name} (photo coming soon)`}
      className={`flex h-full w-full flex-col items-center justify-center gap-1 text-white ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <Printer size={28} className="opacity-80" aria-hidden />
      <span className="text-2xl font-extrabold tracking-wider">{initials}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest opacity-80">Photo coming soon</span>
    </div>
  );
}
