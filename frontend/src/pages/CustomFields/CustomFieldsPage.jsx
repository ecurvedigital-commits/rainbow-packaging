import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Trash2, Edit3, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import { fieldDefinitionApi } from '../../api/fieldDefinitionApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import ConfirmModal from '../../components/Common/ConfirmModal';
import Toast from '../../components/Common/Toast';

export default function CustomFieldsPage() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'TEXT',
    options: '',
    required: false
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fieldDefinitionApi.getFieldDefinitions();
      setFields(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch custom field definitions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleOpenCreate = () => {
    setEditingField(null);
    setFormData({
      name: '',
      label: '',
      type: 'TEXT',
      options: '',
      required: false
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (field) => {
    setEditingField(field);
    setFormData({
      name: field.name || '',
      label: field.label || '',
      type: field.type || 'TEXT',
      options: Array.isArray(field.options) ? field.options.join(', ') : field.options || '',
      required: field.required ?? false
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.label.trim()) {
      setFormError('Name and Label are required.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: formData.name.trim().toLowerCase().replace(/\s+/g, '_'),
        label: formData.label.trim(),
        type: formData.type,
        required: formData.required,
        options: formData.type === 'SELECT'
          ? formData.options.split(',').map(s => s.trim()).filter(Boolean)
          : undefined
      };

      if (editingField) {
        await fieldDefinitionApi.updateFieldDefinition(editingField._id, payload);
        setToast({ type: 'success', message: 'Custom field updated successfully.' });
      } else {
        await fieldDefinitionApi.createFieldDefinition(payload);
        setToast({ type: 'success', message: 'Custom field created successfully.' });
      }
      setShowModal(false);
      fetchFields();
    } catch (err) {
      setFormError(err.message || 'Failed to save field definition.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fieldDefinitionApi.deleteFieldDefinition(deleteTarget._id);
      setToast({ type: 'success', message: 'Custom field deleted successfully.' });
      setDeleteTarget(null);
      fetchFields();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete custom field.' });
    } finally {
      setDeleteLoading(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Custom Field Schema Definition
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Define dynamic attributes for reels (e.g. Core Diameter, Flute Type, Moisture % Quality Check).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchFields}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Field</span>
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && <ErrorAlert message={error} onRetry={fetchFields} />}

      {/* List / Table */}
      {loading ? (
        <LoadingState message="Loading field definitions..." />
      ) : fields.length === 0 ? (
        <EmptyState
          title="No Custom Fields Configured"
          message="Create schema fields to allow operators to capture additional batch or quality properties."
          actionText="Add Custom Field"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-3">Label</th>
                <th className="px-6 py-3">Field Key (System)</th>
                <th className="px-6 py-3">Data Type</th>
                <th className="px-6 py-3">Options / Constraints</th>
                <th className="px-6 py-3">Required</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
              {fields.map((f) => (
                <tr key={f._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                    {f.label}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                    {f.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded">
                      {f.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {f.type === 'SELECT' && Array.isArray(f.options)
                      ? f.options.join(', ')
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {f.required ? (
                      <span className="text-xs text-amber-600 font-semibold">Yes</span>
                    ) : (
                      <span className="text-xs text-slate-400">Optional</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(f)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(f)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingField ? 'Edit Field Definition' : 'Create Custom Field'}
            </h3>

            {formError && <ErrorAlert message={formError} />}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Field Label *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData(p => ({
                    ...p,
                    label: e.target.value,
                    name: editingField ? p.name : e.target.value.toLowerCase().replace(/\s+/g, '_')
                  }))}
                  placeholder="e.g. Core Diameter (mm)"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  System Field Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. core_diameter_mm"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Field Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                >
                  <option value="TEXT">TEXT</option>
                  <option value="NUMBER">NUMBER</option>
                  <option value="SELECT">SELECT (Dropdown)</option>
                  <option value="BOOLEAN">BOOLEAN (Yes/No)</option>
                </select>
              </div>

              {formData.type === 'SELECT' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Dropdown Options (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.options}
                    onChange={(e) => setFormData(p => ({ ...p, options: e.target.value }))}
                    placeholder="e.g. Grade A, Grade B, Grade C"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={formData.required}
                  onChange={(e) => setFormData(p => ({ ...p, required: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="required" className="text-sm text-slate-700 dark:text-slate-300">
                  Mandatory field when creating reels
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium"
                >
                  {formLoading ? 'Saving...' : 'Save Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title={`Delete Field "${deleteTarget.label}"?`}
          message="Deleting this field definition will remove it from future reel creation forms."
          confirmText="Delete Field"
          type="danger"
          loading={deleteLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
