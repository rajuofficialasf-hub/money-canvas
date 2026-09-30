import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../lib/language-context';
import { useLedger } from '../../lib/ledger-context';
import {
  FireInputParameters,
} from '../../types/fire-retirement';
import {
  DEFAULT_FIRE_INPUTS,
  getSavedFireInputs,
  saveFireInputs,
  runFireSimulation,
} from '../../lib/fire-engine';
import {
  Flame,
  Target,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  DollarSign,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface RetirementFireViewProps {
  onNavigate?: (view: string) => void;
}

export const RetirementFireView: React.FC<RetirementFireViewProps> = ({ onNavigate: _onNavigate }) => {
  const { isBn, t } = useLanguage();
  const {
    accountBalances,
    accounts,
    stockHoldings,
    brokerCashBalances,
    physicalAssets,
    budgets,
    getCategorySpent,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'milestones' | 'projections'>('dashboard');
  const [params, setParams] = useState<FireInputParameters>(() => getSavedFireInputs());
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Derive authoritative live Net Worth from canvas
  const canvasNetWorth = useMemo(() => {
    const liquid = accountBalances
      .filter((b) => {
        const acc = accounts.find((a) => a.id === b.accountId);
        return acc && !acc.isArchived && b.currentBalance > 0;
      })
      .reduce((sum, b) => sum + b.currentBalance, 0);

    const liab = accountBalances
      .filter((b) => b.currentBalance < 0)
      .reduce((sum, b) => sum + b.currentBalance, 0);

    const stocks = stockHoldings.reduce(
      (sum, h) => sum + (h.marketValue ?? h.currentMarketValue ?? 0),
      0
    );
    const brokerCash = brokerCashBalances.reduce((sum, b) => sum + b.cashBalance, 0);
    const assets = physicalAssets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

    return Math.max(0, liquid + liab + stocks + brokerCash + assets);
  }, [accountBalances, accounts, stockHoldings, brokerCashBalances, physicalAssets]);

  // Derive live monthly expense from budgets
  const canvasMonthlyExpense = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyBudgets = budgets.filter((b) => b.monthYear === currentMonth);
    const budgeted = monthlyBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    if (budgeted > 0) return budgeted;
    const spent = monthlyBudgets.reduce(
      (sum, b) => sum + getCategorySpent(b.categoryId, currentMonth),
      0
    );
    return spent > 0 ? spent : 65000;
  }, [budgets, getCategorySpent]);

  // Run the multi-decade simulation
  const result = useMemo(() => {
    return runFireSimulation(params);
  }, [params]);

  // Handle Input Changes
  const handleParamChange = <K extends keyof FireInputParameters>(
    field: K,
    value: FireInputParameters[K]
  ) => {
    const updated = { ...params, [field]: value };
    setParams(updated);
    saveFireInputs(updated);
  };

  // Sync from Money Canvas
  const handleSyncFromCanvas = () => {
    const updated: FireInputParameters = {
      ...params,
      currentNetWorth: canvasNetWorth > 0 ? canvasNetWorth : params.currentNetWorth,
      monthlyLivingExpense: canvasMonthlyExpense > 0 ? canvasMonthlyExpense : params.monthlyLivingExpense,
    };
    setParams(updated);
    saveFireInputs(updated);
    setSyncFeedback(
      isBn
        ? `ক্যানভাস থেকে মোট সম্পদ (৳${canvasNetWorth.toLocaleString()}) ও মাসিক খরচ (৳${canvasMonthlyExpense.toLocaleString()}) সফলভাবে লোড হয়েছে!`
        : `Synced Net Worth (৳${canvasNetWorth.toLocaleString()}) & Monthly Expenses (৳${canvasMonthlyExpense.toLocaleString()}) from Ledger!`
    );
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    setParams(DEFAULT_FIRE_INPUTS);
    saveFireInputs(DEFAULT_FIRE_INPUTS);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Flame className="h-4 w-4 text-orange-400" />
            <span>{t('fireFinancialIndependenceRetireEarly')}</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono text-[10px] font-bold border border-orange-500/30">
              FIRE OS v1
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {t('fireRetirementFireWealthProjection')}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
            {t('fireCalculateYourExactFireCorpus')}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncFromCanvas}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            title="Auto-fill Net Worth and Monthly Expenses from Money Canvas"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('fireSyncFromCanvas')}</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            <span>{t('fireResetDefaults')}</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* FIRE Number Today */}
        <div className="p-4 rounded-xl border border-orange-500/40 bg-gradient-to-b from-orange-950/30 to-slate-900/60 shadow-lg shadow-orange-950/20">
          <div className="flex items-center justify-between text-xs text-orange-400 font-semibold mb-1">
            <span>{t('fireFireNumberToday')}</span>
            <Flame className="h-3.5 w-3.5" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-orange-300">
            ৳{(result.fireNumberToday / 10000000).toFixed(2)} {t('fireCr')}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            = ৳{(result.fireNumberToday / 100000).toFixed(1)} {t('fireLakh')}
          </div>
        </div>

        {/* Future Inflated FIRE Target */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
            <span>{isBn ? `ভবিষ্যৎ টার্গেট (বয়স ${params.targetRetirementAge}-এ)` : `Target at Age ${params.targetRetirementAge}`}</span>
            <span className="text-[10px] font-mono text-slate-400">ইনফ্লেশন সহ</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
            ৳{(result.fireNumberFuture / 10000000).toFixed(2)} {t('fireCr')}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {params.expectedInflationRate}% {t('fireAnnualInflation')}
          </div>
        </div>

        {/* Target Age & Year */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
            <span>{t('fireTargetYearAge')}</span>
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {isBn ? `বয়স ${result.fireAge}` : `Age ${result.fireAge}`}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {isBn ? `সাল ${result.fireYear} (আর ${result.yearsToFire} বছর)` : `Year ${result.fireYear} (${result.yearsToFire} yrs left)`}
          </div>
        </div>

        {/* Monthly Passive Cashflow */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
            <span>{t('fireMonthlyPassiveCashflow')}</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            ৳{(result.monthlyPassiveIncomeAtRetirement / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {params.expectedPostRetirementReturn}% {t('fireSafeYield')}
          </div>
        </div>

        {/* Solvency / Feasibility */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
            <span>{t('fireSolvencyLongevity')}</span>
            {result.canSustainUntilLifeExpectancy ? (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono ${result.canSustainUntilLifeExpectancy ? 'text-emerald-400' : 'text-rose-400'}`}>
            {result.canSustainUntilLifeExpectancy ? '100% সলভেন্ট' : `বয়স ${result.depletionAge}`}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {result.canSustainUntilLifeExpectancy
              ? (isBn ? `বয়স ${params.lifeExpectancyAge}+ পর্যন্ত নিরাপদ` : `Sustainable to Age ${params.lifeExpectancyAge}`)
              : (t('fireCorpusDepletionRisk'))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-orange-400 text-orange-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>{t('fire1FirePlannerTrajectory')}</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'milestones'
              ? 'border-amber-400 text-amber-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="h-4 w-4" />
          <span>{t('fire2FireMilestones')}</span>
        </button>

        <button
          onClick={() => setActiveTab('projections')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'projections'
              ? 'border-emerald-400 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>{t('fire3YearByYearSimulation')}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FIRE DASHBOARD & INTERACTIVE SLIDERS */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Parameters */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sliders className="h-4 w-4 text-orange-400" />
                <span>{t('fireSimulationInputs')}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Interactive</span>
            </div>

            {/* Age Sliders */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>{t('fireCurrentAge')}</span>
                  <span className="text-orange-400 font-bold text-sm">{params.currentAge}</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="65"
                  value={params.currentAge}
                  onChange={(e) => handleParamChange('currentAge', parseInt(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>{t('fireRetirementTargetAge')}</span>
                  <span className="text-amber-400 font-bold text-sm">{params.targetRetirementAge}</span>
                </div>
                <input
                  type="range"
                  min={params.currentAge + 1}
                  max="70"
                  value={params.targetRetirementAge}
                  onChange={(e) => handleParamChange('targetRetirementAge', parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>{t('fireLifeExpectancy')}</span>
                  <span className="text-slate-300 font-bold text-sm">{params.lifeExpectancyAge}</span>
                </div>
                <input
                  type="range"
                  min={params.targetRetirementAge + 5}
                  max="95"
                  value={params.lifeExpectancyAge}
                  onChange={(e) => handleParamChange('lifeExpectancyAge', parseInt(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Financial Numbers Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">
                  {t('fireCurrentLiquidNetWorth')}
                </label>
                <input
                  type="number"
                  step="50000"
                  value={params.currentNetWorth}
                  onChange={(e) => handleParamChange('currentNetWorth', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-orange-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {t('fireMonthlyExpense')}
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={params.monthlyLivingExpense}
                    onChange={(e) => handleParamChange('monthlyLivingExpense', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-orange-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {t('fireMonthlySavings')}
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={params.monthlySavingsContribution}
                    onChange={(e) => handleParamChange('monthlySavingsContribution', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-emerald-400 font-bold focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Returns & Inflation */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">
                    {t('firePreRetReturn')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={params.expectedPreRetirementReturn}
                      onChange={(e) => handleParamChange('expectedPreRetirementReturn', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-white text-xs font-mono focus:border-orange-400 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">
                    {t('firePostRetReturn')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={params.expectedPostRetirementReturn}
                      onChange={(e) => handleParamChange('expectedPostRetirementReturn', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-white text-xs font-mono focus:border-orange-400 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">
                    {t('fireInflationRate')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={params.expectedInflationRate}
                      onChange={(e) => handleParamChange('expectedInflationRate', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-white text-xs font-mono focus:border-orange-400 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-500">%</span>
                  </div>
                </div>
              </div>

              {/* SWR & Pension */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">
                    {t('fireSafeWithdrawalSwr')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      max="7"
                      value={params.safeWithdrawalRatePercent}
                      onChange={(e) => handleParamChange('safeWithdrawalRatePercent', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-white text-xs font-mono focus:border-orange-400 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-500">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500">স্ট্যান্ডার্ড ৪.০% - ৪.৫%</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">
                    {t('fireMonthlyPensionRent')}
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={params.pensionOrPassiveMonthlyIncome}
                    onChange={(e) => handleParamChange('pensionOrPassiveMonthlyIncome', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-white text-xs font-mono focus:border-orange-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">অবসরে অতিরিক্ত ক্যাশফ্লো</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Trajectory & AI Insights */}
          <div className="lg:col-span-7 space-y-5">
            {/* Visual Trajectory Chart (SVG Curve) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>{t('fireWealthCompoundingDrawdownTrajectory')}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{t('fireAccumulation')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span>{t('fireRetirement')}</span>
                  </span>
                </div>
              </div>

              {/* Simplified Visual Bar/Curve Representation */}
              <div className="h-60 flex items-end gap-1 pt-6 px-2 border-b border-slate-800">
                {result.projections
                  .filter((_, idx) => idx % Math.ceil(result.projections.length / 32) === 0)
                  .map((p) => {
                    const maxCorpus = Math.max(...result.projections.map((x) => x.endingNetWorth), 1);
                    const heightPercent = Math.max(4, Math.round((p.endingNetWorth / maxCorpus) * 100));
                    const isRetirement = p.phase === 'retirement';
                    const isFirePoint = p.age === params.targetRetirementAge;

                    return (
                      <div
                        key={p.year}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-950 text-white border border-slate-700 px-2 py-1 rounded text-[10px] font-mono shadow-xl whitespace-nowrap pointer-events-none">
                          <span className="font-bold text-amber-300">বয়স {p.age} ({p.year})</span>
                          <span>৳{(p.endingNetWorth / 10000000).toFixed(2)} কোটি</span>
                        </div>

                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t transition-all ${
                            isFirePoint
                              ? 'bg-amber-400 ring-2 ring-amber-300'
                              : isRetirement
                              ? p.endingNetWorth > 0
                                ? 'bg-sky-500/70 hover:bg-sky-400'
                                : 'bg-rose-500/50'
                              : 'bg-emerald-500/70 hover:bg-emerald-400'
                          }`}
                        />
                        <span className="text-[9px] font-mono text-slate-500 truncate">
                          {p.age}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono px-2">
                <span>বর্তমান বয়স: {params.currentAge}</span>
                <span className="text-amber-400 font-bold">ফায়ার অবসর: বয়স {params.targetRetirementAge}</span>
                <span>আয়ুষ্কাল: {params.lifeExpectancyAge}</span>
              </div>
            </div>

            {/* Analytical Insights & Recommendations */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Sparkles className="h-4 w-4" />
                <span>{t('fireKeyFireInsightsRecommendations')}</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed font-sans">
                {(isBn ? result.summaryInsights.bn : result.summaryInsights.en).map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FIRE MILESTONES (Coast, Lean, Standard, Fat) */}
      {/* ========================================================================= */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.milestones.map((m) => (
              <div
                key={m.type}
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                  m.achieved
                    ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-900/60 shadow-lg shadow-emerald-950/20'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className={`h-4 w-4 ${m.achieved ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <h3 className="text-sm font-bold text-white">
                        {isBn ? m.titleBn : m.titleEn}
                      </h3>
                    </div>
                    {m.achieved && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                        {t('fireAchieved')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {isBn ? m.descriptionBn : m.descriptionEn}
                  </p>

                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">{t('fireTargetCorpus')}</span>
                      <span className="text-white font-bold">
                        ৳{(m.targetAmount / 10000000).toFixed(2)} {t('fireCr')}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">{t('fireProjectedAge')}</span>
                      <span className="text-amber-300">
                        {isBn ? `বয়স ${m.projectedAge} (${m.projectedYear} সাল)` : `Age ${m.projectedAge} (${m.projectedYear})`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-5 space-y-1.5 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">{t('fireProgress')}</span>
                    <span className={m.achieved ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                      {m.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${m.progressPercent}%` }}
                      className={`h-full rounded-full transition-all ${
                        m.achieved ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-500 to-amber-400'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: YEAR BY YEAR PROJECTION TABLE */}
      {/* ========================================================================= */}
      {activeTab === 'projections' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl space-y-0">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">
                {t('fireMultiDecadeAnnualWealthTrajectory')}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {result.projections.length} {t('fireYears')}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              SWR: {params.safeWithdrawalRatePercent}% | মুদ্রাস্ফীতি: {params.expectedInflationRate}%
            </div>
          </div>

          <div className="overflow-x-auto max-h-[550px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 font-semibold">{t('fireYearAge')}</th>
                  <th className="py-3 px-4 font-semibold">{t('firePhase')}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t('fireStartingCorpus')}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t('fireContribution')}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t('fireReturns')}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t('fireAnnualExpense')}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t('fireEndingNetWorth')}</th>
                  <th className="py-3 px-4 font-semibold text-center">{t('fireStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {result.projections.map((p) => {
                  const isRetirement = p.phase === 'retirement';
                  const isRetireStart = p.age === params.targetRetirementAge;

                  return (
                    <tr
                      key={p.year}
                      className={`hover:bg-slate-900/60 transition-colors ${
                        isRetireStart
                          ? 'bg-amber-950/30 border-y border-amber-500/40'
                          : !p.isSolvent
                          ? 'bg-rose-950/20'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-white">
                        <span>{p.year}</span>
                        <span className="text-slate-400 text-[11px] ml-1.5 font-normal">
                          ({isBn ? `বয়স ${p.age}` : `Age ${p.age}`})
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold border ${
                            isRetirement
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {isRetirement ? (t('fireRetirement2')) : (t('fireAccumulation2'))}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-300">
                        ৳{(p.startingNetWorth / 100000).toFixed(1)}L
                      </td>

                      <td className="py-3 px-4 text-right text-emerald-400">
                        {p.annualContribution > 0 ? `+৳${(p.annualContribution / 100000).toFixed(1)}L` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right text-amber-300">
                        +৳{(p.investmentReturns / 100000).toFixed(1)}L
                      </td>

                      <td className="py-3 px-4 text-right text-rose-300">
                        -৳{(p.annualLivingExpense / 100000).toFixed(1)}L
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-white">
                        ৳{(p.endingNetWorth / 10000000).toFixed(2)} Cr
                      </td>

                      <td className="py-3 px-4 text-center">
                        {p.isSolvent ? (
                          <span className="text-emerald-400 font-bold">✓ সলভেন্ট</span>
                        ) : (
                          <span className="text-rose-400 font-bold">⚠ নিঃশেষিত</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
