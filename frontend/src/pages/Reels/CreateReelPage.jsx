import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { reelApi } from '../../api/reelApi';
import { masterCodeApi } from '../../api/masterCodeApi';
import { fieldDefinitionApi } from '../../api/fieldDefinitionApi';
import { extractMasterCodeSpecs } from '../../utils/formatters';

const inputClass =
  'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-shadow';
const compactInputClass =
  'w-full min-w-[120px] border border-gray-300 rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent';
const labelClass = 'block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5';

const BASE_FIELDS = [
  { key: 'reel_no', label: 'Reel Number', type: 'text', required: true },
  { key: 'quality', label: 'Quality', type: 'text', required: true },
  { key: 'supplier_name', label: 'Supplier Name', type: 'text', required: true },
  { key: 'max_weight', label: 'Reel Weight (kg)', type: 'number', required: true },
  { key: 'rate_per_kg', label: 'Rate / KG (₹)', type: 'number', required: false },
  { key: 'gsm', label: 'GSM', type: 'number', required: true },
  { key: 'size', label: 'Size / Width (cm)', type: 'number', required: true },
  { key: 'bf', label: 'Bursting Factor (BF)', type: 'number', required: true },
  { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
];

const DEFAULT_ROW = {
  reel_no: '',
  quality: 'VK',
  supplier_name: '',
  max_weight: 1000,
  rate_per_kg: '',
  gsm: 150,
  size: 100,
  bf: 18,
  purchase_date: new Date().toISOString().split('T')[0],
  custom_fields: {},
};

const normalizeHeader = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getCell = (row, aliases) => {
  const entries = Object.entries(row);
  const wanted = aliases.map(normalizeHeader);
  const found = entries.find(([key]) => wanted.includes(normalizeHeader(key)));
  return found ? found[1] : '';
};

const excelDateToInput = (value) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && XLSX.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const raw = String(value).trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
};

const toNumberOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
};

const incrementReelNumber = (value, offset) => {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(.*?)(\d+)([^\d]*)$/);
  if (!match) return offset === 0 ? raw : `${raw}-${offset + 1}`;
  const [, prefix, digits, suffix] = match;
  const next = Number(digits) + offset;
  return `${prefix}${String(next).padStart(digits.length, '0')}${suffix}`;
};

const cloneRow = (row) => ({
  ...DEFAULT_ROW,
  ...row,
  custom_fields: { ...(row.custom_fields || {}) },
});

const buildRowFromExcel = (raw, fieldDefs, fallback) => {
  const row = cloneRow(fallback);
  row.reel_no = String(getCell(raw, ['reel_no', 'reelno', 'reelnumber', 'reel']) || '').trim();
  row.quality = String(getCell(raw, ['quality']) || row.quality).trim();
  row.supplier_name = String(getCell(raw, ['supplier_name', 'supplier', 'suppliername']) || '').trim();
  row.max_weight = toNumberOrBlank(getCell(raw, ['max_weight', 'weight', 'reelweight', 'reelweightkg']));
  row.rate_per_kg = toNumberOrBlank(getCell(raw, ['rate_per_kg', 'rate', 'ratekg', 'rateperkg']));
  row.gsm = toNumberOrBlank(getCell(raw, ['gsm']));
  row.size = toNumberOrBlank(getCell(raw, ['size', 'width', 'sizecm', 'widthcm', 'sizewidth', 'sizewidthcm']));
  row.bf = toNumberOrBlank(getCell(raw, ['bf', 'burstingfactor', 'burstingfactorbf']));
  row.purchase_date = excelDateToInput(getCell(raw, ['purchase_date', 'purchasedate', 'date']));

  fieldDefs.forEach((def) => {
    const value = getCell(raw, [def.key, def.label]);
    if (value !== '' && value !== null && value !== undefined) {
      row.custom_fields[def.key] = def.type === 'number' ? toNumberOrBlank(value) : String(value);
    }
  });

  return row;
};

