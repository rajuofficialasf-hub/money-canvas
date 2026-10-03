import React, { ReactNode, ElementType } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export type StatCardVariant = 'default' | 'emerald' | 'sky' | 'rose' | 'amber';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ElementType<{ className?: string }>;
  trend?: {
    value: number | string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: StatCardVariant;
  className?: string;
  onClick?: () => void;
}

const valueColorClasses: Record<StatCardVariant, string> = {
  default: 'text-ink',
  emerald: 'text-accent-strong',
  sky: 'text-sky-400',
  rose: 'text-negative',
  amber: 'text-warning',
};

const iconBgClasses: Record<StatCardVariant, string> = {
  default: 'bg-raised text-ink-soft border-slate-700',
  emerald: 'bg-accent/10 text-accent-strong border-accent/20',
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  rose: 'bg-negative/10 text-negative border-negative/20',
  amber: 'bg-amber-500/10 text-warning border-amber-500/20',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-edge bg-surface/60 p-4 sm:p-5 flex flex-col justify-between space-y-2 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-700 hover:bg-surface/80 active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-ink-muted">
            {title}
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${valueColorClasses[variant]}`}
          >
            {value}
          </div>
        </div>

        {Icon && (
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${iconBgClasses[variant]}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-edge/60 text-[11px] font-mono">
          {subtitle && <span className="text-ink-faint truncate">{subtitle}</span>}

          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                trend.isPositive ? 'text-accent-strong' : 'text-negative'
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.value}</span>
              {trend.label && <span className="text-ink-faint text-[10px] font-normal">{trend.label}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
