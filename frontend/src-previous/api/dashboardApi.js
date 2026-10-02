import { apiFetch } from './client';

export const dashboardApi = {
  getSummary: async () => {
    return apiFetch('/dashboard/summary', { method: 'GET' });
  },

  getStatusBoard: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit_per_column) query.append('limit_per_column', params.limit_per_column);
    if (params.quality) query.append('quality', params.quality);
    if (params.supplier) query.append('supplier', params.supplier);
    const queryString = query.toString();
    return apiFetch(`/dashboard/status-board${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  getBreakdown: async (by = 'quality') => {
    return apiFetch(`/dashboard/breakdown?by=${by}`, { method: 'GET' });
  },

  getAging: async (minDays = 30, page = 1, limit = 20) => {
    return apiFetch(`/dashboard/aging?min_days=${minDays}&page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },
};
