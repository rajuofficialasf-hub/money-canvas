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
  Flame,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      <div className="border-b border-edge pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-accent-strong mb-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-strong animate-pulse" />
            <span>MONEY CANVAS OS ACTIVE</span>
            <span>·</span>
            <span>BASE CURRENCY: {user.baseCurrency || 'BDT'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            {user.fullName}
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-1 max-w-2xl">
            {user.bio || 'Comprehensive wealth, investment portfolio, banking, and double-entry accounting overview.'}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-ink-muted">
          <button
            onClick={() => onNavigate('ledger')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold transition-colors"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{t('dashNewTransaction')}</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="border border-edge bg-surface/60 px-3 py-1.5 rounded-lg hover:text-ink transition-colors"
          >
            {t('dashSettings')}
          </button>
        </div>
      </div>

      {/* Financial Reminders & Alerts Callout */}
      {systemAlerts.length > 0 && (
        <div
          onClick={() => onNavigate('notifications')}
          className="rounded-xl border border-warning/30 bg-amber-950/20 hover:bg-amber-950/30 p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20 text-warning border border-warning/30 shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="text-ink font-bold flex items-center gap-2">
                <span>{systemAlerts.length} Active Financial Reminders</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning/20 text-warning border border-warning/30">
                  {systemAlerts.filter((a) => a.severity === 'critical').length} Critical / Overdue
                </span>
              </div>
              <p className="text-ink-soft text-[11px] mt-0.5 line-clamp-1">
                {systemAlerts[0]?.title}: {systemAlerts[0]?.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-warning font-mono text-xs font-semibold self-end sm:self-center shrink-0">
            <span>Review Reminders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      )}

      {/* Fresh Account Getting Started Banner */}
      {isFreshAccount && (
        <div className="rounded-xl border border-accent/30 bg-gradient-to-r from-emerald-950/30 via-surface/60 to-canvas p-6 space-y-4">
          <div className="flex items-center gap-2 text-accent-strong text-xs font-mono">
            <Scale className="h-4 w-4" />
            <span>WELCOME TO YOUR FRESH WEATHFOLIO ENVIRONMENT</span>
          </div>
          <h2 className="text-lg font-bold text-ink tracking-tight">
            Ready to build your financial balance sheet
          </h2>
          <p className="text-xs text-ink-soft leading-relaxed max-w-2xl">
            Weathfolio is initialized completely clean with zero demo data. You can start by setting up your real accounts (Cash, Bank, Mobile Wallets), recording initial opening balances or journal entries, and tracking your stock portfolio.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onNavigate('accounts')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink text-xs font-semibold font-mono transition-colors shadow-sm"
            >
              <Building2 className="h-4 w-4" />
              <span>Create First Account</span>
            </button>
            <button
              onClick={() => onNavigate('ledger')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-raised text-ink text-xs font-medium hover:border-slate-600 transition-colors"
            >
              <Wallet className="h-4 w-4 text-accent-strong" />
              <span>Record Journal Entry</span>
            </button>
            <button
              onClick={() => onNavigate('stocks')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-raised text-ink text-xs font-medium hover:border-slate-600 transition-colors"
            >
              <TrendingUp className="h-4 w-4 text-accent-strong" />
              <span>Add Stock Position</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Core Financial KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Net Worth */}
        <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-ink-muted">Total Net Worth</span>
            <Scale className="h-4 w-4 text-accent-strong" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink tracking-tight">
            ৳{netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">
            Assets + Liquid Cash + Stocks - Debts
          </div>
        </div>

        {/* Metric 2: Liquid Bank & Cash */}
        <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-ink-muted">Liquid Cash & Bank</span>
            <Wallet className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink tracking-tight">
            ৳{liquidAssetBalances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">
            {activeBalances.filter((b) => b.currentBalance > 0).length} active liquid accounts
          </div>
        </div>

        {/* Metric 3: Total Outstanding Debt / Liabilities */}
        <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-ink-muted">Debt & Liabilities</span>
            <CreditCard className="h-4 w-4 text-negative" />
          </div>
          <div className="text-2xl font-bold font-mono text-negative tracking-tight">
            {liabilityBalances === 0
              ? '৳0.00'
              : `-৳${Math.abs(liabilityBalances).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">
            {loans.length} active loans & credit balances
          </div>
        </div>

        {/* Metric 4: Investment Portfolio */}
        <div
          onClick={() => onNavigate('stocks')}
          className="rounded-xl border border-edge bg-surface/50 p-5 space-y-3 cursor-pointer hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-ink-muted">Stock & Broker Cash</span>
            <TrendingUp className="h-4 w-4 text-accent-strong" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink tracking-tight">
            ৳{(totalBrokerCash + totalStockMarketValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono flex items-center justify-between">
            <span>Stocks: ৳{totalStockMarketValue.toLocaleString()}</span>
            <span className={totalUnrealizedPL >= 0 ? 'text-positive' : 'text-negative'}>
              {totalUnrealizedPL >= 0 ? '+' : ''}{totalUnrealizedPLPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Planning, Budgets & Sub-Ledgers Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
            Planning, Budgets & Savings
          </h3>
          <span className="text-xs text-ink-muted font-mono">Overview</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Budget Widget */}
          <div
            onClick={() => onNavigate('budgets')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Monthly Budget</span>
              <PieChart className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-ink">
              ৳{totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ৳{totalBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="h-1.5 w-full bg-raised rounded-full overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.min(100, totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0)}%` }}
              />
            </div>
            <div className="text-[11px] text-ink-faint">
              {monthlyBudgets.length} Category ceilings configured →
            </div>
          </div>

          {/* Recurring Widget */}
          <div
            onClick={() => onNavigate('recurring')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Recurring Schedules</span>
              <Repeat className="h-3.5 w-3.5 text-accent-strong" />
            </div>
            <div className="text-lg font-bold text-ink">
              {recurringTransactions.filter((r) => !r.isPaused).length} Active Schedules
            </div>
            <div className="text-[11px] text-ink-faint pt-2">
              Next run:{' '}
              <strong className="text-accent-strong">
                {recurringTransactions.filter((r) => !r.isPaused).sort((a, b) => a.nextRun.localeCompare(b.nextRun))[0]?.nextRun || 'None scheduled'}
              </strong>{' '}
              →
            </div>
          </div>

          {/* Goals Widget */}
          <div
            onClick={() => onNavigate('goals')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Financial Goals</span>
              <Target className="h-3.5 w-3.5 text-accent-strong" />
            </div>
            <div className="text-lg font-bold text-ink">
              {financialGoals.length} Configured Goals
            </div>
            <div className="text-[11px] text-ink-faint pt-2">
              Track savings targets & milestones →
            </div>
          </div>

          {/* DPS Widget */}
          <div
            onClick={() => onNavigate('dps')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>DPS Sub-Ledger</span>
              <CalendarClock className="h-3.5 w-3.5 text-warning" />
            </div>
            <div className="text-lg font-bold text-ink">
              {activeDpsCount} Active Accounts
            </div>
            <div className="text-[11px] text-ink-faint pt-2">
              Installment schedules & maturity →
            </div>
          </div>
        </div>
      </div>

      {/* Credit, Assets & Wealth Overview Widgets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-warning flex items-center gap-2">
            <span>Credit Facilities, Physical Assets & Zakat</span>
          </h2>
          <span className="text-xs text-ink-faint font-mono">
            {debts.length} Debts · {loans.length} Loans · {physicalAssets.length} Assets
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Peer Debts Widget */}
          <div
            onClick={() => onNavigate('debts')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Peer Lending & Debts</span>
              <Users className="h-3.5 w-3.5 text-accent-strong" />
            </div>
            <div className="text-lg font-bold text-ink">
              {debts.filter((d) => d.status === 'active').length} Active Records
            </div>
            <div className="text-[11px] text-ink-faint pt-2">
              Receivables & Payables tracking →
            </div>
          </div>

          {/* Bank Loans Widget */}
          <div
            onClick={() => onNavigate('loans')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Bank Facilities</span>
              <FileSpreadsheet className="h-3.5 w-3.5 text-negative" />
            </div>
            <div className="text-lg font-bold text-ink">
              {loans.filter((l) => l.status === 'active').length} Active Loans
            </div>
            <div className="text-[11px] text-ink-faint pt-2">
              Amortization schedules & EMI →
            </div>
          </div>

          {/* Physical Assets Widget */}
          <div
            onClick={() => onNavigate('assets')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Physical Assets</span>
              <Home className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-ink">
              {physicalAssets.length} Registered Assets
            </div>
            <div className="text-[11px] text-ink-faint pt-2">
              Real estate, vehicles, gold & items →
            </div>
          </div>

          {/* Zakat Assessment Widget */}
          <div
            onClick={() => onNavigate('zakat')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Zakat & Net Worth</span>
              <Coins className="h-3.5 w-3.5 text-warning" />
            </div>
            <div className="text-lg font-bold text-accent-strong font-mono">
              2.500% Shariah
            </div>
            <div className="text-[11px] text-ink-faint pt-2">
              Nisab assessment & zakat ledger →
            </div>
          </div>
        </div>
      </div>

      {/* Capital Markets & Stock Portfolio */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-accent-strong flex items-center gap-2">
            <span>Capital Markets & Stock Portfolio</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-faint font-mono">
              {stockHoldings.length} Holdings · {stockTransactions.length} Trades
            </span>
            <button
              onClick={() => onNavigate('stocks')}
              className="text-xs text-accent-strong hover:underline font-mono flex items-center gap-1"
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
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Equity Valuation</span>
              <TrendingUp className="h-3.5 w-3.5 text-accent-strong" />
            </div>
            <div className="text-lg font-bold text-ink font-mono">
              ৳{totalStockMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[11px] font-mono flex items-center gap-1 ${totalUnrealizedPL >= 0 ? 'text-positive' : 'text-negative'}`}>
              <span>{totalUnrealizedPL >= 0 ? '+' : ''}৳{totalUnrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span>({totalUnrealizedPL >= 0 ? '+' : ''}{totalUnrealizedPLPct.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Broker Cash Reserves */}
          <div
            onClick={() => onNavigate('brokerage')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Available Broker Cash</span>
              <Building2 className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-sky-400 font-mono">
              ৳{totalBrokerCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-ink-faint pt-1">
              Brokerage cash accounts →
            </div>
          </div>

          {/* Active Positions */}
          <div
            onClick={() => onNavigate('stocks')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Active Securities</span>
              <Coins className="h-3.5 w-3.5 text-warning" />
            </div>
            <div className="text-lg font-bold text-ink">
              {stockHoldings.length} Securities Held
            </div>
            <div className="text-[11px] text-ink-faint pt-1">
              Cost basis: ৳{totalStockCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })} →
            </div>
          </div>

          {/* Trade Execution Gateway */}
          <div
            onClick={() => onNavigate('trades')}
            className="p-4 rounded-xl border border-edge bg-surface/40 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Trade Execution</span>
              <Scale className="h-3.5 w-3.5 text-accent-strong" />
            </div>
            <div className="text-lg font-bold text-accent-strong font-mono">
              {stockTransactions.length} Trades Executed
            </div>
            <div className="text-[11px] text-ink-faint pt-1">
              Execute Buy / Sell order →
            </div>
          </div>
        </div>
      </div>

      {/* Bangladesh Income Tax & NBR IT-10B Quick Callout */}
      <div
        onClick={() => onNavigate('tax')}
        className="rounded-2xl border border-accent/30 bg-gradient-to-r from-emerald-950/40 via-surface to-canvas p-5 cursor-pointer hover:border-accent/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-emerald-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-accent/20 text-accent-strong border border-accent/30 shrink-0">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink tracking-tight">
                {t('dashBdIncomeTaxNbrIt')}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent-strong text-[10px] font-mono font-bold border border-accent/30">
                NBR 2023 ACT
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 max-w-2xl leading-relaxed">
              {t('dashSlabBasedIncomeTaxCalculation')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-accent-strong text-xs font-semibold shrink-0">
          <span>{t('dashOpenTaxPlanner')}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* Sanchayapatra, Treasury Bonds & Sukuk Quick Callout */}
      <div
        onClick={() => onNavigate('sanchaya_bonds')}
        className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-surface to-canvas p-5 cursor-pointer hover:border-sky-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-sky-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink tracking-tight">
                {t('dashSanchayapatraTreasuryBondsSukukTracker')}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold border border-sky-500/30">
                SOVEREIGN YIELD
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 max-w-2xl leading-relaxed">
              {t('dashFamilySavingsCertificates3Month')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold shrink-0">
          <span>{t('dashOpenBondsTracker')}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* BAJUS Gold & FX Rates Quick Callout */}
      <div
        onClick={() => onNavigate('gold_fx')}
        className="rounded-2xl border border-warning/30 bg-gradient-to-r from-amber-950/40 via-surface to-canvas p-5 cursor-pointer hover:border-warning/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-amber-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-warning/20 text-warning border border-warning/30 shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink tracking-tight">
                {t('dashBajusGoldRatesForeignExchange')}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-mono font-bold border border-warning/30">
                LIVE 22K ৳1,43,526
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 max-w-2xl leading-relaxed">
              {t('dashOfficialBajus22kHallmarkedGold')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-warning text-xs font-semibold shrink-0">
          <span>{t('dashViewGoldFxRates')}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* Retirement & FIRE Planner Quick Callout */}
      <div
        onClick={() => onNavigate('fire')}
        className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-950/40 via-surface to-canvas p-5 cursor-pointer hover:border-orange-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-orange-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink tracking-tight">
                {t('dashRetirementFireWealthProjectionPlanner')}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono font-bold border border-orange-500/30">
                EARLY RETIREMENT
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 max-w-2xl leading-relaxed">
              {t('dashCalculateYourExactFireCorpus')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold shrink-0">
          <span>{t('dashOpenFirePlanner')}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* Two Column Grid: Accounts Overview & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Accounts Distribution */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
              Accounts & Balances
            </h3>
            <button
              onClick={() => onNavigate('accounts')}
              className="text-xs text-accent-strong hover:underline font-mono flex items-center gap-1"
            >
              <span>Manage Accounts ({accounts.filter((a) => !a.isArchived).length})</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-xl border border-edge bg-surface/40 divide-y divide-edge/70 overflow-hidden text-xs font-mono">
            {activeBalances.length === 0 ? (
              <div className="p-8 text-center text-ink-faint">
                <Building2 className="h-8 w-8 mx-auto text-slate-600 mb-2 stroke-[1.5]" />
                <div className="text-ink-muted font-medium">No accounts added yet</div>
                <button
                  onClick={() => onNavigate('accounts')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent-strong border border-accent/20 text-xs font-semibold hover:bg-accent/20 transition-colors"
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
                    className="p-3.5 flex items-center justify-between hover:bg-raised/30 transition-colors cursor-pointer"
                    onClick={() => onNavigate('accounts')}
                  >
                    <div>
                      <div className="text-ink font-medium">{b.accountName}</div>
                      <div className="text-[10px] text-ink-faint">
                        {acc?.accountType.toUpperCase()} {acc?.institutionName ? `· ${acc.institutionName}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold font-mono ${isNegative ? 'text-negative' : 'text-positive'}`}>
                        {isNegative ? `-৳${Math.abs(b.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `৳${b.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      </div>
                      <div className="text-[10px] text-ink-faint">{user.baseCurrency || 'BDT'}</div>
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
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
              Recent Transactions
            </h3>
            <button
              onClick={() => onNavigate('ledger')}
              className="text-xs text-accent-strong hover:underline font-mono flex items-center gap-1"
            >
              <span>View Ledger</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-xl border border-edge bg-surface/40 p-4 space-y-3 text-xs">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-ink-faint">
                <Wallet className="h-8 w-8 mx-auto text-slate-600 mb-2 stroke-[1.5]" />
                <div className="text-ink-muted font-medium">No ledger entries recorded yet</div>
                <p className="text-[11px] text-ink-faint mt-1 max-w-xs mx-auto">
                  Post income, expenses, and asset transfers directly with balanced double-entry validation.
                </p>
                <button
                  onClick={() => onNavigate('ledger')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent-strong border border-accent/20 text-xs font-semibold hover:bg-accent/20 transition-colors"
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
                    className="flex items-center justify-between p-2.5 rounded-lg bg-canvas/40 hover:bg-raised/40 transition-colors cursor-pointer border border-edge/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded bg-surface text-ink-muted shrink-0">
                        <Wallet className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-ink font-medium truncate">{t.note || t.type.toUpperCase()}</div>
                        <div className="text-[10px] text-ink-faint font-mono">{t.date}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0 pl-2">
                      <div className="text-ink font-semibold">
                        ৳{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-accent-strong">Balanced</div>
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
