import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-brand-blue-dark text-white hover:bg-brand-blue',
    secondary: 'bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30';

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export type ToastMessage = { text: string; tone: 'success' | 'error' };

export function Toast({ message, onDone }: { message: ToastMessage | null; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone();
    }, message.tone === 'error' ? 6000 : 2500);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message || !visible) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
        message.tone === 'error' ? 'bg-red-600' : 'bg-emerald-600'
      }`}
    >
      {message.text}
    </div>
  );
}

export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Please try again.';
}
