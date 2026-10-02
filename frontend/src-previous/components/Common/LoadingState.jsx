import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading data…', className = '' }) => (
  <div className={`p-12 flex flex-col items-center justify-center gap-3 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{message}</p>
  </div>
);

export default LoadingState;
