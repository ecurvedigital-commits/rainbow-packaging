import React, { useState, useEffect } from 'react';
import { Bell, X, ChevronDown, Check, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getFcmToken } from '../../config/firebase';
import { notificationApi } from '../../api/notificationApi';

const STORAGE_KEY_NEVER = 'rp_notification_pref_never';
const STORAGE_KEY_SESSION_DISMISSED = 'rp_notification_session_dismissed';

export default function NotificationPermissionModal() {
  const { isAuthenticated, user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showNeverDropdown, setShowNeverDropdown] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Only evaluate for authenticated users
    if (!isAuthenticated || !user) {
      setShowPrompt(false);
      return;
    }

    // Check if browser supports notifications
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // If permission has already been granted or explicitly denied by browser, don't show prompt
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return;
    }

    // If user previously chose "Never allow", don't show
    if (localStorage.getItem(STORAGE_KEY_NEVER) === 'true') {
      return;
    }

    // If user dismissed it for the current session, don't show
    if (sessionStorage.getItem(STORAGE_KEY_SESSION_DISMISSED) === 'true') {
      return;
    }

    // 1. Listen for browser native permission state changes
    // (triggers immediately when user clicks Chrome/Edge's native prompt buttons)
    let permissionStatusObj = null;
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'notifications' })
        .then((status) => {
          permissionStatusObj = status;
          status.onchange = () => {
            if (status.state === 'granted') {
              setShowPrompt(false);
              getFcmToken().then((token) => {
                if (token) {
                  notificationApi.registerDeviceToken(token, navigator.userAgent).catch(() => {});
                }
              });
            } else if (status.state === 'denied') {
              localStorage.setItem(STORAGE_KEY_NEVER, 'true');
              setShowPrompt(false);
            }
          };
        })
        .catch(() => {});
    }

    // 2. Also check on window focus (handles the moment the native dialog closes and focus returns to page)
    const handleFocus = () => {
      if (Notification.permission === 'granted') {
        setShowPrompt(false);
        getFcmToken().then((token) => {
          if (token) {
            notificationApi.registerDeviceToken(token, navigator.userAgent).catch(() => {});
          }
        });
      } else if (Notification.permission === 'denied') {
        setShowPrompt(false);
      }
    };
    window.addEventListener('focus', handleFocus);

    // Slight delay so the page loads cleanly first
    const timer = setTimeout(() => {
      // Re-verify permission before showing
      if (Notification.permission === 'default') {
        setShowPrompt(true);
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
      if (permissionStatusObj) {
        permissionStatusObj.onchange = null;
      }
    };
  }, [isAuthenticated, user]);

  if (!showPrompt) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'Rainbow Packaging';

  const handleAllow = async () => {
    setIsRequesting(true);
    setStatusMessage('');

    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setShowPrompt(false);
        return;
      }

      // 1. Immediately request browser permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        setStatusMessage('Notifications enabled!');

        // Close prompt quickly so the UI is never stuck
        setTimeout(() => {
          setShowPrompt(false);
        }, 400);

        // 2. Retrieve FCM token and register with backend in background
        getFcmToken()
          .then((token) => {
            if (token) {
              notificationApi.registerDeviceToken(token, navigator.userAgent).catch((e) => {
                console.warn('Failed to register token with backend:', e);
              });
            }
          })
          .catch((err) => {
            console.warn('Background FCM registration notice:', err);
          });
      } else if (permission === 'denied') {
        localStorage.setItem(STORAGE_KEY_NEVER, 'true');
        setShowPrompt(false);
      } else {
        sessionStorage.setItem(STORAGE_KEY_SESSION_DISMISSED, 'true');
        setShowPrompt(false);
      }
    } catch (err) {
      console.warn('Error in notification permission prompt:', err);
      setShowPrompt(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleNeverAllow = () => {
    localStorage.setItem(STORAGE_KEY_NEVER, 'true');
    setShowPrompt(false);
  };

  const handleAskLater = () => {
    sessionStorage.setItem(STORAGE_KEY_SESSION_DISMISSED, 'true');
    setShowPrompt(false);
  };

  return (
    <div className="fixed top-3 left-4 sm:left-6 z-[9999] max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-4.5 overflow-hidden backdrop-blur-md">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-slate-300 truncate" title={currentOrigin}>
              {currentOrigin} wants to
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Show notifications
              </h3>
            </div>
          </div>
          <button
            onClick={handleAskLater}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
            title="Close for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Subtitle */}
        <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
          Receive real-time alerts for pending stock approvals, reel usage logs, and urgent notifications.
        </p>

        {statusMessage && (
          <div className="mt-3 py-1.5 px-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg flex items-center gap-1.5 font-medium">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          {/* Never Allow with Dropdown */}
          <div className="relative">
            <div className="inline-flex rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 transition overflow-hidden">
              <button
                onClick={handleNeverAllow}
                type="button"
                className="px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white transition"
              >
                Never allow
              </button>
              <button
                onClick={() => setShowNeverDropdown((prev) => !prev)}
                type="button"
                className="px-2 py-2 border-l border-slate-700 text-slate-300 hover:text-white transition"
                title="More options"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Options */}
            {showNeverDropdown && (
              <div className="absolute left-0 bottom-full mb-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={handleNeverAllow}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  Never allow on this site
                </button>
                <button
                  onClick={handleAskLater}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  Ask again next time
                </button>
              </div>
            )}
          </div>

          {/* Allow Button */}
          <button
            onClick={handleAllow}
            disabled={isRequesting}
            type="button"
            className="flex-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isRequesting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Prompting...
              </span>
            ) : (
              'Allow while visiting the site'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

