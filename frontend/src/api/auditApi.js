import { apiFetch } from './client';

export const auditApi = {
  getEvents: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    return apiFetch(`/audit/events?${query.toString()}`, { method: 'GET' });
  },

  getAuditLogs: async (params = {}) => {
    return auditApi.getEvents(params);
  },

  getEventById: async (id) => {
    return apiFetch(`/audit/events/${id}`, { method: 'GET' });
  },
};
