import React from 'react';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export function Switch({ checked, onChange, label, description, className = '', ...props }: SwitchProps) {
  return (
    <label className={`flex items-center cursor-pointer ${className}`}>
      <div className={`relative flex-shrink-0 ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked}
          onChange={(e) => !props.disabled && onChange(e.target.checked)}
          {...props} 
        />
        <div className={`block w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
        <div className={`absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'} shadow-sm`}></div>
      </div>
      {(label || description) && (
        <div className="ml-3 select-none flex-1">
          {label && <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center">{label}</div>}
          {description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</div>}
        </div>
      )}
    </label>
  );
}
