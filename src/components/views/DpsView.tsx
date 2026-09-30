import { todayLocalISO } from '../../lib/date-utils';
import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { calculateDpsMaturity, round2 } from '../../lib/accounting-engine';
import {
  CalendarClock,
  Plus,
  X,
  Clock,
  Receipt,
  FileText,
} from 'lucide-react';

export const DpsView: React.FC = () => {
  const {
    dpsAccounts,
    dpsInstallments,
    accounts,
    accountBalances,
    getAccountBalance,
    openDps,
    payDpsInstallment,
    matureDps,
  } = useLedger();

  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [scheduleModalDpsId, setScheduleModalDpsId] = useState<string | null>(null);
  const [matureModalDpsId, setMatureModalDpsId] = useState<string | null>(null);
  const [payModalData, setPayModalData] = useState<{ dpsId: string; installmentNumber: number } | null>(null);

  // Open DPS Form
  const [formSourceId, setFormSourceId] = useState('');
  const [formInstitution, setFormInstitution] = useState('');
  const [formDpsNumber, setFormDpsNumber] = useState('');
  const [formInstallment, setFormInstallment] = useState('');
  const [formTenure, setFormTenure] = useState('36');
  const [formRate, setFormRate] = useState('8.50');
  const [formStartDate, setFormStartDate] = useState(todayLocalISO());
  const [formTaxRate, setFormTaxRate] = useState('10.0');
  const [formError, setFormError] = useState('');

  // Payment Form
  const [paySourceAccountId, setPaySourceAccountId] = useState('');
  const [payError, setPayError] = useState('');

  // Mature Form
  const [destAccountId, setDestAccountId] = useState('');
  const [matureError, setMatureError] = useState('');

  const activeDpsList = dpsAccounts.filter((d) => d.status === 'active');
  const monthlyCommitment = activeDpsList.reduce((sum, d) => sum + d.monthlyInstallment, 0);

  // Total principal accumulated in active DPS accounts from accountBalances
  const totalAccumulated = activeDpsList.reduce((sum, d) => {
    const bal = accountBalances.find((b) => b.accountId === d.dpsAccountId);
    return sum + (bal ? bal.currentBalance : 0);
  }, 0);

  const totalExpectedMaturity = activeDpsList.reduce((sum, d) => {
    const calc = calculateDpsMaturity(d.monthlyInstallment, d.interestRate, d.tenureMonths, d.taxRate);
    return sum + calc.netMaturityAmount;
  }, 0);

  // Live calculator for open form
  const parsedInstallment = parseFloat(formInstallment) || 0;
  const parsedTenure = parseInt(formTenure, 10) || 0;
  const parsedRate = parseFloat(formRate) || 0;
  const parsedTax = parseFloat(formTaxRate) || 10.0;
  const previewCalc = calculateDpsMaturity(parsedInstallment, parsedRate, parsedTenure, parsedTax);

  const handleOpenDps = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formSourceId) {
      setFormError('Please select a source bank account to fund installments.');
      return;
    }
    if (!formInstitution.trim()) {
      setFormError('Please enter the financial institution name.');
      return;
    }
    if (parsedInstallment <= 0) {
      setFormError('Monthly installment must be positive.');
      return;
    }
    if (parsedTenure <= 0) {
      setFormError('Tenure months must be positive.');
      return;
    }
    if (parsedRate <= 0) {
      setFormError('Annual interest rate must be positive.');
      return;
    }

    const res = openDps({
      sourceAccountId: formSourceId,
      institutionName: formInstitution,
      dpsNumber: formDpsNumber || undefined,
      monthlyInstallment: parsedInstallment,
      tenureMonths: parsedTenure,
      interestRate: parsedRate,
      startDate: formStartDate,
      taxRate: parsedTax,
    });

    if (res.success) {
      setIsOpenModalOpen(false);
      setFormInstitution('');
      setFormDpsNumber('');
      setFormInstallment('');
    } else {
      setFormError(res.error || 'Failed to open DPS.');
    }
  };

  const handlePayInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');

    if (!payModalData) return;
    if (!paySourceAccountId) {
      setPayError('Please select a funding bank account.');
      return;
    }

    const res = payDpsInstallment(
      payModalData.dpsId,
      payModalData.installmentNumber,
      paySourceAccountId
    );

    if (res.success) {
      setPayModalData(null);
      setPaySourceAccountId('');
    } else {
      setPayError(res.error || 'Failed to pay installment.');
    }
  };

  const handleMatureDps = (e: React.FormEvent) => {
    e.preventDefault();
    setMatureError('');

    if (!matureModalDpsId) return;
    if (!destAccountId) {
      setMatureError('Please select a destination bank account.');
      return;
    }

    const res = matureDps(matureModalDpsId, destAccountId);
    if (res.success) {
      setMatureModalDpsId(null);
      setDestAccountId('');
    } else {
      setMatureError(res.error || 'Failed to mature DPS.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <CalendarClock className="h-4 w-4" />
            <span>Deposit Pension Scheme (DPS)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">DPS Portfolio & Installments</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Recurring monthly annuity tracking, installment schedules, and double-entry maturity settlements.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsOpenModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold font-mono transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Open New DPS</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active DPS Schemes</div>
          <div className="text-2xl font-bold text-white">{activeDpsList.length} Accounts</div>
          <div className="text-[11px] text-slate-500 mt-1">{dpsAccounts.length} Total created</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Monthly Obligation</div>
          <div className="text-2xl font-bold text-sky-400">৳{monthlyCommitment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-slate-500 mt-1">Committed monthly savings</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Accumulated Principal</div>
          <div className="text-2xl font-bold text-emerald-400">৳{totalAccumulated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-slate-500 mt-1">Authoritative DPS balance</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Projected Maturity Payout</div>
          <div className="text-2xl font-bold text-amber-400">৳{totalExpectedMaturity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-slate-500 mt-1">Net after withholding tax</div>
        </div>
      </div>

      {/* DPS Accounts List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-slate-300">
          DPS Portfolio Ledger
        </h3>

        {dpsAccounts.length === 0 ? (
          <div className="p-8 text-center border border-slate-800/80 rounded-xl bg-slate-900/20">
            <CalendarClock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-300">No DPS schemes opened</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Open a Deposit Pension Scheme to accumulate long-term wealth with compound monthly returns.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dpsAccounts.map((dps) => {
              const installments = dpsInstallments.filter((i) => i.dpsAccountId === dps.id);
              const paidCount = installments.filter((i) => i.status === 'paid').length;
              const pendingNext = installments.find((i) => i.status === 'pending');
              const balanceView = accountBalances.find((b) => b.accountId === dps.dpsAccountId);
              const currentBalance = balanceView ? balanceView.currentBalance : 0;
              const isMatured = dps.status === 'matured';

              const maturityCalc = calculateDpsMaturity(
                dps.monthlyInstallment,
                dps.interestRate,
                dps.tenureMonths,
                dps.taxRate
              );

              return (
                <div
                  key={dps.id}
                  className={`rounded-xl border p-5 transition-colors space-y-4 ${
                    isMatured
                      ? 'border-slate-800/60 bg-slate-950/40 opacity-70'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-base">{dps.institutionName}</span>
                        <span className="text-xs font-mono text-slate-400">({dps.dpsNumber})</span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                            isMatured
                              ? 'border-slate-800 text-slate-500'
                              : 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                          }`}
                        >
                          {dps.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Monthly: <strong className="text-white">৳{dps.monthlyInstallment.toLocaleString()}</strong></span>
                        <span>·</span>
                        <span>Interest: <strong className="text-emerald-400">{dps.interestRate}% (Monthly Compounding)</strong></span>
                        <span>·</span>
                        <span>Tenure: {dps.tenureMonths} Months</span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-emerald-400 font-bold text-lg">
                        ৳{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500">Current Accumulated Balance</div>
                    </div>
                  </div>

                  {/* Installments Progress Bar */}
                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Installments: <strong className="text-white">{paidCount} of {dps.tenureMonths} paid</strong> ({((paidCount / dps.tenureMonths) * 100).toFixed(0)}%)
                      </span>
                      <span className="text-slate-400">
                        Maturity: <strong className="text-white">{dps.maturityDate}</strong>
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${(paidCount / dps.tenureMonths) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/70 font-mono text-xs">
                    <div className="p-2 rounded bg-slate-950/40 border border-slate-800/80">
                      <div className="text-[10px] text-slate-500">Total Principal</div>
                      <div className="text-white font-medium">৳{maturityCalc.totalPrincipal.toLocaleString()}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/40 border border-slate-800/80">
                      <div className="text-[10px] text-slate-500">Gross Compound Profit</div>
                      <div className="text-emerald-400 font-medium">৳{maturityCalc.grossInterest.toLocaleString()}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/40 border border-slate-800/80">
                      <div className="text-[10px] text-slate-500">Withholding Tax ({dps.taxRate}%)</div>
                      <div className="text-rose-400 font-medium">৳{maturityCalc.withholdingTax.toLocaleString()}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/40 border border-slate-800/80">
                      <div className="text-[10px] text-slate-500">Net Expected Payout</div>
                      <div className="text-amber-400 font-bold">৳{maturityCalc.netMaturityAmount.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 font-mono text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {pendingNext ? (
                        <span>Next due: <strong className="text-white">{pendingNext.dueDate}</strong> (Installment #{pendingNext.installmentNumber})</span>
                      ) : (
                        <span className="text-emerald-400">All installments completed!</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setScheduleModalDpsId(dps.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>View Schedule</span>
                      </button>

                      {!isMatured && pendingNext && (
                        <button
                          onClick={() => {
                            setPayError('');
                            setPayModalData({ dpsId: dps.id, installmentNumber: pendingNext.installmentNumber });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-medium transition-colors flex items-center gap-1.5"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Pay Installment #{pendingNext.installmentNumber}</span>
                        </button>
                      )}

                      {!isMatured && (
                        <button
                          onClick={() => {
                            setMatureError('');
                            setMatureModalDpsId(dps.id);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                        >
                          Settle & Mature
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pay Installment Modal */}
      {payModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            {(() => {
              const dps = dpsAccounts.find((d) => d.id === payModalData.dpsId);
              if (!dps) return null;

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">Pay DPS Installment #{payModalData.installmentNumber}</h3>
                      <div className="text-xs text-slate-400 font-mono">{dps.institutionName}</div>
                    </div>
                    <button onClick={() => setPayModalData(null)} className="text-slate-400 hover:text-white p-1 rounded">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {payError && (
                    <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
                      {payError}
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
                    <div className="text-slate-400">Installment Amount:</div>
                    <div className="text-xl font-bold text-white">৳{dps.monthlyInstallment.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500">
                      Creates double-entry transfer (Bank Account -৳{dps.monthlyInstallment} / DPS Account +৳{dps.monthlyInstallment}).
                    </div>
                  </div>

                  <form onSubmit={handlePayInstallment} className="space-y-4 text-xs font-mono">
                    <div>
                      <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Funding Bank Account</label>
                      <select
                        value={paySourceAccountId}
                        onChange={(e) => setPaySourceAccountId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose Funding Bank Account --</option>
                        {accounts
                          .filter((a) => !a.isArchived && a.id !== dps.dpsAccountId && a.accountType !== 'credit_card')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.accountType.toUpperCase()}) — ৳{getAccountBalance(a.id).toLocaleString()}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setPayModalData(null)}
                        className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
                      >
                        Post Installment Payment
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* View Installments Schedule Modal */}
      {scheduleModalDpsId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            {(() => {
              const dps = dpsAccounts.find((d) => d.id === scheduleModalDpsId);
              if (!dps) return null;
              const installments = dpsInstallments.filter((i) => i.dpsAccountId === dps.id);

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">DPS Amortization Schedule</h3>
                      <div className="text-xs text-slate-400 font-mono">{dps.institutionName} · {dps.tenureMonths} Months</div>
                    </div>
                    <button onClick={() => setScheduleModalDpsId(null)} className="text-slate-400 hover:text-white p-1 rounded">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-slate-800/80">
                    <div className="grid grid-cols-12 py-2 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 bg-slate-900 border-b border-slate-800">
                      <span className="col-span-2"># Installment</span>
                      <span className="col-span-3">Due Date</span>
                      <span className="col-span-3 text-right">Amount</span>
                      <span className="col-span-2 text-center">Status</span>
                      <span className="col-span-2 text-right">Action</span>
                    </div>

                    {installments.map((inst) => (
                      <div key={inst.id} className="grid grid-cols-12 py-2.5 items-center hover:bg-slate-800/30">
                        <span className="col-span-2 text-white font-medium">Month {inst.installmentNumber}</span>
                        <span className="col-span-3 text-slate-400">{inst.dueDate}</span>
                        <span className="col-span-3 text-right text-white">৳{inst.expectedAmount.toLocaleString()}</span>
                        <span className="col-span-2 text-center">
                          <span
                            className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                              inst.status === 'paid'
                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                                : 'border-slate-800 text-slate-400'
                            }`}
                          >
                            {inst.status}
                          </span>
                        </span>
                        <span className="col-span-2 text-right">
                          {inst.status === 'pending' ? (
                            <button
                              onClick={() => {
                                setScheduleModalDpsId(null);
                                setPayModalData({ dpsId: dps.id, installmentNumber: inst.installmentNumber });
                              }}
                              className="text-xs text-emerald-400 hover:underline"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500">Paid on {inst.paidDate}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => setScheduleModalDpsId(null)}
                      className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-mono"
                    >
                      Close Schedule
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Mature DPS Modal */}
      {matureModalDpsId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            {(() => {
              const dps = dpsAccounts.find((d) => d.id === matureModalDpsId);
              if (!dps) return null;

              const balanceView = accountBalances.find((b) => b.accountId === dps.dpsAccountId);
              const accumulated = balanceView ? balanceView.currentBalance : round2(dps.monthlyInstallment * dps.tenureMonths);
              const calc = calculateDpsMaturity(dps.monthlyInstallment, dps.interestRate, dps.tenureMonths, dps.taxRate);

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">Settle & Mature DPS</h3>
                      <div className="text-xs text-slate-400 font-mono">{dps.institutionName}</div>
                    </div>
                    <button onClick={() => setMatureModalDpsId(null)} className="text-slate-400 hover:text-white p-1 rounded">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {matureError && (
                    <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
                      {matureError}
                    </div>
                  )}

                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950 font-mono text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Accumulated Principal:</span>
                      <span className="text-white font-semibold">৳{accumulated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gross Compound Interest:</span>
                      <span className="text-emerald-400 font-semibold">৳{calc.grossInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Withholding Tax ({dps.taxRate}%):</span>
                      <span className="text-rose-400 font-semibold">-৳{calc.withholdingTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
                      <span className="text-white font-bold">Total Deposited Proceeds:</span>
                      <span className="text-emerald-400 font-bold">৳{(accumulated + calc.netInterest).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <form onSubmit={handleMatureDps} className="space-y-4 text-xs font-mono">
                    <div>
                      <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Destination Bank Account</label>
                      <select
                        value={destAccountId}
                        onChange={(e) => setDestAccountId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose Destination Bank Account --</option>
                        {accounts
                          .filter((a) => !a.isArchived && a.id !== dps.dpsAccountId && a.accountType === 'bank')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.institutionName})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setMatureModalDpsId(null)}
                        className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
                      >
                        Execute Maturity Settlement
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Open New DPS Modal */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Open Deposit Pension Scheme (DPS)</h3>
                <div className="text-xs text-slate-400 font-mono">Compound monthly recurring term deposit</div>
              </div>
              <button onClick={() => setIsOpenModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleOpenDps} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Institution Name</label>
                  <input
                    type="text"
                    placeholder="e.g. BRAC Bank PLC"
                    value={formInstitution}
                    onChange={(e) => setFormInstitution(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">DPS Account # / Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. DPS-2026-908"
                    value={formDpsNumber}
                    onChange={(e) => setFormDpsNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Source Funding Bank Account</label>
                <select
                  value={formSourceId}
                  onChange={(e) => setFormSourceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Funding Bank Account --</option>
                  {accounts.filter((a) => !a.isArchived && a.accountType === 'bank').map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.institutionName}) — ৳{getAccountBalance(a.id).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Monthly Installment (BDT)</label>
                  <input
                    type="number"
                    step="500"
                    placeholder="e.g. 10000"
                    value={formInstallment}
                    onChange={(e) => setFormInstallment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Tenure (Months)</label>
                  <select
                    value={formTenure}
                    onChange={(e) => setFormTenure(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="12">12 Months (1 Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                    <option value="36">36 Months (3 Years)</option>
                    <option value="60">60 Months (5 Years)</option>
                    <option value="84">84 Months (7 Years)</option>
                    <option value="120">120 Months (10 Years)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Tax Rate (%)</label>
                  <select
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="10.0">10% (With TIN/Tax Return)</option>
                    <option value="15.0">15% (Without Return Proof)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Live Maturity Preview Card */}
              {parsedInstallment > 0 && (
                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5">
                  <div className="text-[11px] font-semibold text-emerald-400">Live Mathematical Projection:</div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <div className="text-slate-500">Total Invested:</div>
                      <div className="text-white font-medium">৳{previewCalc.totalPrincipal.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Gross Compound:</div>
                      <div className="text-emerald-400 font-medium">৳{previewCalc.grossInterest.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Net Maturity Value:</div>
                      <div className="text-amber-400 font-bold">৳{previewCalc.netMaturityAmount.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1">
                    First installment will automatically be debited upon opening.
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
                >
                  Open DPS & Fund First Installment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
