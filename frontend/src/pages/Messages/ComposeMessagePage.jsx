import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  Search,
  Check,
  Layers,
  Wrench,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Link2,
  Package,
  RotateCcw,
  CheckCircle2,
  X,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import { userApi } from '../../api/userApi';
import { reelApi } from '../../api/reelApi';
import { masterCodeApi } from '../../api/masterCodeApi';
import { messageApi } from '../../api/messageApi';
import { correctionApi } from '../../api/correctionApi';
import { formatWeight, extractMasterCodeSpecs } from '../../utils/formatters';
import Toast from '../../components/Common/Toast';

const inputClass =
  'w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue dark:text-white transition';
const labelClass = 'block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5';

export default function ComposeMessagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Mode: 'MESSAGE' | 'CORRECTION'
  const initialModeParam =
    searchParams.get('mode') === 'CORRECTION'
      ? 'CORRECTION'
      : location.state?.initialMode || 'MESSAGE';
  const [mode, setMode] = useState(initialModeParam);

  // Users Directory State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Reel Search & Multi-Attachment State
  const [reelSearch, setReelSearch] = useState('');
  const [searchingReels, setSearchingReels] = useState(false);
  const [reelSearchResults, setReelSearchResults] = useState([]);
  const [recentReels, setRecentReels] = useState([]);
  const [loadingRecentReels, setLoadingRecentReels] = useState(false);
  const [attachedReels, setAttachedReels] = useState([]);

  // Master Codes
  const [masterCodes, setMasterCodes] = useState([]);

  // Form Fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('WRONG_WEIGHT');

  // Correction specific fields (for single target reel)
  const [correctionSpecs, setCorrectionSpecs] = useState({
    reel_no: '',
    master_code_id: '',
    master_code: '',
    quality: '',
    gsm: '',
    bf: '',
    size: '',
    previous_weight: '',
    max_weight: '',
    supplier_name: '',
    mill_name: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const searchTimeoutRef = useRef(null);

  // 1. Load users directory & active master codes on mount
  useEffect(() => {
    setLoadingUsers(true);
    userApi
      .getDirectory()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setUsers(res.data);
        }
      })
      .catch((err) => console.error('Failed to load user directory', err))
      .finally(() => setLoadingUsers(false));

    masterCodeApi
      .list({ status: 'ACTIVE' })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setMasterCodes(res.data);
        }
      })
      .catch((err) => console.error('Failed to load master codes', err));

    setLoadingRecentReels(true);
    reelApi
      .list({ limit: 8, page: 1 })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setRecentReels(res.data);
        }
      })
      .catch((err) => console.error('Failed to load recent reels', err))
      .finally(() => setLoadingRecentReels(false));
  }, []);

  // 2. Pre-fill from URL params or location.state
  useEffect(() => {
    // Check mode param
    const modeParam = searchParams.get('mode');
    if (modeParam === 'CORRECTION') {
      setMode('CORRECTION');
    }

    // Check recipient param
    const recipientParam = searchParams.get('recipient') || searchParams.get('user_id');
    if (recipientParam) {
      setSelectedUserIds([recipientParam]);
    } else if (location.state?.initialRecipients?.length > 0) {
      const ids = location.state.initialRecipients
        .map((u) => (typeof u === 'string' ? u : u.id || u._id))
        .filter(Boolean);
      setSelectedUserIds(ids);
    }

    // Check reel_id param
    const reelIdParam = searchParams.get('reel_id');
    if (reelIdParam) {
      reelApi
        .getById(reelIdParam)
        .then((res) => {
          if (res.success && res.data) {
            handleAttachReel(res.data);
          }
        })
        .catch((err) => console.error('Failed to pre-fetch reel', err));
    } else if (location.state?.initialReel) {
      handleAttachReel(location.state.initialReel);
    } else if (Array.isArray(location.state?.initialReels) && location.state.initialReels.length > 0) {
      setAttachedReels(location.state.initialReels);
    }
  }, [searchParams, location.state]);

  // 3. Debounced Reel Search
  useEffect(() => {
    if (!reelSearch || reelSearch.trim().length < 1) {
      setReelSearchResults([]);
      setSearchingReels(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearchingReels(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await reelApi.search(reelSearch.trim(), 1, 15);
        if (res.success && Array.isArray(res.data)) {
          setReelSearchResults(res.data);
        } else {
          setReelSearchResults([]);
        }
      } catch (err) {
        console.error('Reel search error', err);
        setReelSearchResults([]);
      } finally {
        setSearchingReels(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [reelSearch]);

  const handleAttachReel = (reel) => {
    if (mode === 'CORRECTION') {
      // Single target reel for correction
      setAttachedReels([reel]);
      setCorrectionSpecs({
        reel_no: reel.reel_no || '',
        master_code_id: reel.master_code_id || '',
        master_code: reel.master_code || '',
        quality: reel.quality || '',
        gsm: reel.gsm || '',
        bf: reel.bf || '',
        size: reel.size || '',
        previous_weight: reel.previous_weight ?? reel.current_weight ?? '',
        max_weight: reel.max_weight || '',
        supplier_name: reel.supplier_name || '',
        mill_name: reel.mill_name || '',
      });
    } else {
      // Multi-reel attachment for direct message
      setAttachedReels((prev) => {
        const reelId = reel.id || reel._id;
        const exists = prev.some((r) => (r.id || r._id) === reelId || r.reel_no === reel.reel_no);
        if (exists) return prev; // Already attached
        return [...prev, reel];
      });
    }
  };

  const handleRemoveReel = (reelIdOrNo) => {
    setAttachedReels((prev) =>
      prev.filter((r) => (r.id || r._id) !== reelIdOrNo && r.reel_no !== reelIdOrNo)
    );
  };

  const handleMasterCodeChange = (e) => {
    const selectedId = e.target.value;
    const selected = masterCodes.find((mc) => (mc.master_code_id || mc.id) === selectedId);
    if (selected) {
      const specs = extractMasterCodeSpecs(selected);
      setCorrectionSpecs((prev) => ({
        ...prev,
        master_code_id: selectedId,
        master_code: selected.master_code,
        quality: specs.quality !== undefined ? specs.quality : prev.quality,
        gsm: specs.gsm !== undefined ? specs.gsm : prev.gsm,
        bf: specs.bf !== undefined ? specs.bf : prev.bf,
        size: specs.size !== undefined ? specs.size : prev.size,
      }));
    } else {
      setCorrectionSpecs((prev) => ({
        ...prev,
        master_code_id: '',
        master_code: '',
      }));
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectRoleUsers = (roleName) => {
    const targetIds = users.filter((u) => u.role === roleName).map((u) => u.id);
    setSelectedUserIds((prev) => {
      const set = new Set([...prev, ...targetIds]);
      return Array.from(set);
    });
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'MESSAGE') {
      if (selectedUserIds.length === 0) {
        setError('Please select at least one recipient user.');
        return;
      }
      if (!body.trim()) {
        setError('Message body cannot be empty.');
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          recipient_ids: selectedUserIds,
          subject: subject.trim(),
          body: body.trim(),
          kind: 'MESSAGE',
          reels: attachedReels.map((r) => ({
            reel_id: r.id || r._id,
            reel_no: r.reel_no,
            master_code_id: r.master_code_id || null,
            master_code: r.master_code || null,
            master_code_name: r.master_code_name || null,
            quality: r.quality,
            gsm: r.gsm,
            bf: r.bf,
            size: r.size,
          })),
        };

        const res = await messageApi.send(payload);
        setSubmitting(false);
        if (res.success) {
          setToast({ type: 'success', message: 'Message sent successfully!' });
          setTimeout(() => navigate('/notifications'), 1000);
        }
      } catch (err) {
        setSubmitting(false);
        setError(err.message || 'Failed to send message.');
      }
    } else {
      // Formal Operator Correction Request
      if (attachedReels.length === 0) {
        setError('Please select/attach the Reel that needs correction.');
        return;
      }
      const primaryReel = attachedReels[0];
      if (!body.trim()) {
        setError('Please enter an explanation note for the correction request.');
        return;
      }

      setSubmitting(true);
      try {
        const requestedChanges = {};
        if (correctionSpecs.previous_weight !== '' && !isNaN(Number(correctionSpecs.previous_weight))) {
          requestedChanges.previous_weight = Number(correctionSpecs.previous_weight);
        }
        if (correctionSpecs.max_weight !== '' && !isNaN(Number(correctionSpecs.max_weight))) {
          requestedChanges.max_weight = Number(correctionSpecs.max_weight);
        }
        if (correctionSpecs.reel_no && correctionSpecs.reel_no.trim() !== primaryReel.reel_no) {
          requestedChanges.reel_no = correctionSpecs.reel_no.trim();
        }
        if (correctionSpecs.quality && correctionSpecs.quality !== primaryReel.quality) {
          requestedChanges.quality = correctionSpecs.quality;
        }
        if (correctionSpecs.gsm !== '' && !isNaN(Number(correctionSpecs.gsm))) {
          requestedChanges.gsm = Number(correctionSpecs.gsm);
        }
        if (correctionSpecs.bf !== '') {
          requestedChanges.bf = isNaN(Number(correctionSpecs.bf)) ? correctionSpecs.bf : Number(correctionSpecs.bf);
        }
        if (correctionSpecs.size !== '' && !isNaN(Number(correctionSpecs.size))) {
          requestedChanges.size = Number(correctionSpecs.size);
        }
        if (
          correctionSpecs.supplier_name &&
          correctionSpecs.supplier_name.trim() !== (primaryReel.supplier_name || '')
        ) {
          requestedChanges.supplier_name = correctionSpecs.supplier_name.trim();
        }
        if (
          correctionSpecs.mill_name &&
          correctionSpecs.mill_name.trim() !== (primaryReel.mill_name || '')
        ) {
          requestedChanges.mill_name = correctionSpecs.mill_name.trim();
        }
        if (correctionSpecs.master_code_id) {
          requestedChanges.master_code_id = correctionSpecs.master_code_id;
          requestedChanges.master_code = correctionSpecs.master_code;
        }

        const payload = {
          reel_id: primaryReel.id || primaryReel._id,
          reel_no: primaryReel.reel_no,
          category,
          message: body.trim(),
          requested_changes: requestedChanges,
        };

        const res = await correctionApi.create(payload);
        setSubmitting(false);
        if (res.success) {
          setToast({
            type: 'success',
            message: `Correction request submitted for Reel #${primaryReel.reel_no}. Supervisors & Admins have been notified.`,
          });
          setTimeout(() => navigate('/notifications'), 1200);
        }
      } catch (err) {
        setSubmitting(false);
        setError(err.message || 'Failed to submit correction request.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-fade-in">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition shadow-xs"
            title="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              {mode === 'CORRECTION' ? 'Submit Reel Correction Request' : 'Compose Message'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {mode === 'CORRECTION'
                ? 'Flag entry discrepancies on paper reels for Supervisor and Admin review.'
                : 'Send direct communication to team members and attach multiple interactive paper reel links.'}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setMode('MESSAGE')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
              mode === 'MESSAGE'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Send size={13} />
            <span>Direct Message</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('CORRECTION')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
              mode === 'CORRECTION'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Wrench size={13} />
            <span>Reel Correction</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2.5">
          <AlertTriangle size={18} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* RECIPIENTS SECTION (DIRECT MESSAGE MODE) */}
        {mode === 'MESSAGE' && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className={`${labelClass} flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 mb-0`}>
                <Users size={16} />
                Select Recipients ({selectedUserIds.length} Selected) *
              </label>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => selectRoleUsers('ADMIN')}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold rounded-lg transition"
                >
                  + All Admins
                </button>
                <button
                  type="button"
                  onClick={() => selectRoleUsers('SUPERVISOR')}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-semibold rounded-lg transition"
                >
                  + All MIS
                </button>
                <button
                  type="button"
                  onClick={() => selectRoleUsers('OPERATOR')}
                  className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold rounded-lg transition"
                >
                  + All Operators
                </button>
                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="px-2.5 py-1 text-red-600 hover:text-red-700 font-semibold transition"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Search User Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members by name, username, or role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>

            {/* User Badges Cloud */}
            <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-3 max-h-44 overflow-y-auto custom-scrollbar flex flex-wrap gap-2 bg-gray-50/30 dark:bg-slate-800/20">
              {loadingUsers ? (
                <div className="w-full py-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 size={15} className="animate-spin text-indigo-600" />
                  <span>Loading user directory...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="w-full text-center py-3 text-xs text-gray-400">No users match your search.</p>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUserSelection(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                          : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isSelected ? <Check size={13} className="shrink-0" /> : null}
                      <span>{u.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {u.role}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MULTI-REEL LINKING & MENTION SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">
                <Link2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {mode === 'CORRECTION'
                    ? 'Target Reel for Correction (Required) *'
                    : `Attached Reel References (${attachedReels.length} Attached)`}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {mode === 'CORRECTION'
                    ? 'Pick the inventory reel with the discrepancy.'
                    : 'Attach multiple reels. Recipients can click each reel tag to open its details directly.'}
                </p>
              </div>
            </div>

            {attachedReels.length > 0 && (
              <button
                type="button"
                onClick={() => setAttachedReels([])}
                className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1 transition flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Clear All ({attachedReels.length})</span>
              </button>
            )}
          </div>

          {/* Currently Attached Reels Cards */}
          {attachedReels.length > 0 && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Linked Reels ({attachedReels.length}):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {attachedReels.map((r, idx) => {
                  const reelId = r.id || r._id || r.reel_no;
                  return (
                    <div
                      key={reelId || idx}
                      className="bg-indigo-50/70 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3 flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-indigo-900 dark:text-indigo-300">
                            Reel #{r.reel_no}
                          </span>
                          {(r.master_code || r.master_code_name) && (
                            <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded font-mono">
                              {r.master_code_name || r.master_code}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                          {r.quality || 'VK'} • {r.gsm}GSM • {r.size}cm • BF {r.bf}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Balance: <strong>{formatWeight(r.previous_weight ?? r.current_weight)}</strong>
                          {/* {r.supplier_name && ` • ${r.supplier_name}`} */}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveReel(reelId)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition shrink-0"
                        title="Remove this reel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Box to Find and Add Reels */}
          <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-slate-800">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search to add reels by Reel # (e.g. 1042), Master Code (e.g. VK-20-20), GSM, or Quality..."
                value={reelSearch}
                onChange={(e) => setReelSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm border border-gray-300 dark:border-slate-700 bg-gray-50/40 dark:bg-slate-800/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
              {reelSearch && (
                <button
                  type="button"
                  onClick={() => setReelSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Real-time Results & Recent Reels Container */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 bg-gray-50/50 dark:bg-slate-800/30 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-indigo-600" />
                  {searchingReels
                    ? 'Searching inventory...'
                    : reelSearch.trim()
                    ? `Search Results (${reelSearchResults.length} reels found)`
                    : `Recent Inventory Reels (Click + to add)`}
                </span>
                {searchingReels && <Loader2 size={14} className="animate-spin text-indigo-600" />}
              </div>

              <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                {searchingReels ? (
                  <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-indigo-600" />
                    <span>Searching inventory for "{reelSearch}"...</span>
                  </div>
                ) : reelSearch.trim() ? (
                  reelSearchResults.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500 space-y-1">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">
                        No matching reels found for "{reelSearch}"
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Try searching with a Reel number (e.g. 1042), Master Code (e.g. VK-20-20), GSM, or Quality.
                      </p>
                    </div>
                  ) : (
                    reelSearchResults.map((r) => {
                      const reelId = r.id || r._id;
                      const isAttached = attachedReels.some(
                        (ar) => (ar.id || ar._id) === reelId || ar.reel_no === r.reel_no
                      );

                      return (
                        <div
                          key={reelId}
                          onClick={() => (isAttached ? handleRemoveReel(reelId) : handleAttachReel(r))}
                          className={`group p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${
                            isAttached
                              ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                Reel #{r.reel_no}
                              </span>
                              {(r.master_code || r.master_code_name) && (
                                <span className="text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                  {r.master_code_name || r.master_code}
                                </span>
                              )}
                              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                {r.quality} • {r.gsm}GSM • {r.size}cm • BF {r.bf}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>
                                Balance:{' '}
                                <strong className="text-gray-800 dark:text-gray-200 font-mono">
                                  {formatWeight(r.previous_weight ?? r.current_weight)}
                                </strong>
                              </span>
                              {/* <span>•</span>
                              <span className="truncate">
                                Supplier: {r.supplier_name || 'N/A'} {r.mill_name ? `(${r.mill_name})` : ''}
                              </span> */}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              isAttached ? handleRemoveReel(reelId) : handleAttachReel(r);
                            }}
                            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
                              isAttached
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            {isAttached ? (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus size={13} />
                                <span>Add Reel</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )
                ) : loadingRecentReels ? (
                  <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                    <span>Loading recent reels...</span>
                  </div>
                ) : recentReels.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">Type in the search box to find a reel.</p>
                ) : (
                  recentReels.map((r) => {
                    const reelId = r.id || r._id;
                    const isAttached = attachedReels.some(
                      (ar) => (ar.id || ar._id) === reelId || ar.reel_no === r.reel_no
                    );

                    return (
                      <div
                        key={reelId}
                        onClick={() => (isAttached ? handleRemoveReel(reelId) : handleAttachReel(r))}
                        className={`group p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${
                          isAttached
                            ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              Reel #{r.reel_no}
                            </span>
                            {(r.master_code || r.master_code_name) && (
                              <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                {r.master_code_name || r.master_code}
                              </span>
                            )}
                            <span className="text-[11px] text-gray-500">
                              {r.quality} • {r.gsm}GSM • {r.size}cm • BF {r.bf}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2">
                            <span>
                              Balance:{' '}
                              <strong className="text-gray-700 dark:text-gray-300 font-mono">
                                {formatWeight(r.previous_weight ?? r.current_weight)}
                              </strong>
                            </span>
                            {/* <span>•</span>
                            <span className="truncate">{r.supplier_name || 'N/A'}</span> */}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            isAttached ? handleRemoveReel(reelId) : handleAttachReel(r);
                          }}
                          className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1 ${
                            isAttached
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 group-hover:bg-indigo-600 group-hover:text-white border-gray-200 dark:border-slate-700'
                          }`}
                        >
                          {isAttached ? <Check size={12} /> : <Plus size={12} />}
                          <span>{isAttached ? 'Added' : 'Add'}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CORRECTION ADJUSTMENT FIELDS */}
        {mode === 'CORRECTION' && (
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
              <Sparkles size={16} className="text-amber-600" />
              <span>Correction Target Parameters</span>
            </div>

            <div>
              <label className={labelClass}>Mistake Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="WRONG_WEIGHT">Wrong Weight (Entered incorrect scale weight or initial weight)</option>
                <option value="WRONG_MASTER_CODE">Wrong Master Code Classification</option>
                <option value="WRONG_SPECS">Wrong Specifications (GSM, Size, BF, Quality)</option>
                <option value="WRONG_REEL_NO">Wrong Reel Number Entered</option>
                <option value="WRONG_MILL_SUPPLIER">Wrong Supplier / Mill Name</option>
                <option value="OTHER">Other Discrepancy</option>
              </select>
            </div>

            {/* Target Master Code */}
            <div>
              <label className={`${labelClass} flex items-center gap-1.5`}>
                <Layers size={14} className="text-indigo-600" />
                Target Master Code (If Wrong Classification)
              </label>
              <select
                className={inputClass}
                value={correctionSpecs.master_code_id || ''}
                onChange={handleMasterCodeChange}
              >
                <option value="">(Keep Existing / Direct Specs)</option>
                {masterCodes.map((mc) => (
                  <option key={mc.master_code_id || mc.id} value={mc.master_code_id || mc.id}>
                    {mc.master_code} — {mc.master_code_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Spec Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Correct Current Weight (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={
                    attachedReels.length > 0
                      ? String(attachedReels[0].previous_weight ?? attachedReels[0].current_weight)
                      : ''
                  }
                  value={correctionSpecs.previous_weight}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, previous_weight: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correct Max Weight (kg)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder={attachedReels.length > 0 ? String(attachedReels[0].max_weight) : ''}
                  value={correctionSpecs.max_weight}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, max_weight: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correct Reel Number</label>
                <input
                  type="text"
                  value={correctionSpecs.reel_no}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, reel_no: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correct Quality</label>
                <input
                  type="text"
                  value={correctionSpecs.quality}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, quality: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correct GSM</label>
                <input
                  type="number"
                  value={correctionSpecs.gsm}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, gsm: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correct BF</label>
                <input
                  type="text"
                  value={correctionSpecs.bf}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, bf: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correct Size (cm)</label>
                <input
                  type="number"
                  value={correctionSpecs.size}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, size: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correct Supplier Name</label>
                <input
                  type="text"
                  value={correctionSpecs.supplier_name}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, supplier_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correct Mill Name</label>
                <input
                  type="text"
                  value={correctionSpecs.mill_name}
                  onChange={(e) => setCorrectionSpecs({ ...correctionSpecs, mill_name: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBJECT & BODY */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          {mode === 'MESSAGE' && (
            <div>
              <label className={labelClass}>Subject (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Urgent check on reels consumption..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>
              {mode === 'CORRECTION' ? 'Correction Reason / Explanation *' : 'Message Body *'}
            </label>
            <textarea
              required
              rows={4}
              placeholder={
                mode === 'CORRECTION'
                  ? 'Please explain what went wrong during entry (e.g. "Entered 406kg instead of 460kg on the scale tare")...'
                  : 'Type your message here...'
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-6 py-2.5 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition active:scale-98 ${
              mode === 'CORRECTION' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mode === 'CORRECTION' ? (
              <ShieldAlert size={16} />
            ) : (
              <Send size={16} />
            )}
            <span>{mode === 'CORRECTION' ? 'Submit Correction Request' : 'Send Message'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
