/**
 * Personal Finance & Investment Manager — Authoritative Accounting Engine
 * Implements deterministic calculation rules matching PostgreSQL views & stored functions.
 */

import {
  Account,
  AccountBalanceView,
  BrokerAccount,
  BrokerCashTransaction,
  BrokerCashBalance,
  LoanInterestMethod,
  LoanPaymentScheduleItem,
  NetWorthView,
  NisabBasis,
  Stock,
  StockHolding,
  StockHoldingView,
  StockTransaction,
  Transaction,
  TransactionLine,
  ZakatCalculationResult,
  StockPriceHistory,
  BenchmarkIndexPrice,
  PortfolioSnapshot,
  PortfolioCashFlow,
  TwrSubPeriod,
  BenchmarkComparisonPoint,
  PortfolioPerformanceMetrics,
  CapitalGainItem,
  CapitalGainsTaxSummary,
  TaxLossHarvestItem,
  SectorAllocationItem,
  SectorAllocationSummary,
  BalanceSheetReport,
  IncomeStatementReport,
  IncomeStatementCategory,
  Category,
  Dividend,
  Debt,
} from '../types/accounting';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function round4(num: number): number {
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

/**
 * Derives current account balances (equivalent to v_account_balances SQL view).
 * ONLY posted transactions with line_type = 'account' contribute to balance.
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  lines: TransactionLine[]
): AccountBalanceView[] {
  const postedTxIds = new Set(
    transactions.filter((t) => t.status === 'posted').map((t) => t.id)
  );

  const balanceMap = new Map<string, number>();
  for (const acc of accounts) {
    balanceMap.set(acc.id, 0);
  }

  for (const line of lines) {
    if (line.lineType === 'account' && line.accountId && postedTxIds.has(line.transactionId)) {
      const current = balanceMap.get(line.accountId) || 0;
      balanceMap.set(line.accountId, round2(current + line.amount));
    }
  }

  return accounts.map((acc) => ({
    accountId: acc.id,
    accountName: acc.name,
    accountType: acc.accountType,
    currency: acc.currency,
    currentBalance: balanceMap.get(acc.id) || 0,
  }));
}

/**
 * Derives broker cash balance (equivalent to v_broker_cash_balance SQL view).
 */
export function calculateBrokerCashBalance(
  cashTransactions: BrokerCashTransaction[]
): number {
  const total = cashTransactions.reduce((acc, row) => acc + row.amountSigned, 0);
  return round2(total);
}

export interface TradeInput {
  transactionType: 'buy' | 'sell';
  stockId: string;
  quantity: number;
  price: number;
  grossValue: number;
  commission: number;
  tax: number;
  otherCharges: number;
}

/**
 * Computes stock holdings and Weighted Average Cost basis (v_stock_holdings view).
 * Buy cost includes all acquisition charges. Sell proceeds subtract charges.
 */
export function calculateStockHoldings(
  stocks: Stock[],
  trades: TradeInput[]
): StockHoldingView[] {
  const stockMap = new Map<string, Stock>(stocks.map((s) => [s.id, s]));
  const positions = new Map<
    string,
    { remainingShares: number; totalBuyCostBasis: number; totalBuyShares: number }
  >();

  // STEP-7: Sort trades by date ascending so buys accumulate before sells are processed
  const sortedTrades = [...trades].sort((a, b) => {
    // TradeInput may not have tradeDate; preserve original order if missing
    const dateA = (a as any).tradeDate;
    const dateB = (b as any).tradeDate;
    if (dateA && dateB) return dateA.localeCompare(dateB);
    return 0;
  });

  for (const trade of sortedTrades) {
    let pos = positions.get(trade.stockId);
    if (!pos) {
      pos = { remainingShares: 0, totalBuyCostBasis: 0, totalBuyShares: 0 };
      positions.set(trade.stockId, pos);
    }

    if (trade.transactionType === 'buy') {
      const buyCostBasis = trade.grossValue + trade.commission + trade.tax + trade.otherCharges;
      pos.remainingShares += trade.quantity;
      pos.totalBuyCostBasis += buyCostBasis;
      pos.totalBuyShares += trade.quantity;
    } else {
      // STEP-7: Deduct sold cost basis (WAC × qty) from remaining cost
      const wac = pos.totalBuyShares > 0 ? pos.totalBuyCostBasis / pos.totalBuyShares : 0;
      const soldCostBasis = round2(trade.quantity * wac);
      pos.remainingShares -= trade.quantity;
      pos.totalBuyCostBasis = Math.max(0, round2(pos.totalBuyCostBasis - soldCostBasis));
      pos.totalBuyShares = Math.max(0, pos.totalBuyShares - trade.quantity);
    }
  }

  const result: StockHoldingView[] = [];
  for (const [stockId, pos] of positions.entries()) {
    if (pos.remainingShares > 0) {
      const stock = stockMap.get(stockId);
      if (!stock) continue;

      const wac = pos.totalBuyShares > 0 ? pos.totalBuyCostBasis / pos.totalBuyShares : 0;
      const investedVal = round2(pos.remainingShares * wac);
      const marketVal = round2(pos.remainingShares * stock.currentPrice);
      const unrealized = round2(marketVal - investedVal);
      const returnPct = investedVal > 0 ? round2((unrealized / investedVal) * 100) : 0;

      result.push({
        stockId,
        symbol: stock.symbol,
        companyName: stock.companyName,
        sector: stock.sector,
        quantity: pos.remainingShares,
        weightedAverageCost: round4(wac),
        currentMarketPrice: stock.currentPrice,
        investedValue: investedVal,
        marketValue: marketVal,
        unrealizedPl: unrealized,
        returnPercent: returnPct,
      });
    }
  }

  return result;
}

/**
 * Authoritative Net Worth Calculation (v_net_worth view).
 * Net Worth = SUM(all canonical account balances) + Broker Cash + Stock Holdings MV.
 * Liability balances are already stored as negative numbers; NEVER subtract again.
 */
export function calculateNetWorth(
  accountBalances: AccountBalanceView[],
  brokerCash: number,
  stockHoldings: StockHoldingView[]
): NetWorthView {
  const accountsBalance = round2(
    accountBalances.reduce((sum, acc) => sum + acc.currentBalance, 0)
  );
  const stockMarketValue = round2(
    stockHoldings.reduce((sum, h) => sum + h.marketValue, 0)
  );
  const netWorth = round2(accountsBalance + brokerCash + stockMarketValue);

  return {
    accountsBalance,
    brokerCash: round2(brokerCash),
    stockMarketValue,
    netWorth,
  };
}

/**
 * Validates posted transaction invariant formulas.
 */
export function validateTransactionPosting(
  transaction: Transaction,
  lines: TransactionLine[]
): { valid: boolean; reason?: string } {
  const accountLines = lines.filter((l) => l.lineType === 'account');
  const categoryLines = lines.filter((l) => l.lineType === 'category');

  const accountSum = round2(accountLines.reduce((sum, l) => sum + l.amount, 0));
  const categorySum = round2(categoryLines.reduce((sum, l) => sum + l.amount, 0));

  switch (transaction.type) {
    case 'transfer':
    case 'cc_payment':
    case 'loan_disbursement':
    case 'person_lend':
    case 'person_borrow':
    case 'debt_settlement':
    case 'fd_open': {
      if (categoryLines.length > 0) {
        return { valid: false, reason: 'Pure asset/liability transfers cannot have category lines.' };
      }
      if (accountSum !== 0) {
        return { valid: false, reason: `Account lines must sum to 0.00. Current sum is ${accountSum}.` };
      }
      return { valid: true };
    }

    case 'asset_purchase': {
      // Invariant: Account lines + any category fees must sum to 0.00
      if (round2(accountSum + categorySum) !== 0) {
        return {
          valid: false,
          reason: `Asset purchase invariant violated: Total sum (${round2(accountSum + categorySum)}) must equal 0.00.`,
        };
      }
      return { valid: true };
    }

    case 'expense':
    case 'split_expense':
    case 'cc_purchase':
    case 'zakat_payment': {
      // Invariant: AccountSum + CategorySum == 0 (e.g. Account -2000, Category +2000)
      if (round2(accountSum + categorySum) !== 0) {
        return {
          valid: false,
          reason: `Expense invariant violated: Account sum (${accountSum}) + Category sum (${categorySum}) must equal 0.00.`,
        };
      }
      return { valid: true };
    }

    case 'income': {
      // Invariant: AccountSum + CategorySum == 0 (e.g. Account +20000, Category -20000)
      if (round2(accountSum + categorySum) !== 0) {
        return {
          valid: false,
          reason: `Income invariant violated: Account sum (${accountSum}) + Category sum (${categorySum}) must equal 0.00.`,
        };
      }
      return { valid: true };
    }

    case 'loan_emi': {
      // e.g. Bank -10000, Loan +8000, Interest Category +2000 => -10000 + 8000 + 2000 = 0
      if (round2(accountSum + categorySum) !== 0) {
        return {
          valid: false,
          reason: `Loan EMI invariant violated: Net account movements (${accountSum}) + Interest expense (${categorySum}) must equal 0.00.`,
        };
      }
      return { valid: true };
    }

    case 'opening_balance': {
      if (categoryLines.length > 0) {
        return { valid: false, reason: 'Opening balance transactions cannot have category lines.' };
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

/**
 * Standard reducing rate monthly EMI formula:
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 */
export function calculateReducingEmi(
  principal: number,
  annualInterestRatePct: number,
  tenureMonths: number
): { emi: number; totalInterest: number; totalPayment: number } {
  const r = annualInterestRatePct / 100 / 12;
  const n = tenureMonths;

  if (r === 0) {
    const emi = round2(principal / n);
    return { emi, totalInterest: 0, totalPayment: principal };
  }

  const factor = Math.pow(1 + r, n);
  const emi = round2((principal * r * factor) / (factor - 1));
  const totalPayment = round2(emi * n);
  const totalInterest = round2(totalPayment - principal);

  return { emi, totalInterest, totalPayment };
}

/**
 * Exact Newton-Raphson Annualized XIRR solver.
 * Input cashFlows: array of { date: Date, amount: number }
 * External deposits are negative, withdrawals / ending portfolio value are positive.
 */
export function calculateXirr(
  cashFlows: Array<{ date: string; amount: number }>,
  guess: number = 0.1
): number {
  if (cashFlows.length < 2) return 0;

  const dates = cashFlows.map((cf) => new Date(cf.date).getTime());
  const minDate = Math.min(...dates);
  const msInYear = 365.25 * 24 * 60 * 60 * 1000;

  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    let fValue = 0;
    let fDerivative = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      const years = (dates[j] - minDate) / msInYear;
      const discount = Math.pow(1 + rate, years);
      fValue += cashFlows[j].amount / discount;
      fDerivative -= (years * cashFlows[j].amount) / (discount * (1 + rate));
    }

    if (Math.abs(fDerivative) < 1e-12) break;
    const newRate = rate - fValue / fDerivative;

    if (Math.abs(newRate - rate) < tolerance) {
      return round2(newRate * 100);
    }
    rate = newRate;
  }

  return round2(rate * 100);
}

/**
 * Calculates Fixed Deposit compound maturity, interest, and withholding tax.
 * Formula: A = P * (1 + r/n)^(n*t)
 */
export function calculateFdMaturity(
  principal: number,
  annualInterestRatePct: number,
  tenureMonths: number,
  compoundingFrequency: 'monthly' | 'quarterly' | 'half_yearly' | 'annually' = 'annually',
  taxRatePct: number = 10.0
): {
  grossMaturityAmount: number;
  grossInterest: number;
  withholdingTax: number;
  netInterest: number;
  netMaturityAmount: number;
} {
  const r = annualInterestRatePct / 100;
  const t = tenureMonths / 12;

  let n = 1;
  switch (compoundingFrequency) {
    case 'monthly':
      n = 12;
      break;
    case 'quarterly':
      n = 4;
      break;
    case 'half_yearly':
      n = 2;
      break;
    case 'annually':
    default:
      n = 1;
      break;
  }

  const grossMaturityAmount = round2(principal * Math.pow(1 + r / n, n * t));
  const grossInterest = round2(grossMaturityAmount - principal);
  const withholdingTax = round2(grossInterest * (taxRatePct / 100));
  const netInterest = round2(grossInterest - withholdingTax);
  const netMaturityAmount = round2(principal + netInterest);

  return {
    grossMaturityAmount,
    grossInterest,
    withholdingTax,
    netInterest,
    netMaturityAmount,
  };
}

/**
 * Validates double-entry transaction lines against PostgreSQL check constraints:
 * 1. Mutual exclusivity of account_id vs category_id based on line_type
 * 2. Sum of all lines must equal exactly 0.00
 */
export function validateTransactionLines(
  lines: Array<{
    lineType: 'account' | 'category';
    accountId?: string | null;
    categoryId?: string | null;
    amount: number;
  }>
): { valid: boolean; sum: number; errors: string[] } {
  const errors: string[] = [];
  if (lines.length < 2) {
    errors.push('A valid double-entry transaction must contain at least 2 atomic lines.');
  }

  let totalSum = 0;

  lines.forEach((line, idx) => {
    totalSum += line.amount;
    if (line.lineType === 'account') {
      if (!line.accountId) {
        errors.push(`Line #${idx + 1}: Account line must reference a valid account_id.`);
      }
      if (line.categoryId) {
        errors.push(`Line #${idx + 1}: Account line cannot reference category_id (chk_line_type_exclusivity).`);
      }
    } else if (line.lineType === 'category') {
      if (!line.categoryId) {
        errors.push(`Line #${idx + 1}: Category line must reference a valid category_id.`);
      }
      if (line.accountId) {
        errors.push(`Line #${idx + 1}: Category line cannot reference account_id (chk_line_type_exclusivity).`);
      }
    }
  });

  const roundedSum = round2(totalSum);
  if (roundedSum !== 0.0) {
    errors.push(`Ledger out of balance: Sum of all lines is ৳${roundedSum.toFixed(2)} (must equal ৳0.00).`);
  }

  return {
    valid: errors.length === 0,
    sum: roundedSum,
    errors,
  };
}

/**
 * Calculates DPS (Deposit Pension Scheme) maturity, interest, and withholding tax.
 * Uses Future Value of Annuity Due compounded monthly:
 * FV = P * [((1 + r)^n - 1) / r] * (1 + r)
 */
export function calculateDpsMaturity(
  monthlyInstallment: number,
  annualInterestRatePct: number,
  tenureMonths: number,
  taxRatePct: number = 10.0
): {
  totalPrincipal: number;
  grossMaturityAmount: number;
  grossInterest: number;
  withholdingTax: number;
  netInterest: number;
  netMaturityAmount: number;
} {
  const r = annualInterestRatePct / 100 / 12;
  const n = tenureMonths;
  const totalPrincipal = round2(monthlyInstallment * n);

  let grossMaturityAmount = totalPrincipal;
  if (r > 0) {
    const factor = Math.pow(1 + r, n);
    grossMaturityAmount = round2(monthlyInstallment * ((factor - 1) / r) * (1 + r));
  }

  const grossInterest = round2(grossMaturityAmount - totalPrincipal);
  const withholdingTax = round2(grossInterest * (taxRatePct / 100));
  const netInterest = round2(grossInterest - withholdingTax);
  const netMaturityAmount = round2(totalPrincipal + netInterest);

  return {
    totalPrincipal,
    grossMaturityAmount,
    grossInterest,
    withholdingTax,
    netInterest,
    netMaturityAmount,
  };
}

/**
 * Calculates next execution date for recurring schedule.
 */
export function advanceRecurringDate(
  currentDateStr: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): string {
  const d = new Date(currentDateStr);
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Flat rate loan EMI formula.
 * Total Interest = Principal * (Rate / 100) * (TenureMonths / 12)
 * EMI = (Principal + Total Interest) / TenureMonths
 */
export function calculateFlatEmi(
  principal: number,
  annualInterestRatePct: number,
  tenureMonths: number
): { emi: number; totalInterest: number; totalPayment: number } {
  const totalInterest = round2(principal * (annualInterestRatePct / 100) * (tenureMonths / 12));
  const totalPayment = round2(principal + totalInterest);
  const emi = round2(totalPayment / tenureMonths);

  return { emi, totalInterest, totalPayment };
}

/**
 * Generates an immutable, deterministic loan amortization schedule.
 * Section 9 of ACCOUNTING_RULES.md.
 */
export function generateLoanAmortizationSchedule(
  loanId: string,
  principal: number,
  annualInterestRatePct: number,
  tenureMonths: number,
  disbursementDate: string,
  interestMethod: LoanInterestMethod,
  version: number = 1
): LoanPaymentScheduleItem[] {
  const schedule: LoanPaymentScheduleItem[] = [];
  let remainingPrincipal = principal;

  const monthlyRate = annualInterestRatePct / 100 / 12;
  const { emi } =
    interestMethod === 'reducing'
      ? calculateReducingEmi(principal, annualInterestRatePct, tenureMonths)
      : calculateFlatEmi(principal, annualInterestRatePct, tenureMonths);

  let currentDate = new Date(disbursementDate);

  for (let installmentNumber = 1; installmentNumber <= tenureMonths; installmentNumber++) {
    // Advance due date by 1 month
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
    const dueDateStr = currentDate.toISOString().split('T')[0];

    let scheduledInterest = 0;
    let scheduledPrincipal = 0;

    if (interestMethod === 'reducing') {
      scheduledInterest = round2(remainingPrincipal * monthlyRate);
      scheduledPrincipal = round2(emi - scheduledInterest);

      // Handle final installment rounding alignment
      if (installmentNumber === tenureMonths || scheduledPrincipal > remainingPrincipal) {
        scheduledPrincipal = remainingPrincipal;
      }
    } else {
      // Flat rate installment
      scheduledPrincipal = round2(principal / tenureMonths);
      scheduledInterest = round2((principal * (annualInterestRatePct / 100) * (tenureMonths / 12)) / tenureMonths);

      if (installmentNumber === tenureMonths) {
        scheduledPrincipal = remainingPrincipal;
      }
    }

    const scheduledEmiAmount = round2(scheduledPrincipal + scheduledInterest);
    const remainingPrincipalAfter = round2(Math.max(0, remainingPrincipal - scheduledPrincipal));

    schedule.push({
      id: `sch-${loanId}-v${version}-${installmentNumber}`,
      loanId,
      version,
      installmentNumber,
      dueDate: dueDateStr,
      scheduledPrincipal,
      scheduledInterest,
      scheduledEmiAmount,
      remainingPrincipalAfter,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    remainingPrincipal = remainingPrincipalAfter;
  }

  return schedule;
}

/**
 * Calculates Zakat according to Islamic jurisprudence and Bangladesh market valuations.
 * Nisab standards:
 * - Gold Nisab: 7.5 tola / bhori = 87.48 grams
 * - Silver Nisab: 52.5 tola / bhori = 612.36 grams
 * Standard rate: 2.500% on net eligible wealth maintained above Nisab for a Hawl (1 lunar year).
 */
export function calculateZakat(params: {
  nisabBasis: NisabBasis;
  goldPricePerGram: number;
  silverPricePerGram: number;
  zakatableCashAndBank: number;
  zakatableGoldSilver: number;
  zakatableTermDeposits: number;
  zakatableReceivables: number;
  zakatableStocks: number;
  deductibleLiabilities: number;
  zakatRatePct?: number;
}): ZakatCalculationResult {
  const {
    nisabBasis,
    goldPricePerGram,
    silverPricePerGram,
    zakatableCashAndBank,
    zakatableGoldSilver,
    zakatableTermDeposits,
    zakatableReceivables,
    zakatableStocks,
    deductibleLiabilities,
    zakatRatePct = 2.5,
  } = params;

  // Gold Nisab: 87.48 grams (7.5 tola/bhori)
  const goldNisabValue = round2(87.48 * goldPricePerGram);
  // Silver Nisab: 612.36 grams (52.5 tola/bhori)
  const silverNisabValue = round2(612.36 * silverPricePerGram);

  const effectiveNisabThreshold = nisabBasis === 'gold' ? goldNisabValue : silverNisabValue;

  const grossZakatableWealth = round2(
    zakatableCashAndBank +
      zakatableGoldSilver +
      zakatableTermDeposits +
      zakatableReceivables +
      zakatableStocks
  );

  const netZakatablePool = round2(Math.max(0, grossZakatableWealth - deductibleLiabilities));
  const isNisabMet = netZakatablePool >= effectiveNisabThreshold;
  const zakatDue = isNisabMet ? round2(netZakatablePool * (zakatRatePct / 100)) : 0.0;

  return {
    nisabBasis,
    effectiveNisabThreshold,
    goldNisabValue,
    silverNisabValue,
    zakatableCashAndBank: round2(zakatableCashAndBank),
    zakatableGoldSilver: round2(zakatableGoldSilver),
    zakatableTermDeposits: round2(zakatableTermDeposits),
    zakatableReceivables: round2(zakatableReceivables),
    zakatableStocks: round2(zakatableStocks),
    grossZakatableWealth,
    deductibleLiabilities: round2(deductibleLiabilities),
    netZakatablePool,
    isNisabMet,
    zakatRatePct,
    zakatDue,
  };
}

/**
 * Calculates trade gross, charges, net value, and cost basis according to Lock 4.
 * Buy: Buy Cost Basis = Gross Value + Commission + Tax + Other Charges.
 * Sell: Net Proceeds = Gross Value - Commission - Tax - Other Charges.
 */
export function calculateTradeValues(params: {
  transactionType: 'buy' | 'sell';
  quantity: number;
  price: number;
  commissionRatePct?: number; // default 0.4% in BD (or 0.004)
  commissionAmount?: number;
  taxAmount?: number; // AIT 0.05% on sales in DSE
  otherCharges?: number;
}): {
  grossValue: number;
  commission: number;
  tax: number;
  otherCharges: number;
  netValue: number;
} {
  const {
    transactionType,
    quantity,
    price,
    commissionRatePct = 0.4,
    commissionAmount,
    taxAmount = 0,
    otherCharges = 0,
  } = params;

  const grossValue = round2(quantity * price);
  const commission =
    commissionAmount !== undefined
      ? round2(commissionAmount)
      : round2(grossValue * (commissionRatePct / 100));
  const tax = round2(taxAmount);
  const charges = round2(otherCharges);

  const netValue =
    transactionType === 'buy'
      ? round2(grossValue + commission + tax + charges)
      : round2(grossValue - commission - tax - charges);

  return {
    grossValue,
    commission,
    tax,
    otherCharges: charges,
    netValue,
  };
}

/**
 * Computes authoritative stock holdings matching PostgreSQL View 3 (v_stock_holdings).
 * Uses Weighted Average Cost (WAC) per share across cumulative buy cost bases.
 */
export function computeStockHoldings(
  transactions: StockTransaction[],
  stocks: Stock[],
  filterBrokerAccountId?: string
): StockHolding[] {
  // Filter by broker account if specified
  const relevantTrades = filterBrokerAccountId
    ? transactions.filter((t) => t.brokerAccountId === filterBrokerAccountId)
    : transactions;

  // Group by composite key: `${brokerAccountId}::${stockId}`
  const tradeMap = new Map<
    string,
    {
      brokerAccountId: string;
      stockId: string;
      totalBoughtShares: number;
      totalSoldShares: number;
      totalBuyCostBasis: number;
    }
  >();

  // STEP-7: Sort trades by tradeDate ascending so buys accumulate WAC before sells process
  const sortedTrades = [...relevantTrades].sort(
    (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  for (const t of sortedTrades) {
    const key = `${t.brokerAccountId}::${t.stockId}`;
    let item = tradeMap.get(key);
    if (!item) {
      item = {
        brokerAccountId: t.brokerAccountId,
        stockId: t.stockId,
        totalBoughtShares: 0,
        totalSoldShares: 0,
        totalBuyCostBasis: 0,
      };
      tradeMap.set(key, item);
    }

    if (t.transactionType === 'buy') {
      item.totalBoughtShares += t.quantity;
      const buyCostBasis = round2(t.grossValue + t.commission + t.tax + t.otherCharges);
      item.totalBuyCostBasis += buyCostBasis;
    } else if (t.transactionType === 'sell') {
      // STEP-7: Deduct sold cost basis (WAC × qty) from remaining cost
      const wac = item.totalBoughtShares > 0 ? item.totalBuyCostBasis / item.totalBoughtShares : 0;
      const soldCostBasis = round2(t.quantity * wac);
      item.totalSoldShares += t.quantity;
      item.totalBoughtShares = Math.max(0, item.totalBoughtShares - t.quantity);
      item.totalBuyCostBasis = Math.max(0, round2(item.totalBuyCostBasis - soldCostBasis));
    }
  }

  const holdings: StockHolding[] = [];

  for (const item of tradeMap.values()) {
    const remainingShares = round2(item.totalBoughtShares);
    if (remainingShares <= 0) continue; // Closed positions excluded from active holdings

    const stock = stocks.find((s) => s.id === item.stockId);
    const symbol = stock?.symbol || 'UNKNOWN';
    const companyName = stock?.companyName || symbol;
    const sector = stock?.sector || 'Diversified';
    const currentMarketPrice = stock?.currentPrice || 0;

    // STEP-7: WAC is now derived from remaining cost / remaining shares (after sell deductions)
    const weightedAverageCost =
      remainingShares > 0
        ? round4(item.totalBuyCostBasis / remainingShares)
        : 0;

    const investedValue = round2(remainingShares * weightedAverageCost);
    const currentMarketValue = round2(remainingShares * currentMarketPrice);
    const unrealizedPL = round2(currentMarketValue - investedValue);
    const unrealizedPLPct =
      investedValue > 0 ? round2((unrealizedPL / investedValue) * 100) : 0;

    holdings.push({
      stockId: item.stockId,
      symbol,
      companyName,
      sector,
      brokerAccountId: item.brokerAccountId,
      quantity: remainingShares,
      weightedAverageCost,
      currentMarketPrice,
      investedValue,
      currentMarketValue,
      unrealizedPL,
      unrealizedPLPct,
      marketValue: currentMarketValue,
      totalCostBasis: investedValue,
      unrealizedGain: unrealizedPL,
      unrealizedGainPct: unrealizedPLPct,
      currentPrice: currentMarketPrice,
    });
  }

  return holdings;
}

/**
 * Derives current cash balances for broker accounts matching v_broker_cash_balance.
 */
export function computeBrokerCashBalances(
  cashTransactions: BrokerCashTransaction[],
  brokerAccounts: BrokerAccount[]
): BrokerCashBalance[] {
  const defaultBo = brokerAccounts.find((ba) => ba.isDefault) || brokerAccounts[0];

  return brokerAccounts.map((ba) => {
    const balance = cashTransactions
      .filter((t) => t.brokerAccountId === ba.id || (!t.brokerAccountId && defaultBo?.id === ba.id))
      .reduce((sum, t) => sum + t.amountSigned, 0);

    return {
      brokerAccountId: ba.id,
      boId: ba.boId,
      cashBalance: round2(balance),
    };
  });
}

// ----------------------------------------------------
// Phase 6: Portfolio Analytics, History, XIRR & TWR
// ----------------------------------------------------

/**
 * Derives strictly external cash flows for Portfolio XIRR (Lock 7).
 * Considers ONLY:
 * - External Deposits to Broker (-Amount: outflow from investor)
 * - External Withdrawals from Broker (+Amount: inflow to investor)
 * - External Cash Dividends withdrawn (+Amount)
 * - Ending Terminal Portfolio Valuation (+Amount: total current equity MV + broker cash)
 *
 * Internal buys, sells, and retained dividends are strictly EXCLUDED to avoid double-counting.
 */
export function computePortfolioExternalCashFlows(
  cashTransactions: BrokerCashTransaction[],
  currentPortfolioValue: number,
  asOfDate: string = new Date().toISOString().split('T')[0]
): PortfolioCashFlow[] {
  const flows: PortfolioCashFlow[] = [];

  for (const ct of cashTransactions) {
    const tType = ct.type || ct.transactionType;
    if (tType === 'deposit') {
      flows.push({
        id: ct.id,
        date: ct.transactionDate,
        type: 'deposit',
        amount: -Math.abs(ct.amountSigned), // Money out of investor's pocket into portfolio
        description: `External Broker Deposit (${ct.note || 'CDBL funding'})`,
        sourceRef: ct.sourceBankAccountId,
      });
    } else if (tType === 'withdrawal') {
      flows.push({
        id: ct.id,
        date: ct.transactionDate,
        type: 'withdrawal',
        amount: Math.abs(ct.amountSigned), // Money returned to investor
        description: `External Broker Withdrawal (${ct.note || 'Payout to bank'})`,
        sourceRef: ct.destinationBankAccountId,
      });
    }
  }

  // Sort chronologically
  flows.sort((a, b) => a.date.localeCompare(b.date));

  // Append terminal valuation if portfolio has begun or has positive value
  if (flows.length > 0 || currentPortfolioValue > 0) {
    flows.push({
      id: 'terminal-valuation',
      date: asOfDate,
      type: 'terminal_valuation',
      amount: round2(currentPortfolioValue),
      description: 'Current Ending Portfolio Value (Equities Market Value + Broker Cash)',
    });
  }

  return flows;
}

/**
 * Calculates Time-Weighted Return (TWR) sub-periods.
 * Neutralizes the effect of external cash flows to measure true manager/asset performance.
 */
export function computeTwrSubPeriods(
  snapshots: PortfolioSnapshot[],
  cashTransactions: BrokerCashTransaction[]
): TwrSubPeriod[] {
  if (snapshots.length < 2) {
    return [];
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  const subPeriods: TwrSubPeriod[] = [];
  let compoundFactor = 1.0;

  for (let i = 1; i < sortedSnapshots.length; i++) {
    const prev = sortedSnapshots[i - 1];
    const curr = sortedSnapshots[i];

    const prevTotalVal = prev.currentMarketValue + prev.brokerCashBalance;
    const currTotalVal = curr.currentMarketValue + curr.brokerCashBalance;

    // External cash flows occurring strictly between prev and curr date
    const externalFlows = cashTransactions
      .filter((ct) => {
        const d = ct.transactionDate;
        const t = ct.type || ct.transactionType;
        return (
          d > prev.snapshotDate &&
          d <= curr.snapshotDate &&
          (t === 'deposit' || t === 'withdrawal')
        );
      })
      .reduce((sum, ct) => {
        const t = ct.type || ct.transactionType;
        if (t === 'deposit') return sum + ct.amountSigned; // Positive capital injected
        if (t === 'withdrawal') return sum - Math.abs(ct.amountSigned); // Capital withdrawn
        return sum;
      }, 0);

    // Sub-period return: R = (V_end - (V_begin + NetCashFlow)) / (V_begin + NetCashFlow)
    const baseCap = prevTotalVal + externalFlows;
    const subReturn = baseCap > 0 ? (currTotalVal - baseCap) / baseCap : 0;

    compoundFactor *= 1 + subReturn;
    const cumulativeTwrPct = round2((compoundFactor - 1) * 100);

    subPeriods.push({
      startDate: prev.snapshotDate,
      endDate: curr.snapshotDate,
      beginValue: round2(prevTotalVal),
      cashFlow: round2(externalFlows),
      endValue: round2(currTotalVal),
      subPeriodReturnPct: round2(subReturn * 100),
      cumulativeTwrPct,
    });
  }

  return subPeriods;
}

/**
 * Indexes both the Portfolio and DSEX benchmark index to 100.00 at inception date.
 * Allows transparent comparison of active alpha generated.
 */
export function computeBenchmarkComparison(
  snapshots: PortfolioSnapshot[],
  benchmarkPrices: BenchmarkIndexPrice[]
): BenchmarkComparisonPoint[] {
  if (snapshots.length === 0) return [];

  const sortedSnapshots = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  const sortedBench = [...benchmarkPrices]
    .filter((b) => b.indexSymbol === 'DSEX')
    .sort((a, b) => a.priceDate.localeCompare(b.priceDate));

  const dsexMap = new Map<string, number>();
  for (const b of sortedBench) {
    dsexMap.set(b.priceDate, b.closeValue);
  }

  // Determine initial benchmark base
  const firstDate = sortedSnapshots[0].snapshotDate;
  let baseDsex = dsexMap.get(firstDate);
  if (!baseDsex && sortedBench.length > 0) {
    // Find closest earlier or initial
    baseDsex = sortedBench[0].closeValue;
  }
  const benchmarkBase = baseDsex || 6000.0;

  const points: BenchmarkComparisonPoint[] = [];

  for (const snap of sortedSnapshots) {
    const cumTwrPct = snap.cumulativeTwr ?? 0;
    const portfolioIndexed = round2(100 * (1 + cumTwrPct / 100));

    // Get DSEX for date or closest preceding
    const curDsex = dsexMap.get(snap.snapshotDate) || benchmarkBase;
    const dsexCumReturnPct = round2(((curDsex - benchmarkBase) / benchmarkBase) * 100);
    const dsexIndexed = round2(100 * (1 + dsexCumReturnPct / 100));

    const alphaPct = round2(cumTwrPct - dsexCumReturnPct);

    points.push({
      date: snap.snapshotDate,
      portfolioIndexed,
      dsexIndexed,
      portfolioCumulativeReturnPct: cumTwrPct,
      dsexCumulativeReturnPct: dsexCumReturnPct,
      alphaPct,
    });
  }

  return points;
}

/**
 * Computes consolidated performance metrics: XIRR, TWR, DSEX, Realized P/L, Dividends.
 */
export function computePortfolioPerformanceMetrics(
  stockHoldings: StockHolding[],
  brokerCashBalances: BrokerCashBalance[],
  cashTransactions: BrokerCashTransaction[],
  stockTransactions: StockTransaction[],
  snapshots: PortfolioSnapshot[],
  benchmarkPrices: BenchmarkIndexPrice[]
): PortfolioPerformanceMetrics {
  const totalStockMarketValue = stockHoldings.reduce(
    (sum, h) => sum + (h.marketValue ?? h.currentMarketValue),
    0
  );
  const totalInvestedCapital = stockHoldings.reduce(
    (sum, h) => sum + (h.totalCostBasis ?? h.investedValue),
    0
  );
  const totalBrokerCash = brokerCashBalances.reduce((sum, b) => sum + b.cashBalance, 0);
  const currentPortfolioValue = round2(totalStockMarketValue + totalBrokerCash);

  const totalUnrealizedGain = round2(totalStockMarketValue - totalInvestedCapital);

  // Compute total realized gain from sales
  let totalRealizedGain = 0;
  // Calculate realized capital gain across all sells
  // WAC at trade time
  // STEP-7: Sort trades by tradeDate ascending to correctly accumulate WAC before sells
  const sortedStockTxs = [...stockTransactions].sort(
    (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );
  const buyCostMap = new Map<string, { totalShares: number; totalCost: number }>();
  for (const st of sortedStockTxs) {
    let acc = buyCostMap.get(st.stockId);
    if (!acc) {
      acc = { totalShares: 0, totalCost: 0 };
      buyCostMap.set(st.stockId, acc);
    }
    if (st.transactionType === 'buy') {
      const buyCostBasis = st.grossValue + st.commission + st.tax + st.otherCharges;
      acc.totalShares += st.quantity;
      acc.totalCost += buyCostBasis;
    } else if (st.transactionType === 'sell') {
      const wac = acc.totalShares > 0 ? acc.totalCost / acc.totalShares : 0;
      const costOfSharesSold = st.quantity * wac;
      const netSellProceeds = st.grossValue - st.commission - st.tax - st.otherCharges;
      const gain = netSellProceeds - costOfSharesSold;
      totalRealizedGain += gain;
      // STEP-7: Deduct sold shares and their cost from running totals
      acc.totalShares = Math.max(0, acc.totalShares - st.quantity);
      acc.totalCost = Math.max(0, round2(acc.totalCost - costOfSharesSold));
    }
  }
  totalRealizedGain = round2(totalRealizedGain);

  // Dividends received
  const totalNetDividends = round2(
    cashTransactions
      .filter((ct) => (ct.type || ct.transactionType) === 'dividend')
      .reduce((sum, ct) => sum + ct.amountSigned, 0)
  );

  const totalNetProfit = round2(totalRealizedGain + totalUnrealizedGain + totalNetDividends);

  // External Cash Flows for XIRR
  const externalFlows = computePortfolioExternalCashFlows(cashTransactions, currentPortfolioValue);
  const xirrPct = calculateXirr(
    externalFlows.map((f) => ({ date: f.date, amount: f.amount }))
  );

  // TWR from snapshots
  const latestSnapshot =
    snapshots.length > 0
      ? [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))[
          snapshots.length - 1
        ]
      : null;

  const twrPct = latestSnapshot?.cumulativeTwr ?? (totalInvestedCapital > 0 ? round2((totalUnrealizedGain / totalInvestedCapital) * 100) : 0);

  // DSEX TWR
  const sortedBench = [...benchmarkPrices]
    .filter((b) => b.indexSymbol === 'DSEX')
    .sort((a, b) => a.priceDate.localeCompare(b.priceDate));

  let dsexTwrPct = 0;
  if (sortedBench.length >= 2) {
    const firstVal = sortedBench[0].closeValue;
    const lastVal = sortedBench[sortedBench.length - 1].closeValue;
    dsexTwrPct = round2(((lastVal - firstVal) / firstVal) * 100);
  }

  const alphaPct = round2(twrPct - dsexTwrPct);

  // Net external deposits as base for ROI
  const netExternalDeposits = cashTransactions
    .filter((ct) => {
      const t = ct.type || ct.transactionType;
      return t === 'deposit' || t === 'withdrawal';
    })
    .reduce((sum, ct) => sum + ct.amountSigned, 0);

  const overallRoiPct =
    netExternalDeposits > 0 ? round2((totalNetProfit / netExternalDeposits) * 100) : 0;

  return {
    xirrPct,
    twrPct,
    dsexTwrPct,
    alphaPct,
    totalInvestedCapital: round2(totalInvestedCapital),
    currentPortfolioValue,
    totalStockMarketValue: round2(totalStockMarketValue),
    totalBrokerCash: round2(totalBrokerCash),
    totalRealizedGain,
    totalUnrealizedGain,
    totalNetDividends,
    totalNetProfit,
    overallRoiPct,
  };
}

// ----------------------------------------------------
// Phase 7: Dividend & Corporate Actions Accounting Logic
// ----------------------------------------------------

/**
 * Computes Cash Dividend gross value, withholding tax (AIT), and net payable amount.
 * Section 8.2 & Test Case 16 of ACCOUNTING_RULES.md.
 */
export function calculateDividendValues(
  shares: number,
  dividendPerShare: number,
  taxRatePct: number = 10.0
): {
  grossDividend: number;
  tax: number;
  netDividend: number;
} {
  const grossDividend = round2(shares * dividendPerShare);
  const tax = round2(grossDividend * (taxRatePct / 100));
  const netDividend = round2(grossDividend - tax);
  return { grossDividend, tax, netDividend };
}

/**
 * Computes Bonus Share distribution and resulting WAC dilution.
 * Rule: Total cost basis remains constant, shares increase, WAC per share is diluted.
 */
export function calculateBonusShareDilution(
  existingShares: number,
  existingWac: number,
  ratioStr: string
): {
  additionalShares: number;
  newQuantity: number;
  newCostBasis: number;
  newWac: number;
} {
  // Parse ratio e.g. "10:1" (1 bonus for 10 held) or "5:1" or "10%"
  let bonusRate = 0.10;
  if (ratioStr.includes(':')) {
    const parts = ratioStr.split(':').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      // If written as 10:1 (10 held -> 1 bonus) or 1:10 (1 bonus per 10 held)
      bonusRate = parts[0] > parts[1] ? parts[1] / parts[0] : parts[0] / parts[1];
    }
  } else if (ratioStr.includes('%')) {
    bonusRate = parseFloat(ratioStr.replace('%', '')) / 100;
  } else {
    const parsed = parseFloat(ratioStr);
    if (!isNaN(parsed) && parsed > 0) bonusRate = parsed / 100;
  }

  const additionalShares = Math.floor(existingShares * bonusRate);
  const newQuantity = existingShares + additionalShares;
  const existingCostBasis = round2(existingShares * existingWac);
  const newCostBasis = existingCostBasis; // total cost basis is unchanged for bonus shares
  const newWac = newQuantity > 0 ? round2(newCostBasis / newQuantity) : 0;

  return { additionalShares, newQuantity, newCostBasis, newWac };
}

/**
 * Computes Stock Split multiplier and WAC adjustment.
 * Rule: 1 old share splits into N new shares (e.g. 1:2 -> multiplier = 2).
 */
export function calculateStockSplit(
  existingShares: number,
  existingWac: number,
  ratioStr: string
): {
  multiplier: number;
  additionalShares: number;
  newQuantity: number;
  newCostBasis: number;
  newWac: number;
} {
  let multiplier = 2; // Default 1:2 split
  if (ratioStr.includes(':')) {
    const parts = ratioStr.split(':').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      multiplier = parts[1] > parts[0] ? parts[1] / parts[0] : parts[0] / parts[1];
    }
  } else {
    const parsed = parseFloat(ratioStr);
    if (!isNaN(parsed) && parsed > 0) multiplier = parsed;
  }

  const newQuantity = Math.round(existingShares * multiplier);
  const additionalShares = newQuantity - existingShares;
  const existingCostBasis = round2(existingShares * existingWac);
  const newCostBasis = existingCostBasis;
  const newWac = newQuantity > 0 ? round2(newCostBasis / newQuantity) : 0;

  return { multiplier, additionalShares, newQuantity, newCostBasis, newWac };
}

/**
 * Computes Right Share issuance: cash requirement, additional shares, and updated WAC.
 */
export function calculateRightIssue(
  existingShares: number,
  existingWac: number,
  ratioStr: string,
  subscriptionPrice: number
): {
  eligibleRights: number;
  cashRequired: number;
  newQuantity: number;
  newCostBasis: number;
  newWac: number;
} {
  let rightRate = 0.20; // Default 1:5
  if (ratioStr.includes(':')) {
    const parts = ratioStr.split(':').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      rightRate = parts[0] > parts[1] ? parts[1] / parts[0] : parts[0] / parts[1];
    }
  }

  const eligibleRights = Math.floor(existingShares * rightRate);
  const cashRequired = round2(eligibleRights * subscriptionPrice);
  const existingCostBasis = round2(existingShares * existingWac);
  const newQuantity = existingShares + eligibleRights;
  const newCostBasis = round2(existingCostBasis + cashRequired);
  const newWac = newQuantity > 0 ? round2(newCostBasis / newQuantity) : 0;

  return { eligibleRights, cashRequired, newQuantity, newCostBasis, newWac };
}

// ----------------------------------------------------
// Phase 8: Analytics, Capital Gains & Financial Reports Engine
// ----------------------------------------------------

/**
 * Calculates realized capital gains per trade and consolidated NBR tax report.
 * Conforms to Lock 4 charges and Bangladesh Income Tax Act / Finance Act 2024.
 */
export function calculateCapitalGainsTaxSummary(
  stockTransactions: StockTransaction[],
  stocks: Stock[],
  dividends: Dividend[] = [],
  taxDeductedFromBankInterest: number = 0,
  fiscalYear: string = '2026-2027',
  exemptionThreshold: number = 5000000,
  taxRatePct: number = 15
): CapitalGainsTaxSummary {
  const stockMap = new Map<string, Stock>();
  stocks.forEach((s) => stockMap.set(s.id, s));

  // Sort transactions chronologically to track WAC at the moment of each sale
  const sortedTxs = [...stockTransactions].sort(
    (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  // Track running holding per stock
  const runningHoldings = new Map<string, { qty: number; totalCost: number; firstBuyDate?: string }>();

  const gainItems: CapitalGainItem[] = [];

  for (const tx of sortedTxs) {
    let holding = runningHoldings.get(tx.stockId);
    if (!holding) {
      holding = { qty: 0, totalCost: 0, firstBuyDate: tx.tradeDate };
      runningHoldings.set(tx.stockId, holding);
    }

    if (tx.transactionType === 'buy') {
      // Lock 4: Buy Cost Basis = gross + commission + tax + otherCharges
      const buyCost = tx.netValue ?? round2(tx.grossValue + tx.commission + tx.tax + tx.otherCharges);
      holding.qty += tx.quantity;
      holding.totalCost = round2(holding.totalCost + buyCost);
      if (!holding.firstBuyDate) {
        holding.firstBuyDate = tx.tradeDate;
      }
    } else if (tx.transactionType === 'sell') {
      const stock = stockMap.get(tx.stockId);
      const wacAtSale = holding.qty > 0 ? round2(holding.totalCost / holding.qty) : (tx.price || 0);
      const soldCostBasis = round2(tx.quantity * wacAtSale);
      const netProceeds = tx.netValue ?? round2(tx.grossValue - tx.commission - tx.tax - tx.otherCharges);
      const realizedGainLoss = round2(netProceeds - soldCostBasis);
      const gainLossPct = soldCostBasis > 0 ? round2((realizedGainLoss / soldCostBasis) * 100) : 0;
      const charges = round2(tx.commission + tx.tax + tx.otherCharges);

      // Holding period classification
      let holdingType: 'short_term' | 'long_term' = 'short_term';
      if (holding.firstBuyDate) {
        const daysHeld = Math.floor(
          (new Date(tx.tradeDate).getTime() - new Date(holding.firstBuyDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysHeld >= 365) {
          holdingType = 'long_term';
        }
      }

      gainItems.push({
        id: tx.id,
        stockId: tx.stockId,
        symbol: stock?.symbol || 'UNKNOWN',
        companyName: stock?.companyName || 'Unknown Security',
        tradeDate: tx.tradeDate,
        quantity: tx.quantity,
        grossSaleValue: tx.grossValue,
        chargesDeducted: charges,
        netProceeds,
        costBasis: soldCostBasis,
        realizedGainLoss,
        gainLossPct,
        holdingType,
        aitWithheld: tx.tax || 0,
      });

      // Update remaining holding
      holding.qty = Math.max(0, holding.qty - tx.quantity);
      holding.totalCost = Math.max(0, round2(holding.totalCost - soldCostBasis));
    }
  }

  const totalGrossProceeds = round2(gainItems.reduce((s, i) => s + i.grossSaleValue, 0));
  const totalCostBasis = round2(gainItems.reduce((s, i) => s + i.costBasis, 0));
  const totalRealizedGains = round2(
    gainItems.filter((i) => i.realizedGainLoss > 0).reduce((s, i) => s + i.realizedGainLoss, 0)
  );
  const totalRealizedLosses = round2(
    gainItems.filter((i) => i.realizedGainLoss < 0).reduce((s, i) => s + Math.abs(i.realizedGainLoss), 0)
  );
  const netCapitalGain = round2(totalRealizedGains - totalRealizedLosses);

  // NBR Statutory Exemption (e.g. 50 Lakh BDT threshold on individual listed capital gains)
  const taxableCapitalGain = Math.max(0, round2(netCapitalGain - exemptionThreshold));
  const estimatedTaxLiability = round2(taxableCapitalGain * (taxRatePct / 100));

  // Advance Income Tax (AIT / TDS) credits
  const totalTradeAitPaid = round2(gainItems.reduce((s, i) => s + i.aitWithheld, 0));
  const totalDividendAitPaid = round2(dividends.reduce((s, d) => s + (d.tax || 0), 0));
  const totalBankTdsPaid = round2(taxDeductedFromBankInterest);
  const totalAdvanceTaxCredits = round2(totalTradeAitPaid + totalDividendAitPaid + totalBankTdsPaid);

  const netTaxPayableOrRefund = round2(estimatedTaxLiability - totalAdvanceTaxCredits);

  return {
    fiscalYear,
    totalGrossProceeds,
    totalCostBasis,
    totalRealizedGains,
    totalRealizedLosses,
    netCapitalGain,
    exemptionThreshold,
    taxableCapitalGain,
    estimatedTaxLiability,
    totalTradeAitPaid,
    totalDividendAitPaid,
    totalBankTdsPaid,
    totalAdvanceTaxCredits,
    netTaxPayableOrRefund,
    gainItems,
  };
}

/**
 * Identifies tax-loss harvesting candidates across open positions.
 */
export function calculateTaxLossHarvesting(
  stockHoldings: StockHolding[],
  taxRatePct: number = 15
): TaxLossHarvestItem[] {
  const lossHoldings: TaxLossHarvestItem[] = [];

  for (const h of stockHoldings) {
    const marketVal = h.marketValue ?? h.currentMarketValue ?? 0;
    const costBasis = h.totalCostBasis ?? h.investedValue ?? 0;

    if (marketVal < costBasis && h.quantity > 0) {
      const unrealizedLoss = round2(costBasis - marketVal);
      const unrealizedLossPct = costBasis > 0 ? round2((unrealizedLoss / costBasis) * 100) : 0;
      const potentialTaxSavings = round2(unrealizedLoss * (taxRatePct / 100));

      lossHoldings.push({
        stockId: h.stockId,
        symbol: h.symbol,
        companyName: h.companyName,
        sector: h.sector,
        quantity: h.quantity,
        currentPrice: h.currentPrice ?? h.currentMarketPrice ?? 0,
        weightedAverageCost: h.weightedAverageCost,
        investedValue: costBasis,
        currentMarketValue: marketVal,
        unrealizedLoss,
        unrealizedLossPct,
        potentialTaxSavings,
      });
    }
  }

  // Sort by highest potential loss to harvest
  return lossHoldings.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);
}

/**
 * Computes Sector Allocation and Herfindahl-Hirschman Concentration Index (HHI).
 */
export function calculateSectorAllocation(stockHoldings: StockHolding[]): SectorAllocationSummary {
  const totalEquityValue = stockHoldings.reduce(
    (sum, h) => sum + (h.marketValue ?? h.currentMarketValue ?? 0),
    0
  );

  const sectorMap = new Map<
    string,
    {
      marketValue: number;
      costBasis: number;
      stocks: Array<{ symbol: string; companyName: string; marketValue: number; percentage: number }>;
    }
  >();

  for (const h of stockHoldings) {
    const mv = h.marketValue ?? h.currentMarketValue ?? 0;
    const cb = h.totalCostBasis ?? h.investedValue ?? 0;
    const sectorName = h.sector || 'General Equities';

    let item = sectorMap.get(sectorName);
    if (!item) {
      item = { marketValue: 0, costBasis: 0, stocks: [] };
      sectorMap.set(sectorName, item);
    }

    item.marketValue = round2(item.marketValue + mv);
    item.costBasis = round2(item.costBasis + cb);
    item.stocks.push({
      symbol: h.symbol,
      companyName: h.companyName,
      marketValue: mv,
      percentage: totalEquityValue > 0 ? round2((mv / totalEquityValue) * 100) : 0,
    });
  }

  const sectors: SectorAllocationItem[] = [];
  let hhi = 0;

  for (const [sector, data] of sectorMap.entries()) {
    const pct = totalEquityValue > 0 ? round2((data.marketValue / totalEquityValue) * 100) : 0;
    hhi += Math.pow(pct, 2);

    sectors.push({
      sector,
      marketValue: data.marketValue,
      costBasis: data.costBasis,
      unrealizedPl: round2(data.marketValue - data.costBasis),
      percentage: pct,
      holdingsCount: data.stocks.length,
      stocks: data.stocks.sort((a, b) => b.marketValue - a.marketValue),
    });
  }

  // Sort sectors by descending market value
  sectors.sort((a, b) => b.marketValue - a.marketValue);

  const herfindahlIndex = Math.round(hhi);
  const concentrationRisk: 'low' | 'moderate' | 'high' =
    herfindahlIndex > 2500 ? 'high' : herfindahlIndex > 1500 ? 'moderate' : 'low';

  const topSector = sectors[0]?.sector || 'None';
  const topSectorPct = sectors[0]?.percentage || 0;

  return {
    totalEquityValue: round2(totalEquityValue),
    sectors,
    herfindahlIndex,
    concentrationRisk,
    topSector,
    topSectorPct,
  };
}

/**
 * Generates an authoritative Balance Sheet (Statement of Financial Position).
 * Fulfills Lock 1 (Negative Liability Balances) and Lock 2 (Physical Asset Valuation).
 */
export function generateBalanceSheetReport(
  accounts: AccountBalanceView[],
  brokerCashBalances: BrokerCashBalance[],
  stockHoldings: StockHolding[],
  debts: Debt[] = [],
  asOfDate: string = new Date().toISOString().split('T')[0]
): BalanceSheetReport {
  // Current Assets
  const liquidCashAccounts = accounts.filter(
    (a) => ['bank', 'cash', 'mobile_wallet'].includes(a.accountType) && a.currentBalance > 0
  );
  const totalLiquidCash = round2(liquidCashAccounts.reduce((s, a) => s + a.currentBalance, 0));

  const totalBrokerCash = round2(brokerCashBalances.reduce((s, b) => s + b.cashBalance, 0));

  const receivableAccounts = accounts.filter(
    (a) => a.accountType === 'receivable' && a.currentBalance > 0
  );
  const activeLentDebts = debts.filter((d) => d.direction === 'lent' && d.status === 'active');
  const totalReceivables = round2(
    receivableAccounts.reduce((s, a) => s + a.currentBalance, 0) +
      activeLentDebts.reduce((s, d) => s + d.initialAmount, 0)
  );

  const totalCurrentAssets = round2(totalLiquidCash + totalBrokerCash + totalReceivables);

  // Non-Current Assets
  const termDepositAccounts = accounts.filter(
    (a) => ['fd', 'dps'].includes(a.accountType) && a.currentBalance > 0
  );
  const totalTermDeposits = round2(termDepositAccounts.reduce((s, a) => s + a.currentBalance, 0));

  const totalStockEquity = round2(
    stockHoldings.reduce((s, h) => s + (h.marketValue ?? h.currentMarketValue ?? 0), 0)
  );

  const physicalAssetAccounts = accounts.filter(
    (a) => a.accountType === 'asset' && a.currentBalance > 0
  );
  const totalPhysicalAssets = round2(
    physicalAssetAccounts.reduce((s, a) => s + a.currentBalance, 0)
  );

  const totalNonCurrentAssets = round2(
    totalTermDeposits + totalStockEquity + totalPhysicalAssets
  );

  const totalAssets = round2(totalCurrentAssets + totalNonCurrentAssets);

  // Liabilities (Stored as negative in canonical ledger per Lock 1)
  const creditCardAccounts = accounts.filter(
    (a) => a.accountType === 'credit_card' && a.currentBalance < 0
  );
  const totalCreditCards = round2(
    creditCardAccounts.reduce((s, a) => s + Math.abs(a.currentBalance), 0)
  );

  const payableAccounts = accounts.filter(
    (a) => a.accountType === 'payable' && a.currentBalance < 0
  );
  const activeBorrowedDebts = debts.filter((d) => d.direction === 'borrowed' && d.status === 'active');
  const totalPayables = round2(
    payableAccounts.reduce((s, a) => s + Math.abs(a.currentBalance), 0) +
      activeBorrowedDebts.reduce((s, d) => s + d.initialAmount, 0)
  );

  const totalCurrentLiabilities = round2(totalCreditCards + totalPayables);

  const loanAccounts = accounts.filter(
    (a) => a.accountType === 'loan' && a.currentBalance < 0
  );
  const totalLongTermLiabilities = round2(
    loanAccounts.reduce((s, a) => s + Math.abs(a.currentBalance), 0)
  );

  const totalLiabilities = round2(totalCurrentLiabilities + totalLongTermLiabilities);

  // Net Worth (Owner's Equity) = Assets - |Liabilities|
  const netWorth = round2(totalAssets - totalLiabilities);
  const debtToAssetRatio = totalAssets > 0 ? round2((totalLiabilities / totalAssets) * 100) : 0;
  const solvencyRatio = totalAssets > 0 ? round2((netWorth / totalAssets) * 100) : 100;
  const isBalanced = Math.abs(totalAssets - (netWorth + totalLiabilities)) < 0.05;

  const currentAssetCategories = [
    {
      categoryName: 'Cash & Liquid Bank Balances',
      totalAmount: totalLiquidCash,
      percentageOfAssets: totalAssets > 0 ? round2((totalLiquidCash / totalAssets) * 100) : 0,
      items: liquidCashAccounts.map((a) => ({
        id: a.accountId,
        name: a.accountName,
        amount: a.currentBalance,
        details: a.accountType.replace('_', ' ').toUpperCase(),
      })),
    },
    {
      categoryName: 'Brokerage Cash Sub-Ledger',
      totalAmount: totalBrokerCash,
      percentageOfAssets: totalAssets > 0 ? round2((totalBrokerCash / totalAssets) * 100) : 0,
      items: brokerCashBalances.map((b) => ({
        id: b.brokerAccountId,
        name: `BO Account ${b.boId}`,
        amount: b.cashBalance,
        details: 'Securities Cash',
      })),
    },
    {
      categoryName: 'Accounts Receivable & Personal Loans Lent',
      totalAmount: totalReceivables,
      percentageOfAssets: totalAssets > 0 ? round2((totalReceivables / totalAssets) * 100) : 0,
      items: [
        ...receivableAccounts.map((a) => ({
          id: a.accountId,
          name: a.accountName,
          amount: a.currentBalance,
          details: 'Ledger Receivable',
        })),
        ...activeLentDebts.map((d) => ({
          id: d.id,
          name: d.personName,
          amount: d.initialAmount,
          details: `Due ${d.dueDate || 'N/A'}`,
        })),
      ],
    },
  ];

  const nonCurrentAssetCategories = [
    {
      categoryName: 'Term Deposits (FD & DPS)',
      totalAmount: totalTermDeposits,
      percentageOfAssets: totalAssets > 0 ? round2((totalTermDeposits / totalAssets) * 100) : 0,
      items: termDepositAccounts.map((a) => ({
        id: a.accountId,
        name: a.accountName,
        amount: a.currentBalance,
        details: a.accountType.toUpperCase(),
      })),
    },
    {
      categoryName: 'DSE Stock Equity Holdings',
      totalAmount: totalStockEquity,
      percentageOfAssets: totalAssets > 0 ? round2((totalStockEquity / totalAssets) * 100) : 0,
      items: stockHoldings.map((h) => ({
        id: h.stockId,
        name: `${h.symbol} (${h.companyName})`,
        amount: h.marketValue ?? h.currentMarketValue ?? 0,
        details: `${h.quantity} sh @ ৳${h.currentPrice ?? h.currentMarketPrice}`,
      })),
    },
    {
      categoryName: 'Physical & Tangible Assets (Lock 2)',
      totalAmount: totalPhysicalAssets,
      percentageOfAssets: totalAssets > 0 ? round2((totalPhysicalAssets / totalAssets) * 100) : 0,
      items: physicalAssetAccounts.map((a) => ({
        id: a.accountId,
        name: a.accountName,
        amount: a.currentBalance,
        details: 'Appraised Book Value',
      })),
    },
  ];

  const liabilityCategories = [
    {
      categoryName: 'Credit Cards & Short-Term Overdrafts',
      totalAmount: totalCreditCards,
      percentageOfAssets: totalAssets > 0 ? round2((totalCreditCards / totalAssets) * 100) : 0,
      items: creditCardAccounts.map((a) => ({
        id: a.accountId,
        name: a.accountName,
        amount: Math.abs(a.currentBalance),
        details: 'Credit Card Facility',
      })),
    },
    {
      categoryName: 'Personal Payables & Borrowed Debts',
      totalAmount: totalPayables,
      percentageOfAssets: totalAssets > 0 ? round2((totalPayables / totalAssets) * 100) : 0,
      items: [
        ...payableAccounts.map((a) => ({
          id: a.accountId,
          name: a.accountName,
          amount: Math.abs(a.currentBalance),
          details: 'Ledger Payable',
        })),
        ...activeBorrowedDebts.map((d) => ({
          id: d.id,
          name: d.personName,
          amount: d.initialAmount,
          details: `Due ${d.dueDate || 'N/A'}`,
        })),
      ],
    },
    {
      categoryName: 'Bank Loans & Mortgages (Lock 1)',
      totalAmount: totalLongTermLiabilities,
      percentageOfAssets: totalAssets > 0 ? round2((totalLongTermLiabilities / totalAssets) * 100) : 0,
      items: loanAccounts.map((a) => ({
        id: a.accountId,
        name: a.accountName,
        amount: Math.abs(a.currentBalance),
        details: 'Term Loan Principal',
      })),
    },
  ];

  return {
    asOfDate,
    totalCurrentAssets,
    totalNonCurrentAssets,
    totalAssets,
    currentAssetCategories,
    nonCurrentAssetCategories,
    totalCurrentLiabilities,
    totalLongTermLiabilities,
    totalLiabilities,
    liabilityCategories,
    netWorth,
    debtToAssetRatio,
    solvencyRatio,
    isBalanced,
  };
}

/**
 * Generates an authoritative Income Statement (Profit & Loss).
 * Conforms strictly to Lock 6: Expense refunds are signed offsets in the same category,
 * preventing artificial income generation.
 */
export function generateIncomeStatementReport(
  transactions: Transaction[],
  transactionLines: TransactionLine[],
  categories: Category[],
  dividends: Dividend[] = [],
  realizedCapitalGains: number = 0,
  startDate?: string,
  endDate?: string
): IncomeStatementReport {
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const validTxMap = new Map<string, Transaction>();
  transactions.forEach((tx) => {
    if (tx.status === 'posted') {
      const txDate = tx.date;
      if ((!startDate || txDate >= startDate) && (!endDate || txDate <= endDate)) {
        validTxMap.set(tx.id, tx);
      }
    }
  });

  const incomeCatMap = new Map<string, { gross: number; offsets: number; name: string }>();
  const expenseCatMap = new Map<string, { gross: number; offsets: number; name: string }>();

  for (const line of transactionLines) {
    if (!validTxMap.has(line.transactionId)) continue;
    if (line.lineType !== 'category' || !line.categoryId) continue;

    const cat = categoryMap.get(line.categoryId);
    if (!cat) continue;

    if (cat.type === 'income') {
      let rec = incomeCatMap.get(cat.id);
      if (!rec) {
        rec = { gross: 0, offsets: 0, name: cat.name };
        incomeCatMap.set(cat.id, rec);
      }
      // Sum-to-zero rule: Income category line is negative for gross income, positive for refund/reversal offsets
      if (line.amount < 0) {
        rec.gross = round2(rec.gross + Math.abs(line.amount));
      } else if (line.amount > 0) {
        rec.offsets = round2(rec.offsets + line.amount);
      }
    } else if (cat.type === 'expense') {
      let rec = expenseCatMap.get(cat.id);
      if (!rec) {
        rec = { gross: 0, offsets: 0, name: cat.name };
        expenseCatMap.set(cat.id, rec);
      }
      // Lock 6 Rule: Positive amount is expense, negative amount is refund offset
      if (line.amount > 0) {
        rec.gross = round2(rec.gross + line.amount);
      } else if (line.amount < 0) {
        rec.offsets = round2(rec.offsets + Math.abs(line.amount));
      }
    }
  }

  // Operating income
  const incomeCategories: IncomeStatementCategory[] = [];
  let operatingIncome = 0;

  for (const [, rec] of incomeCatMap.entries()) {
    const net = Math.max(0, round2(rec.gross - rec.offsets));
    operatingIncome = round2(operatingIncome + net);
    incomeCategories.push({
      categoryName: rec.name,
      grossAmount: rec.gross,
      refundOffsets: rec.offsets,
      netAmount: net,
      percentage: 0,
    });
  }

  // Add Investment income (Gross dividends + Realized capital gains)
  const filteredDividends = dividends.filter((d) => {
    const pDate = d.paymentDate;
    return (!startDate || pDate >= startDate) && (!endDate || pDate <= endDate);
  });
  const grossDividendIncome = round2(filteredDividends.reduce((s, d) => s + d.grossDividend, 0));
  const investmentIncome = round2(grossDividendIncome + Math.max(0, realizedCapitalGains));

  if (grossDividendIncome > 0) {
    incomeCategories.push({
      categoryName: 'Stock Cash Dividends',
      grossAmount: grossDividendIncome,
      refundOffsets: 0,
      netAmount: grossDividendIncome,
      percentage: 0,
    });
  }
  if (realizedCapitalGains > 0) {
    incomeCategories.push({
      categoryName: 'Realized Stock Capital Gains',
      grossAmount: realizedCapitalGains,
      refundOffsets: 0,
      netAmount: realizedCapitalGains,
      percentage: 0,
    });
  }

  const totalIncome = round2(operatingIncome + investmentIncome);

  // Compute income percentages
  incomeCategories.forEach((c) => {
    c.percentage = totalIncome > 0 ? round2((c.netAmount / totalIncome) * 100) : 0;
  });
  incomeCategories.sort((a, b) => b.netAmount - a.netAmount);

  // Operating expenses
  const expenseCategories: IncomeStatementCategory[] = [];
  let operatingExpenses = 0;

  for (const [, rec] of expenseCatMap.entries()) {
    // Lock 6: Refund offsets reduce net expense
    const net = Math.max(0, round2(rec.gross - rec.offsets));
    operatingExpenses = round2(operatingExpenses + net);
    expenseCategories.push({
      categoryName: rec.name,
      grossAmount: rec.gross,
      refundOffsets: rec.offsets,
      netAmount: net,
      percentage: 0,
    });
  }

  const totalExpenses = round2(operatingExpenses);

  // Compute expense percentages
  expenseCategories.forEach((c) => {
    c.percentage = totalExpenses > 0 ? round2((c.netAmount / totalExpenses) * 100) : 0;
  });
  expenseCategories.sort((a, b) => b.netAmount - a.netAmount);

  const netSurplus = round2(totalIncome - totalExpenses);
  const savingsRatePct = totalIncome > 0 ? round2((netSurplus / totalIncome) * 100) : 0;

  return {
    startDate: startDate || 'Beginning',
    endDate: endDate || 'Present',
    operatingIncome,
    investmentIncome,
    totalIncome,
    incomeCategories,
    operatingExpenses,
    totalExpenses,
    expenseCategories,
    netSurplus,
    savingsRatePct,
  };
}

/**
 * Formats data rows into a clean downloadable CSV string.
 */
export function generateCsvString(headers: string[], rows: (string | number)[][]): string {
  const escapeCsv = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsv).join(','));
  return [headerLine, ...rowLines].join('\n');
}

/**
 * Triggers a browser file download for generated CSV or JSON.
 * Bulletproof implementation for desktop, mobile browsers, and iframe preview environments.
 */
export function downloadBrowserFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.setAttribute('href', url);
    link.setAttribute('download', cleanFilename);
    link.setAttribute('target', '_self');
    link.setAttribute('rel', 'noopener');
    document.body.appendChild(link);

    // Standard click
    link.click();

    // Cleanup after browser has begun handling download stream
    setTimeout(() => {
      try {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup error
      }
    }, 60000);
  } catch (err) {
    console.warn('Blob download failed, attempting data-uri fallback:', err);
    try {
      const encoded = encodeURIComponent(content);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.setAttribute('href', `data:${mimeType},${encoded}`);
      link.setAttribute('download', cleanFilename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        } catch {
          // ignore
        }
      }, 5000);
    } catch (fallbackErr) {
      console.error('All file download attempts failed:', fallbackErr);
    }
  }
}




