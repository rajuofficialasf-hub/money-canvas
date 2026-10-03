import React, { useState, useEffect } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { BrokerCashTransaction } from '../../types/accounting';
import {
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { Modal, Field, Input, Select, Button, StatCard, ErrorBanner } from '../ui';

const TakaIcon = () => <span className="font-mono text-xs">৳</span>;

interface BrokerageViewProps {
  onNavigateToTrades?: () => void;
}

export const BrokerageView: React.FC<BrokerageViewProps> = ({ onNavigateToTrades: _onNavigateToTrades }) => {
  const {
    brokers,
    brokerAccounts,
    brokerCashTransactions,
    brokerCashBalances,
    accounts,
    getAccountBalance,
    createBroker,
    createBrokerAccount,
    depositBrokerCash,
    withdrawBrokerCash,
  } = useLedger();

  const [selectedBoId, setSelectedBoId] = useState<string>('all');
  const [selectedTxType, setSelectedTxType] = useState<string>('all');

  // Modals state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isAddBrokerModalOpen, setIsAddBrokerModalOpen] = useState(false);
  const [isAddBoModalOpen, setIsAddBoModalOpen] = useState(false);

  // Deposit Form State
  const [depositBoAccountId, setDepositBoAccountId] = useState(brokerAccounts[0]?.id || '');
  const [depositBankAccountId, setDepositBankAccountId] = useState('direct_deposit');
  const [depositAmount, setDepositAmount] = useState<number | ''>(50000);
  const [depositNote, setDepositNote] = useState('');
  const [depositError, setDepositError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Withdraw Form State
  const [withdrawBoAccountId, setWithdrawBoAccountId] = useState(brokerAccounts[0]?.id || '');
  const [withdrawBankAccountId, setWithdrawBankAccountId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>(10000);
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  // Add Broker Form State
  const [newBrokerName, setNewBrokerName] = useState('');
  const [newBrokerLicense, setNewBrokerLicense] = useState('');
  const [newBrokerPhone, setNewBrokerPhone] = useState('');
  const [brokerError, setBrokerError] = useState('');

  // Add BO Account Form State
  const [newBoBrokerId, setNewBoBrokerId] = useState(brokers[0]?.id || '');
  const [newBoNumber, setNewBoNumber] = useState('');
  const [newBoName, setNewBoName] = useState('');
  const [newBoIsDefault, setNewBoIsDefault] = useState(false);
  const [boError, setBoError] = useState('');

  // Eligible bank/liquid accounts for transfer
  const liquidAccounts = accounts.filter(
    (a) => !a.isArchived && (a.accountType === 'bank' || a.accountType === 'mobile_wallet' || a.accountType === 'cash')
  );

  // Synchronize default selectors
  useEffect(() => {
    if (brokerAccounts.length > 0) {
      if (!depositBoAccountId || !brokerAccounts.some((b) => b.id === depositBoAccountId)) {
        setDepositBoAccountId(brokerAccounts[0].id);
      }
      if (!withdrawBoAccountId || !brokerAccounts.some((b) => b.id === withdrawBoAccountId)) {
        setWithdrawBoAccountId(brokerAccounts[0].id);
      }
    }
  }, [brokerAccounts, depositBoAccountId, withdrawBoAccountId]);

  useEffect(() => {
    if (liquidAccounts.length > 0) {
      if (!depositBankAccountId || !liquidAccounts.some((a) => a.id === depositBankAccountId)) {
        setDepositBankAccountId(liquidAccounts[0].id);
      }
      if (!withdrawBankAccountId || !liquidAccounts.some((a) => a.id === withdrawBankAccountId)) {
        setWithdrawBankAccountId(liquidAccounts[0].id);
      }
    }
  }, [liquidAccounts, depositBankAccountId, withdrawBankAccountId]);

  useEffect(() => {
    if (brokers.length > 0 && (!newBoBrokerId || !brokers.some((b) => b.id === newBoBrokerId))) {
      setNewBoBrokerId(brokers[0].id);
    }
  }, [brokers, newBoBrokerId]);

  // Total cash balance across all BO accounts
  const totalCashBalance = brokerCashBalances.reduce((sum, b) => sum + b.cashBalance, 0);

  // Filtered transactions
  const filteredTxs = brokerCashTransactions
    .filter((tx) => {
      const matchBo = selectedBoId === 'all' || tx.brokerAccountId === selectedBoId;
      const matchType = selectedTxType === 'all' || tx.type === selectedTxType;
      return matchBo && matchType;
    })
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  // Handlers
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError('');

    const targetBoId = depositBoAccountId || brokerAccounts[0]?.id;
    if (!targetBoId && brokerAccounts.length === 0) {
      // Auto-creates default BO inside context if needed
    }

    const targetBankId = depositBankAccountId || 'direct_deposit';

    const amt = typeof depositAmount === 'number' ? depositAmount : parseFloat(depositAmount as string);
    if (isNaN(amt) || amt <= 0) {
      setDepositError('Deposit amount must be greater than zero.');
      return;
    }

    const isDirectExternal = targetBankId === 'direct_deposit' || targetBankId === 'external_cash';
    if (!isDirectExternal) {
      const sourceAcc = accounts.find((a) => a.id === targetBankId);
      const available = getAccountBalance(targetBankId);
      if (available < amt) {
        setDepositError(
          `অপর্যাপ্ত ব্যালেন্স: "${sourceAcc?.name || 'ব্যাংক'}" অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${available.toLocaleString()}, প্রয়োজন: ৳${amt.toLocaleString()})। বিও অ্যাকাউন্টে টাকা পাঠানোর পূর্বে অনুগ্রহ করে আগে আপনার ব্যাংক অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। অথবা 'Direct Cash' সিলেক্ট করুন। / Insufficient funds in "${sourceAcc?.name || 'Bank'}" (Available: ৳${available.toLocaleString()}, Required: ৳${amt.toLocaleString()}). Please deposit money into your bank account first before transferring to BO account.`
        );
        return;
      }
    }

    const res = depositBrokerCash({
      brokerAccountId: targetBoId,
      sourceBankAccountId: targetBankId,
      amount: amt,
      note: depositNote.trim() || undefined,
    });

    if (!res.success) {
      setDepositError(res.error || 'Failed to deposit cash.');
      return;
    }

    showToast(`৳${amt.toLocaleString()} successfully added to BO Cash balance!`);
    setIsDepositModalOpen(false);
    setDepositNote('');
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');

    const targetBoId = withdrawBoAccountId || brokerAccounts[0]?.id;
    if (!targetBoId) {
      setWithdrawError('Please select a source BO account.');
      return;
    }

    const targetBankId = withdrawBankAccountId || liquidAccounts[0]?.id;
    if (!targetBankId) {
      setWithdrawError('Please select a destination bank account.');
      return;
    }

    const amt = typeof withdrawAmount === 'number' ? withdrawAmount : parseFloat(withdrawAmount as string);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Withdrawal amount must be greater than zero.');
      return;
    }

    const res = withdrawBrokerCash({
      brokerAccountId: targetBoId,
      destinationBankAccountId: targetBankId,
      amount: amt,
      note: withdrawNote.trim() || undefined,
    });

    if (!res.success) {
      setWithdrawError(res.error || 'Failed to withdraw cash.');
      return;
    }

    showToast(`৳${amt.toLocaleString()} successfully transferred to bank account!`);
    setIsWithdrawModalOpen(false);
    setWithdrawNote('');
  };

  const handleAddBroker = (e: React.FormEvent) => {
    e.preventDefault();
    setBrokerError('');
    if (!newBrokerName.trim()) {
      setBrokerError('Brokerage name is required.');
      return;
    }
    createBroker({
      name: newBrokerName.trim(),
      licenseNumber: newBrokerLicense.trim() || undefined,
      contactNumber: newBrokerPhone.trim() || undefined,
    });
    setNewBrokerName('');
    setNewBrokerLicense('');
    setNewBrokerPhone('');
    setIsAddBrokerModalOpen(false);
  };

  const handleAddBoAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setBoError('');
    if (!newBoName.trim()) {
      setBoError('Please enter Account Label.');
      return;
    }

    const boId = newBoNumber.trim() || `BO-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const created = createBrokerAccount({
      brokerId: newBoBrokerId || (brokers[0]?.id ?? 'broker-default'),
      boId,
      accountName: newBoName.trim(),
      isDefault: newBoIsDefault || brokerAccounts.length === 0,
    });

    setDepositBoAccountId(created.id);
    setWithdrawBoAccountId(created.id);
    setNewBoNumber('');
    setNewBoName('');
    setNewBoIsDefault(false);
    setIsAddBoModalOpen(false);
  };

  const getTypeBadge = (type: BrokerCashTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent-strong border border-accent/20">
            Deposit
          </span>
        );
      case 'withdrawal':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Withdrawal
          </span>
        );
      case 'buy_gross':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Trade Buy Gross
          </span>
        );
      case 'sell_gross':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent-strong border border-accent/20">
            Trade Sell Gross
          </span>
        );
      case 'commission':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-warning/10 text-warning border border-warning/20">
            Commission
          </span>
        );
      case 'tax':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-negative/10 text-negative border border-negative/20">
            AIT Tax (0.05%)
          </span>
        );
      case 'other_charge':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
            CDBL / Fee
          </span>
        );
      case 'dividend':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20">
            Dividend Inflow
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-raised text-ink-muted">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              Brokerage & Trading Accounts
            </h1>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Manage your Beneficiary Owner (BO) accounts, cash deposits, withdrawals, and trade execution balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setIsDepositModalOpen(true)}
            variant="primary"
            icon={ArrowDownLeft}
          >
            Deposit Cash
          </Button>
          <Button
            onClick={() => setIsWithdrawModalOpen(true)}
            variant="outline"
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-sky-400" />
            <span>Withdraw to Bank</span>
          </Button>
          <Button
            onClick={() => setIsAddBoModalOpen(true)}
            variant="outline"
            icon={Plus}
          >
            New BO Account
          </Button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && <ErrorBanner variant="success" message={toastMessage} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Broker Cash Balance"
          value={`৳${totalCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          variant="sky"
          subtitle={
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-accent-strong" />
              <span>Sum of all verified BO sub-ledgers</span>
            </span>
          }
        />

        <StatCard
          title="Active Beneficiary Owner (BO) Accounts"
          value={`${brokerAccounts.length} Account${brokerAccounts.length === 1 ? '' : 's'}`}
          subtitle="Registered under CDBL Depository"
        />

        <StatCard
          title="Registered TREC Brokerage Houses"
          value={`${brokers.length} Broker${brokers.length === 1 ? '' : 's'}`}
          subtitle={
            <span className="flex items-center justify-between gap-2">
              <span>DSE TREC Licensees</span>
              <button
                onClick={() => setIsAddBrokerModalOpen(true)}
                className="text-xs text-accent-strong hover:text-accent-strong font-medium"
              >
                + Add Firm
              </button>
            </span>
          }
        />
      </div>

      {/* BO Accounts Card Grid */}
      <div className="bg-surface/40 border border-edge rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
            BO Accounts (Beneficiary Owner Accounts)
          </div>
          <button
            onClick={() => setIsAddBoModalOpen(true)}
            className="text-xs text-accent-strong hover:text-accent-strong font-medium flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add BO Account</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {brokerAccounts.map((bo) => {
            const broker = brokers.find((b) => b.id === bo.brokerId);
            const balanceObj = brokerCashBalances.find((b) => b.brokerAccountId === bo.id);
            const cash = balanceObj ? balanceObj.cashBalance : 0;

            return (
              <div
                key={bo.id}
                className="bg-canvas border border-edge rounded-xl p-3.5 hover:border-edge-strong transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-ink text-xs flex items-center gap-1.5">
                      <span>{bo.accountName}</span>
                      {bo.isDefault && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-accent/10 text-accent-strong border border-accent/20 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">{broker?.name || 'Brokerage Firm'}</div>
                    <div className="text-[10px] font-mono text-ink-faint mt-0.5">
                      BO ID: <span className="text-ink-soft">{bo.boId}</span>
                    </div>
                  </div>
                  <div className="p-2 bg-surface rounded-lg text-ink-muted">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-edge-soft flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-ink-faint">Available Cash</div>
                    <div className="text-sm font-mono font-bold text-sky-400">
                      ৳{cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setDepositBoAccountId(bo.id);
                        setIsDepositModalOpen(true);
                      }}
                      className="px-2 py-1 bg-surface hover:bg-raised text-ink-soft rounded text-[10px] font-medium transition-colors"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => {
                        setWithdrawBoAccountId(bo.id);
                        setIsWithdrawModalOpen(true);
                      }}
                      className="px-2 py-1 bg-surface hover:bg-raised text-ink-soft rounded text-[10px] font-medium transition-colors"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cash Sub-Ledger Section (Authoritative Audit Log) */}
      <div className="bg-surface/60 border border-edge rounded-xl overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-4 border-b border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-2">
              <Receipt className="h-4 w-4 text-sky-400" />
              <span>Broker Cash Ledger (broker_cash_transactions)</span>
            </div>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Authoritative transaction entries for cash deposits, withdrawals, trade gross values, commissions, and AIT tax.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedBoId}
              onChange={(e) => setSelectedBoId(e.target.value)}
              className="bg-canvas border border-edge rounded-lg px-2.5 py-1.5 text-xs text-ink-soft focus:outline-none focus:border-sky-500"
            >
              <option value="all">All BO Accounts</option>
              {brokerAccounts.map((bo) => (
                <option key={bo.id} value={bo.id}>
                  {bo.accountName}
                </option>
              ))}
            </select>

            <select
              value={selectedTxType}
              onChange={(e) => setSelectedTxType(e.target.value)}
              className="bg-canvas border border-edge rounded-lg px-2.5 py-1.5 text-xs text-ink-soft focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Event Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="buy_gross">Trade Buy Gross</option>
              <option value="sell_gross">Trade Sell Gross</option>
              <option value="commission">Commission</option>
              <option value="tax">AIT Tax</option>
              <option value="other_charge">Other Fees</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        {filteredTxs.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-7 w-7 text-ink-faint mx-auto mb-2" />
            <div className="text-xs font-semibold text-ink-soft">No broker cash transactions recorded</div>
            <p className="text-[11px] text-ink-faint mt-0.5">
              Deposit cash from a bank account to fund your brokerage operations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas/60 text-ink-muted border-b border-edge text-[11px] font-mono uppercase">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">BO Account</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Memo / Trade Reference</th>
                  <th className="py-3 px-4 text-right">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60 text-ink-soft">
                {filteredTxs.map((tx) => {
                  const boAcc = brokerAccounts.find((b) => b.id === tx.brokerAccountId);
                  const isPositive = tx.amountSigned >= 0;

                  return (
                    <tr key={tx.id} className="hover:bg-raised/40 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                        {tx.transactionDate}
                      </td>

                      {/* BO Account */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-ink-soft font-medium">{boAcc?.accountName || 'BO Account'}</span>
                        <div className="text-[10px] text-ink-faint">BO: {boAcc?.boId}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">{getTypeBadge(tx.type)}</td>

                      {/* Note / Memo */}
                      <td className="py-3 px-4 text-ink-soft">
                        <div>{tx.note || 'Brokerage ledger entry'}</div>
                        {tx.linkedStockTransactionId && (
                          <div className="text-[10px] font-mono text-ink-faint">
                            Ref Trade: {tx.linkedStockTransactionId}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">
                        <span className={isPositive ? 'text-accent-strong' : 'text-negative'}>
                          {isPositive ? '+' : ''}৳
                          {tx.amountSigned.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Deposit Broker Cash */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title={
          <span className="flex items-center gap-1.5">
            <ArrowDownLeft className="h-4 w-4 text-accent-strong" />
            <span>Deposit Cash to BO Account</span>
          </span>
        }
        description="Transfer funds from your bank/cash account into your brokerage ledger"
        maxWidth="md"
      >
        {depositError && <ErrorBanner message={depositError} className="mb-4" />}

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-ink-soft">
                    Destination BO Account *
                  </label>
                  {brokerAccounts.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDepositModalOpen(false);
                        setIsAddBoModalOpen(true);
                      }}
                      className="text-[11px] text-accent-strong hover:underline"
                    >
                      + Create BO Account
                    </button>
                  )}
                </div>
                <Select
                  value={depositBoAccountId || (brokerAccounts[0]?.id ?? '')}
                  onChange={(e) => setDepositBoAccountId(e.target.value)}
                  required
                >
                  {brokerAccounts.length === 0 ? (
                    <option value="">No BO Accounts Found (Create One First)</option>
                  ) : (
                    brokerAccounts.map((bo) => (
                      <option key={bo.id} value={bo.id}>
                        {bo.accountName} {bo.boId ? `(BO: ${bo.boId})` : ''}
                      </option>
                    ))
                  )}
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-ink-soft">
                    Funding Source (Bank Account or Direct Cash) *
                  </label>
                  {depositBankAccountId !== 'direct_deposit' && (
                    <span className="text-[11px] font-mono text-accent-strong">
                      Balance: ৳{getAccountBalance(depositBankAccountId).toLocaleString()}
                    </span>
                  )}
                </div>
                <Select
                  value={depositBankAccountId}
                  onChange={(e) => setDepositBankAccountId(e.target.value)}
                  required
                  className="font-mono"
                >
                  <option value="direct_deposit">Direct Cash / Counter Deposit / External (Fresh Capital)</option>
                  {liquidAccounts.map((acc) => {
                    const bal = getAccountBalance(acc.id);
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountType}) — ৳{bal.toLocaleString()}
                      </option>
                    );
                  })}
                </Select>
                <p className="text-[11px] text-ink-faint mt-1">
                  Direct Cash directly increases your total wealth &amp; BO ledger. Bank transfer moves funds from your bank.
                </p>

              </div>

              <Field label="Deposit Amount (BDT)" required>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  required
                  icon={TakaIcon}
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                />
              </Field>

              {/* UX-7: funding-source balance context (UX-2 pattern) — replaces the old 3-block guidance banner */}
              {(() => {
                const amt = typeof depositAmount === 'number' ? depositAmount : 0;
                const isBank = depositBankAccountId !== 'direct_deposit' && depositBankAccountId !== 'external_cash';
                const srcAcc = isBank ? accounts.find((a) => a.id === depositBankAccountId) : undefined;
                const bankBal = isBank ? getAccountBalance(depositBankAccountId) : 0;
                const bankAfter = bankBal - amt;
                const targetBo = depositBoAccountId || brokerAccounts[0]?.id;
                const boBal = brokerCashBalances.find((b) => b.brokerAccountId === targetBo)?.cashBalance || 0;
                const boAfter = boBal + amt;
                const short = isBank && amt > 0 && bankAfter < 0;
                return (
                  <div
                    className={`rounded-lg border p-2.5 space-y-1 text-xs font-mono ${
                      short ? 'bg-rose-950/40 border-negative/50' : 'bg-canvas border-edge'
                    }`}
                    title={
                      short
                        ? `"${srcAcc?.name || 'Bank'}" — আগে ব্যাংক অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন, অথবা উপরের ড্রপডাউনে 'Direct Cash (Fresh Capital)' নির্বাচন করুন। / Deposit into the bank account first, or select 'Direct Cash (Fresh Capital)' above.`
                        : undefined
                    }
                  >
                    {isBank ? (
                      <div className="flex items-center justify-between">
                        <span className={short ? 'text-negative' : 'text-ink-soft'}>
                          ব্যাংকে আছে: ৳{bankBal.toLocaleString()}
                        </span>
                        <span className={short ? 'text-negative font-bold' : 'text-ink font-bold'}>
                          ডিপোজিটের পর: ৳{bankAfter.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-ink-muted">Direct Cash / External — Fresh Capital</div>
                    )}
                    <div className="flex items-center justify-between text-ink-soft">
                      <span>BO ক্যাশ এখন: ৳{boBal.toLocaleString()}</span>
                      <span className="text-ink font-bold">জমার পর: ৳{boAfter.toLocaleString()}</span>
                    </div>
                    {short && (
                      <div className="flex items-center gap-1.5 text-negative font-sans">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          অপর্যাপ্ত ব্যালেন্স — আগে ব্যাংকে টাকা জমা করুন, অথবা 'Direct Cash (Fresh Capital)' নির্বাচন করুন (Insufficient funds)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <Field label="Notes / Reference">
                <Input
                  type="text"
                  placeholder="e.g. BEFTN Bank Transfer to BRAC EPL"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDepositModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Confirm Deposit
                </Button>
              </div>
            </form>
      </Modal>

      {/* Modal: Withdraw Broker Cash */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title={
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4 text-sky-400" />
            <span>Withdraw Cash to Bank</span>
          </span>
        }
        description="Transfer uninvested broker cash back into your personal bank account"
        maxWidth="md"
      >
        {withdrawError && <ErrorBanner message={withdrawError} className="mb-4" />}

        <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
          <Field label="Source BO Account" required>
            <Select
              value={withdrawBoAccountId || (brokerAccounts[0]?.id ?? '')}
              onChange={(e) => setWithdrawBoAccountId(e.target.value)}
            >
              {brokerAccounts.map((bo) => {
                const bal = brokerCashBalances.find((b) => b.brokerAccountId === bo.id);
                return (
                  <option key={bo.id} value={bo.id}>
                    {bo.accountName} (Avail: ৳{(bal?.cashBalance || 0).toLocaleString()})
                  </option>
                );
              })}
            </Select>
          </Field>

          <Field label="Destination Bank Account" required>
            <Select
              value={withdrawBankAccountId}
              onChange={(e) => setWithdrawBankAccountId(e.target.value)}
              required
            >
              <option value="">Select receiving bank account...</option>
              {liquidAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountType})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Withdrawal Amount (BDT)" required>
            <Input
              type="number"
              step="any"
              min="1"
              required
              icon={TakaIcon}
              value={withdrawAmount}
              onChange={(e) =>
                setWithdrawAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
              }
            />
          </Field>

          {/* UX-2: post-withdrawal balance preview */}
          {(() => {
            const wdBal =
              brokerCashBalances.find((b) => b.brokerAccountId === withdrawBoAccountId)?.cashBalance || 0;
            const amt = typeof withdrawAmount === 'number' ? withdrawAmount : 0;
            const after = wdBal - amt;
            const short = amt > 0 && after < 0;
            return (
              <div
                className={`rounded-lg border p-2.5 flex items-center justify-between text-xs font-mono ${
                  short ? 'bg-rose-950/40 border-negative/50 text-negative' : 'bg-canvas border-edge text-ink-soft'
                }`}
              >
                <span>ক্যাশ আছে: ৳{wdBal.toLocaleString()}</span>
                <span className={short ? 'text-negative font-bold' : after === wdBal ? 'text-ink-faint' : 'text-ink font-bold'}>
                  উত্তোলনের পর: ৳{after.toLocaleString()}
                </span>
              </div>
            );
          })()}

          <Field label="Notes / Reference">
            <Input
              type="text"
              placeholder="e.g. Broker payout check to City Bank"
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsWithdrawModalOpen(false)}
            >
              Cancel
            </Button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Confirm Withdrawal
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Brokerage Firm */}
      <Modal
        isOpen={isAddBrokerModalOpen}
        onClose={() => setIsAddBrokerModalOpen(false)}
        title="Add Brokerage House (TREC)"
        description="Register a DSE/CSE licensed brokerage intermediary"
        maxWidth="md"
      >
        {brokerError && <ErrorBanner message={brokerError} className="mb-4" />}

        <form onSubmit={handleAddBroker} className="space-y-3.5">
          <Field label="Brokerage Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. City Bank Capital Resources"
              value={newBrokerName}
              onChange={(e) => setNewBrokerName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="TREC / License No.">
              <Input
                type="text"
                placeholder="e.g. DSE-TREC-225"
                value={newBrokerLicense}
                onChange={(e) => setNewBrokerLicense(e.target.value)}
              />
            </Field>
            <Field label="Contact / Support">
              <Input
                type="text"
                placeholder="e.g. +8802-9565555"
                value={newBrokerPhone}
                onChange={(e) => setNewBrokerPhone(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddBrokerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Broker
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add BO Account */}
      <Modal
        isOpen={isAddBoModalOpen}
        onClose={() => setIsAddBoModalOpen(false)}
        title="Create BO Account (CDBL)"
        description="Add a 16-digit Beneficiary Owner account under CDBL"
        maxWidth="md"
      >
        {boError && <ErrorBanner message={boError} className="mb-4" />}

        <form onSubmit={handleAddBoAccount} className="space-y-3.5">
          <Field label="Brokerage House" required>
            <Select value={newBoBrokerId} onChange={(e) => setNewBoBrokerId(e.target.value)}>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.licenseNumber || 'TREC'})
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={
              <>
                BO Account ID (16 Digits) <span className="text-ink-faint font-normal">(Optional)</span>
              </>
            }
          >
            <Input
              type="text"
              placeholder="e.g. 1203000098765432 (Leave blank to auto-generate)"
              value={newBoNumber}
              onChange={(e) => setNewBoNumber(e.target.value)}
            />
          </Field>

          <Field label="Account Display Label" required>
            <Input
              type="text"
              required
              placeholder="e.g. Secondary Trading Account (IPO/Growth)"
              value={newBoName}
              onChange={(e) => setNewBoName(e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="boDefault"
              checked={newBoIsDefault}
              onChange={(e) => setNewBoIsDefault(e.target.checked)}
              className="rounded border-edge-strong bg-canvas text-accent focus:ring-accent"
            />
            <label htmlFor="boDefault" className="text-xs text-ink-soft">
              Set as primary/default BO account for trades
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddBoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save BO Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
