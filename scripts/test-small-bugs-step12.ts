/**
 * STEP-12 verification: 4 small accounting bugs.
 * Run: npx tsx scripts/test-small-bugs-step12.ts
 */
import { calculatePreMatureEncashment } from '../src/lib/sanchaya-bond-engine';
import { calculateCapitalGainsTaxSummary, generateBalanceSheetReport } from '../src/lib/accounting-engine';
import { calculateMemberFinancialSummaries } from '../src/lib/family-ledger-engine';
import type { StockTransaction, Stock, Debt, AccountBalanceView } from '../src/types/accounting';
import type { SanchayaBondItem } from '../src/types/sanchaya-bond';
import type { FamilyMember, FamilyExpense } from '../src/types/family-ledger';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

// ক) at_maturity early encashment must pay principal + reduced-rate profit
const bond = {
  id: 'sb-1', title: '5Y Bangladesh Sanchayapatra', category: 'sanchayapatra',
  schemeType: 'five_year', principalAmount: 100000, interestRate: 11.28,
  tenureYears: 5, purchaseDate: '2024-01-15', maturityDate: '2029-01-15',
  payoutFrequency: 'at_maturity', taxDeductionRate: 10, status: 'active',
  totalProfitReceivedToDate: 0,
} as unknown as SanchayaBondItem;
const enc = calculatePreMatureEncashment(bond, '2026-03-15', false);
assert(enc.completedYears === 2, `completedYears leap-safe: ${enc.completedYears}`);
assert(enc.totalProfitPayable > 0, `reduced-rate profit computed: ${enc.totalProfitPayable}`);
assert(
  Math.abs(enc.netPayableAtCounter - (100000 + enc.totalProfitPayable)) < 0.01,
  `at_maturity payout includes reduced profit: ${enc.netPayableAtCounter}`
);

// leap-year boundary: purchased Feb 29 leap year, encash Feb 28 next year => 0 years
const leapBond = { ...bond, purchaseDate: '2024-02-29' } as unknown as SanchayaBondItem;
const leapEnc = calculatePreMatureEncashment(leapBond, '2025-02-27', false);
assert(leapEnc.completedYears === 0, `Feb 29 anchor, one day short: ${leapEnc.completedYears} years`);

// খ) capital gains summary must only include sells inside the fiscal year
const stocks = [{ id: 's1', symbol: 'GP', companyName: 'Grameenphone' }] as unknown as Stock[];
const trades = [
  { id: 't1', stockId: 's1', transactionType: 'buy', quantity: 100, price: 100, grossValue: 10000, commission: 0, tax: 0, otherCharges: 0, tradeDate: '2025-01-10' },
  { id: 't2', stockId: 's1', transactionType: 'sell', quantity: 50, price: 120, grossValue: 6000, commission: 0, tax: 0, otherCharges: 0, tradeDate: '2025-05-10' }, // FY 2024-2025
  { id: 't3', stockId: 's1', transactionType: 'sell', quantity: 50, price: 130, grossValue: 6500, commission: 0, tax: 0, otherCharges: 0, tradeDate: '2026-08-10' }, // FY 2026-2027
] as unknown as StockTransaction[];
const fy = calculateCapitalGainsTaxSummary(trades, stocks, [], 0, '2026-2027');
const items = fy.gainItems;
assert(items.length === 1 && items[0].tradeDate === '2026-08-10', `FY filter keeps only in-window sell: ${items.length}`);
assert(items[0].realizedGainLoss === 1500, `WAC still correct across all history: ${items[0].realizedGainLoss}`);

// গ) balance sheet uses remaining debt balance, no double counting
const accounts = [
  { accountId: 'a-bank', accountName: 'Bank', accountType: 'bank', currentBalance: 50000 },
  { accountId: 'a-rec', accountName: 'Receivable: Karim', accountType: 'receivable', currentBalance: 3000 },
] as unknown as AccountBalanceView[];
const debts = [
  { id: 'd1', linkedAccountId: 'a-rec', personName: 'Karim', direction: 'lent', initialAmount: 10000, status: 'active' },
] as unknown as Debt[];
const bs = generateBalanceSheetReport(accounts, [], [], debts);
assert(bs.totalCurrentAssets === 53000, `receivable counted once at remaining balance: ${bs.totalCurrentAssets}`);

// ঘ) family allowance scoped to the selected month
const members = [{
  id: 'm1', name: 'Rahim', role: 'member', relation: 'son', monthlyAllowance: 5000,
  permissions: { canAddExpenses: true, canEditMasterBudget: false, canApproveExpenses: false, canManageMembers: false },
}] as unknown as FamilyMember[];
const expenses = [
  { id: 'e1', monthYear: '2026-08', date: '2026-08-10', amount: 4000, paidByMemberId: 'm1', status: 'approved', paidFromPersonalPocket: false, isReimbursed: false, categoryKey: 'food' },
  { id: 'e2', monthYear: '2026-09', date: '2026-09-10', amount: 1000, paidByMemberId: 'm1', status: 'approved', paidFromPersonalPocket: false, isReimbursed: false, categoryKey: 'food' },
] as unknown as FamilyExpense[];
const summaries = calculateMemberFinancialSummaries(members, expenses, [], '2026-09');
assert(summaries[0].allowanceSpent === 1000, `allowance spent scoped to month: ${summaries[0].allowanceSpent}`);
assert(summaries[0].allowanceRemaining === 4000, `allowance remaining: ${summaries[0].allowanceRemaining}`);

console.log('\n🎉 ALL STEP-12 SMALL BUG TESTS PASSED!');
