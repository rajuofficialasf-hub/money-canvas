import { toLocalISO } from './date-utils';
/**
 * Bangladesh National Savings Certificates (সঞ্চয়পত্র),
 * Treasury Bonds (ট্রেজারি বন্ড) & Islamic Sukuk Engine
 * Accurate calculations matching National Savings Directorate & Bangladesh Bank rules.
 */

import {
  BondCategory,
  SanchayaSchemeType,
  PayoutFrequency,
  SanchayaBondItem,
  UpcomingPaymentSchedule,
  EncashmentRuleSlab,
} from '../types/sanchaya-bond';
import { round2 } from './accounting-engine';

export interface SchemePreset {
  schemeType: SanchayaSchemeType;
  category: BondCategory;
  nameBn: string;
  nameEn: string;
  defaultTenureYears: number;
  defaultRate: number; // default annual coupon/profit rate %
  payoutFrequency: PayoutFrequency;
  minInvestment: number;
  maxInvestmentIndividual: number;
  maxInvestmentJoint: number;
  description: string;
  taxDeductionRate: number; // 5% for up to 5L, 10% for above 5L
  isTaxRebateEligible: boolean;
}

export const SCHEME_PRESETS: SchemePreset[] = [
  {
    schemeType: 'poribar',
    category: 'sanchayapatra',
    nameBn: 'পরিবার সঞ্চয়পত্র',
    nameEn: 'Poribar Sanchayapatra (Monthly)',
    defaultTenureYears: 5,
    defaultRate: 11.52,
    payoutFrequency: 'monthly',
    minInvestment: 10000,
    maxInvestmentIndividual: 4500000,
    maxInvestmentJoint: 4500000, // Joint not allowed for Poribar
    description: '৫ বছর মেয়াদী, প্রতি মাসে মুনাফা প্রদেয়। ১৮+ বয়সী নারী অথবা শারীরিক প্রতিবন্ধী যেকোনো নাগরিকের জন্য।',
    taxDeductionRate: 10,
    isTaxRebateEligible: true,
  },
  {
    schemeType: 'three_month',
    category: 'sanchayapatra',
    nameBn: '৩-মাস অন্তর মুনাফাভিত্তিক সঞ্চয়পত্র',
    nameEn: '3-Month Profit-Bearing Sanchayapatra',
    defaultTenureYears: 3,
    defaultRate: 11.04,
    payoutFrequency: 'quarterly',
    minInvestment: 100000,
    maxInvestmentIndividual: 3000000,
    maxInvestmentJoint: 6000000,
    description: '৩ বছর মেয়াদী, প্রতি ৩ মাস পর পর মুনাফা প্রদেয়। সকল প্রাপ্তবয়স্ক বাংলাদেশী নাগরিক ও যৌথ নামের জন্য।',
    taxDeductionRate: 10,
    isTaxRebateEligible: true,
  },
  {
    schemeType: 'pensioner',
    category: 'sanchayapatra',
    nameBn: 'পেনশনার সঞ্চয়পত্র',
    nameEn: 'Pensioner Sanchayapatra',
    defaultTenureYears: 5,
    defaultRate: 11.76,
    payoutFrequency: 'quarterly',
    minInvestment: 50000,
    maxInvestmentIndividual: 5000000,
    maxInvestmentJoint: 5000000,
    description: '৫ বছর মেয়াদী, প্রতি ৩ মাস পর পর মুনাফা। সরকারি, আধা-সরকারি ও স্বায়ত্তশাসিত প্রতিষ্ঠানের অবসরপ্রাপ্তদের জন্য।',
    taxDeductionRate: 10,
    isTaxRebateEligible: true,
  },
  {
    schemeType: 'bangladesh_5yr',
    category: 'sanchayapatra',
    nameBn: '৫-বছর মেয়াদী বাংলাদেশ সঞ্চয়পত্র',
    nameEn: '5-Year Bangladesh Sanchayapatra',
    defaultTenureYears: 5,
    defaultRate: 11.28,
    payoutFrequency: 'at_maturity',
    minInvestment: 10000,
    maxInvestmentIndividual: 3000000,
    maxInvestmentJoint: 6000000,
    description: '৫ বছর মেয়াদী, মেয়াদান্তে চক্রবৃদ্ধি হারে মূলধন সহ এককালীন পূর্ণ মুনাফা প্রদেয়।',
    taxDeductionRate: 10,
    isTaxRebateEligible: true,
  },
  {
    schemeType: 'post_office_fixed',
    category: 'sanchayapatra',
    nameBn: 'ডাকঘর সঞ্চয় ব্যাংক (মেয়াদী)',
    nameEn: 'Post Office Savings Bank (Fixed)',
    defaultTenureYears: 3,
    defaultRate: 11.28,
    payoutFrequency: 'at_maturity',
    minInvestment: 10000,
    maxInvestmentIndividual: 3000000,
    maxInvestmentJoint: 6000000,
    description: 'ডাকঘর ব্যাংকে ১, ২ বা ৩ বছর মেয়াদী বিনিয়োগ। মেয়াদান্তে মুনাফা প্রদেয়।',
    taxDeductionRate: 10,
    isTaxRebateEligible: true,
  },
  {
    schemeType: 'wage_earners',
    category: 'sanchayapatra',
    nameBn: 'ওয়েজ আর্নার্স ডেভেলপমেন্ট বন্ড (WEDB)',
    nameEn: 'Wage Earners Development Bond',
    defaultTenureYears: 5,
    defaultRate: 12.00,
    payoutFrequency: 'semi_annually',
    minInvestment: 25000,
    maxInvestmentIndividual: 50000000,
    maxInvestmentJoint: 50000000,
    description: 'প্রবাসী বাংলাদেশীদের বৈধ রেমিট্যান্সের বিপরীতে ৫ বছর মেয়াদী বন্ড। প্রতি ৬ মাস পর পর মুনাফা ও সম্পূর্ণ উৎসে কর মুক্ত।',
    taxDeductionRate: 0,
    isTaxRebateEligible: true,
  },
  {
    schemeType: 'treasury_bond_10y',
    category: 'treasury_bond',
    nameBn: 'বাংলাদেশ ব্যাংক ১০ বছর ট্রেজারি বন্ড (BGTB)',
    nameEn: 'Bangladesh Govt Treasury Bond (10-Year BGTB)',
    defaultTenureYears: 10,
    defaultRate: 12.10,
    payoutFrequency: 'semi_annually',
    minInvestment: 100000,
    maxInvestmentIndividual: 100000000,
    maxInvestmentJoint: 100000000,
    description: 'বাংলাদেশ ব্যাংক কর্তৃক ইস্যুকৃত শতভাগ সরকারি সার্বভৌম নিরাপত্তা বন্ড। প্রতি ৬ মাস পর পর কুপন প্রদেয়।',
    taxDeductionRate: 5,
    isTaxRebateEligible: true,
  },
  {
    schemeType: 'treasury_bond_5y',
    category: 'treasury_bond',
    nameBn: 'বাংলাদেশ ব্যাংক ৫ বছর ট্রেজারি বন্ড (BGTB)',
    nameEn: 'Bangladesh Govt Treasury Bond (5-Year BGTB)',
    defaultTenureYears: 5,
    defaultRate: 11.85,
    payoutFrequency: 'semi_annually',
    minInvestment: 100000,
    maxInvestmentIndividual: 100000000,
    maxInvestmentJoint: 100000000,
    description: '৫ বছর মেয়াদী সরকারি ট্রেজারি বন্ড। প্রতি ৬ মাসে নির্দিষ্ট কুপন সরাসরি বিএফটিএন মারফত ব্যাংক অ্যাকাউন্টে জমা।',
    taxDeductionRate: 5,
    isTaxRebateEligible: true,
  },
  {
    schemeType: 'govt_ijarah_sukuk',
    category: 'islamic_sukuk',
    nameBn: 'বাংলাদেশ সরকার ইসলামিক সুকুক (Ijarah Sukuk)',
    nameEn: 'Bangladesh Govt Islamic Ijarah Sukuk',
    defaultTenureYears: 5,
    defaultRate: 9.80,
    payoutFrequency: 'semi_annually',
    minInvestment: 100000,
    maxInvestmentIndividual: 100000000,
    maxInvestmentJoint: 100000000,
    description: 'শরীয়াহ সম্মত সার্বভৌম ইসলামিক সুকুক সিকিউরিটি। সরকারি বাস্তব অবকাঠামোগত সম্পদের ভাড়াভিত্তিক সেমি-অ্যানুয়াল রিটার্ন।',
    taxDeductionRate: 5,
    isTaxRebateEligible: true,
  },
];

