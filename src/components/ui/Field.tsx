import React, { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  className = '',
  children,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-mono text-slate-300 font-medium"
        >
          {label}
          {required && <span className="text-rose-400 ml-1 select-none">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium animate-in fade-in">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : hint ? (
        <p className="text-[11px] text-slate-500 font-sans leading-normal">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
