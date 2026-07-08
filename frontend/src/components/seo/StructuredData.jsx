// Renders JSON-LD structured data. Improves Google rich results and helps
// LLMs / AI search engines accurately understand and cite the platform.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://crowdfundafrica.com';

export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, server-generated content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'CrowdfundAfrica',
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512x512.png`,
        description:
          'A multilingual, multi-currency crowdfunding platform connecting communities across Africa and the world.',
        sameAs: [
          'https://twitter.com/crowdfundafrica',
          'https://www.facebook.com/crowdfundafrica'
        ]
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'CrowdfundAfrica',
        url: SITE_URL,
        inLanguage: ['en', 'fr', 'es', 'ar', 'wo'],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/campaigns?search={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      }}
    />
  );
}

// Represents a fundraising campaign as a schema.org DonateAction target.
export function CampaignJsonLd({ campaign }) {
  if (!campaign) return null;
  const raised = Number(campaign.raisedAmount || 0);
  const goal = Number(campaign.targetAmount || 0);

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'DonateAction',
        name: campaign.title,
        description:
          campaign.shortDescription ||
          (campaign.description ? campaign.description.slice(0, 300) : undefined),
        url: `${SITE_URL}/campaigns/${campaign._id}`,
        image: campaign.coverImage || undefined,
        recipient: {
          '@type': 'Organization',
          name: campaign.creator
            ? `${campaign.creator.firstName || ''} ${campaign.creator.lastName || ''}`.trim() ||
              'CrowdfundAfrica campaign'
            : 'CrowdfundAfrica campaign'
        },
        ...(goal > 0 && {
          result: {
            '@type': 'MonetaryAmount',
            currency: campaign.currency || 'USD',
            value: raised,
            minValue: 0,
            maxValue: goal
          }
        })
      }}
    />
  );
}
