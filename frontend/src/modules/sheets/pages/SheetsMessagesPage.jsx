import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  Search,
  Check,
  Layers,
  Sparkles,
  RefreshCw,
  Mail,
  Clock,
  User,
  Inbox,
  SendHorizontal,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { userApi } from '../../../api/userApi';
import { messageApi } from '../../../api/messageApi';
import Toast from '../../../components/Common/Toast';
import { formatDateTime } from '../../../utils/formatters';
import { useAuth } from '../../../auth/AuthContext';

export default function SheetsMessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'inbox' | 'sent'

  // Users Directory State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Form Fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sheetLotNo, setSheetLotNo] = useState('');
  const [sheetSpecs, setSheetSpecs] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Message History State
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load user directory
  useEffect(() => {
    setLoadingUsers(true);
    userApi
      .getDirectory()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          // Exclude self from recipient list
          setUsers(res.data.filter((u) => u.id !== user?.id && u._id !== user?.id));
        }
      })
      .catch((err) => console.error('Failed to load user directory', err))
      .finally(() => setLoadingUsers(false));
  }, [user?.id]);

  // Load sheets messages when tab changes to inbox/sent
  const loadMessages = (box = 'inbox') => {
    setLoadingMessages(true);
    messageApi
      .list({ module: 'sheets', box })
      .then((res) => {
        if (res.success) {
          setMessages(res.data || res.items || []);
        }
      })
      .catch((err) => console.error('Failed to load sheets messages', err))
      .finally(() => setLoadingMessages(false));
  };

  useEffect(() => {
    if (activeTab === 'inbox' || activeTab === 'sent') {
      loadMessages(activeTab);
    }
  }, [activeTab]);

  const toggleUserSelection = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleSelectAllSupervisors = () => {
    const supervisorIds = users
      .filter((u) => u.role === 'SUPERVISOR' || u.role === 'ADMIN')
      .map((u) => u.id || u._id);
    setSelectedUserIds(supervisorIds);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedUserIds.length === 0) {
      setError('Please select at least one recipient.');
      return;
    }
    if (!body.trim()) {
      setError('Please enter a message body.');
      return;
    }

    setSubmitting(true);
    try {
      // Build final body incorporating optional sheet lot references
      let finalBody = body.trim();
      if (sheetLotNo.trim() || sheetSpecs.trim()) {
        const refLines = [];
        if (sheetLotNo.trim()) refLines.push(`• Sheet Lot #: ${sheetLotNo.trim()}`);
        if (sheetSpecs.trim()) refLines.push(`• Dimensions / Specs: ${sheetSpecs.trim()}`);
        finalBody = `${finalBody}\n\n[Sheet Lot Reference]\n${refLines.join('\n')}`;
      }

      const payload = {
        recipient_ids: selectedUserIds,
        subject: subject.trim() || 'Sheets Module Note',
        body: finalBody,
        kind: 'MESSAGE',
        module: 'sheets',
      };

      const res = await messageApi.send(payload);
      setSubmitting(false);

      if (res.success) {
        setToast({ type: 'success', message: 'Sheets message sent successfully!' });
        setSubject('');
        setBody('');
        setSheetLotNo('');
        setSheetSpecs('');
        setSelectedUserIds([]);
        // Switch to sent tab after delay
        setTimeout(() => setActiveTab('sent'), 1200);
      }
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Failed to send message.');
    }
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-xs">
            <Layers size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-black text-gray-900 tracking-tight"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                Sheets Messages
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                Sheets Tagged
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Direct team messaging and shift communication dedicated to sheet inventory and production
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/sheets/dashboard')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Sheets Dashboard</span>
        </button>
      </div>

      {/* Navigation Tabs (Compose / Inbox / Sent) */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200 w-fit">
        <button
          onClick={() => setActiveTab('compose')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'compose'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Send size={14} className={activeTab === 'compose' ? 'text-emerald-600' : ''} />
          <span>Compose</span>
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'inbox'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Inbox size={14} className={activeTab === 'inbox' ? 'text-emerald-600' : ''} />
          <span>Sheets Inbox</span>
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sent'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <SendHorizontal size={14} className={activeTab === 'sent' ? 'text-emerald-600' : ''} />
          <span>Sent Sheets Messages</span>
        </button>
      </div>

      {/* ── TAB 1: COMPOSE SHEETS MESSAGE ──────────────────────────────── */}
      {activeTab === 'compose' && (
        <form onSubmit={handleSend} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Product Tag Notice */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Product Tag: Sheets Module
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  This message will automatically be tagged under the <strong>Sheets</strong> product domain for organized filtering across the platform.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 bg-white text-emerald-800 font-bold text-xs rounded-full border border-emerald-200 shadow-2xs">
              module: sheets
            </span>
          </div>

          {/* Recipient Selection Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-emerald-600" />
                  Select Recipients ({selectedUserIds.length} selected)
                </h3>
                <p className="text-xs text-gray-500">
                  Choose team members who should receive this Sheets communication
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAllSupervisors}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                + Select All Supervisors & Admins
              </button>
            </div>

            {/* Recipient Search Filter */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members by name or role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
              />
            </div>

            {/* Recipient Chips Grid */}
            {loadingUsers ? (
              <div className="flex items-center justify-center py-6 text-gray-400 text-xs">
                <Loader2 size={16} className="animate-spin mr-2" /> Loading team directory...
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No team members found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
                {filteredUsers.map((u) => {
                  const uid = u.id || u._id;
                  const isSelected = selectedUserIds.includes(uid);
                  return (
                    <div
                      key={uid}
                      onClick={() => toggleUserSelection(uid)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-300'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-bold leading-tight">{u.name || u.username}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                          {u.role}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message Content Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Sheet Lot Stock Adjustment / Cutting Discrepancy"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            {/* Optional Sheet Lot References */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Sheet Lot # (Optional Reference)
                </label>
                <input
                  type="text"
                  value={sheetLotNo}
                  onChange={(e) => setSheetLotNo(e.target.value)}
                  placeholder="e.g. SHT-2026-0042"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Dimensions / Specs (Optional)
                </label>
                <input
                  type="text"
                  value={sheetSpecs}
                  onChange={(e) => setSheetSpecs(e.target.value)}
                  placeholder="e.g. 28 × 40 in, 250 GSM, Corrugated B-Flute"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Message Body *
              </label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message, notes for supervisor review, cutting instructions, or shift handover details..."
                className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/sheets/dashboard')}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sending Sheets Message...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Sheets Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── TAB 2 & 3: SHEETS MESSAGES LIST (INBOX / SENT) ─────────────── */}
      {(activeTab === 'inbox' || activeTab === 'sent') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">
              {activeTab === 'inbox' ? 'Received Sheets Messages' : 'Sent Sheets Messages'}
            </h3>
            <button
              onClick={() => loadMessages(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw size={12} className={loadingMessages ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingMessages ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 text-xs">
              <Loader2 size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
              Loading {activeTab} messages for Sheets...
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Mail size={22} />
              </div>
              <h4 className="text-sm font-bold text-gray-800">No Sheets Messages Found</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {activeTab === 'inbox'
                  ? 'No incoming messages tagged under the Sheets domain yet.'
                  : 'You have not sent any messages tagged under the Sheets domain.'}
              </p>
              <button
                onClick={() => setActiveTab('compose')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Send size={13} />
                <span>Compose New Sheets Message</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const mid = msg.id || msg._id;
                const sender = msg.sender_name || 'System';
                const recipientNames = (msg.recipients || []).map((r) => r.name || r.username).join(', ');

                return (
                  <div
                    key={mid}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-emerald-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Layers size={10} />
                          Sheets
                        </span>
                        <h4 className="font-bold text-gray-900 text-sm">
                          {msg.subject || 'Sheets Message'}
                        </h4>
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDateTime(msg.created_at || msg.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {msg.body}
                    </p>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-gray-400" />
                          From: <strong className="text-gray-700">{sender}</strong>
                        </span>
                        {recipientNames && (
                          <span className="text-gray-400">
                            To: <span className="text-gray-600">{recipientNames}</span>
                          </span>
                        )}
                      </div>

                      {activeTab === 'inbox' && (
                        <button
                          onClick={() => {
                            setActiveTab('compose');
                            if (msg.sender_id) setSelectedUserIds([msg.sender_id]);
                            setSubject(`Re: ${msg.subject || 'Sheets Message'}`);
                          }}
                          className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Reply</span>
                          <ChevronRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

