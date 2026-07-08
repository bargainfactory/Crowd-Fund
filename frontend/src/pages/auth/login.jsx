import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';
import { Eye, EyeOff, Heart, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { t } = useTranslation('common');
  const { login } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFAState, setTwoFAState] = useState({ required: false, tempToken: '', code: '' });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }

    setLoading(true);
    setError('');

    try {
      const result = await login(form);

      if (result.requiresTwoFactor) {
        setTwoFAState({ required: true, tempToken: result.tempToken, code: '' });
        toast.success('Enter your 2FA code');
        return;
      }

      toast.success(`Welcome back, ${result.user.firstName}!`);
      const returnUrl = router.query.returnUrl || '/dashboard';
      router.push(returnUrl);
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
      if (err.response?.status === 423) {
        setError('Account temporarily locked. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFASubmit = async (e) => {
    e.preventDefault();
    if (!twoFAState.code.trim()) { setError('Please enter the 2FA code'); return; }

    setLoading(true);
    try {
      const { verifyTwoFactor } = useAuth();
      const result = await verifyTwoFactor(twoFAState.tempToken, twoFAState.code);
      toast.success('Login successful!');
      router.push(router.query.returnUrl || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/${provider}`;
  };

  return (
    <>
      <NextSeo title="Login" noindex />

      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex">
        {/* Left side - branding */}
        <div className="hidden lg:flex flex-col justify-center px-12 bg-primary-700 text-white w-2/5">
          <Link href="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary-600 fill-primary-600" />
            </div>
            <span className="text-2xl font-bold">CrowdfundAfrica</span>
          </Link>
          <h2 className="text-3xl font-bold mb-4">Welcome back to the community</h2>
          <p className="text-primary-200 text-lg mb-8">
            Your donations are making a real difference across Africa and beyond.
          </p>
          <div className="space-y-4">
            {[
              { emoji: '🇸🇳', text: 'Fadiouth Water Well Project reached its goal!' },
              { emoji: '📚', text: '142 schools funded through our education campaigns' },
              { emoji: '💚', text: '$2.4M raised for African communities' }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
                <span className="text-2xl">{item.emoji}</span>
                <p className="text-sm text-primary-100">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <Link href="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">CrowdfundAfrica</span>
            </Link>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {twoFAState.required ? 'Two-Factor Authentication' : t('login.title', 'Sign In')}
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                {twoFAState.required
                  ? 'Enter the 6-digit code from your authenticator app'
                  : t('login.subtitle', "Don't have an account?") + ' '}
                {!twoFAState.required && (
                  <Link href="/auth/register" className="text-primary-600 font-medium hover:underline">
                    {t('login.register', 'Create one')}
                  </Link>
                )}
              </p>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {twoFAState.required ? (
                <form onSubmit={handleTwoFASubmit} className="space-y-4">
                  <div>
                    <label className="form-label">Authentication Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={twoFAState.code}
                      onChange={e => setTwoFAState(prev => ({ ...prev, code: e.target.value }))}
                      className="form-input text-center text-2xl tracking-widest"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                  <button type="button" onClick={() => setTwoFAState({ required: false, tempToken: '', code: '' })}
                    className="w-full text-sm text-gray-500 hover:text-gray-700">
                    Back to login
                  </button>
                </form>
              ) : (
                <>
                  {/* OAuth buttons */}
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => handleOAuth('google')}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </button>

                    <button
                      onClick={() => handleOAuth('facebook')}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Continue with Facebook
                    </button>
                  </div>

                  <div className="relative flex items-center my-5">
                    <div className="flex-1 border-t border-gray-200"></div>
                    <span className="mx-4 text-sm text-gray-400">or</span>
                    <div className="flex-1 border-t border-gray-200"></div>
                  </div>

                  {/* Email form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="form-label">{t('login.email', 'Email Address')}</label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="your@email.com"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="password" className="form-label mb-0">{t('login.password', 'Password')}</label>
                        <Link href="/auth/forgot-password" className="text-xs text-primary-600 hover:underline">
                          {t('login.forgotPassword', 'Forgot password?')}
                        </Link>
                      </div>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          className="form-input pr-11"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {t('login.submit', 'Sign In')} <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
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
