import { apiFetch } from './client';

export const settingsApi = {
  getSettings: async () => {
    return apiFetch('/settings', { method: 'GET' });
  },

  updateSettings: async (data) => {
    return apiFetch('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
