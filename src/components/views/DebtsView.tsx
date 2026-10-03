import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { Debt, DebtDirection } from '../../types/accounting';
import {
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Phone,
  Calendar,
  X,
  DollarSign,
} from 'lucide-react';

export const DebtsView: React.FC = () => {
  const {
    debts,
    accounts,
    accountBalances,
    getAccountBalance,
    createDebt,
    settleDebt,
    updateDebtStatus,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<'all' | 'lent' | 'borrowed' | 'settled'>('all');
  const [isNewDebtModalOpen, setIsNewDebtModalOpen] = useState(false);
  const [settlingDebt, setSettlingDebt] = useState<Debt | null>(null);

  // New Debt Form State
  const [personName, setPersonName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [direction, setDirection] = useState<DebtDirection>('lent');
  const [initialAmount, setInitialAmount] = useState<number | ''>('');
  const [sourceOrDestAccountId, setSourceOrDestAccountId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Settlement Form State
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleAccountId, setSettleAccountId] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleError, setSettleError] = useState('');

  // Eligible bank/cash accounts for funding or receiving
  const liquidAccounts = accounts.filter(
    (a) => !a.isArchived && (a.accountType === 'bank' || a.accountType === 'cash' || a.accountType === 'mobile_wallet')
  );

  // Helper to get remaining balance from canonical ledger view
  const getRemainingBalance = (debt: Debt) => {
    const accBal = accountBalances.find((b) => b.accountId === debt.linkedAccountId);
    if (!accBal) return debt.initialAmount;
    return Math.abs(accBal.currentBalance);
  };

  // Summary Metrics
  const activeDebts = debts.filter((d) => d.status === 'active');
  const totalLentActive = activeDebts
    .filter((d) => d.direction === 'lent')
    .reduce((sum, d) => sum + getRemainingBalance(d), 0);

  const totalBorrowedActive = activeDebts
    .filter((d) => d.direction === 'borrowed')
    .reduce((sum, d) => sum + getRemainingBalance(d), 0);

  const netPeerPosition = totalLentActive - totalBorrowedActive;

  // Filtered Debts List
  const filteredDebts = debts.filter((debt) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'lent') return debt.direction === 'lent' && debt.status === 'active';
    if (activeTab === 'borrowed') return debt.direction === 'borrowed' && debt.status === 'active';
    if (activeTab === 'settled') return debt.status === 'settled';
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!personName.trim()) {
      setFormError('Please enter the name of the person or party.');
      return;
    }
    const amt = typeof initialAmount === 'number' ? initialAmount : parseFloat(initialAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid positive principal amount.');
      return;
    }
    if (!sourceOrDestAccountId) {
      setFormError('Please select a funding/receiving bank or cash account.');
      return;
    }

    const res = createDebt({
      personName: personName.trim(),
      contactPhone: contactPhone.trim() || undefined,
      direction,
      initialAmount: amt,
      sourceOrDestAccountId,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      setIsNewDebtModalOpen(false);
      setPersonName('');
      setContactPhone('');
      setInitialAmount('');
      setSourceOrDestAccountId('');
      setDueDate('');
      setNotes('');
    } else {
      setFormError(res.error || 'Failed to record debt.');
    }
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingDebt) return;
    setSettleError('');

    const amt = typeof settleAmount === 'number' ? settleAmount : parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      setSettleError('Please enter a valid settlement amount.');
      return;
    }
    const maxRemaining = getRemainingBalance(settlingDebt);
    if (amt > maxRemaining + 0.01) {
      setSettleError(`Amount exceeds remaining balance of ৳${maxRemaining.toLocaleString()}`);
      return;
    }
    if (!settleAccountId) {
      setSettleError('Please select the payment or deposit account.');
      return;
    }

    const res = settleDebt(settlingDebt.id, amt, settleAccountId, settleNote);
    if (res.success) {
      setSettlingDebt(null);
      setSettleAmount('');
      setSettleAccountId('');
      setSettleNote('');
    } else {
      setSettleError(res.error || 'Failed to post settlement.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Users className="h-4 w-4" />
            <span>Personal Debts & Receivables</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Debts & Personal Loans
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Track money lent to friends (receivables) and borrowed funds (payables) linked to your accounts.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            if (liquidAccounts.length > 0) setSourceOrDestAccountId(liquidAccounts[0].id);
            setIsNewDebtModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Record Peer Debt</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Lent */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Money Lent (I am Owed)</span>
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            ৳{totalLentActive.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Receivable Asset Balance
          </div>
        </div>

        {/* Total Borrowed */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Money Borrowed (I Owe)</span>
            <div className="h-6 w-6 rounded bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">
            ৳{totalBorrowedActive.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Payable Liability Balance
          </div>
        </div>

        {/* Net Peer Position */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Net Peer Position</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${netPeerPosition >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {netPeerPosition >= 0 ? 'Net Creditor' : 'Net Debtor'}
            </span>
          </div>
          <div className={`text-xl font-bold font-mono ${netPeerPosition >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {netPeerPosition >= 0 ? `+৳${netPeerPosition.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `-৳${Math.abs(netPeerPosition).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {activeDebts.length} active peer transactions
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Records ({debts.length})
          </button>
          <button
            onClick={() => setActiveTab('lent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'lent'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lent (Owed to Me)
          </button>
          <button
            onClick={() => setActiveTab('borrowed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'borrowed'
                ? 'bg-rose-500/20 text-rose-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Borrowed (I Owe)
          </button>
          <button
            onClick={() => setActiveTab('settled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'settled'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Settled ({debts.filter((d) => d.status === 'settled').length})
          </button>
        </div>
      </div>

      {/* Debts Table / List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        {filteredDebts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Users className="h-8 w-8 mx-auto text-slate-600 stroke-[1.5]" />
            <div className="text-sm font-medium text-slate-400">No debts found</div>
            <div className="text-xs">
              {activeTab === 'all'
                ? 'Record a loan to a friend or money borrowed to get started.'
                : `No records matching the filter '${activeTab}'.`}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredDebts.map((debt) => {
              const remaining = getRemainingBalance(debt);
              const isLent = debt.direction === 'lent';
              const isSettled = debt.status === 'settled';

              return (
                <div
                  key={debt.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/80 transition-colors"
                >
                  {/* Left Person Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          isLent
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isLent ? 'Lent (Receivable)' : 'Borrowed (Payable)'}
                      </span>

                      {isSettled ? (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span>Fully Settled</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          <Clock className="h-3 w-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    <div className="text-base font-semibold text-white flex items-center gap-2">
                      <span>{debt.personName}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                      {debt.contactPhone && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span>{debt.contactPhone}</span>
                        </span>
                      )}

                      {debt.dueDate && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          <span>Due: {debt.dueDate}</span>
                        </span>
                      )}

                      {debt.notes && (
                        <span className="text-slate-500 italic max-w-sm truncate">
                          "{debt.notes}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Financial Balances & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] text-slate-500 font-mono uppercase">
                        Remaining Balance
                      </div>
                      <div
                        className={`text-lg font-bold font-mono ${
                          isSettled
                            ? 'text-slate-500 line-through'
                            : isLent
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        ৳{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Initial: ৳{debt.initialAmount.toLocaleString()}
                      </div>
                    </div>

                    {!isSettled && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSettlingDebt(debt);
                            setSettleAmount(remaining);
                            if (liquidAccounts.length > 0) setSettleAccountId(liquidAccounts[0].id);
                            setSettleError('');
                            setSettleNote('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs font-mono border border-emerald-500/30 transition-colors"
                        >
                          {isLent ? 'Receive Payment' : 'Repay Debt'}
                        </button>

                        <button
                          onClick={() => updateDebtStatus(debt.id, 'settled')}
                          title="Mark settled without cash movement"
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Record New Debt */}
      {isNewDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <Users className="h-5 w-5 text-emerald-400" />
                <span>Record Peer Debt / Loan</span>
              </div>
              <button
                onClick={() => setIsNewDebtModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
              {/* Direction Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Debt Direction
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirection('lent')}
                    className={`p-3 rounded-lg border text-left transition-colors flex flex-col gap-1 ${
                      direction === 'lent'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>I Lent Money</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Receivable asset (they owe me)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirection('borrowed')}
                    className={`p-3 rounded-lg border text-left transition-colors flex flex-col gap-1 ${
                      direction === 'borrowed'
                        ? 'border-rose-500 bg-rose-950/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <ArrowDownLeft className="h-4 w-4" />
                      <span>I Borrowed Money</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Payable liability (I owe them)
                    </span>
                  </button>
                </div>
              </div>

              {/* Person Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Contact / Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahim Chowdhury"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +880 1819-234567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Principal Amount & Source/Dest Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Amount (৳ BDT) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="e.g. 20000"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {direction === 'lent' ? 'Paid From Account *' : 'Deposited To Account *'}
                  </label>
                  <select
                    value={sourceOrDestAccountId}
                    onChange={(e) => setSourceOrDestAccountId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {liquidAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountType}) — ৳{getAccountBalance(acc.id).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Notes / Memo
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Medical emergency assistance"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Invariant Explanation Banner */}
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Double-Entry Invariant Guarantee</span>
                </div>
                <div>
                  Posting this record automatically creates a dedicated canonical {direction === 'lent' ? 'receivable' : 'payable'} account and recognizes a balanced 2-line transaction.
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewDebtModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  Record Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Settle / Repay Debt */}
      {settlingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <span>
                  {settlingDebt.direction === 'lent' ? 'Receive Debt Repayment' : 'Repay Borrowed Debt'}
                </span>
              </div>
              <button
                onClick={() => setSettlingDebt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {settleError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{settleError}</span>
              </div>
            )}

            <form onSubmit={handleSettleSubmit} className="space-y-4 text-xs font-sans">
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="text-slate-400">Party: <span className="text-white font-semibold">{settlingDebt.personName}</span></div>
                <div className="text-slate-400">Current Outstanding: <span className="text-emerald-400 font-semibold">৳{getRemainingBalance(settlingDebt).toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Settlement Amount (৳ BDT) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={getRemainingBalance(settlingDebt)}
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {settlingDebt.direction === 'lent' ? 'Deposit Into Account *' : 'Pay From Account *'}
                </label>
                <select
                  value={settleAccountId}
                  onChange={(e) => setSettleAccountId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {liquidAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType}) — ৳{getAccountBalance(acc.id).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Memo / Reference Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Partial repayment via bKash"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingDebt(null)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
