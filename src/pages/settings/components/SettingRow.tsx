import React from 'react';
import { Switch } from '@/components/ui/Switch';

export interface SettingRowProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
  className?: string;
}

export function SettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  disabled,
  badge,
  className,
}: SettingRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-3 px-3.5 rounded-xl transition-colors border border-transparent ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200/60 dark:hover:border-slate-700/60'
      } ${className || ''}`}
    >
      <div className="flex items-start gap-3 min-w-0 pr-4">
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5">
            <Icon size={16} />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</p>
            {badge}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="shrink-0 ml-2"
      />
    </div>
  );
}

