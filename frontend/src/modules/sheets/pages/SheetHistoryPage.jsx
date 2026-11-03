import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  X,
  Layers,
  Scissors,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import SheetHistoryTable from '../components/SheetHistoryTable';
import Pagination from '../../../components/Common/Pagination';

export default function SheetHistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSrNo = searchParams.get('sr_no') || '';
  const initialType = searchParams.get('event_type') || '';

  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState(initialType);
  const [selectedParty, setSelectedParty] = useState('');
  const [lotSrNo, setLotSrNo] = useState(initialSrNo);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [filterOptions, setFilterOptions] = useState(null);

  useEffect(() => {
    sheetApi.getFilterOptions().then((res) => {
      if (res.success && res.data) {
        setFilterOptions(res.data);
      }
    });
  }, []);

  const loadHistory = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {
      page,
      limit,
    };
    if (search.trim()) params.q = search.trim();
    if (eventType) params.event_type = eventType;
    if (selectedParty) params.party_name = selectedParty;
    if (lotSrNo) params.sr_no = lotSrNo;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    sheetApi
      .getHistory(params)
      .then((res) => {
        if (res.success) {
          setTransactions(res.data || []);
          setMeta(res.meta);
        }
      })
      .catch((err) => {
        setError(err?.message || 'Failed to fetch transaction history');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, limit, search, eventType, selectedParty, lotSrNo, startDate, endDate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleResetFilters = () => {
    setSearch('');
    setEventType('');
    setSelectedParty('');
    setLotSrNo('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    search || eventType || selectedParty || lotSrNo || startDate || endDate
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Sheet Stock Movement History
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Audit Ledger
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Immutable log of all board stock events: Inward, Cutting, Return, and Adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/sheets/inward"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Inward Stock</span>
          </Link>
          <Link
            to="/sheets/cut"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Scissors size={15} />
            <span>Cut Stock</span>
          </Link>
          <Link
            to="/sheets/inventory"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-xs"
          >
            <Layers size={15} />
            <span>Inventory</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by party, job, user, station..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
            />
          </div>

          {/* Event Type Filter */}
          <div>
            <select
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-indigo-600"
            >
              <option value="">All Movement Types</option>
              <option value="CREATED">Inward (Created)</option>
              <option value="CONSUMED">Cut / Outward (Consumed)</option>
              <option value="RETURNED">Return (Returned)</option>
              <option value="ADJUSTED">Adjustment (Count)</option>
              <option value="VOIDED">Voided (Cancelled)</option>
            </select>
          </div>

          {/* Party Filter */}
          <div>
            <select
              value={selectedParty}
              onChange={(e) => {
                setSelectedParty(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-indigo-600"
            >
              <option value="">All Parties</option>
              {filterOptions?.parties?.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Lot Sr # Filter */}
          <div>
            <input
              type="number"
              value={lotSrNo}
              onChange={(e) => {
                setLotSrNo(e.target.value);
                setPage(1);
              }}
              placeholder="Lot Sr # (e.g. 1)"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-800 outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Date Range and Refresh Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-semibold uppercase">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
            />
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
              >
                <X size={13} />
                <span>Reset Filters</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadHistory}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Ledger Table */}
      <SheetHistoryTable transactions={transactions} loading={loading} />

      {/* Pagination */}
      {meta && (
        <Pagination
          meta={meta}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

