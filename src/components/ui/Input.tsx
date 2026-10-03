import { forwardRef, InputHTMLAttributes, ElementType, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: ElementType<{ className?: string }>;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, icon: Icon, rightElement, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-faint">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}

        <input
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          className={`w-full rounded-xl border ${
            error
              ? 'border-negative/80 focus:border-negative focus:ring-1 focus:ring-rose-500/30'
              : 'border-edge focus:border-accent focus:ring-1 focus:ring-accent/20'
          } bg-canvas ${Icon ? 'pl-9' : 'px-3'} ${
            rightElement ? 'pr-10' : 'pr-3'
          } py-2 text-ink font-sans text-xs placeholder-slate-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
