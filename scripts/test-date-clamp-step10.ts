/**
 * STEP-10 verification: month-end schedules must clamp, not drift.
 * Run: npx tsx scripts/test-date-clamp-step10.ts
 */
import { addMonthsClamped, addDaysISO } from '../src/lib/date-utils';
import {
  generateLoanAmortizationSchedule,
  advanceRecurringDate,
} from '../src/lib/accounting-engine';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

// addMonthsClamped basics
assert(addMonthsClamped('2026-01-31', 1) === '2026-02-28', 'Jan 31 + 1mo = Feb 28');
assert(addMonthsClamped('2026-01-31', 2) === '2026-03-31', 'Jan 31 + 2mo = Mar 31 (no drift)');
assert(addMonthsClamped('2026-01-31', 3) === '2026-04-30', 'Jan 31 + 3mo = Apr 30');
assert(addMonthsClamped('2024-01-31', 1) === '2024-02-29', 'leap year Feb 29');
assert(addMonthsClamped('2026-11-15', 14) === '2028-01-15', 'year rollover');
assert(addDaysISO('2026-02-28', 1) === '2026-03-01', 'addDaysISO month rollover');

// Amortization schedule from a Jan-31 disbursement
const schedule = generateLoanAmortizationSchedule('loan-1', 120000, 12, 12, '2026-01-31', 'reducing');
assert(schedule[0].dueDate === '2026-02-28', 'EMI #1 due Feb 28');
assert(schedule[1].dueDate === '2026-03-31', 'EMI #2 due Mar 31');
assert(schedule[2].dueDate === '2026-04-30', 'EMI #3 due Apr 30');
assert(schedule[11].dueDate === '2027-01-31', 'EMI #12 due Jan 31 next year');

// Recurring monthly schedule anchored to the 31st recovers after February
const feb = advanceRecurringDate('2026-01-31', 'monthly', '2026-01-31');
const mar = advanceRecurringDate(feb, 'monthly', '2026-01-31');
assert(feb === '2026-02-28' && mar === '2026-03-31', `recurring: ${feb} -> ${mar} (anchor day restored)`);

console.log('\n🎉 ALL STEP-10 DATE CLAMP TESTS PASSED!');
