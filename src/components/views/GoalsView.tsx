import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { GoalMode } from '../../types/accounting';
import {
  Target,
  Plus,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  TrendingUp,
  X,
  Sparkles,
  Wallet,
  Building2,
} from 'lucide-react';

export const GoalsView: React.FC = () => {
  const {
    financialGoals,
    goalContributions,
    accounts,
    accountBalances,
    createGoal,
    contributeToGoal,
    updateGoalStatus,
  } = useLedger();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGoalForContrib, setSelectedGoalForContrib] = useState<string | null>(null);

  // Create Form State
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalMode, setGoalMode] = useState<GoalMode>('tracking_goal');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [createError, setCreateError] = useState('');

  // Contribution Form State
  const [contribAmount, setContribAmount] = useState('');
  const [contribSourceId, setContribSourceId] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [contribError, setContribError] = useState('');

  const activeGoals = financialGoals.filter((g) => g.status === 'in_progress');
  const achievedGoals = financialGoals.filter((g) => g.status === 'achieved');

  // Helper to compute saved amount based on Lock 3
  const getGoalProgress = (goal: (typeof financialGoals)[0]) => {
    let currentSaved = 0;
    if (goal.goalMode === 'tracking_goal') {
      // Sum of contributions logged for this goal
      currentSaved = goalContributions
        .filter((c) => c.goalId === goal.id)
        .reduce((sum, c) => sum + c.amount, 0);
    } else {
      // Derived from the live balance of the linked canonical account
      if (goal.linkedAccountId) {
        const bal = accountBalances.find((b) => b.accountId === goal.linkedAccountId);
        currentSaved = bal ? Math.max(0, bal.currentBalance) : 0;
      }
    }

    const pct = goal.targetAmount > 0 ? (currentSaved / goal.targetAmount) * 100 : 0;
    const remaining = Math.max(0, goal.targetAmount - currentSaved);

    // Calculate months remaining and monthly required
    const today = new Date();
    const target = new Date(goal.targetDate);
    const monthsRemaining = Math.max(
      1,
      (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
    );
    const monthlyRequired = remaining > 0 ? remaining / monthsRemaining : 0;

    return { currentSaved, pct, remaining, monthsRemaining, monthlyRequired };
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!goalName.trim()) {
      setCreateError('Please enter a goal name.');
      return;
    }
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      setCreateError('Target amount must be greater than zero.');
      return;
    }
    if (!targetDate) {
      setCreateError('Please select a target achievement date.');
      return;
    }

    const initDep = initialDeposit ? parseFloat(initialDeposit) : 0;
    if (goalMode === 'linked_savings_account_goal' && initDep > 0 && !sourceAccountId) {
      setCreateError('Please select a funding source account for initial deposit.');
      return;
    }

    createGoal({
      name: goalName,
      targetAmount: target,
      targetDate,
      goalMode,
      initialDeposit: initDep > 0 ? initDep : undefined,
      sourceAccountId: sourceAccountId || undefined,
    });

    setIsCreateModalOpen(false);
    setGoalName('');
    setTargetAmount('');
    setTargetDate('');
    setInitialDeposit('');
    setSourceAccountId('');
  };

  const handleMakeContribution = (e: React.FormEvent) => {
    e.preventDefault();
    setContribError('');

    if (!selectedGoalForContrib) return;
    const goal = financialGoals.find((g) => g.id === selectedGoalForContrib);
    if (!goal) return;

    const amt = parseFloat(contribAmount);
    if (isNaN(amt) || amt <= 0) {
      setContribError('Contribution amount must be greater than zero.');
      return;
    }

    if (goal.goalMode === 'linked_savings_account_goal' && !contribSourceId) {
      setContribError('Please select a source bank account to transfer funds from.');
      return;
    }

    const res = contributeToGoal(
      goal.id,
      amt,
      goal.goalMode === 'linked_savings_account_goal' ? contribSourceId : undefined,
      contribNote
    );

    if (res.success) {
      setSelectedGoalForContrib(null);
      setContribAmount('');
      setContribSourceId('');
      setContribNote('');
    } else {
      setContribError(res.error || 'Failed to record contribution.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Target className="h-4 w-4" />
            <span>Financial Targets & Goals</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Savings Targets & Goals</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Set milestone targets, track funded progress, and assign dedicated savings accounts.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError('');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold font-mono transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Lock 3 Educational Architecture Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 font-mono text-xs flex items-start gap-3 text-slate-300">
        <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-white font-semibold">Architectural Lock 3 Compliance:</div>
          <div className="text-slate-400 leading-relaxed text-[11px]">
            <strong>Mode A (Tracking Goal):</strong> Tracks visual milestones against general liquidity. Contributions do NOT generate an expense or alter double-entry balance sheets.<br />
            <strong>Mode B (Linked Account Goal):</strong> Backed by a dedicated canonical bank account. Contributions are recorded as balanced double-entry Transfers (-Bank / +Goal Account).
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {financialGoals.map((g) => {
          const { currentSaved, pct, remaining, monthsRemaining, monthlyRequired } = getGoalProgress(g);
          const isComplete = pct >= 100 || g.status === 'achieved';
          const linkedAcc = accounts.find((a) => a.id === g.linkedAccountId);

          return (
            <div
              key={g.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-white font-semibold text-base">{g.name}</h3>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-1">
                      <span className="text-emerald-400">
                        {g.goalMode === 'tracking_goal' ? 'Virtual Tracking Goal' : 'Dedicated Linked Account'}
                      </span>
                      {linkedAcc && (
                        <>
                          <span>·</span>
                          <span className="text-slate-500">{linkedAcc.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                        isComplete
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                          : 'border-slate-800 text-slate-400 bg-slate-900'
                      }`}
                    >
                      {isComplete ? 'Achieved' : 'In Progress'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Saved: ৳{currentSaved.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className="text-white font-semibold">Target: ৳{g.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-400' : 'bg-sky-400'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-0.5 text-slate-500">
                    <span>{pct.toFixed(1)}% funded</span>
                    <span>৳{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} to go</span>
                  </div>
                </div>

                {/* Time & Monthly Projection */}
                <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 font-mono text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Target Date: <strong className="text-white">{g.targetDate}</strong></span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">Required / Month</div>
                    <div className="text-emerald-400 font-semibold">
                      ৳{monthlyRequired.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 font-mono text-xs">
                {isComplete ? (
                  <div className="text-emerald-400 flex items-center gap-1.5 font-medium py-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Target Achieved!</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setContribError('');
                      setSelectedGoalForContrib(g.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Contribute Funds</span>
                  </button>
                )}

                {!isComplete && (
                  <button
                    onClick={() => updateGoalStatus(g.id, 'achieved')}
                    className="text-slate-500 hover:text-slate-300 py-1.5 transition-colors"
                  >
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contribute Modal */}
      {selectedGoalForContrib && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            {(() => {
              const goal = financialGoals.find((g) => g.id === selectedGoalForContrib);
              if (!goal) return null;
              const isLinked = goal.goalMode === 'linked_savings_account_goal';

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">Contribute to Goal</h3>
                      <div className="text-xs text-slate-400 font-mono">{goal.name}</div>
                    </div>
                    <button
                      onClick={() => setSelectedGoalForContrib(null)}
                      className="text-slate-400 hover:text-white p-1 rounded"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {contribError && (
                    <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
                      {contribError}
                    </div>
                  )}

                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 text-xs font-sans leading-relaxed">
                    {isLinked ? (
                      <p>
                        <strong className="text-sky-400 font-mono">লিংকড অ্যাকাউন্ট গোল:</strong> নির্বাচিত ব্যাংক অ্যাকাউন্ট থেকে এই লক্ষ্যের ডেডিকেটেড অ্যাকাউন্টে ফান্ড ট্রান্সফার (-ব্যাংক / +গোল) হবে।
                      </p>
                    ) : (
                      <p>
                        <strong className="text-emerald-400 font-mono">ট্র্যাকিং গোল:</strong> এটি শুধুমাত্র আপনার জমানো টাকার প্রগ্রেস ট্র্যাক করবে। অ্যাকাউন্টের ব্যালেন্সে কোনো পরিবর্তন বা কৃত্রিম খরচ হবে না।
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleMakeContribution} className="space-y-4 text-xs font-mono">
                    <div>
                      <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Contribution Amount (BDT)</label>
                      <input
                        type="number"
                        step="100"
                        placeholder="e.g. 10000"
                        value={contribAmount}
                        onChange={(e) => setContribAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {isLinked && (
                      <div>
                        <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Source Bank Account</label>
                        <select
                          value={contribSourceId}
                          onChange={(e) => setContribSourceId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">-- Choose Account --</option>
                          {accounts.filter((a) => !a.isArchived && a.id !== goal.linkedAccountId).map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.accountType.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Note (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Monthly salary savings portion"
                        value={contribNote}
                        onChange={(e) => setContribNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedGoalForContrib(null)}
                        className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
                      >
                        Confirm Contribution
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Create Financial Goal</h3>
                <div className="text-xs text-slate-400 font-mono">Target planning & savings modes</div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. New Home Down Payment"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Target Amount (BDT)</label>
                  <input
                    type="number"
                    step="1000"
                    placeholder="e.g. 500000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase tracking-wider mb-1.5">
                  Goal Mode (লক্ষ্যের ধরন নির্ধারণ)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGoalMode('tracking_goal')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      goalMode === 'tracking_goal'
                        ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-emerald-400 flex items-center justify-between">
                      <span>মোড ১: ট্র্যাকিং গোল</span>
                      <span className="text-[10px] font-mono text-slate-400">(Tracking Goal)</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 leading-snug font-sans">
                      সাধারণ আর্থিক লক্ষ্যের অগ্রগতি ট্র্যাক করার জন্য। এতে ব্যালেন্স শিট বা অ্যাকাউন্টে কোনো পরিবর্তন হবে না এবং কোনো বাড়তি খরচ (Expense) হিসেবে গণ্য হবে না।
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoalMode('linked_savings_account_goal')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      goalMode === 'linked_savings_account_goal'
                        ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-sky-400 flex items-center justify-between">
                      <span>মোড ২: লিংকড অ্যাকাউন্ট গোল</span>
                      <span className="text-[10px] font-mono text-slate-400">(Linked Account)</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 leading-snug font-sans">
                      নির্দিষ্ট ব্যাংক অ্যাকাউন্টের সাথে যুক্ত লক্ষ্য। এতে টাকা জমা করলে তা অ্যাকাউন্ট ট্রান্সফার (-ব্যাংক / +গোল অ্যাকাউন্ট) হিসেবে স্বয়ংক্রিয়ভাবে হিসাব বইয়ে যুক্ত হবে।
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Initial Allocation (Optional)</label>
                <input
                  type="number"
                  step="100"
                  placeholder="e.g. 50000"
                  value={initialDeposit}
                  onChange={(e) => setInitialDeposit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
