/**
 * Money Canvas — Budget Rollover & Spending Insights Engine (FEAT-8)
 *
 * Implements:
 * 1. Opt-in per-category budget rollover (carrying forward unspent surplus from M-1 into M).
 * 2. Effective spending limit calculation: base allocation + carried over surplus.
 * 3. 6-Month Category Spending Trend Analysis (MoM % variance, burn rate, seasonality).
 * 4. Automated Smart Financial Insights & budget optimization recommendations.
 */

import { Budget, Category, Transaction, TransactionLine } from '../types/accounting';
import { round2 } from './accounting-engine';

export interface BudgetRolloverSummary {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthYear: string;
  baseAllocation: number;
  rolloverEnabled: boolean;
  rolloverAmount: number;
  effectiveLimit: number;
  realizedSpend: number;
  remainingSafeMargin: number;
  utilizationPct: number;
  isOverBudget: boolean;
  isWarning: boolean;
  previousMonth: string;
  previousMonthSurplus: number;
  previousMonthAllocated: number;
  previousMonthSpent: number;
}

export interface MonthlyTrendDataPoint {
  monthYear: string;
  label: string;
  totalSpend: number;
  totalBudget: number;
  variance: number; // positive = under budget, negative = over budget
  categorySpend: Record<string, number>;
}

export interface CategoryTrendMetric {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlySpends: number[]; // 6 values corresponding to months
  averageMonthlySpend: number;
  currentMonthSpend: number;
  previousMonthSpend: number;
  momChangePct: number; // Month-over-month % change
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  total6MonthSpend: number;
  highestMonthLabel: string;
  highestMonthSpend: number;
}

export interface SpendingInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  metric?: string;
  categoryId?: string;
}

/**
 * Returns previous month in 'YYYY-MM' format.
 */
export function getPreviousMonth(monthYear: string): string {
  const [yearStr, monthStr] = monthYear.split('-');
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);
  if (isNaN(y) || isNaN(m)) {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }
  m -= 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${m.toString().padStart(2, '0')}`;
}

/**
 * Returns next month in 'YYYY-MM' format.
 */
export function getNextMonth(monthYear: string): string {
  const [yearStr, monthStr] = monthYear.split('-');
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);
  if (isNaN(y) || isNaN(m)) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 7);
  }
  m += 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${m.toString().padStart(2, '0')}`;
}

/**
 * Returns an array of the last N months ending at referenceMonth in chronological order.
 */
export function getLastNMonths(referenceMonth: string, count = 6): string[] {
  const result: string[] = [];
  let curr = referenceMonth;
  for (let i = 0; i < count; i++) {
    result.unshift(curr);
    curr = getPreviousMonth(curr);
  }
  return result;
}

/**
 * Formats 'YYYY-MM' to a readable English string, e.g. '2026-09' -> 'Sep 2026'.
 */
export function formatMonthLabel(monthYear: string, short = true): string {
  const [yearStr, monthStr] = monthYear.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;
  const date = new Date(y, m, 1);
  return date.toLocaleString('en-US', {
    month: short ? 'short' : 'long',
    year: 'numeric',
  });
}

/**
 * Evaluates budget rollover for a specific budget item.
 * If rollover is enabled, fetches previous month's budget surplus (effective budget - spent)
 * and adds it to the current month's base allocation.
 */
