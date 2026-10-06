import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  RefreshCw,
  Mail,
  MailOpen,
  AlertTriangle,
  ShieldAlert,
  Info,
  Send,
  Wrench,
  ChevronRight,
  Boxes,
  User,
} from 'lucide-react';
import { notificationApi } from '../../api/notificationApi';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import Toast from '../../components/Common/Toast';
import { formatDate, formatDateTime } from '../../utils/formatters';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (unreadOnly) params.unread = true;

      const response = await notificationApi.getNotifications(params);
      setNotifications(response.data || response.items || []);
      const meta = response.meta?.pagination || response.meta;
      if (meta) {
        setPagination((prev) => ({
          ...prev,
          page: meta.page || 1,
          limit: meta.limit || 15,
          total: meta.total || 0,
          totalPages: meta.totalPages || meta.total_pages || 1,
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

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          (n.id === id || n._id === id)
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
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

  const getIconForType = (type) => {
    switch (type) {
      case 'CORRECTION_REQUESTED':
        return <Wrench className="w-5 h-5 text-amber-500" />;
      case 'CORRECTION_RESOLVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'CORRECTION_REJECTED':
      case 'ENTRY_DECLINED':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'MESSAGE':
        return <Send className="w-5 h-5 text-indigo-500" />;
      case 'APPROVAL':
        return <ShieldAlert className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'CORRECTION_REQUESTED':
        return { label: 'Correction Request', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
      case 'CORRECTION_RESOLVED':
        return { label: 'Correction Applied', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
      case 'CORRECTION_REJECTED':
        return { label: 'Correction Declined', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' };
      case 'ENTRY_DECLINED':
        return { label: 'Entry Declined', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' };
      case 'MESSAGE':
        return { label: 'Direct Message', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' };
      default:
        return { label: 'Notification', color: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300' };
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Notifications & Messages
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            View operator correction messages, direct team messages, and inventory alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/messages/compose')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Compose Message</span>
          </button>
          <button
            onClick={fetchNotifications}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-semibold rounded-xl transition"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setUnreadOnly(false);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              !unreadOnly
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All ({pagination.total || notifications.length})
          </button>
          <button
            onClick={() => {
              setUnreadOnly(true);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              unreadOnly
                ? 'bg-indigo-600 text-white shadow-xs'
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
          message={
            unreadOnly
              ? 'You have no unread notifications.'
              : 'Your notification box is completely empty.'
          }
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {notifications.map((item) => {
              const notifId = item.id || item._id;
              const isUnread = !item.is_read;
              const typeInfo = getTypeLabel(item.type);
              const reelNo = item.reel_no || item.data?.reel_no;
              const sender = item.sender_name || item.data?.sender_name;

              return (
                <div
                  key={notifId}
                  onClick={() => navigate(`/notifications/${notifId}`)}
                  className={`p-4 sm:p-5 transition flex items-start gap-4 cursor-pointer group ${
                    isUnread
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/25 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-750/50'
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    {getIconForType(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {item.title || 'Notification'}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-brand-blue ring-4 ring-blue-100 dark:ring-blue-950 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDateTime(item.created_at || item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {item.message || item.body}
                    </p>

                    <div className="flex items-center gap-3 pt-1 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                      {sender && (
                        <span className="flex items-center gap-1 font-medium">
                          <User size={12} className="text-slate-400" />
                          From: <strong className="text-slate-700 dark:text-slate-200">{sender}</strong>
                        </span>
                      )}

                      {reelNo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded font-mono font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                          <Boxes size={12} />
                          Reel #{reelNo}
                        </span>
                      )}

                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline flex items-center gap-0.5 ml-auto text-xs">
                        <span>View Details</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, notifId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-900/90 rounded-xl transition shrink-0 shadow-xs"
                      title="Mark as Read"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Mark Read</span>
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
            onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
          />
        </div>
      )}
    </div>
  );
}
