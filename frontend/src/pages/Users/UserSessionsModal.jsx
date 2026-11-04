import React, { useState, useEffect, useCallback } from 'react';
import { 
  Laptop, Smartphone, Tablet, Globe, Shield, AlertTriangle, 
  X, RefreshCw, Power, CheckCircle, Clock, MapPin, User as UserIcon
} from 'lucide-react';
import { userApi } from '../../api/userApi';
import { formatDate } from '../../utils/formatters';

export default function UserSessionsModal({ 
  isOpen, 
  onClose, 
  targetUser = null, // if null, shows all active sessions system-wide
  onSessionRevoked
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const targetUserId = targetUser?.id || targetUser?._id;
      if (targetUser && targetUserId) {
        const res = await userApi.getUserSessions(targetUserId);
        setSessions(res.data || []);
      } else {
        const res = await userApi.getActiveSessions({ limit: 50 });
        setSessions(res.data?.items || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load device sessions');
    } finally {
      setLoading(false);
    }
  }, [targetUser]);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
      setSuccessMessage('');
    }
  }, [isOpen, fetchSessions]);

  const handleRevoke = async (session) => {
    const confirmMsg = `Are you sure you want to revoke the session on "${session.device_name}"? The user will be logged out immediately.`;
    if (!window.confirm(confirmMsg)) return;

    setRevokingId(session.id);
    try {
      const uId = session.user?.id || session.user?._id || targetUser?.id || targetUser?._id;
      if (!uId) throw new Error('User ID missing');
      
      await userApi.revokeUserSession(uId, session.id);
      setSuccessMessage(`Session on ${session.device_name} has been revoked.`);
      if (onSessionRevoked) onSessionRevoked();
      await fetchSessions();
    } catch (err) {
      alert(`Error revoking session: ${err.message}`);
    } finally {
      setRevokingId(null);
    }
  };

  if (!isOpen) return null;

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-indigo-600" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-purple-600" />;
      default:
        return <Laptop className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {targetUser ? `Logged-in Devices: ${targetUser.name || targetUser.username}` : 'All System-Wide Active Logins'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {targetUser 
                  ? `Active and recent devices used by ${targetUser.username} (${targetUser.role})` 
                  : 'Live active sessions across all operators and administrators'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
              title="Refresh Devices"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading && sessions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm font-medium">Inspecting active device sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Globe className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No active device sessions found</p>
              <p className="text-xs text-slate-400 mt-1">Users will appear here once they log into the system.</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.is_current;
              const isActive = session.is_active;
              const sId = session.id || session._id;

              return (
                <div
                  key={sId}
                  className={`p-4 rounded-xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isActive ? 'bg-white border-slate-200 hover:border-blue-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getDeviceIcon(session.device_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {session.device_name}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-md font-bold">
                            Current Device
                          </span>
                        )}
                        {isActive ? (
                          <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded-md font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-600 rounded-md font-bold">
                            {session.revocation_reason || 'Revoked'}
                          </span>
                        )}
                      </div>

                      {/* User Info (when showing all active sessions) */}
                      {session.user && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mt-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{session.user.name} ({session.user.username})</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium">
                            {session.user.role}
                          </span>
                        </div>
                      )}

                      {/* Device metadata */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          IP: <strong className="text-slate-700">{session.ip || 'Unknown'}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Last Active: <span className="text-slate-600">{formatDate(session.last_active_at || session.login_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isActive && (
                    <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleRevoke(session)}
                        disabled={revokingId === sId}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                        title="Force logout on this device"
                      >
                        <Power className="w-3.5 h-3.5" />
                        {revokingId === sId ? 'Revoking...' : 'Logout Device'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Active sessions automatically expire after 7 days of inactivity.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

