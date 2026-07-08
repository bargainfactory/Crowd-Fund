import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';
import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function Layout({ children, title, description, noIndex = false }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  return (
    <>
      {title && (
        <Head>
          <title>{title} | CrowdfundAfrica</title>
          {description && <meta name="description" content={description} />}
          {noIndex && <meta name="robots" content="noindex,nofollow" />}
        </Head>
      )}

      <div className="flex flex-col min-h-screen">
        <Header />
        <main id="main-content" className="flex-1 pt-16">
          {children}
        </main>
        <Footer />
      </div>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="pwa-install-banner" role="banner" aria-label="Install app">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Install CrowdfundAfrica</p>
              <p className="text-xs text-gray-500">Add to home screen for offline access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg"
            >
              Install
            </button>
            <button onClick={dismissBanner} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Dismiss">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Helper for pages to use this layout
Layout.getLayout = (page) => <Layout>{page}</Layout>;
