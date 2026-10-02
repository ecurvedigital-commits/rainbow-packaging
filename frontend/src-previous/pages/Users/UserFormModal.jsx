import React, { useState } from 'react';
import { X, UserPlus, Lock, Mail, User } from 'lucide-react';
import { userApi } from '../../api/userApi';
import ErrorAlert from '../../components/Common/ErrorAlert';

export default function UserFormModal({ user, onClose, onSuccess }) {
  const isEdit = Boolean(user?._id || user?.id);
  const userId = user?._id || user?.id;

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'OPERATOR',
    is_active: user?.is_active ?? true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!isEdit && (!formData.password || formData.password.length < 6)) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          role: formData.role,
          is_active: formData.is_active
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await userApi.updateUser(userId, payload);
      } else {
        await userApi.createUser({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          role: formData.role
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save user details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                {isEdit ? 'Update User Account' : 'Provision New User'}
              </h3>
              <p className="text-xs text-gray-500">
                Assign roles and credentials for Operators, Supervisors, or Admins.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <ErrorAlert message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. operator_john"
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:bg-white text-gray-900"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. john@rainbowpackaging.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:bg-white text-gray-900"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              {isEdit ? 'New Password (Leave blank to keep unchanged)' : 'Password'} {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={isEdit ? '••••••••' : 'Minimum 6 characters'}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:bg-white text-gray-900"
                {...(!isEdit ? { required: true } : {})}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Access Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'OPERATOR', title: 'Operator', desc: 'Usage & scanning' },
                { key: 'SUPERVISOR', title: 'Supervisor', desc: 'Approvals & reports' },
                { key: 'ADMIN', title: 'Admin', desc: 'Full control' }
              ].map((r) => (
                <label
                  key={r.key}
                  className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                    formData.role === r.key
                      ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.key}
                    checked={formData.role === r.key}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-xs font-bold">{r.title}</div>
                  <div className="text-[10px] text-gray-400 font-normal mt-0.5">{r.desc}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Account Active Toggle */}
          {isEdit && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700">
                Account Enabled Status
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
              </label>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-xl transition shadow-xs disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
