import React, { useState } from 'react';
import { FileText, X, CheckSquare, Square, Printer, AlertCircle } from 'lucide-react';

export const AVAILABLE_SHEET_REPORT_FIELDS = [
  { id: 'sr_no', label: 'Sr. No.', defaultSelected: true, defaultWidth: '5%' },
  { id: 'lot_no', label: 'Lot # / Tag', defaultSelected: true, defaultWidth: '9%' },
  { id: 'party_name', label: 'Party Name', defaultSelected: true, defaultWidth: '18%' },
  { id: 'job_name', label: 'Job Name', defaultSelected: true, defaultWidth: '16%' },
  { id: 'quality', label: 'Board Quality', defaultSelected: true, defaultWidth: '9%' },
  { id: 'dimensions', label: 'Dimensions (Deckle × Cutting cm)', defaultSelected: true, defaultWidth: '13%' },
  { id: 'gsm', label: 'GSM (g/m²)', defaultSelected: true, defaultWidth: '7%' },
  { id: 'current_quantity', label: 'Balance Quantity (Sheets)', defaultSelected: true, defaultWidth: '11%' },
  { id: 'current_weight', label: 'Balance Weight (kg)', defaultSelected: true, defaultWidth: '12%' },
  { id: 'initial_quantity', label: 'Initial Inward Quantity', defaultSelected: false, defaultWidth: '11%' },
  { id: 'initial_weight', label: 'Initial Inward Weight (kg)', defaultSelected: false, defaultWidth: '11%' },
  { id: 'consumed_quantity', label: 'Consumed Quantity (Sheets)', defaultSelected: false, defaultWidth: '11%' },
  { id: 'consumed_weight', label: 'Consumed Weight (kg)', defaultSelected: false, defaultWidth: '11%' },
  { id: 'status', label: 'Stock Status', defaultSelected: false, defaultWidth: '9%' },
  { id: 'supplier_name', label: 'Supplier / Mill', defaultSelected: false, defaultWidth: '12%' },
  { id: 'received_date', label: 'Inward / Received Date', defaultSelected: true, defaultWidth: '10%' },
];

export default function SheetPrintReportFieldModal({ isOpen, onClose, onConfirm, loading = false }) {
  const [selectedFields, setSelectedFields] = useState(() =>
    AVAILABLE_SHEET_REPORT_FIELDS.reduce((acc, field) => {
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
    AVAILABLE_SHEET_REPORT_FIELDS.forEach((f) => {
      all[f.id] = true;
    });
    setSelectedFields(all);
    setValidationError('');
  };

  const deselectAll = () => {
    const none = {};
    AVAILABLE_SHEET_REPORT_FIELDS.forEach((f) => {
      none[f.id] = false;
    });
    setSelectedFields(none);
  };

  const resetToDefault = () => {
    const def = {};
    AVAILABLE_SHEET_REPORT_FIELDS.forEach((f) => {
      def[f.id] = f.defaultSelected;
    });
    setSelectedFields(def);
    setValidationError('');
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    const activeFieldIds = AVAILABLE_SHEET_REPORT_FIELDS
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50/40 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Customize Sheet Print / PDF Report
              </h2>
              <p className="text-xs text-gray-500">
                Choose the columns to include in your printed board stock report
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Quick Selection Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-xs">
            <span className="font-semibold text-gray-600">
              Selected Columns: <strong className="text-emerald-700">{selectedCount}</strong> of {AVAILABLE_SHEET_REPORT_FIELDS.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 text-gray-700 hover:bg-gray-100 rounded-md font-semibold transition cursor-pointer"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2.5 py-1 text-gray-700 hover:bg-gray-100 rounded-md font-semibold transition cursor-pointer"
              >
                Clear
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={resetToDefault}
                className="px-2.5 py-1 text-emerald-700 hover:bg-emerald-50 rounded-md font-semibold transition cursor-pointer"
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
            {AVAILABLE_SHEET_REPORT_FIELDS.map((field) => {
              const isChecked = Boolean(selectedFields[field.id]);
              return (
                <label
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-emerald-50/60 border-emerald-200 text-gray-900 font-semibold shadow-xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className={`shrink-0 ${isChecked ? 'text-emerald-600' : 'text-gray-300'}`}>
                    {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <span className="flex-1 leading-snug">{field.label}</span>
                </label>
              );
            })}
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 leading-relaxed">
            💡 <strong>Tip:</strong> Selected columns will dynamically scale to fill the A4 landscape report page. Only the columns you select above will appear in the printed table.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || selectedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer size={15} />
            <span>{loading ? 'Preparing Document...' : 'Print / Download PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

