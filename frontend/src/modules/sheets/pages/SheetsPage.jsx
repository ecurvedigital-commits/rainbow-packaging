import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Layers,
  Plus,
  PlusCircle,
  Search,
  RefreshCw,
  Scissors,
  History,
  FileSpreadsheet,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Calendar,
  RotateCcw,
  X,
  Check,
  Eye,
  Trash2,
  CornerUpLeft,
  Clock,
  Boxes,
  Scale,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import SheetTable from '../components/SheetTable';
import SheetPrintReportFieldModal, { AVAILABLE_SHEET_REPORT_FIELDS } from '../components/SheetPrintReportFieldModal';
import SheetUsageModal from '../components/SheetUsageModal';
import SheetJourneyModal from '../components/SheetJourneyModal';
import SheetAdjustmentModal from '../components/SheetAdjustmentModal';
import SheetReturnModal from '../components/SheetReturnModal';
import SheetImportModal from '../components/SheetImportModal';
import Pagination from '../../../components/Common/Pagination';
import CustomDatePicker from '../../../components/Common/CustomDatePicker';
import { useAuth } from '../../../auth/AuthContext';
import { formatDate, formatDateTime } from '../../../utils/formatters';

const BASE_FIELDS = [
  { key: 'party_name', label: 'Party Name', apiKey: 'party_name' },
  { key: 'job_name', label: 'Job Name', apiKey: 'job_name' },
  { key: 'quality', label: 'Board Quality', apiKey: 'quality' },
  { key: 'gsm', label: 'GSM', apiKey: 'gsm' },
  { key: 'deckle', label: 'Deckle (cm)', apiKey: 'deckle' },
  { key: 'cutting', label: 'Cutting (cm)', apiKey: 'cutting' },
  { key: 'status', label: 'Stock Status', apiKey: 'status' },
  { key: 'consumption', label: 'Usage / Consumption', apiKey: 'consumption' },
];

const SORT_LABELS = {
  sr_no: 'Sr #',
  party_name: 'Party Name',
  job_name: 'Job Name',
  quality: 'Board Quality',
  deckle: 'Deckle (cm)',
  cutting: 'Cutting (cm)',
  gsm: 'GSM',
  initial_quantity: 'Initial Qty',
  current_quantity: 'Balance Qty',
  current_weight: 'Weight (kg)',
  status: 'Status',
  received_date: 'Inward Date',
};

const EMPTY_FILTER_VALUES = {
  party_name: [],
  job_name: [],
  quality: [],
  gsm: [],
  deckle: [],
  cutting: [],
  status: [],
  consumption: [],
};

