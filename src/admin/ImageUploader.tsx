import { useRef, useState, type DragEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { uploadImage } from '../lib/api';

const MAX_BYTES = 5 * 1024 * 1024;

/** Drag-and-drop (or tap to choose) photo uploader. The first photo is the cover image. */
export default function ImageUploader({
  images,
  onChange,
  onUploaded,
  onError,
}: {
  images: string[];
  /** Reorder / remove. */
  onChange: (images: string[]) => void;
  /** Called with each newly uploaded URL; the form appends it (and can clean up if the edit is cancelled). */
  onUploaded: (url: string) => void;
  onError: (e: unknown) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const tooBig = list.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) onError(new Error(`${tooBig.map((f) => f.name).join(', ')} is larger than 5 MB. Please use a smaller photo.`));
    const ok = list.filter((f) => f.size <= MAX_BYTES);
    if (!ok.length) return;

    setUploading((n) => n + ok.length);
    for (const file of ok) {
      try {
        onUploaded(await uploadImage(file));
      } catch (e) {
        onError(e);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className={`focus-ring flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragging ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
        }`}
      >
        {uploading > 0 ? <Loader2 className="animate-spin text-brand-blue" size={28} /> : <ImagePlus className="text-brand-blue" size={28} />}
        <p className="mt-2 text-sm font-semibold text-ink">{uploading > 0 ? `Uploading ${uploading} photo${uploading > 1 ? 's' : ''}…` : 'Drag photos here or tap to choose'}</p>
        <p className="mt-0.5 text-xs text-slate-500">JPG, PNG or WebP · up to 5 MB each · square photos look best</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, i) => (
            <li key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-bold text-ink">
                  <Star size={10} fill="currentColor" /> Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move left" className="rounded-md bg-white/90 p-1 disabled:opacity-30">
                    <ArrowLeft size={14} />
                  </button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label="Move right" className="rounded-md bg-white/90 p-1 disabled:opacity-30">
                    <ArrowRight size={14} />
                  </button>
                </div>
                <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label="Remove photo" className="rounded-md bg-white/90 p-1 text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