export function calculateBudgetRollover(
  budget: Budget,
  allBudgets: Budget[],
  categories: Category[],
  getCategorySpent: (categoryId: string, monthYear: string) => number
): BudgetRolloverSummary {
  const cat = categories.find((c) => c.id === budget.categoryId);
  const categoryName = cat?.name || 'Unassigned Category';
  const categoryColor = cat?.color || '#10B981';

  const prevMonth = getPreviousMonth(budget.monthYear);
  const prevBudget = allBudgets.find(
    (b) => b.categoryId === budget.categoryId && b.monthYear === prevMonth
  );

  let prevMonthSurplus = 0;
  let prevMonthAllocated = 0;
  let prevMonthSpent = 0;

  if (prevBudget) {
    const prevEffectiveLimit = round2(
      prevBudget.allocatedAmount + (prevBudget.rolloverEnabled ? (prevBudget.rolloverAmount || 0) : 0)
    );
    prevMonthAllocated = prevEffectiveLimit;
    prevMonthSpent = round2(getCategorySpent(budget.categoryId, prevMonth));
    prevMonthSurplus = round2(Math.max(0, prevEffectiveLimit - prevMonthSpent));
  }

  const isRolloverActive = Boolean(budget.rolloverEnabled);
  // Rollover amount is either the calculated surplus from previous month or any explicitly set rollover amount
  const rolloverAmount = isRolloverActive
    ? prevBudget
      ? prevMonthSurplus
      : round2(budget.rolloverAmount || 0)
    : 0;

  const baseAllocation = round2(budget.allocatedAmount);
  const effectiveLimit = round2(baseAllocation + rolloverAmount);
  const realizedSpend = round2(getCategorySpent(budget.categoryId, budget.monthYear));
  const remainingSafeMargin = round2(effectiveLimit - realizedSpend);
  const utilizationPct = effectiveLimit > 0 ? round2((realizedSpend / effectiveLimit) * 100) : 0;
  const isOverBudget = realizedSpend > effectiveLimit;
  const isWarning = !isOverBudget && utilizationPct >= (budget.warningThresholdPct || 90);

  return {
    budgetId: budget.id,
    categoryId: budget.categoryId,
    categoryName,
    categoryColor,
    monthYear: budget.monthYear,
    baseAllocation,
    rolloverEnabled: isRolloverActive,
    rolloverAmount,
    effectiveLimit,
    realizedSpend,
    remainingSafeMargin,
    utilizationPct,
    isOverBudget,
    isWarning,
    previousMonth: prevMonth,
    previousMonthSurplus: prevMonthSurplus,
    previousMonthAllocated: prevMonthAllocated,
    previousMonthSpent: prevMonthSpent,
  };
}

/**
 * Computes 6-month historical category trends, month-by-month spend vs budget,
 * and actionable financial intelligence insights.
 */
