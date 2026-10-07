import React, { useState, useEffect, useRef } from 'react';
import {
  X,
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
} from 'lucide-react';
import { userApi } from '../../api/userApi';
import { reelApi } from '../../api/reelApi';
import { masterCodeApi } from '../../api/masterCodeApi';
import { messageApi } from '../../api/messageApi';
import { correctionApi } from '../../api/correctionApi';
import { formatWeight, extractMasterCodeSpecs } from '../../utils/formatters';

const inputClass = 'w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue';
const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1';

export default function ComposeMessageModal({
  isOpen = false,
  onClose,
  initialRecipients = [],
  initialReel = null,
  initialMode = 'MESSAGE', // 'MESSAGE' | 'CORRECTION'
  onSuccess,
}) {
  const [mode, setMode] = useState(initialMode); // 'MESSAGE' | 'CORRECTION'
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Reel search & attachment state
  const [reelSearch, setReelSearch] = useState('');
  const [searchingReels, setSearchingReels] = useState(false);
  const [reelSearchResults, setReelSearchResults] = useState([]);
  const [recentReels, setRecentReels] = useState([]);
  const [loadingRecentReels, setLoadingRecentReels] = useState(false);
  const [attachedReel, setAttachedReel] = useState(null);

  // Master codes list
  const [masterCodes, setMasterCodes] = useState([]);

  // Form Fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('WRONG_WEIGHT');

  // Correction specific fields
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
  const searchTimeoutRef = useRef(null);

  // Load active users directory and recent inventory reels
  useEffect(() => {
    if (!isOpen) return;
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

    // Load active master codes
    masterCodeApi
      .list({ status: 'ACTIVE' })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setMasterCodes(res.data);
        }
      })
      .catch((err) => console.error('Failed to load master codes', err));

    // Load recent reels as instant suggestions
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
  }, [isOpen]);

  const recipientsKey = Array.isArray(initialRecipients)
    ? initialRecipients.map((u) => (typeof u === 'string' ? u : u?.id || u?._id)).join(',')
    : '';
  const reelIdKey = initialReel?.id || initialReel?._id || initialReel?.reel_no || '';

  // Handle prefilled props on modal open
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'MESSAGE');
      setError('');
      setSubject('');
      setBody('');
      setReelSearch('');
      setReelSearchResults([]);

      if (initialRecipients && initialRecipients.length > 0) {
        const ids = initialRecipients.map((u) => (typeof u === 'string' ? u : u.id || u._id)).filter(Boolean);
        setSelectedUserIds(ids);
      } else {
        setSelectedUserIds([]);
      }

      if (initialReel) {
        setAttachedReel(initialReel);
        setCorrectionSpecs({
          reel_no: initialReel.reel_no || '',
          master_code_id: initialReel.master_code_id || '',
          master_code: initialReel.master_code || '',
          quality: initialReel.quality || '',
          gsm: initialReel.gsm || '',
          bf: initialReel.bf || '',
          size: initialReel.size || '',
          previous_weight: initialReel.previous_weight ?? initialReel.current_weight ?? '',
          max_weight: initialReel.max_weight || '',
          supplier_name: initialReel.supplier_name || '',
          mill_name: initialReel.mill_name || '',
        });
      } else {
        setAttachedReel(null);
      }
    }
  }, [isOpen, recipientsKey, reelIdKey, initialMode]);

  // Reel search debouncing
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

  const handleSelectReel = (reel) => {
    setAttachedReel(reel);
    setReelSearch('');
    setReelSearchResults([]);
    setCorrectionSpecs({
      reel_no: reel.reel_no || '',
      master_code_id: reel.master_code_id || '',
      master_code: reel.master_code || '',
      quality: reel.quality || '',
      gsm: reel.gsm || '',
      bf: reel.bf || '',
      size: reel.size || '',
      previous_weight: reel.previous_weight ?? reel.current_weight ?? '',
      supplier_name: reel.supplier_name || '',
      mill_name: reel.mill_name || '',
    });
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
          reels: attachedReel
            ? [
                {
                  reel_id: attachedReel.id || attachedReel._id,
                  reel_no: attachedReel.reel_no,
                  master_code_id: attachedReel.master_code_id || null,
                  master_code: attachedReel.master_code || null,
                  master_code_name: attachedReel.master_code_name || null,
                  quality: attachedReel.quality,
                  gsm: attachedReel.gsm,
                  bf: attachedReel.bf,
                  size: attachedReel.size,
                },
              ]
            : [],
        };

        const res = await messageApi.send(payload);
        setSubmitting(false);
        if (res.success) {
          if (onSuccess) onSuccess('Message sent successfully!');
          onClose();
        }
      } catch (err) {
        setSubmitting(false);
        setError(err.message || 'Failed to send message.');
      }
    } else {
      // Formal Operator Correction Request
      if (!attachedReel) {
        setError('Please select/attach the Reel that needs correction.');
        return;
      }
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
        if (correctionSpecs.reel_no && correctionSpecs.reel_no.trim() !== attachedReel.reel_no) {
          requestedChanges.reel_no = correctionSpecs.reel_no.trim();
        }
        if (correctionSpecs.quality && correctionSpecs.quality !== attachedReel.quality) {
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
        if (correctionSpecs.supplier_name && correctionSpecs.supplier_name.trim() !== (attachedReel.supplier_name || '')) {
          requestedChanges.supplier_name = correctionSpecs.supplier_name.trim();
        }
        if (correctionSpecs.mill_name && correctionSpecs.mill_name.trim() !== (attachedReel.mill_name || '')) {
          requestedChanges.mill_name = correctionSpecs.mill_name.trim();
        }
        if (correctionSpecs.master_code_id) {
          requestedChanges.master_code_id = correctionSpecs.master_code_id;
          requestedChanges.master_code = correctionSpecs.master_code;
        }

        const payload = {
          reel_id: attachedReel.id || attachedReel._id,
          reel_no: attachedReel.reel_no,
          category,
          message: body.trim(),
          requested_changes: requestedChanges,
        };

        const res = await correctionApi.create(payload);
        setSubmitting(false);
        if (res.success) {
          if (onSuccess) onSuccess(`Correction request submitted for Reel #${attachedReel.reel_no}. Supervisors & Admins have been notified.`);
          onClose();
        }
      } catch (err) {
        setSubmitting(false);
        setError(err.message || 'Failed to submit correction request.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in flex flex-col max-h-[92vh] border border-gray-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              {mode === 'CORRECTION' ? <Wrench size={20} className="text-amber-300" /> : <Send size={20} className="text-blue-300" />}
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight" style={{ fontFamily: 'var(--font-family-display)' }}>
                {mode === 'CORRECTION' ? 'Submit Reel Correction Request' : 'Send Direct Message'}
              </h2>
              <p className="text-[11px] text-blue-200">
                {mode === 'CORRECTION'
                  ? 'Notify Admin & Supervisors of data entry errors to adjust master database records.'
                  : 'Communicate with team members and link paper reels directly.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setMode('MESSAGE')}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              mode === 'MESSAGE'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Send size={14} />
            <span>Direct Message</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('CORRECTION')}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              mode === 'CORRECTION'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Wrench size={14} className="text-amber-600" />
            <span>Reel Correction Request (Admin/Supervisor)</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* MODE: DIRECT MESSAGE -> RECIPIENTS SELECTOR */}
          {mode === 'MESSAGE' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <Users size={14} className="text-indigo-600" />
                  Select Recipients ({selectedUserIds.length} selected) *
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => selectRoleUsers('ADMIN')}
                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-md transition"
                  >
                    + All Admins
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRoleUsers('SUPERVISOR')}
                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-md transition"
                  >
                    + All MIS
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRoleUsers('OPERATOR')}
                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-md transition"
                  >
                    + All Operators
                  </button>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="px-2 py-0.5 text-gray-500 hover:text-red-600 font-semibold transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* User search bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, username, or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Users list pill/chips container */}
              <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 max-h-36 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5 bg-gray-50/50 dark:bg-slate-800/30">
                {loadingUsers ? (
                  <div className="w-full flex items-center justify-center py-3 text-xs text-gray-400 gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-600" /> Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="w-full text-center py-2 text-xs text-gray-400">No users found.</p>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUserSelection(u.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                            : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? <Check size={12} className="shrink-0" /> : null}
                        <span>{u.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                        }`}>
                          {u.role}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* REEL LINKING & MENTION SECTION */}
          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <label className={`${labelClass} flex items-center gap-1.5 text-slate-800 dark:text-slate-200 mb-0`}>
                <Link2 size={14} className="text-blue-600" />
                {mode === 'CORRECTION' ? 'Select Reel to Correct (Required) *' : 'Attach / Link Reel Reference (Optional)'}
              </label>
              {attachedReel && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAttachedReel(null)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <RotateCcw size={11} /> Change Reel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedReel(null);
                      setReelSearch('');
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {attachedReel ? (
              <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 dark:border-indigo-500/60 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      Reel #{attachedReel.reel_no}
                    </span>
                    {(attachedReel.master_code || attachedReel.master_code_name) && (
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 font-mono">
                        {attachedReel.master_code_name || attachedReel.master_code}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-lg font-semibold text-gray-700 dark:text-gray-300">
                      {attachedReel.quality || 'VK'} • {attachedReel.gsm}GSM • {attachedReel.size}cm • BF {attachedReel.bf}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-3 flex-wrap">
                    <span>Balance: <strong className="text-gray-900 dark:text-white font-mono">{formatWeight(attachedReel.previous_weight ?? attachedReel.current_weight)}</strong></span>
                    {/* <span>•</span>
                    <span>Supplier: <strong className="text-gray-800 dark:text-gray-200">{attachedReel.supplier_name || 'N/A'}</strong></span>
                    {attachedReel.mill_name && <span>({attachedReel.mill_name})</span>} */}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-1 rounded-md flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={12} /> Selected
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Reel # (e.g. 1042), Master Code (e.g. VK-20-20), GSM, Quality, or Supplier..."
                    value={reelSearch}
                    onChange={(e) => setReelSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                  />
                  {reelSearch && (
                    <button
                      type="button"
                      onClick={() => setReelSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Visible Results / Recent Reels Box */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={13} className="text-indigo-600" />
                      {searchingReels
                        ? 'Searching reels...'
                        : reelSearch.trim()
                        ? `Search Results (${reelSearchResults.length} found)`
                        : `Recent Inventory Reels (${recentReels.length} available)`}
                    </span>
                    {searchingReels && (
                      <Loader2 size={13} className="animate-spin text-indigo-600" />
                    )}
                  </div>

                  {/* Results List */}
                  <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1.5">
                    {searchingReels ? (
                      <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                        <span>Searching inventory for "{reelSearch}"...</span>
                      </div>
                    ) : reelSearch.trim() ? (
                      reelSearchResults.length === 0 ? (
                        <div className="py-5 text-center text-xs text-gray-500 space-y-1">
                          <p className="font-semibold text-gray-700 dark:text-gray-300">No matching reels found for "{reelSearch}"</p>
                          <p className="text-[11px] text-gray-400">Try searching with a Reel number (e.g. 1042), Master Code (e.g. VK-20-20), GSM, or Quality.</p>
                        </div>
                      ) : (
                        reelSearchResults.map((r) => (
                          <div
                            key={r.id || r._id}
                            onClick={() => handleSelectReel(r)}
                            className="group p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 hover:bg-indigo-50/50 dark:hover:bg-slate-800/80 transition cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  Reel #{r.reel_no}
                                </span>
                                {(r.master_code || r.master_code_name) && (
                                  <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                    {r.master_code_name || r.master_code}
                                  </span>
                                )}
                                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                                  {r.quality} • {r.gsm}GSM • {r.size}cm • BF {r.bf}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                <span>Balance: <strong className="text-gray-800 dark:text-gray-200 font-mono">{formatWeight(r.previous_weight ?? r.current_weight)}</strong></span>
                                {/* <span>•</span>
                                <span className="truncate">Supplier: {r.supplier_name || 'N/A'} {r.mill_name ? `(${r.mill_name})` : ''}</span> */}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectReel(r);
                              }}
                              className="shrink-0 px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white rounded-lg border border-indigo-200 dark:border-indigo-800 group-hover:border-indigo-600 transition"
                            >
                              Select Reel
                            </button>
                          </div>
                        ))
                      )
                    ) : (
                      /* Recent reels when search is empty */
                      loadingRecentReels ? (
                        <div className="py-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin text-indigo-600" />
                          <span>Loading recent reels...</span>
                        </div>
                      ) : recentReels.length === 0 ? (
                        <p className="py-3 text-center text-xs text-gray-400">Type in the search bar above to find a reel.</p>
                      ) : (
                        recentReels.map((r) => (
                          <div
                            key={r.id || r._id}
                            onClick={() => handleSelectReel(r)}
                            className="group p-2 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  Reel #{r.reel_no}
                                </span>
                                {(r.master_code || r.master_code_name) && (
                                  <span className="text-[10px] font-mono bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-gray-200 dark:border-slate-700">
                                    {r.master_code_name || r.master_code}
                                  </span>
                                )}
                                <span className="text-[11px] text-gray-500">
                                  {r.quality} • {r.gsm}GSM • {r.size}cm • BF {r.bf}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                <span>Balance: <strong className="text-gray-700 dark:text-gray-300 font-mono">{formatWeight(r.previous_weight ?? r.current_weight)}</strong></span>
                                {/* <span>•</span>
                                <span className="truncate">{r.supplier_name || 'N/A'}</span> */}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectReel(r);
                              }}
                              className="shrink-0 px-2 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 group-hover:bg-indigo-600 group-hover:text-white rounded-lg border border-gray-200 dark:border-slate-700 group-hover:border-indigo-600 transition"
                            >
                              Select
                            </button>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* IF CORRECTION REQUEST MODE -> SHOW SPECIFICATION ADJUSTMENT INPUTS */}
          {mode === 'CORRECTION' && (
            <div className="space-y-4 border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={14} className="text-amber-600" />
                Correction Details & Desired Values
              </div>

              <div>
                <label className={labelClass}>Mistake Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  <option value="WRONG_WEIGHT">Wrong Weight (Entered incorrect scale weight or initial weight)</option>
                  <option value="WRONG_MASTER_CODE">Wrong Master Code Classification</option>
                  <option value="WRONG_SPECS">Wrong Specifications (GSM, Size, BF, Quality)</option>
                  <option value="WRONG_REEL_NO">Wrong Reel Number Entered</option>
                  <option value="WRONG_MILL_SUPPLIER">Wrong Supplier / Mill Name</option>
                  <option value="OTHER">Other Discrepancy</option>
                </select>
              </div>

              {/* Master Code Selector */}
              <div>
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <Layers size={13} className="text-indigo-600" />
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

              {/* Correction Values Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Correct Current Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={attachedReel ? String(attachedReel.previous_weight) : ''}
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
                    placeholder={attachedReel ? String(attachedReel.max_weight) : ''}
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
              </div>
            </div>
          )}

          {/* SUBJECT & BODY */}
          {mode === 'MESSAGE' && (
            <div>
              <label className={labelClass}>Subject (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Urgent check on Reel #45 consumption..."
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
              rows={3}
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

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition ${
                mode === 'CORRECTION'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'CORRECTION' ? (
                <ShieldAlert size={16} />
              ) : (
                <Send size={16} />
              )}
              {mode === 'CORRECTION' ? 'Submit Correction Request' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
