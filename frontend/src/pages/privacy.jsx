import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { NextSeo } from 'next-seo';
import Layout from '../components/layout/Layout';

const UPDATED = 'July 8, 2026';

export default function PrivacyPage() {
  return (
    <>
      <NextSeo
        title="Privacy Policy"
        description="How CrowdfundAfrica collects, uses, and protects your personal data."
        canonical="https://crowdfundafrica.com/privacy"
      />
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-900">1. Information we collect</h2>
              <p>
                We collect information you provide directly — such as your name, email, phone number, and
                profile details — as well as campaign content, donation records, and technical data like IP
                address, device, and usage analytics. Payment card details are handled directly by our
                payment processors and are not stored on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">2. How we use your information</h2>
              <p>
                We use your information to operate the Platform, process donations and payouts, verify
                identity and prevent fraud, send transactional and (with consent) marketing communications,
                provide multi-currency and location-based features, and comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">3. Sharing</h2>
              <p>
                We share data with payment processors (Stripe, Flutterwave, Paystack), infrastructure and
                communication providers (e.g. cloud hosting, email/SMS), and authorities where required by
                law. Certain campaign information (title, story, creator name, progress) and, if you opt in,
                on-chain donation records are public by design. We do not sell your personal data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">4. Cookies</h2>
              <p>
                We use cookies and similar technologies for authentication, preferences (language and
                currency), and analytics. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">5. Data retention and security</h2>
              <p>
                We retain personal data only as long as necessary for the purposes described or as required
                by law. We apply industry-standard safeguards, but no method of transmission or storage is
                completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">6. Your rights</h2>
              <p>
                Depending on your jurisdiction, you may have the right to access, correct, delete, or port
                your data, and to object to or restrict certain processing. To exercise these rights, contact
                us at{' '}
                <a href="mailto:privacy@crowdfundafrica.com" className="text-primary-600 underline">privacy@crowdfundafrica.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">7. International transfers</h2>
              <p>
                As a platform serving Africa and the world, your data may be processed in countries other
                than your own. We take steps to ensure appropriate safeguards for such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">8. Children</h2>
              <p>
                The Platform is not intended for individuals under 18, and we do not knowingly collect their
                personal data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">9. Contact</h2>
              <p>
                For any privacy questions, email{' '}
                <a href="mailto:privacy@crowdfundafrica.com" className="text-primary-600 underline">privacy@crowdfundafrica.com</a>.
                See also our <Link href="/terms" className="text-primary-600 underline">Terms of Service</Link>.
              </p>
            </section>

            <p className="text-sm text-gray-400 border-t border-gray-100 pt-6">
              This document is a general template and does not constitute legal advice. Have it reviewed by
              qualified counsel (including GDPR/local data-protection requirements) before launch.
            </p>
          </div>
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
}
