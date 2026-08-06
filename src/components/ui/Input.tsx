import * as React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, type, onWheel, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (type === 'number') {
        (e.target as HTMLElement).blur();
      }
      if (onWheel) {
        onWheel(e);
      }
    };

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            onWheel={handleWheel}
            className={cn(
              "flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/80 dark:border-slate-800 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
              leftIcon && "pl-10",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-medium text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
