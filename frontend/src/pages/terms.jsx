import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { NextSeo } from 'next-seo';
import Layout from '../components/layout/Layout';

const UPDATED = 'July 8, 2026';

export default function TermsPage() {
  return (
    <>
      <NextSeo
        title="Terms of Service"
        description="The terms and conditions governing use of the CrowdfundAfrica platform."
        canonical="https://crowdfundafrica.com/terms"
      />
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of terms</h2>
              <p>
                By accessing or using CrowdfundAfrica (the &quot;Platform&quot;), you agree to be bound by these
                Terms of Service and our <Link href="/privacy" className="text-primary-600 underline">Privacy Policy</Link>.
                If you do not agree, please do not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">2. Accounts</h2>
              <p>
                You must provide accurate information when creating an account and are responsible for
                safeguarding your credentials and all activity under your account. You must be at least 18
                years old, or the age of majority in your jurisdiction, to use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">3. Campaigns and fundraising</h2>
              <p>
                Campaign creators are solely responsible for the accuracy of their campaigns and for using
                funds as described. Campaigns must be lawful and must not be misleading, fraudulent, or in
                breach of any third-party rights. We review campaigns before they go live but do not
                guarantee any campaign&apos;s legitimacy or outcome, and we may pause, remove, or refuse any
                campaign at our discretion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">4. Donations and payments</h2>
              <p>
                Donations are processed by third-party payment providers (including Stripe, Flutterwave, and
                Paystack). By donating you authorize the applicable provider to charge your payment method.
                Except where required by law or a campaign&apos;s stated refund policy, donations are generally
                non-refundable. Platform and payment-processing fees may apply and will be disclosed at
                checkout.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">5. Blockchain features</h2>
              <p>
                Campaigns may optionally use public blockchain networks to record donations. On-chain
                transactions are irreversible and publicly visible. You are responsible for any network
                (gas) fees and for the security of any wallet you connect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">6. Prohibited conduct</h2>
              <p>
                You agree not to use the Platform for money laundering, fraud, harassment, distribution of
                unlawful content, or any activity that violates applicable laws or sanctions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">7. Disclaimers and liability</h2>
              <p>
                The Platform is provided &quot;as is&quot; without warranties of any kind. To the fullest extent
                permitted by law, CrowdfundAfrica is not liable for indirect, incidental, or consequential
                damages arising from your use of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">8. Changes</h2>
              <p>
                We may update these Terms from time to time. Continued use of the Platform after changes take
                effect constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">9. Contact</h2>
              <p>
                Questions about these Terms? Email us at{' '}
                <a href="mailto:legal@crowdfundafrica.com" className="text-primary-600 underline">legal@crowdfundafrica.com</a>.
              </p>
            </section>

            <p className="text-sm text-gray-400 border-t border-gray-100 pt-6">
              This document is a general template and does not constitute legal advice. Have it reviewed by
              qualified counsel in your operating jurisdictions before launch.
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
