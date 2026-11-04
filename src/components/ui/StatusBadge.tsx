import React from 'react';
import { 
  Clock, CheckCircle2, AlertCircle, XCircle, 
  ChefHat, PackageCheck, Truck, ShieldCheck, ToggleLeft, ToggleRight 
} from 'lucide-react';

export type StatusType = 
  | 'pending' | 'accepted' | 'preparing' | 'in_kitchen' | 'ready' | 'packed' | 'completed' | 'delivered' | 'cancelled'
  | 'paid' | 'unpaid' | 'refunded'
  | 'active' | 'inactive' | 'verified';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
  customLabel?: string;
  showIcon?: boolean;
}

/**
 * StatusBadge
 * Universal badge component automatically mapping lifecycle statuses to semantic colors, icons, and labels.
 */
export function StatusBadge({
  status,
  size = 'md',
  className = '',
  customLabel,
  showIcon = true,
}: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase().trim();

  let colorClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  let Icon = Clock;
  let label = customLabel || status;

  switch (normalized) {
    case 'pending':
      colorClasses = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900/40';
      Icon = Clock;
      label = customLabel || 'Pending';
      break;
    case 'accepted':
      colorClasses = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-900/40';
      Icon = CheckCircle2;
      label = customLabel || 'Accepted';
      break;
    case 'preparing':
    case 'in_kitchen':
      colorClasses = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40';
      Icon = ChefHat;
      label = customLabel || 'Preparing';
      break;
    case 'ready':
    case 'packed':
      colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
      Icon = PackageCheck;
      label = customLabel || 'Ready';
      break;
    case 'completed':
    case 'delivered':
      colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
      Icon = CheckCircle2;
      label = customLabel || 'Completed';
      break;
    case 'cancelled':
      colorClasses = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900/40';
      Icon = XCircle;
      label = customLabel || 'Cancelled';
      break;
    case 'paid':
      colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
      Icon = CheckCircle2;
      label = customLabel || 'Paid';
      break;
    case 'unpaid':
      colorClasses = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900/40';
      Icon = AlertCircle;
      label = customLabel || 'Unpaid';
      break;
    case 'active':
      colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
      Icon = ToggleRight;
      label = customLabel || 'Active';
      break;
    case 'inactive':
      colorClasses = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      Icon = ToggleLeft;
      label = customLabel || 'Inactive';
      break;
    case 'verified':
      colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
      Icon = ShieldCheck;
      label = customLabel || 'Verified';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 10 : 13;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wide shrink-0 ${colorClasses} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon size={iconSize} className="shrink-0" />}
      <span>{label}</span>
    </span>
  );
}
