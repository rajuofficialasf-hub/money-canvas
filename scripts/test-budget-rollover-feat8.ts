import {
  getPreviousMonth,
  getNextMonth,
  getLastNMonths,
  calculateBudgetRollover,
  computeSpendingTrendsAndInsights,
} from '../src/lib/budget-rollover-engine';
import { Budget, Category, Transaction, TransactionLine } from '../src/types/accounting';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('--- Testing Budget Rollover & Spending Insights Engine (FEAT-8) ---');

// 1. Month math edge cases
assert(getPreviousMonth('2026-09') === '2026-08', 'Previous month of 2026-09 is 2026-08');
assert(getPreviousMonth('2026-01') === '2025-12', 'Previous month of 2026-01 is 2025-12 (year boundary)');
assert(getNextMonth('2026-12') === '2027-01', 'Next month of 2026-12 is 2027-01 (year boundary)');

const last6 = getLastNMonths('2026-09', 6);
assert(last6.length === 6, 'Should return exactly 6 months');
assert(last6[0] === '2026-04' && last6[5] === '2026-09', '6 months range should be 2026-04 to 2026-09');

// 2. Budget Rollover calculations
const mockCategories: Category[] = [
  { id: 'cat-groceries', userId: 'u1', name: 'Groceries & Food', type: 'expense', color: '#10b981', isSystem: false },
  { id: 'cat-dining', userId: 'u1', name: 'Dining Out', type: 'expense', color: '#f59e0b', isSystem: false },
  { id: 'cat-utilities', userId: 'u1', name: 'Utilities & Bills', type: 'expense', color: '#3b82f6', isSystem: false },
];

const mockBudgets: Budget[] = [
  // August 2026 budgets
  {
    id: 'bgt-dining-aug',
    userId: 'u1',
    categoryId: 'cat-dining',
    monthYear: '2026-08',
    allocatedAmount: 10000,
    warningThresholdPct: 90,
    createdAt: '2026-08-01',
    rolloverEnabled: true,
  },
  {
    id: 'bgt-groceries-aug',
    userId: 'u1',
    categoryId: 'cat-groceries',
    monthYear: '2026-08',
    allocatedAmount: 15000,
    warningThresholdPct: 90,
    createdAt: '2026-08-01',
    rolloverEnabled: false,
  },
  // September 2026 budgets
  {
    id: 'bgt-dining-sep',
    userId: 'u1',
    categoryId: 'cat-dining',
    monthYear: '2026-09',
    allocatedAmount: 10000,
    warningThresholdPct: 90,
    createdAt: '2026-09-01',
    rolloverEnabled: true,
  },
  {
    id: 'bgt-groceries-sep',
    userId: 'u1',
    categoryId: 'cat-groceries',
    monthYear: '2026-09',
    allocatedAmount: 15000,
    warningThresholdPct: 90,
    createdAt: '2026-09-01',
    rolloverEnabled: false, // Opt-out
  },
];

// Mock spent function: in Aug, dining spent was 6,500 (surplus = 3,500)
// groceries spent was 16,000 (over budget)
const getSpent = (catId: string, monthYear: string) => {
  if (monthYear === '2026-08') {
    if (catId === 'cat-dining') return 6500;
    if (catId === 'cat-groceries') return 16000;
  }
  if (monthYear === '2026-09') {
    if (catId === 'cat-dining') return 4000;
    if (catId === 'cat-groceries') return 10000;
  }
  return 0;
};

// Case A: Dining has rollover enabled, surplus 3,500 from August
const diningSepBudget = mockBudgets.find(b => b.id === 'bgt-dining-sep')!;
const diningSummary = calculateBudgetRollover(diningSepBudget, mockBudgets, mockCategories, getSpent);

console.log('Dining Rollover Summary:');
console.log(`- Base: ৳${diningSummary.baseAllocation}`);
console.log(`- Carried Over: ৳${diningSummary.rolloverAmount} (from Aug surplus ৳${diningSummary.previousMonthSurplus})`);
console.log(`- Effective Limit: ৳${diningSummary.effectiveLimit}`);
console.log(`- Sep Spend: ৳${diningSummary.realizedSpend}, Remaining: ৳${diningSummary.remainingSafeMargin}`);

