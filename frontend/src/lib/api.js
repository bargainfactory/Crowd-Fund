import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/api/auth/refresh-token`, { refreshToken });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth APIs ──────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyTwoFactor: (data) => api.post('/auth/2fa/verify', data),
  setupTwoFactor: () => api.post('/auth/2fa/setup'),
  enableTwoFactor: (data) => api.post('/auth/2fa/enable', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// ─── Campaign APIs ──────────────────────────────────────────────────────────
export const campaignAPI = {
  getAll: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  getRecommended: (params) => api.get('/campaigns/recommended', { params }),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  addUpdate: (id, data) => api.post(`/campaigns/${id}/updates`, data),
  addComment: (id, data) => api.post(`/campaigns/${id}/comments`, data),
  getAnalytics: (id) => api.get(`/campaigns/${id}/analytics`),
  uploadMedia: (formData) => api.post('/campaigns/upload/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  moderate: (id, data) => api.patch(`/campaigns/${id}/moderate`, data),
  getExchangeRates: () => api.get('/campaigns/meta/exchange-rates')
};

// ─── Payment APIs ───────────────────────────────────────────────────────────
export const paymentAPI = {
  initStripe: (data) => api.post('/payments/stripe/init', data),
  initFlutterwave: (data) => api.post('/payments/flutterwave/init', data),
  initPaystack: (data) => api.post('/payments/paystack/init', data),
  getDonationStatus: (ref) => api.get(`/payments/status/${ref}`),
  getMyAnalytics: (params) => api.get('/payments/my-analytics', { params }),
  requestPayout: (data) => api.post('/payments/payout/request', data),
  getMyDonations: () => api.get('/payments/my-donations'),
  getReceipt: (donationId) => api.get(`/payments/receipt/${donationId}`, { responseType: 'blob' })
};

// ─── Blockchain APIs ────────────────────────────────────────────────────────
export const blockchainAPI = {
  getCampaignData: (id) => api.get(`/blockchain/campaign/${id}`),
  verifyTx: (txHash, network) => api.get(`/blockchain/verify/${txHash}/${network}`),
  getMyTransactions: () => api.get('/blockchain/my-transactions')
};

// ─── Admin APIs ─────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  banUser: (id, reason) => api.patch(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id) => api.patch(`/admin/users/${id}/unban`),
  verifyCreator: (id) => api.patch(`/admin/users/${id}/verify-creator`),
  getCampaigns: (params) => api.get('/admin/campaigns', { params }),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getFlaggedDonations: () => api.get('/admin/flagged-donations'),
  approvePayout: (campaignId) => api.post(`/admin/campaigns/${campaignId}/payout/approve`)
};

export default api;
