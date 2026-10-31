import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleGuard from './auth/RoleGuard';
import AppShell from './components/Layout/AppShell';

// Common Core Pages
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ModuleSelectPage from './pages/Modules/ModuleSelectPage';
import OthersDashboardPage from './pages/Modules/OthersDashboardPage';
import SampleDashboardPage from './pages/Modules/SampleDashboardPage';
import ApprovalsPage from './pages/Approvals/ApprovalsPage';
import OperatorApprovalsPage from './pages/Approvals/OperatorApprovalsPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import NotificationDetailPage from './pages/Notifications/NotificationDetailPage';
import UserListPage from './pages/Users/UserListPage';
import CustomFieldsPage from './pages/CustomFields/CustomFieldsPage';
import AuditLogsPage from './pages/Audit/AuditLogsPage';
import DailyDigestPage from './pages/Digest/DailyDigestPage';
import DigestBreakdownPage from './pages/Digest/DigestBreakdownPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ChangePasswordPage from './pages/ChangePassword/ChangePasswordPage';
import ComposeMessagePage from './pages/Messages/ComposeMessagePage';
import ForbiddenPage from './pages/Errors/ForbiddenPage';
import NotFoundPage from './pages/Errors/NotFoundPage';

// Domain Module: Reels
import ReelListPage from './modules/reels/pages/ReelListPage';
import CreateReelPage from './modules/reels/pages/CreateReelPage';
import ReelDetailPage from './modules/reels/pages/ReelDetailPage';
import UsageLogsPage from './modules/reels/pages/UsageLogsPage';
import MasterProductListPage from './modules/reels/pages/MasterProductListPage';
import MasterProductDetailPage from './modules/reels/pages/MasterProductDetailPage';
import MasterCodeListPage from './modules/reels/pages/MasterCodeListPage';
import MasterCodeDetailPage from './modules/reels/pages/MasterCodeDetailPage';

// Domain Module: Sheets
import {
  SheetsAppShell,
  SheetsDashboardPage,
  SheetsPage,
  CreateSheetPage,
  UpdateSheetPage,
} from './modules/sheets';

// Domain Module: Finished Boxes (New Category Placeholder)
import FinishedBoxesPage from './modules/finished-boxes/pages/FinishedBoxesPage';
import FinishedBoxesDashboardPage from './modules/finished-boxes/pages/FinishedBoxesDashboardPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* 403 Forbidden Route */}
        <Route path="/403" element={<ForbiddenPage />} />

        {/* Root Redirect to Standalone Module Selector */}
        <Route path="/" element={<Navigate to="/modules" replace />} />

        {/* 1. Standalone Module Selection Screen (Outside AppShell) */}
        <Route
          path="/modules"
          element={
            <ProtectedRoute>
              <ModuleSelectPage />
            </ProtectedRoute>
          }
        />

        {/* 2. Authenticated Sheets Operational Workspace (Inside SheetsAppShell) */}
        <Route
          element={
            <ProtectedRoute>
              <SheetsAppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/sheets" element={<Navigate to="/sheets/dashboard" replace />} />
          <Route path="/sheets/dashboard" element={<SheetsDashboardPage />} />
          <Route path="/sheets/inventory" element={<SheetsPage />} />
          <Route path="/sheets/create" element={<CreateSheetPage />} />
          <Route path="/sheets/update" element={<UpdateSheetPage />} />
        </Route>

        {/* 3. Placeholder for Future Modules (Outside AppShell) */}
        <Route
          path="/others/dashboard"
          element={
            <ProtectedRoute>
              <OthersDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/finished-boxes/dashboard" element={<Navigate to="/others/dashboard" replace />} />
        <Route path="/sample/dashboard" element={<Navigate to="/others/dashboard" replace />} />

        {/* 4. Authenticated Reels Operational Workspace (Inside AppShell) */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Proper Operational Reels Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reels/dashboard" element={<DashboardPage />} />

          {/* Reels Inventory Routes */}
          <Route path="/reels" element={<ReelListPage />} />
          <Route path="/reels/create" element={<CreateReelPage />} />
          <Route path="/reels/:id" element={<ReelDetailPage />} />
          <Route path="/usage-logs" element={<UsageLogsPage />} />

          {/* Reel Domain: Master Products */}
          <Route path="/master-products" element={<MasterProductListPage />} />
          <Route path="/master-products/:id" element={<MasterProductDetailPage />} />

          {/* Reel Domain: Master Codes Management (Supervisors & Admins) */}
          <Route
            path="/master-codes"
            element={
              <RoleGuard allowedRoles={['SUPERVISOR', 'ADMIN']}>
                <MasterCodeListPage />
              </RoleGuard>
            }
          />
          <Route
            path="/master-codes/:id"
            element={
              <RoleGuard allowedRoles={['SUPERVISOR', 'ADMIN']}>
                <MasterCodeDetailPage />
              </RoleGuard>
            }
          />

          {/* Sheets & Finished Boxes Inventory Scaffolds */}
          <Route path="/sheets" element={<SheetsPage />} />
          <Route path="/finished-boxes" element={<FinishedBoxesPage />} />

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

          {/* Notifications & Messaging */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notifications/:id" element={<NotificationDetailPage />} />
          <Route path="/messages/compose" element={<ComposeMessagePage />} />
          <Route path="/messages/new" element={<ComposeMessagePage />} />
          <Route path="/messages" element={<ComposeMessagePage />} />

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
          <Route
            path="/digest/breakdown"
            element={
              <RoleGuard allowedRoles={['SUPERVISOR', 'ADMIN']}>
                <DigestBreakdownPage />
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
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
