import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import ProductImage from './ProductImage';

/** Index of the slide currently in view in a horizontal scroll-snap track. */
function useSlideIndex(track: RefObject<HTMLDivElement | null>) {
  const [index, setIndex] = useState(0);
  const onScroll = useCallback(() => {
    const el = track.current;
    if (el && el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, [track]);
  const goTo = useCallback(
    (i: number, smooth = true) => {
      const el = track.current;
      if (el) el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    },
    [track],
  );
  return { index, onScroll, goTo };
}

function Arrow({ dir, onClick, label, className = '' }: { dir: 'prev' | 'next'; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`focus-ring absolute top-1/2 -translate-y-1/2 rounded-full p-2 shadow-md ring-1 ring-black/10 active:scale-90 ${dir === 'prev' ? 'left-2' : 'right-2'} ${className}`}
    >
      {dir === 'prev' ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </button>
  );
}

function Dots({ count, index, onPick, light }: { count: number; index: number; onPick: (i: number) => void; light?: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          aria-label={t.showPhoto(i + 1)}
          aria-current={i === index}
          className={`h-2 rounded-full transition-all ${i === index ? 'w-5' : 'w-2'} ${
            light ? (i === index ? 'bg-white' : 'bg-white/40') : i === index ? 'bg-brand-blue-dark' : 'bg-slate-300'
          }`}
        />
      ))}
    </div>
  );
}

/** Full-screen photo viewer: swipe, arrows, keyboard, shows the whole photo (no cropping). */
function Lightbox({ images, name, start, onClose }: { images: string[]; name: string; start: number; onClose: (index: number) => void }) {
  const { t } = useLang();
  const track = useRef<HTMLDivElement>(null);
  const { index, onScroll, goTo } = useSlideIndex(track);
  const many = images.length > 1;

  useEffect(() => {
    goTo(start, false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [goTo, start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(index);
      if (e.key === 'ArrowLeft') goTo(Math.max(0, index - 1));
      if (e.key === 'ArrowRight') goTo(Math.min(images.length - 1, index + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, images.length, goTo, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
        <span>{many ? t.photoOf(index + 1, images.length) : name}</span>
        <button type="button" onClick={() => onClose(index)} aria-label={t.close} className="focus-ring rounded-full p-2 text-white hover:bg-white/10">
          <X size={24} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto">
          {images.map((src, i) => (
            <div key={src} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-2">
              <img src={src} alt={`${name} ${i + 1}`} className="max-h-full max-w-full object-contain" loading={Math.abs(i - start) <= 1 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>
        {many && index > 0 && <Arrow dir="prev" onClick={() => goTo(index - 1)} label={t.previousPhoto} className="hidden bg-white/90 text-ink sm:block" />}
        {many && index < images.length - 1 && (
          <Arrow dir="next" onClick={() => goTo(index + 1)} label={t.nextPhoto} className="hidden bg-white/90 text-ink sm:block" />
        )}
      </div>

      {many && (
        <div className="py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Dots count={images.length} index={index} onPick={(i) => goTo(i)} light />
        </div>
      )}
    </div>
  );
}

/**
 * Product photos in landscape (4:3). Swipe or use the arrows to move between
 * photos; tap to open the full-screen viewer, which shows the whole photo.
 */
export default function Gallery({ images, name, initialsFrom }: { images: string[]; name: string; initialsFrom: string }) {
  const { t } = useLang();
  const track = useRef<HTMLDivElement>(null);
  const { index, onScroll, goTo } = useSlideIndex(track);
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  const many = images.length > 1;

  // Reset when moving to another product.
  useEffect(() => goTo(0, false), [images, goTo]);

  if (!images.length) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <ProductImage name={name} initialsFrom={initialsFrom} comingSoon={t.photoComingSoon} eager />
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setZoomAt(i)}
              aria-label={`${t.tapToEnlarge}: ${t.photoOf(i + 1, images.length)}`}
              className="aspect-[4/3] w-full shrink-0 cursor-zoom-in snap-center"
            >
              <ProductImage src={src} name={`${name} ${i + 1}`} eager={i === 0} />
            </button>
          ))}
        </div>

        <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          <Maximize2 size={13} aria-hidden />
          {many ? `${index + 1} / ${images.length}` : t.tapToEnlarge}
        </span>

        {many && index > 0 && <Arrow dir="prev" onClick={() => goTo(index - 1)} label={t.previousPhoto} className="hidden bg-white/90 text-ink md:block" />}
        {many && index < images.length - 1 && (
          <Arrow dir="next" onClick={() => goTo(index + 1)} label={t.nextPhoto} className="hidden bg-white/90 text-ink md:block" />
        )}
      </div>

      {many && (
        <>
          <div className="mt-3 md:hidden">
            <Dots count={images.length} index={index} onPick={(i) => goTo(i)} />
          </div>
          <div className="no-scrollbar mt-3 hidden gap-2 overflow-x-auto md:flex">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t.showPhoto(i + 1)}
                aria-current={i === index}
                className={`focus-ring aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl ring-2 ${i === index ? 'ring-brand-blue' : 'ring-transparent opacity-70 hover:opacity-100'}`}
              >
                <ProductImage src={src} name={t.showPhoto(i + 1)} />
              </button>
            ))}
          </div>
        </>
      )}

      {zoomAt !== null && (
        <Lightbox
          images={images}
          name={name}
          start={zoomAt}
          onClose={(i) => {
            setZoomAt(null);
            goTo(i, false);
          }}
        />
      )}
    </div>
  );
}
