import { apiFetch } from './client';

export const masterProductApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return apiFetch(`/master-products${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  getById: async (id) => {
    return apiFetch(`/master-products/${id}`, {
      method: 'GET',
    });
  },

  getReels: async (id, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return apiFetch(`/master-products/${id}/reels${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  previewKey: async (data) => {
    return apiFetch('/master-products/preview-key', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id, isActive) => {
    return apiFetch(`/master-products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  },
};
