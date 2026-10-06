import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * Custom Project-Themed Calendar & DatePicker Component
 * Matching the premium Daily Digest calendar style.
 *
 * @param {Object} props
 * @param {string} props.date - Current date value in YYYY-MM-DD format
 * @param {function} props.onChange - Callback with new YYYY-MM-DD date string (or '' when cleared)
 * @param {'left'|'right'} [props.align='left'] - Popover alignment relative to button
 * @param {string} [props.placeholder='Select date'] - Placeholder text when empty
 * @param {string} [props.label] - Optional prefix label (e.g., 'From:', 'To:')
 * @param {boolean} [props.allowClear=true] - Whether to allow clearing date
 * @param {string} [props.className] - Custom container classes
 * @param {string} [props.iconColor='text-indigo-500'] - Tailwind text color for the calendar icon
 * @param {string} [props.size='sm'] - 'xs' | 'sm' | 'md'
 */
export default function CustomDatePicker({
  date,
  onChange,
  align = 'left',
  placeholder = 'Select date',
  label,
  allowClear = true,
  className = '',
  iconColor = 'text-indigo-500',
  size = 'sm',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  const parseDateStr = (str) => {
    if (!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };

  const selectedDate = date ? parseDateStr(date) : null;
  const [viewDate, setViewDate] = useState(() => (date ? parseDateStr(date) : new Date()));

  useEffect(() => {
    if (date) {
      setViewDate(parseDateStr(date));
    }
  }, [date]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const handleSelectDay = (dayNum, monthOffset = 0) => {
    const targetDate = new Date(year, month + monthOffset, dayNum);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formattedDisplay = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : placeholder;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs gap-2',
    md: 'px-3.5 py-2 text-sm gap-2',
  }[size] || 'px-3 py-1.5 text-xs gap-2';

  const isFullWidth = className.includes('w-full');

  return (
    <div className={`relative ${isFullWidth ? 'w-full block' : 'inline-block'} ${isOpen ? 'z-40' : 'z-10'} ${className}`} ref={popoverRef}>
      {label && (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1.5">
          {label}
        </span>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white font-medium shadow-xs inline-flex items-center transition cursor-pointer ${isFullWidth ? 'w-full justify-between' : ''} ${sizeClasses}`}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
          <span className={`truncate ${!date ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-900 dark:text-white font-semibold'}`}>
            {formattedDisplay}
          </span>
        </div>
        {allowClear && date ? (
          <span
            onClick={handleClear}
            className="p-0.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 ml-1.5"
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 z-[100] w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3 animate-fade-in`}
        >
          {/* Calendar Month & Navigation */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { onChange(todayStr); setIsOpen(false); }}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                date === todayStr ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { onChange(yesterdayStr); setIsOpen(false); }}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                date === yesterdayStr ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              Yesterday
            </button>
            {allowClear && date && (
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="flex-1 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayOfWeek + i + 1;
              return (
                <button
                  key={`prev-${i}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum, -1)}
                  className="py-1.5 text-center text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  {dayNum}
                </button>
              );
            })}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = date === currentDateStr;
              const isToday = todayStr === currentDateStr;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum, 0)}
                  className={`
                    py-1.5 font-medium rounded-lg text-center transition-all
                    ${isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-md scale-105'
                      : isToday
                        ? 'border border-indigo-500 font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}
                  `}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
