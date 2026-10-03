import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { AccountType, NewAccountInput } from '../../types/accounting';
import {
  Building2,
  Plus,
  Search,
  Archive,
} from 'lucide-react';
import { Modal, Field, Input, Select, Button, StatCard } from '../ui';

export const AccountsView: React.FC = () => {
  const { accounts, accountBalances, brokerCashBalances, createAccount, archiveAccount, unarchiveAccount } = useLedger();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [institutionName, setInstitutionName] = useState('');
  const [accountNumberMask, setAccountNumberMask] = useState('');
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [isZakatable, setIsZakatable] = useState(true);

  // Calculated totals
  const totalAssets = accountBalances
    .filter((b) => b.currentBalance > 0)
    .reduce((sum, b) => sum + b.currentBalance, 0);

  const totalLiabilities = accountBalances
    .filter((b) => b.currentBalance < 0)
    .reduce((sum, b) => sum + b.currentBalance, 0);

  const totalBrokerCash = brokerCashBalances.reduce((sum, b) => sum + b.cashBalance, 0);
  const netLiquid = totalAssets + totalLiabilities; // Lock 1: liabilities negative, add directly
  const totalWealth = netLiquid + totalBrokerCash;

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.institutionName && acc.institutionName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (typeFilter === 'all') return !acc.isArchived;
    if (typeFilter === 'archived') return acc.isArchived;
    if (typeFilter === 'liquid') return ['cash', 'bank', 'mobile_wallet'].includes(acc.accountType) && !acc.isArchived;
    if (typeFilter === 'credit_card') return acc.accountType === 'credit_card' && !acc.isArchived;
    if (typeFilter === 'fd') return acc.accountType === 'fd' && !acc.isArchived;
    if (typeFilter === 'debt') return ['receivable', 'payable', 'loan'].includes(acc.accountType) && !acc.isArchived;
    if (typeFilter === 'asset') return acc.accountType === 'asset' && !acc.isArchived;

    return !acc.isArchived;
  });

  const getBalance = (accId: string) => {
    const b = accountBalances.find((item) => item.accountId === accId);
    return b ? b.currentBalance : 0;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedLimit = creditLimit ? parseFloat(creditLimit) : undefined;
    const parsedInit = initialBalance ? parseFloat(initialBalance) : 0;

    const input: NewAccountInput = {
      name: name.trim(),
      accountType,
      currency: 'BDT',
      institutionName: institutionName.trim() || undefined,
      accountNumberMask: accountNumberMask.trim() || undefined,
      creditLimit: parsedLimit,
      initialBalance: parsedInit,
      isZakatable,
    };

    createAccount(input);

    // Reset & close
    setName('');
    setInstitutionName('');
    setAccountNumberMask('');
    setCreditLimit('');
    setInitialBalance('0');
    setIsCreateModalOpen(false);
  };

  const getAccountTypeLabel = (t: AccountType) => {
    switch (t) {
      case 'cash': return 'Cash';
      case 'bank': return 'Bank Account';
      case 'mobile_wallet': return 'Mobile Wallet';
      case 'credit_card': return 'Credit Card';
      case 'fd': return 'Fixed Deposit';
      case 'dps': return 'DPS Account';
      case 'loan': return 'Loan Facility';
      case 'receivable': return 'Receivable';
      case 'payable': return 'Payable';
      case 'asset': return 'Physical Asset';
      case 'liability': return 'Liability';
      default: return t;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="border-b border-edge pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1.5">
            <Building2 className="h-4 w-4" />
            <span>Accounts & Financial Wallets</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Bank Accounts & Wallets
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Manage your cash, savings, checking, credit card, and mobile wallet balances with double-entry integrity.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
          size="sm"
          icon={Plus}
        >
          Add New Account
        </Button>
      </div>

      {/* Metric Cards for Account Holdings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Asset Accounts"
          value={`৳${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle="Cash, Bank, Mobile Wallets & FDs"
          variant="emerald"
        />

        <StatCard
          title="Brokerage BO Cash"
          value={`৳${totalBrokerCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle="CDBL Broker Sub-Ledger Funds"
          variant="sky"
        />

        <StatCard
          title="Total Liability Accounts"
          value={totalLiabilities === 0 ? '৳0.00' : `-৳${Math.abs(totalLiabilities).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle="Credit Cards, Loans & Payables"
          variant="rose"
        />

        <StatCard
          title="Net Liquid + BO Total"
          value={`৳${totalWealth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle="All liquid assets + brokerage funds"
          variant="default"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Segmented Filter Control (zero pill rule: functional tab buttons) */}
        <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-edge overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'All Active' },
            { id: 'liquid', label: 'Cash & Bank' },
            { id: 'credit_card', label: 'Credit Cards' },
            { id: 'fd', label: 'Fixed Deposits' },
            { id: 'debt', label: 'Loans & Debts' },
            { id: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === tab.id
                  ? 'bg-raised text-ink shadow-sm font-semibold'
                  : 'text-ink-muted hover:text-ink-soft'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full md:w-64">
          <Input
            icon={Search}
            type="text"
            placeholder="Search accounts or institutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((acc) => {
          const balance = getBalance(acc.id);
          const isNegative = balance < 0;

          return (
            <div
              key={acc.id}
              className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                acc.isArchived
                  ? 'border-edge/60 bg-canvas/40 opacity-60'
                  : 'border-edge bg-surface/50 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-ink-faint">
                      {getAccountTypeLabel(acc.accountType)}
                    </span>
                    <h3 className="text-sm font-bold text-ink tracking-tight">{acc.name}</h3>
                  </div>

                  <div className="text-right">
                    {acc.isZakatable && (
                      <span className="text-[9px] font-mono text-accent-strong border border-accent/30 bg-emerald-950/20 px-1.5 py-0.5 rounded">
                        Zakatable
                      </span>
                    )}
                  </div>
                </div>

                {acc.institutionName && (
                  <div className="text-xs text-ink-muted flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-ink-faint" />
                    <span>{acc.institutionName}</span>
                    {acc.accountNumberMask && (
                      <span className="text-ink-faint font-mono text-[11px]">({acc.accountNumberMask})</span>
                    )}
                  </div>
                )}

                {acc.accountType === 'credit_card' && acc.creditLimit && (
                  <div className="text-[11px] text-ink-faint font-mono">
                    Limit: ৳{acc.creditLimit.toLocaleString()} · Available: ৳
                    {(acc.creditLimit + balance).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Balance Bottom Bar */}
              <div className="pt-4 mt-4 border-t border-edge/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-faint uppercase">Authoritative Balance</div>
                  <div
                    className={`text-lg font-bold font-mono tracking-tight ${
                      isNegative ? 'text-negative' : 'text-accent-strong'
                    }`}
                  >
                    ৳{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  {acc.isArchived ? (
                    <button
                      onClick={() => unarchiveAccount(acc.id)}
                      className="text-[11px] font-mono text-ink-muted hover:text-ink px-2 py-1 rounded bg-raised hover:bg-slate-700 transition-colors"
                    >
                      Unarchive
                    </button>
                  ) : (
                    <button
                      onClick={() => archiveAccount(acc.id)}
                      className="text-[11px] font-mono text-ink-faint hover:text-negative transition-colors"
                      title="Archive account"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="rounded-xl border border-edge bg-surface/30 p-12 text-center text-ink-faint text-xs font-mono">
          No accounts found matching current filter.
        </div>
      )}

      {/* Modal: Create Account */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Canonical Account"
        description="Creates a new double-entry account ledger."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono">
          <Field label="Account Name" required>
            <Input
              type="text"
              placeholder="e.g. BRAC Bank Salary Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Type" required>
              <Select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
              >
                <option value="bank">Bank Account</option>
                <option value="cash">Cash / Vault</option>
                <option value="mobile_wallet">Mobile Wallet (bKash/Nagad)</option>
                <option value="credit_card">Credit Card (Liability)</option>
                <option value="loan">Loan Facility (Liability)</option>
                <option value="asset">Physical Asset</option>
                <option value="receivable">Receivable</option>
                <option value="payable">Payable</option>
              </Select>
            </Field>

            <Field label="Institution Name">
              <Input
                type="text"
                placeholder="e.g. BRAC Bank"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Mask / Number">
              <Input
                type="text"
                placeholder="e.g. •••• 9921"
                value={accountNumberMask}
                onChange={(e) => setAccountNumberMask(e.target.value)}
              />
            </Field>

            <Field label="Initial Balance (৳)">
              <Input
                type="number"
                step="any"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
              <p className="mt-1 text-[10px] text-ink-muted font-sans leading-relaxed">
                এই টাকা একটি ওপেনিং-ব্যালেন্স জার্নাল এন্ট্রি হিসেবে লেজারে পোস্ট হবে।{' '}
                Posted to the ledger as an opening-balance journal entry.
              </p>
            </Field>
          </div>

          {accountType === 'credit_card' && (
            <Field label="Credit Limit (৳)">
              <Input
                type="number"
                step="any"
                placeholder="e.g. 150000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </Field>
          )}

          <div className="flex items-center gap-2 pt-1 font-sans">
            <input
              type="checkbox"
              id="zakatable-chk"
              checked={isZakatable}
              onChange={(e) => setIsZakatable(e.target.checked)}
              className="rounded border-edge bg-canvas text-accent focus:ring-0 cursor-pointer"
            />
            <label htmlFor="zakatable-chk" className="text-ink-soft text-xs cursor-pointer select-none">
              Include in Zakat wealth calculation (applicable to liquid assets & cash)
            </label>
          </div>

          <div className="border-t border-edge pt-4 flex items-center justify-end gap-3 font-sans">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
