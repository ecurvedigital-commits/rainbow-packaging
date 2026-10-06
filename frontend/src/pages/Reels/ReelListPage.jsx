import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Plus, Search, RefreshCw, Eye, Scale, Edit3, Trash2,
  X, RotateCcw, Check, ChevronDown, ChevronUp, Calendar, IndianRupee, Clock, Printer, ArrowUpDown,
  Wrench, FileSpreadsheet, FileText, Download,
} from 'lucide-react';
import { reelApi } from '../../api/reelApi';
import { masterCodeApi } from '../../api/masterCodeApi';
import { useAuth } from '../../auth/AuthContext';
import CreateReelModal from './CreateReelModal';
import RecordUsageModal from './RecordUsageModal';
import MasterCorrectionModal from './MasterCorrectionModal';
import VoidReelModal from './VoidReelModal';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import CustomDatePicker from '../../components/Common/CustomDatePicker';
import { formatWeight, formatDate, formatCurrency, getStatusBadgeClass } from '../../utils/formatters';

const formatBfDisplay = (bf) => {
  if (!bf && bf !== 0) return '';
  const str = String(bf).trim();
  return str.toUpperCase().includes('BF') || isNaN(Number(str)) ? str : `${str} BF`;
};

const formatMasterCodeBadge = (code, reel = null, map = {}) => {
  if (reel?.master_code_name) return reel.master_code_name;
  if (!code) return '';
  const str = String(code).trim();
  if (map && map[str]) return map[str];
  const numOnly = str.replace(/^(master\s*code|code|mc)\s*:?\s*/i, '');
  if (map && map[numOnly]) return map[numOnly];
  return str;
};

const BASE_FIELDS = [
  { key: 'supplier', label: 'Supplier Name', apiKey: 'supplier' },
  { key: 'mill_name', label: 'Mill Name', apiKey: 'mill_name' },
  { key: 'master_code', label: 'Master Code', apiKey: 'master_code' },
  { key: 'paper_quality', label: 'Paper Quality', apiKey: 'quality' },
  { key: 'gsm', label: 'GSM', apiKey: 'gsm' },
  { key: 'bf', label: 'Bursting Factor (BF)', apiKey: 'bf' },
  { key: 'width_mm', label: 'Size / Width (cm)', apiKey: 'size' },
  { key: 'consumption', label: 'Consumed / Usage Status', apiKey: 'consumption' },
  { key: 'status', label: 'Reel Status', apiKey: 'status' },
  { key: 'station', label: 'Station Used', apiKey: 'station' },
];

const SORT_LABELS = {
  reel: 'Reel No.', specs: 'Specifications', supplier: 'Supplier', mill: 'Mill Name',
  weight: 'Stock Weight', consumed: 'Total Consumed', price: 'Price / KG', status: 'Status', created: 'Created',
};

const EMPTY_FILTER_VALUES = {
  supplier: [], mill_name: [], master_code: [], paper_quality: [], gsm: [],
  bf: [], width_mm: [], consumption: [], status: [], station: [],
};

