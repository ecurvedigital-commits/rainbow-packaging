import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, RefreshCw, Mail, MailOpen, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { notificationApi } from '../../api/notificationApi';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import Toast from '../../components/Common/Toast';
import { formatDate } from '../../utils/formatters';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (unreadOnly) params.unreadOnly = 'true';

      const response = await notificationApi.getNotifications(params);
      setNotifications(response.data || []);
      if (response.meta?.pagination) {
        setPagination(prev => ({
          ...prev,
          page: response.meta.pagination.page,
          limit: response.meta.pagination.limit,
          total: response.meta.pagination.total,
          totalPages: response.meta.pagination.totalPages
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to mark notification as read.' });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setToast({ type: 'success', message: 'All notifications marked as read!' });
      fetchNotifications();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to mark all as read.' });
    }
  };

  const getIconForCategory = (category) => {
    switch (category) {
      case 'ALERT':
      case 'LOW_STOCK':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'APPROVAL':
        return <ShieldAlert className="w-5 h-5 text-indigo-500" />;
      case 'SYSTEM':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Notifications
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Stay informed about inventory threshold alerts, approval requests, and system events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-sm font-medium rounded-lg transition"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setUnreadOnly(false); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              !unreadOnly 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => { setUnreadOnly(true); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              unreadOnly 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Unread Only
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={fetchNotifications} />}

      {/* List Content */}
      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          message={unreadOnly ? "You have no unread notifications." : "Your notification box is completely empty."}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {notifications.map((item) => {
              const isUnread = !item.is_read;
              return (
                <div
                  key={item._id}
                  className={`p-4 sm:p-5 transition flex items-start gap-4 ${
                    isUnread
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                    {getIconForCategory(item.category || item.type)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                        {item.title || item.subject || 'System Notification'}
                      </h4>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(item.created_at || item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      {item.message || item.body}
                    </p>

                    {item.metadata?.reel_number && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                        Reel Reference: #{item.metadata.reel_number}
                      </div>
                    )}
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => handleMarkAsRead(item._id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition shrink-0"
                      title="Mark as Read"
                    >
                      <MailOpen className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
            onLimitChange={(l) => setPagination(prev => ({ ...prev, limit: l, page: 1 }))}
          />
        </div>
      )}
    </div>
  );
}
