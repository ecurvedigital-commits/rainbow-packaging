import { apiFetch } from './client';

export const approvalApi = {
  getPending: async (params = {}) => {
    const query = new URLSearchParams();
    if (typeof params === 'object') {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val);
        }
      });
    } else {
      query.append('page', params || 1);
    }
    const queryString = query.toString();
    return apiFetch(`/approvals/pending${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  getMine: async (params = {}) => {
    return approvalApi.getHistory(params);
  },

  getHistory: async (params = {}) => {
    const query = new URLSearchParams();
    if (typeof params === 'object') {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val);
        }
      });
    } else {
      query.append('page', params || 1);
    }
    const queryString = query.toString();
    return apiFetch(`/approvals/mine${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  confirm: async (eventId) => {
    return apiFetch(`/approvals/${eventId}/confirm`, {
      method: 'POST',
    });
  },

  approve: async (eventId) => {
    return approvalApi.confirm(eventId);
  },

  decline: async (eventId, reasonInput = '') => {
    const reason = typeof reasonInput === 'object' ? reasonInput.reason || '' : String(reasonInput || '');
    return apiFetch(`/approvals/${eventId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