export default function SheetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Data & Pagination state
  const [sheets, setSheets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '25', 10),
    total: 0,
    totalPages: 1,
  });

  // Export dropdown state
  const exportDropdownRef = useRef(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showPrintFieldModal, setShowPrintFieldModal] = useState(false);

  // Sorting state: array of { key, dir: 'asc' | 'desc' }
  const [sortConfig, setSortConfig] = useState([{ key: 'sr_no', dir: 'desc' }]);

  // Search state
  const [searchQ, setSearchQ] = useState(searchParams.get('q') || '');
  const [searchField, setSearchField] = useState('all');

  // Inward Date Range Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Multi-select Filter Chips State
  const [openFields, setOpenFields] = useState(new Set(['party_name']));
  const [filterValues, setFilterValues] = useState(() => {
    const statusParam = searchParams.get('status');
    const partyParam = searchParams.get('party_name');
    const qualityParam = searchParams.get('quality');

    return {
      ...EMPTY_FILTER_VALUES,
      status: statusParam ? statusParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
      party_name: partyParam ? partyParam.split(',').map((s) => s.trim()).filter(Boolean) : [],
      quality: qualityParam ? qualityParam.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
  });

  // Dropdown options from backend
  const [filterOptions, setFilterOptions] = useState({
    parties: [],
    jobs: [],
    qualities: [],
    gsms: [],
    statuses: [],
    deckles: [],
    cuttings: [],
    stations: [],
  });

  // Modals state
  const [activeSheet, setActiveSheet] = useState(null);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [journeyModalOpen, setJourneyModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Click outside listener for Export Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setShowExportDropdown(false);
      }
    };
    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load filter options on mount
  useEffect(() => {
    sheetApi.getFilterOptions()
      .then((res) => {
        if (res.success && res.data) {
          setFilterOptions({
            parties: res.data.parties || [],
            jobs: res.data.jobs || [],
            qualities: res.data.qualities || [],
            gsms: res.data.gsms || [],
            statuses: res.data.statuses || [],
            deckles: res.data.deckles || [],
            cuttings: res.data.cuttings || [],
            stations: res.data.stations || [],
          });
        }
      })
      .catch((err) => console.error('[SheetsPage] Failed to load filter options:', err));
  }, []);

  // Date Preset Helpers
  const handleTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handle7DaysFilter = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleMonthFilter = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  // Build API Query Parameters
  const buildApiParams = useCallback(() => {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
    };

    if (searchQ.trim()) {
      params.q = searchQ.trim();
      if (searchField && searchField !== 'all') {
        params.search_field = searchField;
      }
    }

    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;

    const csv = (arr) => (Array.isArray(arr) && arr.length ? arr.join(',') : undefined);

    if (csv(filterValues.party_name)) params.party_name = csv(filterValues.party_name);
    if (csv(filterValues.job_name)) params.job_name = csv(filterValues.job_name);
    if (csv(filterValues.quality)) params.quality = csv(filterValues.quality);
    if (csv(filterValues.gsm)) params.gsm = csv(filterValues.gsm);
    if (csv(filterValues.deckle)) params.deckle = csv(filterValues.deckle);
    if (csv(filterValues.cutting)) params.cutting = csv(filterValues.cutting);
    if (csv(filterValues.status)) params.status = csv(filterValues.status);
    if (csv(filterValues.consumption)) params.consumption = csv(filterValues.consumption);

    // Primary sort parameter for backend query
    if (sortConfig.length > 0) {
      const primary = sortConfig[0];
      params.sort = primary.dir === 'desc' ? `-${primary.key}` : primary.key;
    }

    return params;
  }, [pagination.page, pagination.limit, searchQ, searchField, dateFrom, dateTo, filterValues, sortConfig]);

  // Fetch Sheets Data
  const fetchSheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = buildApiParams();

    try {
      const res = await sheetApi.list(params);
      if (res.success) {
        setSheets(res.data || []);
        const meta = res.meta || {};
        setPagination((prev) => ({
          ...prev,
          page: meta.page || prev.page,
          limit: meta.limit || prev.limit,
          total: meta.total !== undefined ? meta.total : (res.data || []).length,
          totalPages: meta.totalPages || 1,
        }));
        if (meta.summary) {
          setSummary(meta.summary);
        }
      }
    } catch (err) {
      console.error('[SheetsPage] Failed to fetch sheets:', err);
      setError(err?.message || 'Failed to fetch sheet inventory.');
    } finally {
      setLoading(false);
    }
  }, [buildApiParams]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  // Sorting utilities (matching ReelListPage)
  const getSortValue = (sheet, key) => {
    switch (key) {
      case 'sr_no': return Number(sheet.sr_no) || 0;
      case 'party_name': return String(sheet.party_name || '').toLowerCase();
      case 'job_name': return String(sheet.job_name || '').toLowerCase();
      case 'quality': return String(sheet.quality || '').toLowerCase();
      case 'deckle': return Number(sheet.deckle) || 0;
      case 'cutting': return Number(sheet.cutting) || 0;
      case 'gsm': return Number(sheet.gsm) || 0;
      case 'initial_quantity': return Number(sheet.initial_quantity) || 0;
      case 'current_quantity': return Number(sheet.current_quantity) || 0;
      case 'current_weight': return Number(sheet.current_weight) || 0;
      case 'status': return String(sheet.status || '').toLowerCase();
      case 'received_date': {
        const t = new Date(sheet.received_date || sheet.created_at).getTime();
        return Number.isFinite(t) ? t : 0;
      }
      default: return '';
    }
  };

  const applySort = (list) => {
    if (!sortConfig.length) return list;
    return [...list].sort((x, y) => {
      for (const { key, dir } of sortConfig) {
        const factor = dir === 'asc' ? 1 : -1;
        const vx = getSortValue(x, key);
        const vy = getSortValue(y, key);
        let diff;
        if (typeof vx === 'number' && typeof vy === 'number') diff = vx - vy;
        else diff = String(vx).localeCompare(String(vy), undefined, { numeric: true });
        if (diff !== 0) return diff * factor;
      }
      return 0;
    });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (!existing) return [{ key, dir: 'asc' }, ...prev.filter((c) => c.key !== key)];
      if (existing.dir === 'asc') return prev.map((c) => (c.key === key ? { ...c, dir: 'desc' } : c));
      return prev.filter((c) => c.key !== key);
    });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const sortSummaryText = () =>
    sortConfig
      .map((c, i) => `${i + 1}. ${SORT_LABELS[c.key] || c.key} (${c.dir === 'asc' ? 'Asc' : 'Desc'})`)
      .join(', ');

  // Fetch all sheets for complete export (pagination loop)
  const fetchAllReportSheets = useCallback(async () => {
    const baseParams = buildApiParams();
    const pageSize = 100;
    const results = [];
    let page = 1;
    let totalPages = null;

    while (page <= (totalPages || 500)) {
      const res = await sheetApi.list({ ...baseParams, page, limit: pageSize });
      const items = Array.isArray(res?.data) ? res.data : [];
      const meta = res?.meta || {};
      if (totalPages === null) {
        const reported = Number(meta.totalPages);
        totalPages = Number.isFinite(reported) && reported > 0 ? reported : null;
      }
      results.push(...items);
      if (items.length === 0) break;
      if (totalPages === null && items.length < pageSize) break;
      page += 1;
    }

    return results;
  }, [buildApiParams]);

  // Export Spreadsheet (.xlsx / .csv)
  const handleExportSpreadsheet = async (format = 'xlsx') => {
    setReportLoading(true);
    setError(null);

    try {
      const reportSheets = applySort(await fetchAllReportSheets());
      if (!reportSheets.length) {
        setError('No sheet lots found to export with the current filters.');
        setReportLoading(false);
        return;
      }

      const rows = reportSheets.map((s, index) => {
        const consumedQty = Math.max(0, s.initial_quantity - s.current_quantity);
        const consumedWeight = Math.max(0, s.initial_weight - s.current_weight);

        return {
          'Sr. No': index + 1,
          'Lot Sr #': s.sr_no,
          'Party Name': s.party_name || '',
          'Job Name': s.job_name || 'General / Stock',
          'Quality': s.quality || '',
          'Deckle (cm)': s.deckle || 0,
          'Cutting (cm)': s.cutting || 0,
          'GSM': s.gsm || 0,
          'Initial Quantity': s.initial_quantity || 0,
          'Balance Quantity': s.current_quantity || 0,
          'Consumed Quantity': consumedQty,
          'Initial Weight (kg)': s.initial_weight || 0,
          'Balance Weight (kg)': s.current_weight || 0,
          'Consumed Weight (kg)': Number(consumedWeight.toFixed(2)),
          'Status': s.status || 'AVAILABLE',
          'Supplier Name': s.supplier_name || '',
          'Lot / Batch No': s.lot_no || '',
          'Inward Date': s.received_date ? formatDate(s.received_date) : '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet Inventory');

      const dateStr = new Date().toISOString().slice(0, 10);
      if (format === 'csv') {
        XLSX.writeFile(workbook, `Rainbow_Sheets_Inventory_${dateStr}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(workbook, `Rainbow_Sheets_Inventory_${dateStr}.xlsx`, { bookType: 'xlsx' });
      }
      showToast(`Exported ${rows.length} sheet lots to ${format.toUpperCase()}!`);
    } catch (err) {
      console.error('[SheetsPage] Failed to export spreadsheet:', err);
      setError(err?.message || 'Failed to export spreadsheet.');
    } finally {
      setReportLoading(false);
    }
  };

  // Open Printable PDF / Report Window (with Custom Column Selection)
  const openPrintReport = async (selectedFieldIds = null) => {
    // If no columns are selected yet, prompt the custom column selection modal
    if (!selectedFieldIds || !Array.isArray(selectedFieldIds) || selectedFieldIds.length === 0) {
      setShowPrintFieldModal(true);
      return;
    }

    setShowPrintFieldModal(false);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('The report window was blocked by your browser. Please allow pop-ups and try again.');
      return;
    }

    setReportLoading(true);
    setError(null);
    printWindow.document.write('<p style="font-family:Arial,sans-serif;padding:24px">Preparing Rainbow Sheet Inventory Report...</p>');

    try {
      const reportSheets = applySort(await fetchAllReportSheets());
      const printedOn = formatDateTime(new Date());

      // Available active column mapping
      const fieldConfigMap = {
        sr_no: { label: 'Sr.', align: 'center nowrap', defaultWidth: '5%' },
        lot_no: { label: 'Lot #', align: 'center nowrap', defaultWidth: '8%' },
        party_name: { label: 'Party Name', align: 'left', defaultWidth: '18%' },
        job_name: { label: 'Job Name', align: 'left', defaultWidth: '15%' },
        quality: { label: 'Quality', align: 'center nowrap', defaultWidth: '9%' },
        dimensions: { label: 'Dimensions (cm)', align: 'center nowrap', defaultWidth: '12%' },
        gsm: { label: 'GSM', align: 'center nowrap', defaultWidth: '6%' },
        current_quantity: { label: 'Balance Qty', align: 'right nowrap', defaultWidth: '10%' },
        current_weight: { label: 'Balance (kg)', align: 'right nowrap', defaultWidth: '10%' },
        initial_quantity: { label: 'Initial Qty', align: 'right nowrap', defaultWidth: '10%' },
        initial_weight: { label: 'Initial (kg)', align: 'right nowrap', defaultWidth: '10%' },
        consumed_quantity: { label: 'Consumed Qty', align: 'right nowrap', defaultWidth: '10%' },
        consumed_weight: { label: 'Consumed (kg)', align: 'right nowrap', defaultWidth: '10%' },
        status: { label: 'Status', align: 'center nowrap', defaultWidth: '8%' },
        supplier_name: { label: 'Supplier / Mill', align: 'left', defaultWidth: '12%' },
        received_date: { label: 'Inward Date', align: 'center nowrap', defaultWidth: '9%' },
      };

      const activeColumns = selectedFieldIds
        .filter((id) => fieldConfigMap[id])
        .map((id) => ({ id, ...fieldConfigMap[id] }));

      let totalCurrentSheets = 0;
      let totalCurrentWeight = 0;
      let totalInitialSheets = 0;
      let totalInitialWeight = 0;
      let totalConsumedSheets = 0;
      let totalConsumedWeight = 0;

      const rowsHtml = reportSheets
        .map((s, idx) => {
          totalCurrentSheets += Number(s.current_quantity) || 0;
          totalCurrentWeight += Number(s.current_weight) || 0;
          totalInitialSheets += Number(s.initial_quantity) || 0;
          totalInitialWeight += Number(s.initial_weight) || 0;
          totalConsumedSheets += Number(s.consumed_quantity) || 0;
          totalConsumedWeight += Number(s.consumed_weight) || 0;

          const cellRenderers = {
            sr_no: idx + 1,
            lot_no: s.lot_no ? escapeHtml(s.lot_no) : (s.sr_no ? `#${s.sr_no}` : '-'),
            party_name: `<strong>${escapeHtml(s.party_name || '-')}</strong>`,
            job_name: escapeHtml(s.job_name || '-'),
            quality: escapeHtml(s.quality || '-'),
            dimensions: `${s.deckle} × ${s.cutting}`,
            gsm: `${s.gsm}`,
            current_quantity: `<strong>${(s.current_quantity || 0).toLocaleString()}</strong>`,
            current_weight: `<strong>${(s.current_weight || 0).toLocaleString()} kg</strong>`,
            initial_quantity: (s.initial_quantity || 0).toLocaleString(),
            initial_weight: `${(s.initial_weight || 0).toLocaleString()} kg`,
            consumed_quantity: (s.consumed_quantity || 0).toLocaleString(),
            consumed_weight: `${(s.consumed_weight || 0).toLocaleString()} kg`,
            status: escapeHtml(s.status || 'AVAILABLE'),
            supplier_name: escapeHtml(s.supplier_name || '-'),
            received_date: s.received_date ? formatDate(s.received_date) : '-',
          };

          const cellsHtml = activeColumns
            .map((col) => `<td class="${col.align}">${cellRenderers[col.id] ?? '-'}</td>`)
            .join('');

          return `<tr>${cellsHtml}</tr>`;
        })
        .join('');

      const thHeadersHtml = activeColumns
        .map((col) => `<th class="${col.align}">${col.label}</th>`)
        .join('');

      const totalsRenderer = {
        current_quantity: `${totalCurrentSheets.toLocaleString()} sheets`,
        current_weight: `${totalCurrentWeight.toLocaleString()} kg`,
        initial_quantity: `${totalInitialSheets.toLocaleString()} sheets`,
        initial_weight: `${totalInitialWeight.toLocaleString()} kg`,
        consumed_quantity: `${totalConsumedSheets.toLocaleString()} sheets`,
        consumed_weight: `${totalConsumedWeight.toLocaleString()} kg`,
      };

      const hasAnyTotals = activeColumns.some((col) => totalsRenderer[col.id]);
      const firstTotalIdx = activeColumns.findIndex((col) => totalsRenderer[col.id]);

      const tfootCells = activeColumns
        .map((col, idx) => {
          if (totalsRenderer[col.id]) {
            return `<td class="${col.align}" style="font-weight:800;font-family:monospace">${totalsRenderer[col.id]}</td>`;
          }
          if (idx === Math.max(0, firstTotalIdx - 1)) {
            return `<td style="font-weight:800;text-align:right;padding-right:8px">TOTALS:</td>`;
          }
          return `<td></td>`;
        })
        .join('');

      const tfootHtml = hasAnyTotals
        ? `<tfoot><tr class="totals">${tfootCells}</tr></tfoot>`
        : '';

      printWindow.document.open();
      printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Rainbow Packages - Sheet Inventory Report</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #111827; margin: 0; padding: 12px; }
    .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { font-size: 20px; font-weight: 900; margin: 0; color: #065f46; letter-spacing: -0.5px; }
    .header p { margin: 2px 0 0; color: #4b5563; font-size: 11px; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
    .meta td { padding: 4px 6px; }
    .meta .label { font-weight: bold; color: #374151; width: 120px; }
    table.data { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: auto; }
    table.data th { background: #f0fdf4; color: #065f46; border: 1px solid #d1fae5; padding: 6px 7px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    table.data td { border: 1px solid #e5e7eb; padding: 5px 6px; }
    table.data tr:nth-child(even) { background: #f9fafb; }
    .totals { font-weight: 800; background: #ecfdf5; border-top: 2px solid #059669; }
    .footer { margin-top: 36px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
    .footer div { width: 180px; text-align: center; border-top: 1px solid #374151; padding-top: 4px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .nowrap { white-space: nowrap; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rainbow Packaging Ind.</h1>
    <p>Sidcul Haridwar &bull; Board Stock (Sheet) Inventory Ledger</p>
  </div>
  <table class="meta">
    <tr>
      <td class="label">Report Date:</td><td>${printedOn}</td>
      <td class="label" style="text-align:right">Total Stock Lots:</td><td style="text-align:right;font-weight:bold">${reportSheets.length}</td>
    </tr>
    <tr>
      <td class="label">Active Filters:</td><td>${buildFilterSummaryText()}</td>
      <td class="label" style="text-align:right">Total Net Weight:</td><td style="text-align:right;font-weight:bold;color:#065f46">${totalCurrentWeight.toLocaleString()} kg</td>
    </tr>
    ${sortConfig.length ? `<tr><td class="label">Sorted By:</td><td colspan="3">${sortSummaryText()}</td></tr>` : ''}
  </table>
  <table class="data">
    <thead>
      <tr>
        ${thHeadersHtml}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="${activeColumns.length}" style="text-align:center;padding:16px">No sheets matching filters</td></tr>`}
    </tbody>
    ${tfootHtml}
  </table>
  <div class="footer">
    <div>Prepared By</div>
    <div>Store Incharge</div>
    <div>Authorized Signatory</div>
  </div>
</body>
</html>
      `);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 300);
    } catch (err) {
      printWindow.close();
      console.error('[SheetsPage] Failed to generate print report:', err);
      setError(err?.message || 'Failed to generate print report.');
    } finally {
      setReportLoading(false);
    }
  };

  const escapeHtml = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const buildFilterSummaryText = () => {
    const parts = [];
    if (searchQ.trim()) parts.push(`Search: "${searchQ.trim()}"`);
    if (dateFrom || dateTo) parts.push(`Date: ${dateFrom || 'Start'} to ${dateTo || 'Today'}`);
    BASE_FIELDS.forEach((f) => {
      const vals = filterValues[f.key];
      if (Array.isArray(vals) && vals.length > 0) {
        parts.push(`${f.label}: ${vals.join(', ')}`);
      }
    });
    return parts.length ? parts.join(' | ') : 'All Inventory (No Filters)';
  };

  // Filter Chips Toggling
  const toggleFieldOpen = (fieldKey) => {
    setOpenFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey);
      else next.add(fieldKey);
      return next;
    });
  };

  const toggleValue = (fieldKey, val) => {
    setFilterValues((prev) => {
      const cur = Array.isArray(prev[fieldKey]) ? prev[fieldKey] : [];
      const strVal = String(val);
      const exists = cur.includes(strVal);
      return {
        ...prev,
        [fieldKey]: exists ? cur.filter((v) => v !== strVal) : [...cur, strVal],
      };
    });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const clearFieldFilter = (fieldKey) => {
    setFilterValues((prev) => ({ ...prev, [fieldKey]: [] }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleResetAll = () => {
    setSearchQ('');
    setSearchField('all');
    setDateFrom('');
    setDateTo('');
    setFilterValues(EMPTY_FILTER_VALUES);
    setOpenFields(new Set(['party_name']));
    setSortConfig([{ key: 'sr_no', dir: 'desc' }]);
    setPagination((p) => ({ ...p, page: 1 }));
    setSearchParams({});
  };

  const getOptionsForField = (fieldKey) => {
    switch (fieldKey) {
      case 'party_name': return filterOptions.parties;
      case 'job_name': return filterOptions.jobs;
      case 'quality': return filterOptions.qualities;
      case 'gsm': return filterOptions.gsms;
      case 'deckle': return filterOptions.deckles;
      case 'cutting': return filterOptions.cuttings;
      case 'status': return filterOptions.statuses;
      case 'consumption': return ['Fresh / Unused (100%)', 'Partially Consumed', 'Fully Depleted'];
      default: return [];
    }
  };

  const totalActiveFilterCount =
    Object.values(filterValues).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (searchQ ? 1 : 0);

  // Row Action Handlers
  const handleRecordUsage = (sheet) => {
    setActiveSheet(sheet);
    setUsageModalOpen(true);
  };

  const handleViewJourney = (sheet) => {
    setActiveSheet(sheet);
    setJourneyModalOpen(true);
  };

  const handleAdjustStock = (sheet) => {
    setActiveSheet(sheet);
    setAdjustModalOpen(true);
  };

  const handleReturnStock = (sheet) => {
    setActiveSheet(sheet);
    setReturnModalOpen(true);
  };

  const handleVoidSheet = async (sheet) => {
    if (!window.confirm(`Are you sure you want to void sheet lot #${sheet.sr_no} (${sheet.party_name})?`)) {
      return;
    }
    try {
      await sheetApi.voidSheet(sheet.id, { reason: 'Voided by Admin from inventory table' });
      showToast(`Sheet lot #${sheet.sr_no} voided successfully.`);
      fetchSheets();
    } catch (err) {
      alert(err?.message || 'Failed to void sheet lot');
    }
  };

  // Live Summary Calculations
  const viewTotalSheets = sheets.reduce((sum, s) => sum + (s.current_quantity || 0), 0);
  const viewTotalWeight = sheets.reduce((sum, s) => sum + (s.current_weight || 0), 0);
  const displayTotalSheets = summary?.total_available_sheets ?? viewTotalSheets;
  const displayTotalWeight = summary?.total_available_weight ?? viewTotalWeight;
  const displayTotalLots = summary?.total_lots ?? pagination.total ?? sheets.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl animate-slide-left">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header & Actions ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Sheet / Board Stock Inventory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active Store Register
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage paperboard stock lots, track dimensions, record cutting, and export reports across database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 justify-end">
          {/* Export & Download Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={reportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              title="Export report in PDF, Excel, or CSV format"
            >
              <Download size={15} className="text-emerald-400" />
              <span>{reportLoading ? 'Preparing Report...' : 'Export Report'}</span>
              <ChevronDown size={14} className="opacity-70" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-scale-in">
                <button
                  onClick={() => {
                    setShowExportDropdown(false);
                    openPrintReport();
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-emerald-50 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                >
                  <FileText size={16} className="text-rose-600 shrink-0" />
                  <div>
                    <span className="block font-bold text-gray-900">Print / PDF Report</span>
                    <span className="text-[10px] text-gray-400 block font-normal">Formatted printable document</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowExportDropdown(false);
                    handleExportSpreadsheet('xlsx');
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-emerald-50 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-bold text-gray-900">Download Excel (.xlsx)</span>
                    <span className="text-[10px] text-gray-400 block font-normal">Full spreadsheet columns</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowExportDropdown(false);
                    handleExportSpreadsheet('csv');
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-emerald-50 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Download size={16} className="text-blue-600 shrink-0" />
                  <div>
                    <span className="block font-bold text-gray-900">Download CSV (.csv)</span>
                    <span className="text-[10px] text-gray-400 block font-normal">Standard comma-separated file</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={fetchSheets}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
            title="Refresh list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            to="/sheets/inward"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Inward (Invert)</span>
          </Link>

          <Link
            to="/sheets/cut"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Scissors size={15} />
            <span>Cut / Outward</span>
          </Link>

          <Link
            to="/sheets/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-xs"
          >
            <History size={15} />
            <span>Stock History</span>
          </Link>

          {isAdmin && (
            <button
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Import Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Inventory Live Summary Banner (Matching ReelListPage) ──── */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Lots in View</p>
            <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              {displayTotalLots}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Available Sheets</p>
            <p className="text-2xl font-black text-emerald-300" style={{ fontFamily: 'var(--font-family-display)' }}>
              {displayTotalSheets.toLocaleString()} <span className="text-xs font-normal text-emerald-200">pcs</span>
            </p>
          </div>
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Stock Weight</p>
            <p className="text-2xl font-black text-emerald-400" style={{ fontFamily: 'var(--font-family-display)' }}>
              {displayTotalWeight.toLocaleString()} <span className="text-xs font-normal text-emerald-200">kg</span>
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              ~{(displayTotalWeight / 1000).toFixed(3)} Metric Tons
            </p>
          </div>
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Active Lots Breakdown</p>
            <p className="text-sm font-bold text-amber-200 mt-1">
              {summary?.available_lots_count ?? 0} Fresh &bull; {summary?.partially_consumed_count ?? 0} In-Use
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {summary?.depleted_count ?? 0} depleted lots archived
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Panel (Matching ReelListPage) ───────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs relative z-20 overflow-hidden">
        {/* Search Bar + Field Selector Dropdown + Reset */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder={
                  searchField === 'all'
                    ? 'Search everywhere (party, job, quality, GSM, dimensions, lot #)...'
                    : `Search specifically by ${searchField.replace('_', ' ')}...`
                }
                className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-gray-900"
              />
            </div>

            {/* Field selector dropdown on the right side of search bar */}
            <div className="shrink-0 flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Search Field:</span>
              <select
                value={searchField}
                onChange={(e) => {
                  setSearchField(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer py-0.5"
                title="Select specific field to filter search"
              >
                <option value="all">🔍 All Fields (Everywhere)</option>
                <option value="party_name">Party Name</option>
                <option value="job_name">Job Name</option>
                <option value="quality">Board Quality</option>
                <option value="gsm">GSM</option>
                <option value="deckle">Deckle (cm)</option>
                <option value="cutting">Cutting (cm)</option>
                <option value="sr_no">Lot Serial #</option>
                <option value="supplier">Supplier Name</option>
                <option value="status">Stock Status</option>
              </select>
            </div>
          </div>

          {(totalActiveFilterCount > 0 || searchQ || dateFrom || dateTo || searchField !== 'all') && (
            <button
              onClick={handleResetAll}
              className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Inward Date Filter Row */}
        <div className="p-3.5 border-b border-gray-100 bg-gray-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-gray-700 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-emerald-600" /> Filter by Inward Date:
            </span>
            <div className="flex items-center gap-2">
              <CustomDatePicker
                date={dateFrom}
                onChange={(newDate) => {
                  setDateFrom(newDate);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="Inward From"
                align="left"
                iconColor="text-emerald-600"
              />
              <span className="text-gray-400">to</span>
              <CustomDatePicker
                date={dateTo}
                onChange={(newDate) => {
                  setDateTo(newDate);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="Inward To"
                align="left"
                iconColor="text-emerald-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleTodayFilter}
              className="px-2.5 py-1 text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handle7DaysFilter}
              className="px-2.5 py-1 text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              onClick={handleMonthFilter}
              className="px-2.5 py-1 text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              This Month
            </button>
            {(dateFrom || dateTo) && (
              <button
                onClick={clearDateFilter}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        {/* Step 1: Multi-Select Filter Field Chips */}
        <div className="px-4 pt-3.5 pb-2 space-y-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Select filter fields — click to expand, then pick values below:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {BASE_FIELDS.map((f) => {
              const isOpen = openFields.has(f.key);
              const vals = filterValues[f.key] || [];
              const hasFilter = vals.length > 0;

              return (
                <button
                  key={f.key}
                  onClick={() => toggleFieldOpen(f.key)}
                  className={`
                    px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer
                    ${
                      isOpen && hasFilter
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow ring-2 ring-emerald-200'
                        : isOpen
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow ring-1 ring-emerald-200'
                        : hasFilter
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  <span>{f.label}</span>
                  {hasFilter && (
                    <span
                      className={`
                      inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full
                      ${isOpen ? 'bg-white text-emerald-800' : 'bg-emerald-600 text-white'}
                    `}
                    >
                      {vals.length}
                    </span>
                  )}
                  {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Expanded Values Panel for Open Chips */}
        {openFields.size > 0 && (
          <div className="p-4 bg-slate-50/70 border-t border-gray-100 space-y-3">
            {Array.from(openFields).map((fieldKey) => {
              const fieldMeta = BASE_FIELDS.find((f) => f.key === fieldKey);
              if (!fieldMeta) return null;

              const options = getOptionsForField(fieldKey);
              const selectedValues = filterValues[fieldKey] || [];

              return (
                <div key={fieldKey} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>{fieldMeta.label}:</span>
                      {selectedValues.length > 0 && (
                        <span className="text-emerald-700 font-semibold font-mono">
                          ({selectedValues.length} selected)
                        </span>
                      )}
                    </span>
                    {selectedValues.length > 0 && (
                      <button
                        onClick={() => clearFieldFilter(fieldKey)}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear {fieldMeta.label}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                    {options.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">No distinct options recorded yet.</span>
                    ) : (
                      options.map((opt) => {
                        const strOpt = String(opt);
                        const isSelected = selectedValues.includes(strOpt);

                        return (
                          <button
                            key={strOpt}
                            onClick={() => toggleValue(fieldKey, strOpt)}
                            className={`
                              px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1
                              ${
                                isSelected
                                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                  : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/40'
                              }
                            `}
                          >
                            {isSelected && <Check size={12} />}
                            <span>{strOpt}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sort Summary strip */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-700">Active Sorting:</span>
            <span className="font-mono text-emerald-800 font-bold">{sortSummaryText()}</span>
            <span className="text-gray-400">(Click table column headers to toggle multi-sort)</span>
          </div>
          <div>
            Showing <strong className="text-gray-900">{sheets.length}</strong> of{' '}
            <strong className="text-gray-900">{pagination.total}</strong> matching lots
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* ── Sheet Inventory Table with Multi-Sort ───────────────────── */}
      <SheetTable
        sheets={applySort(sheets)}
        loading={loading}
        sortConfig={sortConfig}
        onSort={handleSort}
        onRecordUsage={handleRecordUsage}
        onViewJourney={handleViewJourney}
        onAdjustStock={handleAdjustStock}
        onReturnStock={handleReturnStock}
        onVoidSheet={handleVoidSheet}
        isAdmin={isAdmin}
      />

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={(newPage) => setPagination((p) => ({ ...p, page: newPage }))}
        onLimitChange={(newLimit) => setPagination((p) => ({ ...p, limit: newLimit, page: 1 }))}
      />

      {/* Modals */}
      {usageModalOpen && activeSheet && (
        <SheetUsageModal
          isOpen={usageModalOpen}
          sheet={activeSheet}
          onClose={() => {
            setUsageModalOpen(false);
            setActiveSheet(null);
          }}
          onSuccess={() => {
            setUsageModalOpen(false);
            setActiveSheet(null);
            showToast(`Consumption recorded for Lot #${activeSheet.sr_no}`);
            fetchSheets();
          }}
        />
      )}

      {journeyModalOpen && activeSheet && (
        <SheetJourneyModal
          isOpen={journeyModalOpen}
          sheetId={activeSheet.id}
          onClose={() => {
            setJourneyModalOpen(false);
            setActiveSheet(null);
          }}
        />
      )}

      {adjustModalOpen && activeSheet && (
        <SheetAdjustmentModal
          isOpen={adjustModalOpen}
          sheet={activeSheet}
          onClose={() => {
            setAdjustModalOpen(false);
            setActiveSheet(null);
          }}
          onSuccess={() => {
            setAdjustModalOpen(false);
            setActiveSheet(null);
            showToast(`Stock adjusted for Lot #${activeSheet.sr_no}`);
            fetchSheets();
          }}
        />
      )}

      {returnModalOpen && activeSheet && (
        <SheetReturnModal
          isOpen={returnModalOpen}
          sheet={activeSheet}
          onClose={() => {
            setReturnModalOpen(false);
            setActiveSheet(null);
          }}
          onSuccess={() => {
            setReturnModalOpen(false);
            setActiveSheet(null);
            showToast(`Returned stock added back to Lot #${activeSheet.sr_no}`);
            fetchSheets();
          }}
        />
      )}

      {importModalOpen && (
        <SheetImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            setImportModalOpen(false);
            showToast('Excel register imported successfully!');
            fetchSheets();
          }}
        />
      )}

      {/* Column Selection Modal for Custom Print Report */}
      <SheetPrintReportFieldModal
        isOpen={showPrintFieldModal}
        onClose={() => setShowPrintFieldModal(false)}
        onConfirm={(selectedFieldIds) => openPrintReport(selectedFieldIds)}
        loading={reportLoading}
      />
    </div>
  );
}
