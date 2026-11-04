import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import {
  FileText, Plus, Trash2, ArrowLeft, Save, Send, AlertTriangle,
  Building2, Calendar, User, Phone, Layers, CheckCircle2, Info
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import { roundTwoDecimals } from '../../sheets/utils/sheetCalculations';

export default function CreatePurchaseOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: paramId } = useParams();
  const editId = searchParams.get('editId') || paramId;
  const { user } = useAuth();

  const [loading, setLoading] = useState(Boolean(editId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [existingPoNo, setExistingPoNo] = useState(null);

  // Autocomplete options
  const [options, setOptions] = useState({ suppliers: [], clients: [], jobs: [] });

  // PO Header Form
  const [poDate, setPoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneEmail, setPhoneEmail] = useState('');
  const [notes, setNotes] = useState('');

  // PO Items (Initial 1 item)
  const [items, setItems] = useState([
    {
      id: 1,
      client_name: '',
      job_name: '',
      deckle: '',
      cutting: '',
      gsm: '',
      ordered_quantity: '',
    },
  ]);

  // Load existing data if edit mode
  useEffect(() => {
    async function loadPoForEdit() {
      if (!editId) return;
      try {
        setLoading(true);
        const res = await purchaseOrderApi.getById(editId);
        if (res.success && res.data) {
          const po = res.data;
          setExistingPoNo(po.po_no);
          setPoDate(po.po_date ? po.po_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
          setDeliveryDate(po.delivery_date ? po.delivery_date.slice(0, 10) : '');
          setPaymentTerms(po.payment_terms || '');
          setSupplierName(po.supplier_name || '');
          setContactPerson(po.contact_person || '');
          setPhoneEmail(po.phone_email || '');
          setNotes(po.notes || '');

          if (Array.isArray(po.items) && po.items.length > 0) {
            setItems(
              po.items.map((it, idx) => ({
                id: it._id || idx + 1,
                client_name: it.client_name,
                job_name: it.job_name,
                deckle: String(it.deckle),
                cutting: String(it.cutting),
                gsm: String(it.gsm),
                ordered_quantity: String(it.ordered_quantity),
              }))
            );
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load purchase order for editing');
      } finally {
        setLoading(false);
      }
    }

    loadPoForEdit();
  }, [editId]);

  // Load autocompletion options
  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await purchaseOrderApi.getFilterOptions();
        if (res.success && res.data) {
          setOptions(res.data);
        }
      } catch (_err) {
        // non-blocking
      }
    }
    fetchOptions();
  }, []);

  // Item row operations
  const handleAddItem = () => {
    if (items.length >= 20) {
      alert('Maximum 20 line items allowed per Purchase Order according to company voucher format.');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        client_name: '',
        job_name: '',
        deckle: '',
        cutting: '',
        gsm: '',
        ordered_quantity: '',
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert('A Purchase Order must contain at least 1 line item.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Live item weight and total calculations
  const calculatedItems = useMemo(() => {
    return items.map((item, idx) => {
      const d = parseFloat(item.deckle) || 0;
      const c = parseFloat(item.cutting) || 0;
      const g = parseFloat(item.gsm) || 0;
      const q = parseInt(item.ordered_quantity, 10) || 0;

      let weight = 0;
      if (d > 0 && c > 0 && g > 0 && q > 0) {
        weight = roundTwoDecimals((d * c * g * q) / 10000000);
      }

      return {
        ...item,
        sr_no: idx + 1,
        weight,
        isValid:
          item.client_name.trim() !== '' &&
          item.job_name.trim() !== '' &&
          d > 0 &&
          c > 0 &&
          g > 0 &&
          q > 0,
      };
    });
  }, [items]);

  const totalCalculatedQuantity = useMemo(() => {
    return calculatedItems.reduce((sum, item) => sum + (parseInt(item.ordered_quantity, 10) || 0), 0);
  }, [calculatedItems]);

  const totalCalculatedWeight = useMemo(() => {
    return roundTwoDecimals(calculatedItems.reduce((sum, item) => sum + item.weight, 0));
  }, [calculatedItems]);

  const handleSubmit = async (andSubmitForApproval = false) => {
    setError(null);

    // Header validations
    if (!supplierName.trim()) {
      setError('Supplier Name is required.');
      return;
    }
    if (!deliveryDate) {
      setError('Delivery Date is required.');
      return;
    }

    // Line items validations
    if (calculatedItems.length === 0) {
      setError('Please add at least 1 line item.');
      return;
    }
    if (calculatedItems.length > 20) {
      setError('Maximum 20 line items allowed per Purchase Order.');
      return;
    }

    for (let i = 0; i < calculatedItems.length; i++) {
      const it = calculatedItems[i];
      if (!it.client_name.trim()) {
        setError(`Item #${i + 1}: Client Name is required.`);
        return;
      }
      if (!it.job_name.trim()) {
        setError(`Item #${i + 1}: Job Name is required.`);
        return;
      }
      if (!(parseFloat(it.deckle) > 0)) {
        setError(`Item #${i + 1}: Deckle (cm) must be a positive number.`);
        return;
      }
      if (!(parseFloat(it.cutting) > 0)) {
        setError(`Item #${i + 1}: Cutting (cm) must be a positive number.`);
        return;
      }
      if (!(parseFloat(it.gsm) > 0)) {
        setError(`Item #${i + 1}: GSM must be a positive whole number.`);
        return;
      }
      if (!(parseInt(it.ordered_quantity, 10) > 0)) {
        setError(`Item #${i + 1}: Quantity must be a positive whole number.`);
        return;
      }
    }

    const payload = {
      po_date: poDate,
      delivery_date: deliveryDate,
      payment_terms: paymentTerms.trim(),
      supplier_name: supplierName.trim(),
      contact_person: contactPerson.trim(),
      phone_email: phoneEmail.trim(),
      notes: notes.trim(),
      items: calculatedItems.map((it) => ({
        client_name: it.client_name.trim(),
        job_name: it.job_name.trim(),
        deckle: parseFloat(it.deckle),
        cutting: parseFloat(it.cutting),
        gsm: parseInt(it.gsm, 10),
        ordered_quantity: parseInt(it.ordered_quantity, 10),
      })),
    };

    setSubmitting(true);
    try {
      let savedPo;
      if (editId) {
        const res = await purchaseOrderApi.update(editId, payload);
        if (!res.success) throw new Error(res.error?.message || 'Failed to update Purchase Order');
        savedPo = res.data;
      } else {
        const res = await purchaseOrderApi.create(payload);
        if (!res.success) throw new Error(res.error?.message || 'Failed to create Purchase Order');
        savedPo = res.data;
      }

      // If user clicked "Save & Submit for Approval"
      const targetId = savedPo?.id || savedPo?._id || editId;
      if (andSubmitForApproval && targetId) {
        await purchaseOrderApi.submitForApproval(targetId);
      }

      navigate(`/sheets/purchase-orders/${targetId}`);
    } catch (err) {
      setError(err.message || 'Error saving Purchase Order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
        <p className="animate-pulse">Loading Purchase Order details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ── Breadcrumb & Top Bar ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/sheets/purchase-orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchase Orders</span>
        </Link>

        <div className="text-xs text-gray-400 font-mono">
          {existingPoNo ? `Editing: ${existingPoNo}` : 'New PO Draft'}
        </div>
      </div>

      {/* ── Main Voucher Sheet Container ───────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        {/* ── Section A: Company Identity Header ────────────────────── */}
        <div className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white px-8 py-6 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold mb-2">
            RP
          </div>
          <h1
            className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            RAINBOW PACKAGING INDUSTRY PVT. LTD.
          </h1>
          <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase mt-0.5">
            SIDCUL, HARIDWAR
          </p>
          <div className="inline-block px-4 py-1 mt-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-xs uppercase tracking-widest shadow-2xs">
            {existingPoNo ? `PURCHASE ORDER: ${existingPoNo}` : 'PURCHASE ORDER'}
          </div>
        </div>

        {/* ── Form Body ────────────────────────────────────────────── */}
        <div className="p-6 sm:p-8 space-y-7">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Section B & C: PO Metadata & Supplier Grid ───────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/70 p-5 rounded-xl border border-gray-200/80">
            {/* Left: Purchase Order Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-200 pb-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                PO Information
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    disabled
                    value={existingPoNo || 'Auto-generated on Save'}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    PO Date
                  </label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Delivery Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 30 Days Net"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Right: Supplier Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-200 pb-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                Supplier Details
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="suppliers-list"
                    required
                    placeholder="Enter or select vendor / mill name"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                  />
                  <datalist id="suppliers-list">
                    {options.suppliers?.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mr. Sharma"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Phone / Email
                    </label>
                    <input
                      type="text"
                      placeholder="Phone or email"
                      value={phoneEmail}
                      onChange={(e) => setPhoneEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section D: Purchase Order Items (Up to 20 Rows) ─────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Line Items Specification ({items.length}/20 Rows)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Weight (KG) is automatically previewed using{' '}
                  <span className="font-mono text-emerald-800">(Deckle × Cutting × GSM × Quantity) / 10,000,000</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                disabled={items.length >= 20}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-gray-100/80 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">Sr.</th>
                    <th className="px-3 py-2.5 w-44">Client Name</th>
                    <th className="px-3 py-2.5 w-44">Job Name</th>
                    <th className="px-3 py-2.5 w-28 text-center">Deckle (cm)</th>
                    <th className="px-3 py-2.5 w-28 text-center">Cutting (cm)</th>
                    <th className="px-3 py-2.5 w-20 text-center">GSM</th>
                    <th className="px-3 py-2.5 w-24 text-right">Quantity</th>
                    <th className="px-3 py-2.5 w-28 text-right bg-emerald-50/60 text-emerald-950">Weight (KG)</th>
                    <th className="px-2 py-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {calculatedItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      {/* Sr */}
                      <td className="px-3 py-2 text-center font-bold text-gray-500">
                        {item.sr_no}
                      </td>

                      {/* Client */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          required
                          list="clients-list"
                          placeholder="Client Name"
                          value={item.client_name}
                          onChange={(e) => handleItemChange(idx, 'client_name', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Job */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          required
                          list="jobs-list"
                          placeholder="Job description"
                          value={item.job_name}
                          onChange={(e) => handleItemChange(idx, 'job_name', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Deckle (Width) */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          placeholder="Deckle"
                          value={item.deckle}
                          onChange={(e) => handleItemChange(idx, 'deckle', e.target.value)}
                          className="w-full px-2 py-1.5 text-center border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </td>

                      {/* Cutting (Length) */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          placeholder="Cutting"
                          value={item.cutting}
                          onChange={(e) => handleItemChange(idx, 'cutting', e.target.value)}
                          className="w-full px-2 py-1.5 text-center border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </td>

                      {/* GSM */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          placeholder="GSM"
                          value={item.gsm}
                          onChange={(e) => handleItemChange(idx, 'gsm', e.target.value)}
                          className="w-full px-2 py-1.5 text-center border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          placeholder="Qty"
                          value={item.ordered_quantity}
                          onChange={(e) => handleItemChange(idx, 'ordered_quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-right border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-1 focus:ring-emerald-500 font-mono font-medium"
                        />
                      </td>

                      {/* Calculated Weight */}
                      <td className="px-3 py-2 text-right font-bold text-emerald-900 bg-emerald-50/40 font-mono whitespace-nowrap">
                        {item.weight > 0 ? `${item.weight.toLocaleString()} kg` : '-'}
                      </td>

                      {/* Action */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer Summary */}
                <tfoot className="bg-gray-100 font-bold text-gray-900 border-t border-gray-200 text-xs">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-left">
                      Total ({calculatedItems.length} Line {calculatedItems.length === 1 ? 'Item' : 'Items'})
                    </td>
                    <td colSpan={3} className="px-2 py-3 text-right text-gray-500 font-normal">
                      Sum of Quantities:
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-950">
                      {totalCalculatedQuantity.toLocaleString()} pcs
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-950 bg-emerald-100/70">
                      {totalCalculatedWeight.toLocaleString()} kg
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Datalists for autocompletion */}
            <datalist id="clients-list">
              {options.clients?.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="jobs-list">
              {options.jobs?.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Instructions & Notes
            </label>
            <textarea
              rows={2}
              placeholder="Add any specific packaging, transport, or board grain instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* ── Section E: Sign-Off Identity ─────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-200 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Prepared By (Author)
                </span>
                <span className="font-bold text-gray-900">{user?.name || user?.username || 'Authorized User'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:justify-end">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Approved By (Sign-off)
                </span>
                <span className="text-gray-500 italic">Pending Authorization by Supervisor/Admin</span>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ──────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link
              to="/sheets/purchase-orders"
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving Draft...' : 'Save as Draft'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Save & Submit for Approval'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

