export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (err) {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    return dateString;
  }
};

export const formatWeight = (val) => {
  if (val === undefined || val === null) return '0 kg';
  return `${Number(val).toLocaleString()} kg`;
};

export const getStatusBadgeStyle = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'AVAILABLE':
    case 'REEL':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'IN_USE':
    case 'CUT':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
    case 'DEPLETED':
    case 'NILL':
      return 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-300';
    case 'VOIDED':
      return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300';
    case 'CORRECTION_PENDING':
    case 'VOID_PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
  }
};

export const getStatusBadgeClass = getStatusBadgeStyle;

export const getApprovalBadgeStyle = (approvalStatus) => {
  switch ((approvalStatus || '').toUpperCase()) {
    case 'APPROVED':
    case 'CONFIRMED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
    case 'DECLINED':
    case 'DECLINED_REVERTED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
  }
};