const Field = ({ definition, value, onChange }) => {
  const inputType = definition.type === 'number' ? 'number' : definition.type === 'date' ? 'date' : 'text';
  return (
    <div className="pb-5 mb-5 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
      <label className={labelClass}>
        {definition.label} {definition.required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={inputType}
        required={definition.required}
        value={value ?? ''}
        onChange={(e) => onChange(definition.key, e.target.value)}
        className={inputClass}
        placeholder={`Enter ${definition.label.toLowerCase()}`}
      />
    </div>
  );
};

const MemoizedBulkRow = React.memo(({ row, rowIndex, allBulkColumns, updateBulkCustom, updateBulkCell, deleteBulkRow }) => {
  return (
    <tr className="odd:bg-white even:bg-gray-50/60 hover:bg-blue-50/40">
      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-b border-gray-100 font-bold text-gray-400">{rowIndex + 1}</td>
      {allBulkColumns.map((column) => {
        const value = column.bulkCustom
          ? row.custom_fields?.[column.key] ?? ''
          : row[column.key] ?? '';
        return (
          <td key={column.key} className="px-2 py-2 border-b border-gray-100 align-top">
            <input
              type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
              required={column.required}
              value={value}
              onChange={(e) => {
                if (column.bulkCustom) updateBulkCustom(rowIndex, column.key, e.target.value);
                else updateBulkCell(rowIndex, column.key, e.target.value);
              }}
              className={compactInputClass}
              aria-label={`${column.label} row ${rowIndex + 1}`}
            />
          </td>
        );
      })}
      <td className="sticky right-0 z-10 bg-inherit px-3 py-2 border-b border-gray-100">
        <button
          type="button"
          onClick={() => deleteBulkRow(rowIndex)}
          className="p-2 rounded-lg text-red-500 hover:bg-red-50"
          title="Remove row"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
});

export default function CreateReelPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('single');
  const [fieldDefs, setFieldDefs] = useState([]);
  const [masterCodes, setMasterCodes] = useState([]);
  const [selectedMasterCodeId, setSelectedMasterCodeId] = useState('');
  const [nextReelNo, setNextReelNo] = useState('');
  const [loadingNextNo, setLoadingNextNo] = useState(false);
  const [singleForm, setSingleForm] = useState(cloneRow(DEFAULT_ROW));
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkRows, setBulkRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bulkResult, setBulkResult] = useState(null);

  const selectedMasterCode = useMemo(
    () => masterCodes.find((mc) => (mc.master_code_id || mc.id) === selectedMasterCodeId),
    [masterCodes, selectedMasterCodeId]
  );

  const allBulkColumns = useMemo(
    () => [...BASE_FIELDS, ...fieldDefs.map((def) => ({ ...def, bulkCustom: true }))],
    [fieldDefs]
  );

  const fetchNextReelNumber = async () => {
    setLoadingNextNo(true);
    try {
      const res = await reelApi.getNextReelNumber();
      if (res.success && res.data?.next_reel_no) {
        setNextReelNo(String(res.data.next_reel_no));
        return String(res.data.next_reel_no);
      }
    } catch (err) {
      setError(err.message || 'Unable to load the next reel number.');
    } finally {
      setLoadingNextNo(false);
    }
    return '';
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [fieldRes, codeRes] = await Promise.all([
          fieldDefinitionApi.list(),
          masterCodeApi.list({ status: 'ACTIVE' }),
        ]);

        if (fieldRes.success && Array.isArray(fieldRes.data)) {
          setFieldDefs(fieldRes.data.filter((f) => f.is_active !== false));
        }

        if (codeRes.success && Array.isArray(codeRes.data)) {
          const codes = codeRes.data;
          setMasterCodes(codes);
          if (codes.length) {
            const first = codes[0];
            setSelectedMasterCodeId(first.master_code_id || first.id);
            const specs = extractMasterCodeSpecs(first);
            setSingleForm((prev) => ({
              ...prev,
              quality: specs.quality !== undefined ? specs.quality : prev.quality,
              gsm: specs.gsm !== undefined ? specs.gsm : prev.gsm,
              bf: specs.bf !== undefined ? specs.bf : prev.bf,
              size: specs.size !== undefined ? specs.size : prev.size,
            }));
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load reel creation data.');
      }

      await fetchNextReelNumber();
    };

    load();
  }, []);

  useEffect(() => {
    if (!nextReelNo) return;
    setSingleForm((prev) => ({ ...prev, reel_no: prev.reel_no || nextReelNo }));
  }, [nextReelNo]);

  useEffect(() => {
    if (mode !== 'bulk' || !bulkRows.length) return;
    const specs = extractMasterCodeSpecs(selectedMasterCode);
    const next = bulkRows.map((row) => ({
      ...row,
      quality: specs.quality !== undefined ? specs.quality : (row.quality || DEFAULT_ROW.quality),
      gsm: specs.gsm !== undefined ? specs.gsm : (row.gsm === '' ? DEFAULT_ROW.gsm : row.gsm),
      bf: specs.bf !== undefined ? specs.bf : (row.bf === '' ? DEFAULT_ROW.bf : row.bf),
      size: specs.size !== undefined ? specs.size : (row.size === '' ? DEFAULT_ROW.size : row.size),
    }));
    setBulkRows(next);
    // Intentionally only runs when the selected master code changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMasterCodeId]);

  const handleMasterCodeChange = (e) => {
    const id = e.target.value;
    setSelectedMasterCodeId(id);
    const selected = masterCodes.find((mc) => (mc.master_code_id || mc.id) === id);
    if (!selected) return;

    const specs = extractMasterCodeSpecs(selected);
    setSingleForm((prev) => ({
      ...prev,
      quality: specs.quality !== undefined ? specs.quality : prev.quality,
      gsm: specs.gsm !== undefined ? specs.gsm : prev.gsm,
      bf: specs.bf !== undefined ? specs.bf : prev.bf,
      size: specs.size !== undefined ? specs.size : prev.size,
    }));
  };

  const updateSingle = (key, value) => {
    setSingleForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const updateSingleCustom = (key, value) => {
    setSingleForm((prev) => ({
      ...prev,
      custom_fields: { ...prev.custom_fields, [key]: value },
    }));
  };

  const createEmptyBulkRows = (count, baseReelNo = '') => {
    const safeCount = Math.max(1, Math.min(500, Number(count) || 1));
    return Array.from({ length: safeCount }, (_, index) => ({
      ...cloneRow(DEFAULT_ROW),
      reel_no: baseReelNo ? incrementReelNumber(baseReelNo, index) : '',
      quality: selectedMasterCode?.quality ?? DEFAULT_ROW.quality,
      gsm: selectedMasterCode?.gsm ?? DEFAULT_ROW.gsm,
      bf: selectedMasterCode?.bf ?? DEFAULT_ROW.bf,
      size: selectedMasterCode?.size ?? DEFAULT_ROW.size,
    }));
  };

  const handleGenerateRows = async () => {
    setError('');
    setSuccess('');
    setBulkResult(null);
    const firstNo = nextReelNo || (await fetchNextReelNumber());
    setBulkRows(createEmptyBulkRows(bulkCount, firstNo));
  };

  const updateBulkCell = React.useCallback((rowIndex, key, value) => {
    setBulkRows((rows) =>
      rows.map((row, index) =>
        index === rowIndex ? { ...row, [key]: value } : row
      )
    );
    setError('');
  }, []);

  const updateBulkCustom = React.useCallback((rowIndex, key, value) => {
    setBulkRows((rows) =>
      rows.map((row, index) =>
        index === rowIndex
          ? { ...row, custom_fields: { ...row.custom_fields, [key]: value } }
          : row
      )
    );
    setError('');
  }, []);

  const deleteBulkRow = React.useCallback((rowIndex) => {
    setBulkRows((rows) => rows.filter((_, index) => index !== rowIndex));
    setBulkCount((count) => Math.max(1, count - 1));
  }, []);

  const buildPayload = (row) => ({
    reel_no: String(row.reel_no || '').trim(),
    master_code: selectedMasterCode?.master_code || undefined,
    master_code_id: selectedMasterCodeId || undefined,
    quality: String(row.quality || '').trim(),
    bf: Number(row.bf),
    supplier_name: String(row.supplier_name || '').trim(),
    size: Number(row.size),
    gsm: Number(row.gsm),
    rate_per_kg: row.rate_per_kg === '' ? 0 : Number(row.rate_per_kg),
    max_weight: Number(row.max_weight),
    purchase_date: row.purchase_date,
    custom_fields: row.custom_fields || {},
  });

  const validateRow = (row, index) => {
    const missing = [];
    if (!String(row.reel_no || '').trim()) missing.push('Reel Number');
    if (!String(row.quality || '').trim()) missing.push('Quality');
    if (!String(row.supplier_name || '').trim()) missing.push('Supplier Name');
    if (row.max_weight === '' || Number.isNaN(Number(row.max_weight)) || Number(row.max_weight) <= 0) missing.push('Reel Weight');
    if (row.gsm === '' || Number.isNaN(Number(row.gsm))) missing.push('GSM');
    if (row.size === '' || Number.isNaN(Number(row.size))) missing.push('Size');
    if (row.bf === '' || Number.isNaN(Number(row.bf))) missing.push('BF');
    if (!row.purchase_date) missing.push('Purchase Date');

    fieldDefs.forEach((def) => {
      if (!def.required) return;
      const value = row.custom_fields?.[def.key];
      if (value === '' || value === null || value === undefined) missing.push(def.label);
    });

    return missing.length ? `Row ${index + 1}: ${missing.join(', ')}` : '';
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    setBulkResult(null);

    try {
      const validation = validateRow(singleForm, 0);
      if (validation) throw new Error(validation);

      const res = await reelApi.create(buildPayload(singleForm));
      if (!res.success) throw new Error(res.message || 'Failed to create reel.');

      setSuccess(res.data?.message || `Reel #${singleForm.reel_no} created successfully.`);
      const nextNo = await fetchNextReelNumber();
      setSingleForm((prev) => ({
        ...cloneRow(DEFAULT_ROW),
        quality: selectedMasterCode?.quality ?? prev.quality,
        gsm: selectedMasterCode?.gsm ?? prev.gsm,
        bf: selectedMasterCode?.bf ?? prev.bf,
        size: selectedMasterCode?.size ?? prev.size,
        reel_no: nextNo || '',
      }));
    } catch (err) {
      setError(err.message || 'Failed to create reel.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkRows.length) {
      setError('Generate at least one reel row before submitting.');
      return;
    }

    const validationErrors = bulkRows
      .map((row, index) => validateRow(row, index))
      .filter(Boolean);
    if (validationErrors.length) {
      setError(validationErrors.slice(0, 5).join(' | ') + (validationErrors.length > 5 ? ' …' : ''));
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    setBulkResult(null);

    try {
      const payload = bulkRows.map(row => buildPayload(row));
      const res = await reelApi.bulkCreate(payload);
      
      if (!res.success) {
        throw new Error(res.message || 'Bulk creation failed');
      }

      setSuccess(`Successfully submitted ${bulkRows.length} reels for approval!`);
      setBulkRows([]);
      setBulkCount(1);
      const nextNo = await fetchNextReelNumber();
      setNextReelNo(nextNo);
    } catch (err) {
      const detail = Array.isArray(err.details) && err.details.length
        ? ` (${err.details.slice(0, 3).map((d) => `${d.field}: ${d.message}`).join('; ')})`
        : '';
      setError((err.message || 'Failed to submit bulk rows. Please try again.') + detail);
    }

    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcelImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setError('');
    setSuccess('');
    setBulkResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('The Excel file does not contain a worksheet.');

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rawRows.length) throw new Error('The Excel sheet is empty. Add at least one reel row.');

      const base = cloneRow({
        ...DEFAULT_ROW,
        quality: selectedMasterCode?.quality ?? DEFAULT_ROW.quality,
        gsm: selectedMasterCode?.gsm ?? DEFAULT_ROW.gsm,
        bf: selectedMasterCode?.bf ?? DEFAULT_ROW.bf,
        size: selectedMasterCode?.size ?? DEFAULT_ROW.size,
      });

      const imported = rawRows.map((raw) => buildRowFromExcel(raw, fieldDefs, base));
      const fallbackNumbers = await fetchNextReelNumber();
      const filled = imported.map((row, index) => ({
        ...row,
        reel_no: row.reel_no || (fallbackNumbers ? incrementReelNumber(fallbackNumbers, index) : ''),
      }));

      setBulkRows(filled);
      setBulkCount(filled.length);
      setMode('bulk');
      setSuccess(`Imported ${filled.length} row${filled.length === 1 ? '' : 's'} from “${file.name}”. Review the sheet before submitting.`);
    } catch (err) {
      setError(err.message || 'Could not import the Excel file.');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = allBulkColumns.map((column) => column.bulkCustom ? column.key : column.key);
    const example = {
      reel_no: nextReelNo || 'R-1001',
      quality: selectedMasterCode?.quality || 'VK',
      supplier_name: 'Example Supplier',
      max_weight: 1000,
      rate_per_kg: 55,
      gsm: selectedMasterCode?.gsm || 150,
      size: selectedMasterCode?.size || 100,
      bf: selectedMasterCode?.bf || 18,
      purchase_date: new Date().toISOString().slice(0, 10),
    };

    fieldDefs.forEach((def) => {
      example[def.key] = def.type === 'number' ? 0 : '';
    });

    const worksheet = XLSX.utils.json_to_sheet([example], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reels');
    XLSX.writeFile(workbook, 'reel_bulk_template.xlsx');
  };

  return (
    <div className="space-y-6 relative">
      {submitting && mode === 'bulk' && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex flex-col items-center justify-center backdrop-blur-sm">
          <Loader2 size={48} className="animate-spin text-brand-blue mb-4" />
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>Creating Reels...</h2>
          <p className="text-gray-500 mt-2 font-medium">Please wait while {bulkRows.length} reels are securely recorded.</p>
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/reels')}
            className="mt-1 p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            title="Back to Reel Inventory"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
              Create Reel
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter one reel at a time or use Excel-style bulk entry for many reels.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setMode('single'); setError(''); setSuccess(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition ${mode === 'single' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            Single Reel
          </button>
          <button
            type="button"
            onClick={() => { setMode('bulk'); setError(''); setSuccess(''); if (!bulkRows.length) setBulkRows(createEmptyBulkRows(bulkCount, nextReelNo)); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition ${mode === 'bulk' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            Bulk / Excel
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold flex items-start gap-2 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {error ? <X size={17} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={17} className="shrink-0 mt-0.5" />}
          <span>{error || success}</span>
        </div>
      )}

      <section className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Layers size={15} className="text-brand-blue" />
              <label className={labelClass + ' mb-0'}>Master Code (Business Classification)</label>
            </div>
            <select
              value={selectedMasterCodeId}
              onChange={handleMasterCodeChange}
              className={inputClass}
            >
              {masterCodes.map((mc) => {
                const specs = [
                  mc.quality ? `Quality: ${mc.quality}` : null,
                  mc.bf ? `BF: ${mc.bf}` : null,
                  mc.gsm ? `GSM: ${mc.gsm}` : null,
                  mc.size ? `Size: ${mc.size} cm` : null,
                ].filter(Boolean).join(', ');
                return (
                  <option key={mc.master_code_id || mc.id} value={mc.master_code_id || mc.id}>
                    {mc.master_code} — {mc.master_code_name}{specs ? ` (${specs})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="lg:w-72 text-xs text-gray-600 bg-white border border-indigo-100 rounded-xl px-3.5 py-3">
            Selecting a Master Code pre-fills Quality, GSM, BF and Size. Imported Excel values can still be edited before submission.
          </div>
        </div>
      </section>

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-base font-extrabold text-gray-900">Single Reel Creation</h2>
            <p className="text-xs text-gray-500 mt-1">One field per row keeps the desktop form easy to scan and fill like a simple data sheet.</p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="max-w-3xl">
              {BASE_FIELDS.map((definition) => (
                <Field
                  key={definition.key}
                  definition={definition}
                  value={singleForm[definition.key]}
                  onChange={updateSingle}
                />
              ))}

              {fieldDefs.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4">Custom Fields</div>
                  {fieldDefs.map((def) => (
                    <div key={def.key} className="pb-5 mb-5 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                      <label className={labelClass}>
                        {def.label} {def.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={def.type === 'number' ? 'number' : 'text'}
                        required={def.required}
                        value={singleForm.custom_fields?.[def.key] ?? ''}
                        onChange={(e) => updateSingleCustom(def.key, e.target.value)}
                        className={inputClass}
                        placeholder={`Enter ${def.label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={fetchNextReelNumber}
              disabled={loadingNextNo || submitting}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingNextNo ? 'animate-spin' : ''} />
              Refresh Auto Number
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-60 shadow-sm"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {submitting ? 'Submitting…' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col gap-4">
                {/* Row 1: Count + Generate */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="sm:w-56">
                    <label className={labelClass}>Number of Reels</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateRows(); } }}
                      className={inputClass}
                      placeholder="e.g. 100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateRows}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-blue hover:bg-brand-blue-dark shadow-sm transition"
                  >
                    <Plus size={16} />
                    Generate {bulkCount} Row{bulkCount === 1 ? '' : 's'}
                  </button>

                  <div className="flex gap-2 sm:ml-auto">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-brand-blue bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer">
                      <Upload size={15} />
                      {importing ? 'Importing…' : 'Import Excel'}
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} disabled={importing || submitting} />
                    </label>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
                    >
                      <Download size={15} />
                      Template
                    </button>
                  </div>
                </div>

                {/* Row count info */}
                {bulkRows.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue text-white text-xs font-bold">
                      <FileSpreadsheet size={13} />
                      {bulkRows.length} rows loaded — scroll down inside the table to see all
                    </span>
                    <span className="text-[11px] text-gray-400">Edit any cell, then submit at the bottom.</span>
                  </div>
                )}
                {!bulkRows.length && (
                  <p className="text-[11px] text-gray-500">
                    Enter <strong>{bulkCount}</strong> and click Generate. Reel numbers are auto-filled and increment automatically. Or import an Excel file.
                  </p>
                )}
              </div>
            </div>

            {bulkRows.length ? (
              <form onSubmit={handleBulkSubmit}>
                <div className="overflow-auto" style={{ maxHeight: 'min(80vh, 600px)', minHeight: '300px' }}>
                  <table className="min-w-[1500px] w-full border-separate border-spacing-0 text-xs">
                    <thead className="sticky top-0 z-10 bg-gray-100">
                      <tr>
                        <th className="sticky left-0 z-20 bg-gray-100 px-3 py-2.5 text-left font-extrabold text-gray-500 border-b border-gray-200">#</th>
                        {allBulkColumns.map((column) => (
                          <th key={column.key} className="px-2.5 py-2.5 text-left font-extrabold text-gray-500 border-b border-gray-200 whitespace-nowrap">
                            {column.label}{column.required ? ' *' : ''}
                          </th>
                        ))}
                        <th className="sticky right-0 z-20 bg-gray-100 px-3 py-2.5 text-left font-extrabold text-gray-500 border-b border-gray-200">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((row, rowIndex) => (
                        <MemoizedBulkRow
                          key={`bulk-${rowIndex}`}
                          row={row}
                          rowIndex={rowIndex}
                          allBulkColumns={allBulkColumns}
                          updateBulkCustom={updateBulkCustom}
                          updateBulkCell={updateBulkCell}
                          deleteBulkRow={deleteBulkRow}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 space-y-3">
                  {/* Master Code selector inline in bulk footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 shrink-0">
                      <Layers size={14} className="text-brand-blue" />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Master Code</span>
                    </div>
                    <select
                      value={selectedMasterCodeId}
                      onChange={handleMasterCodeChange}
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    >
                      {masterCodes.map((mc) => {
                        const specs = [
                          mc.quality ? `Q: ${mc.quality}` : null,
                          mc.bf ? `BF: ${mc.bf}` : null,
                          mc.gsm ? `GSM: ${mc.gsm}` : null,
                          mc.size ? `${mc.size} cm` : null,
                        ].filter(Boolean).join(', ');
                        return (
                          <option key={mc.master_code_id || mc.id} value={mc.master_code_id || mc.id}>
                            {mc.master_code} — {mc.master_code_name}{specs ? ` (${specs})` : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedMasterCode && (
                      <span className="shrink-0 text-[11px] text-gray-500 font-medium">
                        Will be applied to all {bulkRows.length} rows
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FileSpreadsheet size={15} className="text-brand-blue" />
                      <span><strong>{bulkRows.length}</strong> reel row{bulkRows.length === 1 ? '' : 's'} ready for submission.</span>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-60 shadow-sm"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {submitting ? 'Submitting Rows…' : `Submit ${bulkRows.length} Reels for Approval`}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-10 text-center">
                <FileSpreadsheet size={34} className="mx-auto text-gray-300" />
                <h3 className="text-sm font-bold text-gray-800 mt-3">No bulk rows yet</h3>
                <p className="text-xs text-gray-500 mt-1">Enter the number of reels above, then generate the rows, or import an Excel file.</p>
              </div>
            )}
          </section>

          {bulkResult && bulkResult.failedRows.length > 0 && (
            <section className="bg-white border border-red-200 rounded-2xl p-5">
              <h3 className="text-sm font-extrabold text-gray-900">Failed Rows</h3>
              <div className="mt-3 space-y-2">
                {bulkResult.failedRows.map((item) => (
                  <div key={`${item.index}-${item.reel_no}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs">
                    <span className="font-bold text-red-800">Row {item.index + 1} · {item.reel_no}</span>
                    <span className="text-red-700">{item.error}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400 px-1">
        Submitted entries follow the existing approval workflow. Bulk submission sends each row through the same reel creation API as single creation.
      </p>
    </div>
  );
}
