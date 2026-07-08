import { Html, Head, Main, NextScript } from 'next/document';

export default function Document(props) {
  // Reflect the active i18n locale so screen readers, search engines and
  // right-to-left languages (Arabic) render correctly.
  const locale = props?.__NEXT_DATA__?.locale || 'en';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <Html lang={locale} dir={dir}>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="application-name" content="CrowdfundAfrica" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#16a34a" />
        <meta name="msapplication-tap-highlight" content="no" />
      </Head>
      <body className="min-h-screen bg-gray-50">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
