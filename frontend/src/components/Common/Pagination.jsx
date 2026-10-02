import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({
  meta,
  page: propPage,
  limit: propLimit,
  total: propTotal,
  totalPages: propTotalPages,
  onPageChange,
  onLimitChange
}) => {
  const page = meta?.page ?? propPage ?? 1;
  const limit = meta?.limit ?? propLimit ?? 20;
  const total = meta?.total ?? propTotal ?? 0;
  const totalPages = meta?.totalPages ?? propTotalPages ?? (total > 0 ? Math.ceil(total / limit) : 1);

  const hasNextPage = meta?.hasNextPage ?? (page < totalPages);
  const hasPreviousPage = meta?.hasPreviousPage ?? (page > 1);

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  if (total === 0 && totalPages <= 1 && !meta) return null;

  return (
    <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <span>
          Showing <span className="font-bold text-slate-900 dark:text-white">{startRecord}–{endRecord}</span> of{' '}
          <span className="font-bold text-slate-900 dark:text-white">{total.toLocaleString()}</span> items
        </span>
        {onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange && onPageChange(page - 1)}
          disabled={!hasPreviousPage || page <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1 transition-colors"
        >
          <ChevronLeft size={14} /> Previous
        </button>

        <span className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 rounded-lg">
          Page {page} of {Math.max(totalPages, 1)}
        </span>

        <button
          onClick={() => onPageChange && onPageChange(page + 1)}
          disabled={!hasNextPage || page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1 transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
