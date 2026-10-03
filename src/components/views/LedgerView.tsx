import { todayLocalISO } from '../../lib/date-utils';
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
  ShieldCheck,
  Pencil,
  AlertCircle,
  X,
  Calendar,
  Tag,
  Trash2,
  Sparkles,
  FolderPlus,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal, Field, Input, Select, Button, ErrorBanner } from '../ui';

interface LedgerViewProps {
  onNavigate?: (view: string) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({ onNavigate }) => {
  const {
    transactions,
    transactionLines,
    accounts,
    categories,
    getAccountBalance,
    postTransaction,
    reverseTransaction,
    createCategory,
    deleteCategory,
  } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  // When set, the post modal is correcting this transaction: on submit the new
  // entry is posted first and the original is auto-reversed (the ledger is
  // immutable — corrections are always void + counter-entry, never in-place).
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form State for Quick / Guided Transaction
  const [entryMode, setEntryMode] = useState<'expense' | 'income' | 'transfer' | 'split'>('expense');
  const [txDate, setTxDate] = useState<string>(() => todayLocalISO());
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

    // Editing = correction-by-replacement: void the original now that the
    // corrected entry has been posted successfully.
    if (editingTxId) {
      const rev = reverseTransaction(editingTxId, 'Superseded by corrected entry');
      if (!rev.success) {
        alert(
          `সংশোধিত এন্ট্রি পোস্ট হয়েছে, কিন্তু পুরনোটি বাতিল করা যায়নি — তালিকা থেকে পুরনো এন্ট্রিটি নিজে Delete করুন। (${rev.error || ''})`
        );
      }
    }

    // Reset & close
    setAmount('');
    setTxNote('');
    setEditingTxId(null);
    setIsPostModalOpen(false);
  };

  const handleDeleteClick = (txId: string) => {
    if (
      confirm(
        'এই এন্ট্রিটি মুছতে চান? অডিট-নিরাপদ ডাবল-এন্ট্রি নিয়মে এটি একটি ব্যালান্সড reversal এন্ট্রি পোস্ট করে বাতিল করা হবে।\nDelete this entry? A balanced reversal will be posted (audit-safe).'
      )
    ) {
      const res = reverseTransaction(txId, 'User requested deletion');
      if (!res.success) {
        alert(res.error || 'Failed to delete (reverse) transaction.');
      }
    }
  };

  const EDITABLE_TYPES = ['expense', 'income', 'transfer', 'split_expense'];

  const openEditModal = (txId: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    const lines = transactionLines.filter((l) => l.transactionId === txId);
    const accountLines = lines.filter((l) => l.lineType === 'account');
    const categoryLines = lines.filter((l) => l.lineType === 'category');

    setFormError(null);
    setIsCreatingInlineCategory(false);
    setTxDate(tx.date);
    setTxNote(tx.note || '');

    if (tx.type === 'transfer') {
      const src = accountLines.find((l) => l.amount < 0);
      const dst = accountLines.find((l) => l.amount > 0);
      setEntryMode('transfer');
      setSelectedAccount(src?.accountId || accounts[0]?.id || '');
      setDestinationAccount(dst?.accountId || accounts[1]?.id || '');
      setAmount(String(Math.abs(src?.amount || dst?.amount || 0)));
    } else if (tx.type === 'split_expense') {
      const src = accountLines.find((l) => l.amount < 0);
      setEntryMode('split');
      setSelectedAccount(src?.accountId || accounts[0]?.id || '');
      setAmount(String(Math.abs(src?.amount || 0)));
      setSplitLines(
        categoryLines.map((l) => ({
          categoryId: l.categoryId || '',
          amount: String(Math.abs(l.amount)),
          memo: l.memo || '',
        }))
      );
    } else {
      const isIncome = tx.type === 'income';
      const acc = accountLines[0];
      const cat = categoryLines[0];
      setEntryMode(isIncome ? 'income' : 'expense');
      setSelectedAccount(acc?.accountId || accounts[0]?.id || '');
      setSelectedCategory(cat?.categoryId || '');
      setAmount(String(Math.abs(cat?.amount || acc?.amount || 0)));
    }

    setEditingTxId(txId);
    setIsPostModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="border-b border-edge pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1">
            <BookOpen className="h-4 w-4" />
            <span>Income & Expenses Journal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Income & Expenses
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Track and balance all your income, expenses, and transfers seamlessly with double-entry precision.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('csv_import')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-all shadow-sm cursor-pointer"
                title="Import transactions from Bank / bKash / Nagad statement CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-sky-400" />
                <span>CSV স্টেটমেন্ট ইমপোর্ট</span>
              </button>

              <button
                onClick={() => onNavigate('sms_parser')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent-strong text-xs font-semibold border border-accent/30 transition-all shadow-sm cursor-pointer"
                title="Parse SMS from bKash, Nagad, Rocket or Bank alerts"
              >
                <MessageSquare className="h-3.5 w-3.5 text-accent-strong" />
                <span>SMS পার্সার (100% Free)</span>
              </button>
            </>
          )}

