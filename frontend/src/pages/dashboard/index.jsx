import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Layout from '../../components/layout/Layout';
import CampaignCard from '../../components/campaigns/CampaignCard';
import WalletConnect from '../../components/blockchain/WalletConnect';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { campaignAPI, paymentAPI, blockchainAPI, adminAPI } from '../../lib/api';
import {
  LayoutDashboard, Heart, PlusCircle, Settings, Shield,
  TrendingUp, Users, Clock, ExternalLink, Download, Bell
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'campaigns', label: 'My Campaigns', icon: TrendingUp },
  { id: 'donations', label: 'My Donations', icon: Heart },
  { id: 'blockchain', label: 'Blockchain', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'admin', label: 'Admin', icon: Users, adminOnly: true }
];

export default function DashboardPage() {
  const { t } = useTranslation('common');
  const { user, updateUser, isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const { format, formatConverted } = useCurrency();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('overview');
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [blockchainTxs, setBlockchainTxs] = useState([]);
  const [donationAnalytics, setDonationAnalytics] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({});
  const [adminStats, setAdminStats] = useState(null);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/dashboard');
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        phone: user.phone || '',
        preferredLanguage: user.preferredLanguage || 'en',
        preferredCurrency: user.preferredCurrency || 'USD'
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setDataLoading(true);
      try {
        const [campaignsRes, donationsRes, analyticsRes] = await Promise.allSettled([
          campaignAPI.getAll({ creator: user._id, limit: 20 }),
          paymentAPI.getMyDonations(),
          paymentAPI.getMyAnalytics({ days: 90 })
        ]);

        if (campaignsRes.status === 'fulfilled') setMyCampaigns(campaignsRes.value.data?.data || []);
        if (donationsRes.status === 'fulfilled') setMyDonations(donationsRes.value.data?.data || []);
        if (analyticsRes.status === 'fulfilled') setDonationAnalytics(analyticsRes.value.data?.data || null);

        if (user?.walletAddress) {
          const txRes = await blockchainAPI.getMyTransactions().catch(() => ({ data: { data: [] } }));
          setBlockchainTxs(txRes.data?.data || []);
        }
      } catch (err) {
        console.error('Dashboard data load error:', err);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, user]);

  // Admin data
  useEffect(() => {
    if (!isAdmin) return;

    const loadAdmin = async () => {
      setAdminLoading(true);
      try {
        const [statsRes, analyticsRes] = await Promise.allSettled([
          adminAPI.getStats(),
          adminAPI.getAnalytics({ days: 30 })
        ]);

        if (statsRes.status === 'fulfilled') setAdminStats(statsRes.value.data?.data || null);
        if (analyticsRes.status === 'fulfilled') setAdminAnalytics(analyticsRes.value.data?.data || null);
      } catch (err) {
        console.error('Admin load error', err);
      } finally {
        setAdminLoading(false);
      }
    };

    loadAdmin();
  }, [isAdmin]);

  const handleProfileSave = async () => {
    try {
      await updateUser(profileForm);
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const downloadReceipt = async (donationId) => {
    try {
      const { data } = await paymentAPI.getReceipt(donationId);
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${donationId}.pdf`;
      a.click();
    } catch {
      toast.error('Failed to download receipt');
    }
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const totalDonated = myDonations.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amountUSD, 0);
  const activeCampaigns = myCampaigns.filter(c => c.status === 'active').length;
  const totalRaised = myCampaigns.reduce((sum, c) => sum + (c.raisedAmount || 0), 0);

  return (
    <>
      <NextSeo title="Dashboard" noindex />
      <Layout>
        <div className="bg-primary-700 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img src={user.avatar} alt={user.firstName} className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">Hello, {user.firstName}!</h1>
                <p className="text-primary-200 text-sm">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                  {user.isVerifiedCreator && <span className="ml-2 bg-blue-400 text-white px-2 py-0.5 rounded-full text-xs">Verified Creator</span>}
                </p>
              </div>
              <Link href="/campaigns/create" className="ml-auto bg-white text-primary-700 px-4 py-2 rounded-xl font-medium text-sm hover:bg-primary-50 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> New Campaign
              </Link>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { label: 'Total Donated', value: `$${totalDonated.toFixed(0)}` },
                { label: 'Active Campaigns', value: activeCampaigns },
                { label: 'Total Raised', value: `$${totalRaised.toFixed(0)}` },
                { label: 'Blockchain Txs', value: blockchainTxs.length }
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-sm text-primary-200">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar nav */}
            <nav className="lg:w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
                {TABS.filter(tab => !tab.adminOnly || isAdmin).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                      activeTab === id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-900">Overview</h2>

                  {/* Recent donations */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" /> Recent Donations
                    </h3>
                    {myDonations.slice(0, 5).length > 0 ? (
                      <div className="space-y-3">
                        {myDonations.slice(0, 5).map(donation => (
                          <div key={donation._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                              <Heart className="w-4 h-4 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {donation.campaign?.title || 'Campaign'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDistance(new Date(donation.createdAt), new Date(), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {format(donation.amount, donation.currency)}
                              </p>
                              <span className={clsx('text-xs', {
                                'text-green-600': donation.status === 'completed',
                                'text-yellow-600': donation.status === 'pending',
                                'text-red-600': donation.status === 'failed'
                              })}>
                                {donation.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No donations yet</p>
                        <Link href="/campaigns" className="text-primary-600 text-sm hover:underline mt-1 inline-block">Browse campaigns</Link>
                      </div>
                    )}
                  </div>

                  {/* Donation analytics mini-chart */}
                  {donationAnalytics && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary-600" /> Your giving over time
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Last {donationAnalytics.donationsByDay?.length || 0} days with donations
                      </p>
                      <div className="w-full h-40">
                        {/* Simple inline SVG chart to avoid extra bundle weight if recharts is unused here */}
                        {donationAnalytics.donationsByDay && donationAnalytics.donationsByDay.length > 0 ? (
                          <div className="text-xs text-gray-400">
                            {donationAnalytics.donationsByDay.map((d) => (
                              <div key={d._id} className="flex items-center justify-between py-0.5">
                                <span>{d._id}</span>
                                <span className="font-medium text-gray-700">
                                  ${d.totalUSD.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No recent donations yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* My campaigns preview */}
                  {myCampaigns.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary-600" /> My Campaigns
                      </h3>
                      <div className="space-y-3">
                        {myCampaigns.slice(0, 3).map(campaign => (
                          <div key={campaign._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                              {campaign.coverImage && <img src={campaign.coverImage} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{campaign.title}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary-500 rounded-full"
                                    style={{ width: `${campaign.progressPercentage}%` }} />
                                </div>
                                <span className="text-xs text-gray-500">{campaign.progressPercentage}%</span>
                              </div>
                            </div>
                            <span className={clsx('badge text-xs', {
                              'badge-green': campaign.status === 'active',
                              'badge-yellow': campaign.status === 'pending',
                              'badge-blue': campaign.status === 'completed'
                            })}>
                              {campaign.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* My Campaigns tab */}
              {activeTab === 'campaigns' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">My Campaigns</h2>
                    <Link href="/campaigns/create" className="btn-primary text-sm px-4 py-2">
                      <PlusCircle className="w-4 h-4 mr-1.5" /> New Campaign
                    </Link>
                  </div>

                  {myCampaigns.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-5">
                      {myCampaigns.map(campaign => (
                        <CampaignCard key={campaign._id} campaign={campaign} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="font-semibold text-gray-900 mb-2">No campaigns yet</p>
                      <p className="text-gray-500 text-sm mb-4">Start your first campaign and make a difference!</p>
                      <Link href="/campaigns/create" className="btn-primary inline-flex">Create Campaign</Link>
                    </div>
                  )}
                </div>
              )}

              {/* My Donations tab */}
              {activeTab === 'donations' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">My Donations ({myDonations.length})</h2>
                  {myDonations.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Date</th>
                            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {myDonations.map(donation => (
                            <tr key={donation._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3.5">
                                <Link href={`/campaigns/${donation.campaign?.slug || donation.campaign?._id}`}
                                  className="text-sm font-medium text-gray-900 hover:text-primary-600 line-clamp-1">
                                  {donation.campaign?.title || 'Unknown campaign'}
                                </Link>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <span className="text-sm font-semibold text-gray-900">
                                  {format(donation.amount, donation.currency)}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center hidden md:table-cell">
                                <span className="text-xs text-gray-500">
                                  {new Date(donation.createdAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={clsx('badge text-xs', {
                                  'badge-green': donation.status === 'completed',
                                  'badge-yellow': donation.status === 'pending',
                                  'badge-red': donation.status === 'failed'
                                })}>
                                  {donation.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                {donation.status === 'completed' && (
                                  <button
                                    onClick={() => downloadReceipt(donation._id)}
                                    className="text-primary-600 hover:text-primary-800 p-1"
                                    title="Download receipt"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                      <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="font-semibold text-gray-900 mb-2">No donations yet</p>
                      <Link href="/campaigns" className="btn-primary inline-flex mt-2">Browse Campaigns</Link>
                    </div>
                  )}
                </div>
              )}

              {/* Blockchain tab */}
              {activeTab === 'blockchain' && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-900">Blockchain Activity</h2>
                  <WalletConnect />
                  {blockchainTxs.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">On-Chain Transactions</h3>
                      <div className="space-y-3">
                        {blockchainTxs.map(tx => (
                          <div key={tx._id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                            <Shield className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{tx.eventType.replace(/_/g, ' ')}</p>
                              <p className="text-xs font-mono text-gray-500 truncate">{tx.txHash}</p>
                            </div>
                            {tx.explorerUrl && (
                              <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer"
                                className="text-purple-600 hover:text-purple-800 flex-shrink-0">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Settings tab */}
              {activeTab === 'settings' && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">First Name</label>
                        <input type="text" value={profileForm.firstName}
                          onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))}
                          className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Last Name</label>
                        <input type="text" value={profileForm.lastName}
                          onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))}
                          className="form-input" />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Bio</label>
                      <textarea rows={3} value={profileForm.bio}
                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                        className="form-input resize-none" placeholder="Tell others about yourself..." />
                    </div>
                    <div>
                      <label className="form-label">Phone</label>
                      <input type="tel" value={profileForm.phone}
                        onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        className="form-input" placeholder="+221 77 000 0000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Language</label>
                        <select value={profileForm.preferredLanguage}
                          onChange={e => setProfileForm(p => ({ ...p, preferredLanguage: e.target.value }))}
                          className="form-input">
                          {[['en','English'],['fr','Français'],['es','Español'],['ar','العربية'],['wo','Wolof']].map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Currency</label>
                        <select value={profileForm.preferredCurrency}
                          onChange={e => setProfileForm(p => ({ ...p, preferredCurrency: e.target.value }))}
                          className="form-input">
                          {['USD','EUR','GBP','XOF','NGN','KES','GHS'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Notifications</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={profileForm.notifications?.email ?? true}
                            onChange={e => setProfileForm(p => ({
                              ...p,
                              notifications: { ...(p.notifications || {}), email: e.target.checked }
                            }))}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span>Email updates (recommended)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={profileForm.notifications?.sms ?? false}
                            onChange={e => setProfileForm(p => ({
                              ...p,
                              notifications: { ...(p.notifications || {}), sms: e.target.checked }
                            }))}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span>SMS alerts (where available)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={profileForm.notifications?.push ?? true}
                            onChange={e => setProfileForm(p => ({
                              ...p,
                              notifications: { ...(p.notifications || {}), push: e.target.checked }
                            }))}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span>In-app / push notifications</span>
                        </label>
                      </div>
                    </div>
                    <button onClick={handleProfileSave} className="btn-primary">Save Changes</button>
                  </div>
                </div>
              )}

              {/* Admin tab */}
              {activeTab === 'admin' && isAdmin && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-gray-900">Admin Console</h2>

                  {adminLoading && (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {!adminLoading && adminStats && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Platform Overview</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Users</p>
                          <p className="text-xl font-semibold text-gray-900">
                            {adminStats.users.total.toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600">
                            +{adminStats.users.newToday} today
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Campaigns</p>
                          <p className="text-xl font-semibold text-gray-900">
                            {adminStats.campaigns.total.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {adminStats.campaigns.active} active
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Raised (USD)</p>
                          <p className="text-xl font-semibold text-gray-900">
                            ${adminStats.donations.totalRaisedUSD.toFixed(0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Donations</p>
                          <p className="text-xl font-semibold text-gray-900">
                            {adminStats.donations.total.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simple admin analytics list */}
                  {!adminLoading && adminAnalytics && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Top campaigns (by raised USD)</h3>
                      <div className="space-y-2">
                        {adminAnalytics.topCampaigns.map((c) => (
                          <div key={c._id} className="flex items-center justify-between py-1">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {c.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                {c.category}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              ${c.raisedAmount?.toFixed(0) || 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ locale }) {
  return {
    props: { ...(await serverSideTranslations(locale || 'en', ['common'])) }
  };
}
