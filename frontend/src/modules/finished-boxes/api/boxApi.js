import { apiFetch } from '../../../api/client';

/**
 * Finished Boxes Domain API Client
 * Modular placeholder for future Finished Goods inventory workflows
 */
export const boxApi = {
  getSummary: () => apiFetch('/finished-boxes/summary'),
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/finished-boxes${q ? `?${q}` : ''}`);
  },
};

export default boxApi;

