import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Layout from '../../../components/layout/Layout';
import { campaignAPI } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import {
  ArrowLeft,
  BarChart3,
  Users,
  Globe,
  Activity
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy-load recharts to keep initial bundle small
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false }
);
const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const PieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  { ssr: false }
);
const Pie = dynamic(
  () => import('recharts').then((mod) => mod.Pie),
  { ssr: false }
);
const Cell = dynamic(
  () => import('recharts').then((mod) => mod.Cell),
  { ssr: false }
);

const COLORS = ['#16a34a', '#22c55e', '#a3e635', '#06b6d4', '#0ea5e9', '#6366f1', '#f97316', '#e11d48'];

export default function CampaignAnalyticsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { format } = useCurrency();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/dashboard');
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await campaignAPI.getAnalytics(id);
        setAnalytics(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [id, isAuthenticated]);

  const dailyData = (analytics?.dailyDonations || []).map((d) => ({
    date: d._id,
    totalUSD: d.total,
    count: d.count
  }));

  const countryData = (analytics?.countryBreakdown || []).map((c) => ({
    country: c._id || 'Unknown',
    totalUSD: c.total,
    count: c.count
  }));

  return (
    <>
      <NextSeo title="Campaign Analytics" noindex />
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
          </button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary-600" />
                Campaign analytics
              </h1>
              <p className="text-sm text-gray-500">
                Detailed performance metrics for your campaign.
              </p>
            </div>
            {analytics?.campaign && (
              <Link
                href={`/campaigns/${id}`}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                View public page
              </Link>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center min-h-64">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          {!loading && analytics && (
            <div className="space-y-6">
              {/* Top stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Raised (USD)',
                    value: `$${(analytics.campaign.raisedAmount || 0).toLocaleString()}`,
                    icon: Activity
                  },
                  {
                    label: 'Goal (USD)',
                    value: `$${(analytics.campaign.targetAmount || 0).toLocaleString()}`,
                    icon: BarChart3
                  },
                  {
                    label: 'Donors',
                    value: analytics.campaign.donorCount?.toLocaleString() || '0',
                    icon: Users
                  },
                  {
                    label: 'Views',
                    value: analytics.campaign.viewCount?.toLocaleString() || '0',
                    icon: Globe
                  }
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-lg font-semibold text-gray-900">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Donations over time (USD)
                    </h2>
                    <span className="text-xs text-gray-400">
                      Last {dailyData.length} days with activity
                    </span>
                  </div>
                  {dailyData.length === 0 ? (
                    <p className="text-xs text-gray-400">No donations yet.</p>
                  ) : (
                    <div className="w-full h-64">
                      <ResponsiveContainer>
                        <LineChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="totalUSD"
                            stroke="#16a34a"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Donors by country
                  </h2>
                  {countryData.length === 0 ? (
                    <p className="text-xs text-gray-400">No country data available.</p>
                  ) : (
                    <div className="w-full h-64">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={countryData}
                            dataKey="totalUSD"
                            nameKey="country"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            innerRadius={30}
                            paddingAngle={2}
                          >
                            {countryData.map((entry, index) => (
                              <Cell
                                key={entry.country}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Top donors list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Top donors
                </h2>
                {(analytics.topDonors || []).length === 0 ? (
                  <p className="text-xs text-gray-400">No donations yet.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {analytics.topDonors.map((donation) => (
                      <div
                        key={donation._id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                            {donation.isAnonymous
                              ? '?'
                              : (donation.donor?.firstName?.[0] || 'A')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {donation.isAnonymous
                                ? 'Anonymous'
                                : `${donation.donor?.firstName || ''} ${donation.donor?.lastName || ''}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(donation.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {format(donation.amountUSD, 'USD')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common']))
    }
  };
}

