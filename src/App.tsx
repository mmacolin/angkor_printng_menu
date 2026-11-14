import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { KeepContactParam, SiteProvider } from './lib/site';
import Header from './components/Header';
import Footer from './components/Footer';
import CataloguePage from './pages/CataloguePage';
import ProductPage from './pages/ProductPage';
import NotFound from './pages/NotFound';

// The admin dashboard is loaded only when someone visits /admin,
// so it adds nothing to the public catalogue's download size.
const AdminApp = lazy(() => import('./admin/AdminApp'));

function PublicSite() {
  return (
    <SiteProvider>
      <KeepContactParam />
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<CataloguePage />} />
            <Route path="/p/:slug" element={<ProductPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </SiteProvider>
  );
}

export default function App() {
  const { pathname } = useLocation();

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading…</div>}>
        <AdminApp />
      </Suspense>
    );
  }

  return <PublicSite />;
}
