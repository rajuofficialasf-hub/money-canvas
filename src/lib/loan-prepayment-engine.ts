import { toLocalISO } from './date-utils';
/**
 * Money Canvas — Loan Prepayment & Early Payoff Simulator Engine (FEAT-7)
 *
 * Mathematically simulates:
 * 1. Monthly Recurring Extra Payments (e.g. paying ৳5,000 extra per month)
 * 2. One-Time Lump-Sum Prepayments (e.g. ৳2,00,000 bonus at Month M)
 * 3. Prepayment Strategies:
 *    - Reduce Tenure (Keep EMI constant, eliminate future months, maximize interest savings)
 *    - Reduce EMI (Recalculate lower monthly EMI over remaining tenure)
 *
 * Fully compliant with Reducing Balance loan amortization standards.
 */

import { round2, calculateReducingEmi } from './accounting-engine';

export type PrepaymentStrategy = 'reduce_tenure' | 'reduce_emi';

export interface PrepaymentSimulationInput {
  principal: number; // Current remaining principal balance
  annualInterestRatePct: number; // e.g. 9.5
  remainingTenureMonths: number; // e.g. 120
  currentEmi?: number; // Optional existing EMI, otherwise computed
  monthlyExtraAmount?: number; // e.g. 5000
  lumpSumAmount?: number; // e.g. 200000
  lumpSumMonth?: number; // month at which lump-sum occurs (1-based, e.g. 6)
  strategy: PrepaymentStrategy;
  startDate?: string; // ISO date 'YYYY-MM-DD', default today
}

export interface SimulationScheduleMonth {
  month: number;
  dueDate: string;
  beginningBalance: number;
  scheduledEmi: number;
  extraPrepayment: number;
  totalPayment: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
}

export interface LoanPrepaymentResult {
  originalSummary: {
    tenureMonths: number;
    monthlyEmi: number;
    totalInterest: number;
    totalPayment: number;
    payoffDate: string;
  };
  newSummary: {
    tenureMonths: number;
    monthlyEmi: number;
    totalInterest: number;
    totalPrepaymentPaid: number;
    totalPayment: number;
    payoffDate: string;
  };
  comparison: {
    interestSaved: number;
    interestSavedPct: number;
    monthsSaved: number;
    yearsSaved: number;
    effectiveReturnPct: number;
  };
  schedule: SimulationScheduleMonth[];
}

/**
 * Simulates loan amortization with optional monthly extra payments and lump-sum prepayment.
 */
