import {
  simulateLoanPrepayment,
  PrepaymentSimulationInput,
} from '../src/lib/loan-prepayment-engine';
import { calculateReducingEmi } from '../src/lib/accounting-engine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('--- Testing Loan Prepayment Engine (FEAT-7) ---');

// 1. Standard EMI calculation test
const principal = 1_000_000; // 10 Lakhs BDT
const annualRate = 9; // 9%
const tenureMonths = 60; // 5 years

const emiCalc = calculateReducingEmi(principal, annualRate, tenureMonths);
const emi = emiCalc.emi;
console.log(`Calculated EMI for 10L @ 9% for 5Y: ৳${emi.toFixed(2)}`);
assert(Math.abs(emi - 20758.36) < 1, 'Standard reducing balance EMI should be ~20,758.36 BDT');

// 2. Baseline simulation without prepayment
const baselineInput: PrepaymentSimulationInput = {
  principal,
  annualInterestRatePct: annualRate,
  remainingTenureMonths: tenureMonths,
  monthlyExtraAmount: 0,
  lumpSumAmount: 0,
  lumpSumMonth: 1,
  strategy: 'reduce_tenure',
};

const baseline = simulateLoanPrepayment(baselineInput);
assert(baseline.comparison.monthsSaved === 0, 'Baseline months saved must be 0');
assert(baseline.comparison.interestSaved === 0, 'Baseline interest saved must be 0');
assert(baseline.newSummary.tenureMonths === 60, 'Baseline tenure must remain 60 months');
assert(baseline.schedule.length === 60, 'Baseline schedule length must be 60');

// 3. Monthly extra payment simulation (e.g. 5,000 extra per month)
const monthlyExtraInput: PrepaymentSimulationInput = {
  ...baselineInput,
  monthlyExtraAmount: 5000,
  strategy: 'reduce_tenure',
};

const withMonthlyExtra = simulateLoanPrepayment(monthlyExtraInput);
console.log(`With ৳5,000 extra/month:`);
console.log(`- New tenure: ${withMonthlyExtra.newSummary.tenureMonths} months (Saved ${withMonthlyExtra.comparison.monthsSaved} months / ${withMonthlyExtra.comparison.yearsSaved.toFixed(1)} years)`);
console.log(`- Interest saved: ৳${withMonthlyExtra.comparison.interestSaved.toFixed(2)} (${withMonthlyExtra.comparison.interestSavedPct.toFixed(1)}%)`);
console.log(`- Total payment: ৳${withMonthlyExtra.newSummary.totalPayment.toFixed(2)} vs Original ৳${withMonthlyExtra.originalSummary.totalPayment.toFixed(2)}`);

assert(withMonthlyExtra.newSummary.tenureMonths < 60, 'Tenure should be substantially reduced');
assert(withMonthlyExtra.comparison.monthsSaved > 10, 'Should save more than 10 months');
assert(withMonthlyExtra.comparison.interestSaved > 30000, 'Should save substantial interest (> 30,000 BDT)');
assert(withMonthlyExtra.newSummary.totalPayment < withMonthlyExtra.originalSummary.totalPayment, 'Total payment must be lower than original');

// 4. Lump-sum prepayment simulation (e.g. 200,000 BDT at month 12)
const lumpSumInput: PrepaymentSimulationInput = {
  ...baselineInput,
  monthlyExtraAmount: 0,
  lumpSumAmount: 200000,
  lumpSumMonth: 12,
  strategy: 'reduce_tenure',
};

const withLumpSum = simulateLoanPrepayment(lumpSumInput);
console.log(`With ৳200,000 lump sum at Month 12:`);
console.log(`- New tenure: ${withLumpSum.newSummary.tenureMonths} months (Saved ${withLumpSum.comparison.monthsSaved} months)`);
console.log(`- Interest saved: ৳${withLumpSum.comparison.interestSaved.toFixed(2)}`);

assert(withLumpSum.newSummary.tenureMonths < 60, 'Lump-sum tenure should be reduced');
assert(withLumpSum.comparison.interestSaved > 40000, 'Lump-sum interest savings must be significant');
const month12Schedule = withLumpSum.schedule.find(s => s.month === 12);
assert(month12Schedule?.extraPrepayment === 200000, 'Month 12 schedule must record 200k extra prepayment');

// 5. Strategy comparison: reduce_tenure vs reduce_emi
const reduceEmiInput: PrepaymentSimulationInput = {
  ...lumpSumInput,
  strategy: 'reduce_emi',
};

const withReduceEmi = simulateLoanPrepayment(reduceEmiInput);
console.log(`Strategy comparison with ৳200k lump sum:`);
console.log(`- Reduce Tenure: Interest saved = ৳${withLumpSum.comparison.interestSaved.toFixed(2)}, Months saved = ${withLumpSum.comparison.monthsSaved}`);
console.log(`- Reduce EMI: Interest saved = ৳${withReduceEmi.comparison.interestSaved.toFixed(2)}, New EMI after M12 = ৳${withReduceEmi.newSummary.monthlyEmi.toFixed(2)} (Original: ৳${emi.toFixed(2)})`);

assert(withReduceEmi.newSummary.monthlyEmi < emi, 'Reduce EMI strategy must lower monthly EMI');
assert(withReduceEmi.newSummary.tenureMonths === 60, 'Reduce EMI strategy must keep original tenure');
assert(withLumpSum.comparison.interestSaved >= withReduceEmi.comparison.interestSaved, 'Reduce tenure strategy must save at least as much or more interest than reduce EMI');

console.log('\n🎉 ALL LOAN PREPAYMENT TESTS PASSED SUCCESSFULLY!');
