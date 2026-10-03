import { todayLocalISO } from '../lib/date-utils';
import { newId } from '../lib/id-utils';
import React, { useState } from 'react';
import {
  Account,
  Category,
  Transaction,
  TransactionLine,
  BrokerCashTransaction,
  Stock,
} from '../types/accounting';
import {
  calculateAccountBalances,
  calculateBrokerCashBalance,
  calculateNetWorth,
  calculateStockHoldings,
  validateTransactionPosting,
} from '../lib/accounting-engine';
import { PlusCircle, AlertTriangle, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', userId: 'u-1', name: 'City Bank Savings', accountType: 'bank', currency: 'BDT', isZakatable: true, isArchived: false, createdAt: '2026-09-01' },
  { id: 'acc-2', userId: 'u-1', name: 'Cash on Hand', accountType: 'cash', currency: 'BDT', isZakatable: true, isArchived: false, createdAt: '2026-09-01' },
  { id: 'acc-3', userId: 'u-1', name: 'bKash Wallet', accountType: 'mobile_wallet', currency: 'BDT', isZakatable: true, isArchived: false, createdAt: '2026-09-01' },
  { id: 'acc-4', userId: 'u-1', name: 'SCB Credit Card', accountType: 'credit_card', currency: 'BDT', creditLimit: 150000, isZakatable: false, isArchived: false, createdAt: '2026-09-01' },
  { id: 'acc-5', userId: 'u-1', name: 'Auto Loan Facility', accountType: 'loan', currency: 'BDT', isZakatable: false, isArchived: false, createdAt: '2026-09-01' },
  { id: 'acc-6', userId: 'u-1', name: 'Private Vehicle (Premio)', accountType: 'asset', currency: 'BDT', isZakatable: false, isArchived: false, createdAt: '2026-09-01' },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', userId: 'u-1', name: 'Salary', type: 'income', isSystem: false },
  { id: 'cat-2', userId: 'u-1', name: 'Groceries', type: 'expense', isSystem: false },
  { id: 'cat-3', userId: 'u-1', name: 'Dining Out', type: 'expense', isSystem: false },
  { id: 'cat-4', userId: 'u-1', name: 'Utilities', type: 'expense', isSystem: false },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', userId: 'u-1', date: '2026-09-01', type: 'opening_balance', status: 'posted', version: 1, note: 'Initial Bank Deposit', createdBy: 'u-1', createdAt: '2026-09-01', updatedAt: '2026-09-01' },
  { id: 'tx-2', userId: 'u-1', date: '2026-09-02', type: 'opening_balance', status: 'posted', version: 1, note: 'Initial Cash', createdBy: 'u-1', createdAt: '2026-09-02', updatedAt: '2026-09-02' },
  { id: 'tx-3', userId: 'u-1', date: '2026-09-05', type: 'expense', status: 'posted', version: 1, note: 'Bazaar Groceries', createdBy: 'u-1', createdAt: '2026-09-05', updatedAt: '2026-09-05' },
  { id: 'tx-4', userId: 'u-1', date: '2026-09-10', type: 'cc_purchase', status: 'posted', version: 1, note: 'Restaurant Dinner', createdBy: 'u-1', createdAt: '2026-09-10', updatedAt: '2026-09-10' },
  { id: 'tx-5', userId: 'u-1', date: '2026-09-12', type: 'asset_purchase', status: 'posted', version: 1, note: 'Car Purchase via Loan + Bank', createdBy: 'u-1', createdAt: '2026-09-12', updatedAt: '2026-09-12' },
];

