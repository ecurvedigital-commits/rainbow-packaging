import React from 'react';
import { PackageOpen } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'There are no items matching your criteria.',
  message,
  actionLabel,
  actionText,
  onAction,
}) => {
  const displayDesc = description || message || 'There are no items matching your criteria.';
  const displayAction = actionLabel || actionText;

  return (
    <div className="p-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="p-4 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full mb-3">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">{displayDesc}</p>
      {displayAction && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {displayAction}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
