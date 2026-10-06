import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Search, Edit3, Trash2, Shield, RefreshCw, AlertCircle, 
  CheckCircle, XCircle, Eye, EyeOff, Copy, Check, Key, Send
} from 'lucide-react';
import { userApi } from '../../api/userApi';
import { useAuth } from '../../auth/AuthContext';
import UserFormModal from './UserFormModal';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import ConfirmModal from '../../components/Common/ConfirmModal';
import Toast from '../../components/Common/Toast';
import { formatDate } from '../../utils/formatters';

export default function UserListPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Modal states
  const [formModalUser, setFormModalUser] = useState(null); // null = closed, {} = new, obj = edit
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter & Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyPassword = (id, pwd) => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;

      const response = await userApi.getUsers(params);
      setUsers(response.data || []);
      if (response.meta?.pagination) {
        setPagination(prev => ({
          ...prev,
          page: response.meta.pagination.page,
          limit: response.meta.pagination.limit,
          total: response.meta.pagination.total,
          totalPages: response.meta.pagination.totalPages
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await userApi.deleteUser(deleteTarget._id || deleteTarget.id);
      setToast({ type: 'success', message: `User "${deleteTarget.username}" deleted successfully.` });
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete user.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SUPERVISOR':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'OPERATOR':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            <Users className="w-5 h-5 text-brand-blue" />
            User Account Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Provision, edit, view passwords, and audit system users for Operators, MIS, and Administrators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setFormModalUser(null);
              setShowFormModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            placeholder="Search username or email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:bg-white text-gray-900"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPagination(p => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:bg-white text-gray-900"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERVISOR">MIS</option>
          <option value="OPERATOR">OPERATOR</option>
        </select>
      </div>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={fetchUsers} />}

      {/* Main Table */}
      {loading ? (
        <LoadingState message="Loading users list..." />
      ) : users.length === 0 ? (
        <EmptyState
          title="No Users Found"
          message="No user accounts match your criteria."
          actionText="Create New User"
          onAction={() => {
            setFormModalUser(null);
            setShowFormModal(true);
          }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Password</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 text-xs">
                {users.map((u) => {
                  const uId = u._id || u.id;
                  const isSelf = uId === (currentUser?._id || currentUser?.id);
                  const isVisible = visiblePasswords[uId];
                  const passwordText = u.plain_password || 'Not Set';

                  return (
                    <tr key={uId} className="hover:bg-blue-50/40 transition">
                      {/* User */}
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                        <span>{u.username}</span>
                        {isSelf && (
                          <span className="px-2 py-0.5 text-[10px] bg-brand-blue/10 text-brand-blue rounded-full font-bold">
                            You
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-gray-600">
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getRoleBadgeClass(u.role)}`}>
                          {u.role === 'SUPERVISOR' ? 'MIS' : u.role}
                        </span>
                      </td>

                      {/* Password Column */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                          <span className="font-mono text-xs font-semibold text-gray-800 select-all min-w-[70px]">
                            {isVisible ? passwordText : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(uId)}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition"
                            title={isVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {u.plain_password && (
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(uId, u.plain_password)}
                              className="p-1 text-gray-400 hover:text-brand-blue hover:bg-gray-200 rounded transition"
                              title="Copy Password"
                            >
                              {copiedId === uId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {u.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(u.created_at || u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/messages/compose?recipient=${u.id || u._id}`)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title={`Send message to ${u.name || u.username}`}
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setFormModalUser(u);
                              setShowFormModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-brand-blue hover:bg-gray-100 rounded-lg transition"
                            title="Edit Credentials & Role"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
            onLimitChange={(l) => setPagination(prev => ({ ...prev, limit: l, page: 1 }))}
          />
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <UserFormModal
          user={formModalUser}
          onClose={() => {
            setShowFormModal(false);
            setFormModalUser(null);
          }}
          onSuccess={() => {
            setShowFormModal(false);
            setFormModalUser(null);
            setToast({
              type: 'success',
              message: formModalUser ? 'User updated successfully.' : 'User account provisioned successfully.'
            });
            fetchUsers();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title={`Delete User "${deleteTarget.username}"?`}
          message="Are you sure you want to delete this user account? This action cannot be undone and will revoke all access for this user."
          confirmText="Delete User"
          type="danger"
          loading={deleteLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
