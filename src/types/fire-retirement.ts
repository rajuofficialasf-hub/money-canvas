/**
 * Retirement & FIRE (Financial Independence, Retire Early) Types
 * Data models for long-term wealth accumulation, SWR, and retirement modeling.
 */

export type FireMilestoneType = 'coast_fire' | 'lean_fire' | 'standard_fire' | 'fat_fire' | 'barista_fire';

export interface FireInputParameters {
  currentAge: number;
  targetRetirementAge: number;
  lifeExpectancyAge: number;
  currentNetWorth: number; // Investable liquid net worth in BDT
  monthlyLivingExpense: number; // Current monthly expenses in BDT
  monthlySavingsContribution: number; // New monthly savings/investments
  expectedPreRetirementReturn: number; // % annual ROI (e.g. 11.5%)
  expectedPostRetirementReturn: number; // % annual safe return (e.g. 9.5%)
  expectedInflationRate: number; // % annual inflation in BD (e.g. 7.5%)
  postRetirementExpenseRatio: number; // % of current expense needed (e.g. 85%)
  safeWithdrawalRatePercent: number; // SWR (e.g. 4.0% - 5.0%)
  pensionOrPassiveMonthlyIncome: number; // Fixed monthly pension/rental income in retirement
  emergencyHealthBuffer: number; // One-time health emergency corpus in BDT
}

export interface YearProjectionRecord {
  year: number;
  age: number;
  phase: 'accumulation' | 'retirement';
  startingNetWorth: number;
  annualContribution: number;
  investmentReturns: number;
  annualLivingExpense: number;
  pensionIncome: number;
  endingNetWorth: number;
  inflationFactor: number;
  isSolvent: boolean;
}

export interface FireMilestoneItem {
  type: FireMilestoneType;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  targetAmount: number;
  progressPercent: number;
  achieved: boolean;
  projectedAge: number;
  projectedYear: number;
}

export interface FireSimulationResult {
  inputs: FireInputParameters;
  fireNumberToday: number; // Target corpus in today's money
  fireNumberFuture: number; // Target corpus adjusted for inflation at retirement
  yearsToFire: number;
  fireAge: number;
  fireYear: number;
  isFireAchievable: boolean;
  canSustainUntilLifeExpectancy: boolean;
  depletionAge?: number; // Age at which money runs out (if any)
  monthlyPassiveIncomeAtRetirement: number;
  annualSavingsRatePercent: number;
  milestones: FireMilestoneItem[];
  projections: YearProjectionRecord[];
  summaryInsights: {
    bn: string[];
    en: string[];
  };
}