export default function ReelListPage() {
  const { isRoleAdmin, isRoleSupervisor, isRoleOperator } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [usageReel, setUsageReel] = useState(null);
  const [correctionReel, setCorrectionReel] = useState(null);
  const [messageReel, setMessageReel] = useState(null);
  const [voidReel, setVoidReel] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState([]); // [{ key, dir }] in priority order

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [masterCodeMap, setMasterCodeMap] = useState({});
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '15', 10),
    total: 0,
    totalPages: 1,
  });

  const exportDropdownRef = useRef(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Click outside for export dropdown
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

  // Set of field keys that are currently "open" (expanded) — multiple allowed
  const [openFields, setOpenFields] = useState(() => {
    const fields = new Set(['supplier']);
    if (searchParams.get('quality')) fields.add('paper_quality');
    if (searchParams.get('bf')) fields.add('bf');
    if (searchParams.get('status')) fields.add('status');
    return fields;
  });

  // Per-field selected values (each is an array)
  const [filterValues, setFilterValues] = useState(() => {
    const statusParam = searchParams.get('status');
    const supplierParam = searchParams.get('supplier');
    const millNameParam = searchParams.get('mill_name');
    const qualityParam = searchParams.get('quality');
    const bfParam = searchParams.get('bf');

    return {
      ...EMPTY_FILTER_VALUES,
      status: statusParam ? statusParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
      supplier: supplierParam ? supplierParam.split(',').map((s) => s.trim()).filter(Boolean) : [],
      mill_name: millNameParam ? millNameParam.split(',').map((s) => s.trim()).filter(Boolean) : [],
      paper_quality: qualityParam ? qualityParam.split(',').map((s) => s.trim()).filter(Boolean) : [],
      bf: bfParam ? bfParam.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
  });

  // Free-text search & field selector
  const [searchQ, setSearchQ] = useState(searchParams.get('q') || '');
  const [searchField, setSearchField] = useState('all');

  // Creation Date Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Consumption Date Filter (reels consumed on a given day / range)
  const [consumedFrom, setConsumedFrom] = useState('');
  const [consumedTo, setConsumedTo] = useState('');

  // Dropdown options from backend
  const [filterOptions, setFilterOptions] = useState({
    qualities: [], gsms: [], bfs: [], sizes: [],
    suppliers: [], mill_names: [], master_codes: [], statuses: [], stations: [],
    custom_fields: [],
  });

  // Date preset helpers
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

  // ── Fetch filter options and master codes ─────────────────────────────
  useEffect(() => {
    masterCodeApi.list({ status: 'ACTIVE' })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((mc) => {
            if (mc.master_code) {
              map[mc.master_code] = mc.master_code_name || mc.master_code;
              map[`Master Code ${mc.master_code}`] = mc.master_code_name || mc.master_code;
            }
            if (mc.master_code_id || mc.id) {
              map[mc.master_code_id || mc.id] = mc.master_code_name || mc.master_code;
            }
          });
          setMasterCodeMap(map);
        }
      })
      .catch((err) => console.error('[ReelListPage] Failed to load master codes:', err));

    reelApi.getFilterOptions()
      .then((res) => {
        console.log('[ReelListPage] Loaded Filter Options:', res?.data);
        if (res.success && res.data) {
          setFilterOptions({
            qualities: res.data.qualities || [],
            gsms: res.data.gsms || [],
            bfs: res.data.bfs || [],
            sizes: res.data.sizes || [],
            suppliers: res.data.suppliers || [],
            mill_names: res.data.mill_names || [],
            master_codes: (res.data.master_codes || [])
              .filter((code) => Boolean(code) && !/^[A-Z]+-G\d+-BF\d+-S\d+/.test(code)),
            statuses: res.data.statuses || [],
            stations: res.data.stations || [],
            custom_fields: res.data.custom_fields || [],
          });
        }
      })
      .catch((err) => console.error('[ReelListPage] Failed to load filter options:', err));
  }, []);

  // ── Build API params ────────────────────────────────────────────────────
  const buildApiParams = useCallback(() => {
    const params = { page: pagination.page, limit: pagination.limit };
    if (searchQ.trim()) {
      params.q = searchQ.trim();
      if (searchField && searchField !== 'all') {
        params.search_field = searchField;
      }
    }
    if (dateFrom) params.purchase_date_from = dateFrom;
    if (dateTo) params.purchase_date_to = dateTo;
    if (consumedFrom) params.consumed_date_from = consumedFrom;
    if (consumedTo) params.consumed_date_to = consumedTo;

    const csv = (arr) => (Array.isArray(arr) && arr.length ? arr.join(',') : undefined);

    if (csv(filterValues.supplier)) params.supplier = csv(filterValues.supplier);
    if (csv(filterValues.mill_name)) params.mill_name = csv(filterValues.mill_name);
    if (csv(filterValues.master_code)) params.master_code = csv(filterValues.master_code);
    if (csv(filterValues.paper_quality)) params.quality = csv(filterValues.paper_quality);
    if (csv(filterValues.gsm)) params.gsm = csv(filterValues.gsm);
    if (csv(filterValues.bf)) params.bf = csv(filterValues.bf);
    if (csv(filterValues.width_mm)) params.size = csv(filterValues.width_mm);
    if (csv(filterValues.consumption)) params.consumption = csv(filterValues.consumption);
    if (csv(filterValues.status)) params.status = csv(filterValues.status);
    if (csv(filterValues.station)) params.station = csv(filterValues.station);

    if (searchParams.get('aging')) {
      params.aging_days = searchParams.get('aging');
    }

    // Custom fields
    Object.keys(filterValues).forEach((k) => {
      if (k.startsWith('cf.') && csv(filterValues[k])) {
        params[k] = csv(filterValues[k]);
      }
    });
    return params;
  }, [pagination.page, pagination.limit, filterValues, searchQ, searchField, dateFrom, dateTo, consumedFrom, consumedTo]);

  // ── Fetch reels ────────────────────────────────────────────────────────
  const fetchReels = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = buildApiParams();
    console.log('[ReelListPage] Fetching Reels with API Params:', params);
    try {
      const response = await reelApi.getReels(params);
      const items = response.data || [];
      console.log(`[ReelListPage] Received ${items.length} Reels:`, items);
      setReels(items);
      const meta = response.meta?.pagination || response.meta || {};
      if (meta) {
        console.log('[ReelListPage] Pagination Meta:', meta);
        setPagination((prev) => ({
          ...prev,
          page: meta.page || prev.page,
          limit: meta.limit || prev.limit,
          total: meta.total !== undefined ? meta.total : items.length,
          totalPages: meta.totalPages || 1,
        }));
      }
    } catch (err) {
      console.error('[ReelListPage] Error fetching reels:', err);
      setError(err.message || 'Failed to fetch reels.');
    } finally {
      setLoading(false);
    }
  }, [buildApiParams]);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  // ── Print / PDF report ──────────────────────────────────────────────────
  // The inventory table is paginated, so the report fetches every page that
  // matches the current search/filter state before opening the print dialog.
  const fetchAllReportReels = useCallback(async () => {
    const baseParams = buildApiParams();
    const pageSize = 100;
    const results = [];
    let page = 1;
    let totalPages = null;

    while (page <= (totalPages || 500)) {
      const response = await reelApi.getReels({ ...baseParams, page, limit: pageSize });
      const items = Array.isArray(response?.data) ? response.data : [];
      const meta = response?.meta?.pagination || response?.meta || {};
      if (totalPages === null) {
        const reportedTotalPages = Number(meta.totalPages);
        totalPages = Number.isFinite(reportedTotalPages) && reportedTotalPages > 0
          ? reportedTotalPages
          : null;
      }

      results.push(...items);
      if (items.length === 0) break;
      if (totalPages === null && items.length < pageSize) break;
      page += 1;
    }

    return results;
  }, [buildApiParams]);

  const escapeReportHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // ── Sorting (applies to the table AND the printed report) ───────────────
  const getSortValue = (reel, key) => {
    switch (key) {
      case 'reel': {
        const n = String(reel.reel_no || reel.reel_number || '');
        const num = parseFloat(n.replace(/[^\d.]/g, ''));
        return Number.isFinite(num) ? num : n.toLowerCase();
      }
      case 'specs': return String(reel.quality || reel.paper_quality || '').toLowerCase();
      case 'supplier': return String(reel.supplier_name || reel.supplier || '').toLowerCase();
      case 'mill': return String(reel.mill_name || '').toLowerCase();
      case 'weight': return Number(reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight ?? 0);
      case 'consumed': {
        const cur = Number(reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight ?? 0);
        const init = Number(reel.max_weight ?? reel.initial_weight_kg ?? cur);
        return Math.max(0, init - cur);
      }
      case 'price': return reel.rate_per_kg && Number(reel.rate_per_kg) > 0 ? Number(reel.rate_per_kg) : 0;
      case 'status': return String(reel.status || '').toLowerCase();
      case 'created': {
        const t = new Date(reel.purchase_date || reel.created_at || reel.createdAt).getTime();
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

  // Each click cycles a column: ascending -> descending -> removed.
  // Other columns keep their place, so users can build a multi-level sort.
  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (!existing) return [...prev, { key, dir: 'asc' }];
      if (existing.dir === 'asc') return prev.map((c) => (c.key === key ? { ...c, dir: 'desc' } : c));
      return prev.filter((c) => c.key !== key);
    });
  };

  const sortSummaryText = () => sortConfig
    .map((c, i) => `${i + 1}. ${SORT_LABELS[c.key]} (${c.dir === 'asc' ? 'Asc' : 'Desc'})`)
    .join(', ');

  // Human-readable list of the filters in force, printed on the report.
  const buildFilterSummary = () => {
    const parts = [];
    if (searchQ.trim()) parts.push(`Search: ${searchQ.trim()}`);
    if (dateFrom || dateTo) parts.push(`Date: ${dateFrom || 'Start'} to ${dateTo || 'Today'}`);
    if (searchParams.get('aging')) parts.push(`Unused: ${searchParams.get('aging')}+ days`);
    allFields.forEach((f) => {
      const vals = Array.isArray(filterValues[f.key]) ? filterValues[f.key] : [];
      if (vals.length) parts.push(`${f.label}: ${vals.join(', ')}`);
    });
    return parts;
  };

  const openPrintReport = async () => {
    // Open synchronously from the click event so browsers do not treat the
    // report window as an unsolicited popup after the async API requests.
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('The report window was blocked. Please allow pop-ups and try again.');
      return;
    }

    setReportLoading(true);
    setError(null);
    printWindow.document.write('<p style="font-family:Arial,sans-serif;padding:24px">Preparing reel report...</p>');

    try {
      const reportReels = applySort(await fetchAllReportReels());

      let totalWeight = 0;
      let totalConsumedWeight = 0;
      const rows = reportReels.map((reel, index) => {
        const currentWeight = reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight ?? 0;
        const initialWeight = reel.max_weight ?? reel.initial_weight_kg ?? currentWeight;
        const consumedWeight = Math.max(0, initialWeight - currentWeight);
        totalWeight += Number(currentWeight) || 0;
        totalConsumedWeight += Number(consumedWeight) || 0;
        const itemRate = reel.rate_per_kg && Number(reel.rate_per_kg) > 0 ? Number(reel.rate_per_kg) : 0;
        const createdDate = formatDate(reel.purchase_date || reel.created_at || reel.createdAt);
        const specifications = [
          reel.quality || reel.paper_quality || '',
          reel.gsm ? `${reel.gsm} GSM` : '',
          reel.bf ? formatBfDisplay(reel.bf) : '',
          (reel.size || reel.width_mm) ? `${reel.size || reel.width_mm} cm` : '',
        ].filter(Boolean).join(' | ');

        return `
          <tr>
            <td class="center">${index + 1}</td>
            <td class="nowrap">Reel #${escapeReportHtml(reel.reel_no || reel.reel_number || 'N/A')}</td>
            <td>${escapeReportHtml(specifications || 'N/A')}</td>
            <td>${escapeReportHtml(reel.supplier_name || reel.supplier || 'N/A')}</td>
            <td>${escapeReportHtml(reel.mill_name || '-')}</td>
            <td class="right nowrap">${escapeReportHtml(formatWeight(currentWeight))}</td>
            <td class="right nowrap">${escapeReportHtml(formatWeight(consumedWeight))}</td>
            <td class="right nowrap">${itemRate > 0 ? `Rs ${escapeReportHtml(itemRate.toLocaleString('en-IN'))}/kg` : '-'}</td>
            <td class="center nowrap">${escapeReportHtml(createdDate || 'N/A')}</td>
          </tr>
        `;
      }).join('');

      const filterParts = buildFilterSummary();
      const filterText = filterParts.length
        ? filterParts.map(escapeReportHtml).join(' &nbsp;|&nbsp; ')
        : 'None (all reels)';
      const printedOn = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
      });

      printWindow.document.open();
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Reel Inventory Report</title>
  <style>
    /* Zero page margin removes the browser's own header/footer text
       (date, URL, title). Real margins are created by .report padding and
       the repeating spacer rows below, so every page gets equal space. */
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; }

    .report { width: 100%; padding: 0 14mm; }
    .spacer { height: 12mm; }

    .letterhead { text-align: center; padding-bottom: 8px; border-bottom: 2.5px solid #111827; }
    .company { font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin: 0; }
    .address { font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0; }
    .title { font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #374151; margin: 5px 0 0; }

    .meta { width: 100%; border-collapse: collapse; margin: 10px 0 12px; font-size: 10.5px; }
    .meta td { border: none; padding: 2px 0; vertical-align: top; }
    .meta .label { font-weight: 700; width: 90px; white-space: nowrap; }
    .meta .right { text-align: right; }

    table.data { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px; }
    table.data thead { display: table-header-group; }
    table.data th { background: #e5e7eb; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; font-size: 10px; }
    table.data th, table.data td { border: 1px solid #6b7280; padding: 7px 9px; vertical-align: middle; word-break: break-word; }
    table.data tbody tr { break-inside: avoid; page-break-inside: avoid; }
    table.data tbody tr:nth-child(even) { background: #f9fafb; }
    table.data tfoot td.total { font-weight: 800; background: #e5e7eb; }

    .sign { display: flex; justify-content: space-between; gap: 40px; margin-top: 36px; break-inside: avoid; page-break-inside: avoid; }
    .sign div { flex: 1; border-top: 1px solid #111827; padding-top: 5px; text-align: center; font-size: 10.5px; font-weight: 700; }

    .layout { width: 100%; border-collapse: collapse; }
    .layout > thead > tr > td, .layout > tfoot > tr > td, .layout > tbody > tr > td { border: none; padding: 0; }

    .center { text-align: center; }
    .right { text-align: right; }
    .nowrap { white-space: nowrap; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  <table class="layout">
    <thead><tr><td><div class="spacer"></div></td></tr></thead>
    <tfoot><tr><td><div class="spacer"></div></td></tr></tfoot>
    <tbody><tr><td>
      <div class="report">
        <div class="letterhead">
          <h1 class="company">Rainbow Packaging Ind.</h1>
          <p class="address">Sidcul Haridwar</p>
          <p class="title">Reel Inventory Report</p>
        </div>

        <table class="meta">
          <tr>
            <td class="label">Report Date:</td><td>${escapeReportHtml(printedOn)}</td>
            <td class="label right">Total Reels:</td><td class="right" style="width:90px">${reportReels.length}</td>
          </tr>
          <tr>
            <td class="label">Filters:</td><td>${filterText}</td>
            <td class="label right">Total Net Weight:</td><td class="right">${escapeReportHtml(formatWeight(totalWeight))}</td>
          </tr>
          ${sortConfig.length ? `<tr><td class="label">Sorted By:</td><td colspan="3">${escapeReportHtml(sortSummaryText())}</td></tr>` : ''}
        </table>

        <table class="data">
          <colgroup>
            <col style="width:4%" />
            <col style="width:11%" />
            <col style="width:20%" />
            <col style="width:15%" />
            <col style="width:13%" />
            <col style="width:10%" />
            <col style="width:10%" />
            <col style="width:8%" />
            <col style="width:9%" />
          </colgroup>
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Reel No.</th>
              <th>Specifications</th>
              <th>Supplier</th>
              <th>Mill</th>
              <th>Stock Weight</th>
              <th>Total Consumed</th>
              <th>Price / KG</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="9" class="center">No reels found for the selected filters.</td></tr>'}
          </tbody>
        </table>

        <div class="sign">
          <div>Prepared By</div>
          <div>Checked By</div>
          <div>Approved By</div>
        </div>
      </div>
    </td></tr></tbody>
  </table>
</body>
</html>`);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (err) {
      printWindow.close();
      console.error('[ReelListPage] Failed to generate print report:', err);
      setError(err.message || 'Failed to generate report.');
    } finally {
      setReportLoading(false);
    }
  };

  // ── Excel (.xlsx) / CSV (.csv) Report Export ─────────────────────────────
  const handleExportSpreadsheet = async (format = 'xlsx') => {
    setReportLoading(true);
    setError(null);
    try {
      const reportReels = applySort(await fetchAllReportReels());
      if (!reportReels.length) {
        setError('No reels found to export with the current filters.');
        setReportLoading(false);
        return;
      }

      const rows = reportReels.map((reel, index) => {
        const currentWeight = Number(reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight ?? 0);
        const initialWeight = Number(reel.max_weight ?? reel.initial_weight_kg ?? currentWeight);
        const consumedWeight = Math.max(0, initialWeight - currentWeight);
        const rate = reel.rate_per_kg && Number(reel.rate_per_kg) > 0 ? Number(reel.rate_per_kg) : 0;
        const totalValue = currentWeight * rate;
        const purchaseDate = formatDate(reel.purchase_date || reel.created_at || reel.createdAt);

        return {
          'Sr. No': index + 1,
          'Reel Number': reel.reel_no || reel.reel_number || '',
          'Quality': reel.quality || reel.paper_quality || '',
          'GSM': reel.gsm ?? '',
          'BF': reel.bf ? String(reel.bf) : '',
          'Size (cm)': reel.size || reel.width_mm || '',
          'Master Code': formatMasterCodeBadge(reel.master_code || reel.master_code_id, reel, masterCodeMap),
          'Supplier Name': reel.supplier_name || reel.supplier || '',
          'Mill Name': reel.mill_name || '',
          'Current Stock Weight (kg)': currentWeight,
          'Initial Max Weight (kg)': initialWeight,
          'Consumed Weight (kg)': consumedWeight,
          'Rate / KG (Rs)': rate > 0 ? rate : 0,
          'Total Stock Value (Rs)': totalValue > 0 ? Math.round(totalValue) : 0,
          'Purchase Date': purchaseDate || '',
          'Status': reel.status || 'AVAILABLE',
          'Station': reel.station || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reel Inventory');

      const dateStr = new Date().toISOString().slice(0, 10);
      if (format === 'csv') {
        XLSX.writeFile(workbook, `Rainbow_Reels_Inventory_${dateStr}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(workbook, `Rainbow_Reels_Inventory_${dateStr}.xlsx`, { bookType: 'xlsx' });
      }
    } catch (err) {
      console.error('[ReelListPage] Failed to generate spreadsheet export:', err);
      setError(err.message || 'Failed to export report.');
    } finally {
      setReportLoading(false);
    }
  };

  // ── Field chip toggle (open/close the sub-value panel) ─────────────────
  const toggleFieldOpen = (fieldKey) => {
    setOpenFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  // ── Sub-value toggle ───────────────────────────────────────────────────
  const toggleValue = (fieldKey, value) => {
    console.log(`[ReelListPage] Toggling Filter [${fieldKey}]:`, value);
    setFilterValues((prev) => {
      const current = Array.isArray(prev[fieldKey]) ? prev[fieldKey] : [];
      const exists = current.includes(String(value));
      return {
        ...prev,
        [fieldKey]: exists ? current.filter((v) => v !== String(value)) : [...current, String(value)],
      };
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFieldFilter = (fieldKey) => {
    setFilterValues((prev) => ({ ...prev, [fieldKey]: [] }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetAll = () => {
    setSearchQ('');
    setFilterValues(EMPTY_FILTER_VALUES);
    setOpenFields(new Set(['supplier']));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // ── Option lists ────────────────────────────────────────────────────────
  const getOptionsForField = (fieldKey) => {
    switch (fieldKey) {
      case 'paper_quality': return filterOptions.qualities;
      case 'gsm': return filterOptions.gsms;
      case 'bf': return filterOptions.bfs;
      case 'width_mm': return filterOptions.sizes;
      case 'consumption': return ['Unused / Fresh (0 kg)', 'Partially Consumed (>0 kg)', 'Fully Consumed / Depleted'];
      case 'supplier': return filterOptions.suppliers;
      case 'mill_name': return filterOptions.mill_names;
      case 'master_code': return filterOptions.master_codes;
      case 'status': return filterOptions.statuses;
      case 'station': return filterOptions.stations;
      default:
        if (fieldKey.startsWith('cf.')) {
          const cf = filterOptions.custom_fields.find((c) => c.key === fieldKey.replace('cf.', ''));
          return cf?.options || [];
        }
        return [];
    }
  };

  const allFields = [
    ...BASE_FIELDS,
    ...filterOptions.custom_fields.map((cf) => ({
      key: `cf.${cf.key}`,
      label: `${cf.name} (Custom)`,
      apiKey: `cf.${cf.key}`,
    })),
  ];

  const renderSortIcon = (key) => {
    const idx = sortConfig.findIndex((c) => c.key === key);
    if (idx === -1) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    const Icon = sortConfig[idx].dir === 'asc' ? ChevronUp : ChevronDown;
    return (
      <span className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400">
        <Icon className="w-3.5 h-3.5" />
        {sortConfig.length > 1 && (
          <span className="text-[10px] font-bold leading-none bg-indigo-100 dark:bg-indigo-900/60 rounded-full px-1.5 py-0.5">{idx + 1}</span>
        )}
      </span>
    );
  };

  const canAction = isRoleAdmin || isRoleSupervisor || isRoleOperator;

  const totalActiveCount = Object.values(filterValues)
    .reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (consumedFrom ? 1 : 0) + (consumedTo ? 1 : 0);

  const filteredTotalWeight = reels.reduce((sum, r) => sum + (r.previous_weight ?? r.current_weight_kg ?? r.max_weight ?? 0), 0);
  const filteredTotalConsumed = reels.reduce((sum, r) => {
    const cur = r.previous_weight ?? r.current_weight_kg ?? r.max_weight ?? 0;
    const init = r.max_weight ?? r.initial_weight_kg ?? cur;
    return sum + Math.max(0, init - cur);
  }, 0);
  const filteredTotalPrice = Math.round(
    reels.reduce((sum, r) => {
      const w = r.previous_weight ?? r.current_weight_kg ?? r.max_weight ?? 0;
      const rate = r.rate_per_kg && Number(r.rate_per_kg) > 0 ? Number(r.rate_per_kg) : 0;
      return sum + (w * rate);
    }, 0)
  );
  const filteredAvgPricePerKg = filteredTotalWeight > 0 && filteredTotalPrice > 0 ? Math.round((filteredTotalPrice / filteredTotalWeight) * 100) / 100 : 0;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reel Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Manage paper reels, track weights, record usage, and apply master corrections across database.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Export & Download Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={reportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition cursor-pointer"
              title="Export report in PDF, Excel, or CSV format"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{reportLoading ? 'Preparing Report...' : 'Export Report'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-fade-in">
                <button
                  onClick={() => { setShowExportDropdown(false); openPrintReport(); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/60 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">Print / PDF Report</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Formatted printable report</span>
                  </div>
                </button>
                <button
                  onClick={() => { setShowExportDropdown(false); handleExportSpreadsheet('xlsx'); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/60 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">Download Excel (.xlsx)</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Spreadsheet with full data columns</span>
                  </div>
                </button>
                <button
                  onClick={() => { setShowExportDropdown(false); handleExportSpreadsheet('csv'); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/60 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">Download CSV (.csv)</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Standard comma-separated file</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button onClick={fetchReels}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            title="Refresh list">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canAction && (
            <button onClick={() => navigate('/reels/create')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition">
              <Plus className="w-4 h-4" />
              Create New Reel
            </button>
          )}
        </div>
      </div>

      {/* ── Inventory Live Summary Card ───────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Reels in View</p>
            <p className="text-2xl font-extrabold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              {pagination.total || reels.length}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Stock Weight</p>
            <p className="text-2xl font-extrabold text-indigo-300" style={{ fontFamily: 'var(--font-family-display)' }}>
              {formatWeight(filteredTotalWeight)}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Total Consumed Weight</p>
            <p className="text-2xl font-extrabold text-amber-300" style={{ fontFamily: 'var(--font-family-display)' }}>
              {formatWeight(filteredTotalConsumed)}
            </p>
          </div>
          {(consumedFrom || consumedTo) && (
            <>
              <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
              <div>
                <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  Consumed {consumedFrom === consumedTo ? `on ${consumedFrom}` : `${consumedFrom || 'start'} to ${consumedTo || 'today'}`} ({reels.length} reels{pagination.totalPages > 1 ? ', this page' : ''})
                </p>
                <p className="text-2xl font-extrabold text-emerald-300" style={{ fontFamily: 'var(--font-family-display)' }}>
                  {formatWeight(reels.reduce((s, r) => s + (Number(r.consumed_in_range) || 0), 0))}
                </p>
              </div>
            </>
          )}
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> Total Stock Value
            </p>
            <p className="text-2xl font-extrabold text-emerald-400" style={{ fontFamily: 'var(--font-family-display)' }}>
              {formatCurrency(filteredTotalPrice)}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> Price / KG (Avg)
            </p>
            <p className="text-2xl font-extrabold text-purple-300" style={{ fontFamily: 'var(--font-family-display)' }}>
              ₹{filteredAvgPricePerKg.toFixed(2)}/kg
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative z-20">

        {/* Search Input + Field Selector Dropdown + Reset */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => { setSearchQ(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                placeholder={searchField === 'all' ? 'Search everywhere (reel #, weight, size, quality, supplier, mill...)' : `Search by ${searchField.replace('_', ' ')}...`}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>

            {/* Field selector dropdown on the right side of search bar */}
            <div className="shrink-0 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search Field:</span>
              <select
                value={searchField}
                onChange={(e) => { setSearchField(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer py-0.5"
                title="Select specific field to filter search"
              >
                <option value="all">🔍 All Fields (Everywhere)</option>
                <option value="reel_no">Reel Number</option>
                <option value="master_code">Master Code</option>
                <option value="quality">Paper Quality</option>
                <option value="gsm">GSM</option>
                <option value="bf">Bursting Factor (BF)</option>
                <option value="size">Size / Width (cm)</option>
                <option value="weight">Stock Weight (kg)</option>
                <option value="consumed">Consumed Weight (kg)</option>
                <option value="supplier">Supplier Name</option>
                <option value="mill">Mill Name</option>
                <option value="station">Station Used</option>
                <option value="status">Reel Status</option>
              </select>
            </div>
          </div>

          {(totalActiveCount > 0 || searchQ || dateFrom || dateTo || searchField !== 'all') && (
            <button onClick={() => { handleResetAll(); clearDateFilter(); setConsumedFrom(''); setConsumedTo(''); setSearchField('all'); }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Creation Date Filter Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-indigo-500" /> Filter by Creation Date:
            </span>
            <div className="flex items-center gap-2">
              <CustomDatePicker
                date={dateFrom}
                onChange={(newDate) => { setDateFrom(newDate); setPagination((p) => ({ ...p, page: 1 })); }}
                placeholder="From Date"
                align="left"
                iconColor="text-indigo-500"
              />
              <span className="text-xs text-slate-400">to</span>
              <CustomDatePicker
                date={dateTo}
                onChange={(newDate) => { setDateTo(newDate); setPagination((p) => ({ ...p, page: 1 })); }}
                placeholder="To Date"
                align="left"
                iconColor="text-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={handleTodayFilter} className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition">Today</button>
            <button onClick={handle7DaysFilter} className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition">Last 7 Days</button>
            <button onClick={handleMonthFilter} className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition">This Month</button>
            {(dateFrom || dateTo) && (
              <button onClick={clearDateFilter} className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Clear Date</button>
            )}
          </div>
        </div>

        {/* Consumption Date Filter Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-emerald-500" /> Filter by Consumption Date:
            </span>
            <div className="flex items-center gap-2">
              <CustomDatePicker
                date={consumedFrom}
                onChange={(newDate) => {
                  setConsumedFrom(newDate);
                  if (!consumedTo) setConsumedTo(newDate);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="Consumed From"
                align="left"
                iconColor="text-emerald-500"
              />
              <span className="text-xs text-slate-400">to</span>
              <CustomDatePicker
                date={consumedTo}
                onChange={(newDate) => {
                  setConsumedTo(newDate);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="Consumed To"
                align="left"
                iconColor="text-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => { const t = new Date().toISOString().split('T')[0]; setConsumedFrom(t); setConsumedTo(t); setPagination((p) => ({ ...p, page: 1 })); }} className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition">Today</button>
            {(consumedFrom || consumedTo) && (
              <button onClick={() => { setConsumedFrom(''); setConsumedTo(''); setPagination((p) => ({ ...p, page: 1 })); }} className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Clear Date</button>
            )}
          </div>
        </div>

        {/* Step 1 — Field chips (multi-selectable) */}
        <div className="px-4 pt-3 pb-2 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Select filter fields — click one or more, then pick values below
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {allFields.map((f) => {
              const isOpen = openFields.has(f.key);
              const vals = Array.isArray(filterValues[f.key]) ? filterValues[f.key] : [];
              const hasFilter = vals.length > 0;

              return (
                <button
                  key={f.key}
                  onClick={() => toggleFieldOpen(f.key)}
                  className={`
                    px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5
                    ${isOpen && hasFilter
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow ring-2 ring-indigo-200 dark:ring-indigo-800'
                      : isOpen
                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 shadow ring-1 ring-indigo-200 dark:ring-indigo-800'
                        : hasFilter
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <span>{f.label}</span>
                  {hasFilter && (
                    <span className={`
                      inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full
                      ${isOpen ? 'bg-white/30 text-white' : 'bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100'}
                    `}>
                      {vals.length}
                    </span>
                  )}
                  {isOpen
                    ? <ChevronUp className="w-3 h-3 opacity-60" />
                    : <ChevronDown className="w-3 h-3 opacity-40" />
                  }
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — Sub-value panels (one per open field) */}
        {openFields.size > 0 && (
          <div className="px-4 pb-4 space-y-3 mt-1">
            {allFields
              .filter((f) => openFields.has(f.key))
              .map((f) => {
                const options = getOptionsForField(f.key);
                const selected = Array.isArray(filterValues[f.key]) ? filterValues[f.key] : [];

                return (
                  <div key={f.key}
                    className="p-3 bg-indigo-50/60 dark:bg-slate-900/60 rounded-xl border border-indigo-100 dark:border-slate-700/60 space-y-2">

                    {/* Panel header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                        {f.label}
                        <span className="text-indigo-400 font-normal">
                          ({options.length} in DB{selected.length > 0 ? `, ${selected.length} selected` : ''})
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        {selected.length > 0 && (
                          <button onClick={() => clearFieldFilter(f.key)}
                            className="text-[11px] text-rose-500 hover:underline flex items-center gap-0.5">
                            <X className="w-3 h-3" /> Clear
                          </button>
                        )}
                        <button onClick={() => toggleFieldOpen(f.key)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Value chips */}
                    {options.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* "All" chip */}
                        <button
                          onClick={() => clearFieldFilter(f.key)}
                          className={`
                            px-2.5 py-1 text-xs font-semibold rounded-lg border transition
                            ${selected.length === 0
                              ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}
                          `}
                        >
                          All
                        </button>

                        {options.map((opt) => {
                          const strOpt = String(opt);
                          const isChosen = selected.includes(strOpt);
                          return (
                            <button
                              key={strOpt}
                              onClick={() => toggleValue(f.key, strOpt)}
                              className={`
                                px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5
                                ${isChosen
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-700/60'}
                              `}
                            >
                              {isChosen && <Check className="w-3 h-3 shrink-0" />}
                              <span>{f.key === 'master_code' ? formatMasterCodeBadge(strOpt, null, masterCodeMap) : strOpt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No registered values found in database for this field.
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Active filter tag summary */}
        {(totalActiveCount > 0 || Boolean(searchParams.get('aging'))) && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Filters ({totalActiveCount + (searchParams.get('aging') ? 1 : 0)}):
            </span>
            {searchParams.get('aging') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800">
                <span className="text-amber-600 font-medium">Unused:</span>
                <strong>{searchParams.get('aging')}+ Days</strong>
                <button onClick={() => navigate('/reels')}
                  className="hover:text-amber-900 dark:hover:text-white p-0.5 rounded-full hover:bg-amber-200/50"
                  title="Remove Aging Filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {allFields.map((f) => {
              const vals = Array.isArray(filterValues[f.key]) ? filterValues[f.key] : [];
              if (!vals.length) return null;
              return vals.map((v) => (
                <span key={`${f.key}:${v}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-800">
                  <span className="text-indigo-400 font-medium">{f.label}:</span>
                  <strong>{v}</strong>
                  <button onClick={() => toggleValue(f.key, v)}
                    className="hover:text-indigo-900 dark:hover:text-white p-0.5 rounded-full hover:bg-indigo-200/50">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ));
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} onRetry={fetchReels} />}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {
        loading ? (
          <LoadingState message="Loading reel inventory..." />
        ) : reels.length === 0 ? (
          <EmptyState
            title="No Reels Found"
            message="No paper reels match your current filter criteria or search query."
            actionText={canAction ? 'Create Reel' : null}
            onAction={canAction ? () => navigate('/reels/create') : null}
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {sortConfig.length > 0 && (
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-indigo-50/60 dark:bg-indigo-950/30 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider">Sorted by:</span>
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">{sortSummaryText()}</span>
                <button type="button" onClick={() => setSortConfig([])}
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600 transition">
                  <X className="w-3 h-3" /> Clear sort
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap min-w-[210px]">
                      <button type="button" onClick={() => handleSort('reel')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Click to sort; click more columns to sort by several fields">
                        {SORT_LABELS.reel}
                        {renderSortIcon('reel')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap min-w-[210px]">
                      <button type="button" onClick={() => handleSort('specs')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Click to sort; click more columns to sort by several fields">
                        {SORT_LABELS.specs}
                        {renderSortIcon('specs')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap min-w-[170px]">
                      <button type="button" onClick={() => handleSort('supplier')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Click to sort; click more columns to sort by several fields">
                        {SORT_LABELS.supplier}
                        {renderSortIcon('supplier')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap min-w-[140px]">
                      <button type="button" onClick={() => handleSort('mill')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Click to sort; click more columns to sort by several fields">
                        {SORT_LABELS.mill}
                        {renderSortIcon('mill')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">
                      <button type="button" onClick={() => handleSort('weight')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition justify-end"
                        title="Click to sort by stock weight">
                        {SORT_LABELS.weight}
                        {renderSortIcon('weight')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">
                      <button type="button" onClick={() => handleSort('consumed')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:text-amber-700 transition justify-end"
                        title="Click to sort by total consumed weight">
                        {SORT_LABELS.consumed}
                        {renderSortIcon('consumed')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">
                      <button type="button" onClick={() => handleSort('price')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition justify-end"
                        title="Click to sort; click more columns to sort by several fields">
                        {SORT_LABELS.price}
                        {renderSortIcon('price')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => handleSort('status')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Click to sort; click more columns to sort by several fields">
                        {SORT_LABELS.status}
                        {renderSortIcon('status')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => handleSort('created')}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Click to sort; click more columns to sort by several fields">
                        {SORT_LABELS.created}
                        {renderSortIcon('created')}
                      </button>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-right sticky right-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.18)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                  {applySort(reels).map((reel) => {
                    const reelId = reel.id || reel._id;
                    const isVoided = reel.status === 'VOIDED' || reel.record_status === 'VOIDED';
                    const currentWeight = reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight;
                    const initialWeight = reel.max_weight ?? reel.initial_weight_kg;
                    const consumedWeight = Math.max(0, (initialWeight || 0) - (currentWeight || 0));
                    const consumedPct = initialWeight > 0 ? Math.round((consumedWeight / initialWeight) * 100) : 0;
                    const itemRate = reel.rate_per_kg && Number(reel.rate_per_kg) > 0 ? Number(reel.rate_per_kg) : 0;
                    const itemPrice = Math.round((currentWeight || 0) * itemRate);

                    const statusStr = (reel.status || '').toUpperCase();
                    const rowAccent =
                      statusStr === 'REEL' || statusStr === 'FULL' || statusStr === 'AVAILABLE'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-l-emerald-500 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60'
                        : statusStr === 'CUT' || statusStr === 'IN_USE'
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-l-amber-500 hover:bg-amber-100/90 dark:hover:bg-amber-900/60'
                          : statusStr === 'NILL' || statusStr === 'DEPLETED'
                            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-l-4 border-l-rose-500 hover:bg-rose-100/90 dark:hover:bg-rose-900/60'
                            : 'bg-slate-50 dark:bg-slate-800 border-l-4 border-l-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50';

                    // Solid (non-transparent) version of the row colour for the sticky Actions cell
                    const actionAccent =
                      statusStr === 'REEL' || statusStr === 'FULL' || statusStr === 'AVAILABLE'
                        ? 'bg-emerald-50 dark:bg-emerald-950 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900'
                        : statusStr === 'CUT' || statusStr === 'IN_USE'
                          ? 'bg-amber-50 dark:bg-amber-950 group-hover:bg-amber-100 dark:group-hover:bg-amber-900'
                          : statusStr === 'NILL' || statusStr === 'DEPLETED'
                            ? 'bg-rose-50 dark:bg-rose-950 group-hover:bg-rose-100 dark:group-hover:bg-rose-900'
                            : 'bg-slate-50 dark:bg-slate-800 group-hover:bg-slate-100 dark:group-hover:bg-slate-700';

                    return (
                      <tr key={reelId || reel.sr_no}
                        className={`group ${rowAccent} transition cursor-pointer`}
                        onClick={() => navigate(`/reels/${reelId}`)}>

                        <td className="align-middle px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Reel #{reel.reel_no || reel.reel_number}</span>
                          </div>
                          {(reel.master_code_name || reel.master_code) && (
                            <div className="mt-1">
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] rounded-md tracking-wider border border-indigo-200 dark:border-indigo-800">
                                {formatMasterCodeBadge(reel.master_code, reel, masterCodeMap)}
                              </span>
                            </div>
                          )}
                          {(reel.pending_count > 0 || reel.approval_status === 'PENDING') && (
                            <div className="mt-1">
                              <span className="inline-flex items-start gap-1 px-2 py-0.5 max-w-[190px] leading-snug bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-semibold text-[10px] rounded-md border border-amber-300 dark:border-amber-700">
                                <Clock className="w-3 h-3 mt-px text-amber-600 animate-pulse shrink-0" />
                                <span>Not approved by Admin<br />(Since {formatDate(reel.created_at || reel.purchase_date)})</span>
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="align-middle px-4 py-3.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {reel.quality || reel.paper_quality}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {reel.gsm} GSM • {formatBfDisplay(reel.bf)} • {reel.size || reel.width_mm} cm
                          </div>
                        </td>

                        <td className="align-middle px-4 py-3.5">
                          <div className="text-slate-800 dark:text-slate-200 break-words font-medium">
                            {reel.supplier_name || reel.supplier || 'N/A'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            SRNO: #{reel.sr_no}
                          </div>
                        </td>

                        <td className="align-middle px-4 py-3.5">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {reel.mill_name || '-'}
                          </div>
                        </td>

                        <td className="align-middle px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {formatWeight(currentWeight)}
                          </div>
                          <div className="text-xs text-slate-400">
                            Orig: {formatWeight(initialWeight)}
                          </div>
                        </td>

                        <td className="align-middle px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                          <div className="font-extrabold text-amber-600 dark:text-amber-400">
                            {formatWeight(consumedWeight)}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400">
                            {consumedPct > 0 ? `${consumedPct}% used` : 'Unused (0%)'}
                          </div>
                          {reel.consumed_in_range !== undefined && (
                            <div className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {formatWeight(reel.consumed_in_range)} in selected dates
                            </div>
                          )}
                        </td>

                        <td className="align-middle px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                          <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {reel.rate_per_kg > 0 ? `₹${reel.rate_per_kg}/kg` : '-'}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            {itemPrice > 0 ? `Total: ${formatCurrency(itemPrice)}` : 'Total: -'}
                          </div>
                        </td>

                        <td className="align-middle px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(reel.status)}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
                              {reel.status}
                            </span>
                            {(reel.pending_count > 0 || reel.approval_status === 'PENDING') && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                Pending Inward
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="align-middle px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(reel.purchase_date || reel.created_at || reel.createdAt)}
                        </td>

                        <td className={`align-middle px-4 py-3.5 text-right whitespace-nowrap sticky right-0 z-10 transition shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.18)] ${actionAccent}`} onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => navigate(`/reels/${reelId}`)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="View Reel Details">
                              <Eye className="w-4 h-4" />
                            </button>

                            {!isVoided && canAction && reel.status !== 'NILL' && reel.status !== 'DEPLETED' && (
                              (reel.pending_count > 0 || reel.approval_status === 'PENDING') ? (
                                <button
                                  disabled
                                  className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed rounded"
                                  title={`Locked: Not approved by Admin (Since ${formatDate(reel.created_at || reel.purchase_date)})`}
                                >
                                  <Scale className="w-4 h-4" />
                                </button>
                              ) : (
                                <button onClick={() => setUsageReel(reel)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                  title="Record Weight Usage">
                                  <Scale className="w-4 h-4" />
                                </button>
                              )
                            )}

                            {/* Request Correction / Message */}
                            {!isVoided && (
                              <button onClick={() => setMessageReel(reel)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                title="Send Message / Request Correction for this Reel">
                                <Wrench className="w-4 h-4" />
                              </button>
                            )}

                            {(isRoleAdmin || isRoleSupervisor) && !isVoided && (
                              <button onClick={() => setCorrectionReel(reel)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                title="Edit Reel Details / Master Override">
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {isRoleAdmin && !isVoided && (
                              <button onClick={() => setVoidReel(reel)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                title="Void Reel">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
            />
          </div>
        )
      }

      {/* Modals */}
      {
        showCreateModal && (
          <CreateReelModal isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { setShowCreateModal(false); fetchReels(); }} />
        )
      }
      {
        usageReel && (
          <RecordUsageModal isOpen={Boolean(usageReel)} reel={usageReel}
            onClose={() => setUsageReel(null)}
            onSuccess={() => { setUsageReel(null); fetchReels(); }} />
        )
      }
      {
        correctionReel && (
          <MasterCorrectionModal isOpen={Boolean(correctionReel)} reel={correctionReel}
            onClose={() => setCorrectionReel(null)}
            onSuccess={() => { setCorrectionReel(null); fetchReels(); }} />
        )
      }
      {
        messageReel && (
          <ComposeMessageModal isOpen={Boolean(messageReel)}
            initialReel={messageReel}
            initialMode="CORRECTION"
            onClose={() => setMessageReel(null)}
            onSuccess={() => { setMessageReel(null); fetchReels(); }} />
        )
      }
      {
        voidReel && (
          <VoidReelModal isOpen={Boolean(voidReel)} reel={voidReel}
            onClose={() => setVoidReel(null)}
            onSuccess={() => { setVoidReel(null); fetchReels(); }} />
        )
      }
    </div >
  );
}