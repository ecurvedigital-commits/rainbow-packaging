import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, FileSpreadsheet, RefreshCw, Scale, ArrowDownRight, Package, Send,
  CheckCircle2, Clock, Mail, AlertTriangle, Activity, Maximize2, X, Search,
  ChevronLeft, ChevronRight, ChevronDown, Check, Layers, Sparkles, Download,
  FileText, Plus, Trash2, Edit3, ShieldCheck
} from 'lucide-react';
import ReelMark from '../../components/ReelMark';
import { digestApi } from '../../api/digestApi';
import { settingsApi } from '../../api/settingsApi';
import { useAuth } from '../../auth/AuthContext';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import CustomDatePicker from '../../components/Common/CustomDatePicker';
import { formatWeight, formatDate } from '../../utils/formatters';

export default function DailyDigestPage() {
  const navigate = useNavigate();
  const { isRoleAdmin } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [digestData, setDigestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sending, setSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showDepletedList, setShowDepletedList] = useState(false);
  const [depletedSearch, setDepletedSearch] = useState('');

  const exportDropdownRef = useRef(null);

  const fetchDigest = async (fDate = fromDate, tDate = toDate) => {
    setLoading(true);
    setError(null);
    setSendSuccessMessage(null);
    try {
      const response = await digestApi.getDailyDigest({ fromDate: fDate, toDate: tDate });
      setDigestData(response.data || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch daily digest report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest(fromDate, toDate);
  }, [fromDate, toDate]);

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

  const displayDateStr = fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`;
  const displayFormattedDate = fromDate === toDate ? formatDate(fromDate) : `${formatDate(fromDate)} – ${formatDate(toDate)}`;

  const allUsageEntries = Object.values(digestData?.quality_details || {}).flatMap((q) => q.entries || []);
  const depletedReelEntries = allUsageEntries.filter((log) => log.is_depleted || log.current_weight === 0);

  const filteredDepletedEntries = depletedReelEntries.filter((log) => {
    if (!depletedSearch.trim()) return true;
    const s = depletedSearch.toLowerCase();
    return (
      (log.reel_no || '').toLowerCase().includes(s) ||
      (log.master_code || '').toLowerCase().includes(s) ||
      (log.supplier_name || '').toLowerCase().includes(s) ||
      (log.station || '').toLowerCase().includes(s) ||
      (log.performed_by || '').toLowerCase().includes(s)
    );
  });

  const handleSendDigest = async () => {
    if (!window.confirm(`Trigger daily email digest send for ${displayDateStr}?`)) return;
    setSending(true);
    setSendSuccessMessage(null);
    setError(null);
    try {
      await digestApi.sendDigest(fromDate);
      setSendSuccessMessage(`Daily digest successfully dispatched to administrator recipients!`);
    } catch (err) {
      setError(err.message || 'Failed to send daily digest email.');
    } finally {
      setSending(false);
    }
  };

  // ── Excel Export ────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!digestData) return;
    const filename = `Rainbow_Daily_Digest_${displayDateStr.replace(/\s+/g, '_')}.xls`;

    const breakdownRows = Object.entries(digestData.quality_breakdown || {}).map(([quality, weight]) => `
      <tr>
        <td style="padding:6px;border:1px solid #cbd5e1;font-weight:bold;">${quality}</td>
        <td style="padding:6px;border:1px solid #cbd5e1;text-align:right;font-weight:bold;">${weight} kg</td>
      </tr>
    `).join('');

    const detailLogs = Object.values(digestData.quality_details || {}).flatMap((q) => q.entries || []);
    const detailRows = detailLogs.map((log) => `
      <tr>
        <td style="padding:6px;border:1px solid #cbd5e1;font-weight:bold;">#${log.reel_no}</td>
        <td style="padding:6px;border:1px solid #cbd5e1;">${log.master_code}</td>
        <td style="padding:6px;border:1px solid #cbd5e1;">${log.supplier_name}</td>
        <td style="padding:6px;border:1px solid #cbd5e1;">${log.station}</td>
        <td style="padding:6px;border:1px solid #cbd5e1;text-align:right;font-weight:bold;">${log.weight_used} kg</td>
        <td style="padding:6px;border:1px solid #cbd5e1;">${log.performed_by}</td>
      </tr>
    `).join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; }
          .header { background-color: #0F172A; color: #FFFFFF; font-size: 16px; font-weight: bold; padding: 10px; }
          .section-title { font-size: 14px; font-weight: bold; color: #4F46E5; margin-top: 15px; margin-bottom: 5px; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #E2E8F0; font-weight: bold; border: 1px solid #CBD5E1; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <div class="header">RAINBOW PACKAGES - INVENTORY & USAGE DIGEST REPORT</div>
        <p><b>Report Period:</b> ${displayFormattedDate} | <b>Export Timestamp:</b> ${new Date().toLocaleString()}</p>

        <div class="section-title">1. KEY PERFORMANCE INDICATORS</div>
        <table>
          <tr><th>Total Paper Consumed (kg)</th><th>New Reels Created</th><th>Fully Depleted Reels</th><th>Usage Logs</th><th>Confirmed</th><th>Declined</th><th>Pending Review</th></tr>
          <tr>
            <td style="font-weight:bold;color:#4F46E5;">${digestData.total_weight_consumed_kg || 0} kg</td>
            <td>${digestData.reels_created_count || 0}</td>
            <td>${digestData.reels_depleted_count || 0}</td>
            <td>${digestData.counts?.usage || 0}</td>
            <td>${digestData.counts?.confirmed || 0}</td>
            <td>${digestData.counts?.declined || 0}</td>
            <td>${digestData.counts?.still_pending || 0}</td>
          </tr>
        </table>

        <div class="section-title">2. CONSUMPTION BREAKDOWN BY QUALITY</div>
        <table>
          <thead><tr><th>Quality Grade / Specification</th><th style="text-align:right;">Total Consumed Weight</th></tr></thead>
          <tbody>${breakdownRows || '<tr><td colspan="2">No usage logged for this period.</td></tr>'}</tbody>
        </table>

        <div class="section-title">3. DETAILED LOGGED REEL USAGE ITEMS</div>
        <table>
          <thead><tr><th>Reel #</th><th>Master Code</th><th>Supplier</th><th>Station</th><th style="text-align:right;">Used Weight</th><th>Operator</th></tr></thead>
          <tbody>${detailRows || '<tr><td colspan="6">No detailed usage entries recorded.</td></tr>'}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── PDF Export ──────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!digestData) return;
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const breakdownRows = Object.entries(digestData.quality_breakdown || {}).map(([quality, weight]) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold;">${quality}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;color:#4f46e5;">${formatWeight(weight)}</td>
      </tr>
    `).join('');

    const detailLogs = Object.values(digestData.quality_details || {}).flatMap((q) => q.entries || []);
    const detailRows = detailLogs.map((log) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:bold;">#${log.reel_no}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-family:monospace;color:#4f46e5;">${log.master_code}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${log.supplier_name}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${log.station}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;color:#4f46e5;">${formatWeight(log.weight_used)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;">${log.performed_by}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rainbow Packages - Inventory Digest (${displayDateStr})</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 24px; line-height: 1.4; }
          .brand-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .date-badge { background: #4f46e5; color: white; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .kpi-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-value { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 24px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
          th { background: #f1f5f9; padding: 10px; font-weight: 700; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="brand-header">
          <div>
            <div class="title">Rainbow Packages</div>
            <div class="subtitle">Inventory & Paper Usage Digest Report</div>
          </div>
          <div class="date-badge">${displayFormattedDate}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Consumed Paper</div>
            <div class="kpi-value" style="color:#4f46e5;">${formatWeight(digestData.total_weight_consumed_kg || 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">New Reels Created</div>
            <div class="kpi-value">${digestData.reels_created_count || 0}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Fully Depleted Reels</div>
            <div class="kpi-value">${digestData.reels_depleted_count || 0}</div>
          </div>
        </div>

        <div class="section-title">Consumption Breakdown by Paper Quality</div>
        <table>
          <thead><tr><th>Quality Specification</th><th style="text-align:right;">Total Weight Consumed</th></tr></thead>
          <tbody>${breakdownRows || '<tr><td colspan="2">No usage logged for this period.</td></tr>'}</tbody>
        </table>

        <div class="section-title">Individual Reel Usage Logged Entries</div>
        <table>
          <thead><tr><th>Reel #</th><th>Master Code</th><th>Supplier</th><th>Station</th><th style="text-align:right;">Used Weight</th><th>Operator</th></tr></thead>
          <tbody>${detailRows || '<tr><td colspan="6">No detailed usage entries recorded.</td></tr>'}</tbody>
        </table>

        <div class="footer">
          Generated automatically by Rainbow Packages Inventory Management • ${new Date().toLocaleString()}
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Inventory & Usage Digest
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Summary report of total paper consumption, newly added stock, and depleted reels across selected date range.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* From Date Picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">From:</span>
            <CustomDatePicker
              date={fromDate}
              onChange={(newDate) => setFromDate(newDate)}
              align="left"
            />
          </div>

          {/* To Date Picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">To:</span>
            <CustomDatePicker
              date={toDate}
              onChange={(newDate) => setToDate(newDate)}
              align="right"
            />
          </div>

          <button
            onClick={() => fetchDigest(fromDate, toDate)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 transition shadow-sm"
            title="Refresh Report"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export & Download Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-fade-in">
                <button
                  onClick={() => { handleExportExcel(); setShowExportDropdown(false); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/60 rounded-xl flex items-center gap-2.5 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-bold">Download Excel / XLS</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Spreadsheet with full data tables</span>
                  </div>
                </button>
                <button
                  onClick={() => { handleExportPDF(); setShowExportDropdown(false); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/60 rounded-xl flex items-center gap-2.5 transition"
                >
                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <span className="block font-bold">Export Printable PDF</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Formatted print PDF report</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSendDigest}
            disabled={sending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Digest Now'}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={() => fetchDigest(fromDate, toDate)} />}

      {/* Success banner */}
      {sendSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{sendSuccessMessage}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState message="Calculating inventory digest breakdown..." />
      ) : !digestData ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400">No digest data available for {displayFormattedDate}.</p>
        </div>
      ) : (
        <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Consumption */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Paper Used Today</span>
                    <Scale className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                    {formatWeight(digestData.total_weight_consumed_kg || 0)}
                  </div>
                  <p className="text-xs text-slate-400">Recorded across active production shifts</p>
                </div>

                {/* Reels Issued */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">New Reels Created</span>
                    <Package className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                    {digestData.reels_created_count || 0}
                  </div>
                  <p className="text-xs text-slate-400">Reels checked into warehouse</p>
                </div>

                {/* Depleted Reels (Interactive Toggle Button) */}
                <div
                  onClick={() => setShowDepletedList((prev) => !prev)}
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-all cursor-pointer shadow-sm relative overflow-hidden group ${showDepletedList
                    ? 'border-rose-500 ring-2 ring-rose-500/20 dark:ring-rose-500/30 bg-rose-50/20 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-600 hover:shadow-md'
                    }`}
                  title="Click to view list of fully depleted reels"
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Fully Depleted Reels</span>
                    <span className={`p-1.5 rounded-xl transition ${showDepletedList ? 'bg-rose-500 text-white' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'}`}>
                      <ArrowDownRight className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2" style={{ fontFamily: 'var(--font-family-display)' }}>
                    {digestData.reels_depleted_count || 0}
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-400">Reels consumed down to 0 kg</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 group-hover:underline">
                      {showDepletedList ? 'Hide List ▲' : 'View Reel List ▼'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fully Depleted Reels List Section */}
              {showDepletedList && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-rose-200 dark:border-rose-900/60 shadow-lg space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                        <ArrowDownRight className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          Fully Depleted Reels ({depletedReelEntries.length})
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Reels fully consumed down to 0 kg balance during {displayFormattedDate}.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={depletedSearch}
                          onChange={(e) => setDepletedSearch(e.target.value)}
                          placeholder="Search depleted reels..."
                          className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => setShowDepletedList(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                        title="Close list"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {filteredDepletedEntries.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      {depletedReelEntries.length === 0
                        ? `No reels were fully depleted during ${displayFormattedDate}.`
                        : 'No depleted reels match your search query.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-4 py-3">Reel #</th>
                            <th className="px-4 py-3">Master Code</th>
                            {/* <th className="px-4 py-3">Supplier</th> */}
                            <th className="px-4 py-3">Station</th>
                            <th className="px-4 py-3 text-right">Final Weight Used</th>
                            <th className="px-4 py-3">Operator</th>
                            <th className="px-4 py-3">Logged At</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                          {filteredDepletedEntries.map((log) => (
                            <tr
                              key={log.id}
                              onClick={() => log.reel_id && navigate(`/reels/${log.reel_id}`)}
                              className="hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            >
                              <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                                Reel #{log.reel_no}
                              </td>
                              <td className="px-4 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                {log.master_code}
                              </td>
                              {/* <td className="px-4 py-3 font-medium">{log.supplier_name}</td> */}
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                                  {log.station}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                                {formatWeight(log.weight_used)}
                              </td>
                              <td className="px-4 py-3 font-medium">{log.performed_by}</td>
                              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                {formatDate(log.performed_at)}
                              </td>
                              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                {log.reel_id && (
                                  <button
                                    onClick={() => navigate(`/reels/${log.reel_id}`)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
                                  >
                                    View Reel
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Breakdown by Paper Quality - CLICKABLE TO OPEN FULL PAGE */}
                <div
                  onClick={() => navigate(`/digest/breakdown?fromDate=${fromDate}&toDate=${toDate}`)}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer space-y-4 group relative overflow-hidden"
                  title="Click to open full breakdown page"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      Consumption Breakdown by Quality
                    </h3>
                    <span className="px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition flex items-center gap-1.5 shadow-xs">
                      <Maximize2 className="w-3.5 h-3.5" /> Open Full Page
                    </span>
                  </div>

                  {digestData.quality_breakdown && Object.keys(digestData.quality_breakdown).length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {Object.entries(digestData.quality_breakdown).map(([quality, weight]) => (
                        <div key={quality} className="py-3 flex items-center justify-between group-hover:px-1 transition-all">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                            {quality}
                          </span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                            {formatWeight(weight)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic py-4">No paper usage recorded on this date.</p>
                  )}
                </div>

                {/* Operational Event Counts */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Shift Activity Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-500 uppercase block font-semibold mb-1">Usage Logs</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                        {digestData.counts?.usage || 0}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-500 uppercase block font-semibold mb-1">Confirmed</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {digestData.counts?.confirmed || 0}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-500 uppercase block font-semibold mb-1">Declined</span>
                      <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {digestData.counts?.declined || 0}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-500 uppercase block font-semibold mb-1">Pending Review</span>
                      <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {digestData.counts?.still_pending || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipient Distribution List */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-500" />
                    Digest Email Recipients
                  </h3>
                  {isRoleAdmin && (
                    <button
                      onClick={() => setShowRecipientsModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Recipients
                    </button>
                  )}
                </div>

                {digestData.recipients && digestData.recipients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {digestData.recipients.map((email) => (
                      <span
                        key={email}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5"
                      >
                        <Mail className="w-3 h-3 opacity-60" />
                        {email}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No recipient email addresses configured.</p>
                )}
              </div>
            </div>
          )}

      {/* Admin Recipient Email Editor Modal */}
      {isRoleAdmin && (
        <EditRecipientsModal
          isOpen={showRecipientsModal}
          onClose={() => setShowRecipientsModal(false)}
          currentRecipients={digestData?.recipients || []}
          onSaved={() => fetchDigest(fromDate, toDate)}
        />
      )}
    </div>
  );
}



/**
 * Admin Recipient Emails Editor Modal Component
 */
function EditRecipientsModal({ isOpen, onClose, currentRecipients = [], onSaved }) {
  const [emails, setEmails] = useState(currentRecipients);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmails(currentRecipients);
  }, [currentRecipients, isOpen]);

  if (!isOpen) return null;

  const handleAddEmail = (e) => {
    e.preventDefault();
    setError('');
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (emails.includes(trimmed)) {
      setError('Email address is already in the recipient list.');
      return;
    }
    setEmails([...emails, trimmed]);
    setNewEmail('');
  };

  const handleRemoveEmail = (targetEmail) => {
    setEmails(emails.filter((e) => e !== targetEmail));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await settingsApi.updateSettings({
        digest: {
          recipients: emails,
        },
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update recipient email settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-family-display)' }}>
                Edit Digest Email Recipients
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage destination recipient emails for automated daily reports.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Email Form */}
          <form onSubmit={handleAddEmail} className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Add new email address (e.g. manager@factory.com)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>

          {/* Email Pills List */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Recipient List ({emails.length}):</p>
            {emails.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No custom email addresses added yet. Default admin emails will be used.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      {email}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      title="Remove email"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Recipients'}
          </button>
        </div>
      </div>
    </div>
  );
}


