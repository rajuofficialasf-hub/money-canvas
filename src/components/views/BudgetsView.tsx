import React, { useState, useMemo } from 'react';
import { useLedger } from '../../lib/ledger-context';
import {
  calculateBudgetRollover,
  getPreviousMonth,
  getNextMonth,
  formatMonthLabel,
} from '../../lib/budget-rollover-engine';
import { SpendingInsightsView } from './SpendingInsightsView';
import {
  PieChart,
  Plus,
  Calendar,
  Copy,
  Trash2,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Budget } from '../../types/accounting';

export const BudgetsView: React.FC = () => {
  const { categories, budgets, upsertBudget, deleteBudget, getCategorySpent, createCategory } = useLedger();

  // Active Tab: 'budgets' | 'insights'
  const [activeTab, setActiveTab] = useState<'budgets' | 'insights'>('budgets');

  // Current active month
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formThreshold, setFormThreshold] = useState('90');
  const [formRollover, setFormRollover] = useState(true); // default opt-in
  const [formError, setFormError] = useState('');

  // Add Custom Category State
  const [isCreatingCustomCat, setIsCreatingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [customCatError, setCustomCatError] = useState('');

  // Expense categories only for budgeting
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Filter budgets for selected month
  const currentBudgets = budgets.filter((b) => b.monthYear === selectedMonth);

  // Budget summaries with rollover calculations
  const budgetSummaries = useMemo(() => {
    return currentBudgets.map((b) =>
      calculateBudgetRollover(b, budgets, categories, getCategorySpent)
    );
  }, [currentBudgets, budgets, categories, getCategorySpent]);

  // Totals
  const totalBaseAllocated = budgetSummaries.reduce((sum, b) => sum + b.baseAllocation, 0);
  const totalRolloverCarried = budgetSummaries.reduce((sum, b) => sum + b.rolloverAmount, 0);
  const totalEffectiveLimit = budgetSummaries.reduce((sum, b) => sum + b.effectiveLimit, 0);
  const totalSpent = budgetSummaries.reduce((sum, b) => sum + b.realizedSpend, 0);
  const totalRemaining = Math.max(0, totalEffectiveLimit - totalSpent);
  const overallPct = totalEffectiveLimit > 0 ? (totalSpent / totalEffectiveLimit) * 100 : 0;

  // Previous month string for label
  const prevMonthStr = getPreviousMonth(selectedMonth);

  // Generate selectable months (past 12 months + next 6 months)
  const availableMonths = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    // 12 months back to 6 months forward
    for (let i = -12; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mStr = d.toISOString().slice(0, 7);
      list.push(mStr);
    }
    return list;
  }, []);

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formCategory) {
      setFormError('Please select an expense category.');
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Allocated amount must be a positive number.');
      return;
    }
    const thresh = parseFloat(formThreshold);
    if (isNaN(thresh) || thresh < 10 || thresh > 100) {
      setFormError('Warning threshold must be between 10% and 100%.');
      return;
    }

    upsertBudget({
      categoryId: formCategory,
      monthYear: selectedMonth,
      allocatedAmount: amt,
      warningThresholdPct: thresh,
      rolloverEnabled: formRollover,
    });

    setIsAddModalOpen(false);
    setFormCategory('');
    setFormAmount('');
    setFormThreshold('90');
    setFormRollover(true);
    setIsCreatingCustomCat(false);
    setCustomCatName('');
    setCustomCatError('');
  };

  const handleCreateCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomCatError('');
    if (!customCatName.trim()) {
      setCustomCatError('Please enter a category name.');
      return;
    }

    const existing = categories.find(
      (c) => c.name.toLowerCase() === customCatName.trim().toLowerCase() && c.type === 'expense'
    );
    if (existing) {
      setFormCategory(existing.id);
      setIsCreatingCustomCat(false);
      setCustomCatName('');
      return;
    }

    const newCat = createCategory({
      name: customCatName.trim(),
      type: 'expense',
      color: '#10b981',
    });

    setFormCategory(newCat.id);
    setIsCreatingCustomCat(false);
    setCustomCatName('');
  };

  const handleToggleRollover = (budget: Budget) => {
    const newEnabled = !budget.rolloverEnabled;
    upsertBudget({
      categoryId: budget.categoryId,
      monthYear: budget.monthYear,
      allocatedAmount: budget.allocatedAmount,
      warningThresholdPct: budget.warningThresholdPct,
      rolloverEnabled: newEnabled,
    });
  };

  const handleDuplicateToNextMonth = () => {
    const nextMonth = getNextMonth(selectedMonth);

    currentBudgets.forEach((b) => {
      upsertBudget({
        categoryId: b.categoryId,
        monthYear: nextMonth,
        allocatedAmount: b.allocatedAmount,
        warningThresholdPct: b.warningThresholdPct,
        rolloverEnabled: b.rolloverEnabled ?? false,
      });
    });

    setSelectedMonth(nextMonth);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1">
            <PieChart className="h-4 w-4" />
            <span>Monthly Budgets & Category Limits</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Monthly Budgets & Spending Insights
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-0.5">
            Dynamic category ceilings with opt-in unspent surplus rollover and 6-month predictive trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2 border border-edge bg-surface/60 rounded-lg px-3 py-1.5 text-xs font-mono text-ink-soft">
            <Calendar className="h-3.5 w-3.5 text-ink-muted" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-ink focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-surface">
                  {formatMonthLabel(m, false)}
                </option>
              ))}
            </select>
          </div>

          {currentBudgets.length > 0 && activeTab === 'budgets' && (
            <button
              onClick={handleDuplicateToNextMonth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge-strong bg-raised/80 text-xs text-ink-soft hover:text-ink transition-colors"
              title="Copy all current allocations to the following month"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy to Next Month</span>
            </button>
          )}

          {activeTab === 'budgets' && (
            <button
              onClick={() => {
                setFormError('');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink text-xs font-semibold font-mono transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Set Budget</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-edge pb-3">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'budgets'
              ? 'bg-accent text-accent-ink shadow-lg shadow-emerald-950/40 font-semibold'
              : 'bg-surface/80 text-ink-muted hover:text-ink border border-edge'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>মাসিক বাজেট ও রোলওভার (Monthly Budgets & Rollover)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-raised text-ink-soft">
            {currentBudgets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'insights'
              ? 'bg-accent text-accent-ink shadow-lg shadow-emerald-950/40 font-semibold'
              : 'bg-surface/80 text-ink-muted hover:text-ink border border-edge'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-warning" />
          <span>খরচের ইনসাইটস ও ৬-মাসের ট্রেন্ড (Spending Insights & Trends)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-warning/20 text-warning font-bold">
            NEW
          </span>
        </button>
      </div>

      {/* TAB CONTENT: INSIGHTS */}
      {activeTab === 'insights' ? (
        <SpendingInsightsView
          selectedMonth={selectedMonth}
          onSelectMonth={(m) => {
            setSelectedMonth(m);
            setActiveTab('budgets');
          }}
        />
      ) : (
        /* TAB CONTENT: MONTHLY BUDGETS & ROLLOVER */
        <>
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {/* Base Allocation */}
            <div className="rounded-xl border border-edge bg-surface/40 p-4 space-y-1">
              <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
                Base Allocation
              </div>
              <div className="text-xl font-bold text-ink">
                ৳{totalBaseAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-ink-faint">
                {currentBudgets.length} Category ceilings
              </div>
            </div>

            {/* Carried Rollover */}
            <div className="rounded-xl border border-edge bg-surface/40 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted uppercase tracking-wider mb-1">
                <span>Rollover Surplus</span>
                <Sparkles className="h-3.5 w-3.5 text-accent-strong" />
              </div>
              <div className="text-xl font-bold text-accent-strong">
                +৳{totalRolloverCarried.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-ink-faint">
                Carried from {formatMonthLabel(prevMonthStr, true)}
              </div>
            </div>

            {/* Realized Spend */}
            <div className="rounded-xl border border-edge bg-surface/40 p-4 space-y-1">
              <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
                Total Realized Spend
              </div>
              <div className="text-xl font-bold text-sky-400">
                ৳{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-ink-faint">
                {overallPct.toFixed(1)}% of effective ceiling
              </div>
            </div>

            {/* Remaining Margin against Effective Limit */}
            <div className="rounded-xl border border-edge bg-surface/40 p-4 space-y-1">
              <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">
                Effective Safe Margin
              </div>
              <div
                className={`text-xl font-bold ${
                  totalSpent > totalEffectiveLimit ? 'text-negative' : 'text-accent-strong'
                }`}
              >
                ৳{totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-ink-faint">
                {totalSpent > totalEffectiveLimit
                  ? `Over-budget by ৳${(totalSpent - totalEffectiveLimit).toLocaleString()}`
                  : `Total limit: ৳${totalEffectiveLimit.toLocaleString()}`}
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="rounded-xl border border-edge bg-surface/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-ink-muted">
                  Effective Ceiling Utilization ({formatMonthLabel(selectedMonth, false)})
                </span>
                {totalRolloverCarried > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent-strong border border-accent/20">
                    Includes +৳{totalRolloverCarried.toLocaleString()} Rollover
                  </span>
                )}
              </div>
              <span
                className={
                  overallPct >= 100
                    ? 'text-negative font-bold'
                    : overallPct >= 90
                    ? 'text-warning'
                    : 'text-accent-strong'
                }
              >
                {overallPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full bg-raised rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  overallPct >= 100
                    ? 'bg-negative'
                    : overallPct >= 90
                    ? 'bg-warning'
                    : 'bg-accent'
                }`}
                style={{ width: `${Math.min(100, overallPct)}%` }}
              />
            </div>
          </div>

          {/* Category Budgets Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-ink-soft">
                Category Ceilings & Rollover Balances
              </h3>
              <div className="text-xs text-ink-faint font-mono">
                Click "Rollover" badge to toggle carry-forward per category
              </div>
            </div>

            {budgetSummaries.length === 0 ? (
              <div className="p-8 text-center border border-edge/80 rounded-xl bg-surface/20">
                <PieChart className="h-8 w-8 text-ink-faint mx-auto mb-2" />
                <div className="text-sm font-medium text-ink-soft">
                  No budgets configured for {formatMonthLabel(selectedMonth, false)}
                </div>
                <p className="text-xs text-ink-faint mt-1 max-w-sm mx-auto">
                  Set monthly spending caps for your expense categories to prevent overruns and enable surplus rollover.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-mono text-xs font-semibold"
                >
                  Add First Budget
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgetSummaries.map((summary) => {
                  const rawBudget = currentBudgets.find((b) => b.id === summary.budgetId);
                  const isOver = summary.isOverBudget;
                  const isWarning = summary.isWarning;

                  return (
                    <div
                      key={summary.budgetId}
                      className="rounded-xl border border-edge bg-surface/40 p-4 space-y-3 hover:border-edge-strong transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-ink font-medium text-sm flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: summary.categoryColor }}
                            />
                            <span>{summary.categoryName}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-ink-faint font-mono mt-1">
                            <span>Base: ৳{summary.baseAllocation.toLocaleString()}</span>
                            {summary.rolloverEnabled && summary.rolloverAmount > 0 && (
                              <span className="text-accent-strong font-semibold">
                                +৳{summary.rolloverAmount.toLocaleString()} Rollover
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Opt-in Rollover Button */}
                          <button
                            onClick={() => rawBudget && handleToggleRollover(rawBudget)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                              summary.rolloverEnabled
                                ? 'bg-accent/10 text-accent-strong border-accent/30 hover:bg-accent/20'
                                : 'bg-raised/80 text-ink-faint border-edge-strong hover:text-ink-soft'
                            }`}
                            title={
                              summary.rolloverEnabled
                                ? 'Rollover is active: unspent surplus from previous month is added to ceiling'
                                : 'Click to enable rollover surplus carry-forward'
                            }
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>{summary.rolloverEnabled ? 'Rollover ON' : 'Rollover OFF'}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => deleteBudget(summary.budgetId)}
                            className="text-ink-faint hover:text-negative p-1 rounded transition-colors"
                            title="Delete Budget"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* UX-9: remaining-to-spend is the primary number */}
                      <div className="font-mono">
                        <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                          আর কত খরচ করা যাবে (Left to Spend)
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            isOver
                              ? 'text-negative'
                              : summary.remainingSafeMargin > 0
                              ? 'text-positive'
                              : 'text-ink'
                          }`}
                        >
                          {isOver ? '−' : ''}৳
                          {Math.abs(summary.remainingSafeMargin).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>

                      {/* Progress Line */}
                      <div className="space-y-1.5 font-mono">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ink-muted">
                            Spent: ৳
                            {summary.realizedSpend.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <span className="text-ink font-semibold">
                            Effective Limit: ৳
                            {summary.effectiveLimit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        <div className="h-2 w-full bg-raised rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOver
                                ? 'bg-negative'
                                : isWarning
                                ? 'bg-warning'
                                : 'bg-accent'
                            }`}
                            style={{ width: `${Math.min(100, summary.utilizationPct)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-ink-faint">
                            {summary.utilizationPct.toFixed(1)}% used
                          </span>
                          <span
                            className={
                              isOver
                                ? 'text-negative font-medium'
                                : isWarning
                                ? 'text-warning'
                                : 'text-accent-strong'
                            }
                          >
                            {isOver
                              ? `Over by ৳${Math.abs(summary.remainingSafeMargin).toLocaleString()}`
                              : `৳${summary.remainingSafeMargin.toLocaleString()} remaining`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Budget Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-edge rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink">Set Category Budget</h3>
                <div className="text-xs text-ink-muted font-mono">
                  Month: {formatMonthLabel(selectedMonth, false)}
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-ink-muted hover:text-ink p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-negative/30 text-negative text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-ink-soft uppercase tracking-wider">
                    Expense Category
                  </label>
                  {!isCreatingCustomCat && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomCat(true)}
                      className="text-[11px] text-accent-strong hover:text-accent-strong flex items-center gap-1 font-sans"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Custom Category</span>
                    </button>
                  )}
                </div>

                {isCreatingCustomCat ? (
                  <div className="p-3 bg-canvas border border-accent/40 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-accent-strong font-semibold uppercase">
                        New Custom Category
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCustomCat(false);
                          setCustomCatName('');
                          setCustomCatError('');
                        }}
                        className="text-ink-muted hover:text-ink"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {customCatError && (
                      <div className="text-[11px] text-negative">{customCatError}</div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Gaming, Baby Care, Pet Supplies"
                        value={customCatName}
                        onChange={(e) => setCustomCatName(e.target.value)}
                        className="flex-1 bg-surface border border-edge-strong rounded-lg px-2.5 py-1.5 text-ink text-xs focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCustomCategory}
                        className="px-3 py-1.5 bg-accent-deep hover:bg-accent text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsCreatingCustomCat(true);
                      } else {
                        setFormCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="">-- Choose Category --</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__new__">+ Add New Custom Category...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-ink-soft uppercase tracking-wider mb-1.5">
                  Monthly Allocated Ceiling (BDT)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 25000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-ink-soft uppercase tracking-wider mb-1.5">
                  Warning Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(e.target.value)}
                  className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
                <p className="text-[10px] text-ink-faint mt-1">
                  Triggers amber warning when category spend reaches this %.
                </p>
              </div>

              {/* Rollover Toggle Checkbox */}
              <div className="p-3 rounded-lg border border-edge bg-canvas flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="rolloverToggle"
                  checked={formRollover}
                  onChange={(e) => setFormRollover(e.target.checked)}
                  className="mt-0.5 rounded border-edge-strong text-accent focus:ring-accent bg-surface cursor-pointer"
                />
                <label
                  htmlFor="rolloverToggle"
                  className="cursor-pointer text-ink-soft"
                  title="মাস শেষে এই ক্যাটাগরির অবশিষ্ট উদ্বৃত্ত টাকা পরবর্তী মাসের বাজেটের সাথে স্বয়ংক্রিয়ভাবে যোগ হবে। (Unspent surplus auto-adds to next month's ceiling.)"
                >
                  <div className="font-semibold text-ink flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-warning" />
                    <span>অব্যবহৃত বাজেট রোলওভার (Budget Rollover)</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-edge">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-edge text-ink-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold transition-colors"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
