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

export const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '₹ 0';
  return `₹ ${Number(val).toLocaleString('en-IN')}`;
};

export const getStatusBadgeStyle = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'AVAILABLE':
    case 'FULL':
    case 'REEL':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'IN_USE':
    case 'CUT':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300';
    case 'DEPLETED':
    case 'NILL':
      return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300';
    case 'VOIDED':
      return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300';
    case 'CORRECTION_PENDING':
    case 'VOID_PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300';
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
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
  }
};

export const extractMasterCodeSpecs = (mc) => {
  if (!mc) return {};
  const specs = {};

  if (mc.quality) {
    const qUpper = String(mc.quality).trim().toUpperCase();
    const bfUpper = String(mc.bf || '').trim().toUpperCase();
    const nameUpper = String(mc.master_code_name || '').trim().toUpperCase();

    if (qUpper === 'DUPLEX' || qUpper === 'DUP') {
      if (bfUpper === 'ULTRA' || nameUpper.includes('ULTRA')) {
        specs.quality = 'ULTRA';
      } else if (bfUpper === 'DCB' || nameUpper.includes('DCB')) {
        specs.quality = 'DCB';
      } else if (bfUpper === 'SPECTRA' || nameUpper.includes('SPECTRA')) {
        specs.quality = 'SPECTRA';
      } else {
        specs.quality = 'DUPLEX';
      }
    } else if (qUpper === 'IMPORT KRAFT' || qUpper === 'IMPORTANT') {
      specs.quality = 'IMPORTANT';
    } else {
      specs.quality = qUpper;
    }
  }

  if (mc.gsm !== undefined && mc.gsm !== null && mc.gsm !== '') {
    const parsedGsm = parseInt(String(mc.gsm).replace(/[^\d]/g, ''), 10);
    if (!isNaN(parsedGsm) && parsedGsm > 0) {
      specs.gsm = parsedGsm;
    }
  }

  if (specs.quality === 'ULTRA') {
    specs.bf = 'ULTRA';
  } else if (mc.bf !== undefined && mc.bf !== null && mc.bf !== '') {
    const rawBf = String(mc.bf).trim();
    const parsedBf = parseInt(rawBf.replace(/[^\d]/g, ''), 10);
    if (isNaN(parsedBf) || rawBf.toUpperCase() === 'ULTRA' || rawBf.toUpperCase() === 'DCB' || rawBf.toUpperCase() === 'SPECTRA') {
      specs.bf = rawBf.toUpperCase() === 'ULTRA' ? 'ULTRA' : rawBf;
    } else if (!isNaN(parsedBf) && parsedBf > 0) {
      specs.bf = parsedBf;
    } else {
      specs.bf = rawBf;
    }
  }

  if (mc.size !== undefined && mc.size !== null && mc.size !== '') {
    const parsedSize = parseFloat(String(mc.size).replace(/[^\d.]/g, ''));
    if (!isNaN(parsedSize) && parsedSize > 0) {
      specs.size = parsedSize;
    }
  }

  return specs;
};
