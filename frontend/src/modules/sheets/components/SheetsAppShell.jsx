import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import ReelMark from '../../../components/ReelMark';
import {
  LayoutDashboard,
  Boxes,
  PlusCircle,
  Scale,
  LayoutGrid,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Sparkles,
  ArrowRight,
  X,
  MessageSquarePlus,
} from 'lucide-react';

export default function SheetsAppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Desktop Sidebar Collapsed State (Persisted in localStorage)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sheets_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sheets_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = (user?.name || user?.username || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Dynamic Document Title Branding
  useEffect(() => {
    const routeTitles = {
      '/sheets/dashboard': 'Sheets Dashboard',
      '/sheets/inventory': 'Sheet Inventory',
      '/sheets/create': 'Create Sheet Lot',
      '/sheets/update': 'Update Sheet Stock',
    };
    const title = routeTitles[location.pathname] || 'Sheets Domain';
    document.title = `Rainbow Packages | ${title}`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-surface">
      {/* ── Collapsible Desktop Sidebar ───────────────────────────────── */}
      <aside
        className={`hidden lg:flex lg:flex-col ${
          collapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-gray-200 shrink-0 sticky top-0 h-screen transition-all duration-300 ease-in-out z-40`}
      >
        <SheetsSidebarContent
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onLogout={handleLogout}
          onOpenQuickActions={() => setShowQuickActions(true)}
        />
      </aside>

      {/* ── Mobile Sidebar Overlay ────────────────────────────────────── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col animate-slide-right shadow-xl">
            <SheetsSidebarContent
              collapsed={false}
              onLogout={handleLogout}
              onNavigate={() => setMobileNavOpen(false)}
              onOpenQuickActions={() => {
                setMobileNavOpen(false);
                setShowQuickActions(true);
              }}
            />
          </aside>
        </div>
      )}

      {/* ── Main Layout Container ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white/85 backdrop-blur border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2.5">
              <ReelMark size={24} />
              <span
                className="text-sm font-bold text-gray-900"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                Rainbow Packages
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-brand-blue border border-blue-200">
                Sheets Module
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Switch Module Button */}
            <button
              onClick={() => navigate('/modules')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full border border-gray-200 shadow-xs transition-all cursor-pointer"
              title="Return to Module Selection Screen"
            >
              <LayoutGrid size={14} className="text-gray-500 shrink-0" />
              <span className="hidden md:inline">Switch Module</span>
            </button>

            {/* Quick Actions Trigger Button */}
            <button
              onClick={() => setShowQuickActions(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-full shadow-xs transition-all cursor-pointer"
              title="Open Sheets Quick Actions"
            >
              <Sparkles size={14} className="animate-pulse shrink-0" />
              <span>Quick Actions</span>
            </button>

            {/* Notification Bell Shortcut */}
            <NavLink
              to="/notifications"
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Notifications"
            >
              <Bell size={20} />
            </NavLink>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-blue text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <p className="text-xs font-bold text-gray-900 leading-tight">
                    {user?.name || user?.username}
                  </p>
                  <p className="text-[10px] text-brand-blue-dark font-semibold uppercase tracking-wider">
                    {user?.role}
                  </p>
                </div>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-scale-in">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/modules');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <LayoutGrid size={15} /> Switch Module
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children || <Outlet />}
        </main>

        {/* ── Sheets Quick Actions Modal (Create / Update / Inventory) ── */}
        <SheetsQuickActionsModal
          isOpen={showQuickActions}
          onClose={() => setShowQuickActions(false)}
        />

        {/* Floating Message Button on Bottom Right */}
        <button
          onClick={() => navigate('/messages/compose')}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs rounded-full shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/25 cursor-pointer"
          title="Send a Message"
        >
          <MessageSquarePlus size={18} className="shrink-0 transition-transform group-hover:rotate-12" />
          <span className="hidden sm:inline">Message</span>
        </button>
      </div>
    </div>
  );
}

// ── Sheets Sidebar Component ──────────────────────────────────────────
function SheetsSidebarContent({
  collapsed = false,
  onToggleCollapse,
  onLogout,
  onNavigate,
  onOpenQuickActions,
}) {
  return (
    <>
      {/* Header & Collapse Toggle */}
      <div
        className={`flex items-center ${
          collapsed ? 'justify-center px-2' : 'justify-between px-5'
        } h-16 border-b border-gray-200 shrink-0 transition-all duration-300`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ReelMark size={28} />
          {!collapsed && (
            <div className="min-w-0">
              <p
                className="font-extrabold text-gray-900 text-sm leading-tight truncate"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                Rainbow Packages
              </p>
              <p className="text-gray-400 text-[11px]">Sheets Inventory System</p>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Quick Actions Button */}
        {onOpenQuickActions && (
          <button
            onClick={() => {
              if (onNavigate) onNavigate();
              onOpenQuickActions();
            }}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5'
            } mb-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer`}
            title="Sheets Quick Actions (1. Create, 2. Update, 3. Inventory)"
          >
            <Sparkles size={18} className="shrink-0 animate-pulse" />
            {!collapsed && <span>Quick Actions</span>}
          </button>
        )}

        {/* Main Menu Section */}
        <div>
          {!collapsed ? (
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-2">
              Main Menu
            </p>
          ) : (
            <div className="h-px bg-gray-200 my-2 mx-1" />
          )}

          <div className="space-y-1">
            <SheetsNavItem
              to="/modules"
              icon={LayoutGrid}
              label="Switch Module"
              collapsed={collapsed}
              onClick={onNavigate}
            />
            <SheetsNavItem
              to="/sheets/dashboard"
              icon={LayoutDashboard}
              label="Sheets Dashboard"
              collapsed={collapsed}
              onClick={onNavigate}
            />
            <SheetsNavItem
              to="/sheets/inventory"
              icon={Boxes}
              label="Sheet Inventory"
              collapsed={collapsed}
              onClick={onNavigate}
            />
            <SheetsNavItem
              to="/sheets/create"
              icon={PlusCircle}
              label="Create Sheet Lot"
              collapsed={collapsed}
              onClick={onNavigate}
            />
            <SheetsNavItem
              to="/sheets/update"
              icon={Scale}
              label="Update Stock / Cut"
              collapsed={collapsed}
              onClick={onNavigate}
            />
          </div>
        </div>
      </nav>

      {/* Footer Info & Sign out */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-0' : 'gap-3 px-3'
          } py-2 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer`}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );
}

// ── NavItem Subcomponent ──────────────────────────────────────────────
function SheetsNavItem({ to, icon: Icon, label, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center ${
          collapsed ? 'justify-center px-0 py-3' : 'justify-between px-3 py-2.5'
        } rounded-xl text-[13px] font-medium transition-all ${
          isActive
            ? 'bg-indigo-50 text-brand-blue-dark ring-1 ring-inset ring-indigo-100 font-bold'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
      title={collapsed ? label : undefined}
    >
      <span className={`relative flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span>{label}</span>}
      </span>
    </NavLink>
  );
}

// ── Sheets Quick Actions Modal (1. Create, 2. Update, 3. Inventory) ───
function SheetsQuickActionsModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-scale-in border border-gray-200">
        {/* Modal Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ReelMark size={24} />
            <div>
              <h2
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                Quick Workspace Actions
              </h2>
              <p className="text-xs text-gray-500">
                Select a task to proceed in Sheets workspace
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

        {/* 3 Action Cards (Create, Update, Inventory) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: Create Sheet Lot */}
          <div
            onClick={() => {
              onClose();
              navigate('/sheets/create');
            }}
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
              <h3
                className="text-sm font-bold text-gray-900 mb-1 group-hover:text-brand-blue transition-colors"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                1. Create Sheet Lot
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Add a new sheet inventory lot with dimensions (L × W), GSM, and caliper specifications.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-brand-blue">
              <span>Create New</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Option 2: Update Stock / Cut */}
          <div
            onClick={() => {
              onClose();
              navigate('/sheets/update');
            }}
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
              <h3
                className="text-sm font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                2. Update Stock / Cut
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Log sheet consumption, die-cutting yield adjustments, trim loss, and production usage.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Update Stock</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Option 3: Sheet Inventory */}
          <div
            onClick={() => {
              onClose();
              navigate('/sheets/inventory');
            }}
            className="group bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200 hover:border-brand-blue hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue-dark text-white flex items-center justify-center shadow-xs">
                  <Boxes size={20} />
                </div>
                <span className="px-2 py-0.5 bg-indigo-100 text-brand-blue-dark text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Option 3
                </span>
              </div>
              <h3
                className="text-sm font-bold text-gray-900 mb-1 group-hover:text-brand-blue-dark transition-colors"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                3. Sheet Inventory
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Inspect all sheet lots in stock, active balances, dimensions, and filterable inventory records.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-brand-blue-dark">
              <span>View Inventory</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
