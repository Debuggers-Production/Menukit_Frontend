import React from 'react';
import { Save, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UnsavedChangesBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({
  isDirty,
  isSaving,
  onSave,
  onReset,
}) => {
  if (!isDirty) return null;

  return (
    <div className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-lg z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-2xl p-4 sm:px-5 sm:py-3.5 shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <div className="truncate">
            <p className="text-xs font-bold leading-tight truncate">Unsaved Changes</p>
            <p className="text-[11px] text-slate-300 hidden sm:block truncate">
              You have modified configuration settings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isSaving}
            className="h-8 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
          >
            <RotateCcw size={12} className="mr-1" />
            Reset
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-8 px-3.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary-600 text-white shadow-md cursor-pointer"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin mr-1" /> : <Save size={13} className="mr-1" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

