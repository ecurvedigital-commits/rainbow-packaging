import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ type = 'info', message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getStyle = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-500 text-white',
          icon: <CheckCircle className="w-5 h-5" />
        };
      case 'error':
        return {
          bg: 'bg-rose-600 text-white',
          icon: <XCircle className="w-5 h-5" />
        };
      case 'warning':
        return {
          bg: 'bg-amber-500 text-white',
          icon: <AlertTriangle className="w-5 h-5" />
        };
      case 'info':
      default:
        return {
          bg: 'bg-indigo-600 text-white',
          icon: <Info className="w-5 h-5" />
        };
    }
  };

  const { bg, icon } = getStyle();

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-bounce-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl ${bg} text-sm font-medium`}>
        {icon}
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 opacity-80 hover:opacity-100 transition p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
