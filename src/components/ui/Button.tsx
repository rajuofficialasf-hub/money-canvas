import { forwardRef, ButtonHTMLAttributes, ElementType } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ElementType<{ className?: string }>;
  rightIcon?: ElementType<{ className?: string }>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/50',
  secondary:
    'bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold border border-slate-700',
  outline:
    'bg-transparent hover:bg-slate-800 active:scale-95 text-slate-300 font-medium border border-slate-800 hover:border-slate-700',
  danger:
    'bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 font-semibold border border-rose-500/30',
  ghost:
    'bg-transparent hover:bg-slate-800/60 active:scale-95 text-slate-400 hover:text-slate-200 font-medium border-transparent',
  success:
    'bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 font-semibold border border-emerald-500/30',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-[11px] rounded-lg gap-1.5',
  md: 'px-3.5 py-2 text-xs rounded-xl gap-2',
  lg: 'px-4 py-2.5 text-sm rounded-xl gap-2.5',
  icon: 'p-2 rounded-xl text-xs',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      icon: Icon,
      rightIcon: RightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${
          variantClasses[variant]
        } ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        ) : Icon ? (
          <Icon className="h-3.5 w-3.5 shrink-0" />
        ) : null}

        {children}

        {!isLoading && RightIcon && <RightIcon className="h-3.5 w-3.5 shrink-0" />}
      </button>
    );
  }
);

Button.displayName = 'Button';