/**
 * Pre-mature Encashment Sliding Scale Tables (মেয়াদপূর্তির পূর্বে ভাঙ্গালে প্রদেয় মুনাফার হার)
 */
export const PORIBAR_ENCASHMENT_RULES: EncashmentRuleSlab[] = [
  { completedYears: 1, applicableRatePct: 9.50, penaltyDescription: '১ম বছর উত্তীর্ণের পর ভাঙ্গালে ৯.৫০% হারে মুনাফা প্রদেয়' },
  { completedYears: 2, applicableRatePct: 10.00, penaltyDescription: '২য় বছর উত্তীর্ণের পর ভাঙ্গালে ১০.০০% হারে মুনাফা প্রদেয়' },
  { completedYears: 3, applicableRatePct: 10.50, penaltyDescription: '৩য় বছর উত্তীর্ণের পর ভাঙ্গালে ১০.৫০% হারে মুনাফা প্রদেয়' },
  { completedYears: 4, applicableRatePct: 11.00, penaltyDescription: '৪র্থ বছর উত্তীর্ণের পর ভাঙ্গালে ১১.০০% হারে মুনাফা প্রদেয়' },
  { completedYears: 5, applicableRatePct: 11.52, penaltyDescription: '৫ম বছর পূর্ণ মেয়াদে সম্পূর্ণ ১১.৫২% হারে মুনাফা প্রদেয়' },
];

