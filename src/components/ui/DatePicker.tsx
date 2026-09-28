import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  label?: string;
  placeholder?: string;
  className?: string;
  direction?: 'auto' | 'up' | 'down';
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  placeholder = 'Select Date',
  className,
  direction = 'auto',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; isMobile: boolean }>({
    left: 0,
    isMobile: false,
  });

  // Calculate position and responsiveness
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const isMob = window.innerWidth < 640;
      if (isMob) {
        setPos({ left: 0, isMobile: true });
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const calendarHeight = 330;
      const calendarWidth = 260;

      let left = rect.left;
      if (left + calendarWidth > window.innerWidth - 16) {
        left = Math.max(16, rect.right - calendarWidth);
      }

      let shouldOpenUpwards = false;
      if (direction === 'up') shouldOpenUpwards = true;
      else if (direction === 'down') shouldOpenUpwards = false;
      else if (spaceBelow < calendarHeight && spaceAbove > spaceBelow) shouldOpenUpwards = true;

      if (shouldOpenUpwards) {
        setPos({
          bottom: window.innerHeight - rect.top + 6,
          left,
          isMobile: false,
        });
      } else {
        setPos({
          top: rect.bottom + 6,
          left,
          isMobile: false,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, direction]);

  // Current viewing month & year state
  const initialDate = value ? new Date(value) : (minDate ? new Date(minDate) : new Date());
  const [viewDate, setViewDate] = useState<Date>(
    isNaN(initialDate.getTime()) ? new Date() : initialDate
  );

  // Update viewDate when value or minDate changes if current view is uninitialized
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) setViewDate(d);
    } else if (minDate) {
      const d = new Date(minDate);
      if (!isNaN(d.getTime())) setViewDate(d);
    }
  }, [value, minDate]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };
  const nextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleSelectDay = (dayNum: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const formatted = `${viewYear}-${monthStr}-${dayStr}`;

    // Validate min/max boundaries
    if (minDate && formatted < minDate) return;
    if (maxDate && formatted > maxDate) return;

    onChange(formatted);
    setIsOpen(false);
  };

  const handlePreset = (preset: 'today' | 'yesterday') => {
    const today = new Date();
    if (preset === 'yesterday') {
      today.setDate(today.getDate() - 1);
    }
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;

    if (minDate && formatted < minDate) return;
    if (maxDate && formatted > maxDate) return;

    onChange(formatted);
    setViewDate(today);
    setIsOpen(false);
  };

  // Format display string
  const formatDisplay = (val: string) => {
    if (!val) return placeholder;
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d.getTime())) return placeholder;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const selectedDateStr = value ? value : '';
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full", className)}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Input Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold flex items-center justify-between transition-all hover:bg-slate-100 dark:hover:bg-slate-750 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
          value ? "text-slate-900 dark:text-white" : "text-slate-400"
        )}
      >
        <span className="truncate">{formatDisplay(value)}</span>
        <CalendarIcon size={14} className="text-primary shrink-0 ml-1.5" />
      </button>

      {/* Calendar Dropdown Popover / Modal with Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop for outside click dismissal */}
          <div 
            className={cn(
              "fixed inset-0 z-[99998]",
              pos.isMobile ? "bg-slate-950/60 backdrop-blur-xs" : "bg-transparent"
            )}
            onClick={() => setIsOpen(false)}
          />

          {/* Popover / Modal Content */}
          <div 
            data-lenis-prevent
            ref={popoverRef}
            className={cn(
              "fixed z-[99999] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 animate-in fade-in zoom-in-95 duration-150 select-none",
              pos.isMobile
                ? "inset-x-4 top-1/2 -translate-y-1/2 max-w-[320px] mx-auto"
                : "w-64"
            )}
            style={
              pos.isMobile
                ? {}
                : {
                    top: pos.top !== undefined ? `${pos.top}px` : 'auto',
                    bottom: pos.bottom !== undefined ? `${pos.bottom}px` : 'auto',
                    left: `${pos.left}px`,
                  }
            }
          >
            {/* Calendar Header: Month + Year + Nav */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-800 dark:text-white font-heading">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => handlePreset('today')}
                className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePreset('yesterday')}
                className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Yesterday
              </button>
            </div>

            {/* Day Names Grid Header */}
            <div className="grid grid-cols-7 text-center mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <span key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Empty slots for previous month padding */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <span key={`prev-${i}`} className="text-[10px] text-slate-300 dark:text-slate-700 py-1.5 select-none">
                  {daysInPrevMonth - firstDayOfMonth + i + 1}
                </span>
              ))}

              {/* Current Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayStr = String(dayNum).padStart(2, '0');
                const monthStr = String(viewMonth + 1).padStart(2, '0');
                const thisDateStr = `${viewYear}-${monthStr}-${dayStr}`;

                const isSelected = selectedDateStr === thisDateStr;
                const isToday = todayStr === thisDateStr;

                const isBeforeMin = minDate ? thisDateStr < minDate : false;
                const isAfterMax = maxDate ? thisDateStr > maxDate : false;
                const isDisabled = isBeforeMin || isAfterMax;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleSelectDay(dayNum)}
                    className={cn(
                      "text-xs font-bold py-1.5 rounded-lg transition-all flex items-center justify-center",
                      isDisabled
                        ? "text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40 bg-slate-50/50 dark:bg-slate-900/30"
                        : isSelected
                        ? "bg-primary text-white shadow-sm font-black scale-105"
                        : isToday
                        ? "bg-primary-100 dark:bg-primary-950/60 text-primary font-black border border-primary/30"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    )}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Footer Clear */}
            {value && (
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  Clear Date
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
