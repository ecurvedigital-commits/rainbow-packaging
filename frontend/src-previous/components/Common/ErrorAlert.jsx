import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const ErrorAlert = ({ message = 'An error occurred while loading data.', onRetry }) => (
  <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div className="flex items-center gap-3 text-rose-800 dark:text-rose-300 text-sm font-medium">
      <AlertTriangle size={20} className="shrink-0 text-rose-600 dark:text-rose-400" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
      >
        <RefreshCw size={14} /> Retry
      </button>
    )}
  </div>
);

export default ErrorAlert;
