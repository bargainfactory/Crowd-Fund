import { appWithTranslation } from 'next-i18next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { DefaultSeo } from 'next-seo';
import '../styles/globals.css';

function App({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => page);

  return (
    <>
      <DefaultSeo
        titleTemplate="%s | CrowdfundAfrica"
        defaultTitle="CrowdfundAfrica - Crowdfunding for Communities"
        description="A multilingual crowdfunding platform connecting communities across Africa and the world. Support campaigns for education, health, infrastructure, and more."
        openGraph={{
          type: 'website',
          locale: 'en_US',
          url: 'https://crowdfundafrica.com/',
          siteName: 'CrowdfundAfrica',
          images: [{ url: 'https://crowdfundafrica.com/og-image.jpg', width: 1200, height: 630 }]
        }}
        twitter={{ handle: '@crowdfundafrica', site: '@crowdfundafrica', cardType: 'summary_large_image' }}
        additionalLinkTags={[
          { rel: 'icon', href: '/favicon.ico' },
          { rel: 'apple-touch-icon', href: '/icons/icon-192x192.png' },
          { rel: 'manifest', href: '/manifest.json' },
          { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
          { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' }
        ]}
        additionalMetaTags={[
          { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
          { name: 'theme-color', content: '#16a34a' },
          { name: 'mobile-web-app-capable', content: 'yes' },
          { name: 'apple-mobile-web-app-capable', content: 'yes' },
          { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
          { name: 'apple-mobile-web-app-title', content: 'CrowdfundAfrica' }
        ]}
      />

      <AuthProvider>
        <CurrencyProvider>
          {getLayout(<Component {...pageProps} />)}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '12px', background: '#fff', color: '#111', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
              success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
              error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } }
            }}
          />
        </CurrencyProvider>
      </AuthProvider>
    </>
  );
}

export default appWithTranslation(App);
