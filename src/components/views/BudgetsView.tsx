import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Copy,
  Trash2,
  X,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export const BudgetsView: React.FC = () => {
  const { categories, budgets, upsertBudget, deleteBudget, getCategorySpent, createCategory } = useLedger();

  // Current active month
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formThreshold, setFormThreshold] = useState('90');
  const [formError, setFormError] = useState('');

  // Add Custom Category State
  const [isCreatingCustomCat, setIsCreatingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [customCatError, setCustomCatError] = useState('');

  // Expense categories only for budgeting
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Filter budgets for selected month
  const currentBudgets = budgets.filter((b) => b.monthYear === selectedMonth);

  // Totals
  const totalBudgeted = currentBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalSpent = currentBudgets.reduce((sum, b) => sum + getCategorySpent(b.categoryId, selectedMonth), 0);
  const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
  const overallPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

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
    });

    setIsAddModalOpen(false);
    setFormCategory('');
    setFormAmount('');
    setFormThreshold('90');
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

  const handleDuplicateToNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const nextMonth = `${year}-${month.toString().padStart(2, '0')}`;

    currentBudgets.forEach((b) => {
      upsertBudget({
        categoryId: b.categoryId,
        monthYear: nextMonth,
        allocatedAmount: b.allocatedAmount,
        warningThresholdPct: b.warningThresholdPct,
      });
    });

    setSelectedMonth(nextMonth);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <PieChart className="h-4 w-4" />
            <span>Monthly Budgets & Category Limits</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Monthly Budgets & Expense Limits</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Set custom allocation ceilings per expense category with double-entry tracking and warning thresholds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2 border border-slate-800 bg-slate-900/60 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="2026-08" className="bg-slate-900">August 2026</option>
              <option value="2026-09" className="bg-slate-900">September 2026</option>
              <option value="2026-10" className="bg-slate-900">October 2026</option>
              <option value="2026-11" className="bg-slate-900">November 2026</option>
              <option value="2026-12" className="bg-slate-900">December 2026</option>
            </select>
          </div>

          {currentBudgets.length > 0 && (
            <button
              onClick={handleDuplicateToNextMonth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs text-slate-300 hover:text-white transition-colors"
              title="Copy all current allocations to the following month"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy to Next Month</span>
            </button>
          )}

          <button
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold font-mono transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Budget Allocated</div>
          <div className="text-2xl font-bold text-white">৳{totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-slate-500 mt-1">{currentBudgets.length} Category allocations active</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Realized Spend</div>
          <div className="text-2xl font-bold text-sky-400">৳{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-slate-500 mt-1">{overallPct.toFixed(1)}% of total monthly ceiling</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Remaining Safe Margin</div>
          <div className={`text-2xl font-bold ${totalSpent > totalBudgeted ? 'text-rose-400' : 'text-emerald-400'}`}>
            ৳{totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalSpent > totalBudgeted ? 'Over-budget by ৳' + (totalSpent - totalBudgeted).toLocaleString() : 'Buffer left for discretionary spend'}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Monthly Ceiling Utilization ({selectedMonth})</span>
          <span className={overallPct >= 100 ? 'text-rose-400 font-bold' : overallPct >= 90 ? 'text-amber-400' : 'text-emerald-400'}>
            {overallPct.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              overallPct >= 100 ? 'bg-rose-500' : overallPct >= 90 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, overallPct)}%` }}
          />
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-slate-300">
          Category Ceilings & Real-Time Variances
        </h3>

        {currentBudgets.length === 0 ? (
          <div className="p-8 text-center border border-slate-800/80 rounded-xl bg-slate-900/20">
            <PieChart className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-300">No budgets configured for {selectedMonth}</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Set monthly spending caps for your expense categories to prevent overruns.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-semibold"
            >
              Add First Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentBudgets.map((b) => {
              const cat = categories.find((c) => c.id === b.categoryId);
              const spent = getCategorySpent(b.categoryId, selectedMonth);
              const pct = (spent / b.allocatedAmount) * 100;
              const remaining = b.allocatedAmount - spent;
              const isOver = spent > b.allocatedAmount;
              const isWarning = !isOver && pct >= b.warningThresholdPct;

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-medium text-sm flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat?.color || '#10B981' }}
                        />
                        <span>{cat?.name || 'Unassigned Category'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Alert at {b.warningThresholdPct}% · {selectedMonth}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteBudget(b.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                        title="Delete Budget"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Spent: ৳{spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className="text-white">Limit: ৳{b.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-slate-500">{pct.toFixed(1)}% used</span>
                      <span className={isOver ? 'text-rose-400 font-medium' : isWarning ? 'text-amber-400' : 'text-emerald-400'}>
                        {isOver ? `Over by ৳${Math.abs(remaining).toLocaleString()}` : `৳${remaining.toLocaleString()} remaining`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Budget Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Set Category Budget</h3>
                <div className="text-xs text-slate-400 font-mono">Month: {selectedMonth}</div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 uppercase tracking-wider">Expense Category</label>
                  {!isCreatingCustomCat && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomCat(true)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Custom Category</span>
                    </button>
                  )}
                </div>

                {isCreatingCustomCat ? (
                  <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-emerald-400 font-semibold uppercase">New Custom Category</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCustomCat(false);
                          setCustomCatName('');
                          setCustomCatError('');
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {customCatError && (
                      <div className="text-[11px] text-rose-400">{customCatError}</div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Gaming, Baby Care, Pet Supplies"
                        value={customCatName}
                        onChange={(e) => setCustomCatName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCustomCategory}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Monthly Allocated Ceiling (BDT)</label>
                <input
                  type="number"
                  step="100"
                  placeholder="e.g. 25000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Warning Alert Threshold (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Triggers amber warning when category spend reaches this %.</p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
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
