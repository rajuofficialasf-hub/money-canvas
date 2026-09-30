import { describe, it, expect } from 'vitest';
import {
  validateTransactionPosting,
  generateIncomeStatementReport,
  generateLoanAmortizationSchedule,
  advanceRecurringDate,
  computeStockHoldings,
  calculateCapitalGainsTaxSummary,
} from '../accounting-engine';
import type {
  Transaction,
  TransactionLine,
  Category,
  Stock,
  StockTransaction,
} from '../../types/accounting';

const tx = (id: string, type: string, date = '2026-05-10'): Transaction =>
  ({
    id,
    userId: 'u1',
    date,
    type,
    status: 'posted',
    version: 1,
    createdAt: date,
    updatedAt: date,
  }) as unknown as Transaction;

const line = (
  txId: string,
  lineType: 'account' | 'category',
  amount: number,
  categoryId?: string
): TransactionLine =>
  ({
    id: `${txId}-${lineType}-${amount}`,
    transactionId: txId,
    lineType,
    accountId: lineType === 'account' ? 'acc-1' : null,
    categoryId: categoryId || null,
    amount,
    createdAt: '2026-05-10',
  }) as unknown as TransactionLine;

describe('validateTransactionPosting (sum-to-zero)', () => {
  it('accepts a balanced expense (account -2000, category +2000)', () => {
    const t = tx('t1', 'expense');
    const res = validateTransactionPosting(t, [
      line('t1', 'account', -2000),
      line('t1', 'category', 2000, 'cat-exp'),
    ]);
    expect(res.valid).toBe(true);
  });

  it('rejects an unbalanced expense', () => {
    const t = tx('t2', 'expense');
    const res = validateTransactionPosting(t, [
      line('t2', 'account', -2000),
      line('t2', 'category', 1500, 'cat-exp'),
    ]);
    expect(res.valid).toBe(false);
  });

  it('rejects a transfer with category lines', () => {
    const t = tx('t3', 'transfer');
    const res = validateTransactionPosting(t, [
      line('t3', 'account', -500),
      line('t3', 'category', 500, 'cat-exp'),
    ]);
    expect(res.valid).toBe(false);
  });
});

describe('generateIncomeStatementReport (STEP-6 convention)', () => {
  const categories = [
    { id: 'cat-inc', name: 'Salary', type: 'income' },
    { id: 'cat-exp', name: 'Groceries', type: 'expense' },
  ] as unknown as Category[];

  it('treats a negative income category line as gross income, not an offset', () => {
    const transactions = [tx('ti', 'income'), tx('te', 'expense')];
    const lines = [
      line('ti', 'account', 50000),
      line('ti', 'category', -50000, 'cat-inc'),
      line('te', 'account', -2000),
      line('te', 'category', 2000, 'cat-exp'),
    ];
    const report = generateIncomeStatementReport(transactions, lines, categories);
    expect(report.totalIncome).toBe(50000);
    expect(report.totalExpenses).toBe(2000);
    expect(report.netSurplus).toBe(48000);
  });

  it('treats a positive income category line as a refund offset', () => {
    const transactions = [tx('ti', 'income'), tx('tr', 'income')];
    const lines = [
      line('ti', 'account', 50000),
      line('ti', 'category', -50000, 'cat-inc'),
      line('tr', 'account', -5000),
      line('tr', 'category', 5000, 'cat-inc'),
    ];
    const report = generateIncomeStatementReport(transactions, lines, categories);
    expect(report.totalIncome).toBe(45000);
  });
});

describe('generateLoanAmortizationSchedule (STEP-10 month-end clamp)', () => {
  it('clamps a Jan-31 disbursement without drifting', () => {
    const schedule = generateLoanAmortizationSchedule('l1', 120000, 12, 12, '2026-01-31', 'reducing');
    expect(schedule[0].dueDate).toBe('2026-02-28');
    expect(schedule[1].dueDate).toBe('2026-03-31');
    expect(schedule[2].dueDate).toBe('2026-04-30');
    expect(schedule[11].dueDate).toBe('2027-01-31');
  });

  it('pays off the full principal', () => {
    const schedule = generateLoanAmortizationSchedule('l2', 100000, 10, 6, '2026-03-15', 'reducing');
    const principalSum = schedule.reduce((s, i) => s + i.scheduledPrincipal, 0);
    expect(Math.abs(principalSum - 100000)).toBeLessThan(1);
  });
});

describe('advanceRecurringDate (anchor day restore)', () => {
  it('recovers to the 31st after passing through February', () => {
    const feb = advanceRecurringDate('2026-01-31', 'monthly', '2026-01-31');
    const mar = advanceRecurringDate(feb, 'monthly', '2026-01-31');
    expect(feb).toBe('2026-02-28');
    expect(mar).toBe('2026-03-31');
  });
});

const stocks = [
  { id: 's1', symbol: 'GP', companyName: 'Grameenphone', currentPrice: 200 },
] as unknown as Stock[];

const trade = (
  id: string,
  type: 'buy' | 'sell',
  qty: number,
  price: number,
  date: string
): StockTransaction =>
  ({
    id,
    stockId: 's1',
    brokerAccountId: 'bo-1',
    transactionType: type,
    quantity: qty,
    price,
    grossValue: qty * price,
    commission: 0,
    tax: 0,
    otherCharges: 0,
    netValue: type === 'buy' ? qty * price : qty * price,
    tradeDate: date,
  }) as unknown as StockTransaction;

describe('computeStockHoldings (STEP-7 WAC on sell)', () => {
  it('buy 100@100 → sell 100@120 → buy 100@200 leaves WAC = 200', () => {
    // Deliberately newest-first order to prove chronological sorting
    const trades = [
      trade('t3', 'buy', 100, 200, '2026-03-01'),
      trade('t2', 'sell', 100, 120, '2026-02-01'),
      trade('t1', 'buy', 100, 100, '2026-01-01'),
    ];
    const holdings = computeStockHoldings(trades, stocks);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].quantity).toBe(100);
    expect(holdings[0].weightedAverageCost).toBe(200);
  });
});

describe('calculateCapitalGainsTaxSummary (buy-sell-rebuy + FY filter)', () => {
  it('computes realized gain from WAC at time of sale', () => {
    const trades = [
      trade('t1', 'buy', 100, 100, '2025-07-10'),
      trade('t2', 'sell', 100, 120, '2025-08-10'),
      trade('t3', 'buy', 100, 200, '2025-09-10'),
    ];
    const summary = calculateCapitalGainsTaxSummary(trades, stocks, [], 0, '2025-2026');
    expect(summary.gainItems).toHaveLength(1);
    expect(summary.gainItems[0].realizedGainLoss).toBe(2000);
  });

  it('only reports sells inside the requested fiscal year window', () => {
    const trades = [
      trade('t1', 'buy', 100, 100, '2025-01-10'),
      trade('t2', 'sell', 50, 120, '2025-05-10'), // FY 2024-2025
      trade('t3', 'sell', 50, 130, '2026-08-10'), // FY 2026-2027
    ];
    const summary = calculateCapitalGainsTaxSummary(trades, stocks, [], 0, '2026-2027');
    expect(summary.gainItems).toHaveLength(1);
    expect(summary.gainItems[0].tradeDate).toBe('2026-08-10');
    expect(summary.gainItems[0].realizedGainLoss).toBe(1500);
  });
});
