import { apiFetch } from './client';

export const reelApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return apiFetch(`/reels${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  getReels: async (params = {}) => {
    return reelApi.list(params);
  },

  getQualities: async () => {
    return { success: true, data: ['Kraft 120GSM', 'Duplex 250GSM', 'White Top 150GSM', 'Virgin Kraft', 'Semi-Kraft'] };
  },

  getGsms: async () => {
    return { success: true, data: [80, 100, 120, 150, 180, 200, 250] };
  },

  getWidths: async () => {
    return { success: true, data: [30, 40, 50, 60, 70, 80, 100, 120] };
  },

  search: async (q, page = 1, limit = 20) => {
    const query = new URLSearchParams({ q: q || '', page, limit });
    return apiFetch(`/reels/search?${query.toString()}`, {
      method: 'GET',
    });
  },

  getNextReelNumber: async () => {
    return apiFetch('/reels/next-number', {
      method: 'GET',
    });
  },

  getFilterOptions: async () => {
    return apiFetch('/reels/filter-options', {
      method: 'GET',
    });
  },

  getUsageLogs: async (params = {}) => {
    const query = new URLSearchParams();
    if (typeof params === 'object') {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val);
        }
      });
    }
    const queryString = query.toString();
    return apiFetch(`/reels/usage/logs${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  getById: async (id) => {
    return apiFetch(`/reels/${id}`, {
      method: 'GET',
    });
  },

  getJourney: async (id, params = {}) => {
    const query = new URLSearchParams();
    if (typeof params === 'object') {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val);
        }
      });
    }
    const queryString = query.toString();
    return apiFetch(`/reels/${id}/journey${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  create: async (data) => {
    return apiFetch('/reels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  bulkCreate: async (data) => {
    return apiFetch('/reels/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  recordUsage: async (id, data) => {
    return apiFetch(`/reels/${id}/usage`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  masterCorrection: async (id, data) => {
    return apiFetch(`/reels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  voidReel: async (id, reason) => {
    return apiFetch(`/reels/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

export default reelApi;