export function computeSpendingTrendsAndInsights(
  categories: Category[],
  transactions: Transaction[],
  transactionLines: TransactionLine[],
  budgets: Budget[],
  referenceMonth: string,
  numMonths = 6
): {
  monthlyData: MonthlyTrendDataPoint[];
  categoryMetrics: CategoryTrendMetric[];
  insights: SpendingInsight[];
  overallStats: {
    averageMonthlySpend: number;
    highestSpendMonth: string;
    lowestSpendMonth: string;
    totalTrackedSpend: number;
    budgetComplianceRate: number; // percentage of months under budget
  };
} {
  const months = getLastNMonths(referenceMonth, numMonths);
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Pre-index posted transaction IDs per month
  const postedTxByMonth: Record<string, Set<string>> = {};
  for (const m of months) {
    postedTxByMonth[m] = new Set(
      transactions
        .filter((t) => t.status === 'posted' && t.date.startsWith(m))
        .map((t) => t.id)
    );
  }

  // Pre-compute category spend per month
  const spendMatrix: Record<string, Record<string, number>> = {};
  for (const m of months) {
    spendMatrix[m] = {};
    for (const cat of expenseCategories) {
      spendMatrix[m][cat.id] = 0;
    }
  }

  for (const line of transactionLines) {
    if (line.lineType === 'category' && line.categoryId) {
      for (const m of months) {
        if (postedTxByMonth[m].has(line.transactionId)) {
          if (!spendMatrix[m][line.categoryId]) {
            spendMatrix[m][line.categoryId] = 0;
          }
          // Expense line: positive amount = expense, negative = refund
          spendMatrix[m][line.categoryId] = round2(
            spendMatrix[m][line.categoryId] + line.amount
          );
        }
      }
    }
  }

  // Construct MonthlyTrendDataPoint[]
  const monthlyData: MonthlyTrendDataPoint[] = months.map((m) => {
    let totalSpend = 0;
    const catMap: Record<string, number> = {};

    for (const cat of expenseCategories) {
      const sp = Math.max(0, spendMatrix[m][cat.id] || 0);
      catMap[cat.id] = sp;
      totalSpend = round2(totalSpend + sp);
    }

    const monthBudgets = budgets.filter((b) => b.monthYear === m);
    const totalBudget = round2(
      monthBudgets.reduce(
        (sum, b) => sum + b.allocatedAmount + (b.rolloverEnabled ? (b.rolloverAmount || 0) : 0),
        0
      )
    );

    return {
      monthYear: m,
      label: formatMonthLabel(m, true),
      totalSpend,
      totalBudget,
      variance: round2(totalBudget - totalSpend),
      categorySpend: catMap,
    };
  });

  // Construct CategoryTrendMetric[]
  const categoryMetrics: CategoryTrendMetric[] = expenseCategories
    .map((cat) => {
      const monthlySpends = months.map((m) => Math.max(0, spendMatrix[m][cat.id] || 0));
      const total6MonthSpend = round2(monthlySpends.reduce((a, b) => a + b, 0));
      const averageMonthlySpend = round2(total6MonthSpend / numMonths);

      const currentMonthSpend = monthlySpends[monthlySpends.length - 1] || 0;
      const previousMonthSpend = monthlySpends[monthlySpends.length - 2] || 0;

      let momChangePct = 0;
      if (previousMonthSpend > 0) {
        momChangePct = round2(((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100);
      } else if (currentMonthSpend > 0) {
        momChangePct = 100;
      }

      let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (momChangePct > 5) trendDirection = 'increasing';
      else if (momChangePct < -5) trendDirection = 'decreasing';

      let highestMonthSpend = -1;
      let highestMonthLabel = '';
      monthlySpends.forEach((amt, idx) => {
        if (amt > highestMonthSpend) {
          highestMonthSpend = amt;
          highestMonthLabel = formatMonthLabel(months[idx], true);
        }
      });

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color || '#10B981',
        monthlySpends,
        averageMonthlySpend,
        currentMonthSpend,
        previousMonthSpend,
        momChangePct,
        trendDirection,
        total6MonthSpend,
        highestMonthLabel,
        highestMonthSpend: Math.max(0, highestMonthSpend),
      };
    })
    .filter((m) => m.total6MonthSpend > 0 || m.currentMonthSpend > 0)
    .sort((a, b) => b.currentMonthSpend - a.currentMonthSpend);

  // Overall Stats
  const totalTrackedSpend = round2(monthlyData.reduce((s, m) => s + m.totalSpend, 0));
  const averageMonthlySpend = round2(totalTrackedSpend / numMonths);

  let highestSpendMonth = '';
  let highestSpendAmt = -1;
  let lowestSpendMonth = '';
  let lowestSpendAmt = Infinity;
  let monthsWithBudget = 0;
  let monthsUnderBudget = 0;

  for (const m of monthlyData) {
    if (m.totalSpend > highestSpendAmt) {
      highestSpendAmt = m.totalSpend;
      highestSpendMonth = m.label;
    }
    if (m.totalSpend < lowestSpendAmt) {
      lowestSpendAmt = m.totalSpend;
      lowestSpendMonth = m.label;
    }
    if (m.totalBudget > 0) {
      monthsWithBudget++;
      if (m.totalSpend <= m.totalBudget) {
        monthsUnderBudget++;
      }
    }
  }

  const budgetComplianceRate =
    monthsWithBudget > 0 ? round2((monthsUnderBudget / monthsWithBudget) * 100) : 100;

  // Generate Smart Financial Insights
  const insights: SpendingInsight[] = [];

  // Insight 1: Top Category Spend
  if (categoryMetrics.length > 0) {
    const topCat = categoryMetrics[0];
    const topPct =
      monthlyData[monthlyData.length - 1].totalSpend > 0
        ? ((topCat.currentMonthSpend / monthlyData[monthlyData.length - 1].totalSpend) * 100).toFixed(0)
        : '0';
    insights.push({
      id: 'insight-top-spend',
      type: 'info',
      title: `Largest Outflow: ${topCat.categoryName}`,
      description: `${topCat.categoryName} represents ${topPct}% of your total expenditures this month (৳${topCat.currentMonthSpend.toLocaleString()}).`,
      metric: `৳${topCat.currentMonthSpend.toLocaleString()}`,
      categoryId: topCat.categoryId,
    });
  }

  // Insight 2: Biggest Reduction / Cost Savings Win
  const biggestSaver = [...categoryMetrics]
    .filter((m) => m.previousMonthSpend > 1000 && m.momChangePct < -10)
    .sort((a, b) => a.momChangePct - b.momChangePct)[0];

  if (biggestSaver) {
    const savedAmount = Math.abs(biggestSaver.previousMonthSpend - biggestSaver.currentMonthSpend);
    insights.push({
      id: 'insight-biggest-saver',
      type: 'success',
      title: `Spending Win: ${biggestSaver.categoryName}`,
      description: `You cut spending in ${biggestSaver.categoryName} by ${Math.abs(biggestSaver.momChangePct)}% compared to last month, saving ৳${savedAmount.toLocaleString()}!`,
      metric: `-${Math.abs(biggestSaver.momChangePct)}%`,
      categoryId: biggestSaver.categoryId,
    });
  }

  // Insight 3: Rapid Increase / Burn Rate Alert
  const rapidSpender = [...categoryMetrics]
    .filter((m) => m.previousMonthSpend > 500 && m.momChangePct > 25 && m.currentMonthSpend > 1500)
    .sort((a, b) => b.momChangePct - a.momChangePct)[0];

  if (rapidSpender) {
    insights.push({
      id: 'insight-rapid-spike',
      type: 'warning',
      title: `Spend Surge in ${rapidSpender.categoryName}`,
      description: `Spending in ${rapidSpender.categoryName} jumped +${rapidSpender.momChangePct}% this month compared to last month. Consider reviewing your line items.`,
      metric: `+${rapidSpender.momChangePct}%`,
      categoryId: rapidSpender.categoryId,
    });
  }

  // Insight 4: Rollover Opportunity
  const prevMonthStr = getPreviousMonth(referenceMonth);
  const prevBudgets = budgets.filter((b) => b.monthYear === prevMonthStr);
  const unrolledSurpluses = prevBudgets.filter((pb) => {
    const sp = spendMatrix[prevMonthStr]?.[pb.categoryId] || 0;
    const surplus = pb.allocatedAmount - sp;
    const currentBudget = budgets.find((b) => b.categoryId === pb.categoryId && b.monthYear === referenceMonth);
    return surplus > 500 && (!currentBudget || !currentBudget.rolloverEnabled);
  });

  if (unrolledSurpluses.length > 0) {
    const totalPotentialRollover = unrolledSurpluses.reduce((sum, pb) => {
      const sp = spendMatrix[prevMonthStr]?.[pb.categoryId] || 0;
      return sum + Math.max(0, pb.allocatedAmount - sp);
    }, 0);

    insights.push({
      id: 'insight-rollover-opportunity',
      type: 'tip',
      title: 'Rollover Surplus Available',
      description: `You had ৳${totalPotentialRollover.toLocaleString()} in unused allocations from ${formatMonthLabel(prevMonthStr, true)}. Enable rollover to carry this buffer forward!`,
      metric: `৳${totalPotentialRollover.toLocaleString()}`,
    });
  }

  // Insight 5: Budget Adherence Scorecard
  if (monthsWithBudget >= 2) {
    insights.push({
      id: 'insight-adherence',
      type: budgetComplianceRate >= 80 ? 'success' : 'info',
      title: `Budget Discipline: ${budgetComplianceRate}% Compliance`,
      description: `You stayed within your aggregate monthly spending limit in ${monthsUnderBudget} of the last ${monthsWithBudget} budgeted months.`,
      metric: `${budgetComplianceRate}%`,
    });
  }

  return {
    monthlyData,
    categoryMetrics,
    insights,
    overallStats: {
      averageMonthlySpend,
      highestSpendMonth: highestSpendMonth || 'N/A',
      lowestSpendMonth: lowestSpendMonth || 'N/A',
      totalTrackedSpend,
      budgetComplianceRate,
    },
  };
}
