import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle, Edit3, Boxes, Search, X, Scale, ArrowRight,
  AlertTriangle, Loader2, RefreshCw, Layers
} from 'lucide-react';
import ReelMark from '../ReelMark';
import { reelApi } from '../../api/reelApi';
import { formatWeight } from '../../utils/formatters';
import RecordUsageModal from '../../pages/Reels/RecordUsageModal';

export default function LoginQuickActionsModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState('menu'); // 'menu' | 'search'
  const [selectedReelForUsage, setSelectedReelForUsage] = useState(null);

  // Search state for Option 2 (Update)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveStep('menu');
      setSearchQuery('');
      setSearchResults([]);
      setSearchDone(false);
    }
  }, [isOpen]);

  // Live search reels
  useEffect(() => {
    if (activeStep !== 'search') return;

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchDone(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await reelApi.getReels({ q: searchQuery.trim(), limit: 15 });
        const items = res.data || [];
        setSearchResults(items);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
        setSearchDone(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeStep]);

  if (!isOpen && !selectedReelForUsage) return null;

  const handleOption1Create = () => {
    onClose();
    navigate('/reels/create');
  };

  const handleOption2Update = () => {
    setActiveStep('search');
  };

  const handleOption3Details = () => {
    onClose();
    navigate('/reels');
  };

  const handleSelectReelForUsage = (reel) => {
    onClose();
    setSelectedReelForUsage(reel);
  };

  return (
    <>
      {/* ── Main 3-Option Quick Action Modal ─────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-scale-in border border-gray-200">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ReelMark size={24} />
                <div>
                  <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                    Quick Workspace Actions
                  </h2>
                  <p className="text-xs text-gray-500">
                    Select a task to proceed in Rainbow Packages workspace
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {activeStep === 'menu' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Option 1: Create */}
                  <div
                    onClick={handleOption1Create}
                    className="group bg-blue-50/50 p-5 rounded-2xl border border-blue-200 hover:border-brand-blue hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center shadow-xs">
                          <PlusCircle size={20} />
                        </div>
                        <span className="px-2 py-0.5 bg-blue-100 text-brand-blue text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Option 1
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-brand-blue transition-colors" style={{ fontFamily: 'var(--font-family-display)' }}>
                        1. Create Reel
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Add a new paper reel to stock with auto master key resolution. Navigates to inventory details on save.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-brand-blue">
                      <span>Create New</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Option 2: Update */}
                  <div
                    onClick={handleOption2Update}
                    className="group bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Scale size={20} />
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Option 2
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors" style={{ fontFamily: 'var(--font-family-display)' }}>
                        2. Update Weight
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Search reel by code/supplier/weight. Enter new weight & station to send usage report for approval.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                      <span>Search & Update</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Option 3: Details */}
                  <div
                    onClick={handleOption3Details}
                    className="group bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200 hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Boxes size={20} />
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Option 3
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors" style={{ fontFamily: 'var(--font-family-display)' }}>
                        3. Inventory Details
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        View complete stock inventory, filter reels by creation date, and view dynamic stock price values.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                      <span>View Inventory</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Search View for Option 2 (Update) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setActiveStep('menu')}
                      className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
                    >
                      ← Back to Quick Actions
                    </button>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Step 2: Search Reel to Update
                    </span>
                  </div>

                  {/* Search Input Box */}
                  <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type reel number, barcode, supplier name, GSM, or weight..."
                      className="w-full border border-gray-300 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    {searchLoading ? (
                      <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-blue animate-spin" />
                    ) : searchQuery ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </div>

                  {/* Search Results List */}
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {searchLoading && !searchResults.length && (
                      <div className="p-8 text-center text-gray-400 text-xs font-medium">
                        Searching active reels...
                      </div>
                    )}

                    {!searchLoading && searchDone && searchResults.length === 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0 text-red-600" />
                        <span>No active reel found matching key "{searchQuery}". Please verify the reel code or supplier name.</span>
                      </div>
                    )}

                    {!searchQuery && !searchResults.length && (
                      <div className="p-8 text-center text-gray-400 text-xs font-medium border-2 border-dashed border-gray-200 rounded-xl">
                        Type a reel code (e.g. R-1001) or supplier name above to select a reel.
                      </div>
                    )}

                    {searchResults.map((reel) => {
                      const reelId = reel.id || reel._id;
                      const currentWeight = reel.previous_weight ?? reel.max_weight;
                      return (
                        <div
                          key={reelId}
                          onClick={() => handleSelectReelForUsage(reel)}
                          className="p-3.5 bg-white border border-gray-200 hover:border-brand-blue rounded-xl transition cursor-pointer shadow-xs flex items-center justify-between group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm group-hover:text-brand-blue transition-colors">
                                #{reel.reel_no}
                              </span>
                              {/* {reel.master_key && (
                                <span className="px-2 py-0.5 bg-blue-50 text-brand-blue text-[10px] font-mono font-bold rounded border border-blue-200">
                                  {reel.master_key}
                                </span>
                              )} */}
                              {reel.master_code && (
                                <span className="px-2 py-0.5 bg-blue-50 text-brand-blue text-[10px] font-mono font-bold rounded border border-blue-200">
                                  {reel.master_code}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">
                                {reel.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {reel.quality} · {reel.gsm} GSM · {reel.bf} BF · {reel.size} cm | Supplier: <strong className="text-gray-700">{reel.supplier_name || 'N/A'}</strong>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Balance</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatWeight(currentWeight)}
                            </p>
                            <span className="text-[11px] font-bold text-brand-green group-hover:underline inline-flex items-center gap-0.5 mt-0.5">
                              Record Usage →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Modals ────────────────────────────────────────────────────── */}

      {selectedReelForUsage && (
        <RecordUsageModal
          isOpen={Boolean(selectedReelForUsage)}
          reel={selectedReelForUsage}
          onClose={() => setSelectedReelForUsage(null)}
          onSuccess={() => {
            const reelId = selectedReelForUsage.id || selectedReelForUsage._id;
            setSelectedReelForUsage(null);
            navigate(reelId ? `/reels/${reelId}` : '/reels');
          }}
        />
      )}
    </>
  );
}
