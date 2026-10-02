import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { settingsApi } from '../../api/settingsApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import Toast from '../../components/Common/Toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    low_stock_threshold_kg: 50,
    requires_approval_weight_change_kg: 100,
    enable_email_alerts: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await settingsApi.getSettings();
      if (response.data) {
        setSettings({
          low_stock_threshold_kg: response.data.low_stock_threshold_kg ?? 50,
          requires_approval_weight_change_kg: response.data.requires_approval_weight_change_kg ?? 100,
          enable_email_alerts: response.data.enable_email_alerts ?? true
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.updateSettings(settings);
      setToast({ type: 'success', message: 'System threshold settings updated successfully!' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            System Inventory Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Configure threshold triggers for low stock warnings and supervisor approval limits.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={fetchSettings} />}

      {loading ? (
        <LoadingState message="Loading system settings..." />
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          {/* Low Stock Warning */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              Low Stock Warning Threshold (kg)
            </label>
            <p className="text-xs text-slate-500">
              When a reel's remaining net weight falls below this value, an alert notification will be dispatched to supervisors.
            </p>
            <input
              type="number"
              name="low_stock_threshold_kg"
              value={settings.low_stock_threshold_kg}
              onChange={handleChange}
              min={0}
              step={1}
              className="w-full max-w-xs px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
              required
            />
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Master Correction Approval Threshold */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              Supervisor Approval Required For Weight Adjustments Exceeding (kg)
            </label>
            <p className="text-xs text-slate-500">
              Weight variance corrections exceeding this threshold will automatically lock into `CORRECTION_PENDING` status until approved by a Supervisor or Admin.
            </p>
            <input
              type="number"
              name="requires_approval_weight_change_kg"
              value={settings.requires_approval_weight_change_kg}
              onChange={handleChange}
              min={0}
              step={1}
              className="w-full max-w-xs px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
              required
            />
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Email notifications checkbox */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Enable Instant Email Alerts
              </span>
              <span className="text-xs text-slate-500">
                Send email notifications to supervisors for pending approval requests and stock alerts.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="enable_email_alerts"
                checked={settings.enable_email_alerts}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : 'Save System Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
