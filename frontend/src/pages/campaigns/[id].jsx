import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import { formatDistance } from 'date-fns';
import Layout from '../../components/layout/Layout';
import DonationModal from '../../components/campaigns/DonationModal';
import WalletConnect from '../../components/blockchain/WalletConnect';
import { CampaignJsonLd } from '../../components/seo/StructuredData';
import { campaignAPI, blockchainAPI } from '../../lib/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import {
  Heart, Share2, Clock, Users, MapPin, Shield, ExternalLink,
  CheckCircle, Target, ChevronRight, Play, Bell, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function CampaignDetail({ campaign, recentDonations }) {
  const { t } = useTranslation('common');
  const { format, formatConverted } = useCurrency();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const [showDonateModal, setShowDonateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  if (!campaign) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-xl text-gray-500">Campaign not found</p>
          <Link href="/campaigns" className="btn-primary mt-4 inline-flex">Browse Campaigns</Link>
        </div>
      </Layout>
    );
  }

  const progress = campaign.progressPercentage ?? Math.min(
    Math.round((campaign.raisedAmount / campaign.targetAmount) * 100), 100
  );

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.share({ title: campaign.title, text: campaign.shortDescription, url });
    } catch {
      navigator.clipboard.writeText(url);
      toast.success('Campaign link copied to clipboard!');
    }
  };

  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'updates', label: `Updates (${campaign.updates?.length || 0})` },
    { id: 'donors', label: `Donors (${campaign.donorCount || 0})` },
    ...(campaign.blockchainEnabled ? [{ id: 'blockchain', label: 'Blockchain' }] : [])
  ];

  return (
    <>
      <NextSeo
        title={campaign.title}
        description={campaign.shortDescription || campaign.description?.substring(0, 160)}
        canonical={`https://crowdfundafrica.com/campaigns/${campaign._id}`}
        openGraph={{
          type: 'article',
          url: `https://crowdfundafrica.com/campaigns/${campaign._id}`,
          title: campaign.title,
          description: campaign.shortDescription || campaign.description?.substring(0, 160),
          images: campaign.coverImage
            ? [{ url: campaign.coverImage, alt: campaign.title, width: 1200, height: 630 }]
            : []
        }}
      />
      <CampaignJsonLd campaign={campaign} />

      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cover media */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-md">
                {campaign.coverImage ? (
                  <Image
                    src={campaign.coverImage}
                    alt={campaign.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                    <Heart className="w-20 h-20 text-primary-400" />
                  </div>
                )}
                {campaign.videoUrl && (
                  <a href={campaign.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                      <Play className="w-8 h-8 text-primary-600 ml-1" />
                    </div>
                  </a>
                )}
              </div>

              {/* Title and meta */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="badge-green">{campaign.category?.replace('-', ' ')}</span>
                  {campaign.isUrgent && <span className="badge-red">Urgent</span>}
                  {campaign.blockchainEnabled && (
                    <span className="blockchain-badge">
                      <Shield className="w-3 h-3" /> Blockchain Verified
                    </span>
                  )}
                  {campaign.location?.village && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {campaign.location.village}, {campaign.location.country}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{campaign.title}</h1>

                {/* Creator */}
                {campaign.creator && (
                  <div className="flex items-center gap-3 mb-4">
                    {campaign.creator.avatar ? (
                      <Image src={campaign.creator.avatar} alt={campaign.creator.firstName}
                        width={40} height={40} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                        {campaign.creator.firstName?.[0]}{campaign.creator.lastName?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900">
                          {campaign.creator.firstName} {campaign.creator.lastName}
                        </span>
                        {campaign.creator.isVerifiedCreator && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500">Campaign Creator</span>
                    </div>
                    <div className="ml-auto">
                      <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline" onClick={handleShare}>Share</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex gap-1 -mb-px">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                        activeTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab content */}
              <div className="min-h-48">
                {activeTab === 'about' && (
                  <div className="prose prose-gray max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {campaign.description}
                    </div>

                    {campaign.milestones?.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary-600" /> Milestones
                        </h3>
                        <div className="space-y-3">
                          {campaign.milestones.map((milestone, i) => (
                            <div key={i} className={clsx(
                              'flex items-start gap-3 p-4 rounded-xl border',
                              milestone.isReached ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                            )}>
                              <div className={clsx(
                                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold',
                                milestone.isReached ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                              )}>
                                {milestone.isReached ? '✓' : i + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{milestone.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Target: {formatConverted(milestone.targetAmount, campaign.currency)}
                                  {milestone.isReached && <span className="ml-2 text-green-600">• Reached!</span>}
                                </p>
                                {milestone.description && (
                                  <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'updates' && (
                  <div className="space-y-4">
                    {campaign.updates?.length > 0 ? campaign.updates.map((update, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{update.title}</h4>
                          <span className="text-xs text-gray-400">
                            {formatDistance(new Date(update.postedAt), new Date(), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{update.content}</p>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-400">
                        <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No updates yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'donors' && (
                  <div className="space-y-3">
                    {recentDonations?.length > 0 ? recentDonations.map((donation, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                          {donation.isAnonymous ? '?' : (donation.donor?.firstName?.[0] || 'A')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {donation.isAnonymous ? 'Anonymous' : `${donation.donor?.firstName} ${donation.donor?.lastName}`}
                          </p>
                          {donation.message && (
                            <p className="text-xs text-gray-500 truncate">"{donation.message}"</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-primary-600">
                            {formatConverted(donation.amount, donation.currency)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDistance(new Date(donation.createdAt), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-400">
                        <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Be the first to donate!</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'blockchain' && campaign.blockchainEnabled && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                      <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Blockchain Transparency
                      </h3>
                      <p className="text-sm text-purple-700 mb-4">
                        This campaign uses blockchain technology for transparent fund management on {campaign.blockchainNetwork}.
                      </p>
                      {campaign.contractAddress && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-white rounded-lg p-3">
                            <span className="text-xs text-gray-500">Contract Address</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-800">
                                {campaign.contractAddress.slice(0, 10)}...{campaign.contractAddress.slice(-6)}
                              </span>
                              <button
                                onClick={() => { navigator.clipboard.writeText(campaign.contractAddress); toast.success('Copied!'); }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <a href={`https://mumbai.polygonscan.com/address/${campaign.contractAddress}`}
                                target="_blank" rel="noopener noreferrer" className="text-purple-600">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <WalletConnect />
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Donation widget */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-20">
                {/* Amount raised */}
                <div className="mb-4">
                  <p className="text-3xl font-bold text-gray-900">
                    {formatConverted(campaign.raisedAmount, campaign.currency)}
                  </p>
                  <p className="text-sm text-gray-500">
                    raised of {formatConverted(campaign.targetAmount, campaign.currency)} goal
                  </p>
                </div>

                {/* Progress */}
                <div className="progress-bar mb-3">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-gray-100">
                  {[
                    { label: 'Funded', value: `${progress}%` },
                    { label: 'Donors', value: campaign.donorCount?.toLocaleString() || '0' },
                    { label: 'Days left', value: campaign.daysLeft > 0 ? campaign.daysLeft : 'Ended' }
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="font-bold text-gray-900 text-lg">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Donate button */}
                {campaign.status === 'active' && campaign.daysLeft > 0 ? (
                  <>
                    <button
                      onClick={() => setShowDonateModal(true)}
                      className="btn-primary w-full text-base py-4 mb-3"
                    >
                      <Heart className="w-5 h-5 mr-2 fill-white" /> Donate Now
                    </button>
                    <button onClick={handleShare} className="btn-outline w-full">
                      <Share2 className="w-4 h-4 mr-2" /> Share Campaign
                    </button>
                  </>
                ) : (
                  <div className="text-center py-3 bg-gray-50 rounded-xl text-gray-500 text-sm font-medium">
                    {campaign.status === 'completed' ? '🎉 Goal Reached!' : 'Campaign Ended'}
                  </div>
                )}

                {/* Suggested amounts */}
                {campaign.suggestedAmounts?.length > 0 && campaign.status === 'active' && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">Suggested amounts:</p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.suggestedAmounts.slice(0, 4).map(amount => (
                        <button
                          key={amount}
                          onClick={() => setShowDonateModal(true)}
                          className="px-3 py-1 text-xs border border-gray-200 rounded-full text-gray-600 hover:border-primary-300 hover:text-primary-700 transition-colors"
                        >
                          {formatConverted(amount, campaign.currency)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Co-managers */}
                {campaign.coManagers?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Co-managed by</p>
                    <div className="flex -space-x-2">
                      {campaign.coManagers.slice(0, 5).map((manager, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-primary-200 border-2 border-white flex items-center justify-center text-xs font-bold text-primary-700"
                          title={`${manager.firstName} ${manager.lastName}`}>
                          {manager.firstName?.[0]}
                        </div>
                      ))}
                      {campaign.coManagers.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                          +{campaign.coManagers.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Blockchain widget */}
              {campaign.blockchainEnabled && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">Blockchain Verified</span>
                  </div>
                  <p className="text-xs text-purple-600 mb-3">All donations are recorded on {campaign.blockchainNetwork}</p>
                  {campaign.contractAddress && (
                    <a
                      href={`https://mumbai.polygonscan.com/address/${campaign.contractAddress}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-purple-700 flex items-center gap-1 hover:underline"
                    >
                      View smart contract <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Share buttons */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">Help spread the word</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Twitter', color: 'bg-sky-500', emoji: '𝕏' },
                    { label: 'Facebook', color: 'bg-blue-600', emoji: 'f' },
                    { label: 'WhatsApp', color: 'bg-green-500', emoji: '💬' }
                  ].map(({ label, color, emoji }) => (
                    <button key={label}
                      onClick={handleShare}
                      className={`${color} text-white text-xs font-medium py-2 rounded-xl hover:opacity-90 transition-opacity`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Donation Modal */}
        {showDonateModal && (
          <DonationModal
            campaign={campaign}
            onClose={() => setShowDonateModal(false)}
          />
        )}
      </Layout>
    </>
  );
}

export async function getServerSideProps({ params, locale }) {
  try {
    const { data } = await campaignAPI.getById(params.id);
    return {
      props: {
        ...(await serverSideTranslations(locale || 'en', ['common'])),
        campaign: data.data,
        recentDonations: data.recentDonations || []
      }
    };
  } catch {
    return {
      props: {
        ...(await serverSideTranslations(locale || 'en', ['common'])),
        campaign: null,
        recentDonations: []
      }
    };
  }
}
