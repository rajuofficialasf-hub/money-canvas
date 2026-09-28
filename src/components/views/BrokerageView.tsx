import React, { useState, useEffect } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { BrokerAccount, BrokerCashTransaction, Broker } from '../../types/accounting';
import {
  Building2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  TrendingDown,
  TrendingUp,
  Receipt,
  Search,
} from 'lucide-react';

interface BrokerageViewProps {
  onNavigateToTrades?: () => void;
}

export const BrokerageView: React.FC<BrokerageViewProps> = ({ onNavigateToTrades }) => {
  const {
    brokers,
    brokerAccounts,
    brokerCashTransactions,
    brokerCashBalances,
    accounts,
    accountBalances,
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
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Trade Sell Gross
          </span>
        );
      case 'commission':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Commission
          </span>
        );
      case 'tax':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
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
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Brokerage & Trading Accounts
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your Beneficiary Owner (BO) accounts, cash deposits, withdrawals, and trade execution balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-950 transition-colors"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>Deposit Cash</span>
          </button>
          <button
            onClick={() => setIsWithdrawModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-sky-400" />
            <span>Withdraw to Bank</span>
          </button>
          <button
            onClick={() => setIsAddBoModalOpen(true)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            <span>New BO Account</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Broker Cash Balance */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Total Broker Cash Balance
          </div>
          <div className="text-2xl font-bold text-sky-400 mt-1">
            ৳{totalCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>Sum of all verified BO sub-ledgers</span>
          </div>
        </div>

        {/* Total BO Accounts */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Active Beneficiary Owner (BO) Accounts
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {brokerAccounts.length} Account{brokerAccounts.length === 1 ? '' : 's'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Registered under CDBL Depository
          </div>
        </div>

        {/* Registered Brokerages */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Registered TREC Brokerage Houses
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {brokers.length} Broker{brokers.length === 1 ? '' : 's'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>DSE TREC Licensees</span>
            <button
              onClick={() => setIsAddBrokerModalOpen(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              + Add Firm
            </button>
          </div>
        </div>
      </div>

      {/* BO Accounts Card Grid */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            BO Accounts (Beneficiary Owner Accounts)
          </div>
          <button
            onClick={() => setIsAddBoModalOpen(true)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
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
                className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{bo.accountName}</span>
                      {bo.isDefault && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{broker?.name || 'Brokerage Firm'}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      BO ID: <span className="text-slate-300">{bo.boId}</span>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-500">Available Cash</div>
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
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-medium transition-colors"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => {
                        setWithdrawBoAccountId(bo.id);
                        setIsWithdrawModalOpen(true);
                      }}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-medium transition-colors"
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
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Receipt className="h-4 w-4 text-sky-400" />
              <span>Broker Cash Ledger (broker_cash_transactions)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authoritative transaction entries for cash deposits, withdrawals, trade gross values, commissions, and AIT tax.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedBoId}
              onChange={(e) => setSelectedBoId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
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
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
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
            <AlertCircle className="h-7 w-7 text-slate-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-300">No broker cash transactions recorded</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Deposit cash from a bank account to fund your brokerage operations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] font-mono uppercase">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">BO Account</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Memo / Trade Reference</th>
                  <th className="py-3 px-4 text-right">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredTxs.map((tx) => {
                  const boAcc = brokerAccounts.find((b) => b.id === tx.brokerAccountId);
                  const isPositive = tx.amountSigned >= 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {tx.transactionDate}
                      </td>

                      {/* BO Account */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-slate-200 font-medium">{boAcc?.accountName || 'BO Account'}</span>
                        <div className="text-[10px] text-slate-500">BO: {boAcc?.boId}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">{getTypeBadge(tx.type)}</td>

                      {/* Note / Memo */}
                      <td className="py-3 px-4 text-slate-300">
                        <div>{tx.note || 'Brokerage ledger entry'}</div>
                        {tx.linkedStockTransactionId && (
                          <div className="text-[10px] font-mono text-slate-500">
                            Ref Trade: {tx.linkedStockTransactionId}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">
                        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
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
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                  <span>Deposit Cash to BO Account</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Transfer funds from your bank/cash account into your brokerage ledger
                </p>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {depositError && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {depositError}
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Destination BO Account *
                  </label>
                  {brokerAccounts.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDepositModalOpen(false);
                        setIsAddBoModalOpen(true);
                      }}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      + Create BO Account
                    </button>
                  )}
                </div>
                <select
                  value={depositBoAccountId || (brokerAccounts[0]?.id ?? '')}
                  onChange={(e) => setDepositBoAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
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
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Funding Source (Bank Account or Direct Cash) *
                  </label>
                  {depositBankAccountId !== 'direct_deposit' && (
                    <span className="text-[11px] font-mono text-emerald-400">
                      Balance: ৳{getAccountBalance(depositBankAccountId).toLocaleString()}
                    </span>
                  )}
                </div>
                <select
                  value={depositBankAccountId}
                  onChange={(e) => setDepositBankAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
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
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Direct Cash directly increases your total wealth &amp; BO ledger. Bank transfer moves funds from your bank.
                </p>

                {/* Insufficient Funds Guidance Banner */}
                {(() => {
                  const isBankSelected = depositBankAccountId !== 'direct_deposit' && depositBankAccountId !== 'external_cash';
                  const selectedBankAcc = accounts.find((a) => a.id === depositBankAccountId);
                  const selectedBankBal = selectedBankAcc ? getAccountBalance(selectedBankAcc.id) : 0;
                  const parsedDepAmt = typeof depositAmount === 'number' ? depositAmount : parseFloat(depositAmount as string) || 0;
                  const isBankInsufficient = isBankSelected && parsedDepAmt > selectedBankBal;

                  if (!isBankInsufficient) return null;

                  return (
                    <div className="mt-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই (Insufficient Funds)</span>
                      </div>
                      <div className="text-[11px] text-slate-300 leading-relaxed">
                        "{selectedBankAcc?.name}" অ্যাকাউন্টে বর্তমান ব্যালেন্স: <span className="font-bold font-mono text-amber-400">৳{selectedBankBal.toLocaleString()}</span>, কিন্তু আপনি <span className="font-bold font-mono text-white">৳{parsedDepAmt.toLocaleString()}</span> ট্রান্সফার করতে চেয়েছেন।
                      </div>
                      <div className="text-[11px] text-emerald-300 font-medium bg-emerald-950/40 border border-emerald-800/40 p-2 rounded-lg">
                        💡 <span className="font-bold">করণীয়:</span> বিও অ্যাকাউন্টে টাকা পাঠানোর পূর্বে অনুগ্রহ করে প্রথমে আপনার ব্যাংক অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। অথবা নগদ অর্থ জমা দেওয়ার জন্য উপরের ড্রপডাউনে <span className="underline font-bold text-emerald-200">'Direct Cash (Fresh Capital)'</span> নির্বাচন করুন।
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deposit Amount (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                    ৳
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={depositAmount}
                    onChange={(e) =>
                      setDepositAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. BEFTN Bank Transfer to BRAC EPL"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Withdraw Broker Cash */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ArrowUpRight className="h-4 w-4 text-sky-400" />
                  <span>Withdraw Cash to Bank</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Transfer uninvested broker cash back into your personal bank account
                </p>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {withdrawError && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {withdrawError}
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Source BO Account *
                </label>
                <select
                  value={withdrawBoAccountId || (brokerAccounts[0]?.id ?? '')}
                  onChange={(e) => setWithdrawBoAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {brokerAccounts.map((bo) => {
                    const bal = brokerCashBalances.find((b) => b.brokerAccountId === bo.id);
                    return (
                      <option key={bo.id} value={bo.id}>
                        {bo.accountName} (Avail: ৳{(bal?.cashBalance || 0).toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Destination Bank Account *
                </label>
                <select
                  value={withdrawBankAccountId}
                  onChange={(e) => setWithdrawBankAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select receiving bank account...</option>
                  {liquidAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Withdrawal Amount (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                    ৳
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={withdrawAmount}
                    onChange={(e) =>
                      setWithdrawAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Broker payout check to City Bank"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Brokerage Firm */}
      {isAddBrokerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Add Brokerage House (TREC)</h3>
                <p className="text-xs text-slate-400">Register a DSE/CSE licensed brokerage intermediary</p>
              </div>
              <button
                onClick={() => setIsAddBrokerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {brokerError && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {brokerError}
              </div>
            )}

            <form onSubmit={handleAddBroker} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Brokerage Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Bank Capital Resources"
                  value={newBrokerName}
                  onChange={(e) => setNewBrokerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    TREC / License No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DSE-TREC-225"
                    value={newBrokerLicense}
                    onChange={(e) => setNewBrokerLicense(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Contact / Support
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +8802-9565555"
                    value={newBrokerPhone}
                    onChange={(e) => setNewBrokerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddBrokerModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Save Broker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add BO Account */}
      {isAddBoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Create BO Account (CDBL)</h3>
                <p className="text-xs text-slate-400">Add a 16-digit Beneficiary Owner account under CDBL</p>
              </div>
              <button
                onClick={() => setIsAddBoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {boError && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {boError}
              </div>
            )}

            <form onSubmit={handleAddBoAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Brokerage House *
                </label>
                <select
                  value={newBoBrokerId}
                  onChange={(e) => setNewBoBrokerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.licenseNumber || 'TREC'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  BO Account ID (16 Digits) <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1203000098765432 (Leave blank to auto-generate)"
                  value={newBoNumber}
                  onChange={(e) => setNewBoNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Account Display Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Secondary Trading Account (IPO/Growth)"
                  value={newBoName}
                  onChange={(e) => setNewBoName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="boDefault"
                  checked={newBoIsDefault}
                  onChange={(e) => setNewBoIsDefault(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="boDefault" className="text-xs text-slate-300">
                  Set as primary/default BO account for trades
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddBoModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Save BO Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
