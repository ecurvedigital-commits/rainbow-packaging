import { apiFetch } from './client';

export const notificationApi = {
  getUnreadCount: async () => {
    return apiFetch('/notifications/unread-count', { method: 'GET' });
  },

  list: async (page = 1, limit = 20) => {
    return apiFetch(`/notifications?page=${page}&limit=${limit}`, { method: 'GET' });
  },

  getNotifications: async (params = {}) => {
    const page = params.page || 1;
    const limit = params.limit || 20;
    return notificationApi.list(page, limit);
  },

  getById: async (id) => {
    return apiFetch(`/notifications/${id}`, { method: 'GET' });
  },

  markRead: async (id) => {
    return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  markAsRead: async (id) => {
    return notificationApi.markRead(id);
  },

  markAllRead: async () => {
    return apiFetch('/notifications/read-all', { method: 'PATCH' });
  },

  markAllAsRead: async () => {
    return notificationApi.markAllRead();
  },
};
