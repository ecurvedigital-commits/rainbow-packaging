import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterProductApi } from '../../api/masterProductApi';
import {
  Layers, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Boxes, Scale, AlertCircle, ArrowRight, Loader2
} from 'lucide-react';

export default function MasterProductListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchMasterProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await masterProductApi.list({
        q: search,
        quality: qualityFilter,
        page,
        limit: 20,
      });
      if (res.success) {
        setItems(res.data || []);
        setMeta(res.meta || { page: 1, limit: 20, total: 0, totalPages: 1 });
      } else {
        setError(res.error?.message || 'Failed to load master products.');
      }
    } catch (err) {
      setError(err.message || 'Error loading master products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterProducts();
  }, [page, qualityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMasterProducts();
  };

  const totalMasterProducts = meta.total || 0;
  const totalWeightInStock = items.reduce((acc, curr) => acc + (curr.metrics?.total_available_weight || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5" style={{ fontFamily: 'var(--font-family-display)' }}>
            <Layers className="text-brand-blue" size={24} />
            Master Product Inventory
          </h1>
          <p className="text-xs text-gray-500">
            Logical product specifications grouping physical reels into standardized SKU categories.
          </p>
        </div>

        <button
          onClick={fetchMasterProducts}
          className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-xs transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-brand-blue/10 rounded-xl text-brand-blue shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Master Keys</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{totalMasterProducts}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <Boxes size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Categories</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{items.filter((i) => i.is_active).length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Stock Weight</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">
              {totalWeightInStock.toLocaleString()} <span className="text-xs font-semibold text-gray-500">kg</span>
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Master Key or name (e.g. VK-G120)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-semibold hover:bg-brand-blue-dark transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select
            value={qualityFilter}
            onChange={(e) => {
              setQualityFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
          >
            <option value="">All Qualities</option>
            {['VK', 'SPECTRA', 'ULTRA', 'SK', 'IMPORTANT', 'SBS', 'FBB', 'DCB'].map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Master Product Inventory Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-2">
            <Loader2 size={24} className="animate-spin text-brand-blue" />
            <p className="text-xs">Loading Master Products…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Layers size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold text-gray-700">No Master Products Found</p>
            <p className="text-xs text-gray-400 mt-1">
              Create physical reels to automatically populate master product classifications.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {/* <th className="py-3 px-4">Master Key</th> */}
                  <th className="py-3 px-4">Master Code</th>
                  <th className="py-3 px-4">Specification Name</th>
                  <th className="py-3 px-4 text-center">Quality</th>
                  <th className="py-3 px-4 text-center">GSM</th>
                  <th className="py-3 px-4 text-center">BF</th>
                  <th className="py-3 px-4 text-center">Size</th>
                  <th className="py-3 px-4 text-right">Physical Reels</th>
                  <th className="py-3 px-4 text-right">Stock Weight</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/master-products/${item.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-blue">
                      <span className="px-2.5 py-1 bg-brand-blue/10 text-brand-blue rounded-lg text-xs">
                        {/* {item.master_key} */}
                        {item.master_code || item.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{item.name}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-700">{item.quality}</td>
                    <td className="py-3.5 px-4 text-center text-gray-600">{item.gsm}</td>
                    <td className="py-3.5 px-4 text-center text-gray-600">{item.bf}</td>
                    <td className="py-3.5 px-4 text-center text-gray-600">{item.size}"</td>
                    <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                      {item.metrics?.reel_count || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      {(item.metrics?.total_available_weight || 0).toLocaleString()} kg
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/master-products/${item.id}`);
                        }}
                        className="p-1.5 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing page <span className="font-bold">{meta.page}</span> of <span className="font-bold">{meta.totalPages}</span> ({meta.total} total)
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
