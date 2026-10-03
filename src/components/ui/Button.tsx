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
    'bg-accent hover:bg-accent-strong active:scale-95 text-accent-ink font-bold shadow-lg shadow-emerald-500/20 border border-accent-strong/50',
  secondary:
    'bg-raised hover:bg-slate-700 active:scale-95 text-ink-soft font-semibold border border-slate-700',
  outline:
    'bg-transparent hover:bg-raised active:scale-95 text-ink-soft font-medium border border-edge hover:border-slate-700',
  danger:
    'bg-negative/10 hover:bg-negative/20 active:scale-95 text-negative font-semibold border border-negative/30',
  ghost:
    'bg-transparent hover:bg-raised/60 active:scale-95 text-ink-muted hover:text-ink-soft font-medium border-transparent',
  success:
    'bg-accent/10 hover:bg-accent/20 active:scale-95 text-accent-strong font-semibold border border-accent/30',
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