assert(diningSummary.rolloverEnabled === true, 'Dining rollover should be enabled');
assert(diningSummary.rolloverAmount === 3500, 'Dining rollover amount should be 3,500 BDT');
assert(diningSummary.effectiveLimit === 13500, 'Dining effective limit should be 10,000 + 3,500 = 13,500 BDT');
assert(diningSummary.remainingSafeMargin === 9500, 'Dining remaining margin should be 13,500 - 4,000 = 9,500 BDT');

// Case B: Groceries has rollover disabled
const grocSepBudget = mockBudgets.find(b => b.id === 'bgt-groceries-sep')!;
const grocSummary = calculateBudgetRollover(grocSepBudget, mockBudgets, mockCategories, getSpent);
assert(grocSummary.rolloverEnabled === false, 'Groceries rollover should be disabled');
assert(grocSummary.rolloverAmount === 0, 'Disabled rollover amount must be 0');
assert(grocSummary.effectiveLimit === 15000, 'Effective limit should equal base allocation');

// 3. Spending Trends & Insights Analytics
const mockTransactions: Transaction[] = [
  { id: 'tx-1', userId: 'u1', date: '2026-08-10', type: 'expense', status: 'posted', version: 1, note: 'Aug Dining', createdBy: 'u1', createdAt: '2026-08-10', updatedAt: '2026-08-10' },
  { id: 'tx-2', userId: 'u1', date: '2026-08-15', type: 'expense', status: 'posted', version: 1, note: 'Aug Groceries', createdBy: 'u1', createdAt: '2026-08-15', updatedAt: '2026-08-15' },
  { id: 'tx-3', userId: 'u1', date: '2026-09-05', type: 'expense', status: 'posted', version: 1, note: 'Sep Dining', createdBy: 'u1', createdAt: '2026-09-05', updatedAt: '2026-09-05' },
  { id: 'tx-4', userId: 'u1', date: '2026-09-12', type: 'expense', status: 'posted', version: 1, note: 'Sep Groceries', createdBy: 'u1', createdAt: '2026-09-12', updatedAt: '2026-09-12' },
];

const mockLines: TransactionLine[] = [
  { id: 'l1', transactionId: 'tx-1', lineType: 'category', categoryId: 'cat-dining', amount: 6500, createdAt: '2026-08-10' },
  { id: 'l2', transactionId: 'tx-2', lineType: 'category', categoryId: 'cat-groceries', amount: 16000, createdAt: '2026-08-15' },
  { id: 'l3', transactionId: 'tx-3', lineType: 'category', categoryId: 'cat-dining', amount: 4000, createdAt: '2026-09-05' },
  { id: 'l4', transactionId: 'tx-4', lineType: 'category', categoryId: 'cat-groceries', amount: 10000, createdAt: '2026-09-12' },
];

const analytics = computeSpendingTrendsAndInsights(
  mockCategories,
  mockTransactions,
  mockLines,
  mockBudgets,
  '2026-09',
  6
);

console.log('\n6-Month Analytics Results:');
console.log(`- 6-Month Data Points: ${analytics.monthlyData.length}`);
console.log(`- Category Metrics: ${analytics.categoryMetrics.length}`);
console.log(`- Total Tracked Outflow: ৳${analytics.overallStats.totalTrackedSpend}`);
console.log(`- Insights Generated: ${analytics.insights.length}`);
analytics.insights.forEach(ins => console.log(`  💡 [${ins.type.toUpperCase()}] ${ins.title}: ${ins.description}`));

assert(analytics.monthlyData.length === 6, 'Should generate 6 monthly trend data points');
assert(analytics.overallStats.totalTrackedSpend === 36500, 'Total tracked spend should be 6500+16000+4000+10000 = 36,500');

// Dining went from 6,500 in Aug to 4,000 in Sep -> MoM reduction
const diningMetric = analytics.categoryMetrics.find(m => m.categoryId === 'cat-dining')!;
assert(diningMetric.trendDirection === 'decreasing', 'Dining trend should be decreasing');
assert(diningMetric.momChangePct < 0, 'Dining MoM % change should be negative');

// Insights test
assert(analytics.insights.length > 0, 'Must generate at least one financial insight');

console.log('\n🎉 ALL BUDGET ROLLOVER & SPENDING INSIGHTS TESTS PASSED!');
