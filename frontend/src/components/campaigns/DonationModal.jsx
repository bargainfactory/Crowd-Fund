import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { paymentAPI } from '../../lib/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import { X, CreditCard, Smartphone, Globe, Shield, ChevronRight, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY)
  : null;

const PAYMENT_METHODS = [
  { id: 'stripe', label: 'Card (Stripe)', icon: <CreditCard className="w-5 h-5" />, description: 'Visa, Mastercard, Amex', badge: 'International' },
  { id: 'flutterwave', label: 'Flutterwave', icon: <Globe className="w-5 h-5 text-orange-500" />, description: 'Cards, Mobile Money, Bank', badge: 'Africa', highlight: true },
  { id: 'mobile_money', label: 'Mobile Money', icon: <Smartphone className="w-5 h-5 text-green-500" />, description: 'M-Pesa, Orange Money, Wave', badge: 'Supported' }
];

const SUGGESTED_AMOUNTS = [5, 10, 25, 50, 100, 250];

// Stripe checkout form component
const StripeCheckoutForm = ({ onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required'
      });

      if (error) {
        onError(error.message);
      } else {
        onSuccess();
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={loading || !stripe}
        className="btn-primary w-full"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : 'Confirm Donation'}
      </button>
    </form>
  );
};

export default function DonationModal({ campaign, onClose }) {
  const { t } = useTranslation('common');
  const { user, isAuthenticated } = useAuth();
  const { currency, format, convert } = useCurrency();

  const [step, setStep] = useState(1); // 1: amount, 2: method, 3: details, 4: success
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donorCurrency, setDonorCurrency] = useState(currency);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedAmount = amount === 'custom' ? parseFloat(customAmount) : parseFloat(amount);
  const platformFee = selectedAmount ? Math.round(selectedAmount * 0.03 * 100) / 100 : 0;
  const totalWithFee = selectedAmount ? selectedAmount + platformFee : 0;

  const handleAmountSelect = (val) => {
    setAmount(val.toString());
    setCustomAmount('');
  };

  const handleProceedToPayment = async () => {
    if (!selectedAmount || selectedAmount < 1) {
      toast.error('Please enter a valid amount (minimum 1)');
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === 'stripe') {
        const { data } = await paymentAPI.initStripe({
          campaignId: campaign._id,
          amount: selectedAmount,
          currency: donorCurrency,
          donorEmail: user?.email,
          isAnonymous,
          message
        });
        setStripeClientSecret(data.clientSecret);
      } else if (paymentMethod === 'flutterwave' || paymentMethod === 'mobile_money') {
        const { data } = await paymentAPI.initFlutterwave({
          campaignId: campaign._id,
          amount: selectedAmount,
          currency: donorCurrency,
          email: user?.email,
          name: user ? `${user.firstName} ${user.lastName}` : undefined,
          paymentType: paymentMethod === 'mobile_money' ? 'mobilemoneysn' : 'all',
          redirectUrl: `${window.location.origin}/campaigns/${campaign.slug}?payment=success`
        });
        // Redirect to Flutterwave payment page
        window.open(data.paymentLink, '_blank');
        setSuccess(true);
        setStep(4);
        return;
      }
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSuccess = () => {
    setSuccess(true);
    setStep(4);
    toast.success('Donation successful! Thank you!');
  };

  const handleStripeError = (message) => {
    toast.error(message || 'Payment failed. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog" aria-modal="true" aria-label="Make a donation">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 4 ? 'Donation Complete!' : t('donate.title', 'Make a Donation')}
            </h2>
            <p className="text-sm text-gray-500 line-clamp-1">{campaign.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Step 1: Amount selection */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Campaign progress */}
              <div className="bg-primary-50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Raised</span>
                  <span className="font-semibold text-gray-900">{campaign.progressPercentage || 0}% of goal</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${campaign.progressPercentage || 0}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{campaign.donorCount?.toLocaleString() || 0} donors</p>
              </div>

              {/* Suggested amounts */}
              <div>
                <label className="form-label">Select amount ({donorCurrency})</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(campaign.suggestedAmounts || SUGGESTED_AMOUNTS).map(val => (
                    <button
                      key={val}
                      onClick={() => handleAmountSelect(val)}
                      className={clsx(
                        'py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                        amount === val.toString()
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-200 text-gray-700 hover:border-primary-300'
                      )}
                    >
                      {format(val, donorCurrency)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAmount('custom')}
                  className={clsx(
                    'w-full py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                    amount === 'custom'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-primary-300'
                  )}
                >
                  Custom Amount
                </button>

                {amount === 'custom' && (
                  <div className="mt-2 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                      {donorCurrency}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      className="form-input pl-16"
                      placeholder="Enter amount"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Currency selector */}
              <div>
                <label className="form-label">Currency</label>
                <select
                  value={donorCurrency}
                  onChange={e => setDonorCurrency(e.target.value)}
                  className="form-input"
                >
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'XOF', 'XAF', 'NGN', 'KES', 'GHS', 'ZAR'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Recurring */}
              {campaign.allowRecurring && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={e => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Make this a monthly donation</span>
                </label>
              )}

              {selectedAmount > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Donation</span>
                    <span>{format(selectedAmount, donorCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Platform fee (3%)</span>
                    <span>{format(platformFee, donorCurrency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span>{format(totalWithFee, donorCurrency)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!selectedAmount || selectedAmount < 1}
                className="btn-primary w-full"
              >
                Choose Payment Method <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}

          {/* Step 2: Payment method */}
          {step === 2 && (
            <div className="space-y-4">
              <button onClick={() => setStep(1)} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                ← Change Amount
              </button>

              <p className="text-sm font-medium text-gray-700">
                Donating: <strong>{format(selectedAmount, donorCurrency)}</strong>
              </p>

              <div className="space-y-2">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={clsx(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      paymentMethod === method.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      method.highlight ? 'bg-orange-100' : 'bg-gray-100'
                    )}>
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{method.label}</span>
                        {method.badge && (
                          <span className="badge-green text-xs">{method.badge}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{method.description}</p>
                    </div>
                    <div className={clsx(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      paymentMethod === method.id ? 'border-primary-600' : 'border-gray-300'
                    )}>
                      {paymentMethod === method.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Donor options */}
              <div className="space-y-3 border-t pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">Donate anonymously</span>
                </label>
                <div>
                  <label className="form-label text-xs">Message to campaign (optional)</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={2}
                    maxLength={500}
                    className="form-input text-sm resize-none"
                    placeholder="Leave a supportive message..."
                  />
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Initializing...' : `Pay ${format(selectedAmount, donorCurrency)}`}
              </button>

              <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secured by 256-bit SSL encryption
              </p>
            </div>
          )}

          {/* Step 3: Stripe payment form */}
          {step === 3 && stripeClientSecret && stripePromise && (
            <div className="space-y-4">
              <button onClick={() => setStep(2)} className="text-sm text-primary-600 hover:underline">
                ← Change payment method
              </button>
              <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                <StripeCheckoutForm onSuccess={handleStripeSuccess} onError={handleStripeError} />
              </Elements>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Thank You!</h3>
              <p className="text-gray-600">
                Your donation of <strong>{format(selectedAmount, donorCurrency)}</strong> to{' '}
                <strong>{campaign.title}</strong> is being processed.
              </p>
              {campaign.blockchainEnabled && (
                <p className="text-sm text-purple-600 bg-purple-50 rounded-xl p-3">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Your donation will be recorded on the blockchain for full transparency.
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary flex-1">Close</button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/campaigns/${campaign.slug}`;
                    navigator.share?.({ title: campaign.title, url }) ||
                      navigator.clipboard.writeText(url);
                    toast.success('Campaign link copied!');
                  }}
                  className="btn-primary flex-1"
                >
                  Share Campaign
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
