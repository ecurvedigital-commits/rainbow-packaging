import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterProductApi } from '../../api/masterProductApi';
import {
  ArrowLeft, Layers, Boxes, Scale, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, Loader2, Building2
} from 'lucide-react';

export default function MasterProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mp, setMp] = useState(null);
  const [reels, setReels] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [mpRes, reelsRes] = await Promise.all([
        masterProductApi.getById(id),
        masterProductApi.getReels(id, { page, limit: 20 }),
      ]);

      if (mpRes.success) {
        setMp(mpRes.data);
      } else {
        setError(mpRes.error?.message || 'Failed to load master product.');
      }

      if (reelsRes.success) {
        setReels(reelsRes.data?.items || []);
        setMeta(reelsRes.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Error loading detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, page]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-2">
        <Loader2 size={24} className="animate-spin text-brand-blue" />
        <p className="text-xs">Loading Master Product detail…</p>
      </div>
    );
  }

  if (error || !mp) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/master-products')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back to Master Products
        </button>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{error || 'Master product not found.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link and Header */}
      <div>
        <button
          onClick={() => navigate('/master-products')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-3 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Master Products
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-brand-blue text-white rounded-xl font-mono font-bold text-sm tracking-wide shadow-xs">
                {mp.master_key}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                mp.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {mp.is_active ? 'Active Spec' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-2" style={{ fontFamily: 'var(--font-family-display)' }}>
              {mp.name}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Created on {new Date(mp.created_at).toLocaleDateString()}
            </p>
          </div>

          <button
            onClick={fetchData}
            className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-xs transition-colors"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {/* Specification Parameter Grid & Inventory Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spec Parameters Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-brand-blue" />
            Product Identity Parameters
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Quality</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{mp.quality}</p>
              <span className="text-[10px] text-gray-400 font-mono">Code: {mp.parameter_codes?.quality}</span>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase">GSM</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{mp.gsm}</p>
              <span className="text-[10px] text-gray-400 font-mono">Code: {mp.parameter_codes?.gsm}</span>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase">BF (Bursting Factor)</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{mp.bf}</p>
              <span className="text-[10px] text-gray-400 font-mono">Code: {mp.parameter_codes?.bf}</span>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Size / Width</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{mp.size}"</p>
              <span className="text-[10px] text-gray-400 font-mono">Code: {mp.parameter_codes?.size}</span>
            </div>
          </div>
        </div>

        {/* Aggregate Inventory Metrics */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Scale size={16} className="text-emerald-600" />
              Aggregate Stock Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-800 uppercase">Available Weight</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {(mp.metrics?.total_available_weight || 0).toLocaleString()} <span className="text-xs">kg</span>
                </p>
              </div>

              <div className="bg-brand-blue/5 p-4 rounded-xl border border-brand-blue/10">
                <p className="text-[10px] font-bold text-brand-blue uppercase">Total Physical Reels</p>
                <p className="text-2xl font-bold text-brand-blue-dark mt-1">
                  {mp.metrics?.reel_count || 0}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Purchased Weight</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {(mp.metrics?.total_max_weight || 0).toLocaleString()} <span className="text-xs">kg</span>
                </p>
              </div>
            </div>
          </div>

          {/* Suppliers Breakdown */}
          {mp.metrics?.suppliers?.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 size={14} /> Suppliers providing this specification:
              </p>
              <div className="flex flex-wrap gap-2">
                {mp.metrics.suppliers.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Associated Physical Reels List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
              Associated Physical Reels ({meta.total})
            </h2>
            <p className="text-xs text-gray-500">Individual reels belonging to Master Product {mp.master_key}</p>
          </div>
        </div>

        {reels.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            No active physical reels found under this specification.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">SR NO</th>
                  <th className="py-3 px-4">Reel No</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Balance Weight</th>
                  <th className="py-3 px-4 text-right">Max Weight</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Purchase Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {reels.map((reel) => (
                  <tr
                    key={reel.id}
                    onClick={() => navigate(`/reels/${reel.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-gray-500">#{reel.sr_no}</td>
                    <td className="py-3 px-4 font-bold text-brand-blue">{reel.reel_no}</td>
                    <td className="py-3 px-4 text-gray-700">{reel.supplier_name}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{reel.previous_weight} kg</td>
                    <td className="py-3 px-4 text-right text-gray-600">{reel.max_weight} kg</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        reel.status === 'REEL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : reel.status === 'CUT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {reel.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(reel.purchase_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page <span className="font-bold">{meta.page}</span> of <span className="font-bold">{meta.totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
