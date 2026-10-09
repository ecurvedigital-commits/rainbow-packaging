import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { notificationApi } from '../../api/notificationApi';
import { approvalApi } from '../../api/approvalApi';
import ReelMark from '../ReelMark';
import LoginQuickActionsModal from '../Common/LoginQuickActionsModal';
import {
  LayoutDashboard, ClipboardCheck, Boxes, Layers, Users, Settings, LogOut,
  Bell, Menu, ChevronDown, KeyRound, SlidersHorizontal, FileText, Mail, Weight,
  AlertTriangle, ArrowRight, X, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Sparkles,
  MessageSquarePlus,
} from 'lucide-react';

export const AppShell = ({ children }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Login 3-Option Quick Action Modal state
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    // Show quick actions modal on dashboard main page (on every refresh/visit)
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      setShowQuickActions(true);
    }
  }, [location.pathname]);

  // Desktop Sidebar Collapsed State (Persisted in localStorage)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('rp_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('rp_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Login popup: show once per session when pending approvals exist
  const [loginPopup, setLoginPopup] = useState(null); // { count: number }
  const hasShownPopup = useRef(false);

  const normalizedRole = (role || '').toUpperCase().replace(/_/g, ' ');
  const isRoleAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'HEAD ADMIN' || normalizedRole === 'SUPER ADMIN' || normalizedRole === 'ADMINISTRATOR';
  const isRoleSupervisor = normalizedRole === 'SUPERVISOR' || normalizedRole === 'MIS' || isRoleAdmin;

  // Poll notifications and pending count
  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const notifRes = await notificationApi.getUnreadCount();
        if (isMounted && notifRes.success) {
          const count = notifRes.data?.unread_count ?? notifRes.data?.unread ?? 0;
          setUnreadCount(count);
        }

        if (isRoleSupervisor) {
          const appRes = await approvalApi.getPending({ page: 1, limit: 1 });
          if (isMounted && appRes.success) {
            const total = appRes.meta?.pagination?.total ?? appRes.meta?.total ?? 0;
            setPendingCount(total);

            // Show login popup once per session if pending items exist
            if (!hasShownPopup.current && total > 0) {
              hasShownPopup.current = true;
              setLoginPopup({ count: total });
              // Auto-dismiss after 8 seconds
              setTimeout(() => setLoginPopup(null), 8000);
            }
          }
        }
      } catch (err) {
        // Silent catch for background badge updates
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role, isRoleSupervisor]);

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
      '/dashboard': 'Dashboard',
      '/reels': 'Reel Inventory',
      '/reels/create': 'Create Reel',
      '/usage-logs': 'Record Reel Usage',
      '/master-products': 'Master Products',
      '/master-codes': 'Master Codes',
      '/approvals': 'Approvals',
      '/my-approvals': 'My Approvals',
      '/notifications': 'Notifications',
      '/users': 'User Management',
      '/custom-fields': 'Custom Fields',
      '/audit': 'Audit Logs',
      '/digest': 'Daily Digest',
      '/settings': 'System Settings',
      '/change-password': 'Change Password',
    };

    const path = location.pathname;
    let pageTitle = '';

    if (routeTitles[path]) {
      pageTitle = routeTitles[path];
    } else if (path.startsWith('/reels/')) {
      pageTitle = 'Reel Details';
    } else if (path.startsWith('/master-products/')) {
      pageTitle = 'Master Product Details';
    } else {
      const rawName = (path.split('/')[1] || 'Dashboard').replace(/-/g, ' ');
      pageTitle = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }

    document.title = `Rainbow Packages | ${pageTitle}`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Collapsible Desktop sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-64'
          } bg-white border-r border-gray-200 shrink-0 sticky top-0 h-screen transition-all duration-300 ease-in-out z-40`}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          role={role}
          unreadCount={unreadCount}
          pendingCount={pendingCount}
          isRoleAdmin={isRoleAdmin}
          isRoleSupervisor={isRoleSupervisor}
          onLogout={handleLogout}
          onOpenQuickActions={() => setShowQuickActions(true)}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col animate-slide-right shadow-xl">
            <SidebarContent
              collapsed={false}
              role={role}
              unreadCount={unreadCount}
              pendingCount={pendingCount}
              isRoleAdmin={isRoleAdmin}
              isRoleSupervisor={isRoleSupervisor}
              onLogout={handleLogout}
              onNavigate={() => setMobileNavOpen(false)}
              onOpenQuickActions={() => setShowQuickActions(true)}
            />
          </aside>
        </div>
      )}

      {/* Main layout container */}
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
              <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                Rainbow Packages
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-medium text-gray-500 capitalize">
                {(location.pathname.split('/')[1] || 'dashboard').replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Actions Trigger Button (Desktop Only) */}
            <button
              onClick={() => setShowQuickActions(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-full shadow-xs transition-all"
              title="Open Quick Actions Modal (1. Create, 2. Update, 3. Details)"
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
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-red text-white text-[10px] ring-2 ring-white font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-gray-900 leading-tight">{user?.name || user?.username}</p>
                  <p className="text-[10px] font-bold leading-tight uppercase text-brand-blue">{role === 'SUPERVISOR' ? 'MIS' : role}</p>
                </div>
                <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-20 animate-scale-in origin-top-right">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">{user?.name || user?.username}</p>
                      <p className="text-[11px] text-gray-400 truncate">@{user?.username}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/change-password');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <KeyRound size={15} className="text-gray-400" /> Change Password
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

        {/* Page Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children || <Outlet />}
        </main>

        {/* Pending Approvals Login Popup */}
        {loginPopup && (
          <div className="fixed bottom-6 right-6 z-50 w-80 animate-slide-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
              {/* Accent top bar */}
              <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-100 dark:bg-amber-950/50 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Pending Approvals</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {loginPopup.count === 1
                          ? '1 usage log is awaiting your review'
                          : `${loginPopup.count} usage logs are awaiting your review`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLoginPopup(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => { setLoginPopup(null); navigate('/approvals'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition shadow-sm"
                >
                  Go to Approvals
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3-Option Login Quick Actions Modal */}
        <LoginQuickActionsModal
          isOpen={showQuickActions}
          onClose={() => setShowQuickActions(false)}
        />

        {/* Floating Message Button on Bottom Right */}
        <button
          onClick={() => navigate('/messages/compose')}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs rounded-full shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/25"
          title="Send a Message or Reel Correction Request"
        >
          <MessageSquarePlus size={18} className="shrink-0 transition-transform group-hover:rotate-12" />
          <span className="hidden sm:inline">Message</span>
        </button>
      </div>
    </div>
  );
};


const SidebarContent = ({
  collapsed = false,
  onToggleCollapse,
  unreadCount,
  pendingCount,
  isRoleAdmin,
  isRoleSupervisor,
  onLogout,
  onNavigate,
  onOpenQuickActions,
}) => (
  <>
    {/* Header & Collapse Toggle */}
    <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'} h-16 border-b border-gray-200 shrink-0 transition-all duration-300`}>
      <div className="flex items-center gap-3 min-w-0">
        <ReelMark size={28} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-extrabold text-gray-900 text-sm leading-tight truncate" style={{ fontFamily: 'var(--font-family-display)' }}>
              Rainbow Packages
            </p>
            <p className="text-gray-400 text-[11px]">Reel Inventory System</p>
          </div>
        )}
      </div>

      {/* Collapse/Expand Toggle Button (Desktop Only) */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition ${collapsed ? 'mt-0' : ''
            }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      )}
    </div>

    {/* Navigation Items */}
    <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
      {/* QUICK ACTIONS BUTTON */}
      {onOpenQuickActions && (
        <button
          onClick={() => {
            if (onNavigate) onNavigate();
            onOpenQuickActions();
          }}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5'
            } mb-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all`}
          title="Quick Actions (1. Create, 2. Update, 3. Details)"
        >
          <Sparkles size={18} className="shrink-0 animate-pulse" />
          {!collapsed && <span>Quick Actions</span>}
        </button>
      )}

      {/* MAIN NAV SECTION */}
      <div>
        {!collapsed ? (
          <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-2">Main Menu</p>
        ) : (
          <div className="h-px bg-gray-200 my-2 mx-1" />
        )}
        <div className="space-y-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} onClick={onNavigate} />
          <NavItem to="/reels" icon={Boxes} label="Reel Inventory" collapsed={collapsed} onClick={onNavigate} />
          {/* <NavItem to="/master-products" icon={Layers} label="Master Products" collapsed={collapsed} onClick={onNavigate} /> */}
          {isRoleSupervisor && (
            <NavItem to="/master-codes" icon={SlidersHorizontal} label="Master Codes" collapsed={collapsed} onClick={onNavigate} />
          )}
          <NavItem to="/usage-logs" icon={Weight} label="Record Reel Usage" collapsed={collapsed} onClick={onNavigate} />
          {isRoleSupervisor ? (
            <NavItem
              to="/approvals"
              icon={ClipboardCheck}
              label="Approvals"
              badgeCount={pendingCount}
              badgeColor="bg-amber-500 text-gray-900"
              collapsed={collapsed}
              onClick={onNavigate}
            />
          ) : (
            <NavItem
              to="/my-approvals"
              icon={ClipboardCheck}
              label="My Approvals"
              collapsed={collapsed}
              onClick={onNavigate}
            />
          )}
          <NavItem
            to="/notifications"
            icon={Bell}
            label="Notifications"
            badgeCount={unreadCount}
            badgeColor="bg-red-500 text-white"
            collapsed={collapsed}
            onClick={onNavigate}
          />
        </div>
      </div>

      {/* ADMINISTRATION SECTION */}
      {isRoleAdmin && (
        <div>
          {!collapsed ? (
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-2">Administration</p>
          ) : (
            <div className="h-px bg-gray-200 my-2 mx-1" />
          )}
          <div className="space-y-1">
            <NavItem to="/users" icon={Users} label="User Management" collapsed={collapsed} onClick={onNavigate} />
            <NavItem to="/custom-fields" icon={SlidersHorizontal} label="Custom Fields" collapsed={collapsed} onClick={onNavigate} />
            <NavItem to="/audit" icon={FileText} label="Audit Logs" collapsed={collapsed} onClick={onNavigate} />
            <NavItem to="/digest" icon={Mail} label="Daily Digest" collapsed={collapsed} onClick={onNavigate} />
            <NavItem to="/settings" icon={Settings} label="System Settings" collapsed={collapsed} onClick={onNavigate} />
          </div>
        </div>
      )}
    </nav>

    {/* Footer Logout */}
    <div className="p-3 border-t border-gray-200 shrink-0">
      <button
        onClick={onLogout}
        title={collapsed ? 'Sign out' : undefined}
        className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'
          } py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors text-[13px] font-medium`}
      >
        <LogOut size={16} />
        {!collapsed && <span>Sign out</span>}
      </button>
    </div>
  </>
);

const NavItem = ({
  to,
  icon: Icon,
  label,
  badgeCount = 0,
  badgeColor = 'bg-brand-blue text-white',
  collapsed = false,
  onClick,
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      `relative flex items-center ${collapsed ? 'justify-center px-0 py-3' : 'justify-between px-3 py-2.5'
      } rounded-xl text-[13px] font-medium transition-all ${isActive
        ? 'bg-indigo-50 text-brand-blue-dark ring-1 ring-inset ring-indigo-100 font-bold'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`
    }
  >
    <span className={`relative flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
      {/* Collapsed Badge Number */}
      {collapsed && badgeCount > 0 && (
        <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[18px] h-[18px] text-[10px] font-black rounded-full bg-red-500 text-white flex items-center justify-center shadow-xs">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </span>

    {/* Expanded Badge Counter */}
    {!collapsed && badgeCount > 0 && (
      <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${badgeColor} shadow-xs shrink-0`}>
        {badgeCount > 99 ? '99+' : badgeCount}
      </span>
    )}
  </NavLink>
);

export default AppShell;
