import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { notificationApi } from '../../api/notificationApi';
import { approvalApi } from '../../api/approvalApi';
import ReelMark from '../ReelMark';
import {
  LayoutDashboard, ClipboardCheck, Boxes, Layers, Users, Settings, LogOut,
  Bell, Menu, ChevronDown, KeyRound, SlidersHorizontal, FileText, Mail, Weight
} from 'lucide-react';

export const AppShell = ({ children }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const normalizedRole = (role || '').toUpperCase().replace(/_/g, ' ');
  const isRoleAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'HEAD ADMIN' || normalizedRole === 'SUPER ADMIN' || normalizedRole === 'ADMINISTRATOR';
  const isRoleSupervisor = normalizedRole === 'SUPERVISOR' || isRoleAdmin;

  // Poll notifications and pending count
  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const notifRes = await notificationApi.getUnreadCount();
        if (isMounted && notifRes.success) {
          setUnreadCount(notifRes.data?.unread_count || 0);
        }

        if (isRoleSupervisor) {
          const appRes = await approvalApi.getPending(1, 1);
          if (isMounted && appRes.success) {
            setPendingCount(appRes.meta?.total || 0);
          }
        }
      } catch (err) {
        // Silent catch for background badge updates
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role, isRoleSupervisor, location.pathname]);

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

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-brand-navy shrink-0 sticky top-0 h-screen">
        <SidebarContent
          role={role}
          unreadCount={unreadCount}
          pendingCount={pendingCount}
          isRoleAdmin={isRoleAdmin}
          isRoleSupervisor={isRoleSupervisor}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-brand-navy flex flex-col animate-slide-right">
            <SidebarContent
              role={role}
              unreadCount={unreadCount}
              pendingCount={pendingCount}
              isRoleAdmin={isRoleAdmin}
              isRoleSupervisor={isRoleSupervisor}
              onLogout={handleLogout}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main layout container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 capitalize" style={{ fontFamily: 'var(--font-family-display)' }}>
                Rainbow Packages
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-semibold text-gray-500 capitalize">
                {location.pathname.replace('/', '') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell Shortcut */}
            <NavLink
              to="/notifications"
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
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
                  <p className="text-[10px] font-bold leading-tight uppercase text-brand-blue">{role}</p>
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
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};


const SidebarContent = ({
  unreadCount,
  pendingCount,
  isRoleAdmin,
  isRoleSupervisor,
  onLogout,
  onNavigate,
}) => (
  <>
    <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 shrink-0">
      <div className="bg-brand-blue p-2 rounded-xl text-white shrink-0 shadow-xs">
        <ReelMark size={20} />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-white text-sm leading-tight truncate" style={{ fontFamily: 'var(--font-family-display)' }}>
          Rainbow Packages
        </p>
        <p className="text-white/40 text-[11px]">Reel Inventory System</p>
      </div>
    </div>

    <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
      {/* MAIN NAV SECTION */}
      <div>
        <p className="px-3 text-[10px] font-bold text-white/35 uppercase tracking-wider mb-2">Main Menu</p>
        <div className="space-y-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onNavigate} />
          <NavItem to="/reels" icon={Boxes} label="Reel Inventory" onClick={onNavigate} />
          <NavItem to="/master-products" icon={Layers} label="Master Products" onClick={onNavigate} />
          <NavItem to="/usage-logs" icon={Weight} label="Record Reel Usage" onClick={onNavigate} />
          {isRoleSupervisor && (
            <NavItem
              to="/approvals"
              icon={ClipboardCheck}
              label="Approvals"
              badgeCount={pendingCount}
              badgeColor="bg-amber-500 text-gray-900"
              onClick={onNavigate}
            />
          )}
          <NavItem
            to="/notifications"
            icon={Bell}
            label="Notifications"
            badgeCount={unreadCount}
            badgeColor="bg-red-500 text-white"
            onClick={onNavigate}
          />
        </div>
      </div>

      {/* ADMINISTRATION SECTION */}
      {isRoleAdmin && (
        <div>
          <p className="px-3 text-[10px] font-bold text-white/35 uppercase tracking-wider mb-2">Administration</p>
          <div className="space-y-1">
            <NavItem to="/users" icon={Users} label="User Management" onClick={onNavigate} />
            <NavItem to="/custom-fields" icon={SlidersHorizontal} label="Custom Fields" onClick={onNavigate} />
            <NavItem to="/audit" icon={FileText} label="Audit Logs" onClick={onNavigate} />
            <NavItem to="/digest" icon={Mail} label="Daily Digest" onClick={onNavigate} />
            <NavItem to="/settings" icon={Settings} label="System Settings" onClick={onNavigate} />
          </div>
        </div>
      )}
    </nav>

    {/* Footer Logout */}
    <div className="p-3 border-t border-white/10 shrink-0">
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-colors text-xs font-semibold"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  </>
);

const NavItem = ({ to, icon: Icon, label, badgeCount = 0, badgeColor = 'bg-brand-blue text-white', onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
        isActive
          ? 'bg-brand-blue text-white shadow-xs'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`
    }
  >
    <span className="flex items-center gap-2.5">
      <Icon size={17} />
      <span>{label}</span>
    </span>
    {badgeCount > 0 && (
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeColor}`}>
        {badgeCount}
      </span>
    )}
  </NavLink>
);

export default AppShell;
