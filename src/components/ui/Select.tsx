import React, { forwardRef, SelectHTMLAttributes, ElementType } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  icon?: ElementType<{ className?: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error = false, icon: Icon, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}

        <select
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          className={`w-full rounded-xl border ${
            error
              ? 'border-rose-500/80 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30'
              : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
          } bg-slate-950 ${
            Icon ? 'pl-9' : 'px-3'
          } py-2 text-white font-sans text-xs outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
