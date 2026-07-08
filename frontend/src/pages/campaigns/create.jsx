import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Layout from '../../components/layout/Layout';
import { campaignAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRight, ArrowLeft, Check, Upload, ImageIcon, Loader2, Target,
  MapPin, Calendar, Tag as TagIcon, Shield, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CATEGORIES = [
  { id: 'community', label: 'Community', emoji: '🏘️' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'health', label: 'Health', emoji: '🏥' },
  { id: 'infrastructure', label: 'Infrastructure', emoji: '🏗️' },
  { id: 'disaster-relief', label: 'Disaster Relief', emoji: '🆘' },
  { id: 'environment', label: 'Environment', emoji: '🌍' },
  { id: 'agriculture', label: 'Agriculture', emoji: '🌾' },
  { id: 'arts', label: 'Arts', emoji: '🎨' },
  { id: 'technology', label: 'Technology', emoji: '💡' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'other', label: 'Other', emoji: '✨' }
];

const CURRENCIES = ['USD', 'EUR', 'XOF', 'NGN', 'KES', 'GHS', 'ZAR', 'GBP'];
const STEPS = ['Basics', 'Story & Media', 'Goal & Location', 'Review'];
const DRAFT_KEY = 'campaign-draft-v1';

export default function CreateCampaign() {
  const { t } = useTranslation('common');
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [coverPreview, setCoverPreview] = useState('');

  const [form, setForm] = useState({
    title: '',
    category: '',
    shortDescription: '',
    description: '',
    coverImage: '',
    deadline: '',
    targetAmount: '',
    currency: 'USD',
    country: '',
    village: '',
    tags: '',
    blockchainEnabled: false
  });

  // Redirect unauthenticated users to login (preserving intent).
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login?returnUrl=/campaigns/create');
    }
  }, [authLoading, isAuthenticated, router]);

  // Restore a saved draft once on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        setForm((f) => ({ ...f, ...draft }));
        if (draft.coverImage) setCoverPreview(draft.coverImage);
      }
    } catch {}
  }, []);

  // Persist draft whenever the form changes.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await campaignAPI.uploadMedia(fd);
      update('coverImage', data.url);
      setCoverPreview(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
      setCoverPreview('');
    } finally {
      setUploading(false);
    }
  }, []);

  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.title.trim()) e.title = 'Give your campaign a title';
      else if (form.title.length > 200) e.title = 'Title must be under 200 characters';
      if (!form.category) e.category = 'Pick a category';
      if (form.shortDescription.length > 300) e.shortDescription = 'Keep the summary under 300 characters';
    }
    if (s === 1) {
      if (!form.description.trim()) e.description = 'Tell your story';
      if (!form.coverImage) e.coverImage = 'A cover image is required';
      if (!form.deadline) e.deadline = 'Set a deadline';
      else if (new Date(form.deadline) <= new Date()) e.deadline = 'Deadline must be in the future';
    }
    if (s === 2) {
      const amt = parseFloat(form.targetAmount);
      if (!amt || amt < 1) e.targetAmount = 'Enter a goal of at least 1';
      if (!form.country.trim()) e.country = 'Country is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    else toast.error('Please fix the highlighted fields');
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    for (let s = 0; s <= 2; s++) {
      if (!validateStep(s)) {
        setStep(s);
        toast.error('Please complete all required fields');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        coverImage: form.coverImage,
        deadline: form.deadline,
        targetAmount: parseFloat(form.targetAmount),
        currency: form.currency,
        location: { country: form.country.trim(), village: form.village.trim() || undefined },
        tags: form.tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
        blockchainEnabled: form.blockchainEnabled
      };
      const { data } = await campaignAPI.create(payload);
      localStorage.removeItem(DRAFT_KEY);
      toast.success(data.message || 'Campaign submitted for review!');
      const id = data.data?._id;
      router.push(id ? `/campaigns/${id}` : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <>
      <NextSeo
        title="Start a Campaign"
        description="Create a fundraising campaign on CrowdfundAfrica in a few simple steps."
        noindex
      />
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t('create.title', 'Start a Campaign')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('create.subtitle', 'Share your cause with the world in four quick steps.')}
            </p>
          </div>

          {/* Stepper */}
          <ol className="flex items-center mb-8" aria-label="Progress">
            {STEPS.map((label, i) => (
              <li key={label} className={clsx('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
                      i < step && 'bg-primary-600 text-white',
                      i === step && 'bg-primary-600 text-white ring-4 ring-primary-100',
                      i > step && 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className={clsx('text-sm font-medium hidden sm:inline', i <= step ? 'text-gray-900' : 'text-gray-400')}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={clsx('flex-1 h-0.5 mx-3', i < step ? 'bg-primary-600' : 'bg-gray-200')} />
                )}
              </li>
            ))}
          </ol>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            {/* STEP 0 - Basics */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <label className="form-label" htmlFor="title">Campaign title *</label>
                  <input id="title" className="form-input" maxLength={200}
                    value={form.title} onChange={(e) => update('title', e.target.value)}
                    placeholder="e.g. Clean water for Fadiouth village" />
                  {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <span className="form-label">Category *</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {CATEGORIES.map((c) => (
                      <button type="button" key={c.id} onClick={() => update('category', c.id)}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left',
                          form.category === c.id
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        )}>
                        <span className="text-lg">{c.emoji}</span> {c.label}
                      </button>
                    ))}
                  </div>
                  {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
                </div>

                <div>
                  <label className="form-label" htmlFor="short">Short summary</label>
                  <textarea id="short" className="form-input resize-none" rows={2} maxLength={300}
                    value={form.shortDescription} onChange={(e) => update('shortDescription', e.target.value)}
                    placeholder="One or two sentences shown in campaign cards and search results." />
                  <p className="text-xs text-gray-400 mt-1">{form.shortDescription.length}/300</p>
                  {errors.shortDescription && <p className="text-sm text-red-600 mt-1">{errors.shortDescription}</p>}
                </div>
              </div>
            )}

            {/* STEP 1 - Story & Media */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <span className="form-label">Cover image *</span>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files?.[0]); }}
                    className="mt-1 relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden cursor-pointer hover:border-primary-400 transition-colors"
                  >
                    {coverPreview ? (
                      <div className="relative aspect-video bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                        {uploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                        <span className="absolute bottom-2 right-2 bg-white/90 text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1">
                          <Upload className="w-3 h-3" /> Change
                        </span>
                      </div>
                    ) : (
                      <div className="aspect-video flex flex-col items-center justify-center text-gray-400 gap-2">
                        {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-10 h-10" />}
                        <p className="text-sm font-medium">Click or drag an image here</p>
                        <p className="text-xs">JPG, PNG or WebP up to 10MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])} />
                  {errors.coverImage && <p className="text-sm text-red-600 mt-1">{errors.coverImage}</p>}
                </div>

                <div>
                  <label className="form-label" htmlFor="desc">Your story *</label>
                  <textarea id="desc" className="form-input resize-none" rows={8} maxLength={10000}
                    value={form.description} onChange={(e) => update('description', e.target.value)}
                    placeholder="Explain what you're raising money for, why it matters, and how funds will be used." />
                  <p className="text-xs text-gray-400 mt-1">{form.description.length}/10000</p>
                  {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                </div>

                <div>
                  <label className="form-label" htmlFor="deadline">
                    <Calendar className="w-4 h-4 inline mr-1 -mt-0.5" /> Deadline *
                  </label>
                  <input id="deadline" type="date" className="form-input"
                    value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
                  {errors.deadline && <p className="text-sm text-red-600 mt-1">{errors.deadline}</p>}
                </div>
              </div>
            )}

            {/* STEP 2 - Goal & Location */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="form-label" htmlFor="goal">
                      <Target className="w-4 h-4 inline mr-1 -mt-0.5" /> Funding goal *
                    </label>
                    <input id="goal" type="number" min="1" step="any" className="form-input"
                      value={form.targetAmount} onChange={(e) => update('targetAmount', e.target.value)}
                      placeholder="5000" />
                    {errors.targetAmount && <p className="text-sm text-red-600 mt-1">{errors.targetAmount}</p>}
                  </div>
                  <div>
                    <label className="form-label" htmlFor="currency">Currency</label>
                    <select id="currency" className="form-input"
                      value={form.currency} onChange={(e) => update('currency', e.target.value)}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="country">
                      <MapPin className="w-4 h-4 inline mr-1 -mt-0.5" /> Country *
                    </label>
                    <input id="country" className="form-input"
                      value={form.country} onChange={(e) => update('country', e.target.value)}
                      placeholder="e.g. Senegal" />
                    {errors.country && <p className="text-sm text-red-600 mt-1">{errors.country}</p>}
                  </div>
                  <div>
                    <label className="form-label" htmlFor="village">Village / community</label>
                    <input id="village" className="form-input"
                      value={form.village} onChange={(e) => update('village', e.target.value)}
                      placeholder="e.g. Fadiouth (optional)" />
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="tags">
                    <TagIcon className="w-4 h-4 inline mr-1 -mt-0.5" /> Tags
                  </label>
                  <input id="tags" className="form-input"
                    value={form.tags} onChange={(e) => update('tags', e.target.value)}
                    placeholder="water, clean-water, sanitation (comma separated)" />
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-primary-300">
                  <input type="checkbox" className="mt-1" checked={form.blockchainEnabled}
                    onChange={(e) => update('blockchainEnabled', e.target.checked)} />
                  <span>
                    <span className="font-medium text-gray-900 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-purple-600" /> Enable blockchain transparency
                    </span>
                    <span className="text-sm text-gray-500 block">
                      Record donations on-chain (Polygon) so supporters can independently verify every contribution.
                    </span>
                  </span>
                </label>
              </div>
            )}

            {/* STEP 3 - Review */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <Eye className="w-5 h-5 text-primary-600" /> Review your campaign
                </div>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="relative aspect-video bg-gray-100">
                    {form.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.coverImage} alt={form.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-5 space-y-2">
                    <span className="badge-green capitalize">{form.category?.replace('-', ' ')}</span>
                    <h3 className="font-bold text-gray-900 text-lg">{form.title}</h3>
                    <p className="text-sm text-gray-600">{form.shortDescription}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-2 border-t border-gray-100 mt-2">
                      <span><Target className="w-4 h-4 inline mr-1" />{form.currency} {Number(form.targetAmount || 0).toLocaleString()}</span>
                      <span><MapPin className="w-4 h-4 inline mr-1" />{[form.village, form.country].filter(Boolean).join(', ')}</span>
                      <span><Calendar className="w-4 h-4 inline mr-1" />Ends {form.deadline}</span>
                      {form.blockchainEnabled && <span className="text-purple-600"><Shield className="w-4 h-4 inline mr-1" />On-chain</span>}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Your campaign will be submitted for a quick review before going live. By submitting you agree to our{' '}
                  <Link href="/terms" className="text-primary-600 underline">Terms</Link>.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              {step > 0 ? (
                <button type="button" onClick={back} className="btn-outline inline-flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : <span />}

              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} disabled={uploading}
                  className="btn-primary inline-flex items-center gap-1 disabled:opacity-60">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={submitting}
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Submit campaign <Check className="w-4 h-4" /></>}
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
}
