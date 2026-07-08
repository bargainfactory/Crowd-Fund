import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '../../context/CurrencyContext';
import { Clock, MapPin, Users, Shield, Zap } from 'lucide-react';
import clsx from 'clsx';

const CATEGORY_COLORS = {
  community: 'bg-green-100 text-green-700',
  education: 'bg-blue-100 text-blue-700',
  health: 'bg-red-100 text-red-700',
  infrastructure: 'bg-yellow-100 text-yellow-700',
  'disaster-relief': 'bg-orange-100 text-orange-700',
  environment: 'bg-teal-100 text-teal-700',
  arts: 'bg-purple-100 text-purple-700',
  technology: 'bg-cyan-100 text-cyan-700',
  agriculture: 'bg-lime-100 text-lime-700',
  business: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700'
};

export default function CampaignCard({ campaign, compact = false }) {
  const { formatConverted, format } = useCurrency();

  const {
    _id, slug, title, shortDescription, description, coverImage,
    category, raisedAmount, targetAmount, currency, donorCount,
    daysLeft, progressPercentage, location, creator,
    blockchainEnabled, isUrgent, isFeatured, status
  } = campaign;

  const progress = progressPercentage ?? Math.min(Math.round((raisedAmount / targetAmount) * 100), 100);
  const days = daysLeft ?? 0;
  const excerpt = shortDescription || description?.substring(0, 120);

  return (
    <Link
      href={`/campaigns/${slug || _id}`}
      className={clsx(
        'campaign-card group block',
        compact ? 'flex gap-4 p-4' : ''
      )}
      aria-label={`View campaign: ${title}`}
    >
      {/* Cover Image */}
      <div className={clsx(
        'relative overflow-hidden bg-gray-100',
        compact ? 'w-24 h-24 rounded-xl flex-shrink-0' : 'aspect-[16/10]'
      )}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes={compact ? '96px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
            <span className="text-4xl">{CATEGORY_EMOJIS[category] || '🌍'}</span>
          </div>
        )}

        {/* Badges overlay */}
        {!compact && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {isFeatured && (
              <span className="badge bg-africa-gold text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                Featured
              </span>
            )}
            {isUrgent && (
              <span className="badge bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3" /> Urgent
              </span>
            )}
          </div>
        )}

        {!compact && blockchainEnabled && (
          <div className="absolute top-3 right-3">
            <span className="blockchain-badge bg-purple-600 text-white border-purple-700 text-xs">
              <Shield className="w-3 h-3" /> On-Chain
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={clsx('flex flex-col', compact ? 'flex-1 min-w-0' : 'p-5')}>
        {!compact && (
          <div className="flex items-center gap-2 mb-3">
            <span className={clsx('badge text-xs', CATEGORY_COLORS[category] || CATEGORY_COLORS.other)}>
              {category?.replace('-', ' ')}
            </span>
            {location?.village && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" /> {location.village}
              </span>
            )}
          </div>
        )}

        <h3 className={clsx(
          'font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2',
          compact ? 'text-sm mb-1' : 'text-base mb-2'
        )}>
          {title}
        </h3>

        {!compact && excerpt && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{excerpt}</p>
        )}

        {/* Progress bar */}
        <div className={clsx(compact ? 'mt-auto' : '')}>
          <div className="progress-bar mb-1.5">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${progress}% funded`}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className={clsx('font-bold text-gray-900', compact ? 'text-sm' : 'text-base')}>
                {formatConverted(raisedAmount, currency)}
              </span>
              {!compact && (
                <span className="text-xs text-gray-400 ml-1">
                  of {formatConverted(targetAmount, currency)}
                </span>
              )}
            </div>
            <span className={clsx('font-semibold text-primary-600', compact ? 'text-xs' : 'text-sm')}>
              {progress}%
            </span>
          </div>

          {!compact && (
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {donorCount?.toLocaleString() || 0} donors
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {days > 0 ? `${days} days left` : 'Ended'}
              </span>
              {creator && (
                <span className="ml-auto flex items-center gap-1">
                  {creator.avatar && (
                    <img src={creator.avatar} alt={creator.firstName} className="w-4 h-4 rounded-full" />
                  )}
                  {creator.firstName}
                  {creator.isVerifiedCreator && <Shield className="w-3 h-3 text-blue-500" />}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

const CATEGORY_EMOJIS = {
  community: '🏘️', education: '📚', health: '🏥', infrastructure: '🏗️',
  'disaster-relief': '🆘', environment: '🌱', arts: '🎨', technology: '💻',
  agriculture: '🌾', business: '💼', other: '🌍'
};
