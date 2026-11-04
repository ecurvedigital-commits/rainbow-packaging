import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle2, X, ArrowRight, Layers, Sparkles } from 'lucide-react';
import { sheetApi } from '../api/sheetApi';

export default function SheetStockSelector({ selectedLot, onSelectLot }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('all');
  const searchInputRef = useRef(null);

  // Perform search whenever search or searchField changes
  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setLots([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const params = {
      limit: 20,
      record_status: 'ACTIVE',
    };

    if (searchField === 'deckle') {
      params.search_field = 'deckle';
      params.q = trimmed;
    } else if (searchField === 'cutting') {
      params.search_field = 'cutting';
      params.q = trimmed;
    } else if (searchField === 'dimensions') {
      const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*[*xX/×,]\s*(\d+(?:\.\d+)?)$/);
      if (match) {
        params.deckle = match[1];
        params.cutting = match[2];
      } else {
        params.q = trimmed;
      }
    } else if (searchField !== 'all') {
      params.search_field = searchField;
      params.q = trimmed;
    } else {
      // "all" - also detect if user typed dimension format like "70x100"
      const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*[*xX/×,]\s*(\d+(?:\.\d+)?)$/);
      if (match) {
        params.deckle = match[1];
        params.cutting = match[2];
      } else {
        params.q = trimmed;
      }
    }

    sheetApi
      .list(params)
      .then((res) => {
        if (isMounted && res.success) {
          // Filter out lots that have 0 current_quantity or are VOIDED / DEPLETED
          let available = (res.data || []).filter(
            (l) => l.current_quantity > 0 && l.status !== 'VOIDED' && l.status !== 'DEPLETED'
          );

          // Client-side exact refinement if specific deckle or cutting was searched as number
          if (searchField === 'deckle') {
            const num = parseFloat(trimmed);
            if (!isNaN(num)) {
              available = available.filter((l) => Math.abs(l.deckle - num) < 0.01);
            }
          } else if (searchField === 'cutting') {
            const num = parseFloat(trimmed);
            if (!isNaN(num)) {
              available = available.filter((l) => Math.abs(l.cutting - num) < 0.01);
            }
          } else if (searchField === 'dimensions') {
            const m = trimmed.match(/^(\d+(?:\.\d+)?)\s*[*xX/×,]\s*(\d+(?:\.\d+)?)$/);
            if (m) {
              const d = parseFloat(m[1]);
              const c = parseFloat(m[2]);
              available = available.filter(
                (l) => Math.abs(l.deckle - d) < 0.01 && Math.abs(l.cutting - c) < 0.01
              );
            }
          }

          setLots(available);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || 'Failed to search stock lots');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, searchField]);

  const handleKeyDown = (e) => {
    // If user presses Enter and there are matching lots, auto-select the first match
    if (e.key === 'Enter' && lots.length > 0) {
      e.preventDefault();
      onSelectLot(lots[0]);
    }
  };

  const getPlaceholderText = () => {
    switch (searchField) {
      case 'deckle':
        return 'Type deckle size in cm (e.g. 70, 72.5)...';
      case 'cutting':
        return 'Type cutting size in cm (e.g. 100, 102.5)...';
      case 'dimensions':
        return 'Type size: deckle × cutting (e.g. 70 × 100 or 70x100)...';
      case 'party_name':
        return 'Type party / client name...';
      case 'job_name':
        return 'Type job name...';
      case 'gsm':
        return 'Type GSM (e.g. 250, 300)...';
      case 'sr_no':
        return 'Type stock lot serial number (e.g. 12)...';
      default:
        return 'Search deckle, cutting size (e.g. 70x100), party, job, or lot #...';
    }
  };

  // If a stock lot is already selected, display the compact selected lot card
  if (selectedLot) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex flex-col items-center justify-center font-mono shrink-0 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-100">Lot</span>
              <span className="text-sm font-black leading-none">#{selectedLot.sr_no}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold uppercase rounded-full">
                  <CheckCircle2 size={11} /> Selected for Cutting
                </span>
                <h4 className="font-extrabold text-gray-900 text-sm truncate">
                  {selectedLot.party_name}
                </h4>
                {selectedLot.job_name && (
                  <span className="text-xs text-gray-500 font-medium">({selectedLot.job_name})</span>
                )}
              </div>

              <p className="text-xs text-gray-700 font-mono mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900">{selectedLot.deckle} × {selectedLot.cutting} cm</span>
                <span className="text-gray-300">•</span>
                <span>{selectedLot.gsm} GSM</span>
                <span className="text-gray-300">•</span>
                <span className="font-semibold text-emerald-800">{selectedLot.quality}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-200/60">
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-gray-500 block tracking-wider">
                Store Balance
              </span>
              <p className="font-mono font-black text-emerald-900 text-sm sm:text-base">
                {selectedLot.current_quantity.toLocaleString()} pcs{' '}
                <span className="text-xs font-bold text-emerald-700">({selectedLot.current_weight.toLocaleString()} kg)</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectLot(null)}
              className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 text-xs font-bold rounded-xl border border-emerald-300 shadow-2xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Search and select another stock lot"
            >
              <Search size={13} />
              <span>Change Lot</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // When no lot is selected: Show Search Bar
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">Step 1: Search Stock Lot for Cutting</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Type deckle, cutting size (e.g. 70x100), party name, or lot # to open the consumption sheet
        </p>
      </div>

      {/* Main Search Bar with Integrated Option Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:bg-white focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all overflow-hidden shadow-2xs">
        <div className="relative flex-1 flex items-center min-w-0">
          <Search size={16} className="absolute left-3.5 text-gray-400 shrink-0 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholderText()}
            className="w-full pl-10 pr-3 py-2.5 bg-transparent text-xs font-medium text-gray-900 outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setLots([]);
                if (searchInputRef.current) searchInputRef.current.focus();
              }}
              className="p-1 mr-2 text-gray-400 hover:text-gray-600 rounded-md transition"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search by Option Selector Dropdown */}
        <div className="flex items-center border-t sm:border-t-0 sm:border-l border-gray-200 bg-gray-100/70 sm:bg-gray-100/40 px-3 py-2 sm:py-0 shrink-0">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1.5 shrink-0">
            Search by:
          </span>
          <select
            value={searchField}
            onChange={(e) => {
              setSearchField(e.target.value);
              if (searchInputRef.current) searchInputRef.current.focus();
            }}
            className="text-xs font-bold text-gray-800 bg-transparent border-none outline-none cursor-pointer py-1"
            title="Select search option"
          >
            <option value="all">🔍 All Fields</option>
            <option value="deckle">📏 Deckle Size (cm)</option>
            <option value="cutting">✂️ Cutting Size (cm)</option>
            <option value="dimensions">📐 Deckle × Cutting (Size)</option>
            <option value="sr_no">🔢 Lot Serial #</option>
            <option value="party_name">🏢 Party Name</option>
            <option value="job_name">📦 Job Name</option>
            <option value="gsm">⚖️ GSM</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Searching active stock lots...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Search Results List */}
      {!loading && search.trim() !== '' && (
        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {lots.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              <p className="font-semibold text-gray-600">No matching stock lots found</p>
              <p className="mt-1 text-gray-400">
                No active stock lot with available balance matches "{search}". Try searching by deckle, cutting size, or lot #.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-center w-12">Action</th>
                  <th className="px-3 py-2">Sr #</th>
                  <th className="px-3 py-2">Party Name</th>
                  <th className="px-3 py-2">Job Name</th>
                  <th className="px-3 py-2">Deckle × Cut</th>
                  <th className="px-3 py-2">GSM</th>
                  <th className="px-3 py-2">Quality</th>
                  <th className="px-3 py-2 text-right">Available Qty</th>
                  <th className="px-3 py-2 text-right">Weight (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {lots.map((lot) => (
                  <tr
                    key={lot.id}
                    onClick={() => onSelectLot(lot)}
                    className="hover:bg-emerald-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLot(lot);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 group-hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Issue</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-gray-900">
                      #{lot.sr_no}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                      {lot.party_name}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-[150px] truncate">
                      {lot.job_name || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-emerald-800">
                      {lot.deckle} × {lot.cutting} cm
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-700">
                      {lot.gsm}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {lot.quality}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-teal-800 whitespace-nowrap">
                      {lot.current_quantity.toLocaleString()} pcs
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                      {lot.current_weight.toLocaleString()} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
