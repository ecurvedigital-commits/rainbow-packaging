import React from 'react';
import { Boxes, Layers, Scale, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

export default function SheetSummaryCards({ summary, loading = false }) {
  const cards = [
    {
      title: 'Total Stock Lots',
      value: loading ? '—' : (summary?.total_sheet_lots ?? summary?.total_lots ?? 0),
      subtitle: `${summary?.available_lots_count ?? summary?.available_lots ?? 0} active | ${summary?.partially_consumed_count ?? summary?.partially_consumed_lots ?? 0} in-use`,
      icon: Boxes,
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    {
      title: 'Total Available Sheets',
      value: loading ? '—' : `${(summary?.total_available_sheets ?? summary?.available_sheets ?? 0).toLocaleString()} pcs`,
      subtitle: `${(summary?.total_consumed_sheets ?? summary?.consumed_sheets ?? 0).toLocaleString()} sheets consumed`,
      icon: Layers,
      iconBg: 'bg-teal-50 text-teal-700 border-teal-100',
    },
    {
      title: 'Total Available Weight',
      value: loading ? '—' : `${(summary?.total_available_weight ?? summary?.total_weight_kg ?? 0).toLocaleString()} kg`,
      subtitle: `~${summary?.total_available_weight_tons ?? summary?.total_weight_tons ?? 0} Metric Tons`,
      icon: Scale,
      iconBg: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    {
      title: 'Partially Consumed',
      value: loading ? '—' : (summary?.partially_consumed_count ?? summary?.partially_consumed_lots ?? 0),
      subtitle: 'Currently running on press',
      icon: AlertCircle,
      iconBg: 'bg-orange-50 text-orange-700 border-orange-100',
    },
    {
      title: 'Depleted Lots',
      value: loading ? '—' : (summary?.depleted_count ?? summary?.depleted_lots ?? 0),
      subtitle: 'Zero sheets remaining',
      icon: CheckCircle2,
      iconBg: 'bg-rose-50 text-rose-700 border-rose-100',
    },
    {
      title: 'Pending Approvals',
      value: loading ? '—' : (summary?.pending_confirmations ?? 0),
      subtitle: 'Awaiting supervisor review',
      icon: Clock,
      iconBg: 'bg-purple-50 text-purple-700 border-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg border shadow-xs shrink-0 ${card.iconBg}`}>
                <Icon size={14} />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-tight truncate">
                {card.value}
              </p>
              <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

