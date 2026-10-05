import { apiFetch } from './client';

export const digestApi = {
  getPreview: async (params = {}) => {
    let query = '';
    if (typeof params === 'string') {
      query = params ? `?date=${encodeURIComponent(params)}` : '';
    } else if (params && typeof params === 'object') {
      const q = new URLSearchParams();
      if (params.fromDate) q.append('from_date', params.fromDate);
      if (params.toDate) q.append('to_date', params.toDate);
      if (params.date) q.append('date', params.date);
      query = q.toString() ? `?${q.toString()}` : '';
    }
    return apiFetch(`/digest/preview${query}`, { method: 'GET' });
  },

  getDailyDigest: async (params = {}) => {
    return digestApi.getPreview(params);
  },

  sendDigest: async (date = '') => {
    return apiFetch('/digest/send', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  },

  getLogs: async (page = 1, limit = 20) => {
    return apiFetch(`/digest/logs?page=${page}&limit=${limit}`, { method: 'GET' });
  },
};
