import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Layout from '../../components/layout/Layout';
import CampaignCard from '../../components/campaigns/CampaignCard';
import { campaignAPI } from '../../lib/api';
import { SlidersHorizontal, Search, ChevronDown, Loader, MapPin, X } from 'lucide-react';
import clsx from 'clsx';

const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'community', label: 'Community' },
  { id: 'education', label: 'Education' },
  { id: 'health', label: 'Health' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'disaster-relief', label: 'Disaster Relief' },
  { id: 'environment', label: 'Environment' },
  { id: 'arts', label: 'Arts & Culture' },
  { id: 'technology', label: 'Technology' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'business', label: 'Business' },
  { id: 'other', label: 'Other' }
];

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest' },
  { value: '-raisedAmount', label: 'Most Funded' },
  { value: 'deadline', label: 'Ending Soon' },
  { value: '-donorCount', label: 'Most Popular' },
  { value: '-viewCount', label: 'Trending' }
];

export default function CampaignsPage({ initialCampaigns, initialTotal }) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const [campaigns, setCampaigns] = useState(initialCampaigns || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: router.query.search || '',
    category: router.query.category || '',
    country: router.query.country || '',
    village: router.query.village || '',
    sort: '-createdAt',
    featured: router.query.featured || '',
    urgent: '',
    blockchainEnabled: ''
  });

  const fetchCampaigns = useCallback(async (newFilters = filters, newPage = 1, append = false) => {
    const setter = append ? setLoadingMore : setLoading;
    setter(true);

    try {
      const params = {
        page: newPage,
        limit: 12,
        ...Object.fromEntries(Object.entries(newFilters).filter(([, v]) => v))
      };

      const { data } = await campaignAPI.getAll(params);
      const newCampaigns = data?.data || [];

      if (append) {
        setCampaigns(prev => [...prev, ...newCampaigns]);
      } else {
        setCampaigns(newCampaigns);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTotal(data?.pagination?.total || 0);
      setPage(newPage);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setter(false);
    }
  }, [filters]);

  // Update URL and fetch when filters change
  useEffect(() => {
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    router.push({ pathname: '/campaigns', query }, undefined, { shallow: true });
    fetchCampaigns(filters, 1, false);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', country: '', village: '', sort: '-createdAt', featured: '', urgent: '', blockchainEnabled: '' });
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => v && k !== 'sort');
  const hasMore = campaigns.length < total;

  return (
    <>
      <NextSeo title="Browse Campaigns" description="Discover and support campaigns for communities across Africa and the world." />

      <Layout>
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{t('campaigns.title', 'Browse Campaigns')}</h1>
            <p className="text-gray-500">{total.toLocaleString()} {t('campaigns.found', 'campaigns found')}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters sidebar */}
            <aside className={clsx(
              'lg:w-64 flex-shrink-0',
              showFilters ? 'block' : 'hidden lg:block'
            )}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Filters</h2>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="mb-4">
                  <label className="form-label">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="search"
                      value={filters.search}
                      onChange={e => handleFilterChange('search', e.target.value)}
                      className="form-input pl-9 text-sm"
                      placeholder="Search campaigns..."
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="form-label">Category</label>
                  <div className="space-y-1">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleFilterChange('category', cat.id)}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors',
                          filters.category === cat.id
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="mb-4">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    value={filters.country}
                    onChange={e => handleFilterChange('country', e.target.value)}
                    className="form-input text-sm"
                    placeholder="e.g. Senegal"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Village / City</label>
                  <input
                    type="text"
                    value={filters.village}
                    onChange={e => handleFilterChange('village', e.target.value)}
                    className="form-input text-sm"
                    placeholder="e.g. Fadiouth"
                  />
                </div>

                {/* Special filters */}
                <div className="space-y-2 border-t pt-4">
                  {[
                    { key: 'featured', label: 'Featured only' },
                    { key: 'urgent', label: 'Urgent campaigns' },
                    { key: 'blockchainEnabled', label: 'Blockchain verified' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters[key] === 'true'}
                        onChange={e => handleFilterChange(key, e.target.checked ? 'true' : '')}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-5 gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters {hasActiveFilters && <span className="badge-green text-xs">Active</span>}
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                  <select
                    value={filters.sort}
                    onChange={e => handleFilterChange('sort', e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active filters tags */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(filters).filter(([k, v]) => v && k !== 'sort').map(([key, value]) => (
                    <span key={key} className="flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                      {key}: {value}
                      <button onClick={() => handleFilterChange(key, '')} className="ml-1 hover:text-primary-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Campaign grid */}
              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                      <div className="aspect-[16/10] bg-gray-200" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-2 bg-gray-200 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <p className="text-4xl mb-4">🔍</p>
                  <p className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</p>
                  <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
                  <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {campaigns.map(campaign => (
                      <CampaignCard key={campaign._id} campaign={campaign} />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="text-center mt-8">
                      <button
                        onClick={() => fetchCampaigns(filters, page + 1, true)}
                        disabled={loadingMore}
                        className="btn-secondary inline-flex items-center gap-2"
                      >
                        {loadingMore ? (
                          <><Loader className="w-4 h-4 animate-spin" /> Loading...</>
                        ) : (
                          <>Load More Campaigns ({total - campaigns.length} remaining)</>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ locale, query }) {
  let initialCampaigns = [];
  let initialTotal = 0;

  try {
    const params = { page: 1, limit: 12, status: 'active', ...query };
    const { data } = await campaignAPI.getAll(params);
    initialCampaigns = data?.data || [];
    initialTotal = data?.pagination?.total || 0;
  } catch {}

  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
      initialCampaigns,
      initialTotal
    }
  };
}