          <Button
            onClick={() => setIsCategoryModalOpen(true)}
            variant="secondary"
          >
            <Tag className="h-3.5 w-3.5 text-accent-strong" />
            <span>Manage Categories</span>
          </Button>

          <Button
            onClick={() => {
              setIsCreatingInlineCategory(false);
              setFormError(null);
              setIsPostModalOpen(true);
            }}
            variant="primary"
            icon={Plus}
          >
            Post Transaction
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-edge overflow-x-auto w-full md:w-auto text-xs">
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
                  ? 'bg-raised text-ink font-semibold shadow-sm'
                  : 'text-ink-muted hover:text-ink-soft'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <Input
            icon={Search}
            type="text"
            placeholder="Search memo, ID, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions Journal Table */}
      <div className="rounded-xl border border-edge bg-surface/40 overflow-hidden divide-y divide-edge/80">
        {filteredTransactions.map((tx) => {
          const lines = transactionLines.filter((l) => l.transactionId === tx.id);
          const isVoided = tx.status === 'voided';
          const isReversal = Boolean(tx.linkedTransactionId);

          return (
            <div
              key={tx.id}
              className={`p-4 transition-colors ${isVoided ? 'bg-canvas/60 opacity-70' : 'hover:bg-raised/20'}`}
            >
              {/* Transaction Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs text-ink-muted flex items-center gap-1.5 bg-canvas px-2 py-0.5 rounded border border-edge">
                    <Calendar className="h-3 w-3 text-ink-faint" />
                    <span>{tx.date}</span>
                  </span>

                  <span className="text-xs uppercase font-semibold text-ink-soft bg-raised/60 px-2 py-0.5 rounded">
                    {tx.type.replace('_', ' ')}
                  </span>

                  {isVoided && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-rose-950/60 text-negative border border-negative/30">
                      Voided / Reversed
                    </span>
                  )}

                  {isReversal && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-950/60 text-warning border border-warning/30">
                      Reversal Entry
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-ink-faint">
                    #{tx.id.replace('tx-', '').slice(0, 10)}
                  </span>

                  {!isVoided && !isReversal && EDITABLE_TYPES.includes(tx.type) && (
                    <button
                      onClick={() => openEditModal(tx.id)}
                      className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent-strong transition-colors px-2 py-0.5 rounded hover:bg-emerald-950/30 border border-transparent hover:border-emerald-900/50"
                      title="Correct this entry: posts a fixed copy and auto-reverses the original"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  )}
                  {!isVoided && !isReversal && (
                    <button
                      onClick={() => handleDeleteClick(tx.id)}
                      className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-negative transition-colors px-2 py-0.5 rounded hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50"
                      title="Delete by posting a balanced reversal (audit-safe)"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Note / Memo */}
              {tx.note && (
                <div className="text-xs text-ink-soft mb-3 font-sans flex items-center gap-1.5">
                  <span className="text-ink-faint font-medium">Memo:</span>
                  <span>{tx.note}</span>
                </div>
              )}

              {/* Transaction Child Lines Table */}
              <div className="rounded-lg border border-edge/80 bg-canvas p-3 space-y-1.5 text-xs">
                {/* Desktop Column Header */}
                <div className="hidden sm:grid grid-cols-12 text-[10px] uppercase font-semibold text-ink-muted pb-1.5 border-b border-edge/80">
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
                    <div key={line.id} className="border-b border-edge-soft/60 last:border-none py-1.5">
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
                            <span className="text-ink-soft font-medium truncate text-xs">
                              {entityName}
                            </span>
                          </div>
                          {line.memo && (
                            <div className="text-ink-muted text-[10px] truncate">
                              {line.memo}
                            </div>
                          )}
                        </div>
                        <div
                          className={`text-right font-semibold font-mono text-xs shrink-0 ${
                            line.amount > 0 ? 'text-positive' : 'text-negative'
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
                        <div className="col-span-4 text-ink-soft font-medium truncate">
                          {entityName}
                        </div>
                        <div className="col-span-3 text-ink-muted truncate text-[11px]">
                          {line.memo || '—'}
                        </div>
                        <div
                          className={`col-span-2 text-right font-semibold font-mono ${
                            line.amount > 0 ? 'text-positive' : 'text-negative'
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
                <div className="pt-2 mt-1 border-t border-edge/80 flex items-center justify-between text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1.5 text-accent-strong">
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
          <div className="p-12 text-center text-ink-muted text-xs">
            No transactions found. Click &quot;+ Post Transaction&quot; to record your entries.
          </div>
        )}
      </div>

      {/* Modal: Post New Transaction */}
      <Modal
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false);
          setEditingTxId(null);
        }}
        title={
          <span className="flex items-center gap-2">
            {editingTxId ? (
              <Pencil className="h-4 w-4 text-warning" />
            ) : (
              <Plus className="h-4 w-4 text-accent-strong" />
            )}
            <span>{editingTxId ? 'Edit Transaction (Correction)' : 'Post Double-Entry Transaction'}</span>
          </span>
        }
        description={
          editingTxId
            ? 'সংশোধিত এন্ট্রি পোস্ট হবে এবং পুরনোটি স্বয়ংক্রিয়ভাবে reverse হবে (অডিট-নিরাপদ)।'
            : 'Record income, expenses, transfers, or multi-item splits.'
        }
        maxWidth="xl"
        className="max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-canvas rounded-lg border border-edge">
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
                      ? 'bg-raised text-ink font-semibold shadow-sm'
                      : 'text-ink-muted hover:text-ink-soft'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {categoryCreateMsg && <ErrorBanner variant="success" message={categoryCreateMsg} />}

            {formError && <ErrorBanner variant="error" message={formError} />}

            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date" required>
                  <Input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    required
                  />
                </Field>

                <Field label="Total Amount (৳)" required>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 2500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="font-mono font-bold"
                    required
                  />
                </Field>
              </div>

              {/* Source Account */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-ink-soft font-medium">
                    {entryMode === 'income' ? 'Deposit Into Account *' : 'Source Funding Account *'}
                  </label>
                  {selectedAccount && (
                    <span className="text-[11px] font-mono text-accent-strong">
                      Balance: ৳{getAccountBalance(selectedAccount).toLocaleString()}
                    </span>
                  )}
                </div>
                <Select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  required
                >
                  {accounts
                    .filter((a) => !a.isArchived)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.accountType}) — ৳{getAccountBalance(a.id).toLocaleString()}
                      </option>
                    ))}
                </Select>

                {/* Insufficient Funds Warning for Expense/Transfer/Split */}
                {(() => {
                  if (entryMode === 'income') return null;
                  const acc = accounts.find((a) => a.id === selectedAccount);
                  if (!acc || !['cash', 'bank', 'mobile_wallet'].includes(acc.accountType)) return null;
                  const bal = getAccountBalance(acc.id);
                  const parsedAmt = parseFloat(amount) || 0;
                  if (parsedAmt <= bal) return null;

                  return (
                    <div className="mt-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs space-y-1">
                      <div className="font-semibold text-warning flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                        <span>অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই (Insufficient Balance)</span>
                      </div>
                      <div className="text-[11px] text-ink-soft">
                        "{acc.name}" অ্যাকাউন্টে বর্তমান ব্যালেন্স: <span className="font-bold text-warning font-mono">৳{bal.toLocaleString()}</span>, কিন্তু খরচ/ট্রান্সফার করতে চাওয়া হচ্ছে <span className="font-bold text-ink font-mono">৳{parsedAmt.toLocaleString()}</span>।
                      </div>
                      <div className="text-[11px] text-accent-strong font-medium">
                        💡 লেনদেন সম্পন্ন করার পূর্বে অনুগ্রহ করে আগে এই অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন।
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Destination Account for Transfer */}
              {entryMode === 'transfer' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-ink-soft font-medium">Destination Target Account *</label>
                    {destinationAccount && (
                      <span className="text-[11px] font-mono text-accent-strong">
                        Balance: ৳{getAccountBalance(destinationAccount).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Select
                    value={destinationAccount}
                    onChange={(e) => setDestinationAccount(e.target.value)}
                    required
                  >
                    {accounts
                      .filter((a) => !a.isArchived && a.id !== selectedAccount)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.accountType}) — ৳{getAccountBalance(a.id).toLocaleString()}
                        </option>
                      ))}
                  </Select>
                </div>
              )}

              {/* Category for Expense / Income */}
              {(entryMode === 'expense' || entryMode === 'income') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-ink-soft font-medium">
                      {entryMode === 'expense' ? 'Expense Category *' : 'Income Category *'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingInlineCategory(!isCreatingInlineCategory)}
                      className="text-xs text-accent-strong hover:text-accent flex items-center gap-1 font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isCreatingInlineCategory ? 'Cancel' : '+ Add Custom Category'}</span>
                    </button>
                  </div>

                  {/* Inline Category Creator Form */}
                  {isCreatingInlineCategory ? (
                    <div className="p-3 rounded-lg bg-canvas border border-accent/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-accent-strong">
                        <span>Create New {entryMode === 'income' ? 'Income' : 'Expense'} Category</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <Input
                            type="text"
                            placeholder={entryMode === 'income' ? 'e.g. Freelancing, Rental, Bonus...' : 'e.g. Gym, Pet Care, Office Lunch...'}
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newCatColor}
                            onChange={(e) => setNewCatColor(e.target.value)}
                            className="h-8 w-10 rounded cursor-pointer border border-slate-700 bg-surface p-0.5"
                            title="Choose color tag"
                          />
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleCreateCategory}
                            className="flex-1"
                          >
                            Save Category
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      required
                    >
                      {categories
                        .filter((c) => (entryMode === 'expense' ? c.type === 'expense' : c.type === 'income'))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {!c.isSystem ? '★ (Custom)' : ''}
                          </option>
                        ))}
                    </Select>
                  )}
                </div>
              )}

              {/* Split Lines Editor */}
              {entryMode === 'split' && (
                <div className="space-y-2 rounded-lg bg-canvas p-3 border border-edge">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink-soft mb-1">
                    <span>Split Breakdown Categories</span>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-accent-strong hover:underline text-[11px]"
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
                          className="w-full rounded border border-edge bg-surface p-1.5 text-xs text-ink"
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
                          className="w-full rounded border border-edge bg-surface p-1.5 text-xs text-ink font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        {splitLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setSplitLines(splitLines.filter((_, i) => i !== idx))}
                            className="text-ink-faint hover:text-negative"
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
                    className="text-[11px] text-accent-strong hover:underline pt-1 block"
                  >
                    + Add Another Split Item
                  </button>
                </div>
              )}

              {/* Note / Memo */}
              <Field label="Description / Memo">
                <Input
                  type="text"
                  placeholder="e.g. Agora grocery shopping, restaurant dinner, project milestone..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                />
              </Field>

              <div className="border-t border-edge pt-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPostModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                >
                  Post Transaction
                </Button>
              </div>
            </form>
        </div>
      </Modal>

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
    <Modal
      isOpen
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <FolderPlus className="h-4 w-4 text-accent-strong" />
          <span>Income & Expense Categories</span>
        </span>
      }
      description="Customize and manage income and expense categories for your accounts."
      maxWidth="2xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-canvas rounded-lg border border-edge">
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'expense'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40 shadow-sm'
                : 'text-ink-muted hover:text-ink-soft'
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
                : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            Income Categories ({categories.filter((c) => c.type === 'income').length})
          </button>
        </div>

        {errorMessage && <ErrorBanner variant="error" message={errorMessage} />}

        {successMessage && <ErrorBanner variant="success" message={successMessage} />}

        {/* Add New Category Form */}
        <form onSubmit={handleSubmit} className="p-3.5 rounded-xl bg-canvas border border-edge space-y-2">
          <div className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent-strong" />
            <span>Add New {activeTab === 'expense' ? 'Expense' : 'Income'} Category</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex-1 w-full">
              <Input
                type="text"
                placeholder={activeTab === 'expense' ? 'Category name (e.g., Medical, Fitness, Subscriptions...)' : 'Category name (e.g., Bonus, Rental, Dividend...)'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 rounded cursor-pointer border border-slate-700 bg-surface p-0.5 shrink-0"
                title="Choose color tag"
              />
              <Button
                type="submit"
                variant="primary"
                className="flex-1 sm:flex-none whitespace-nowrap"
              >
                + Add Category
              </Button>
            </div>
          </div>
        </form>

        {/* Category List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-xl bg-canvas/80 border border-edge flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || (cat.type === 'income' ? '#10B981' : '#F59E0B') }}
                  />
                  <div className="truncate">
                    <span className="font-medium text-ink-soft block truncate">{cat.name}</span>
                    <span className="text-[10px] text-ink-faint">
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
                    className="p-1.5 text-ink-faint hover:text-negative hover:bg-rose-950/40 rounded transition-colors shrink-0"
                    title="Delete custom category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-edge pt-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
