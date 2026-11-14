import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

/** Type a value and press Enter (or comma) to add it. Tap × to remove. */
export default function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const parts = raw
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
    if (parts.length) onChange([...value, ...parts]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-1.5 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/30">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-brand-blue/10 py-1 pl-2.5 pr-1 text-sm font-medium text-brand-blue-dark">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="rounded p-0.5 hover:bg-brand-blue/20">
            <X size={14} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? 'Add another…' : placeholder}
        enterKeyHint="done"
        className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-[15px] outline-none"
      />
    </div>
  );
}
