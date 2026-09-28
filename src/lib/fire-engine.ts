/**
 * Retirement & FIRE (Financial Independence, Retire Early) Calculation Engine
 * Comprehensive multi-decade simulation designed for Bangladesh and emerging market macroeconomic factors.
 */

import {
  FireInputParameters,
  YearProjectionRecord,
  FireMilestoneItem,
  FireSimulationResult,
} from '../types/fire-retirement';

export const DEFAULT_FIRE_INPUTS: FireInputParameters = {
  currentAge: 32,
  targetRetirementAge: 48,
  lifeExpectancyAge: 82,
  currentNetWorth: 2850000, // ৳28.5 Lakh starting liquid/invested net worth
  monthlyLivingExpense: 65000, // ৳65k current living expense
  monthlySavingsContribution: 45000, // ৳45k ongoing monthly investments
  expectedPreRetirementReturn: 12.0, // 12% blended portfolio CAGR (Stocks, FDR, Sanchayapatra)
  expectedPostRetirementReturn: 9.5, // 9.5% conservative fixed-income return (Bonds, Sukuk, DPS)
  expectedInflationRate: 7.0, // 7% average Bangladesh inflation rate
  postRetirementExpenseRatio: 85, // 85% of current expenses in retirement
  safeWithdrawalRatePercent: 4.5, // 4.5% Safe Withdrawal Rate (SWR)
  pensionOrPassiveMonthlyIncome: 10000, // ৳10k expected rental or pension income
  emergencyHealthBuffer: 1500000, // ৳15 Lakh emergency medical reserve
};

const STORAGE_KEY = 'wealthfolio_fire_settings_v1';

export function getSavedFireInputs(): FireInputParameters {
  if (typeof window === 'undefined') return DEFAULT_FIRE_INPUTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FIRE_INPUTS;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.currentAge === 'number' && typeof parsed.monthlyLivingExpense === 'number') {
      return { ...DEFAULT_FIRE_INPUTS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse FIRE settings', e);
  }
  return DEFAULT_FIRE_INPUTS;
}

export function saveFireInputs(inputs: FireInputParameters): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch (e) {
    console.error('Failed to save FIRE settings', e);
  }
}

/**
 * Executes a full multi-decade wealth trajectory and FIRE analysis
 */
