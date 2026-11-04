import { apiFetch } from '../../../api/client';

/**
 * Purchase Orders Domain API Client
 */
export const purchaseOrderApi = {
  list: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const q = new URLSearchParams(cleanParams).toString();
    return apiFetch(`/purchase-orders${q ? `?${q}` : ''}`);
  },

  getById: (id) => apiFetch(`/purchase-orders/${id}`),

  create: (data) =>
    apiFetch('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiFetch(`/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  submitForApproval: (id) =>
    apiFetch(`/purchase-orders/${id}/submit`, {
      method: 'POST',
    }),

  approve: (id) =>
    apiFetch(`/purchase-orders/${id}/approve`, {
      method: 'POST',
    }),

  reject: (id, data) =>
    apiFetch(`/purchase-orders/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancel: (id, data = {}) =>
    apiFetch(`/purchase-orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getFilterOptions: () => apiFetch('/purchase-orders/filters/options'),
};

export default purchaseOrderApi;

