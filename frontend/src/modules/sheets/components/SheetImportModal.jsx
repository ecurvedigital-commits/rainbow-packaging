import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import { calculateTotalWeight, roundTwoDecimals } from '../utils/sheetCalculations';

export default function SheetImportModal({ isOpen, onClose, onImportComplete }) {
  if (!isOpen) return null;

  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [force, setForce] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    parseExcel(selectedFile);
  };

  const parseExcel = async (fileObj) => {
    setParsing(true);
    setError(null);
    setResult(null);

    try {
      const buffer = await fileObj.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];

      // Extract date from cell A1
      let effectiveDate = '2026-10-01';
      const titleCell = sheet['A1'] ? String(sheet['A1'].v || '').trim() : '';
      const dateMatch = titleCell.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
      if (dateMatch) {
        effectiveDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }

      // Parse table starting from row 2 (index 1)
      const rawRows = XLSX.utils.sheet_to_json(sheet, { range: 1, raw: true });

      const records = [];
      let totalQty = 0;
      let totalExcelWt = 0;
      let totalCalcWt = 0;

      for (const r of rawRows) {
        const sNo = r['S.No'];
        if (!sNo || typeof sNo !== 'number') continue; // Skip header / empty / total row

        const party = String(r['PARTY NAMRE'] || '').trim();
        const job = String(r['Job Name'] || '').trim();
        const quality = String(r['Quality'] || '').trim().toUpperCase();
        const deckle = roundTwoDecimals(Number(r['Dackle(cm)']));
        const cutting = roundTwoDecimals(Number(r['Cutting(cm)']));
        const gsm = Number(r['GSM']);
        const quantity = Math.floor(Number(r['Qty']));
        const excelWt = roundTwoDecimals(Number(r['Total wt (kg)']));

        const calcWt = calculateTotalWeight(deckle, cutting, gsm, quantity);

        totalQty += quantity;
        totalExcelWt += excelWt;
        totalCalcWt += calcWt;

        records.push({
          source_sno: sNo,
          party_name: party,
          job_name: job,
          quality,
          deckle,
          cutting,
          gsm,
          quantity,
          excel_weight: excelWt,
          calculated_weight: calcWt,
        });
      }

      setParsedData({
        fileName: fileObj.name,
        effectiveDate,
        records,
        totalQty,
        totalExcelWt: roundTwoDecimals(totalExcelWt),
        totalCalcWt: roundTwoDecimals(totalCalcWt),
      });
    } catch (err) {
      setError(`Failed to read Excel workbook: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedData || parsedData.records.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const res = await sheetApi.importExcel({
        records: parsedData.records,
        effectiveDate: parsedData.effectiveDate,
        importSource: parsedData.fileName,
        force,
      });

      if (res.success) {
        setResult(res);
        if (onImportComplete) onImportComplete(res);
      } else if (res.already_imported) {
        setError(res.message);
      } else {
        setError(res.message || 'Import failed.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to execute import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Excel Opening Stock Importer</h3>
              <p className="text-xs text-gray-500">
                Import and reconcile company board stock register (`board-stock-sheet.xlsx`)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <span>{error}</span>
                {error.includes('already been imported') && (
                  <p className="mt-1 text-[11px] text-rose-600 font-semibold">
                    Tip: Enable the "Overwrite existing opening stock" checkbox below to force re-import.
                  </p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Successfully Imported {result.total_records} Stock Lots!
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-emerald-700">
                <div>Total Sheets: <strong>{result.total_quantity?.toLocaleString()} pcs</strong></div>
                <div>Calculated Weight: <strong>{result.total_calculated_weight?.toLocaleString()} kg</strong></div>
                <div>Effective Date: <strong>{result.effective_date}</strong></div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {!result && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50/50 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-colors"
              >
                <UploadCloud size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs font-bold text-gray-700">
                  {file ? file.name : 'Click to select or drop board-stock-sheet.xlsx'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">Accepts Microsoft Excel (.xlsx, .xls) files</p>
              </div>
            </div>
          )}

          {/* Parsed Preview Card */}
          {parsedData && !result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-gray-400 font-medium">Register Lots</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{parsedData.records.length} records</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Total Quantity</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{parsedData.totalQty.toLocaleString()} pcs</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Calculated Weight</span>
                  <p className="text-sm font-bold text-emerald-800 mt-0.5">{parsedData.totalCalcWt.toLocaleString()} kg</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Effective Date</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{parsedData.effectiveDate}</p>
                </div>
              </div>

              {/* Table Preview */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Parsed Lots Preview (First 5 of {parsedData.records.length})
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2">S.No</th>
                        <th className="px-3 py-2">Party</th>
                        <th className="px-3 py-2">Job</th>
                        <th className="px-3 py-2">Quality</th>
                        <th className="px-3 py-2">Dimensions</th>
                        <th className="px-3 py-2">GSM</th>
                        <th className="px-3 py-2">Quantity</th>
                        <th className="px-3 py-2">Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                      {parsedData.records.slice(0, 5).map((r) => (
                        <tr key={r.source_sno}>
                          <td className="px-3 py-1.5">{r.source_sno}</td>
                          <td className="px-3 py-1.5 font-bold">{r.party_name}</td>
                          <td className="px-3 py-1.5 text-gray-500">{r.job_name || '-'}</td>
                          <td className="px-3 py-1.5">{r.quality}</td>
                          <td className="px-3 py-1.5">{r.deckle} × {r.cutting} cm</td>
                          <td className="px-3 py-1.5">{r.gsm}</td>
                          <td className="px-3 py-1.5 font-bold">{r.quantity.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-emerald-700">{r.calculated_weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Force overwrite option */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Overwrite previously imported opening stock if already present</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {result ? 'Done' : 'Cancel'}
          </button>

          {!result && parsedData && (
            <button
              onClick={handleExecuteImport}
              disabled={importing || parsing}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {importing && <RefreshCw size={14} className="animate-spin" />}
              <span>{importing ? 'Importing 40 Lots...' : `Import ${parsedData.records.length} Lots to MongoDB`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

