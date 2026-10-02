import { apiFetch } from './client';

export const authApi = {
  login: async (username, password) => {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  refresh: async (refreshToken) => {
    return apiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  logout: async () => {
    return apiFetch('/auth/logout', {
      method: 'POST',
    });
  },

  logoutAll: async () => {
    return apiFetch('/auth/logout-all', {
      method: 'POST',
    });
  },

  me: async () => {
    return apiFetch('/auth/me', {
      method: 'GET',
    });
  },

  changePassword: async (current_password, new_password, confirm_password) => {
    return apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password,
        new_password,
        confirm_password,
      }),
    });
  },
};
