import * as React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20",
    success: "border-success/20 bg-success/10 text-success hover:bg-success/20",
    warning: "border-warning/20 bg-warning/10 text-warning hover:bg-warning/20",
    danger: "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20",
    outline: "text-foreground border-border bg-transparent",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-1.5 focus:ring-ring focus:ring-offset-1 select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
