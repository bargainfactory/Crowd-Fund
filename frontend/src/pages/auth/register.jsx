import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Heart, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' }, { code: 'ar', name: 'العربية' }, { code: 'wo', name: 'Wolof' }
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'XOF', 'XAF', 'NGN', 'KES', 'GHS', 'ZAR'];

export default function RegisterPage() {
  const { t } = useTranslation('common');
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', preferredLanguage: 'en', preferredCurrency: 'USD', agreeTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrength = () => {
    const p = form.password;
    if (p.length === 0) return { score: 0, label: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    return { score, label: labels[score], color: colors[score] };
  };

  const strength = passwordStrength();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.agreeTerms) { setError('Please agree to the Terms of Service'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    setError('');

    try {
      const { confirmPassword, agreeTerms, ...submitData } = form;
      await register(submitData);
      toast.success('Account created! Please check your email to verify.');
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/${provider}`;
  };

  return (
    <>
      <NextSeo title="Create Account" noindex />

      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">CrowdfundAfrica</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('register.title', 'Create your account')}</h1>
            <p className="text-gray-500 text-sm mb-6">
              {t('register.hasAccount', 'Already have an account?')}{' '}
              <Link href="/auth/login" className="text-primary-600 font-medium hover:underline">
                {t('register.login', 'Sign in')}
              </Link>
            </p>

            {/* OAuth */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button onClick={() => handleOAuth('google')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button onClick={() => handleOAuth('facebook')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-sm text-white hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>

            <div className="relative flex items-center my-5">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="mx-4 text-sm text-gray-400">or with email</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="form-label">First Name</label>
                  <input id="firstName" name="firstName" type="text" value={form.firstName}
                    onChange={handleChange} className="form-input" placeholder="Amara" required />
                </div>
                <div>
                  <label htmlFor="lastName" className="form-label">Last Name</label>
                  <input id="lastName" name="lastName" type="text" value={form.lastName}
                    onChange={handleChange} className="form-input" placeholder="Diallo" required />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="form-label">Email Address</label>
                <input id="email" name="email" type="email" value={form.email}
                  onChange={handleChange} className="form-input" placeholder="your@email.com"
                  autoComplete="email" required />
              </div>

              <div>
                <label htmlFor="phone" className="form-label">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
                <input id="phone" name="phone" type="tel" value={form.phone}
                  onChange={handleChange} className="form-input" placeholder="+221 77 000 0000" />
              </div>

              <div>
                <label htmlFor="password" className="form-label">Password</label>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                    value={form.password} onChange={handleChange} className="form-input pr-11"
                    placeholder="Min 8 characters" autoComplete="new-password" required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">Password strength: {strength.label}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword} onChange={handleChange} className="form-input"
                  placeholder="Repeat password" autoComplete="new-password" required />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Preferred Language</label>
                  <select name="preferredLanguage" value={form.preferredLanguage}
                    onChange={handleChange} className="form-input">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Preferred Currency</label>
                  <select name="preferredCurrency" value={form.preferredCurrency}
                    onChange={handleChange} className="form-input">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="agreeTerms" checked={form.agreeTerms}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
                  I understand my data is handled per GDPR regulations.
                </span>
              </label>

              <button type="submit" disabled={loading || !form.agreeTerms} className="btn-primary w-full py-3.5 text-base">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Protected by reCAPTCHA • GDPR compliant • PCI-DSS certified
          </p>
        </div>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: { ...(await serverSideTranslations(locale || 'en', ['common'])) }
  };
}
