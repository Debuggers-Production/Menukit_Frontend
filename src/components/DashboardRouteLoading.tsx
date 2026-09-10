import React from 'react';

export const DashboardRouteLoading: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse py-1">
      {/* Top glowing indeterminate progress line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200/50 dark:bg-slate-800/50 z-50 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-500 via-primary to-purple-600 animate-route-progress w-1/3 rounded-full" />
      </div>

      {/* Header bar placeholder skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-28 bg-primary/20 dark:bg-primary/30 rounded-xl" />
        </div>
      </div>

      {/* Stats/Action Cards Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-7 w-7 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Content Area Placeholder */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 space-y-4">
        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-44 w-full bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            Loading page...
          </div>
        </div>
      </div>
    </div>
  );
};
