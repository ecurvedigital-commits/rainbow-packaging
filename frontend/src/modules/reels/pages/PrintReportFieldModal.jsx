import React, { useState } from 'react';
import { FileText, X, CheckSquare, Square, Printer, AlertCircle } from 'lucide-react';

export const AVAILABLE_REPORT_FIELDS = [
  { id: 'sr_no', label: 'Sr. No.', defaultSelected: true, defaultWidth: '5%' },
  { id: 'reel_no', label: 'Reel No.', defaultSelected: true, defaultWidth: '11%' },
  { id: 'specifications', label: 'Specifications (Quality, GSM, BF, Size)', defaultSelected: true, defaultWidth: '20%' },
  { id: 'master_code', label: 'Master Code', defaultSelected: false, defaultWidth: '11%' },
  { id: 'supplier', label: 'Supplier Name', defaultSelected: true, defaultWidth: '14%' },
  { id: 'mill', label: 'Mill Name', defaultSelected: true, defaultWidth: '11%' },
  { id: 'stock_weight', label: 'Current Stock Weight', defaultSelected: true, defaultWidth: '10%' },
  { id: 'initial_weight', label: 'Initial Received Weight', defaultSelected: false, defaultWidth: '10%' },
  { id: 'consumed_weight', label: 'Consumed Weight', defaultSelected: true, defaultWidth: '10%' },
  { id: 'price_per_kg', label: 'Price / KG', defaultSelected: true, defaultWidth: '8%' },
  { id: 'total_value', label: 'Total Stock Value (Rs)', defaultSelected: false, defaultWidth: '10%' },
  { id: 'created_date', label: 'Purchase / Created Date', defaultSelected: true, defaultWidth: '9%' },
  { id: 'status', label: 'Status (REEL / CUT / NILL)', defaultSelected: false, defaultWidth: '8%' },
  { id: 'station', label: 'Station Used', defaultSelected: false, defaultWidth: '9%' },
];

export default function PrintReportFieldModal({ isOpen, onClose, onConfirm, loading = false }) {
  const [selectedFields, setSelectedFields] = useState(() =>
    AVAILABLE_REPORT_FIELDS.reduce((acc, field) => {
      acc[field.id] = field.defaultSelected;
      return acc;
    }, {})
  );

  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const toggleField = (id) => {
    setSelectedFields((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      const hasAny = Object.values(updated).some(Boolean);
      if (hasAny) setValidationError('');
      return updated;
    });
  };

  const selectAll = () => {
    const all = {};
    AVAILABLE_REPORT_FIELDS.forEach((f) => {
      all[f.id] = true;
    });
    setSelectedFields(all);
    setValidationError('');
  };

  const deselectAll = () => {
    const none = {};
    AVAILABLE_REPORT_FIELDS.forEach((f) => {
      none[f.id] = false;
    });
    setSelectedFields(none);
  };

  const resetToDefault = () => {
    const def = {};
    AVAILABLE_REPORT_FIELDS.forEach((f) => {
      def[f.id] = f.defaultSelected;
    });
    setSelectedFields(def);
    setValidationError('');
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    const activeFieldIds = AVAILABLE_REPORT_FIELDS
      .filter((f) => selectedFields[f.id])
      .map((f) => f.id);

    if (activeFieldIds.length === 0) {
      setValidationError('Please select at least one column to print in the report.');
      return;
    }

    onConfirm(activeFieldIds);
  };

  const selectedCount = Object.values(selectedFields).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-50 via-slate-50 to-indigo-50/50 dark:from-slate-800 dark:to-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Customize Print / PDF Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose the columns to include in your printed report table
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Quick Selection Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Selected Columns: <strong className="text-indigo-600 dark:text-indigo-400">{selectedCount}</strong> of {AVAILABLE_REPORT_FIELDS.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md font-semibold transition"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md font-semibold transition"
              >
                Clear
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={resetToDefault}
                className="px-2.5 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-md font-semibold transition"
              >
                Default
              </button>
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold animate-shake">
              <AlertCircle size={15} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Column Checkboxes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {AVAILABLE_REPORT_FIELDS.map((field) => {
              const isChecked = Boolean(selectedFields[field.id]);
              return (
                <label
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-indigo-50/60 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`shrink-0 ${isChecked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>
                    {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <span className="flex-1 leading-snug">{field.label}</span>
                </label>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            💡 <strong>Tip:</strong> Selected columns will dynamically scale to fill the A4 landscape report page. Only the columns you select above will appear in the printed table.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || selectedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer size={15} />
            <span>{loading ? 'Preparing Document...' : 'Print / Download PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

