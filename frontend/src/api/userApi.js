import { apiFetch } from './client';

export const userApi = {
  create: async (data) => {
    return apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createUser: async (data) => {
    return apiFetch('/users', {
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
    return apiFetch(`/users?${query.toString()}`, { method: 'GET' });
  },

  getDirectory: async () => {
    return apiFetch('/users/directory', { method: 'GET' });
  },

  getUsers: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    return apiFetch(`/users?${query.toString()}`, { method: 'GET' });
  },

  getById: async (id) => {
    return apiFetch(`/users/${id}`, { method: 'GET' });
  },

  update: async (id, data) => {
    return apiFetch(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateUser: async (id, data) => {
    return apiFetch(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteUser: async (id) => {
    return apiFetch(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
  },

  updateStatus: async (id, is_active) => {
    return apiFetch(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  },

  resetPassword: async (id, new_password) => {
    return apiFetch(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password }),
    });
  },

  unlock: async (id) => {
    return apiFetch(`/users/${id}/unlock`, {
      method: 'POST',
    });
  },
};

