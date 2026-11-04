import * as React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, children, disabled, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer select-none";
    
    const variants = {
      primary: "bg-primary text-white hover:bg-primary-600 shadow-2xs focus-visible:ring-primary/40",
      secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80",
      ghost: "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 text-slate-600 dark:text-slate-300",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-2xs focus-visible:ring-red-500/40",
      outline: "border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800",
    };
    
    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-9 px-3.5 text-xs sm:text-sm rounded-md",
      lg: "h-10 px-4.5 text-sm rounded-md",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="mr-1.5 shrink-0">{leftIcon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
