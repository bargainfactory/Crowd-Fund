import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import {
  Globe, Menu, X, ChevronDown, Bell, User, LogOut,
  LayoutDashboard, Shield, Plus, Heart, Search
} from 'lucide-react';
import clsx from 'clsx';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'wo', name: 'Wolof', flag: '🇸🇳' }
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'XOF', 'NGN', 'KES', 'GHS', 'ZAR'];

export default function Header() {
  const { t, i18n } = useTranslation('common');
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const { currency, changeCurrency, currencies } = useCurrency();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdown, setLangDropdown] = useState(false);
  const [currencyDropdown, setCurrencyDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = () => {
      setLangDropdown(false);
      setCurrencyDropdown(false);
      setUserDropdown(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const switchLanguage = async (lang) => {
    const isRTL = LANGUAGES.find(l => l.code === lang)?.rtl;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    await router.push(router.pathname, router.asPath, { locale: lang });
    setLangDropdown(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/campaigns?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === router.locale) || LANGUAGES[0];

  const navLinks = [
    { href: '/campaigns', label: t('nav.campaigns', 'Campaigns') },
    { href: '/campaigns?category=community', label: t('nav.community', 'Community') },
    { href: '/campaigns?featured=true', label: t('nav.featured', 'Featured') }
  ];

  return (
    <header className={clsx(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white'
    )}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Crowdfund<span className="text-primary-600">Africa</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'text-sm font-medium transition-colors hover:text-primary-600',
                  router.pathname === href ? 'text-primary-600' : 'text-gray-700'
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('search.placeholder', 'Search campaigns...')}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-52 bg-gray-50"
                aria-label="Search campaigns"
              />
            </div>
          </form>

          {/* Right Controls */}
          <div className="hidden md:flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setLangDropdown(!langDropdown)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Change language"
                aria-expanded={langDropdown}
              >
                <Globe className="w-4 h-4" />
                <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                <ChevronDown className={clsx('w-3 h-3 transition-transform', langDropdown && 'rotate-180')} />
              </button>
              {langDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => switchLanguage(lang.code)}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2',
                        router.locale === lang.code && 'text-primary-600 font-medium'
                      )}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency Selector */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setCurrencyDropdown(!currencyDropdown)}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Change currency"
              >
                <span className="font-medium">{currency}</span>
                <ChevronDown className={clsx('w-3 h-3 transition-transform', currencyDropdown && 'rotate-180')} />
              </button>
              {currencyDropdown && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-60 overflow-y-auto scrollbar-thin">
                  {CURRENCIES.map(curr => (
                    <button
                      key={curr}
                      onClick={() => { changeCurrency(curr); setCurrencyDropdown(false); }}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-sm hover:bg-gray-50',
                        currency === curr && 'text-primary-600 font-medium bg-primary-50'
                      )}
                    >
                      {curr} {currencies[curr]?.symbol && `(${currencies[curr].symbol})`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth buttons / User menu */}
            {isAuthenticated ? (
              <>
                <Link
                  href="/campaigns/create"
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('nav.startCampaign', 'Start Campaign')}
                </Link>

                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setUserDropdown(!userDropdown)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                    aria-label="User menu"
                    aria-expanded={userDropdown}
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.firstName} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                    )}
                    <ChevronDown className={clsx('w-3 h-3 text-gray-500 transition-transform', userDropdown && 'rotate-180')} />
                  </button>

                  {userDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <Link href="/dashboard" onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <LayoutDashboard className="w-4 h-4" /> {t('nav.dashboard', 'Dashboard')}
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setUserDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50">
                          <Shield className="w-4 h-4" /> {t('nav.admin', 'Admin Panel')}
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" /> {t('nav.logout', 'Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                  {t('nav.login', 'Login')}
                </Link>
                <Link href="/auth/register"
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
                  {t('nav.register', 'Get Started')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-2 animate-slide-up">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('search.placeholder', 'Search campaigns...')}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
                />
              </div>
            </form>

            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                {label}
              </Link>
            ))}

            <div className="border-t border-gray-100 pt-2 mt-2">
              {/* Language options */}
              <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Language</p>
              <div className="flex flex-wrap gap-2 px-4 py-2">
                {LANGUAGES.map(lang => (
                  <button key={lang.code}
                    onClick={() => { switchLanguage(lang.code); setMobileMenuOpen(false); }}
                    className={clsx('px-3 py-1 text-xs rounded-full border transition-colors',
                      router.locale === lang.code ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-300')}>
                    {lang.flag} {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {isAuthenticated ? (
              <div className="border-t border-gray-100 pt-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-gray-700">Dashboard</Link>
                <Link href="/campaigns/create" onClick={() => setMobileMenuOpen(false)}
                  className="block mx-4 my-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl text-center">
                  + Start Campaign
                </Link>
                <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600">
                  Logout
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-2 flex flex-col gap-2 px-4">
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 text-sm font-medium text-gray-700 text-center border border-gray-200 rounded-xl">
                  Login
                </Link>
                <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl text-center">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
