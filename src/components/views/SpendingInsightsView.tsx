import React, { useState, useMemo } from 'react';
import { useLedger } from '../../lib/ledger-context';
import {
  computeSpendingTrendsAndInsights,
  formatMonthLabel,
} from '../../lib/budget-rollover-engine';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Calendar,
  Layers,
  ArrowUpRight,
  Info,
  DollarSign,
  PieChart,
} from 'lucide-react';

interface SpendingInsightsViewProps {
  selectedMonth: string;
  onSelectMonth?: (m: string) => void;
}

export const SpendingInsightsView: React.FC<SpendingInsightsViewProps> = ({
  selectedMonth,
  onSelectMonth,
}) => {
  const { categories, transactions, transactionLines, budgets } = useLedger();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  const { monthlyData, categoryMetrics, insights, overallStats } = useMemo(() => {
    return computeSpendingTrendsAndInsights(
      categories,
      transactions,
      transactionLines,
      budgets,
      selectedMonth,
      6
    );
  }, [categories, transactions, transactionLines, budgets, selectedMonth]);

  // Max value for SVG chart scaling
  const maxBarValue = useMemo(() => {
    let max = 1000;
    for (const d of monthlyData) {
      if (d.totalSpend > max) max = d.totalSpend;
      if (d.totalBudget > max) max = d.totalBudget;
    }
    return max * 1.15; // 15% headroom
  }, [monthlyData]);

  // Filtered categories
  const filteredCategoryMetrics = useMemo(() => {
    if (activeCategoryFilter === 'all') return categoryMetrics;
    return categoryMetrics.filter((c) => c.categoryId === activeCategoryFilter);
  }, [categoryMetrics, activeCategoryFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 6-Mo Average */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>6-Month Monthly Average</span>
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ৳{overallStats.averageMonthlySpend.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Normalized monthly burn rate
          </div>
        </div>

        {/* Card 2: Highest Outflow Month */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Peak Spending Month</span>
            <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {overallStats.highestSpendMonth}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Seasonal expenditure peak
          </div>
        </div>

        {/* Card 3: Budget Adherence Rate */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Budget Adherence Rate</span>
            <div className="h-6 w-6 rounded bg-sky-500/10 flex items-center justify-center text-sky-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-sky-400 font-mono">
            {overallStats.budgetComplianceRate}%
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Months kept under ceiling
          </div>
        </div>

        {/* Card 4: Total Tracked Outflow */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total 6-Month Outflow</span>
            <div className="h-6 w-6 rounded bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">
            ৳{overallStats.totalTrackedSpend.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Across {categoryMetrics.length} active categories
          </div>
        </div>
      </div>

      {/* 6-Month Visual Trend Chart (Actual Spend vs Budget Target) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-slate-200">
              6-Month Spending vs Budget Target
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative visualization of realized spending against monthly allocations.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              <span className="text-slate-300">Actual Spend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-700 border border-slate-600 inline-block" />
              <span className="text-slate-400">Budget Ceiling</span>
            </div>
          </div>
        </div>

        {/* SVG Bar Chart */}
        <div className="pt-4">
          <div className="grid grid-cols-6 gap-2 sm:gap-4 h-56 items-end border-b border-slate-800 pb-2">
            {monthlyData.map((d) => {
              const spendHeightPct = maxBarValue > 0 ? (d.totalSpend / maxBarValue) * 100 : 0;
              const budgetHeightPct = maxBarValue > 0 ? (d.totalBudget / maxBarValue) * 100 : 0;
              const isSelected = d.monthYear === selectedMonth;
              const isOver = d.totalBudget > 0 && d.totalSpend > d.totalBudget;

              return (
                <div
                  key={d.monthYear}
                  onClick={() => onSelectMonth && onSelectMonth(d.monthYear)}
                  className={`flex flex-col items-center justify-end h-full group cursor-pointer p-1 rounded-lg transition-colors ${
                    isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                  }`}
                  title={`${d.label}: Spent ৳${d.totalSpend.toLocaleString()}, Budget ৳${d.totalBudget.toLocaleString()}`}
                >
                  {/* Tooltip on hover */}
                  <div className="text-[10px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ৳{(d.totalSpend / 1000).toFixed(1)}k
                  </div>

                  {/* Dual Bar Container */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-44">
                    {/* Budget Bar */}
                    <div
                      className="w-2.5 sm:w-4 rounded-t bg-slate-800 border-t border-slate-600 transition-all duration-300"
                      style={{ height: `${Math.max(4, Math.min(100, budgetHeightPct))}%` }}
                    />
                    {/* Actual Spend Bar */}
                    <div
                      className={`w-2.5 sm:w-4 rounded-t transition-all duration-300 ${
                        isOver
                          ? 'bg-rose-500 shadow-lg shadow-rose-950/40'
                          : isSelected
                          ? 'bg-emerald-400 shadow-lg shadow-emerald-950/40'
                          : 'bg-emerald-500/80 hover:bg-emerald-500'
                      }`}
                      style={{ height: `${Math.max(4, Math.min(100, spendHeightPct))}%` }}
                    />
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center">
                    <span
                      className={`text-[11px] font-mono ${
                        isSelected ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {d.label.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smart Financial Insights Cards */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold font-mono uppercase tracking-wider text-slate-300">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Smart Financial Intelligence & Recommendations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => {
              let borderClass = 'border-slate-800 bg-slate-900/40';
              let icon = <Info className="h-4 w-4 text-sky-400" />;
              let badgeBg = 'bg-sky-500/10 text-sky-400 border-sky-500/20';

              if (insight.type === 'success') {
                borderClass = 'border-emerald-500/30 bg-emerald-950/15';
                icon = <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
                badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              } else if (insight.type === 'warning') {
                borderClass = 'border-amber-500/30 bg-amber-950/15';
                icon = <AlertTriangle className="h-4 w-4 text-amber-400" />;
                badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              } else if (insight.type === 'tip') {
                borderClass = 'border-purple-500/30 bg-purple-950/15';
                icon = <Lightbulb className="h-4 w-4 text-purple-400" />;
                badgeBg = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
              }

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-xl border ${borderClass} space-y-2 transition-all`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-900">{icon}</div>
                      <h4 className="text-xs font-semibold text-white">{insight.title}</h4>
                    </div>

                    {insight.metric && (
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${badgeBg}`}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-8">
                    {insight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category 6-Month Trend Matrix */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-slate-200">
              Category 6-Month Trajectory & Variance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Month-over-month trajectory, normalized average, and peak spending per category.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter:</span>
            <select
              value={activeCategoryFilter}
              onChange={(e) => setActiveCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="all">All Categories ({categoryMetrics.length})</option>
              {categoryMetrics.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredCategoryMetrics.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No category transactions recorded in this 6-month window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">6-Mo Average</th>
                  <th className="py-2.5 px-3 text-right">Current Spend</th>
                  <th className="py-2.5 px-3 text-center">MoM Trend</th>
                  <th className="py-2.5 px-3 text-right">Peak Month</th>
                  <th className="py-2.5 px-3 text-right">6-Mo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredCategoryMetrics.map((m) => {
                  const isIncreasing = m.trendDirection === 'increasing';
                  const isDecreasing = m.trendDirection === 'decreasing';

                  return (
                    <tr key={m.categoryId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: m.categoryColor }}
                          />
                          <span className="font-semibold text-white">{m.categoryName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-300">
                        ৳{m.averageMonthlySpend.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-white">
                        ৳{m.currentMonthSpend.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isIncreasing
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isDecreasing
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isIncreasing ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : isDecreasing ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          <span>
                            {m.momChangePct > 0 ? `+${m.momChangePct}%` : `${m.momChangePct}%`}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        <span>{m.highestMonthLabel}</span>{' '}
                        <span className="text-slate-500">
                          (৳{m.highestMonthSpend.toLocaleString(undefined, { minimumFractionDigits: 0 })})
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-300">
                        ৳{m.total6MonthSpend.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
