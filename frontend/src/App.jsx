import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleGuard from './auth/RoleGuard';
import AppShell from './components/Layout/AppShell';

// Pages
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ReelListPage from './pages/Reels/ReelListPage';
import ReelDetailPage from './pages/Reels/ReelDetailPage';
import UsageLogsPage from './pages/Reels/UsageLogsPage';
import MasterProductListPage from './pages/MasterProducts/MasterProductListPage';
import MasterProductDetailPage from './pages/MasterProducts/MasterProductDetailPage';
import MasterCodeListPage from './pages/MasterCodes/MasterCodeListPage';
import ApprovalsPage from './pages/Approvals/ApprovalsPage';
import OperatorApprovalsPage from './pages/Approvals/OperatorApprovalsPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import UserListPage from './pages/Users/UserListPage';
import CustomFieldsPage from './pages/CustomFields/CustomFieldsPage';
import AuditLogsPage from './pages/Audit/AuditLogsPage';
import DailyDigestPage from './pages/Digest/DailyDigestPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ChangePasswordPage from './pages/ChangePassword/ChangePasswordPage';
import ForbiddenPage from './pages/Errors/ForbiddenPage';
import NotFoundPage from './pages/Errors/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* 403 Forbidden Route */}
        <Route path="/403" element={<ForbiddenPage />} />

        {/* Authenticated Application Shell Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Reel Inventory Routes */}
          <Route path="/reels" element={<ReelListPage />} />
          <Route path="/reels/:id" element={<ReelDetailPage />} />
          <Route path="/usage-logs" element={<UsageLogsPage />} />

          {/* Master Product Inventory Routes */}
          <Route path="/master-products" element={<MasterProductListPage />} />
          <Route path="/master-products/:id" element={<MasterProductDetailPage />} />

          {/* Master Codes Management (Supervisors & Admins) */}
          <Route
            path="/master-codes"
            element={
              <RoleGuard allowedRoles={['SUPERVISOR', 'ADMIN']}>
                <MasterCodeListPage />
              </RoleGuard>
            }
          />

          {/* Approvals (Supervisors & Admins) */}
          <Route
            path="/approvals"
            element={
              <RoleGuard allowedRoles={['SUPERVISOR', 'ADMIN']}>
                <ApprovalsPage />
              </RoleGuard>
            }
          />

          {/* Operator Approvals / My Submitted Approvals */}
          <Route path="/my-approvals" element={<OperatorApprovalsPage />} />

          {/* Notifications */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* User Account Management (Admin Only) */}
          <Route
            path="/users"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <UserListPage />
              </RoleGuard>
            }
          />

          {/* Custom Schema Field Definitions (Admin Only) */}
          <Route
            path="/custom-fields"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <CustomFieldsPage />
              </RoleGuard>
            }
          />

          {/* Audit Logs (Admin Only) */}
          <Route
            path="/audit"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AuditLogsPage />
              </RoleGuard>
            }
          />

          {/* Daily Digest Report (Supervisor & Admin) */}
          <Route
            path="/digest"
            element={
              <RoleGuard allowedRoles={['SUPERVISOR', 'ADMIN']}>
                <DailyDigestPage />
              </RoleGuard>
            }
          />

          {/* System Inventory Settings (Admin Only) */}
          <Route
            path="/settings"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <SettingsPage />
              </RoleGuard>
            }
          />

          {/* Change Password */}
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* Root Redirect to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