export function runFireSimulation(params: FireInputParameters): FireSimulationResult {
  const currentYear = new Date().getFullYear();
  const yearsToRetirement = Math.max(0, params.targetRetirementAge - params.currentAge);
  const totalSimulationYears = Math.max(1, params.lifeExpectancyAge - params.currentAge);

  // 1. Annual Baseline Expenses
  const currentAnnualExpense = params.monthlyLivingExpense * 12;
  const postRetirementAnnualExpenseToday =
    currentAnnualExpense * (params.postRetirementExpenseRatio / 100);
  const annualPassiveIncome = params.pensionOrPassiveMonthlyIncome * 12;
  const netRetirementAnnualExpenseToday = Math.max(0, postRetirementAnnualExpenseToday - annualPassiveIncome);

  // 2. Standard FIRE Number in today's purchasing power
  const swrFactor = (params.safeWithdrawalRatePercent || 4.5) / 100;
  const standardFireNumberToday = Math.round(
    netRetirementAnnualExpenseToday / swrFactor + params.emergencyHealthBuffer
  );

  // 3. Inflation adjusted FIRE Number at retirement age
  const inflationMultiplierAtRetirement = Math.pow(
    1 + params.expectedInflationRate / 100,
    yearsToRetirement
  );
  const fireNumberFuture = Math.round(standardFireNumberToday * inflationMultiplierAtRetirement);

  // 4. Milestone Targets in Today's Money
  const leanFireTargetToday = Math.round(standardFireNumberToday * 0.7); // 70% frugal baseline
  const fatFireTargetToday = Math.round(standardFireNumberToday * 1.4); // 140% luxury baseline
  const baristaFireTargetToday = Math.round(standardFireNumberToday * 0.55); // 55% part-time cushion

  // Coast FIRE: Amount needed right now so compounding alone reaches FIRE number without extra contribution
  const preReturnFactor = 1 + params.expectedPreRetirementReturn / 100;
  const coastFireTargetToday = Math.round(
    fireNumberFuture / Math.pow(preReturnFactor, yearsToRetirement)
  );

  // 5. Multi-Decade Year by Year Simulation Loop
  const projections: YearProjectionRecord[] = [];
  let currentCorpus = params.currentNetWorth;
  let annualContribution = params.monthlySavingsContribution * 12;
  let isSolvent = true;
  let depletionAge: number | undefined = undefined;
  let achievedFireAge: number | undefined = undefined;

  for (let i = 0; i <= totalSimulationYears; i++) {
    const age = params.currentAge + i;
    const year = currentYear + i;
    const isAccumulation = age < params.targetRetirementAge;
    const inflationFactor = Math.pow(1 + params.expectedInflationRate / 100, i);

    const startingNetWorth = Math.round(currentCorpus);

    if (isAccumulation) {
      // Accumulation Phase
      // Contributions assumed to scale partially with inflation (5% annual step-up)
      const thisYearContribution = Math.round(annualContribution * Math.pow(1.04, i));
      const returns = Math.round(
        (startingNetWorth + thisYearContribution / 2) * (params.expectedPreRetirementReturn / 100)
      );
      const endingNetWorth = startingNetWorth + thisYearContribution + returns;

      projections.push({
        year,
        age,
        phase: 'accumulation',
        startingNetWorth,
        annualContribution: thisYearContribution,
        investmentReturns: returns,
        annualLivingExpense: Math.round(currentAnnualExpense * inflationFactor),
        pensionIncome: 0,
        endingNetWorth,
        inflationFactor,
        isSolvent: true,
      });

      currentCorpus = endingNetWorth;

      if (!achievedFireAge && currentCorpus >= standardFireNumberToday * inflationFactor) {
        achievedFireAge = age;
      }
    } else {
      // Retirement & Distribution Phase
      const annualExpenseInflated = Math.round(postRetirementAnnualExpenseToday * inflationFactor);
      const pensionInflated = Math.round(annualPassiveIncome * Math.pow(1.03, i)); // Partial inflation indexing on pension
      const netLivingExpense = Math.max(0, annualExpenseInflated - pensionInflated);

      let returns = 0;
      let endingNetWorth = 0;

      if (startingNetWorth > 0) {
        const remainingToInvest = Math.max(0, startingNetWorth - netLivingExpense / 2);
        returns = Math.round(remainingToInvest * (params.expectedPostRetirementReturn / 100));
        endingNetWorth = startingNetWorth - netLivingExpense + returns;

        if (endingNetWorth <= 0) {
          endingNetWorth = 0;
          isSolvent = false;
          if (!depletionAge) depletionAge = age;
        }
      } else {
        endingNetWorth = 0;
        isSolvent = false;
        if (!depletionAge) depletionAge = age;
      }

      projections.push({
        year,
        age,
        phase: 'retirement',
        startingNetWorth,
        annualContribution: 0,
        investmentReturns: returns,
        annualLivingExpense: annualExpenseInflated,
        pensionIncome: pensionInflated,
        endingNetWorth,
        inflationFactor,
        isSolvent: endingNetWorth > 0,
      });

      currentCorpus = endingNetWorth;
    }
  }

  // 6. Savings Rate Metric
  const totalAnnualIncomeEstimate = currentAnnualExpense + params.monthlySavingsContribution * 12;
  const annualSavingsRatePercent = totalAnnualIncomeEstimate > 0
    ? Math.round(((params.monthlySavingsContribution * 12) / totalAnnualIncomeEstimate) * 100)
    : 0;

  // 7. Monthly passive cash flow yield generated at retirement
  const monthlyPassiveIncomeAtRetirement = Math.round(
    (fireNumberFuture * (params.expectedPostRetirementReturn / 100)) / 12
  );

  // 8. Milestones progress
  const milestones: FireMilestoneItem[] = [
    {
      type: 'coast_fire',
      titleBn: 'কোস্ট ফায়ার (Coast FIRE)',
      titleEn: 'Coast FIRE',
      descriptionBn: 'বর্তমান জমানো অর্থেই অবসর নিশ্চিত; ভবিষ্যতে নতুন করে না জমালেও চলবে।',
      descriptionEn: 'Current net worth alone will compound to your retirement goal without extra savings.',
      targetAmount: coastFireTargetToday,
      progressPercent: Math.min(100, Math.round((params.currentNetWorth / coastFireTargetToday) * 100)),
      achieved: params.currentNetWorth >= coastFireTargetToday,
      projectedAge: params.currentAge,
      projectedYear: currentYear,
    },
    {
      type: 'lean_fire',
      titleBn: 'লিন ফায়ার (Lean FIRE - বেসিক স্বাবলম্বিতা)',
      titleEn: 'Lean FIRE',
      descriptionBn: 'শুধুমাত্র মৌলিক জীবনযাত্রার খরচ (বাসা ভাড়া, খাদ্য ও ইউটিলিটি) আজীবনের জন্য নিশ্চিত।',
      descriptionEn: 'Covers essential frugality expenses without discretionary luxuries.',
      targetAmount: leanFireTargetToday,
      progressPercent: Math.min(100, Math.round((params.currentNetWorth / leanFireTargetToday) * 100)),
      achieved: params.currentNetWorth >= leanFireTargetToday,
      projectedAge: achievedFireAge ? Math.max(params.currentAge, achievedFireAge - 3) : params.targetRetirementAge - 3,
      projectedYear: currentYear + (achievedFireAge ? Math.max(0, achievedFireAge - params.currentAge - 3) : Math.max(0, yearsToRetirement - 3)),
    },
    {
      type: 'barista_fire',
      titleBn: 'বারিস্টা ফায়ার (Barista FIRE - পার্টটাইম কাজ)',
      titleEn: 'Barista FIRE',
      descriptionBn: 'সম্পদ থেকে খরচের ৫০-৬০% প্যাসিভ আয় আসবে; বাকি অংশ পছন্দের হালকা কাজ থেকে।',
      descriptionEn: 'Semi-retired; investments cover 60% of living while passion work covers the rest.',
      targetAmount: baristaFireTargetToday,
      progressPercent: Math.min(100, Math.round((params.currentNetWorth / baristaFireTargetToday) * 100)),
      achieved: params.currentNetWorth >= baristaFireTargetToday,
      projectedAge: achievedFireAge ? Math.max(params.currentAge, achievedFireAge - 2) : params.targetRetirementAge - 2,
      projectedYear: currentYear + (achievedFireAge ? Math.max(0, achievedFireAge - params.currentAge - 2) : Math.max(0, yearsToRetirement - 2)),
    },
    {
      type: 'standard_fire',
      titleBn: 'ফুল ফায়ার (Standard Financial Freedom)',
      titleEn: 'Standard FIRE',
      descriptionBn: 'বর্তমান শতভাগ লাইফস্টাইল আজীবন কোনো ধরনের বাধ্যতামূলক চাকরি ছাড়াই চলমান থাকবে।',
      descriptionEn: 'Full financial independence covering 100% of current living standards.',
      targetAmount: standardFireNumberToday,
      progressPercent: Math.min(100, Math.round((params.currentNetWorth / standardFireNumberToday) * 100)),
      achieved: params.currentNetWorth >= standardFireNumberToday,
      projectedAge: achievedFireAge || params.targetRetirementAge,
      projectedYear: currentYear + (achievedFireAge ? achievedFireAge - params.currentAge : yearsToRetirement),
    },
    {
      type: 'fat_fire',
      titleBn: 'ফ্যাট ফায়ার (Fat FIRE - প্রিমিয়াম লাইফস্টাইল)',
      titleEn: 'Fat FIRE',
      descriptionBn: 'বিদেশ ভ্রমণ, বিলাসী জীবনযাপন এবং পরবর্তী প্রজন্মের জন্য বৃহৎ উত্তরাধিকার।',
      descriptionEn: 'Abundant luxury, global travel, and generous multi-generational legacy.',
      targetAmount: fatFireTargetToday,
      progressPercent: Math.min(100, Math.round((params.currentNetWorth / fatFireTargetToday) * 100)),
      achieved: params.currentNetWorth >= fatFireTargetToday,
      projectedAge: (achievedFireAge || params.targetRetirementAge) + 4,
      projectedYear: currentYear + (achievedFireAge ? achievedFireAge - params.currentAge : yearsToRetirement) + 4,
    },
  ];

  // 9. Analytical Insights
  const fireAge = achievedFireAge || params.targetRetirementAge;
  const isFireAchievable = !depletionAge || depletionAge >= params.lifeExpectancyAge;

  const insightsBn: string[] = [
    `আপনার বর্তমান সঞ্চয়ের হার প্রায় ${annualSavingsRatePercent}%। প্রতি মাসে ৳${params.monthlySavingsContribution.toLocaleString()} বিনিয়োগ অব্যাহত রাখলে বয়স ${fireAge}-তে ফায়ার কর্পাস পূর্ণ হবে।`,
    `আজকের টাকার মূল্যে আপনার ফায়ার নাম্বার ৳${(standardFireNumberToday / 100000).toFixed(1)} লাখ। ৭% বার্ষিক মুদ্রাস্ফীতি বিবেচনায় ${yearsToRetirement} বছর পর প্রয়োজন হবে প্রায় ৳${(fireNumberFuture / 10000000).toFixed(2)} কোটি।`,
    params.currentNetWorth >= coastFireTargetToday
      ? 'অভিনন্দন! আপনি ইতোমধ্যে কোস্ট ফায়ার (Coast FIRE) অতিক্রম করেছেন—অর্থাৎ বর্তমান বিনিয়োগ চক্রবৃদ্ধি হারে নিজেই অবসর লক্ষ্যমাত্রা স্পর্শ করবে।'
      : `কোস্ট ফায়ারে পৌঁছাতে আর মাত্র ৳${Math.max(0, coastFireTargetToday - params.currentNetWorth).toLocaleString()} প্রয়োজন।`,
    depletionAge
      ? `সতর্কতা: বর্তমান উত্তোলনের হারে বয়স ${depletionAge}-তে তহবিল নিঃশেষিত হওয়ার সম্ভাবনা রয়েছে। নিরাপদ থাকতে মাসিক সঞ্চয় বৃদ্ধি অথবা অবসর বয়স কিছুটা পেছানো উচিত।`
      : `অভিনন্দন! আপনার কর্পাস বয়স ${params.lifeExpectancyAge} পেরিয়েও দীর্ঘমেয়াদে অক্ষুণ্ণ থাকবে (স্থায়িত্ব ১০০%)।`,
  ];

  const insightsEn: string[] = [
    `Your current savings rate is ~${annualSavingsRatePercent}%. Investing ৳${params.monthlySavingsContribution.toLocaleString()}/mo puts you on track for financial freedom at age ${fireAge}.`,
    `Your FIRE Number in today's currency is ৳${(standardFireNumberToday / 100000).toFixed(1)} Lakh. In ${yearsToRetirement} years at 7% inflation, you will need ~৳${(fireNumberFuture / 10000000).toFixed(2)} Crore.`,
    params.currentNetWorth >= coastFireTargetToday
      ? 'Congratulations! You have crossed Coast FIRE—your existing portfolio will compound to your retirement target even without further contributions.'
      : `You need ৳${Math.max(0, coastFireTargetToday - params.currentNetWorth).toLocaleString()} more to lock in Coast FIRE milestone.`,
    depletionAge
      ? `Caution: Funds may deplete around age ${depletionAge}. Consider boosting your savings rate or extending your horizon by 2-3 years.`
      : `High Solvency: Your portfolio is fully sustainable through age ${params.lifeExpectancyAge} with an inflation buffer.`,
  ];

  return {
    inputs: params,
    fireNumberToday: standardFireNumberToday,
    fireNumberFuture,
    yearsToFire: Math.max(0, fireAge - params.currentAge),
    fireAge,
    fireYear: currentYear + Math.max(0, fireAge - params.currentAge),
    isFireAchievable,
    canSustainUntilLifeExpectancy: !depletionAge,
    depletionAge,
    monthlyPassiveIncomeAtRetirement,
    annualSavingsRatePercent,
    milestones,
    projections,
    summaryInsights: {
      bn: insightsBn,
      en: insightsEn,
    },
  };
}
