import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, Filter, Layers, X } from 'lucide-react';
import { sheetApi } from '../api/sheetApi';

export default function SheetStockSelector({ selectedLot, onSelectLot }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [filterOptions, setFilterOptions] = useState(null);

  useEffect(() => {
    sheetApi.getFilterOptions().then((res) => {
      if (res.success) setFilterOptions(res.data);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const params = {
      limit: 50,
      record_status: 'ACTIVE',
    };
    if (search.trim()) params.q = search.trim();
    if (filterParty) params.party_name = filterParty;
    if (filterQuality) params.quality = filterQuality;

    sheetApi
      .list(params)
      .then((res) => {
        if (isMounted && res.success) {
          // Filter out lots that have 0 current_quantity or are VOIDED
          const available = (res.data || []).filter(
            (l) => l.current_quantity > 0 && l.status !== 'VOIDED' && l.status !== 'DEPLETED'
          );
          setLots(available);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || 'Failed to load stock lots');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, filterParty, filterQuality]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Step 1: Select Stock Lot for Cutting</h3>
          <p className="text-xs text-gray-500">
            Choose an active stock lot with available balance to issue for press run
          </p>
        </div>

        {selectedLot && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Selected: Lot #{selectedLot.sr_no} ({selectedLot.party_name})
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party, job, dimensions, or serial #..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
          />
        </div>

        <select
          value={filterParty}
          onChange={(e) => setFilterParty(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-emerald-600"
        >
          <option value="">All Parties</option>
          {filterOptions?.parties?.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filterQuality}
          onChange={(e) => setFilterQuality(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-emerald-600"
        >
          <option value="">All Qualities</option>
          {filterOptions?.qualities?.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>

        {(search || filterParty || filterQuality) && (
          <button
            onClick={() => {
              setSearch('');
              setFilterParty('');
              setFilterQuality('');
            }}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 w-10 text-center">Select</th>
              <th className="px-3 py-2">Sr #</th>
              <th className="px-3 py-2">Party Name</th>
              <th className="px-3 py-2">Job Name</th>
              <th className="px-3 py-2">Quality</th>
              <th className="px-3 py-2">Deckle × Cut</th>
              <th className="px-3 py-2">GSM</th>
              <th className="px-3 py-2 text-right">Available Qty</th>
              <th className="px-3 py-2 text-right">Weight (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
            {loading ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-gray-400">
                  Loading available lots...
                </td>
              </tr>
            ) : lots.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-gray-400">
                  No stock lots with available balance found.
                </td>
              </tr>
            ) : (
              lots.map((lot) => {
                const isSelected = selectedLot?.id === lot.id;
                return (
                  <tr
                    key={lot.id}
                    onClick={() => onSelectLot(lot)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/90 text-emerald-950 font-bold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => onSelectLot(lot)}
                        className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono font-bold">#{lot.sr_no}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{lot.party_name}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">
                      {lot.job_name || '-'}
                    </td>
                    <td className="px-3 py-2">{lot.quality}</td>
                    <td className="px-3 py-2 font-mono">{lot.deckle} × {lot.cutting} cm</td>
                    <td className="px-3 py-2 font-mono">{lot.gsm}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-teal-800">
                      {lot.current_quantity.toLocaleString()} pcs
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800">
                      {lot.current_weight.toLocaleString()} kg
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

