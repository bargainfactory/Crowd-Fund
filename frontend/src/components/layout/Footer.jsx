import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { Heart, Twitter, Facebook, Instagram, Github, Mail } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation('common');

  const links = {
    platform: [
      { href: '/campaigns', label: t('footer.browseCampaigns', 'Browse Campaigns') },
      { href: '/campaigns/create', label: t('footer.startCampaign', 'Start a Campaign') },
      { href: '/campaigns?featured=true', label: t('footer.featured', 'Featured Causes') }
    ],
    community: [
      { href: '/campaigns?category=community', label: t('footer.communities', 'Communities') },
      { href: '/campaigns?country=Senegal', label: 'Fadiouth Campaigns' },
      { href: '/campaigns?category=education', label: t('footer.education', 'Education') }
    ],
    company: [
      { href: '/about', label: t('footer.about', 'About Us') },
      { href: '/privacy', label: t('footer.privacy', 'Privacy Policy') },
      { href: '/terms', label: t('footer.terms', 'Terms of Service') },
      { href: '/contact', label: t('footer.contact', 'Contact') }
    ],
    support: [
      { href: '/faq', label: t('footer.faq', 'FAQ') },
      { href: '/how-it-works', label: t('footer.howItWorks', 'How It Works') },
      { href: '/fees', label: t('footer.fees', 'Fees & Pricing') },
      { href: '/transparency', label: t('footer.transparency', 'Transparency') }
    ]
  };

  const socials = [
    { Icon: Twitter, href: 'https://twitter.com/crowdfundafrica', label: 'Twitter' },
    { Icon: Facebook, href: 'https://facebook.com/crowdfundafrica', label: 'Facebook' },
    { Icon: Instagram, href: 'https://instagram.com/crowdfundafrica', label: 'Instagram' }
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-white">CrowdfundAfrica</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4 max-w-xs">
              {t('footer.tagline', 'Empowering communities across Africa and the world to fund the change they want to see.')}
            </p>
            <div className="flex gap-3">
              {socials.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-gray-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors"
                  aria-label={label}>
                  <Icon className="w-4 h-4" />
                </a>
              ))}
              <a href="mailto:hello@crowdfundafrica.com"
                className="w-9 h-9 bg-gray-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {[
            { title: t('footer.platform', 'Platform'), items: links.platform },
            { title: t('footer.community', 'Community'), items: links.community },
            { title: t('footer.support', 'Support'), items: links.support }
          ].map(({ title, items }) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{title}</h3>
              <ul className="space-y-2">
                {items.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment providers */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <p className="text-xs text-gray-500 mb-4 text-center">{t('footer.paymentPartners', 'Secure payments via')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Stripe', 'Flutterwave', 'Paystack', 'PayPal', 'M-Pesa', 'Orange Money', 'Wave'].map(partner => (
              <span key={partner} className="px-3 py-1 bg-gray-800 rounded-md text-xs text-gray-400 font-medium">
                {partner}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            {t('footer.copyright', `© ${new Date().getFullYear()} CrowdfundAfrica. All rights reserved.`)}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
              {t('footer.secured', 'Secured with TLS 1.3')}
            </span>
            <span className="text-xs text-gray-500">GDPR Compliant</span>
            <span className="text-xs text-gray-500">PCI-DSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
