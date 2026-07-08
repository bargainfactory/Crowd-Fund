import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { NextSeo } from 'next-seo';
import Layout from '../../components/layout/Layout';
import { adminAPI, campaignAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users, Megaphone, DollarSign, Clock, CheckCircle, XCircle,
  Loader2, ShieldAlert, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const isAdmin = (user) => ['admin', 'superadmin'].includes(user?.role);

export default function AdminDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin(user)) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes] = await Promise.all([
        adminAPI.getStats().catch(() => null),
        campaignAPI.getAll({ status: 'pending', limit: 50 }).catch(() => null)
      ]);
      if (statsRes) setStats(statsRes.data.data);
      if (pendingRes) setPending(pendingRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin(user)) load();
  }, [authLoading, isAuthenticated, user, load]);

  const moderate = async (id, action) => {
    let reason;
    if (action === 'reject') {
      reason = window.prompt('Reason for rejection (shown to the creator):');
      if (reason === null) return;
    }
    setActing(id);
    try {
      await campaignAPI.moderate(id, { action, reason });
      toast.success(`Campaign ${action}d`);
      setPending((list) => list.filter((c) => c._id !== id));
      setStats((s) => (s ? { ...s, campaigns: { ...s.campaigns, pending: Math.max(0, s.campaigns.pending - 1) } } : s));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  if (authLoading || !isAuthenticated || !isAdmin(user)) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          {authLoading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          ) : (
            <div className="text-center text-gray-500">
              <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Admin access required.</p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  const cards = stats
    ? [
        { label: 'Total users', value: stats.users?.total ?? 0, sub: `+${stats.users?.newToday ?? 0} today`, icon: <Users className="w-5 h-5 text-blue-600" /> },
        { label: 'Campaigns', value: stats.campaigns?.total ?? 0, sub: `${stats.campaigns?.active ?? 0} active`, icon: <Megaphone className="w-5 h-5 text-primary-600" /> },
        { label: 'Raised (USD)', value: `$${Math.round(stats.donations?.totalRaisedUSD ?? 0).toLocaleString()}`, sub: `${stats.donations?.total ?? 0} donations`, icon: <DollarSign className="w-5 h-5 text-green-600" /> },
        { label: 'Pending review', value: stats.campaigns?.pending ?? 0, sub: 'awaiting moderation', icon: <Clock className="w-5 h-5 text-yellow-600" /> }
      ]
    : [];

  return (
    <>
      <NextSeo title="Admin" noindex />
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Admin dashboard</h1>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {cards.map((c) => (
                  <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">{c.label}</span>
                      <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">{c.icon}</div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* Pending moderation */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Campaigns awaiting review</h2>
                <button onClick={load} className="text-sm text-primary-600 hover:underline">Refresh</button>
              </div>

              {pending.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No campaigns pending review. All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((c) => (
                    <div key={c._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="badge-yellow capitalize">{c.category?.replace('-', ' ')}</span>
                          {c.blockchainEnabled && <span className="badge-purple">On-chain</span>}
                        </div>
                        <p className="font-semibold text-gray-900 truncate">{c.title}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {c.creator?.firstName} {c.creator?.lastName} · {c.location?.country}
                          {' · '}Goal {c.currency} {Number(c.targetAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link href={`/campaigns/${c._id}`} target="_blank"
                          className="btn-outline inline-flex items-center gap-1 text-sm">
                          Preview <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => moderate(c._id, 'approve')} disabled={acting === c._id}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                          {acting === c._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
                        </button>
                        <button onClick={() => moderate(c._id, 'reject')} disabled={acting === c._id}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-60">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
}