const INITIAL_LINES: TransactionLine[] = [
  // Tx-1: Opening Bank +150k
  { id: 'l-1', transactionId: 'tx-1', lineType: 'account', accountId: 'acc-1', amount: 150000, createdAt: '2026-09-01' },
  // Tx-2: Opening Cash +20k
  { id: 'l-2', transactionId: 'tx-2', lineType: 'account', accountId: 'acc-2', amount: 20000, createdAt: '2026-09-02' },
  // Tx-3: Groceries 2.5k from Cash
  { id: 'l-3', transactionId: 'tx-3', lineType: 'category', categoryId: 'cat-2', amount: 2500, createdAt: '2026-09-05' },
  { id: 'l-4', transactionId: 'tx-3', lineType: 'account', accountId: 'acc-2', amount: -2500, createdAt: '2026-09-05' },
  // Tx-4: Dining 4.2k on Credit Card
  { id: 'l-5', transactionId: 'tx-4', lineType: 'category', categoryId: 'cat-3', amount: 4200, createdAt: '2026-09-10' },
  { id: 'l-6', transactionId: 'tx-4', lineType: 'account', accountId: 'acc-4', amount: -4200, createdAt: '2026-09-10' },
  // Tx-5: Car Purchase: Car Asset +2.2M, Bank -700k, Loan -1.5M
  { id: 'l-7', transactionId: 'tx-5', lineType: 'account', accountId: 'acc-6', amount: 2200000, createdAt: '2026-09-12' },
  { id: 'l-8', transactionId: 'tx-5', lineType: 'account', accountId: 'acc-1', amount: -700000, createdAt: '2026-09-12' },
  { id: 'l-9', transactionId: 'tx-5', lineType: 'account', accountId: 'acc-5', amount: -1500000, createdAt: '2026-09-12' },
];

const INITIAL_BROKER_CASH: BrokerCashTransaction[] = [
  { id: 'bc-1', userId: 'u-1', brokerAccountId: 'ba-1', transactionDate: '2026-09-01', type: 'deposit', amountSigned: 100000, note: 'Initial BO Funding' },
  { id: 'bc-2', userId: 'u-1', brokerAccountId: 'ba-1', transactionDate: '2026-09-03', type: 'buy_gross', amountSigned: -50000, note: 'GP Buy Execution' },
  { id: 'bc-3', userId: 'u-1', brokerAccountId: 'ba-1', transactionDate: '2026-09-03', type: 'commission', amountSigned: -200, note: 'Broker Fee' },
];

const STOCKS: Stock[] = [
  { id: 'stk-1', symbol: 'GP', companyName: 'Grameenphone Ltd.', sector: 'Telecom', exchange: 'DSE', currentPrice: 285.0 },
  { id: 'stk-2', symbol: 'BATBC', companyName: 'British American Tobacco', sector: 'Food & Allied', exchange: 'DSE', currentPrice: 410.0 },
];

