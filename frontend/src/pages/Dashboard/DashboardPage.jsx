import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboardApi';
import { LoadingState } from '../../components/Common/LoadingState';
import { ErrorAlert } from '../../components/Common/ErrorAlert';
import { Pagination } from '../../components/Common/Pagination';
import { getStatusBadgeStyle, formatWeight, formatDate, formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../auth/AuthContext';
import { Layers, Weight, AlertCircle, Clock, TrendingUp, RefreshCw, ArrowRight, IndianRupee } from 'lucide-react';

const TILE_COLOR = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { isRoleOperator } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(null);
  const [statusBoard, setStatusBoard] = useState({});
  const [qualityBreakdown, setQualityBreakdown] = useState([]);
  const [supplierBreakdown, setSupplierBreakdown] = useState([]);
  const [agingData, setAgingData] = useState({ data: [], meta: null });
  const [agingPage, setAgingPage] = useState(1);

  const [activeTab, setActiveTab] = useState('board');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, boardRes, qualRes, suppRes, agingRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getStatusBoard(),
        dashboardApi.getBreakdown('quality'),
        dashboardApi.getBreakdown('supplier'),
        dashboardApi.getAging(30, agingPage, 10),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (boardRes.success) setStatusBoard(boardRes.data || {});
      if (qualRes.success) setQualityBreakdown(Array.isArray(qualRes.data) ? qualRes.data : []);
      if (suppRes.success) setSupplierBreakdown(Array.isArray(suppRes.data) ? suppRes.data : []);
      if (agingRes.success) {
        const items = agingRes.data?.items || (Array.isArray(agingRes.data) ? agingRes.data : []);
        const meta = agingRes.data?.meta || agingRes.meta || null;
        setAgingData({ data: items, meta });
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [agingPage]);

  if (loading && !summary) {
    return <LoadingState message="Loading inventory dashboard metrics…" />;
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={fetchDashboardData} />;
  }

  const totalWeightInStock = summary?.weight_in_stock ?? summary?.total_weight_in_stock_kg ?? 0;
  const totalStockValue = summary?.total_stock_value ?? Math.round(totalWeightInStock * 55);
  const pricePerKg = summary?.price_per_kg ?? summary?.avg_price_per_kg ?? (totalWeightInStock > 0 ? Math.round((totalStockValue / totalWeightInStock) * 100) / 100 : 55);

  const tiles = [
    {
      label: 'Total Reels',
      value: summary?.total_reels ?? summary?.totalReels ?? 0,
      icon: Layers,
      color: 'blue',
      path: '/reels',
    },
    {
      label: 'Weight in Stock',
      value: formatWeight(totalWeightInStock),
      icon: Weight,
      color: 'green',
      path: '/reels?status=REEL,CUT',
    },
    {
      label: 'Price / KG',
      value: `₹${Number(pricePerKg).toFixed(2)}/kg`,
      icon: IndianRupee,
      color: 'purple',
      path: '/reels?status=REEL,CUT',
    },
    {
      label: 'Pending Approvals',
      value: summary?.pending_confirmations ?? summary?.pending_approvals ?? 0,
      icon: AlertCircle,
      color: 'amber',
      path: isRoleOperator ? '/my-approvals' : '/approvals',
    },
    {
      label: 'Unused 30+ Days',
      value: summary?.unused_reels ?? summary?.aging_reels_count ?? 0,
      icon: Clock,
      color: 'red',
      path: '/reels?aging=30',
    },
  ];

  const handleTileClick = (path) => {
    navigate(path);
  };

  const reelColumnItems = statusBoard.REEL?.items || statusBoard.reel?.items || (Array.isArray(statusBoard.REEL) ? statusBoard.REEL : []);
  const cutColumnItems = statusBoard.CUT?.items || statusBoard.cut?.items || (Array.isArray(statusBoard.CUT) ? statusBoard.CUT : []);
  const nillColumnItems = statusBoard.NILL?.items || statusBoard.nill?.items || (Array.isArray(statusBoard.NILL) ? statusBoard.NILL : []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
            Inventory Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time stock status, quality breakdown, price per kg, and pending approval metrics.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 min-[1000px]:grid-cols-2 min-[1331px]:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            onClick={() => handleTileClick(t.path)}
            className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
            title={`Click to view ${t.label}`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className={`p-3 rounded-xl shrink-0 border ${TILE_COLOR[t.color]}`}>
                <t.icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-semibold truncate group-hover:text-brand-blue transition-colors">
                  {t.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5" style={{ fontFamily: 'var(--font-family-display)' }}>
                  {t.value}
                </p>
              </div>
            </div>
            <div className="text-gray-300 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all shrink-0">
              <ArrowRight size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Quality & Supplier Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BreakdownCard
          title="Reels by Quality & BF"
          icon={TrendingUp}
          data={qualityBreakdown}
          total={summary?.total_reels || 1}
          barClass="bg-brand-blue"
          filterType="Qualities"
          initialLimit={5}
          onItemClick={(item) => {
            const params = new URLSearchParams();
            if (item.quality) params.set('quality', item.quality);
            if (item.bf !== undefined && item.bf !== null) params.set('bf', item.bf);
            navigate(`/reels?${params.toString()}`);
          }}
          onLoadMore={() => navigate('/reels')}
        />
        <BreakdownCard
          title="Weight by Supplier"
          icon={Weight}
          data={supplierBreakdown}
          total={summary?.weight_in_stock || 1}
          barClass="bg-brand-green"
          isWeight={true}
          filterType="Suppliers"
          initialLimit={5}
          onItemClick={(item) => {
            const supplierName = item.supplier || item.label;
            if (supplierName && supplierName !== 'Unknown') {
              navigate(`/reels?supplier=${encodeURIComponent(supplierName)}`);
            } else {
              navigate('/reels');
            }
          }}
          onLoadMore={() => {
            const topSuppliers = supplierBreakdown
              .slice(0, 5)
              .map((s) => s.supplier || s.label)
              .filter((s) => s && s !== 'Unknown');
            if (topSuppliers.length > 0) {
              navigate(`/reels?supplier=${encodeURIComponent(topSuppliers.join(','))}`);
            } else {
              navigate('/reels');
            }
          }}
        />
      </div>

      {/* Status Board / Aging Tab section */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          <TabButton active={activeTab === 'board'} onClick={() => setActiveTab('board')}>
            Status Board
          </TabButton>
          <TabButton active={activeTab === 'aging'} onClick={() => setActiveTab('aging')}>
            Aging Reels (30+ days)
          </TabButton>
        </div>

        {activeTab === 'board' ? (
          <div className="p-6 bg-gray-50/40">
            <div className="flex gap-6 overflow-x-auto pb-2">
              <StatusColumn
                title="Unused (REEL)"
                subtitle="Full intact reels"
                items={reelColumnItems}
                theme="green"
                onReelClick={(id) => navigate(`/reels/${id}`)}
              />
              <StatusColumn
                title="In Use (CUT)"
                subtitle="Partially used reels"
                items={cutColumnItems}
                theme="amber"
                onReelClick={(id) => navigate(`/reels/${id}`)}
              />
              <StatusColumn
                title="Fully Used (NILL)"
                subtitle="Completely consumed"
                items={nillColumnItems}
                theme="gray"
                onReelClick={(id) => navigate(`/reels/${id}`)}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase">
                    <th className="p-3.5">Reel No</th>
                    <th className="p-3.5">Quality</th>
                    <th className="p-3.5">Supplier</th>
                    <th className="p-3.5">Purchase Date</th>
                    <th className="p-3.5">Current Weight</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {agingData.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400 text-xs font-semibold">
                        No aging reels found (all active within 30 days).
                      </td>
                    </tr>
                  ) : (
                    agingData.data.map((r) => (
                      <tr
                        key={r.id || r._id}
                        onClick={() => navigate(`/reels/${r.id || r._id}`)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 font-bold text-gray-900">#{r.reel_no}</td>
                        <td className="p-3.5">{r.quality}</td>
                        <td className="p-3.5">{r.supplier_name}</td>
                        <td className="p-3.5 text-xs text-gray-500">{formatDate(r.purchase_date)}</td>
                        <td className="p-3.5 font-bold text-gray-900">{formatWeight(r.current_weight ?? r.previous_weight)}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadgeStyle(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination meta={agingData.meta} onPageChange={setAgingPage} />
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3.5 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
      active ? 'border-brand-blue text-brand-blue bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
);

const BreakdownCard = ({
  title,
  icon: Icon,
  data = [],
  total = 1,
  barClass,
  isWeight = false,
  initialLimit = 5,
  onItemClick,
  onLoadMore,
  filterType = 'Items',
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleData = showAll ? data : data.slice(0, initialLimit);
  const hasMore = data.length > initialLimit;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            <Icon size={16} className="text-gray-400" /> {title}
          </h3>
          <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
            {data.length} {filterType}
          </span>
        </div>

        <div className="space-y-2">
          {!Array.isArray(data) || data.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No data available</p>
          ) : (
            visibleData.map((item, idx) => {
              const label = item.label || item._id || item.quality || item.supplier || item.name || 'Unknown';
              const count = isWeight
                ? (item.total_weight !== undefined ? item.total_weight : item.count || 0)
                : (item.reel_count !== undefined ? item.reel_count : item.count || 0);
              const percent = total > 0 ? Math.min(Math.round((count / total) * 100), 100) : 0;
              return (
                <div
                  key={`${label}-${idx}`}
                  onClick={() => onItemClick && onItemClick(item)}
                  className={`flex items-center gap-3 ${
                    onItemClick ? 'cursor-pointer hover:bg-blue-50/50 p-2 rounded-xl border border-transparent hover:border-blue-100 transition-all group' : ''
                  }`}
                  title={onItemClick ? `Click to filter reels by ${label}` : label}
                >
                  <div className="w-36 text-xs font-bold text-gray-800 truncate group-hover:text-brand-blue" title={label}>
                    {label}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`${barClass} h-full rounded-full transition-all duration-300`} style={{ width: `${percent}%` }} />
                  </div>
                  <div className="w-24 text-right text-xs font-bold text-gray-900">
                    {isWeight ? `${count.toLocaleString()} kg` : `${count} reels`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {hasMore && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
          >
            {showAll ? 'Show Less' : `Show ${data.length - initialLimit} More`}
          </button>
          <button
            onClick={onLoadMore}
            className="text-xs font-bold text-brand-blue hover:text-blue-700 flex items-center gap-1 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100"
          >
            Load More in Reel List <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

const STATUS_THEME = {
  green: { header: 'bg-emerald-50 text-emerald-800 border-emerald-200', badge: 'bg-emerald-600 text-white', hover: 'hover:border-emerald-400' },
  amber: { header: 'bg-amber-50 text-amber-800 border-amber-200', badge: 'bg-amber-500 text-white', hover: 'hover:border-amber-400' },
  gray: { header: 'bg-gray-100 text-gray-700 border-gray-300', badge: 'bg-gray-400 text-white', hover: 'hover:border-gray-400' },
};

const StatusColumn = ({ title, subtitle, items = [], theme, onReelClick }) => {
  const t = STATUS_THEME[theme] || STATUS_THEME.gray;
  const itemList = Array.isArray(items) ? items : (items?.items && Array.isArray(items.items) ? items.items : []);

  return (
    <div className="flex-1 min-w-[280px] bg-white rounded-2xl shadow-xs border border-gray-200 flex flex-col h-[520px]">
      <div className={`p-4 border-b flex justify-between items-center rounded-t-2xl ${t.header}`}>
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider">{title}</h3>
          <p className="text-[11px] opacity-70">{subtitle}</p>
        </div>
        <span className={`${t.badge} px-2.5 py-0.5 rounded-full text-xs font-bold`}>{itemList.length}</span>
      </div>
      <div className="p-3 flex-1 overflow-y-auto space-y-3 bg-gray-50/40 custom-scrollbar">
        {itemList.map((reel) => (
          <div
            key={reel.id || reel._id}
            onClick={() => onReelClick(reel.id || reel._id)}
            className={`bg-white p-4 rounded-xl shadow-xs border border-gray-200 transition-all cursor-pointer hover:shadow-md ${t.hover}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-gray-900 text-base">#{reel.reel_no}</span>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{reel.quality}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between"><span>Supplier:</span><span className="font-semibold text-gray-800 truncate ml-2">{reel.supplier_name}</span></div>
              <div className="flex justify-between"><span>Balance:</span><span className="font-bold text-gray-900">{formatWeight(reel.current_weight ?? reel.previous_weight)}</span></div>
              <div className="flex justify-between"><span>GSM / Size:</span><span className="font-semibold text-gray-800">{reel.gsm} / {reel.size}</span></div>
            </div>
          </div>
        ))}
        {itemList.length === 0 && <div className="text-center p-8 text-gray-400 font-medium text-xs">No reels in this status</div>}
      </div>
    </div>
  );
};

export default DashboardPage;
