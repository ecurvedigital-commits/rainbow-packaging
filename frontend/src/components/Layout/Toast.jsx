import React from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const STYLES = {
  success: 'bg-brand-green',
  error: 'bg-red-600',
  info: 'bg-brand-blue',
};

export const Toast = ({ toast }) => {
  if (!toast) return null;
  const Icon = ICONS[toast.type] || Info;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up" key={toast.key || Date.now()}>
      <div className={`${STYLES[toast.type] || STYLES.info} text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 font-semibold max-w-sm text-xs`}>
        <Icon size={20} className="shrink-0" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

export default Toast;
