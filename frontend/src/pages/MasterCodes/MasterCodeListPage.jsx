import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterCodeApi } from '../../api/masterCodeApi';
import { useAuth } from '../../auth/AuthContext';
import {
  Layers, Plus, Search, RefreshCw, AlertCircle, Edit, Trash2, CheckCircle2, XCircle,
  X, Save, Loader2, Eye
} from 'lucide-react';

const inputClass = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow';
const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1';

export const MasterCodeListPage = () => {
  const navigate = useNavigate();
  const { isRoleAdmin, isRoleSupervisor } = useAuth();

  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    master_code: '',
    master_code_name: '',
    quality: 'VK',
    gsm: 150,
    bf: 18,
    size: 100,
    description: '',
    status: 'ACTIVE',
  });

  const loadCodes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await masterCodeApi.list({ q: search });
      if (res.success && Array.isArray(res.data)) {
        setCodes(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load master codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, [search]);

  const handleOpenCreateModal = () => {
    setEditingCode(null);
    setFormError('');
    // Auto calculate next code number
    const maxNum = codes.reduce((acc, c) => {
      const n = parseInt(c.master_code, 10);
      return !isNaN(n) && n > acc ? n : acc;
    }, 18);

    setFormData({
      master_code: String(maxNum + 1),
      master_code_name: '',
      quality: '',
      gsm: '',
      bf: '',
      size: '',
      description: '',
      status: 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingCode(item);
    setFormError('');
    setFormData({
      master_code: item.master_code,
      master_code_name: item.master_code_name,
      quality: item.quality,
      gsm: item.gsm,
      bf: item.bf,
      size: item.size,
      description: item.description || '',
      status: item.status,
    });
    setModalOpen(true);
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingCode) {
        await masterCodeApi.update(editingCode.master_code_id || editingCode.id, formData);
      } else {
        await masterCodeApi.create(formData);
      }
      setSubmitting(false);
      setModalOpen(false);
      loadCodes();
    } catch (err) {
      setSubmitting(false);
      setFormError(err.message || 'Failed to save master code.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete Master Code '${item.master_code}'?`)) return;
    try {
      await masterCodeApi.delete(item.master_code_id || item.id);
      loadCodes();
    } catch (err) {
      alert(err.message || 'Failed to delete master code.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-blue to-indigo-700 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-200" />
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-family-display)' }}>
              Master Codes Catalog (Material Classification)
            </h1>
          </div>
          <p className="text-xs text-indigo-100 mt-1 max-w-2xl">
            Manage business-facing Master Codes (1–19, 20+). Define material qualities, GSM, BF, and Sizes for easy selection on the shop floor.
          </p>
        </div>

        {isRoleSupervisor && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-white text-brand-blue hover:bg-indigo-50 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition shrink-0"
          >
            <Plus size={16} />
            Create New Master Code
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search master code, material name, quality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        <button
          onClick={loadCodes}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
          title="Refresh List"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs flex justify-center items-center gap-2">
            <Loader2 size={18} className="animate-spin text-brand-blue" />
            Loading Master Codes catalog...
          </div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            No Master Codes found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Master Code</th>
                  <th className="py-3.5 px-4">Material / Category Name</th>
                  <th className="py-3.5 px-4">Quality</th>
                  <th className="py-3.5 px-4">GSM</th>
                  <th className="py-3.5 px-4">BF</th>
                  <th className="py-3.5 px-4">Size (cm)</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isRoleSupervisor && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {codes.map((item) => (
                  <tr
                    key={item.master_code_id || item.id}
                    onClick={() => navigate(`/master-codes/${item.master_code_id || item.id || item.master_code}`)}
                    className="hover:bg-indigo-50/70 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-brand-blue font-mono">
                      Code {item.master_code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                      {item.master_code_name}
                      {item.description && (
                        <p className="text-[11px] text-gray-400 font-normal mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold">{item.quality || '-'}</td>
                    <td className="py-3.5 px-4 font-mono">{item.gsm ? `${item.gsm} GSM` : '-'}</td>
                    <td className="py-3.5 px-4 font-mono">{item.bf ? `${item.bf} BF` : '-'}</td>
                    <td className="py-3.5 px-4 font-mono">{item.size ? `${item.size} cm` : '-'}</td>
                    <td className="py-3.5 px-4">
                      {item.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 size={12} /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          <XCircle size={12} /> INACTIVE
                        </span>
                      )}
                    </td>
                    {isRoleSupervisor && (
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/master-codes/${item.master_code_id || item.id || item.master_code}`);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="View Master Code Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(item);
                            }}
                            className="p-1.5 text-gray-400 hover:text-brand-blue hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Master Code"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Master Code"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-scale-in flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                {editingCode ? `Edit Master Code ${editingCode.master_code}` : 'Create New Master Code'}
              </h3>
              <button onClick={() => setModalOpen(false)} disabled={submitting} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle size={15} /> {formError}
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Master Code *</label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    placeholder="e.g. 20"
                    value={formData.master_code}
                    onChange={(e) => setFormData({ ...formData, master_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Quality</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. duplex, sk, vk, fbb, sbs"
                    value={formData.quality}
                    onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Material / Category Name *</label>
                <input
                  required
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Duplex ultra 220"
                  value={formData.master_code_name}
                  onChange={(e) => setFormData({ ...formData, master_code_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>GSM</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. 220, 230/240, 250+"
                    value={formData.gsm}
                    onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>BF</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. ultra, dcb, spectra, 18"
                    value={formData.bf}
                    onChange={(e) => setFormData({ ...formData, bf: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Size</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. 100, 110 or custom"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Optional details or material note"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Status *</label>
                <select
                  className={inputClass}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} disabled={submitting} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark flex items-center gap-2 shadow-xs">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {submitting ? 'Saving…' : 'Save Master Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterCodeListPage;
