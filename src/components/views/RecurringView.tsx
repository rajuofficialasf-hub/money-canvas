import { todayLocalISO } from '../../lib/date-utils';
import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { RecurringFrequency } from '../../types/accounting';
import {
  Repeat,
  Plus,
  Play,
  Pause,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';

export const RecurringView: React.FC = () => {
  const {
    recurringTransactions,
    accounts,
    categories,
    createRecurring,
    toggleRecurringPause,
    executeRecurringNow,
    deleteRecurring,
  } = useLedger();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('monthly');
  const [formStartDate, setFormStartDate] = useState(todayLocalISO());
  const [formType, setFormType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [formAccountId, setFormAccountId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDestinationAccountId, setFormDestinationAccountId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formError, setFormError] = useState('');

  const activeSchedules = recurringTransactions.filter((r) => !r.isPaused);
  const monthlyCommitment = recurringTransactions
    .filter((r) => !r.isPaused && r.frequency === 'monthly')
    .reduce((sum, r) => {
      // Find debit line from account
      const debitLine = r.templateTransaction.lines.find(
        (l) => l.lineType === 'account' && l.amount < 0
      );
      return sum + (debitLine ? Math.abs(debitLine.amount) : 0);
    }, 0);

  const handleRunNow = (id: string, name: string) => {
    const res = executeRecurringNow(id);
    if (res.success) {
      setActionMessage(`Successfully executed recurring schedule "${name}" and posted to ledger.`);
      setTimeout(() => setActionMessage(null), 4000);
    } else {
      alert(`Error executing recurring schedule: ${res.error}`);
    }
  };

  const handleCreateRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter a schedule name.');
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount must be positive.');
      return;
    }
    if (!formAccountId) {
      setFormError('Please select a funding account.');
      return;
    }

    if (formType === 'expense' && !formCategoryId) {
      setFormError('Please select an expense category.');
      return;
    }
    if (formType === 'income' && !formCategoryId) {
      setFormError('Please select an income category.');
      return;
    }
    if (formType === 'transfer' && !formDestinationAccountId) {
      setFormError('Please select a destination account.');
      return;
    }
    if (formType === 'transfer' && formAccountId === formDestinationAccountId) {
      setFormError('Source and destination accounts must be distinct.');
      return;
    }

    // Build template lines
    let lines = [];
    if (formType === 'expense') {
      lines = [
        { lineType: 'account' as const, accountId: formAccountId, amount: -amt, memo: formName },
        { lineType: 'category' as const, categoryId: formCategoryId, amount: amt, memo: formName },
      ];
    } else if (formType === 'income') {
      lines = [
        { lineType: 'account' as const, accountId: formAccountId, amount: amt, memo: formName },
        { lineType: 'category' as const, categoryId: formCategoryId, amount: -amt, memo: formName },
      ];
    } else {
      lines = [
        { lineType: 'account' as const, accountId: formAccountId, amount: -amt, memo: `Transfer out: ${formName}` },
        { lineType: 'account' as const, accountId: formDestinationAccountId, amount: amt, memo: `Transfer in: ${formName}` },
      ];
    }

    createRecurring({
      name: formName,
      frequency: formFrequency,
      startDate: formStartDate,
      templateTransaction: {
        date: formStartDate,
        type: formType,
        note: formName,
        lines,
      },
    });

    setIsAddModalOpen(false);
    setFormName('');
    setFormAmount('');
    setFormAccountId('');
    setFormCategoryId('');
    setFormDestinationAccountId('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1">
            <Repeat className="h-4 w-4" />
            <span>Recurring Transactions & Automation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">Recurring Schedules & Standing Orders</h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-0.5">
            Configure automated rules for rent, utility bills, salary income, and periodic fund transfers.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink text-xs font-semibold font-mono transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Recurring Rule</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-accent/30 text-accent-strong text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="rounded-xl border border-edge bg-surface/40 p-4">
          <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">Active Recurring Rules</div>
          <div className="text-2xl font-bold text-ink">{activeSchedules.length} Schedules</div>
          <div className="text-[11px] text-ink-faint mt-1">{recurringTransactions.length} total defined</div>
        </div>

        <div className="rounded-xl border border-edge bg-surface/40 p-4">
          <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">Monthly Committed Outflow</div>
          <div className="text-2xl font-bold text-negative">৳{monthlyCommitment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-ink-faint mt-1">Automatic fixed monthly obligations</div>
        </div>

        <div className="rounded-xl border border-edge bg-surface/40 p-4">
          <div className="text-xs text-ink-muted uppercase tracking-wider mb-1">Next Upcoming Run</div>
          <div className="text-2xl font-bold text-accent-strong">
            {activeSchedules.length > 0
              ? activeSchedules.sort((a, b) => a.nextRun.localeCompare(b.nextRun))[0].nextRun
              : 'None'}
          </div>
          <div className="text-[11px] text-ink-faint mt-1">Auto-advances upon posting</div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-ink-soft">
          Recurring Rules Portfolio
        </h3>

        {recurringTransactions.length === 0 ? (
          <div className="p-8 text-center border border-edge/80 rounded-xl bg-surface/20">
            <Repeat className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-ink-soft">No recurring schedules active</div>
            <p className="text-xs text-ink-faint mt-1 max-w-sm mx-auto">
              Automate rent payments, utility bills, or subscription renewals.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringTransactions.map((r) => {
              const mainAmount = Math.abs(r.templateTransaction.lines[0]?.amount || 0);
              const sourceAccount = accounts.find((a) => a.id === r.templateTransaction.lines.find(l => l.lineType === 'account')?.accountId);

              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    r.isPaused
                      ? 'border-edge/60 bg-canvas/40 opacity-70'
                      : 'border-edge bg-surface/40 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-ink font-medium text-sm">{r.name}</span>
                      <span className="text-[10px] font-mono uppercase text-ink-muted border border-edge px-2 py-0.5 rounded">
                        {r.frequency}
                      </span>
                      {r.isPaused && (
                        <span className="text-[10px] font-mono uppercase text-warning border border-warning/30 px-2 py-0.5 rounded">
                          Paused
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-ink-muted font-mono flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Source: {sourceAccount?.name || 'Canonical Account'}</span>
                      <span>·</span>
                      <span>Next Run: <strong className="text-accent-strong">{r.nextRun}</strong></span>
                      {r.lastRun && (
                        <>
                          <span>·</span>
                          <span>Last Run: {r.lastRun}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <div className="text-right font-mono">
                      <div className="text-ink font-bold text-sm">৳{mainAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-ink-faint uppercase">{r.templateTransaction.type}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunNow(r.id, r.name)}
                        className="px-3 py-1.5 rounded-lg border border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                        title="Execute now and generate transaction lines"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Run Now</span>
                      </button>

                      <button
                        onClick={() => toggleRecurringPause(r.id)}
                        className="p-1.5 rounded-lg border border-edge bg-surface text-ink-muted hover:text-ink transition-colors"
                        title={r.isPaused ? 'Resume schedule' : 'Pause schedule'}
                      >
                        {r.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => deleteRecurring(r.id)}
                        className="p-1.5 rounded-lg border border-edge bg-surface text-ink-faint hover:text-negative transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Recurring Rule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-edge rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink">Create Recurring Schedule</h3>
                <div className="text-xs text-ink-muted font-mono">Automated periodic ledger transactions</div>
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

            <form onSubmit={handleCreateRecurring} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-ink-soft uppercase tracking-wider mb-1.5">Schedule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Broadband Fiber"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-soft uppercase tracking-wider mb-1.5">Frequency</label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as RecurringFrequency)}
                    className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-ink-soft uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-soft uppercase tracking-wider mb-1.5">Transaction Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Internal Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-ink-soft uppercase tracking-wider mb-1.5">Amount (BDT)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-soft uppercase tracking-wider mb-1.5">
                  {formType === 'income' ? 'Deposit Into Account' : 'Debit Source Account'}
                </label>
                <select
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                >
                  <option value="">-- Select Account --</option>
                  {accounts.filter((a) => !a.isArchived).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.accountType.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {formType !== 'transfer' ? (
                <div>
                  <label className="block text-ink-soft uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.filter((c) => c.type === formType).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-ink-soft uppercase tracking-wider mb-1.5">Destination Account</label>
                  <select
                    value={formDestinationAccountId}
                    onChange={(e) => setFormDestinationAccountId(e.target.value)}
                    className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="">-- Select Destination Account --</option>
                    {accounts.filter((a) => !a.isArchived && a.id !== formAccountId).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.accountType.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
