import { useCallback, useState } from 'react';
import { ShopProvider } from './context/shop';
import type { CategoryId } from './data/catalog';
import { Hero } from './components/Hero';
import { Feed, Results } from './components/Sections';
import { ProductModal } from './components/ProductModal';
import { Drawer } from './components/Drawer';
import {
  AppBanner,
  CookieBanner,
  FloatingSearch,
  Footer,
  MobileNav,
  Sidebar,
  ToastHost,
} from './components/chrome';

function hasCookieChoice() {
  try {
    return window.localStorage.getItem('shop:cookies') !== null;
  } catch {
    return true;
  }
}

function Shell() {
  const [banner, setBanner] = useState(true);
  const [cookieOpen, setCookieOpen] = useState(() => !hasCookieChoice());

  const scrollToCategory = useCallback((id: CategoryId) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      {banner && <AppBanner onClose={() => setBanner(false)} />}

      <div className="flex">
        <Sidebar />

        {/* Canvas gutter → white surface sheet → dark footer sheet */}
        <div className="min-w-0 flex-1 p-2 pb-[84px] md:pb-2 md:pl-0">
          <main className="overflow-clip rounded-card bg-white">
            <div className="mx-auto max-w-[1200px] px-4 pb-20 sm:px-6 lg:px-10 lg:pb-24">
              <Hero onCategory={scrollToCategory} />
              <div className="mt-16 space-y-16 lg:mt-20 lg:space-y-20">
                <Results />
                <Feed />
              </div>
            </div>
          </main>
          <Footer onCategory={scrollToCategory} onCookiePrefs={() => setCookieOpen(true)} />
        </div>
      </div>

      <MobileNav />
      <FloatingSearch />
      <ProductModal />
      <Drawer />
      <ToastHost />
      {cookieOpen && <CookieBanner onClose={() => setCookieOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <Shell />
    </ShopProvider>
  );
}
