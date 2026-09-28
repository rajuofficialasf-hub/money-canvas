import React from 'react';
import { useAuth } from '../../lib/auth-context';
import { useLedger } from '../../lib/ledger-context';
import { useLanguage } from '../../lib/language-context';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Plus,
  Building2,
  Landmark,
  Users,
  FileSpreadsheet,
  Home,
  Coins,
  Bell,
  Scale,
  ShieldCheck,
  CalendarClock,
  PieChart,
  Repeat,
  Target,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();
  const { language, isBn, t } = useLanguage();
  const {
    accounts,
    accountBalances,
    transactions,
    transactionLines,
    budgets,
    recurringTransactions,
    financialGoals,
    dpsAccounts,
    debts,
    loans,
    physicalAssets,
    stockHoldings,
    brokerCashBalances,
    stockTransactions,
    getCategorySpent,
    systemAlerts,
  } = useLedger();

  // Invariant-derived state from ledger
  const activeBalances = accountBalances.filter((b) => {
    const acc = accounts.find((a) => a.id === b.accountId);
    return acc && !acc.isArchived;
  });

  const liquidAssetBalances = activeBalances
    .filter((b) => b.currentBalance > 0)
    .reduce((sum, b) => sum + b.currentBalance, 0);

  const liabilityBalances = activeBalances
    .filter((b) => b.currentBalance < 0)
    .reduce((sum, b) => sum + b.currentBalance, 0);

  const totalStockMarketValue = stockHoldings.reduce(
    (sum, h) => sum + (h.marketValue ?? h.currentMarketValue),
    0
  );
  const totalStockCostBasis = stockHoldings.reduce(
    (sum, h) => sum + (h.totalCostBasis ?? h.investedValue),
    0
  );
  const totalBrokerCash = brokerCashBalances.reduce((sum, b) => sum + b.cashBalance, 0);
  const totalUnrealizedPL = totalStockMarketValue - totalStockCostBasis;
  const totalUnrealizedPLPct =
    totalStockCostBasis > 0 ? (totalUnrealizedPL / totalStockCostBasis) * 100 : 0;

  const netWorth = liquidAssetBalances + liabilityBalances + totalBrokerCash + totalStockMarketValue;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyBudgets = budgets.filter((b) => b.monthYear === currentMonth);
  const totalBudgeted = monthlyBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalSpent = monthlyBudgets.reduce((sum, b) => sum + getCategorySpent(b.categoryId, currentMonth), 0);
  const activeDpsCount = dpsAccounts.filter((d) => d.status === 'active').length;

  const isFreshAccount = accounts.length === 0 && transactions.length === 0 && stockHoldings.length === 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Top Welcome Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MONEY CANVAS OS ACTIVE</span>
            <span>·</span>
            <span>BASE CURRENCY: {user.baseCurrency || 'BDT'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {user.fullName}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            {user.bio || 'Comprehensive wealth, investment portfolio, banking, and double-entry accounting overview.'}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <button
            onClick={() => onNavigate('ledger')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{isBn ? 'নতুন লেনদেন' : 'New Transaction'}</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="border border-slate-800 bg-slate-900/60 px-3 py-1.5 rounded-lg hover:text-white transition-colors"
          >
            {isBn ? 'সেটিংস' : 'Settings'}
          </button>
        </div>
      </div>

      {/* Financial Reminders & Alerts Callout */}
      {systemAlerts.length > 0 && (
        <div
          onClick={() => onNavigate('notifications')}
          className="rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30 p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="text-white font-bold flex items-center gap-2">
                <span>{systemAlerts.length} Active Financial Reminders</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {systemAlerts.filter((a) => a.severity === 'critical').length} Critical / Overdue
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5 line-clamp-1">
                {systemAlerts[0]?.title}: {systemAlerts[0]?.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-semibold self-end sm:self-center shrink-0">
            <span>Review Reminders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      )}

      {/* Fresh Account Getting Started Banner */}
      {isFreshAccount && (
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-950 p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
            <Scale className="h-4 w-4" />
            <span>WELCOME TO YOUR FRESH WEATHFOLIO ENVIRONMENT</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Ready to build your financial balance sheet
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Weathfolio is initialized completely clean with zero demo data. You can start by setting up your real accounts (Cash, Bank, Mobile Wallets), recording initial opening balances or journal entries, and tracking your stock portfolio.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onNavigate('accounts')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold font-mono transition-colors shadow-sm"
            >
              <Building2 className="h-4 w-4" />
              <span>Create First Account</span>
            </button>
            <button
              onClick={() => onNavigate('ledger')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs font-medium hover:border-slate-600 transition-colors"
            >
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span>Record Journal Entry</span>
            </button>
            <button
              onClick={() => onNavigate('stocks')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs font-medium hover:border-slate-600 transition-colors"
            >
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Add Stock Position</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Core Financial KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Net Worth */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Total Net Worth</span>
            <Scale className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            ৳{netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Assets + Liquid Cash + Stocks - Debts
          </div>
        </div>

        {/* Metric 2: Liquid Bank & Cash */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Liquid Cash & Bank</span>
            <Wallet className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            ৳{liquidAssetBalances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {activeBalances.filter((b) => b.currentBalance > 0).length} active liquid accounts
          </div>
        </div>

        {/* Metric 3: Total Outstanding Debt / Liabilities */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Debt & Liabilities</span>
            <CreditCard className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
            {liabilityBalances === 0
              ? '৳0.00'
              : `-৳${Math.abs(liabilityBalances).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {loans.length} active loans & credit balances
          </div>
        </div>

        {/* Metric 4: Investment Portfolio */}
        <div
          onClick={() => onNavigate('stocks')}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3 cursor-pointer hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Stock & Broker Cash</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            ৳{(totalBrokerCash + totalStockMarketValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Stocks: ৳{totalStockMarketValue.toLocaleString()}</span>
            <span className={totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {totalUnrealizedPL >= 0 ? '+' : ''}{totalUnrealizedPLPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Planning, Budgets & Sub-Ledgers Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
            Planning, Budgets & Savings
          </h3>
          <span className="text-xs text-slate-400 font-mono">Overview</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Budget Widget */}
          <div
            onClick={() => onNavigate('budgets')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Monthly Budget</span>
              <PieChart className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-white">
              ৳{totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ৳{totalBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${Math.min(100, totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500">
              {monthlyBudgets.length} Category ceilings configured →
            </div>
          </div>

          {/* Recurring Widget */}
          <div
            onClick={() => onNavigate('recurring')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Recurring Schedules</span>
              <Repeat className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {recurringTransactions.filter((r) => !r.isPaused).length} Active Schedules
            </div>
            <div className="text-[11px] text-slate-500 pt-2">
              Next run:{' '}
              <strong className="text-emerald-400">
                {recurringTransactions.filter((r) => !r.isPaused).sort((a, b) => a.nextRun.localeCompare(b.nextRun))[0]?.nextRun || 'None scheduled'}
              </strong>{' '}
              →
            </div>
          </div>

          {/* Goals Widget */}
          <div
            onClick={() => onNavigate('goals')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Financial Goals</span>
              <Target className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {financialGoals.length} Configured Goals
            </div>
            <div className="text-[11px] text-slate-500 pt-2">
              Track savings targets & milestones →
            </div>
          </div>

          {/* DPS Widget */}
          <div
            onClick={() => onNavigate('dps')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>DPS Sub-Ledger</span>
              <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {activeDpsCount} Active Accounts
            </div>
            <div className="text-[11px] text-slate-500 pt-2">
              Installment schedules & maturity →
            </div>
          </div>
        </div>
      </div>

      {/* Credit, Assets & Wealth Overview Widgets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <span>Credit Facilities, Physical Assets & Zakat</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {debts.length} Debts · {loans.length} Loans · {physicalAssets.length} Assets
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Peer Debts Widget */}
          <div
            onClick={() => onNavigate('debts')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Peer Lending & Debts</span>
              <Users className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {debts.filter((d) => d.status === 'active').length} Active Records
            </div>
            <div className="text-[11px] text-slate-500 pt-2">
              Receivables & Payables tracking →
            </div>
          </div>

          {/* Bank Loans Widget */}
          <div
            onClick={() => onNavigate('loans')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Bank Facilities</span>
              <FileSpreadsheet className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {loans.filter((l) => l.status === 'active').length} Active Loans
            </div>
            <div className="text-[11px] text-slate-500 pt-2">
              Amortization schedules & EMI →
            </div>
          </div>

          {/* Physical Assets Widget */}
          <div
            onClick={() => onNavigate('assets')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Physical Assets</span>
              <Home className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {physicalAssets.length} Registered Assets
            </div>
            <div className="text-[11px] text-slate-500 pt-2">
              Real estate, vehicles, gold & items →
            </div>
          </div>

          {/* Zakat Assessment Widget */}
          <div
            onClick={() => onNavigate('zakat')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Zakat & Net Worth</span>
              <Coins className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              2.500% Shariah
            </div>
            <div className="text-[11px] text-slate-500 pt-2">
              Nisab assessment & zakat ledger →
            </div>
          </div>
        </div>
      </div>

      {/* Capital Markets & Stock Portfolio */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <span>Capital Markets & Stock Portfolio</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">
              {stockHoldings.length} Holdings · {stockTransactions.length} Trades
            </span>
            <button
              onClick={() => onNavigate('stocks')}
              className="text-xs text-emerald-400 hover:underline font-mono flex items-center gap-1"
            >
              <span>View Portfolio</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 4 Capital Markets Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Portfolio Valuation */}
          <div
            onClick={() => onNavigate('stocks')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Equity Valuation</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              ৳{totalStockMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[11px] font-mono flex items-center gap-1 ${totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{totalUnrealizedPL >= 0 ? '+' : ''}৳{totalUnrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span>({totalUnrealizedPL >= 0 ? '+' : ''}{totalUnrealizedPLPct.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Broker Cash Reserves */}
          <div
            onClick={() => onNavigate('brokerage')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Available Broker Cash</span>
              <Building2 className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-sky-400 font-mono">
              ৳{totalBrokerCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Brokerage cash accounts →
            </div>
          </div>

          {/* Active Positions */}
          <div
            onClick={() => onNavigate('stocks')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active Securities</span>
              <Coins className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {stockHoldings.length} Securities Held
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Cost basis: ৳{totalStockCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })} →
            </div>
          </div>

          {/* Trade Execution Gateway */}
          <div
            onClick={() => onNavigate('trades')}
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Trade Execution</span>
              <Scale className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {stockTransactions.length} Trades Executed
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Execute Buy / Sell order →
            </div>
          </div>
        </div>
      </div>

      {/* Bangladesh Income Tax & NBR IT-10B Quick Callout */}
      <div
        onClick={() => onNavigate('tax')}
        className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-5 cursor-pointer hover:border-emerald-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-emerald-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isBn ? 'বাংলাদেশ আয়কর ও এনবিআর আইটি-১০বি রিটার্ন প্ল্যানার' : 'BD Income Tax & NBR IT-10B Return Planner'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                NBR 2023 ACT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isBn
                ? 'স্ল্যাবভিত্তিক কর হিসাব, বিনিয়োগ কর রেয়াত (DPS, সঞ্চয়পত্র, ডিএসই শেয়ার) ও এক ক্লিকে সম্পূর্ণ সম্পদ ও দায় বিবরণী (IT-10B) প্রস্তুত করুন।'
                : 'Slab-based income tax calculation, investment tax rebates (DPS, Sanchayapatra, DSE stocks) and 1-click IT-10B wealth statement.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold shrink-0">
          <span>{isBn ? 'রিটার্ন প্ল্যানার খুলুন' : 'Open Tax Planner'}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* Sanchayapatra, Treasury Bonds & Sukuk Quick Callout */}
      <div
        onClick={() => onNavigate('sanchaya_bonds')}
        className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-950 p-5 cursor-pointer hover:border-sky-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-sky-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isBn ? 'সঞ্চয়পত্র, ট্রেজারি বন্ড ও সুকুক ট্র্যাকার' : 'Sanchayapatra, Treasury Bonds & Sukuk Tracker'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold border border-sky-500/30">
                SOVEREIGN YIELD
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isBn
                ? 'পরিবার সঞ্চয়পত্র, ৩-মাস অন্তর মুনাফা, পেনশনার সঞ্চয়পত্র, বাংলাদেশ ব্যাংক ট্রেজারি বন্ড ও ইসলামিক সুকুকের মাসিক/ত্রৈমাসিক ক্যাশফ্লো ও ভাঙ্গানোর হিসাব।'
                : 'Family Savings Certificates, 3-Month Profit, Pensioner, Bangladesh Bank Treasury Bonds & Sukuk cashflow tracker.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold shrink-0">
          <span>{isBn ? 'বন্ড ট্র্যাকার খুলুন' : 'Open Bonds Tracker'}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* BAJUS Gold & FX Rates Quick Callout */}
      <div
        onClick={() => onNavigate('gold_fx')}
        className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-5 cursor-pointer hover:border-amber-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-amber-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isBn ? 'বাজুস গোল্ড রেট ও কারেন্সি এক্সচেঞ্জ (BAJUS & FX)' : 'BAJUS Gold Rates & Foreign Exchange (FX)'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                LIVE 22K ৳1,43,526
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isBn
                ? 'বাজুস ২২ ক্যারেট হলমার্ক স্বর্ণের লাইভ দর, রূপার রেট, গহনা মেকিং চার্জ ও মার্কিন ডলার, রিয়াল, ইউরোর রেমিট্যান্স ক্যাশফ্লো ক্যালকুলেটর।'
                : 'Official BAJUS 22K hallmarked gold & silver rates, jewelry making charges, and USD/SAR/EUR remittance exchange calculator.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold shrink-0">
          <span>{isBn ? 'গোল্ড ও কারেন্সি রেট দেখুন' : 'View Gold & FX Rates'}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* Retirement & FIRE Planner Quick Callout */}
      <div
        onClick={() => onNavigate('fire')}
        className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-950/40 via-slate-900 to-slate-950 p-5 cursor-pointer hover:border-orange-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-orange-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isBn ? 'রিটায়ারমেন্ট ও ফায়ার প্ল্যানার (FIRE & Wealth Projection)' : 'Retirement & FIRE Wealth Projection Planner'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono font-bold border border-orange-500/30">
                EARLY RETIREMENT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isBn
                ? 'আর্থিক স্বাধীনতা অর্জনের ফায়ার নাম্বার, মুদ্রাস্ফীতি ও সেফ উইথড্রয়াল রেট (SWR), এবং মাল্টি-ডিকেড সম্পদ প্রক্ষেপণের পূর্ণাঙ্গ সিমুলেটর।'
                : 'Calculate your exact FIRE corpus, inflation-adjusted wealth trajectory, Safe Withdrawal Rate (SWR), and multi-decade freedom milestone.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold shrink-0">
          <span>{isBn ? 'ফায়ার প্ল্যানার খুলুন' : 'Open FIRE Planner'}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* Two Column Grid: Accounts Overview & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Accounts Distribution */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
              Accounts & Balances
            </h3>
            <button
              onClick={() => onNavigate('accounts')}
              className="text-xs text-emerald-400 hover:underline font-mono flex items-center gap-1"
            >
              <span>Manage Accounts ({accounts.filter((a) => !a.isArchived).length})</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/70 overflow-hidden text-xs font-mono">
            {activeBalances.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Building2 className="h-8 w-8 mx-auto text-slate-600 mb-2 stroke-[1.5]" />
                <div className="text-slate-400 font-medium">No accounts added yet</div>
                <button
                  onClick={() => onNavigate('accounts')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add First Account</span>
                </button>
              </div>
            ) : (
              activeBalances.slice(0, 6).map((b) => {
                const acc = accounts.find((a) => a.id === b.accountId);
                const isNegative = b.currentBalance < 0;
                return (
                  <div
                    key={b.accountId}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => onNavigate('accounts')}
                  >
                    <div>
                      <div className="text-white font-medium">{b.accountName}</div>
                      <div className="text-[10px] text-slate-500">
                        {acc?.accountType.toUpperCase()} {acc?.institutionName ? `· ${acc.institutionName}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold font-mono ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isNegative ? `-৳${Math.abs(b.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `৳${b.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      </div>
                      <div className="text-[10px] text-slate-500">{user.baseCurrency || 'BDT'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recent Journal Entries */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
              Recent Transactions
            </h3>
            <button
              onClick={() => onNavigate('ledger')}
              className="text-xs text-emerald-400 hover:underline font-mono flex items-center gap-1"
            >
              <span>View Ledger</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 text-xs">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Wallet className="h-8 w-8 mx-auto text-slate-600 mb-2 stroke-[1.5]" />
                <div className="text-slate-400 font-medium">No ledger entries recorded yet</div>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Post income, expenses, and asset transfers directly with balanced double-entry validation.
                </p>
                <button
                  onClick={() => onNavigate('ledger')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Post Entry</span>
                </button>
              </div>
            ) : (
              transactions.slice(0, 5).map((t) => {
                const lines = transactionLines.filter((l) => l.transactionId === t.id);
                const totalAmount = lines
                  .filter((l) => l.amount > 0)
                  .reduce((sum, l) => sum + l.amount, 0);

                return (
                  <div
                    key={t.id}
                    onClick={() => onNavigate('ledger')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 hover:bg-slate-800/40 transition-colors cursor-pointer border border-slate-800/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded bg-slate-900 text-slate-400 shrink-0">
                        <Wallet className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-white font-medium truncate">{t.note || t.type.toUpperCase()}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.date}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0 pl-2">
                      <div className="text-white font-semibold">
                        ৳{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-emerald-400">Balanced</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
