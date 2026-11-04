import React from 'react';

export interface FilterTabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface FilterPillTabsProps<T extends string = string> {
  tabs: FilterTabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

/**
 * FilterPillTabs
 * High-reusability horizontal segment filter tabs.
 * Renders badges, counts, and active pills with white text on active theme background.
 */
export function FilterPillTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: FilterPillTabsProps<T>) {
  return (
    <div className={`flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${
              isActive
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
            }`}
          >
            {Icon && <Icon size={14} className={isActive ? 'text-white' : 'text-slate-500'} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
