import { useState, useEffect, useRef } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TimePickerProps {
  label?: string;
  value?: string; // "HH:MM" 24h format
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function TimePicker({ label, value, onChange, placeholder }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const ref = useRef<HTMLDivElement>(null);

  // Parse incoming "HH:MM" 24h time
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const isPM = h >= 12;
        setHour(h === 0 ? 12 : h > 12 ? h - 12 : h);
        setMinute(m);
        setPeriod(isPM ? 'PM' : 'AM');
      }
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const emit = (h: number, m: number, p: 'AM' | 'PM') => {
    let h24 = h;
    if (p === 'AM' && h === 12) h24 = 0;
    else if (p === 'PM' && h !== 12) h24 = h + 12;
    const timeStr = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange?.(timeStr);
  };

  const changeHour = (delta: number) => {
    const next = ((hour - 1 + delta + 12) % 12) + 1;
    setHour(next);
    emit(next, minute, period);
  };

  const changeMinute = (delta: number) => {
    const next = (minute + delta + 60) % 60;
    setMinute(next);
    emit(hour, next, period);
  };


  const displayValue = value
    ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`
    : '';

  return (
    <div className="w-full space-y-1.5 text-left" ref={ref}>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Clock size={14} />
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          className={cn(
            "flex h-11 w-full items-center rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900",
            isOpen && "ring-2 ring-primary border-primary",
            !displayValue && "text-muted-foreground"
          )}
        >
          <Clock size={16} className="mr-2 text-slate-400 shrink-0" />
          <span className={cn("flex-1 text-left", !displayValue && "text-slate-400")}>
            {displayValue || placeholder || 'Select time'}
          </span>
          <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-3">
              {/* Hour */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => changeHour(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
                  <ChevronUp size={18} />
                </button>
                <div className="w-14 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl text-2xl font-bold text-slate-800 dark:text-white select-none">
                  {String(hour).padStart(2, '0')}
                </div>
                <button type="button" onClick={() => changeHour(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
                  <ChevronDown size={18} />
                </button>
                <span className="text-[10px] text-slate-400 font-medium uppercase">Hour</span>
              </div>

              <span className="text-2xl font-bold text-slate-400 mb-3">:</span>

              {/* Minute */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => changeMinute(5)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
                  <ChevronUp size={18} />
                </button>
                <div className="w-14 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl text-2xl font-bold text-slate-800 dark:text-white select-none">
                  {String(minute).padStart(2, '0')}
                </div>
                <button type="button" onClick={() => changeMinute(-5)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
                  <ChevronDown size={18} />
                </button>
                <span className="text-[10px] text-slate-400 font-medium uppercase">Min</span>
              </div>

              {/* AM/PM */}
              <div className="flex flex-col gap-2 ml-1 mb-3">
                <button
                  type="button"
                  onClick={() => { setPeriod('AM'); emit(hour, minute, 'AM'); }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-bold transition-all",
                    period === 'AM'
                      ? "bg-primary text-white shadow-md shadow-primary/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => { setPeriod('PM'); emit(hour, minute, 'PM'); }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-bold transition-all",
                    period === 'PM'
                      ? "bg-primary text-white shadow-md shadow-primary/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  PM
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full mt-2 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
