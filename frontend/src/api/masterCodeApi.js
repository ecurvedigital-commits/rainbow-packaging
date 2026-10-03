import { apiFetch } from './client';

export const masterCodeApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return apiFetch(`/master-codes${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  create: async (data) => {
    return apiFetch('/master-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiFetch(`/master-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiFetch(`/master-codes/${id}`, {
      method: 'DELETE',
    });
  },
};
