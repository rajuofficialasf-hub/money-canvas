import React, { useState, useMemo } from 'react';
import { useLedger } from '../../lib/ledger-context';
import {
  simulateLoanPrepayment,
  PrepaymentStrategy,
  LoanPrepaymentResult,
} from '../../lib/loan-prepayment-engine';
import {
  Calculator,
  TrendingDown,
  Clock,
  Sparkles,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
} from 'lucide-react';

export const LoanPrepaymentSimulator: React.FC = () => {
  const { loans, accountBalances } = useLedger();

  const activeLoans = loans.filter((l) => l.status === 'active');

  // Selected Loan or 'custom'
  const [selectedLoanId, setSelectedLoanId] = useState<string>(() =>
    activeLoans.length > 0 ? activeLoans[0].id : 'custom'
  );

  // Custom / Form Inputs
  const [customPrincipal, setCustomPrincipal] = useState<number>(2000000); // 20 Lakh
  const [customRate, setCustomRate] = useState<number>(9.5); // 9.5%
  const [customTenure, setCustomTenure] = useState<number>(120); // 10 years

  // Prepayment Inputs
  const [strategy, setStrategy] = useState<PrepaymentStrategy>('reduce_tenure');
  const [monthlyExtra, setMonthlyExtra] = useState<number>(5000);
  const [lumpSum, setLumpSum] = useState<number>(100000);
  const [lumpSumMonth, setLumpSumMonth] = useState<number>(6);
  const [showScheduleTable, setShowScheduleTable] = useState<boolean>(false);

  // When a real loan is selected, get its remaining principal from accountBalances
  const selectedLoan = activeLoans.find((l) => l.id === selectedLoanId);

  const effectivePrincipal = useMemo(() => {
    if (selectedLoan) {
      const bal = accountBalances.find((b) => b.accountId === selectedLoan.loanAccountId);
      return bal ? Math.abs(bal.currentBalance) : selectedLoan.principal;
    }
    return customPrincipal;
  }, [selectedLoan, accountBalances, customPrincipal]);

  const effectiveRate = selectedLoan ? selectedLoan.annualInterestRate : customRate;
  const effectiveTenure = selectedLoan ? selectedLoan.tenureMonths : customTenure;
  const effectiveCurrentEmi = selectedLoan ? selectedLoan.emiAmount : undefined;

  // Run the simulation
  const simulation: LoanPrepaymentResult = useMemo(() => {
    return simulateLoanPrepayment({
      principal: effectivePrincipal,
      annualInterestRatePct: effectiveRate,
      remainingTenureMonths: effectiveTenure,
      currentEmi: effectiveCurrentEmi,
      monthlyExtraAmount: monthlyExtra,
      lumpSumAmount: lumpSum,
      lumpSumMonth: lumpSumMonth,
      strategy,
    });
  }, [effectivePrincipal, effectiveRate, effectiveTenure, effectiveCurrentEmi, monthlyExtra, lumpSum, lumpSumMonth, strategy]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Simulator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1">
            <Zap className="h-4 w-4" />
            <span>Smart Debt Elimination Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span>Loan Prepayment & Early Payoff Simulator</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent-strong border border-accent/30">
              FEAT-7
            </span>
          </h2>
          <p className="text-ink-muted text-xs sm:text-sm mt-0.5">
            এককালীন বা মাসিক অতিরিক্ত পরিশোধের মাধ্যমে সুদ সাশ্রয় ও লোন মেয়াদ হ্রাসের ইন্টারেক্টিভ বিশ্লেষণ।
          </p>
        </div>
      </div>

      {/* Main Grid: Inputs Column (Left) & Results Column (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Simulation Parameters */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Loan Selection Card */}
          <div className="rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-accent-strong" />
                <span>লোন নির্বাচন (Select Loan)</span>
              </span>
              <span className="text-[11px] font-mono text-accent-strong">
                {activeLoans.length} Active Loans
              </span>
            </div>

            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-edge-strong text-ink text-xs font-semibold focus:outline-none focus:border-accent"
            >
              {activeLoans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.institutionName} ({loan.loanType.toUpperCase()} — ৳{loan.principal.toLocaleString()})
                </option>
              ))}
              <option value="custom">✍️ কাস্টম লোন সিমুলেশন (Custom Loan Calculation)</option>
            </select>

            {/* Custom loan parameters if custom is selected */}
            {selectedLoanId === 'custom' && (
              <div className="space-y-3 pt-2 border-t border-edge">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-ink-soft">
                    লোন বা বকেয়া মূলধন (Principal Amount):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-ink-faint font-bold">৳</span>
                    <input
                      type="number"
                      value={customPrincipal}
                      onChange={(e) => setCustomPrincipal(Number(e.target.value) || 0)}
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-canvas border border-edge-strong text-ink text-xs font-mono font-bold focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-ink-soft">
                      সুদের হার (Rate %):
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={customRate}
                      onChange={(e) => setCustomRate(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-edge-strong text-ink text-xs font-mono font-bold focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-ink-soft">
                      মেয়াদ (মাস / Months):
                    </label>
                    <input
                      type="number"
                      value={customTenure}
                      onChange={(e) => setCustomTenure(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-edge-strong text-ink text-xs font-mono font-bold focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedLoan && (
              <div className="p-3 rounded-xl bg-canvas/70 border border-edge space-y-1 text-xs">
                <div className="flex justify-between text-ink-muted">
                  <span>বকেয়া মূলধন:</span>
                  <span className="text-ink font-mono font-bold">
                    ৳{effectivePrincipal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>মাসিক বর্তমান কিস্তি:</span>
                  <span className="text-ink font-mono font-bold">
                    ৳{(selectedLoan.emiAmount || simulation.originalSummary.monthlyEmi).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>সুদের হার:</span>
                  <span className="text-ink font-mono font-bold">{effectiveRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Strategy Selector Card */}
          <div className="rounded-2xl border border-edge bg-surface/60 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              প্রি-পেমেন্ট কৌশল (Strategy)
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStrategy('reduce_tenure')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  strategy === 'reduce_tenure'
                    ? 'border-accent bg-emerald-950/30 text-ink shadow-lg shadow-emerald-950/40'
                    : 'border-edge bg-canvas text-ink-muted hover:border-edge-strong'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Clock className="h-3.5 w-3.5 text-accent-strong" />
                  <span>মেয়াদ কমান</span>
                </div>
                <p className="text-[10px] text-ink-muted mt-1 leading-snug">
                  সর্বোচ্চ সুদ সাশ্রয় ও দ্রুত ঋণমুক্ত হওয়া (প্রস্তাবিত)।
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrategy('reduce_emi')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  strategy === 'reduce_emi'
                    ? 'border-sky-500 bg-sky-950/30 text-ink shadow-lg shadow-sky-950/40'
                    : 'border-edge bg-canvas text-ink-muted hover:border-edge-strong'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <TrendingDown className="h-3.5 w-3.5 text-sky-400" />
                  <span>মাসিক কিস্তি কমান</span>
                </div>
                <p className="text-[10px] text-ink-muted mt-1 leading-snug">
                  মাসিক ক্যাশ-ফ্লো স্বস্তি ও খরচের চাপ কমানো।
                </p>
              </button>
            </div>
          </div>

          {/* 3. Extra Payments Input Card */}
          <div className="rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-warning" />
              <span>অতিরিক্ত পরিশোধের পরিমাণ</span>
            </span>

            {/* Monthly Extra */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-ink-soft">মাসিক অতিরিক্ত পরিশোধ (Monthly Extra):</span>
                <span className="font-mono font-bold text-accent-strong">৳{monthlyExtra.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(50000, Math.round(effectivePrincipal * 0.05))}
                step="any"
                value={monthlyExtra}
                onChange={(e) => setMonthlyExtra(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex gap-1.5">
                {[0, 2000, 5000, 10000, 20000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMonthlyExtra(amt)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-colors ${
                      monthlyExtra === amt
                        ? 'bg-accent/20 text-accent-strong border-accent/40'
                        : 'bg-canvas text-ink-muted border-edge hover:border-edge-strong'
                    }`}
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* One-Time Lump Sum */}
            <div className="space-y-1.5 pt-3 border-t border-edge">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-ink-soft">এককালীন লাম্পসাম পরিশোধ (Lump Sum):</span>
                <span className="font-mono font-bold text-warning">৳{lumpSum.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(500000, effectivePrincipal)}
                step="any"
                value={lumpSum}
                onChange={(e) => setLumpSum(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex gap-1.5">
                {[0, 50000, 100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setLumpSum(amt)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-colors ${
                      lumpSum === amt
                        ? 'bg-warning/20 text-warning border-warning/40'
                        : 'bg-canvas text-ink-muted border-edge hover:border-edge-strong'
                    }`}
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {lumpSum > 0 && (
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">পরিশোধের মাস (Payment Month):</span>
                  <select
                    value={lumpSumMonth}
                    onChange={(e) => setLumpSumMonth(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg bg-canvas border border-edge-strong text-xs font-mono font-bold text-ink"
                  >
                    {[1, 3, 6, 12, 18, 24, 36].map((m) => (
                      <option key={m} value={m}>
                        {m}-তম মাসে ({m} Months from now)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Simulation Results & Analytics */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Hero Card: Savings Breakdown */}
          <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-emerald-950/40 via-surface/90 to-canvas p-6 space-y-6 shadow-2xl shadow-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-accent-strong font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>সিমুলেশন ফলাফল (Simulation Impact)</span>
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-strong font-bold border border-accent/30">
                {strategy === 'reduce_tenure' ? 'Reduce Tenure' : 'Reduce EMI'}
              </span>
            </div>

            {/* Primary KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Interest Saved */}
              <div className="p-4 rounded-xl bg-canvas/80 border border-accent/30 space-y-1">
                <span className="text-xs text-ink-muted font-medium">মোট সুদ সাশ্রয় (Interest Saved):</span>
                <div className="text-2xl sm:text-3xl font-black text-accent-strong font-mono tracking-tight">
                  ৳{simulation.comparison.interestSaved.toLocaleString()}
                </div>
                <div className="text-[11px] text-accent-strong/90 font-mono flex items-center gap-1">
                  <span>{simulation.comparison.interestSavedPct}% কম সুদ পরিশোধ করতে হবে</span>
                </div>
              </div>

              {/* Time Saved / Lower EMI */}
              <div className="p-4 rounded-xl bg-canvas/80 border border-sky-500/30 space-y-1">
                <span className="text-xs text-ink-muted font-medium">
                  {strategy === 'reduce_tenure' ? 'সময় সাশ্রয় (Time Saved):' : 'নতুন মাসিক কিস্তি (New EMI):'}
                </span>
                <div className="text-2xl sm:text-3xl font-black text-sky-400 font-mono tracking-tight">
                  {strategy === 'reduce_tenure' ? (
                    <span>
                      {simulation.comparison.monthsSaved} মাস <span className="text-sm font-normal text-ink-muted">({simulation.comparison.yearsSaved} বছর)</span>
                    </span>
                  ) : (
                    <span>৳{simulation.newSummary.monthlyEmi.toLocaleString()}</span>
                  )}
                </div>
                <div className="text-[11px] text-sky-300/90 font-mono">
                  {strategy === 'reduce_tenure'
                    ? `লোন সমাপ্তি: ${simulation.newSummary.payoffDate}`
                    : `আগের কিস্তি ছিল ৳${simulation.originalSummary.monthlyEmi.toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* Visual Amortization Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-edge/80">
              <div className="flex justify-between text-xs text-ink-soft font-mono">
                <span>মূল লোন বনাম নতুন লোন পরিশোধ তুলনা</span>
                <span>
                  সর্বমোট সাশ্রয়: ৳
                  {(
                    simulation.originalSummary.totalPayment - simulation.newSummary.totalPayment
                  ).toLocaleString()}
                </span>
              </div>

              {/* Visual Bars */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-ink-muted mb-1">
                    <span>আগের মোট প্রদান (Original):</span>
                    <span className="font-mono text-ink-soft">
                      ৳{simulation.originalSummary.totalPayment.toLocaleString()} (সুদ ৳
                      {simulation.originalSummary.totalInterest.toLocaleString()})
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-raised overflow-hidden flex">
                    <div
                      className="bg-slate-500 h-full"
                      style={{
                        width: `${(effectivePrincipal / simulation.originalSummary.totalPayment) * 100}%`,
                      }}
                      title="Principal"
                    />
                    <div className="bg-negative/80 h-full flex-1" title="Interest" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-ink-muted mb-1">
                    <span>প্রি-পেমেন্টসহ মোট প্রদান (With Prepayment):</span>
                    <span className="font-mono text-accent-strong">
                      ৳{simulation.newSummary.totalPayment.toLocaleString()} (সুদ ৳
                      {simulation.newSummary.totalInterest.toLocaleString()})
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-raised overflow-hidden flex">
                    <div
                      className="bg-slate-500 h-full"
                      style={{
                        width: `${(effectivePrincipal / simulation.newSummary.totalPayment) * 100}%`,
                      }}
                      title="Principal"
                    />
                    <div className="bg-accent h-full flex-1" title="Reduced Interest" />
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Insight Quote */}
            <div className="p-3.5 rounded-xl bg-canvas/70 border border-edge flex items-start gap-2.5 text-xs text-ink-soft leading-relaxed">
              <Info className="h-4 w-4 text-accent-strong shrink-0 mt-0.5" />
              <div>
                <strong>স্মার্ট ফাইন্যান্সিয়াল ইনসাইট:</strong> লোনের অতিরিক্ত পরিশোধের সমতুল্য রিটার্ন{' '}
                <strong className="text-accent-strong font-mono">{effectiveRate}%</strong> (ঝুঁকিমুক্ত কর-পরবর্তী রিটার্ন)। 
                ব্যাংক বা সঞ্চয়পত্রে বিনিয়োগের সুদের চেয়ে লোনের সুদের হার বেশি হলে অতিরিক্ত অর্থ লোন পরিশোধে ব্যবহার করাই সবচেয়ে লাভজনক সিদ্ধান্ত।
              </div>
            </div>
          </div>

          {/* Toggleable Amortization Schedule Table */}
          <div className="rounded-2xl border border-edge bg-surface/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowScheduleTable((prev) => !prev)}
              className="w-full p-4 flex items-center justify-between text-xs font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-400" />
                <span>
                  মাসিক অ্যামরটাইজেশন শিডিউল টেবিল দেখুন ({simulation.schedule.length} Months)
                </span>
              </div>
              {showScheduleTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showScheduleTable && (
              <div className="p-4 pt-0 border-t border-edge max-h-96 overflow-y-auto">
                <table className="w-full text-[11px] font-mono text-left">
                  <thead>
                    <tr className="border-b border-edge text-ink-faint">
                      <th className="py-2 px-1">Month</th>
                      <th className="py-2 px-1">Due Date</th>
                      <th className="py-2 px-1 text-right">Beg. Balance</th>
                      <th className="py-2 px-1 text-right">EMI</th>
                      <th className="py-2 px-1 text-right text-warning">Extra</th>
                      <th className="py-2 px-1 text-right text-accent-strong">Principal</th>
                      <th className="py-2 px-1 text-right text-negative">Interest</th>
                      <th className="py-2 px-1 text-right">End. Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge/60 text-ink-soft">
                    {simulation.schedule.map((row) => (
                      <tr key={row.month} className="hover:bg-raised/30">
                        <td className="py-2 px-1 font-bold">{row.month}</td>
                        <td className="py-2 px-1 text-ink-muted">{row.dueDate}</td>
                        <td className="py-2 px-1 text-right">৳{row.beginningBalance.toLocaleString()}</td>
                        <td className="py-2 px-1 text-right">৳{row.scheduledEmi.toLocaleString()}</td>
                        <td className="py-2 px-1 text-right font-bold text-warning">
                          {row.extraPrepayment > 0 ? `৳${row.extraPrepayment.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-1 text-right text-accent-strong">
                          ৳{row.principalPaid.toLocaleString()}
                        </td>
                        <td className="py-2 px-1 text-right text-negative">
                          ৳{row.interestPaid.toLocaleString()}
                        </td>
                        <td className="py-2 px-1 text-right font-bold">
                          ৳{row.endingBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