export const THREE_MONTH_ENCASHMENT_RULES: EncashmentRuleSlab[] = [
  { completedYears: 1, applicableRatePct: 10.00, penaltyDescription: '১ম বছর উত্তীর্ণের পর ভাঙ্গালে ১০.০০% হারে মুনাফা প্রদেয়' },
  { completedYears: 2, applicableRatePct: 10.50, penaltyDescription: '২য় বছর উত্তীর্ণের পর ভাঙ্গালে ১০.৫০% হারে মুনাফা প্রদেয়' },
  { completedYears: 3, applicableRatePct: 11.04, penaltyDescription: '৩য় বছর পূর্ণ মেয়াদে ১১.০৪% হারে মুনাফা প্রদেয়' },
];

/**
 * Calculate periodic installment return
 */
export function calculatePeriodicPayout(
  principal: number,
  annualRatePct: number,
  frequency: PayoutFrequency,
  taxRatePct: number = 10
): {
  grossPerPeriod: number;
  taxPerPeriod: number;
  netPerPeriod: number;
  annualGross: number;
  annualNet: number;
  periodsPerYear: number;
} {
  const safePrincipal = Math.max(0, principal);
  const safeRate = Math.max(0, annualRatePct);
  const safeTaxRate = Math.max(0, taxRatePct);

  let periodsPerYear = 12;
  if (frequency === 'monthly') periodsPerYear = 12;
  else if (frequency === 'quarterly') periodsPerYear = 4;
  else if (frequency === 'semi_annually') periodsPerYear = 2;
  else if (frequency === 'annually') periodsPerYear = 1;
  else if (frequency === 'at_maturity') periodsPerYear = 1;

  const annualGross = round2((safePrincipal * safeRate) / 100);
  const grossPerPeriod = round2(annualGross / periodsPerYear);
  const taxPerPeriod = round2((grossPerPeriod * safeTaxRate) / 100);
  const netPerPeriod = round2(grossPerPeriod - taxPerPeriod);
  const annualNet = round2(netPerPeriod * periodsPerYear);

  return {
    grossPerPeriod,
    taxPerPeriod,
    netPerPeriod,
    annualGross,
    annualNet,
    periodsPerYear,
  };
}

/**
 * Generate Next 12 Months Upcoming Payment Schedule for an active investment
 */
export function generateUpcomingSchedule(
  item: SanchayaBondItem,
  monthsAhead: number = 12
): UpcomingPaymentSchedule[] {
  if (item.status !== 'active') return [];

  const result: UpcomingPaymentSchedule[] = [];
  const payout = calculatePeriodicPayout(
    item.principalAmount,
    item.interestRate,
    item.payoutFrequency,
    item.taxDeductionRate
  );

  const now = new Date();
  const purchase = new Date(item.purchaseDate);
  const maturity = new Date(item.maturityDate);

  // Month increment based on frequency
  let stepMonths = 1;
  if (item.payoutFrequency === 'monthly') stepMonths = 1;
  else if (item.payoutFrequency === 'quarterly') stepMonths = 3;
  else if (item.payoutFrequency === 'semi_annually') stepMonths = 6;
  else if (item.payoutFrequency === 'annually') stepMonths = 12;
  else if (item.payoutFrequency === 'at_maturity') {
    // Only payment at maturity date
    if (maturity > now) {
      const gross = round2((item.principalAmount * item.interestRate * item.tenureYears) / 100);
      const tax = round2((gross * item.taxDeductionRate) / 100);
      result.push({
        id: `${item.id}-maturity`,
        investmentId: item.id,
        schemeTitle: item.title,
        category: item.category,
        paymentDate: item.maturityDate,
        grossProfit: gross,
        taxDeducted: tax,
        netProfit: round2(gross - tax),
        isPaid: false,
        linkedBankAccountId: item.linkedBankAccountId,
      });
    }
    return result;
  }

  // Iterate dates starting from purchase date or current date
  let curr = new Date(purchase);
  // Advance until curr > now - 1 month
  while (curr <= now) {
    curr.setMonth(curr.getMonth() + stepMonths);
  }

  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() + monthsAhead);

  while (curr <= limitDate && curr <= maturity) {
    const dateStr = toLocalISO(curr);
    result.push({
      id: `${item.id}-${dateStr}`,
      investmentId: item.id,
      schemeTitle: item.title,
      category: item.category,
      paymentDate: dateStr,
      grossProfit: payout.grossPerPeriod,
      taxDeducted: payout.taxPerPeriod,
      netProfit: payout.netPerPeriod,
      isPaid: false,
      linkedBankAccountId: item.linkedBankAccountId,
    });
    curr.setMonth(curr.getMonth() + stepMonths);
  }

  return result;
}

