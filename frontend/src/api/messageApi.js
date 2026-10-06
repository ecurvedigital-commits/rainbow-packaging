import { apiFetch } from './client';

export const messageApi = {
  send: async (data) => {
    return apiFetch('/messages', {
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
    return apiFetch(`/messages${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  getById: async (id) => {
    return apiFetch(`/messages/${id}`, {
      method: 'GET',
    });
  },
};

export default messageApi;
