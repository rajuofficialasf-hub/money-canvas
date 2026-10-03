import React, { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export type BannerVariant = 'error' | 'warning' | 'info' | 'success';

export interface ErrorBannerProps {
  title?: string;
  message: ReactNode;
  variant?: BannerVariant;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantStyles: Record<
  BannerVariant,
  { container: string; icon: typeof AlertCircle; iconColor: string; titleColor: string; textColor: string }
> = {
  error: {
    container: 'border-negative/30 bg-negative/10',
    icon: AlertCircle,
    iconColor: 'text-negative',
    titleColor: 'text-negative',
    textColor: 'text-rose-200/90',
  },
  warning: {
    container: 'border-warning/30 bg-warning/10',
    icon: AlertTriangle,
    iconColor: 'text-warning',
    titleColor: 'text-warning',
    textColor: 'text-amber-200/90',
  },
  info: {
    container: 'border-sky-500/30 bg-sky-500/10',
    icon: Info,
    iconColor: 'text-sky-400',
    titleColor: 'text-sky-300',
    textColor: 'text-sky-200/90',
  },
  success: {
    container: 'border-accent/30 bg-accent/10',
    icon: CheckCircle2,
    iconColor: 'text-accent-strong',
    titleColor: 'text-accent-strong',
    textColor: 'text-emerald-200/90',
  },
};

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title,
  message,
  variant = 'error',
  onDismiss,
  action,
  className = '',
}) => {
  const style = variantStyles[variant];
  const IconComponent = style.icon;

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-150 ${style.container} ${className}`}
    >
      <IconComponent className={`h-4 w-4 shrink-0 mt-0.5 ${style.iconColor}`} />

      <div className="flex-1 space-y-1">
        {title && <div className={`font-semibold tracking-tight ${style.titleColor}`}>{title}</div>}
        <div className={style.textColor}>{message}</div>

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 text-xs font-semibold underline hover:opacity-80 cursor-pointer block"
          >
            {action.label}
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss banner"
          className="text-ink-muted hover:text-ink p-0.5 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
