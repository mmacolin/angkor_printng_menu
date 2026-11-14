import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ExternalLink, LogOut, Package, Palette, Tags } from 'lucide-react';
import { isDemoMode, supabase } from '../lib/supabase';
import { Button, Field, inputClass, Toast, errorText, type ToastMessage } from './ui';
import ProductsTab from './ProductsTab';
import CategoriesTab from './CategoriesTab';
import BrandingTab from './BrandingTab';

type Tab = 'products' | 'categories' | 'branding';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-5 flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-12 w-12 rounded-xl" />
          <div>
            <p className="font-extrabold text-brand-blue-dark">Angkor Printing</p>
            <p className="text-xs text-slate-500">Team admin</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
  };

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-xl font-bold text-ink">Sign in</h1>
        <Field label="Email">
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Shell>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('products');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => setToast({ text, tone }), []);
  const notifyError = useCallback((e: unknown) => notify(errorText(e), 'error'), [notify]);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    document.title = 'Admin — Angkor Printing';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setIsAdmin(undefined);
      return;
    }
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => setIsAdmin(!error && !!data));
  }, [session]);

  if (isDemoMode) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-ink">Admin is not connected yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          The catalogue is showing placeholder products. To manage real products, create a Supabase project and add{' '}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> to your environment. See the README for step-by-step
          instructions.
        </p>
      </Shell>
    );
  }

  if (session === undefined || (session && isAdmin === undefined)) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }

  if (!session) return <Login />;

  if (!isAdmin) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-ink">No admin access</h1>
        <p className="mt-2 text-sm text-slate-600">
          You are signed in as <strong>{session.user.email}</strong>, but this account has not been given admin access. Ask the account owner
          to add you (see README → “Add team members”).
        </p>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => supabase!.auth.signOut()}>
          Sign out
        </Button>
      </Shell>
    );
  }

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'products', label: 'Products', icon: <Package size={18} /> },
    { id: 'categories', label: 'Categories', icon: <Tags size={18} /> },
    { id: 'branding', label: 'Branding & contact', icon: <Palette size={18} /> },
  ];

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg" />
          <div className="min-w-0 leading-tight">
            <p className="font-extrabold text-brand-blue-dark">Catalogue admin</p>
            <p className="truncate text-xs text-slate-500">{session.user.email}</p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring ml-auto hidden items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-blue-dark hover:bg-slate-100 sm:inline-flex"
          >
            <ExternalLink size={15} /> View catalogue
          </a>
          <Button variant="ghost" onClick={() => supabase!.auth.signOut()} className="ml-auto px-3 sm:ml-0">
            <LogOut size={16} /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`focus-ring inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold ${
                tab === t.id ? 'border-brand-blue-dark text-brand-blue-dark' : 'border-transparent text-slate-500 hover:text-ink'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {tab === 'products' && <ProductsTab notify={notify} notifyError={notifyError} />}
        {tab === 'categories' && <CategoriesTab notify={notify} notifyError={notifyError} />}
        {tab === 'branding' && <BrandingTab notify={notify} notifyError={notifyError} />}
      </main>

      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