export const LedgerSandbox: React.FC = () => {
  const [accounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [lines, setLines] = useState<TransactionLine[]>(INITIAL_LINES);
  const [brokerCash] = useState<BrokerCashTransaction[]>(INITIAL_BROKER_CASH);

  // New Transaction Form State
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer' | 'cc_purchase'>('expense');
  const [txAccount, setTxAccount] = useState<string>('acc-1');
  const [txTargetAccount, setTxTargetAccount] = useState<string>('acc-3');
  const [txCategory, setTxCategory] = useState<string>('cat-2');
  const [txAmount, setTxAmount] = useState<string>('1500');
  const [txNote, setTxNote] = useState<string>('');
  const [postError, setPostError] = useState<string | null>(null);

  // Computations
  const accountBalances = calculateAccountBalances(accounts, transactions, lines);
  const totalBrokerCash = calculateBrokerCashBalance(brokerCash);
  const stockHoldings = calculateStockHoldings(STOCKS, [
    { transactionType: 'buy', stockId: 'stk-1', quantity: 200, price: 250, grossValue: 50000, commission: 200, tax: 0, otherCharges: 0 },
  ]);
  const netWorthView = calculateNetWorth(accountBalances, totalBrokerCash, stockHoldings);

  const handlePostTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);

    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      setPostError('Amount must be greater than zero.');
      return;
    }

    const newTxId = newId('tx');
    const newTx: Transaction = {
      id: newTxId,
      userId: 'u-1',
      date: todayLocalISO(),
      type: txType,
      status: 'posted',
      version: 1,
      note: txNote || `${txType.toUpperCase()} entry`,
      createdBy: 'u-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newLines: TransactionLine[] = [];

    if (txType === 'expense' || txType === 'cc_purchase') {
      newLines.push({
        id: newId('l'),
        transactionId: newTxId,
        lineType: 'category',
        categoryId: txCategory,
        amount: amt,
        createdAt: new Date().toISOString(),
      });
      newLines.push({
        id: newId('l'),
        transactionId: newTxId,
        lineType: 'account',
        accountId: txType === 'cc_purchase' ? 'acc-4' : txAccount,
        amount: -amt,
        createdAt: new Date().toISOString(),
      });
    } else if (txType === 'income') {
      newLines.push({
        id: newId('l'),
        transactionId: newTxId,
        lineType: 'category',
        categoryId: txCategory,
        amount: -amt,
        createdAt: new Date().toISOString(),
      });
      newLines.push({
        id: newId('l'),
        transactionId: newTxId,
        lineType: 'account',
        accountId: txAccount,
        amount: amt,
        createdAt: new Date().toISOString(),
      });
    } else if (txType === 'transfer') {
      newLines.push({
        id: newId('l'),
        transactionId: newTxId,
        lineType: 'account',
        accountId: txAccount,
        amount: -amt,
        createdAt: new Date().toISOString(),
      });
      newLines.push({
        id: newId('l'),
        transactionId: newTxId,
        lineType: 'account',
        accountId: txTargetAccount,
        amount: amt,
        createdAt: new Date().toISOString(),
      });
    }

    // Invariant Check
    const validation = validateTransactionPosting(newTx, newLines);
    if (!validation.valid) {
      setPostError(validation.reason || 'Invariant validation failed.');
      return;
    }

    setTransactions((prev) => [newTx, ...prev]);
    setLines((prev) => [...prev, ...newLines]);
    setTxNote('');
  };

  const handleResetSandbox = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    setLines(INITIAL_LINES);
    setPostError(null);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Top Banner & Net Worth Reconciler */}
      <div className="border-b border-edge pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-accent-strong mb-1.5">
            <Sparkles className="h-4 w-4" />
            <span>LIVE LEDGER SIMULATION ENGINE</span>
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Interactive Double-Entry Sandbox</h1>
          <p className="text-ink-muted text-xs mt-1">
            Test real-time transactions, observe posting invariant validations, and watch live Net Worth calculate.
          </p>
        </div>

        <button
          onClick={handleResetSandbox}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-700 bg-surface text-ink-soft hover:text-ink hover:border-slate-600 transition-colors w-fit"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reset Sandbox</span>
        </button>
      </div>

      {/* Authoritative Live Net Worth Dashboard Card */}
      <div className="rounded-xl border border-edge bg-gradient-to-r from-slate-900/80 to-slate-950/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
            Authoritative Live Net Worth (v_net_worth view)
          </span>
          <span className="text-xs font-mono text-accent-strong flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Strict Sign Rule Active</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <div className="text-xs text-ink-muted font-mono">Net Worth Total</div>
            <div className="text-2xl font-bold font-mono text-ink mt-1">
              ৳{netWorthView.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5 font-mono">Liabilities already negative</div>
          </div>

          <div className="border-l border-edge pl-4">
            <div className="text-xs text-ink-muted font-mono">Canonical Accounts</div>
            <div className="text-base font-semibold font-mono text-ink-soft mt-1">
              ৳{netWorthView.accountsBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5">Sum of all bank, asset & debt accounts</div>
          </div>

          <div className="border-l border-edge pl-4">
            <div className="text-xs text-ink-muted font-mono">Broker Cash Sub-Ledger</div>
            <div className="text-base font-semibold font-mono text-ink-soft mt-1">
              ৳{netWorthView.brokerCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5">v_broker_cash_balance</div>
          </div>

          <div className="border-l border-edge pl-4">
            <div className="text-xs text-ink-muted font-mono">Stock Market Valuation</div>
            <div className="text-base font-semibold font-mono text-ink-soft mt-1">
              ৳{netWorthView.stockMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5">200 GP shares @ ৳285.00</div>
          </div>
        </div>
      </div>

      {/* 2-Column Workspace: Account Balances on Left, Post Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Live Account Balances Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
              Canonical Accounts (v_account_balances)
            </h2>
            <span className="text-xs text-ink-faint font-mono">{accountBalances.length} accounts</span>
          </div>

          <div className="rounded-xl border border-edge bg-surface/40 overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-edge bg-canvas/60 text-ink-muted">
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Derived Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {accountBalances.map((acc) => (
                  <tr key={acc.accountId} className="hover:bg-raised/30">
                    <td className="py-2.5 px-3 text-ink-soft font-medium">{acc.accountName}</td>
                    <td className="py-2.5 px-3 text-ink-muted">{acc.accountType}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        acc.currentBalance < 0
                          ? 'text-negative'
                          : acc.currentBalance > 0
                          ? 'text-accent-strong'
                          : 'text-ink-muted'
                      }`}
                    >
                      {acc.currentBalance < 0
                        ? `-৳${Math.abs(acc.currentBalance).toLocaleString()}`
                        : `৳${acc.currentBalance.toLocaleString()}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Posted Transactions Header */}
          <div className="pt-2">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono mb-2">
              Recent Posted Transactions ({transactions.length})
            </h2>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {transactions.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-lg border border-edge bg-surface/30 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-raised text-ink-soft">
                      {tx.type}
                    </span>
                    <span className="text-ink-soft truncate">{tx.note}</span>
                  </div>
                  <span className="text-ink-faint shrink-0">{tx.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Post New Transaction Form */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-edge bg-surface/60 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-edge/80 pb-3">
              <PlusCircle className="h-4 w-4 text-accent-strong" />
              <h3 className="text-sm font-semibold text-ink">Post Live Transaction</h3>
            </div>

            {postError && (
              <div className="rounded-lg bg-rose-950/40 border border-rose-800/50 p-3 text-xs text-negative flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-negative" />
                <span>{postError}</span>
              </div>
            )}

            <form onSubmit={handlePostTransaction} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-ink-muted mb-1">Event Type</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                >
                  <option value="expense">Expense (Account -X, Category +X)</option>
                  <option value="income">Income (Account +X, Category +X)</option>
                  <option value="transfer">Transfer (Acc1 -X, Acc2 +X)</option>
                  <option value="cc_purchase">Credit Card Spend (Card -X, Category +X)</option>
                </select>
              </div>

              {txType !== 'cc_purchase' && (
                <div>
                  <label className="block text-ink-muted mb-1">Source Account</label>
                  <select
                    value={txAccount}
                    onChange={(e) => setTxAccount(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.accountType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {txType === 'transfer' && (
                <div>
                  <label className="block text-ink-muted mb-1">Destination Account</label>
                  <select
                    value={txTargetAccount}
                    onChange={(e) => setTxTargetAccount(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.accountType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {txType !== 'transfer' && (
                <div>
                  <label className="block text-ink-muted mb-1">Reporting Category</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-ink-muted mb-1">Amount (BDT)</label>
                <input
                  type="number"
                  step="any"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-mono"
                  placeholder="e.g. 1500.00"
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1">Note / Memo</label>
                <input
                  type="text"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-sans"
                  placeholder="e.g. Monthly internet subscription"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold font-mono text-xs transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm"
              >
                <span>Commit & Post to Ledger</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
