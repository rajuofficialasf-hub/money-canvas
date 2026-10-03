import { todayLocalISO } from '../../lib/date-utils';
import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { CompoundingFrequency, NewFdInput } from '../../types/accounting';
import { calculateFdMaturity, round2 } from '../../lib/accounting-engine';
import {
  Landmark,
  Plus,
  AlertTriangle,
  X,
} from 'lucide-react';

export const FixedDepositsView: React.FC = () => {
  const {
    fixedDeposits,
    accounts,
    getAccountBalance,
    openFixedDeposit,
    matureFixedDeposit,
    breakFixedDeposit,
  } = useLedger();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [matureModalFdId, setMatureModalFdId] = useState<string | null>(null);
  const [breakModalFdId, setBreakModalFdId] = useState<string | null>(null);

  // New FD Form State
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    accounts.find((a) => ['bank', 'cash'].includes(a.accountType))?.id || ''
  );
  const [institutionName, setInstitutionName] = useState('');
  const [fdNumber, setFdNumber] = useState('');
  const [principalAmount, setPrincipalAmount] = useState<string>('100000');
  const [interestRate, setInterestRate] = useState<string>('8.5');
  const [tenureMonths, setTenureMonths] = useState<string>('12');
  const [startDate, setStartDate] = useState<string>(() => todayLocalISO());
  const [compoundingFrequency, setCompoundingFrequency] = useState<CompoundingFrequency>('annually');
  const [taxRate, setTaxRate] = useState<string>('10');
  const [createError, setCreateError] = useState<string | null>(null);

  // Liquidation Destination Account
  const [destinationAccountId, setDestinationAccountId] = useState<string>(
    accounts.find((a) => a.accountType === 'bank')?.id || ''
  );
  const [penaltyRate, setPenaltyRate] = useState<string>('4.0');

  // Real-time compound calculation preview for modal
  const parsedPrincipal = parseFloat(principalAmount) || 0;
  const parsedRate = parseFloat(interestRate) || 0;
  const parsedTenure = parseInt(tenureMonths) || 12;
  const parsedTax = parseFloat(taxRate) || 10;

  const previewCalc = calculateFdMaturity(
    parsedPrincipal,
    parsedRate,
    parsedTenure,
    compoundingFrequency,
    parsedTax
  );

  // Portfolio Totals
  const activeFds = fixedDeposits.filter((f) => f.status === 'active');
  const totalPrincipal = activeFds.reduce((sum, f) => sum + f.principalAmount, 0);
  const totalExpectedMaturity = activeFds.reduce((sum, f) => sum + f.expectedMaturityAmount, 0);
  const totalProjectedInterest = totalExpectedMaturity - totalPrincipal;

  const weightedAvgRate =
    totalPrincipal > 0
      ? round2(
          activeFds.reduce((sum, f) => sum + f.principalAmount * f.interestRate, 0) /
            totalPrincipal
        )
      : 0;

  const handleOpenFdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (parsedPrincipal <= 0) {
      setCreateError('Please enter a valid principal amount.');
      return;
    }
    if (!institutionName.trim()) {
      setCreateError('Please enter institution name.');
      return;
    }

    const input: NewFdInput = {
      sourceAccountId,
      institutionName: institutionName.trim(),
      fdNumber: fdNumber.trim() || undefined,
      principalAmount: parsedPrincipal,
      interestRate: parsedRate,
      tenureMonths: parsedTenure,
      startDate,
      compoundingFrequency,
      taxRate: parsedTax,
    };

    const res = openFixedDeposit(input);
    if (!res.success) {
      setCreateError(res.error || 'Failed to open Fixed Deposit.');
      return;
    }

    // Reset & close
    setIsCreateModalOpen(false);
  };

  const handleMatureSubmit = (fdId: string) => {
    const res = matureFixedDeposit(fdId, destinationAccountId);
    if (!res.success) {
      alert(res.error || 'Failed to mature FD.');
    } else {
      setMatureModalFdId(null);
    }
  };

  const handleBreakSubmit = (fdId: string) => {
    const parsedPenalty = parseFloat(penaltyRate) || 4.0;
    const res = breakFixedDeposit(fdId, destinationAccountId, parsedPenalty);
    if (!res.success) {
      alert(res.error || 'Failed to break FD.');
    } else {
      setBreakModalFdId(null);
    }
  };

  const activeFdToMature = fixedDeposits.find((f) => f.id === matureModalFdId);
  const activeFdToBreak = fixedDeposits.find((f) => f.id === breakModalFdId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="border-b border-edge pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1.5">
            <Landmark className="h-4 w-4" />
            <span>Fixed Deposits (FDR) Portfolio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Fixed Deposits & Term Schemes
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Locked term deposits with compound interest calculation, tax withholding, and double-entry settlements.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink text-xs font-semibold font-mono transition-colors shadow-sm w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>Open New Fixed Deposit</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-2">
          <div className="text-xs font-mono uppercase text-ink-muted">Total FD Principal</div>
          <div className="text-2xl font-bold font-mono text-ink tracking-tight">
            ৳{totalPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">
            {activeFds.length} active term deposits
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-2">
          <div className="text-xs font-mono uppercase text-ink-muted">Net Expected Interest</div>
          <div className="text-2xl font-bold font-mono text-accent-strong tracking-tight">
            ৳{Math.max(0, totalProjectedInterest).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">After 10% withholding tax</div>
        </div>

        <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-2">
          <div className="text-xs font-mono uppercase text-ink-muted">Expected Maturity Value</div>
          <div className="text-2xl font-bold font-mono text-sky-400 tracking-tight">
            ৳{totalExpectedMaturity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">Principal + Net Compound Interest</div>
        </div>

        <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-2">
          <div className="text-xs font-mono uppercase text-ink-muted">Weighted Avg Interest</div>
          <div className="text-2xl font-bold font-mono text-accent-strong tracking-tight">
            {weightedAvgRate.toFixed(2)}%
          </div>
          <div className="text-[11px] text-ink-faint font-mono">Annualized return</div>
        </div>
      </div>

      {/* Active Fixed Deposits List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
          Fixed Deposits Registry ({fixedDeposits.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fixedDeposits.map((fd) => {
            const isActive = fd.status === 'active';
            const isMatured = fd.status === 'matured';
            const isBroken = fd.status === 'broken';

            // Calculate days to maturity
            const maturityDate = new Date(fd.maturityDate);
            const today = new Date();
            const daysRemaining = Math.max(
              0,
              Math.ceil((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            );

            return (
              <div
                key={fd.id}
                className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                  isActive
                    ? 'border-edge bg-surface/50 hover:border-slate-700'
                    : 'border-edge/60 bg-canvas/40 opacity-70'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-ink-faint">
                        {fd.institutionName} · {fd.tenureMonths} Months
                      </div>
                      <h3 className="text-base font-bold text-ink font-mono mt-0.5">
                        ৳{fd.principalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </h3>
                      {fd.fdNumber && (
                        <div className="text-[11px] text-ink-faint font-mono">A/C: {fd.fdNumber}</div>
                      )}
                    </div>

                    <div>
                      {isActive && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-accent-strong border border-accent/30">
                          Active · {daysRemaining}d left
                        </span>
                      )}
                      {isMatured && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/40 text-sky-400 border border-sky-500/30">
                          Matured
                        </span>
                      )}
                      {isBroken && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-warning border border-warning/30">
                          Premature Broken
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Terms Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-canvas p-3 rounded-lg border border-edge/80">
                    <div>
                      <div className="text-[10px] text-ink-faint uppercase">Interest Rate</div>
                      <div className="text-ink font-semibold">{fd.interestRate}% ({fd.compoundingFrequency})</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-ink-faint uppercase">Maturity Date</div>
                      <div className="text-ink font-semibold">{fd.maturityDate}</div>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-edge/80 flex items-center justify-between">
                      <span className="text-[10px] text-ink-faint">Net Maturity Value:</span>
                      <span className="text-accent-strong font-bold">
                        ৳{fd.expectedMaturityAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                {isActive && (
                  <div className="pt-2 border-t border-edge/80 flex items-center justify-end gap-2 font-mono text-xs">
                    <button
                      onClick={() => setBreakModalFdId(fd.id)}
                      className="px-3 py-1.5 rounded-lg border border-negative/30 text-negative hover:bg-rose-950/20 transition-colors"
                    >
                      Break Prematurely
                    </button>
                    <button
                      onClick={() => setMatureModalFdId(fd.id)}
                      className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold transition-colors"
                    >
                      Mature Deposit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {fixedDeposits.length === 0 && (
          <div className="rounded-xl border border-edge bg-surface/30 p-12 text-center text-ink-faint text-xs font-mono">
            No Fixed Deposits found. Click "Open New Fixed Deposit" to lock liquid funds with compound interest.
          </div>
        )}
      </div>

      {/* Modal: Open New FD */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-edge bg-surface p-6 shadow-2xl font-sans text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div>
                <h2 className="text-base font-bold text-ink">Open New Fixed Deposit (FD)</h2>
                <p className="text-ink-muted text-xs mt-0.5">Posts double-entry funding transfer from Bank to FD account.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-ink-muted hover:text-ink rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-negative/40 text-negative text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-negative shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleOpenFdSubmit} className="space-y-4 font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-ink-muted">Funding Account *</label>
                    {sourceAccountId && (
                      <span className="text-[11px] text-accent-strong">
                        ৳{getAccountBalance(sourceAccountId).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-sans"
                    required
                  >
                    {accounts
                      .filter((a) => !a.isArchived && ['bank', 'cash', 'mobile_wallet'].includes(a.accountType))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} — ৳{getAccountBalance(a.id).toLocaleString()}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ink-muted mb-1">Institution Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. BRAC Bank Ltd."
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-sans"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-ink-muted mb-1">Principal Amount (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-ink-muted mb-1">Annual Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 8.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-bold text-accent-strong"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-ink-muted mb-1">Tenure (Months) *</label>
                  <input
                    type="number"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-ink-muted mb-1">Compounding</label>
                  <select
                    value={compoundingFrequency}
                    onChange={(e) => setCompoundingFrequency(e.target.value as CompoundingFrequency)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="annually">Annually</option>
                    <option value="half_yearly">Half Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-ink-muted mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-ink-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-ink-muted mb-1">FD Certificate / Reference #</label>
                  <input
                    type="text"
                    placeholder="e.g. FD-2026-904"
                    value={fdNumber}
                    onChange={(e) => setFdNumber(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink font-sans focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time Compound Return Projection Box */}
              <div className="rounded-lg bg-canvas p-4 border border-edge space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-ink-muted uppercase text-[10px]">
                  <span>Compound Return Forecast</span>
                  <span className="text-accent-strong font-semibold">{compoundingFrequency} compounding</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-edge/80">
                  <div>
                    <span className="text-ink-faint">Gross Interest: </span>
                    <span className="text-ink font-semibold">৳{previewCalc.grossInterest.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint">Withholding Tax ({parsedTax}%): </span>
                    <span className="text-negative font-semibold">-৳{previewCalc.withholdingTax.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint">Net Interest: </span>
                    <span className="text-accent-strong font-semibold">৳{previewCalc.netInterest.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint">Net Maturity Value: </span>
                    <span className="text-sky-400 font-bold">৳{previewCalc.netMaturityAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-edge pt-4 flex items-center justify-end gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-edge text-ink-soft hover:bg-raised text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold font-mono text-xs transition-colors"
                >
                  Confirm & Post FD Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mature FD */}
      {activeFdToMature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-edge bg-surface p-6 shadow-2xl font-sans text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div>
                <h2 className="text-base font-bold text-ink">Mature Fixed Deposit</h2>
                <p className="text-ink-muted text-xs mt-0.5">Liquidates principal and recognizes interest income.</p>
              </div>
              <button onClick={() => setMatureModalFdId(null)} className="p-1 text-ink-muted hover:text-ink rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg bg-canvas p-4 border border-edge space-y-2 font-mono">
              <div className="text-ink font-semibold">{activeFdToMature.institutionName}</div>
              <div className="flex justify-between text-ink-muted">
                <span>Principal:</span>
                <span className="text-ink font-semibold">৳{activeFdToMature.principalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Net Maturity Proceeds:</span>
                <span className="text-accent-strong font-bold">৳{activeFdToMature.expectedMaturityAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="font-mono">
              <label className="block text-ink-muted mb-1">Destination Bank Account *</label>
              <select
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-sans"
              >
                {accounts
                  .filter((a) => !a.isArchived && a.accountType === 'bank')
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="border-t border-edge pt-4 flex items-center justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setMatureModalFdId(null)}
                className="px-4 py-2 rounded-lg border border-edge text-ink-soft hover:bg-raised text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleMatureSubmit(activeFdToMature.id)}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold font-mono text-xs transition-colors"
              >
                Execute Maturity Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Break FD */}
      {activeFdToBreak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-edge bg-surface p-6 shadow-2xl font-sans text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div>
                <h2 className="text-base font-bold text-ink">Premature FD Liquidation (Break)</h2>
                <p className="text-ink-muted text-xs mt-0.5">Applies penalty interest rate on early withdrawal.</p>
              </div>
              <button onClick={() => setBreakModalFdId(null)} className="p-1 text-ink-muted hover:text-ink rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg bg-rose-950/20 p-4 border border-negative/30 space-y-2 font-mono">
              <div className="text-negative font-semibold">Warning: Premature Breaking</div>
              <p className="text-ink-muted text-[11px] font-sans">
                Early withdrawal incurs bank penalties. Original interest rate was {activeFdToBreak.interestRate}%.
              </p>
            </div>

            <div className="font-mono space-y-3">
              <div>
                <label className="block text-ink-muted mb-1">Penalty Interest Rate (%)</label>
                <input
                  type="number"
                  step="any"
                  value={penaltyRate}
                  onChange={(e) => setPenaltyRate(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1">Destination Bank Account *</label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-sans"
                >
                  {accounts
                    .filter((a) => !a.isArchived && a.accountType === 'bank')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="border-t border-edge pt-4 flex items-center justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setBreakModalFdId(null)}
                className="px-4 py-2 rounded-lg border border-edge text-ink-soft hover:bg-raised text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBreakSubmit(activeFdToBreak.id)}
                className="px-4 py-2 rounded-lg bg-negative hover:bg-negative text-white font-semibold font-mono text-xs transition-colors"
              >
                Confirm Early Liquidation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
