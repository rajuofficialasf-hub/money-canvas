import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { Loan, LoanType, LoanInterestMethod, LoanPaymentScheduleItem } from '../../types/accounting';
import { calculateReducingEmi, calculateFlatEmi } from '../../lib/accounting-engine';
import {
  FileSpreadsheet,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Percent,
  Layers,
  X,
  CreditCard,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

export const LoansView: React.FC = () => {
  const {
    loans,
    loanSchedules,
    accounts,
    accountBalances,
    getAccountBalance,
    createLoan,
    payLoanEmi,
  } = useLedger();

  const [selectedLoanId, setSelectedLoanId] = useState<string>(() => loans[0]?.id || '');
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<LoanPaymentScheduleItem | null>(null);

  // New Loan Form State
  const [institutionName, setInstitutionName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('home');
  const [interestMethod, setInterestMethod] = useState<LoanInterestMethod>('reducing');
  const [principal, setPrincipal] = useState<number | ''>(500000);
  const [annualInterestRate, setAnnualInterestRate] = useState<number | ''>(9.0);
  const [tenureMonths, setTenureMonths] = useState<number | ''>(12);
  const [disbursementAccountId, setDisbursementAccountId] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  // Payment Form State
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Liquid accounts for disbursement and EMI payment
  const liquidAccounts = accounts.filter(
    (a) => !a.isArchived && (a.accountType === 'bank' || a.accountType === 'cash' || a.accountType === 'mobile_wallet')
  );

  const selectedLoan = loans.find((l) => l.id === selectedLoanId) || loans[0];

  // Canonical account balance for the loan
  const getLoanCurrentBalance = (loan: Loan) => {
    const bal = accountBalances.find((b) => b.accountId === loan.loanAccountId);
    // Loan balances are negative in v_account_balances
    return bal ? Math.abs(bal.currentBalance) : loan.principal;
  };

  // Metrics
  const activeLoans = loans.filter((l) => l.status === 'active');
  const totalOutstandingPrincipal = activeLoans.reduce((sum, l) => sum + getLoanCurrentBalance(l), 0);
  const totalMonthlyCommitment = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);

  // Amortization Schedule for Selected Loan
  const currentLoanSchedule = loanSchedules
    .filter((s) => s.loanId === selectedLoan?.id)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  // Live EMI calculation in New Loan modal
  const numPrincipal = typeof principal === 'number' ? principal : 0;
  const numRate = typeof annualInterestRate === 'number' ? annualInterestRate : 0;
  const numTenure = typeof tenureMonths === 'number' ? tenureMonths : 0;

  const liveCalculation =
    numPrincipal > 0 && numRate > 0 && numTenure > 0
      ? interestMethod === 'reducing'
        ? calculateReducingEmi(numPrincipal, numRate, numTenure)
        : calculateFlatEmi(numPrincipal, numRate, numTenure)
      : { emi: 0, totalPayment: 0, totalInterest: 0 };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!institutionName.trim()) {
      setFormError('Please enter the lending bank or financial institution.');
      return;
    }
    if (numPrincipal <= 0) {
      setFormError('Please specify a positive loan principal amount.');
      return;
    }
    if (numRate <= 0) {
      setFormError('Please specify an annual interest rate.');
      return;
    }
    if (numTenure < 1) {
      setFormError('Tenure must be at least 1 month.');
      return;
    }
    if (!disbursementAccountId) {
      setFormError('Please choose the destination account for loan disbursement.');
      return;
    }

    const res = createLoan({
      institutionName: institutionName.trim(),
      loanType,
      interestMethod,
      rateType: 'fixed',
      principal: numPrincipal,
      annualInterestRate: numRate,
      tenureMonths: numTenure,
      disbursementAccountId,
      disbursementDate,
    });

    if (res.success && res.loan) {
      setSelectedLoanId(res.loan.id);
      setIsNewLoanModalOpen(false);
      setInstitutionName('');
      setPrincipal(500000);
      setAnnualInterestRate(9.0);
      setTenureMonths(12);
    } else {
      setFormError(res.error || 'Failed to create loan.');
    }
  };

  const handlePayEmiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInstallment || !selectedLoan) return;
    setPaymentError('');

    if (!paymentAccountId) {
      setPaymentError('Please select a payment account.');
      return;
    }

    const res = payLoanEmi(
      selectedLoan.id,
      payingInstallment.installmentNumber,
      paymentAccountId
    );

    if (res.success) {
      setPayingInstallment(null);
      setPaymentAccountId('');
    } else {
      setPaymentError(res.error || 'Failed to process EMI payment.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Bank Loans & EMI Amortization</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Loans & Mortgages
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Formal bank loans with reducing balance and flat EMI amortization schedules and double-entry interest splits.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            if (liquidAccounts.length > 0) setDisbursementAccountId(liquidAccounts[0].id);
            setIsNewLoanModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Bank Loan</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding Principal */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Outstanding Debt</span>
            <div className="h-6 w-6 rounded bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">
            ৳{totalOutstandingPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Canonical Liability Balance
          </div>
        </div>

        {/* Monthly EMI Commitment */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Monthly Commitment</span>
            <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ৳{totalMonthlyCommitment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Combined active monthly EMIs
          </div>
        </div>

        {/* Active Facilities */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Facilities</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              {activeLoans.length} Active
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {loans.length} Facilities
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {loans.filter((l) => l.status === 'paid_off').length} paid off completely
          </div>
        </div>
      </div>

      {/* Main Workspace: Loans Selector & Schedule Table */}
      {loans.length === 0 ? (
        <div className="p-12 text-center text-slate-500 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
          <Building2 className="h-8 w-8 mx-auto text-slate-600 stroke-[1.5]" />
          <div className="text-sm font-medium text-slate-400">No bank loans found</div>
          <div className="text-xs">
            Record a formal home, auto, or personal loan facility to generate its amortization schedule.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Loan Cards List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Credit Facilities ({loans.length})
            </div>

            <div className="space-y-2">
              {loans.map((loan) => {
                const isSelected = loan.id === selectedLoan?.id;
                const remaining = getLoanCurrentBalance(loan);
                const isPaidOff = loan.status === 'paid_off';

                return (
                  <div
                    key={loan.id}
                    onClick={() => setSelectedLoanId(loan.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-white">
                        {loan.institutionName}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                          isPaidOff
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isPaidOff ? 'Paid Off' : loan.loanType}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs font-mono">
                      <span className="text-slate-500">Remaining</span>
                      <span className="text-sm font-bold text-rose-400">
                        ৳{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/60">
                      <span>EMI: ৳{loan.emiAmount.toLocaleString()}</span>
                      <span>{loan.interestMethod.toUpperCase()} · {loan.annualInterestRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Schedule for Selected Loan */}
          <div className="lg:col-span-8 space-y-4">
            {selectedLoan && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden space-y-4 p-5">
                {/* Loan Overview Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{selectedLoan.institutionName}</span>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {selectedLoan.tenureMonths} Months
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Disbursed on {selectedLoan.disbursementDate} · Method: {selectedLoan.interestMethod} balance
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-500">Monthly EMI</div>
                    <div className="text-lg font-bold text-emerald-400">
                      ৳{selectedLoan.emiAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Amortization Schedule Table */}
                <div>
                  <div className="text-xs font-semibold text-white uppercase font-mono tracking-wider mb-2">
                    Amortization Schedule (Deterministic Lock)
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3">EMI Amount</th>
                          <th className="py-2.5 px-3">Principal</th>
                          <th className="py-2.5 px-3">Interest (Exp)</th>
                          <th className="py-2.5 px-3">Remaining</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                        {currentLoanSchedule.map((item) => {
                          const isPaid = item.status === 'paid';
                          return (
                            <tr
                              key={item.id}
                              className={`hover:bg-slate-800/30 transition-colors ${
                                isPaid ? 'opacity-80' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-300">
                                {item.installmentNumber}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {item.dueDate}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-white">
                                ৳{item.scheduledEmiAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-emerald-400">
                                ৳{item.scheduledPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-rose-400">
                                ৳{item.scheduledInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                ৳{item.remainingPrincipalAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3">
                                {isPaid ? (
                                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Paid</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] text-amber-400">
                                    <Clock className="h-3 w-3" />
                                    <span>Pending</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {!isPaid && (
                                  <button
                                    onClick={() => {
                                      setPayingInstallment(item);
                                      if (liquidAccounts.length > 0) setPaymentAccountId(liquidAccounts[0].id);
                                      setPaymentError('');
                                    }}
                                    className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
                                  >
                                    Pay EMI
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create New Loan */}
      {isNewLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                <span>New Credit Facility / Loan</span>
              </div>
              <button
                onClick={() => setIsNewLoanModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Lending Bank / Institution *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BRAC Bank Limited"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Facility Type
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as LoanType)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none capitalize"
                  >
                    <option value="home">Home Mortgage</option>
                    <option value="auto">Auto / Vehicle Loan</option>
                    <option value="personal">Personal Term Loan</option>
                    <option value="education">Education Loan</option>
                    <option value="business">Business / SME Loan</option>
                  </select>
                </div>
              </div>

              {/* Interest Method & Principal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Amortization Method
                  </label>
                  <select
                    value={interestMethod}
                    onChange={(e) => setInterestMethod(e.target.value as LoanInterestMethod)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="reducing">Reducing Balance (Compounded)</option>
                    <option value="flat">Flat Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Principal Amount (৳ BDT) *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    required
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Rate & Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Annual Interest Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    required
                    value={annualInterestRate}
                    onChange={(e) => setAnnualInterestRate(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Tenure (Months) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    required
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Disbursement Destination & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Disbursement Account (Cash Receipt) *
                  </label>
                  <select
                    value={disbursementAccountId}
                    onChange={(e) => setDisbursementAccountId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {liquidAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Disbursement Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Live Preview Calculation Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Computed Monthly EMI</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ৳{liveCalculation.emi.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Total Interest Payable</span>
                  <span className="text-rose-400">
                    ৳{liveCalculation.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Total Repayment Amount</span>
                  <span className="text-white">
                    ৳{liveCalculation.totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewLoanModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  Confirm & Disburse Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Pay Loan EMI */}
      {payingInstallment && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <span>Pay EMI #{payingInstallment.installmentNumber}</span>
              </div>
              <button
                onClick={() => setPayingInstallment(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handlePayEmiSubmit} className="space-y-4 text-xs font-sans">
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="text-slate-400">
                  Facility: <span className="text-white font-semibold">{selectedLoan.institutionName}</span>
                </div>
                <div className="text-slate-400">
                  Installment Due Date: <span className="text-slate-200">{payingInstallment.dueDate}</span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between">
                  <span className="text-slate-400">Principal Component:</span>
                  <span className="text-emerald-400 font-semibold">
                    ৳{payingInstallment.scheduledPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Interest Expense:</span>
                  <span className="text-rose-400 font-semibold">
                    ৳{payingInstallment.scheduledInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold">
                  <span className="text-white">Total Scheduled EMI:</span>
                  <span className="text-white text-xs">
                    ৳{payingInstallment.scheduledEmiAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Payment Account (Debit) *
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {liquidAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType}) — ৳{getAccountBalance(acc.id).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Posting will debit Bank for full EMI, credit Loan Account for Principal reduction, and credit Loan Interest Expense. Zero imbalance guaranteed.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingInstallment(null)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  Confirm & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
