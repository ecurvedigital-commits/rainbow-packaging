import { apiFetch } from './client';

export const digestApi = {
  getPreview: async (date = '') => {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiFetch(`/digest/preview${query}`, { method: 'GET' });
  },

  getDailyDigest: async (date = '') => {
    return digestApi.getPreview(date);
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
