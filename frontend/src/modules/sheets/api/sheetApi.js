import { apiFetch } from '../../../api/client';

/**
 * Sheets Domain API Client
 * Modular placeholder for future Sheets inventory workflows
 */
export const sheetApi = {
  getSummary: () => apiFetch('/sheets/summary'),
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/sheets${q ? `?${q}` : ''}`);
  },
};

export default sheetApi;

