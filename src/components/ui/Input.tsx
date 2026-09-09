import * as React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, type, onWheel, onKeyDown, onPaste, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (type === 'number') {
        (e.target as HTMLElement).blur();
      }
      if (onWheel) {
        onWheel(e);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (type === 'number') {
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
        }
      }
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (type === 'number') {
        const text = e.clipboardData.getData('text');
        if (/[eE]/.test(text)) {
          e.preventDefault();
          const sanitized = text.replace(/[eE]/g, '');
          const target = e.target as HTMLInputElement;
          const start = target.selectionStart ?? 0;
          const end = target.selectionEnd ?? 0;
          const val = target.value;
          const newVal = val.slice(0, start) + sanitized + val.slice(end);
          target.value = newVal;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          nativeInputValueSetter?.call(target, newVal);
          const ev = new Event('input', { bubbles: true });
          target.dispatchEvent(ev);
        }
      }
      if (onPaste) {
        onPaste(e);
      }
    };

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="text-sm font-semibold text-foreground mb-1.5 block">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className={cn(
              "flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
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
