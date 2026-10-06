import { apiFetch } from './client';

export const correctionApi = {
  create: async (data) => {
    return apiFetch('/corrections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  list: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return apiFetch(`/corrections${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  getById: async (id) => {
    return apiFetch(`/corrections/${id}`, {
      method: 'GET',
    });
  },

  getPendingCount: async () => {
    return apiFetch('/corrections/pending-count', {
      method: 'GET',
    });
  },

  resolve: async (id, payload = {}) => {
    return apiFetch(`/corrections/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  reject: async (id, payload = {}) => {
    return apiFetch(`/corrections/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

export default correctionApi;
