import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Layout from '../components/layout/Layout';
import CampaignCard from '../components/campaigns/CampaignCard';
import { OrganizationJsonLd, WebSiteJsonLd } from '../components/seo/StructuredData';
import { campaignAPI } from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import {
  ArrowRight, Shield, Globe, Users, TrendingUp, Heart, Zap,
  MapPin, BarChart3, CheckCircle, Smartphone, Star
} from 'lucide-react';

const CATEGORIES = [
  { id: 'community', label: 'Community', emoji: '🏘️', color: 'from-green-400 to-green-600' },
  { id: 'education', label: 'Education', emoji: '📚', color: 'from-blue-400 to-blue-600' },
  { id: 'health', label: 'Health', emoji: '🏥', color: 'from-red-400 to-red-600' },
  { id: 'infrastructure', label: 'Infrastructure', emoji: '🏗️', color: 'from-yellow-400 to-yellow-600' },
  { id: 'disaster-relief', label: 'Disaster Relief', emoji: '🆘', color: 'from-orange-400 to-orange-600' },
  { id: 'agriculture', label: 'Agriculture', emoji: '🌾', color: 'from-lime-400 to-lime-600' }
];

export default function Home({ featuredCampaigns, stats }) {
  const { t } = useTranslation('common');
  const { format } = useCurrency();
  const [activeCategory, setActiveCategory] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);

  // Client-side geolocation / locale-based recommendation fetch
  useEffect(() => {
    let cancelled = false;

    const fetchRecommended = async () => {
      setGeoLoading(true);
      try {
        let country = undefined;
        let village = undefined;

        // Try to infer country from browser language
        if (typeof navigator !== 'undefined') {
          const lang = navigator.language || '';
          if (lang.startsWith('fr')) country = 'Senegal'; // sensible default for Francophone West Africa
        }

        const params = {};
        if (country) params.country = country;
        if (village) params.village = village;

        const { data } = await campaignAPI.getRecommended(params);
        if (!cancelled) {
          setRecommended(data.data || []);
        }
      } catch {
        if (!cancelled) setRecommended([]);
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    };

    fetchRecommended();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <NextSeo
        title="CrowdfundAfrica - Crowdfunding for Communities"
        description="Support causes that matter. Raise funds for community projects, education, health, and more across Africa and the world."
        canonical="https://crowdfundafrica.com/"
      />
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      <Layout>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white">
          <div className="absolute inset-0 africa-pattern opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-900/50" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-in">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm mb-6">
                  <Zap className="w-4 h-4 text-africa-gold" />
                  <span>Trusted by 50,000+ donors worldwide</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  {t('hero.title', 'Fund the Future of')}
                  <span className="block text-africa-gold">{t('hero.titleHighlight', 'Your Community')}</span>
                </h1>

                <p className="text-lg text-primary-100 mb-8 max-w-lg">
                  {t('hero.description', 'Join thousands raising money for community projects, education, health, and infrastructure across Africa and beyond.')}
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="/campaigns/create" className="btn-primary bg-white text-primary-700 hover:bg-primary-50 text-base px-8 py-4">
                    {t('hero.startCampaign', 'Start a Campaign')} <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <Link href="/campaigns" className="btn-secondary border-white/30 text-white hover:bg-white/10 text-base px-8 py-4">
                    {t('hero.exploreCampaigns', 'Explore Campaigns')}
                  </Link>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-8 mt-10 pt-8 border-t border-white/20">
                  {[
                    { label: 'Raised', value: `$${((stats?.totalRaised || 2400000) / 1000000).toFixed(1)}M+` },
                    { label: 'Donors', value: `${((stats?.totalDonors || 50000) / 1000).toFixed(0)}K+` },
                    { label: 'Campaigns', value: `${(stats?.totalCampaigns || 1200)}+` },
                    { label: 'Countries', value: '40+' }
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-2xl font-bold text-white">{value}</p>
                      <p className="text-sm text-primary-200">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero image / campaign preview */}
              <div className="hidden lg:block relative">
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-1 border border-white/20">
                  {featuredCampaigns?.[0] && (
                    <div className="bg-white rounded-2xl overflow-hidden">
                      <div className="relative aspect-video bg-gray-100">
                        {featuredCampaigns[0].coverImage && (
                          <Image
                            src={featuredCampaigns[0].coverImage}
                            alt={featuredCampaigns[0].title}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="p-5">
                        <span className="badge-green text-xs mb-2 inline-block">Featured Campaign</span>
                        <h3 className="font-bold text-gray-900 mb-2">{featuredCampaigns[0].title}</h3>
                        <div className="progress-bar mb-2">
                          <div className="progress-bar-fill" style={{ width: `${featuredCampaigns[0].progressPercentage}%` }} />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-primary-600">
                            {featuredCampaigns[0].progressPercentage}% funded
                          </span>
                          <span className="text-gray-500">{featuredCampaigns[0].donorCount} donors</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Floating donation notification */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 max-w-xs animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-green-600 fill-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Just donated</p>
                    <p className="text-sm font-semibold text-gray-900">Amara from Dakar donated $25</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="section-title">{t('features.title', 'Why CrowdfundAfrica?')}</h2>
              <p className="section-subtitle mx-auto">{t('features.subtitle', 'Built for Africa, accessible to the world')}</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Smartphone className="w-6 h-6 text-primary-600" />,
                  title: t('features.mobile.title', 'Mobile Money'),
                  desc: t('features.mobile.desc', 'M-Pesa, Orange Money, Wave & more African payment methods')
                },
                {
                  icon: <Shield className="w-6 h-6 text-purple-600" />,
                  title: t('features.blockchain.title', 'Blockchain Transparent'),
                  desc: t('features.blockchain.desc', 'Optional on-chain donations for full transparency via Polygon')
                },
                {
                  icon: <Globe className="w-6 h-6 text-blue-600" />,
                  title: t('features.multilingual.title', '5 Languages'),
                  desc: t('features.multilingual.desc', 'English, French, Spanish, Arabic & Wolof supported')
                },
                {
                  icon: <TrendingUp className="w-6 h-6 text-africa-gold" />,
                  title: t('features.currency.title', 'Multi-Currency'),
                  desc: t('features.currency.desc', 'USD, EUR, CFA, NGN, KES and 15+ currencies with live rates')
                }
              ].map((feature, i) => (
                <div key={i} className="stat-card hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="section-title text-center mb-10">{t('categories.title', 'Browse by Category')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {CATEGORIES.map(cat => (
                <Link
                  key={cat.id}
                  href={`/campaigns?category=${cat.id}`}
                  className="group text-center"
                >
                  <div className={clsx(
                    'w-full aspect-square rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 text-4xl shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1',
                    cat.color
                  )}>
                    {cat.emoji}
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Campaigns */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="section-title">{t('featured.title', 'Featured Campaigns')}</h2>
                <p className="section-subtitle">{t('featured.subtitle', 'Make a real impact today')}</p>
              </div>
              <Link href="/campaigns" className="hidden md:flex items-center gap-1 text-primary-600 font-medium hover:underline">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {featuredCampaigns?.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredCampaigns.slice(0, 6).map(campaign => (
                  <CampaignCard key={campaign._id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Be the first to create a campaign!</p>
                <Link href="/campaigns/create" className="btn-primary mt-4 inline-flex">
                  Start Campaign
                </Link>
              </div>
            )}

            <div className="text-center mt-10">
              <Link href="/campaigns" className="btn-primary inline-flex">
                {t('featured.viewAll', 'View All Campaigns')} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>

        {/* Near you (geolocation-based recommendations) */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="section-title flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  {t('nearby.title', 'Campaigns near you')}
                </h2>
                <p className="section-subtitle">
                  {t('nearby.subtitle', 'Location-aware recommendations for your region')}
                </p>
              </div>
              <Link
                href="/campaigns"
                className="hidden md:inline-flex items-center gap-1 text-primary-600 text-sm font-medium hover:underline"
              >
                {t('nearby.viewAll', 'View all campaigns')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {geoLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recommended.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t('nearby.empty', 'No recommended campaigns for your area yet. Explore all campaigns instead.')}
              </p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommended.map((campaign) => (
                  <CampaignCard key={campaign._id} campaign={campaign} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Village/Community highlight */}
        <section className="py-16 bg-primary-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="badge-green inline-flex items-center gap-1 mb-4">
                  <MapPin className="w-3 h-3" /> Community Fundraising
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {t('village.title', 'Fund Your Village Together')}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t('village.description', 'Users from the same village like Fadiouth can collaborate to raise funds for shared goals — infrastructure, schools, water wells, and more. Group campaigns make it easy to coordinate and track community fundraising.')}
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Group campaigns with multiple co-managers',
                    'Location-based campaign discovery',
                    'Real-time progress tracking for community',
                    'Blockchain transparency for public projects'
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/campaigns?category=community" className="btn-primary inline-flex">
                  {t('village.cta', 'Browse Community Campaigns')}
                </Link>
              </div>
              <div className="relative">
                <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-xl">🇸🇳</div>
                    <div>
                      <p className="font-semibold text-gray-900">Fadiouth Water Project</p>
                      <p className="text-sm text-gray-500">Fadiouth, Senegal</p>
                    </div>
                    <span className="ml-auto badge-green">Active</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold">67%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: '67%' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                    <div className="text-center">
                      <p className="font-bold text-gray-900">CFA 4.2M</p>
                      <p className="text-xs text-gray-500">Raised</p>
                    </div>
                    <div className="text-center border-x border-gray-100">
                      <p className="font-bold text-gray-900">142</p>
                      <p className="text-xs text-gray-500">Donors</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">18</p>
                      <p className="text-xs text-gray-500">Days left</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-primary-700 to-primary-900 text-white">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('cta.title', 'Ready to Make a Difference?')}</h2>
            <p className="text-primary-200 text-lg mb-8">{t('cta.description', 'Join thousands of change-makers raising money for causes that matter across Africa and the world.')}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/auth/register" className="btn-primary bg-white text-primary-700 hover:bg-primary-50 text-lg px-8 py-4">
                {t('cta.register', 'Create Free Account')}
              </Link>
              <Link href="/campaigns" className="btn-secondary border-white/30 text-white hover:bg-white/10 text-lg px-8 py-4">
                {t('cta.browse', 'Browse Campaigns')}
              </Link>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}

function clsx(...args) {
  return args.filter(Boolean).join(' ');
}

export async function getServerSideProps({ locale }) {
  let featuredCampaigns = [];
  let stats = {};

  try {
    const { data } = await campaignAPI.getAll({ limit: 6, featured: 'true', status: 'active' });
    featuredCampaigns = data?.data || [];
  } catch {}

  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
      featuredCampaigns,
      stats
    }
  };
}