/**
 * Pre-mature Encashment Return Calculator
 */
export function calculatePreMatureEncashment(
  item: SanchayaBondItem,
  encashmentDateStr: string,
  isBn: boolean = true
): {
  investedDays: number;
  completedYears: number;
  applicableRatePct: number;
  principalReturned: number;
  totalProfitPayable: number;
  excessProfitToDeduct: number;
  netPayableAtCounter: number;
  notes: string;
} {
  const purchase = new Date(item.purchaseDate);
  const encash = new Date(encashmentDateStr);
  const diffTime = Math.max(0, encash.getTime() - purchase.getTime());
  const investedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const completedYears = Math.floor(investedDays / 365);

  let applicableRate = 0;
  let notes = '';

  if (completedYears < 1) {
    applicableRate = 0;
    notes = isBn
      ? '১ বছর পূর্ণ না হওয়ায় কোনো মুনাফা প্রযোজ্য নয়। ইতোপূর্বে উত্তোলিত মুনাফা মূলধন থেকে কর্তন করা হবে।'
      : 'Less than 1 year completed: No profit is applicable. Any previously withdrawn profits will be deducted from principal refund.';
  } else if (item.schemeType === 'poribar') {
    const matched = PORIBAR_ENCASHMENT_RULES.find((r) => r.completedYears === Math.min(completedYears, 5));
    applicableRate = matched ? matched.applicableRatePct : 9.50;
    notes = isBn
      ? `পরিবার সঞ্চয়পত্র ${completedYears} বছর পূর্ণ হওয়ায় ${applicableRate}% হারে মুনাফা পুনর্নির্ধারণ করা হয়েছে।`
      : `Poribar Sanchayapatra completed ${completedYears} years: profit rate recalculated at ${applicableRate}%.`;
  } else if (item.schemeType === 'three_month') {
    const matched = THREE_MONTH_ENCASHMENT_RULES.find((r) => r.completedYears === Math.min(completedYears, 3));
    applicableRate = matched ? matched.applicableRatePct : 10.00;
    notes = isBn
      ? `৩-মাস অন্তর মুনাফাভিত্তিক সঞ্চয়পত্র ${completedYears} বছর পূর্ণ হওয়ায় ${applicableRate}% হারে মুনাফা প্রযোজ্য।`
      : `3-Month Sanchayapatra completed ${completedYears} years: profit applicable at ${applicableRate}%.`;
  } else {
    // Standard rule: 1-2% deduction from coupon
    applicableRate = Math.max(0, item.interestRate - 1.5);
    notes = isBn
      ? 'মেয়াদপূর্ব নগদায়নের জন্য নির্ধারিত হারে রিডিউসড মুনাফা গণনা করা হয়েছে।'
      : 'Reduced penalty profit rate applied for pre-mature encashment.';
  }

  // Profit eligible based on applicable rate
  const annualGrossApplicable = (item.principalAmount * applicableRate) / 100;
  const totalProfitPayable = round2((annualGrossApplicable * investedDays) / 365);

  // If monthly profits were already received at full rate
  const profitReceivedSoFar = item.totalProfitReceivedToDate || 0;
  const excessProfitToDeduct = Math.max(0, round2(profitReceivedSoFar - totalProfitPayable));
  const netPayableAtCounter = round2(item.principalAmount - excessProfitToDeduct);

  return {
    investedDays,
    completedYears,
    applicableRatePct: applicableRate,
    principalReturned: item.principalAmount,
    totalProfitPayable,
    excessProfitToDeduct,
    netPayableAtCounter,
    notes,
  };
}

/**
 * Default Initial Portfolio (Clean by default for real user usage)
 */
export const DEFAULT_SANCHAYA_BONDS: SanchayaBondItem[] = [];

