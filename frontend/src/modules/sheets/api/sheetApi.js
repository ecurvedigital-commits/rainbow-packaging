import { apiFetch } from '../../../api/client';

/**
 * Sheets Domain API Client
 */
export const sheetApi = {
  getSummary: () => apiFetch('/sheets/summary'),

  getFilterOptions: () => apiFetch('/sheets/filters/options'),

  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/sheets${q ? `?${q}` : ''}`);
  },

  getHistory: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const q = new URLSearchParams(cleanParams).toString();
    return apiFetch(`/sheets/history${q ? `?${q}` : ''}`);
  },

  getById: (id) => apiFetch(`/sheets/${id}`),

  getJourney: (id, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/sheets/${id}/journey${q ? `?${q}` : ''}`);
  },

  create: (data) =>
    apiFetch('/sheets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiFetch(`/sheets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  recordUsage: (id, data) =>
    apiFetch(`/sheets/${id}/usage`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adjustStock: (id, data) =>
    apiFetch(`/sheets/${id}/adjustment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  returnStock: (id, data) =>
    apiFetch(`/sheets/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  voidSheet: (id, data = {}) =>
    apiFetch(`/sheets/${id}/void`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  importExcel: (data) =>
    apiFetch('/sheets/import-excel', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listPendingApprovals: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/sheets/approvals/pending${q ? `?${q}` : ''}`);
  },

  confirmApproval: (id) =>
    apiFetch(`/sheets/approvals/${id}/confirm`, {
      method: 'POST',
    }),

  declineApproval: (id, data = {}) =>
    apiFetch(`/sheets/approvals/${id}/decline`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export default sheetApi;
