import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorClass?: string;
  bgClass?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

/**
 * StatSummaryCard
 * Universal KPI and statistics card for dashboards and overview modules.
 */
export function StatSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass = 'text-primary',
  bgClass = 'bg-primary/10',
  trend,
  className = '',
}: StatSummaryCardProps) {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4 transition-all hover:shadow-md ${className}`}>
      <div className="space-y-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">
          {title}
        </p>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
            {subtitle}
          </p>
        )}
        {trend && (
          <p className={`text-[11px] font-bold ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>

      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}>
        <Icon size={22} />
      </div>
    </div>
  );
}
