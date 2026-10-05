import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelApi } from '../../api/reelApi';
import {
  X, Layers, Boxes, Scale, Eye, Loader2, ArrowRight, CheckCircle2,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { formatWeight, formatDate, formatCurrency, getStatusBadgeClass } from '../../utils/formatters';

export const MasterCodeDetailsModal = ({ isOpen = true, masterCode, onClose }) => {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReels = async () => {
    if (!masterCode) return;
    setLoading(true);
    setError('');
    try {
      // Query reels by master_code
      const res = await reelApi.list({ master_code: masterCode.master_code, limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setReels(res.data);
      } else {
        setReels([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch reels for this master code.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && masterCode) {
      fetchReels();
    }
  }, [isOpen, masterCode]);

  if (!isOpen || !masterCode) return null;

  // Calculate metrics
  const totalWeight = reels.reduce((acc, r) => acc + (r.previous_weight ?? r.max_weight ?? 0), 0);
  const totalValue = reels.reduce((acc, r) => {
    const w = r.previous_weight ?? r.max_weight ?? 0;
    const rate = r.rate_per_kg && Number(r.rate_per_kg) > 0 ? Number(r.rate_per_kg) : 55;
    return acc + (w * rate);
  }, 0);

  const fullCount = reels.filter((r) => r.status === 'REEL' || r.status === 'FULL').length;
  const cutCount = reels.filter((r) => r.status === 'CUT' || r.status === 'IN_USE').length;
  const nillCount = reels.filter((r) => r.status === 'NILL' || r.status === 'DEPLETED').length;

  const handleReelClick = (reelId) => {
    onClose();
    navigate(`/reels/${reelId}`);
  };

  const handleOpenInInventory = () => {
    onClose();
    navigate(`/reels?master_code=${encodeURIComponent(masterCode.master_code)}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800 animate-scale-in">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-brand-blue to-indigo-800 px-6 py-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Layers size={22} className="text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-white/20 font-mono font-bold text-xs rounded-md tracking-wide">
                  Master Code {masterCode.master_code}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  masterCode.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 border-emerald-300 text-emerald-100'
                    : 'bg-gray-500/20 border-gray-300 text-gray-200'
                }`}>
                  {masterCode.status}
                </span>
              </div>
              <h2 className="text-lg font-bold mt-1 text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                {masterCode.master_code_name || `Master Code ${masterCode.master_code}`}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Master Code Specs & Summary Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quality</p>
              <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                {masterCode.quality ? String(masterCode.quality).toUpperCase() : 'All / Flexible'}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GSM</p>
              <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 font-mono">
                {masterCode.gsm ? `${masterCode.gsm} GSM` : 'Flexible'}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bursting Factor</p>
              <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 font-mono">
                {masterCode.bf ? `${masterCode.bf} BF` : 'Flexible'}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Size / Width</p>
              <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 font-mono">
                {masterCode.size ? `${masterCode.size} cm` : 'Flexible'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Total Stock Reels: </span>
                <strong className="text-slate-900 dark:text-white font-bold">{reels.length} Reels</strong>
                <span className="text-slate-400 text-[11px] ml-1.5">
                  ({fullCount} Full · {cutCount} Cut · {nillCount} Nill)
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Net Weight: </span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatWeight(totalWeight)}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Stock Value: </span>
                <strong className="text-indigo-700 dark:text-indigo-300 font-bold">{formatCurrency(totalValue)}</strong>
              </div>
            </div>

            <button
              onClick={handleOpenInInventory}
              className="text-xs font-bold text-brand-blue hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 hover:underline"
            >
              <span>View in Full Inventory Page</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Reels List Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Boxes size={15} className="text-indigo-600" />
              Physical Reels Assigned to Master Code {masterCode.master_code} ({reels.length})
            </h3>
            <button
              onClick={fetchReels}
              disabled={loading}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
              title="Refresh Reels List"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
              <Loader2 size={18} className="animate-spin text-brand-blue" />
              Loading associated reels...
            </div>
          ) : reels.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
              No physical reels currently match Master Code {masterCode.master_code}.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Reel / Barcode</th>
                      <th className="px-4 py-3">Specifications</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3 text-right">Net Weight</th>
                      <th className="px-4 py-3 text-right">Price / KG</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                    {reels.map((reel) => {
                      const reelId = reel.id || reel._id;
                      const currentWeight = reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight;
                      const rate = reel.rate_per_kg && Number(reel.rate_per_kg) > 0 ? Number(reel.rate_per_kg) : 55;
                      const price = Math.round((currentWeight || 0) * rate);

                      return (
                        <tr
                          key={reelId || reel.sr_no}
                          onClick={() => handleReelClick(reelId)}
                          className="hover:bg-indigo-50/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
                        >
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            Reel #{reel.reel_no || reel.reel_number}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{reel.quality}</span>
                            <span className="text-slate-400 ml-1">({reel.gsm} GSM · {reel.bf} BF · {reel.size} cm)</span>
                          </td>
                          <td className="px-4 py-3">{reel.supplier_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                            {formatWeight(currentWeight)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            ₹{rate}/kg
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(reel.status)}`}>
                              {reel.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReelClick(reelId);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                              title="View Reel Details"
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default MasterCodeDetailsModal;
