import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import {
  NewTransactionInput,
  NewTransactionLineInput,
  TransactionType,
} from '../../types/accounting';
import {
  BookOpen,
  Plus,
  Search,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  Tag,
  Trash2,
  Sparkles,
  FolderPlus,
  MessageSquare,
} from 'lucide-react';

interface LedgerViewProps {
  onNavigate?: (view: string) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({ onNavigate }) => {
  const {
    transactions,
    transactionLines,
    accounts,
    categories,
    postTransaction,
    reverseTransaction,
    createCategory,
    deleteCategory,
  } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form State for Quick / Guided Transaction
  const [entryMode, setEntryMode] = useState<'expense' | 'income' | 'transfer' | 'split'>('expense');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [txNote, setTxNote] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]?.id || '');
  const [destinationAccount, setDestinationAccount] = useState<string>(accounts[1]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories.find((c) => c.type === 'expense')?.id || categories[0]?.id || ''
  );

  // Inline Category Creation state in Post Modal
  const [isCreatingInlineCategory, setIsCreatingInlineCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10B981');
  const [categoryCreateMsg, setCategoryCreateMsg] = useState<string | null>(null);

  // Split lines for multi-split mode
  const [splitLines, setSplitLines] = useState<
    Array<{ categoryId: string; amount: string; memo: string }>
  >([
    { categoryId: categories.find((c) => c.type === 'expense')?.id || categories[0]?.id || '', amount: '', memo: '' },
    { categoryId: categories.find((c) => c.type === 'expense' && c.id !== categories[0]?.id)?.id || categories[0]?.id || '', amount: '', memo: '' },
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);
  const [categoryModalSuccess, setCategoryModalSuccess] = useState<string | null>(null);

  // Helper lookups
  const getAccountName = (accId?: string | null) => {
    if (!accId) return '—';
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : accId;
  };

  const getCategoryName = (catId?: string | null) => {
    if (!catId) return '—';
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : catId;
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tx.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (typeFilter === 'all') return true;
    if (typeFilter === 'voided') return tx.status === 'voided';
    return tx.type === typeFilter;
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCategoryCreateMsg('Please enter a category name.');
      return;
    }

    const typeToCreate = entryMode === 'income' ? 'income' : 'expense';
    const newCat = createCategory({
      name: newCatName.trim(),
      type: typeToCreate,
      color: newCatColor,
    });

    setSelectedCategory(newCat.id);
    setNewCatName('');
    setIsCreatingInlineCategory(false);
    setCategoryCreateMsg(`Category "${newCat.name}" added successfully!`);
    setTimeout(() => setCategoryCreateMsg(null), 3000);
  };

  const handleCategoryModalCreate = (name: string, type: 'expense' | 'income', color: string) => {
    if (!name.trim()) {
      setCategoryModalError('Category name is required.');
      return;
    }
    const created = createCategory({
      name: name.trim(),
      type,
      color,
    });
    setCategoryModalSuccess(`Category "${created.name}" created successfully.`);
    setCategoryModalError(null);
    setTimeout(() => setCategoryModalSuccess(null), 3000);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const res = deleteCategory(categoryId);
    if (!res.success) {
      setCategoryModalError(res.error || 'Failed to delete category.');
      setCategoryModalSuccess(null);
    } else {
      setCategoryModalSuccess('Category deleted successfully.');
      setCategoryModalError(null);
      setTimeout(() => setCategoryModalSuccess(null), 3000);
    }
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (entryMode !== 'split' && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    const lines: NewTransactionLineInput[] = [];
    let txType: TransactionType = 'expense';

    if (entryMode === 'expense') {
      txType = 'expense';
      // Account line: -amount (debit account asset)
      lines.push({
        lineType: 'account',
        accountId: selectedAccount,
        amount: -parsedAmount,
        memo: txNote || 'Expense deduction',
      });
      // Category line: +amount (credit expense category)
      lines.push({
        lineType: 'category',
        categoryId: selectedCategory,
        amount: parsedAmount,
        memo: txNote || 'Expense categorization',
      });
    } else if (entryMode === 'income') {
      txType = 'income';
      // Account line: +amount (credit account asset)
      lines.push({
        lineType: 'account',
        accountId: selectedAccount,
        amount: parsedAmount,
        memo: txNote || 'Income credit',
      });
      // Category line: -amount (debit income category)
      lines.push({
        lineType: 'category',
        categoryId: selectedCategory,
        amount: -parsedAmount,
        memo: txNote || 'Income source',
      });
    } else if (entryMode === 'transfer') {
      txType = 'transfer';
      if (selectedAccount === destinationAccount) {
        setFormError('Source and destination accounts must be different.');
        return;
      }
      // Source Account: -amount
      lines.push({
        lineType: 'account',
        accountId: selectedAccount,
        amount: -parsedAmount,
        memo: `Transfer to ${getAccountName(destinationAccount)}`,
      });
      // Destination Account: +amount
      lines.push({
        lineType: 'account',
        accountId: destinationAccount,
        amount: parsedAmount,
        memo: `Transfer from ${getAccountName(selectedAccount)}`,
      });
    } else if (entryMode === 'split') {
      txType = 'split_expense';
      const parsedTotal = parseFloat(amount);
      const splitSum = splitLines.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      if (Math.abs(parsedTotal - splitSum) > 0.01) {
        setFormError(`Split breakdown lines sum (৳${splitSum.toFixed(2)}) must equal total amount (৳${parsedTotal.toFixed(2)}).`);
        return;
      }

      // Account line: -total
      lines.push({
        lineType: 'account',
        accountId: selectedAccount,
        amount: -parsedTotal,
        memo: txNote || 'Split expense deduction',
      });

      // Multiple Category lines: +lineAmount each
      splitLines.forEach((s) => {
        const lineVal = parseFloat(s.amount);
        if (lineVal > 0) {
          lines.push({
            lineType: 'category',
            categoryId: s.categoryId,
            amount: lineVal,
            memo: s.memo || 'Split line',
          });
        }
      });
    }

    const input: NewTransactionInput = {
      date: txDate,
      type: txType,
      note: txNote.trim() || undefined,
      lines,
    };

    const res = postTransaction(input);
    if (!res.success) {
      setFormError(res.error || 'Failed to post transaction.');
      return;
    }

    // Reset & close
    setAmount('');
    setTxNote('');
    setIsPostModalOpen(false);
  };

  const handleReverseClick = (txId: string) => {
    if (confirm('Are you sure you want to reverse this transaction?')) {
      const res = reverseTransaction(txId, 'User requested correction');
      if (!res.success) {
        alert(res.error || 'Failed to reverse transaction.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <BookOpen className="h-4 w-4" />
            <span>Income & Expenses Journal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Income & Expenses
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Track and balance all your income, expenses, and transfers seamlessly with double-entry precision.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigate && (
            <button
              onClick={() => onNavigate('sms_parser')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all shadow-sm"
              title="Parse SMS from bKash, Nagad, Rocket or Bank alerts"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
              <span>SMS পার্সার (100% Free)</span>
            </button>
          )}

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shadow-sm"
          >
            <Tag className="h-3.5 w-3.5 text-emerald-400" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={() => {
              setIsCreatingInlineCategory(false);
              setFormError(null);
              setIsPostModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Post Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto w-full md:w-auto text-xs">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'expense', label: 'Expenses' },
            { id: 'income', label: 'Income' },
            { id: 'transfer', label: 'Transfers' },
            { id: 'split_expense', label: 'Split Expense' },
            { id: 'opening_balance', label: 'Opening Balances' },
            { id: 'voided', label: 'Reversed/Voided' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === tab.id
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search memo, ID, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Transactions Journal Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden divide-y divide-slate-800/80">
        {filteredTransactions.map((tx) => {
          const lines = transactionLines.filter((l) => l.transactionId === tx.id);
          const isVoided = tx.status === 'voided';
          const isReversal = Boolean(tx.linkedTransactionId);

          return (
            <div
              key={tx.id}
              className={`p-4 transition-colors ${isVoided ? 'bg-slate-950/60 opacity-70' : 'hover:bg-slate-800/20'}`}
            >
              {/* Transaction Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    <span>{tx.date}</span>
                  </span>

                  <span className="text-xs uppercase font-semibold text-slate-200 bg-slate-800/60 px-2 py-0.5 rounded">
                    {tx.type.replace('_', ' ')}
                  </span>

                  {isVoided && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/30">
                      Voided / Reversed
                    </span>
                  )}

                  {isReversal && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/30">
                      Reversal Entry
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500">
                    #{tx.id.replace('tx-', '').slice(0, 10)}
                  </span>

                  {!isVoided && !isReversal && (
                    <button
                      onClick={() => handleReverseClick(tx.id)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors px-2 py-0.5 rounded hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50"
                      title="Post a balanced reversal for this transaction"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reverse</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Note / Memo */}
              {tx.note && (
                <div className="text-xs text-slate-300 mb-3 font-sans flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Memo:</span>
                  <span>{tx.note}</span>
                </div>
              )}

              {/* Transaction Child Lines Table */}
              <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-3 space-y-1.5 text-xs">
                {/* Desktop Column Header */}
                <div className="hidden sm:grid grid-cols-12 text-[10px] uppercase font-semibold text-slate-400 pb-1.5 border-b border-slate-800/80">
                  <div className="col-span-3">Target Type</div>
                  <div className="col-span-4">Account / Category</div>
                  <div className="col-span-3">Line Memo</div>
                  <div className="col-span-2 text-right">Signed Amount</div>
                </div>

                {lines.map((line) => {
                  const isAccount = line.lineType === 'account';
                  const entityName = isAccount
                    ? getAccountName(line.accountId)
                    : getCategoryName(line.categoryId);

                  return (
                    <div key={line.id} className="border-b border-slate-900/60 last:border-none py-1.5">
                      {/* Mobile layout (< sm) */}
                      <div className="sm:hidden flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                isAccount
                                  ? 'bg-sky-950/60 text-sky-300 border border-sky-800/30'
                                  : 'bg-purple-950/60 text-purple-300 border border-purple-800/30'
                              }`}
                            >
                              {isAccount ? 'Account' : 'Category'}
                            </span>
                            <span className="text-slate-200 font-medium truncate text-xs">
                              {entityName}
                            </span>
                          </div>
                          {line.memo && (
                            <div className="text-slate-400 text-[10px] truncate">
                              {line.memo}
                            </div>
                          )}
                        </div>
                        <div
                          className={`text-right font-semibold font-mono text-xs shrink-0 ${
                            line.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {line.amount > 0
                            ? `+৳${line.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : `-৳${Math.abs(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </div>
                      </div>

                      {/* Desktop / Tablet layout (>= sm) */}
                      <div className="hidden sm:grid grid-cols-12 items-center">
                        <div className="col-span-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              isAccount
                                ? 'bg-sky-950/60 text-sky-300 border border-sky-800/30'
                                : 'bg-purple-950/60 text-purple-300 border border-purple-800/30'
                            }`}
                          >
                            {isAccount ? 'Account' : 'Category'}
                          </span>
                        </div>
                        <div className="col-span-4 text-slate-200 font-medium truncate">
                          {entityName}
                        </div>
                        <div className="col-span-3 text-slate-400 truncate text-[11px]">
                          {line.memo || '—'}
                        </div>
                        <div
                          className={`col-span-2 text-right font-semibold font-mono ${
                            line.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {line.amount > 0
                            ? `+৳${line.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : `-৳${Math.abs(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Double-Entry Check Footer */}
                <div className="pt-2 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Double-Entry Balance Verified</span>
                  </span>
                  <span>{lines.length} Lines</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs">
            No transactions found. Click &quot;+ Post Transaction&quot; to record your entries.
          </div>
        )}
      </div>

      {/* Modal: Post New Transaction */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl font-sans text-xs space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-400" />
                  <span>Post Double-Entry Transaction</span>
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">Record income, expenses, transfers, or multi-item splits.</p>
              </div>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              {[
                { id: 'expense', label: 'Expense' },
                { id: 'income', label: 'Income' },
                { id: 'transfer', label: 'Transfer' },
                { id: 'split', label: 'Split Expense' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setEntryMode(m.id as any);
                    setIsCreatingInlineCategory(false);
                    // auto select appropriate category
                    if (m.id === 'income') {
                      const firstInc = categories.find((c) => c.type === 'income');
                      if (firstInc) setSelectedCategory(firstInc.id);
                    } else if (m.id === 'expense') {
                      const firstExp = categories.find((c) => c.type === 'expense');
                      if (firstExp) setSelectedCategory(firstExp.id);
                    }
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    entryMode === m.id
                      ? 'bg-slate-800 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {categoryCreateMsg && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{categoryCreateMsg}</span>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Amount (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Source Account */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {entryMode === 'income' ? 'Deposit Into Account *' : 'Source Funding Account *'}
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  required
                >
                  {accounts
                    .filter((a) => !a.isArchived)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.accountType})
                      </option>
                    ))}
                </select>
              </div>

              {/* Destination Account for Transfer */}
              {entryMode === 'transfer' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Destination Target Account *</label>
                  <select
                    value={destinationAccount}
                    onChange={(e) => setDestinationAccount(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {accounts
                      .filter((a) => !a.isArchived && a.id !== selectedAccount)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.accountType})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Category for Expense / Income */}
              {(entryMode === 'expense' || entryMode === 'income') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-medium">
                      {entryMode === 'expense' ? 'Expense Category *' : 'Income Category *'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingInlineCategory(!isCreatingInlineCategory)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isCreatingInlineCategory ? 'Cancel' : '+ Add Custom Category'}</span>
                    </button>
                  </div>

                  {/* Inline Category Creator Form */}
                  {isCreatingInlineCategory ? (
                    <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                        <span>Create New {entryMode === 'income' ? 'Income' : 'Expense'} Category</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder={entryMode === 'income' ? 'e.g. Freelancing, Rental, Bonus...' : 'e.g. Gym, Pet Care, Office Lunch...'}
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newCatColor}
                            onChange={(e) => setNewCatColor(e.target.value)}
                            className="h-8 w-10 rounded cursor-pointer border border-slate-700 bg-slate-900 p-0.5"
                            title="Choose color tag"
                          />
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs"
                          >
                            Save Category
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      required
                    >
                      {categories
                        .filter((c) => (entryMode === 'expense' ? c.type === 'expense' : c.type === 'income'))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {!c.isSystem ? '★ (Custom)' : ''}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              {/* Split Lines Editor */}
              {entryMode === 'split' && (
                <div className="space-y-2 rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Split Breakdown Categories</span>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-emerald-400 hover:underline text-[11px]"
                    >
                      + Manage Categories
                    </button>
                  </div>
                  {splitLines.map((s, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          value={s.categoryId}
                          onChange={(e) => {
                            const updated = [...splitLines];
                            updated[idx].categoryId = e.target.value;
                            setSplitLines(updated);
                          }}
                          className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 text-xs text-white"
                        >
                          {categories
                            .filter((c) => c.type === 'expense')
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} {!c.isSystem ? '★' : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="col-span-5">
                        <input
                          type="number"
                          placeholder="Amount ৳"
                          value={s.amount}
                          onChange={(e) => {
                            const updated = [...splitLines];
                            updated[idx].amount = e.target.value;
                            setSplitLines(updated);
                          }}
                          className="w-full rounded border border-slate-800 bg-slate-900 p-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        {splitLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setSplitLines(splitLines.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSplitLines([
                        ...splitLines,
                        { categoryId: categories.find((c) => c.type === 'expense')?.id || categories[0]?.id || '', amount: '', memo: '' },
                      ])
                    }
                    className="text-[11px] text-emerald-400 hover:underline pt-1 block"
                  >
                    + Add Another Split Item
                  </button>
                </div>
              )}

              {/* Note / Memo */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Agora grocery shopping, restaurant dinner, project milestone..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Category Management Drawer / Modal */}
      {isCategoryModalOpen && (
        <CategoryManagerModal
          onClose={() => {
            setIsCategoryModalOpen(false);
            setCategoryModalError(null);
            setCategoryModalSuccess(null);
          }}
          categories={categories}
          onAddCategory={handleCategoryModalCreate}
          onDeleteCategory={handleDeleteCategory}
          errorMessage={categoryModalError}
          successMessage={categoryModalSuccess}
        />
      )}
    </div>
  );
};

interface CategoryManagerModalProps {
  onClose: () => void;
  categories: any[];
  onAddCategory: (name: string, type: 'expense' | 'income', color: string) => void;
  onDeleteCategory: (id: string) => void;
  errorMessage: string | null;
  successMessage: string | null;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  onClose,
  categories,
  onAddCategory,
  onDeleteCategory,
  errorMessage,
  successMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10B981');

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddCategory(name, activeTab, color);
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl font-sans text-xs space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-emerald-400" />
              <span>Income & Expense Categories</span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Customize and manage income and expense categories for your accounts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'expense'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Expense Categories ({categories.filter((c) => c.type === 'expense').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'income'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Income Categories ({categories.filter((c) => c.type === 'income').length})
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Add New Category Form */}
        <form onSubmit={handleSubmit} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Add New {activeTab === 'expense' ? 'Expense' : 'Income'} Category</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              placeholder={activeTab === 'expense' ? 'Category name (e.g., Medical, Fitness, Subscriptions...)' : 'Category name (e.g., Bonus, Rental, Dividend...)'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 rounded cursor-pointer border border-slate-700 bg-slate-900 p-0.5 shrink-0"
                title="Choose color tag"
              />
              <button
                type="submit"
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs whitespace-nowrap transition-colors"
              >
                + Add Category
              </button>
            </div>
          </div>
        </form>

        {/* Category List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || (cat.type === 'income' ? '#10B981' : '#F59E0B') }}
                  />
                  <div className="truncate">
                    <span className="font-medium text-slate-200 block truncate">{cat.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {cat.isSystem ? 'Standard System' : 'User Custom'}
                    </span>
                  </div>
                </div>

                {!cat.isSystem && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${cat.name}" category?`)) {
                        onDeleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors shrink-0"
                    title="Delete custom category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