export function simulateLoanPrepayment(input: PrepaymentSimulationInput): LoanPrepaymentResult {
  const principal = Math.max(0, input.principal);
  const annualRate = Math.max(0.01, input.annualInterestRatePct);
  const tenureMonths = Math.max(1, Math.round(input.remainingTenureMonths));
  const monthlyRate = annualRate / 100 / 12;

  const monthlyExtra = Math.max(0, input.monthlyExtraAmount || 0);
  const lumpSum = Math.max(0, input.lumpSumAmount || 0);
  const lumpSumMonth = Math.max(1, Math.round(input.lumpSumMonth || 1));
  const strategy = input.strategy;

  const startDate = input.startDate ? new Date(input.startDate) : new Date();

  // 1. Calculate Baseline (Original Schedule without Prepayment)
  const baseEmiCalc = calculateReducingEmi(principal, annualRate, tenureMonths);
  const baseEmi = input.currentEmi && input.currentEmi > 0 ? input.currentEmi : baseEmiCalc.emi;

  let origBalance = principal;
  let origTotalInterest = 0;
  for (let m = 1; m <= tenureMonths; m++) {
    const interest = round2(origBalance * monthlyRate);
    const principalPortion = round2(Math.min(origBalance, baseEmi - interest));
    origTotalInterest = round2(origTotalInterest + interest);
    origBalance = round2(Math.max(0, origBalance - principalPortion));
    if (origBalance <= 0) break;
  }
  const origTotalPayment = round2(principal + origTotalInterest);

  const origPayoffDate = new Date(startDate);
  origPayoffDate.setMonth(origPayoffDate.getMonth() + tenureMonths);

  // 2. Simulate Prepayment Schedule
  const schedule: SimulationScheduleMonth[] = [];
  let remainingPrincipal = principal;
  let currentEmi = baseEmi;
  let totalInterestNew = 0;
  let totalPrepaymentNew = 0;
  let simulatedMonths = 0;

  const maxMonths = tenureMonths + 12; // safety bound

  for (let m = 1; m <= maxMonths; m++) {
    if (remainingPrincipal <= 0.01) break;

    simulatedMonths = m;
    const beginningBalance = remainingPrincipal;

    // Monthly interest
    const interest = round2(remainingPrincipal * monthlyRate);

    // Determine extra prepayment for this month
    let extra = monthlyExtra;
    if (m === lumpSumMonth && lumpSum > 0) {
      extra = round2(extra + lumpSum);
    }

    // Regular principal portion
    let regularPrincipal = round2(currentEmi - interest);
    if (regularPrincipal > remainingPrincipal) {
      regularPrincipal = remainingPrincipal;
      extra = 0;
    }

    // Extra principal payment
    let extraPrincipal = extra;
    if (regularPrincipal + extraPrincipal > remainingPrincipal) {
      extraPrincipal = round2(Math.max(0, remainingPrincipal - regularPrincipal));
    }

    const totalPrincipalPaid = round2(regularPrincipal + extraPrincipal);
    const scheduledEmiAmount = round2(regularPrincipal + interest);
    const totalMonthPayment = round2(scheduledEmiAmount + extraPrincipal);
    const endingBalance = round2(Math.max(0, remainingPrincipal - totalPrincipalPaid));

    totalInterestNew = round2(totalInterestNew + interest);
    totalPrepaymentNew = round2(totalPrepaymentNew + extraPrincipal);

    const monthDueDate = new Date(startDate);
    monthDueDate.setMonth(monthDueDate.getMonth() + m);

    schedule.push({
      month: m,
      dueDate: toLocalISO(monthDueDate),
      beginningBalance,
      scheduledEmi: scheduledEmiAmount,
      extraPrepayment: extraPrincipal,
      totalPayment: totalMonthPayment,
      principalPaid: totalPrincipalPaid,
      interestPaid: interest,
      endingBalance,
    });

    remainingPrincipal = endingBalance;

    // If strategy is "reduce_emi", recalculate future EMI after extra payment
    if (strategy === 'reduce_emi' && extraPrincipal > 0 && remainingPrincipal > 0) {
      const remainingMonths = Math.max(1, tenureMonths - m);
      const recalculated = calculateReducingEmi(remainingPrincipal, annualRate, remainingMonths);
      currentEmi = recalculated.emi;
    }
  }

  const newTotalPayment = round2(principal + totalInterestNew);
  const interestSaved = round2(Math.max(0, origTotalInterest - totalInterestNew));
  const interestSavedPct = origTotalInterest > 0 ? round2((interestSaved / origTotalInterest) * 100) : 0;
  const monthsSaved = Math.max(0, tenureMonths - simulatedMonths);
  const yearsSaved = round2(monthsSaved / 12);

  const newPayoffDate = new Date(startDate);
  newPayoffDate.setMonth(newPayoffDate.getMonth() + simulatedMonths);

  // Effective risk-free return of prepayment equals annual loan interest rate
  const effectiveReturnPct = annualRate;

  return {
    originalSummary: {
      tenureMonths,
      monthlyEmi: baseEmi,
      totalInterest: origTotalInterest,
      totalPayment: origTotalPayment,
      payoffDate: toLocalISO(origPayoffDate),
    },
    newSummary: {
      tenureMonths: simulatedMonths,
      monthlyEmi: currentEmi,
      totalInterest: totalInterestNew,
      totalPrepaymentPaid: totalPrepaymentNew,
      totalPayment: newTotalPayment,
      payoffDate: toLocalISO(newPayoffDate),
    },
    comparison: {
      interestSaved,
      interestSavedPct,
      monthsSaved,
      yearsSaved,
      effectiveReturnPct,
    },
    schedule,
  };
}
