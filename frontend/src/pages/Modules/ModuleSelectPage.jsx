import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Layers,
  Package,
  Droplet,
  ArrowRight,
  LogOut,
  Sparkles,
  Shield,
  Clock
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import ReelMark from '../../components/ReelMark';

export default function ModuleSelectPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const modules = [
    {
      id: 'reels',
      optionNumber: 'Option 1',
      title: '1. Reels Module',
      badge: 'Production Ready',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      pillClass: 'bg-blue-100 text-brand-blue',
      icon: Boxes,
      iconBg: 'bg-brand-blue text-white shadow-blue-500/20',
      containerBg: 'bg-blue-50/40 border-blue-200 hover:border-brand-blue hover:shadow-xl hover:shadow-blue-500/10',
      actionTextClass: 'text-brand-blue border-blue-100',
      description: 'Raw material paper rolls, real-time weight tracking (kg), master codes, machine station usage, and multi-tier supervisor approvals.',
      actionText: 'Open Reels Dashboard',
      route: '/dashboard',
      isReady: true,
    },
    {
      id: 'sheets',
      optionNumber: 'Option 2',
      title: '2. Sheets Module',
      badge: 'Dashboard In Design',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      pillClass: 'bg-emerald-100 text-emerald-800',
      icon: Layers,
      iconBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
      containerBg: 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-600 hover:shadow-xl hover:shadow-emerald-500/10',
      actionTextClass: 'text-emerald-700 border-emerald-100',
      description: 'Sheet-fed paper & corrugated boards, dimensional specs (Length × Width), caliper thickness, ream conversions, and cutting yields.',
      actionText: 'Open Sheets Dashboard',
      route: '/sheets/dashboard',
      isReady: false,
    },
    {
      id: 'finished-boxes',
      optionNumber: 'Option 3',
      title: '3. Finished Boxes',
      badge: 'Dashboard In Design',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      pillClass: 'bg-indigo-100 text-indigo-800',
      icon: Package,
      iconBg: 'bg-indigo-600 text-white shadow-indigo-500/20',
      containerBg: 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10',
      actionTextClass: 'text-indigo-700 border-indigo-100',
      description: 'Finished corrugated boxes inventory, 3D dimensions (L × W × H), flute specs (3/5/7-ply), pallet dispatch, and sales orders.',
      actionText: 'Open Boxes Dashboard',
      route: '/finished-boxes/dashboard',
      isReady: false,
    },
    {
      id: 'sample',
      optionNumber: 'Option 4',
      title: '4. Inks & Consumables',
      badge: 'Future Sample',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      pillClass: 'bg-purple-100 text-purple-800',
      icon: Droplet,
      iconBg: 'bg-purple-600 text-white shadow-purple-500/20',
      containerBg: 'bg-purple-50/40 border-purple-200 hover:border-purple-600 hover:shadow-xl hover:shadow-purple-500/10',
      actionTextClass: 'text-purple-700 border-purple-100',
      description: 'Printing ink batches, viscosity control, corrugation adhesives, stitching wire, and die-cutting tooling inventory management.',
      actionText: 'Open Sample Dashboard',
      route: '/sample/dashboard',
      isReady: false,
    },
  ];

  const initials = (user?.name || user?.username || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      {/* Top Header Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <ReelMark size={28} />
          <div>
            <span className="font-extrabold text-gray-900 text-base tracking-tight" style={{ fontFamily: 'var(--font-family-display)' }}>
              Rainbow Packages
            </span>
            <span className="hidden sm:inline text-xs text-gray-400 ml-2">| Inventory Portal</span>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-gray-900 leading-tight">
                {user?.name || user?.username}
              </p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                {user?.role}
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-gray-200" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            title="Sign out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Center Stage: Quick-Action-Box Style Dialog Container */}
      <main className="w-full max-w-5xl mx-auto my-auto py-6 sm:py-8">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-scale-in">
          {/* Card Header (Identical spirit to LoginQuickActionsModal header) */}
          <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 px-6 sm:px-8 py-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-family-display)' }}>
                  Select Inventory Domain
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Choose a module workspace to open its dashboard and inventory operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Shield size={13} />
                Role: {user?.role || 'OPERATOR'}
              </span>
            </div>
          </div>

          {/* Card Body: Options Grid (Just like Quick Action Modal options) */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {modules.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(m.route)}
                    className={`group ${m.containerBg} p-5 rounded-2xl border shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between`}
                  >
                    <div>
                      {/* Option Header */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div className={`w-11 h-11 rounded-xl ${m.iconBg} flex items-center justify-center transition-transform group-hover:scale-110 duration-200`}>
                          <Icon size={22} />
                        </div>
                        <span className={`px-2 py-0.5 ${m.pillClass} text-[10px] font-bold rounded-full uppercase tracking-wider`}>
                          {m.optionNumber}
                        </span>
                      </div>

                      {/* Title & Status */}
                      <div className="mb-2">
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-blue transition-colors" style={{ fontFamily: 'var(--font-family-display)' }}>
                          {m.title}
                        </h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.badgeClass}`}>
                          {m.badge}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-600 leading-relaxed mt-2">
                        {m.description}
                      </p>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className={`mt-5 pt-3.5 border-t ${m.actionTextClass} flex items-center justify-between text-xs font-bold`}>
                      <span>{m.actionText}</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Footer */}
          <div className="bg-gray-50 px-6 sm:px-8 py-3.5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 font-medium">
            <span>Rainbow Packaging Multi-Category Inventory Platform</span>
            <span>Selecting Reels opens the full operational workspace</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-gray-400 py-2">
        © {new Date().getFullYear()} Rainbow Packages — Internal Enterprise System
      </footer>
    </div>
  );
}
