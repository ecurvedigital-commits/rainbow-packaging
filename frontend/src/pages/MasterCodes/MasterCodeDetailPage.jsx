import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterCodeApi } from '../../api/masterCodeApi';
import { reelApi } from '../../api/reelApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import {
  ArrowLeft, Layers, Boxes, Scale, Eye, RefreshCw, AlertTriangle, ArrowRight,
  CheckCircle2, XCircle
} from 'lucide-react';
import { formatWeight, formatDate, formatCurrency, getStatusBadgeClass } from '../../utils/formatters';

export const MasterCodeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [masterCode, setMasterCode] = useState(null);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMasterCodeAndReels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch master code list to find matching record by id or master_code
      const res = await masterCodeApi.list({});
      if (res.success && Array.isArray(res.data)) {
        const found = res.data.find(
          (m) => String(m.master_code_id || m.id) === String(id) || String(m.master_code) === String(id)
        );

        if (!found) {
          setError(`Master Code with ID "${id}" not found.`);
          setLoading(false);
          return;
        }

        setMasterCode(found);

        // 2. Fetch associated reels for this master code
        const reelsRes = await reelApi.list({ master_code: found.master_code, limit: 100 });
        if (reelsRes.success && Array.isArray(reelsRes.data)) {
          setReels(reelsRes.data);
        } else {
          setReels([]);
        }
      } else {
        setError('Failed to load Master Code details.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load Master Code data.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMasterCodeAndReels();
  }, [fetchMasterCodeAndReels]);

  if (loading) return <LoadingState message="Loading Master Code details and associated inventory..." />;
  if (error) return <ErrorAlert message={error} onRetry={fetchMasterCodeAndReels} />;
  if (!masterCode) return <ErrorAlert message="Master Code not found." />;

  // Calculate metrics
  const totalWeight = reels.reduce((acc, r) => acc + (r.previous_weight ?? r.max_weight ?? 0), 0);
  const totalValue = reels.reduce((acc, r) => {
    const w = r.previous_weight ?? r.max_weight ?? 0;
    const rate = r.rate_per_kg && Number(r.rate_per_kg) > 0 ? Number(r.rate_per_kg) : 0;
    return acc + (w * rate);
  }, 0);

  const fullCount = reels.filter((r) => r.status === 'REEL' || r.status === 'FULL').length;
  const cutCount = reels.filter((r) => r.status === 'CUT' || r.status === 'IN_USE').length;
  const nillCount = reels.filter((r) => r.status === 'NILL' || r.status === 'DEPLETED').length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/master-codes')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Back to Master Codes"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 bg-brand-blue/10 text-brand-blue font-mono font-bold text-xs rounded-lg">
                Code {masterCode.master_code}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                {masterCode.master_code_name || `Master Code ${masterCode.master_code}`}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                masterCode.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {masterCode.status}
              </span>
            </div>
            {masterCode.description && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {masterCode.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/reels?master_code=${encodeURIComponent(masterCode.master_code)}`)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <span>View in Inventory Filter</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Specifications</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {masterCode.quality ? masterCode.quality.toUpperCase() : 'Flexible'} Quality
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {masterCode.gsm ? `${masterCode.gsm} GSM` : 'Flex GSM'} • {masterCode.bf ? `${masterCode.bf} BF` : 'Flex BF'} • {masterCode.size ? `${masterCode.size} cm` : 'Flex Size'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Boxes size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Reels in Stock</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {reels.length} <span className="text-xs text-gray-500 font-normal">Reels</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {fullCount} Full · {cutCount} Cut · {nillCount} Nill
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
            <Scale size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Weight in Stock</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
              {formatWeight(totalWeight)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Remaining Weight</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
            <Eye size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Stock Value</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Inventory Valuation</p>
          </div>
        </div>
      </div>

      {/* Associated Reels Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Boxes size={18} className="text-brand-blue" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              Assigned Physical Reels ({reels.length})
            </h2>
          </div>
          <button
            onClick={fetchMasterCodeAndReels}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Refresh List"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {reels.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            No physical reels found for Master Code {masterCode.master_code}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Reel #</th>
                  <th className="px-6 py-3.5">Master Code</th>
                  <th className="px-6 py-3.5">Specifications</th>
                  <th className="px-6 py-3.5">Supplier</th>
                  <th className="px-6 py-3.5 text-right">Net Weight</th>
                  <th className="px-6 py-3.5 text-right">Price / KG</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
                {reels.map((reel) => {
                  const reelId = reel.id || reel._id;
                  const currentWeight = reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight;
                  const rate = reel.rate_per_kg && Number(reel.rate_per_kg) > 0 ? Number(reel.rate_per_kg) : 0;
                  const price = Math.round((currentWeight || 0) * rate);
                  const reelMasterCode = reel.master_code || reel.master_key || masterCode.master_code;

                  return (
                    <tr
                      key={reelId || reel.sr_no}
                      onClick={() => navigate(`/reels/${reelId}`)}
                      className="hover:bg-indigo-50/60 dark:hover:bg-slate-800/80 transition cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        Reel #{reel.reel_no || reel.reel_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                          {reelMasterCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <span className="font-bold text-gray-900 dark:text-white">{reel.quality}</span>
                        <span className="text-gray-500 dark:text-slate-400 ml-1">
                          ({reel.gsm} GSM · {reel.bf} BF · {reel.size} cm)
                        </span>
                      </td>
                      <td className="px-6 py-4">{reel.supplier_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white font-mono">
                        {formatWeight(currentWeight)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{rate}/kg
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(reel.status)}`}>
                          {reel.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(reel.purchase_date || reel.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/reels/${reelId}`)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition"
                          title="View Reel Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default MasterCodeDetailPage;
