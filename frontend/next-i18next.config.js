/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'es', 'ar', 'wo'],
    localeDetection: true
  },
  defaultNS: 'common',
  localePath: './src/locales',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  react: { useSuspense: false }
};
