import { useState } from 'react';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import { authAPI } from '../../lib/api';
import { Heart, ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
    } catch {
      // Intentionally ignore errors: never reveal whether an email exists.
    } finally {
      // Always show the same confirmation to avoid account enumeration.
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <>
      <NextSeo title="Reset your password" noindex />

      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">CrowdfundAfrica</span>
          </Link>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            {sent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
                <p className="text-sm text-gray-500 mb-6">
                  If an account exists for <span className="font-medium text-gray-700">{email}</span>, we&apos;ve
                  sent a link to reset your password. It may take a few minutes to arrive.
                </p>
                <Link href="/auth/login" className="btn-primary inline-flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-1">Forgot your password?</h1>
                <p className="text-sm text-gray-500 mb-6">
                  Enter the email associated with your account and we&apos;ll send you a link to reset it.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="form-label" htmlFor="email">Email address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input id="email" type="email" required autoComplete="email"
                        className="form-input pl-9" placeholder="your@email.com"
                        value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send reset link'}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <Link href="/auth/login" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
}
