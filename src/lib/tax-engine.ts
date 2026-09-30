/**
 * Bangladesh Income Tax & NBR IT-10B Wealth Statement Engine
 * Based on Income Tax Act 2023 (আয়কর আইন ২০২৩) and latest National Board of Revenue (NBR) Finance Act guidelines.
 */

import { round2 } from './accounting-engine';

export type TaxpayerCategory =
  | 'general_male'
  | 'female_or_senior'
  | 'third_gender_or_disabled'
  | 'freedom_fighter';

export type TaxZoneLocation =
  | 'dhaka_chattogram_city'
  | 'other_city_corporation'
  | 'non_city_areas';

export interface TaxpayerProfile {
  name: string;
  tin: string;
  assessmentYear: string; // e.g. "2025-2026"
  incomeYear: string; // e.g. "2024-2025"
  category: TaxpayerCategory;
  location: TaxZoneLocation;
  hasDisabledDependent: boolean;
  disabledDependentsCount: number;
}

export interface IncomeHeadsInput {
  // 1. Employment / Salary (বেতন খাতে আয়)
  salaryGross: number;
  salaryBasic: number;
  salaryAllowances: number;
  salaryBonus: number;
  // 2. House Property / Rent (ভাড়া খাতে আয়)
  rentalIncomeGross: number;
  rentalType: 'residential' | 'commercial';
  rentalMunicipalTax: number;
  // 3. Agriculture (কৃষি খাতে আয়)
  agricultureGross: number;
  hasAgriAccounts: boolean;
  // 4. Business & Profession (ব্যবসা ও পেশা)
  businessGrossRevenue: number;
  businessNetProfit: number;
  // 5. Capital Gains (মূলধনী মুনাফা)
  capitalGainsListedShares: number; // DSE/CSE stocks (exempt up to 50L under statutory SRO or standard rate)
  capitalGainsRealEstate: number;
  capitalGainsOther: number;
  // 6. Financial Assets (আর্থিক পরিসম্পদ থেকে আয়)
  bankInterestGross: number;
  bankInterestTds: number;
  dpsProfitGross: number;
  sanchayapatraProfitGross: number;
  sanchayapatraTds: number;
  cashDividendsGross: number;
  dividendTds: number;
  // 7. Other Sources (অন্যান্য উৎস)
  otherIncomeGross: number;
  // Advance Tax / Withholding Tax
  advanceTaxAitPaid: number;
  taxPaidWithPriorReturn: number;
}

export interface EligibleInvestmentsInput {
  dpsContribution: number; // Max allowed ৳ 1,20,000
  sanchayapatraPurchase: number; // Max considered ৳ 5,00,000
  dseStockPurchase: number; // Approved securities
  lifeInsurancePremium: number; // Max 10% of policy value
  providentFundContribution: number; // Approved PF
  govtTreasuryBond: number;
  benevolentFundOrGroupInsurance: number;
}

export interface IT10BAssetsLiabilities {
  // Non-Agricultural Property
  nonAgriPropertyCost: number;
  nonAgriPropertyDescription: string;
  // Agricultural Property
  agriPropertyCost: number;
  agriPropertyDescription: string;
  // Financial Assets (from bank, fdr, dps, shares)
  bankAndCashBalances: number;
  fixedDepositsFdr: number;
  dpsBalance: number;
  sharesListedCost: number;
  sanchayapatraCost: number;
  otherFinancialAssets: number;
  // Motor Vehicles
  motorVehicleCost: number;
  motorVehicleCount: number;
  motorVehicleDescription: string;
  // Gold, Jewellery & Precious Metals
  goldBhori: number;
  goldCostOrValue: number;
  // Furniture, Fixtures & Electronics
  furnitureAndElectronicsCost: number;
  // Other Assets & Loans Given
  otherAssetsCost: number;
  personalLoansGiven: number;
  // Liabilities
  bankMortgagesAndLoans: number;
  personalDebtsAndPayables: number;
  otherLiabilities: number;
  // Accretion & Family Expenses (IT-10BB)
  previousYearNetWealth: number;
  annualFamilyLivingExpenses: number;
  giftOrInheritanceReceived: number;
  taxExemptIncome: number;
}

export interface TaxSlabBreakdownItem {
  slabLabel: string;
  ratePct: number;
  taxableInSlab: number;
  taxAmount: number;
  cumulativeTax: number;
}

export interface TaxCalculationResult {
  exemptionThreshold: number;
  grossIncome: number;
  statutoryExemptions: {
    salaryExemption: number; // Lesser of 1/3 or 4,50,000
    rentalRepairAllowance: number; // 25% residential or 30% commercial
    agriProductionCost: number; // 60% standard deduction
    dividendExemption: number;
    capitalGainsListedExemption?: number;
    totalExemptions: number;
  };
  netTaxableIncome: number;
  taxableOrdinaryIncome?: number;
  capitalGainsTax?: number;
  slabs: TaxSlabBreakdownItem[];
  grossTaxLiability: number;
  rebate: {
    totalEligibleInvestment: number;
    allowableInvestmentCeiling: number;
    allowableInvestment: number;
    rebateAmount: number;
    maxPotentialRebate: number;
    recommendedAdditionalInvestment: number;
  };
  taxAfterRebate: number;
  minimumTaxApplicable: number;
  finalTaxBeforeSurcharge: number;
  surcharge: {
    netWealth: number;
    ratePct: number;
    amount: number;
    reason: string;
  };
  totalTaxAndSurcharge: number;
  advanceTaxCredits: {
    bankTds: number;
    sanchayapatraTds: number;
    dividendTds: number;
    otherAit: number;
    totalCredits: number;
  };
  netTaxPayableOrRefund: number;
}

export interface IT10BStatementResult {
  grossAssets: number;
  totalLiabilities: number;
  netWealth: number;
  previousYearNetWealth: number;
  netAccretionInWealth: number;
  totalOutflow: number; // Accretion + Family Expenses
  totalInflowReconciled: number; // Taxable Income + Exempt Income + Gifts
  reconciliationDifference: number;
  isReconciled: boolean;
  surchargeRatePct: number;
}

export interface TaxSlabConfig {
  label: string;
  size: number | null; // null represents remaining balance
  ratePct: number;
}

export interface TaxYearConfig {
  assessmentYear: string;
  incomeYear: string;
  exemptions: Record<TaxpayerCategory, number>;
  disabledDependentAllowance: number;
  slabs: TaxSlabConfig[];
  minimumTax: Record<TaxZoneLocation, number>;
  rebateRatePct: number;
  rebateIncomeLimitPct: number;
  rebateMaxStatutoryCeiling: number;
  capitalGainsListedExemption: number;
  capitalGainsListedTaxRatePct: number;
}

export const TAX_YEAR_CONFIGS: Record<string, TaxYearConfig> = {
  // Assessment Year 2026-2027 (Income Year 2025-2026 - Finance Ordinance 2025)
  '2026-2027': {
    assessmentYear: '2026-2027',
    incomeYear: '2025-2026',
    exemptions: {
      general_male: 375000,
      female_or_senior: 425000,
      third_gender_or_disabled: 500000,
      freedom_fighter: 525000,
    },
    disabledDependentAllowance: 50000,
    slabs: [
      { label: 'Next ৳ 3,00,000 (পরবর্তী ৩ লাখ)', size: 300000, ratePct: 10 },
      { label: 'Next ৳ 4,00,000 (পরবর্তী ৪ লাখ)', size: 400000, ratePct: 15 },
      { label: 'Next ৳ 5,00,000 (পরবর্তী ৫ লাখ)', size: 500000, ratePct: 20 },
      { label: 'Next ৳ 20,00,000 (পরবর্তী ২০ লাখ)', size: 2000000, ratePct: 25 },
      { label: 'Remaining balance (অবশিষ্টাংশ)', size: null, ratePct: 30 },
    ],
    minimumTax: {
      dhaka_chattogram_city: 5000,
      other_city_corporation: 5000,
      non_city_areas: 5000,
    },
    rebateRatePct: 15,
    rebateIncomeLimitPct: 3,
    rebateMaxStatutoryCeiling: 1000000,
    capitalGainsListedExemption: 5000000,
    capitalGainsListedTaxRatePct: 15,
  },
  // Assessment Year 2025-2026 (Income Year 2024-2025 - Finance Act 2024)
  '2025-2026': {
    assessmentYear: '2025-2026',
    incomeYear: '2024-2025',
    exemptions: {
      general_male: 350000,
      female_or_senior: 400000,
      third_gender_or_disabled: 475000,
      freedom_fighter: 500000,
    },
    disabledDependentAllowance: 50000,
    slabs: [
      { label: 'Next ৳ 1,00,000 (পরবর্তী ১ লাখ)', size: 100000, ratePct: 5 },
      { label: 'Next ৳ 4,00,000 (পরবর্তী ৪ লাখ)', size: 400000, ratePct: 10 },
      { label: 'Next ৳ 5,00,000 (পরবর্তী ৫ লাখ)', size: 500000, ratePct: 15 },
      { label: 'Next ৳ 5,00,000 (পরবর্তী ৫ লাখ)', size: 500000, ratePct: 20 },
      { label: 'Remaining balance (অবশিষ্টাংশ)', size: null, ratePct: 25 },
    ],
    minimumTax: {
      dhaka_chattogram_city: 5000,
      other_city_corporation: 4000,
      non_city_areas: 3000,
    },
    rebateRatePct: 15,
    rebateIncomeLimitPct: 3,
    rebateMaxStatutoryCeiling: 1000000,
    capitalGainsListedExemption: 5000000,
    capitalGainsListedTaxRatePct: 15,
  },
};

// Aliases for short forms ('2026-27', '2025-26')
TAX_YEAR_CONFIGS['2026-27'] = TAX_YEAR_CONFIGS['2026-2027'];
TAX_YEAR_CONFIGS['2025-26'] = TAX_YEAR_CONFIGS['2025-2026'];

export const TAX_SLABS: Record<string, TaxSlabConfig[]> = {
  '2026-2027': TAX_YEAR_CONFIGS['2026-2027'].slabs,
  '2026-27': TAX_YEAR_CONFIGS['2026-2027'].slabs,
  '2025-2026': TAX_YEAR_CONFIGS['2025-2026'].slabs,
  '2025-26': TAX_YEAR_CONFIGS['2025-2026'].slabs,
};

/**
 * Retrieve configuration for a specific assessment year. Defaults to AY 2026-2027.
 */
export function getTaxYearConfig(assessmentYear?: string): TaxYearConfig {
  if (assessmentYear && TAX_YEAR_CONFIGS[assessmentYear]) {
    return TAX_YEAR_CONFIGS[assessmentYear];
  }
  return TAX_YEAR_CONFIGS['2026-2027'];
}

/**
 * Get base exemption threshold under BD Income Tax Act 2023 & relevant Finance Act/Ordinance
 */
export function getExemptionThreshold(
  category: TaxpayerCategory,
  hasDisabledDependent: boolean = false,
  disabledCount: number = 0,
  assessmentYear: string = '2026-2027'
): number {
  const config = getTaxYearConfig(assessmentYear);
  let base = config.exemptions[category] ?? config.exemptions.general_male;

  if (hasDisabledDependent && disabledCount > 0) {
    base += disabledCount * config.disabledDependentAllowance;
  }

  return base;
}

/**
 * Get minimum tax based on location and assessment year
 */
export function getMinimumTax(
  location: TaxZoneLocation,
  assessmentYear: string = '2026-2027'
): number {
  const config = getTaxYearConfig(assessmentYear);
  return config.minimumTax[location] ?? 5000;
}

/**
 * Calculate BD Income Tax based on NBR Slabs, ITA 2023 §78 Rebate, and Capital Gains rules
 */
export function calculateBangladeshTax(
  profile: TaxpayerProfile,
  income: IncomeHeadsInput,
  investments: EligibleInvestmentsInput,
  netWealthForSurcharge: number = 0,
  hasMultipleCarsOrLargeFlat: boolean = false
): TaxCalculationResult {
  const config = getTaxYearConfig(profile.assessmentYear);
  const threshold = getExemptionThreshold(
    profile.category,
    profile.hasDisabledDependent,
    profile.disabledDependentsCount,
    profile.assessmentYear
  );

  // 1. Calculate Statutory Deductions
  // Salary: 1/3 of salary gross or ৳ 4,50,000, whichever is less (ধারা ৩৩)
  const salaryGross = Math.max(0, income.salaryGross);
  const salaryExemption = Math.min(salaryGross / 3, 450000);
  const taxableSalary = Math.max(0, round2(salaryGross - salaryExemption));

  // Rental: Repair & Maintenance allowance (25% for residential, 30% for commercial) less municipal tax
  const rentalGross = Math.max(0, income.rentalIncomeGross);
  const repairRate = income.rentalType === 'commercial' ? 0.30 : 0.25;
  const rentalRepairAllowance = round2(rentalGross * repairRate);
  const taxableRental = Math.max(0, round2(rentalGross - rentalRepairAllowance - Math.max(0, income.rentalMunicipalTax)));

  // Agriculture: 60% statutory production cost if accounts not formally audited
  const agriGross = Math.max(0, income.agricultureGross);
  const agriCost = income.hasAgriAccounts ? 0 : round2(agriGross * 0.60);
  const taxableAgri = Math.max(0, round2(agriGross - agriCost));

  // Business: Net Profit
  const taxableBusiness = Math.max(0, income.businessNetProfit);

  // Capital Gains: Listed shares (exempt up to 50L, flat 15% on excess) vs Other capital gains
  const listedGains = Math.max(0, income.capitalGainsListedShares);
  const listedGainsExemption = Math.min(listedGains, config.capitalGainsListedExemption);
  const taxableListedGains = Math.max(0, listedGains - listedGainsExemption);
  const listedGainsTax = round2(taxableListedGains * (config.capitalGainsListedTaxRatePct / 100));

  const otherCapitalGains =
    Math.max(0, income.capitalGainsRealEstate) +
    Math.max(0, income.capitalGainsOther);

  // Financial Assets & Other
  const bankInterest = Math.max(0, income.bankInterestGross);
  const dpsProfit = Math.max(0, income.dpsProfitGross);
  const sanchayapatraProfit = Math.max(0, income.sanchayapatraProfitGross);
  const dividends = Math.max(0, income.cashDividendsGross);
  const otherIncome = Math.max(0, income.otherIncomeGross);

  const grossIncome = round2(
    salaryGross +
    rentalGross +
    agriGross +
    income.businessGrossRevenue +
    listedGains +
    otherCapitalGains +
    bankInterest +
    dpsProfit +
    sanchayapatraProfit +
    dividends +
    otherIncome
  );

  const totalExemptions = round2(
    salaryExemption +
    rentalRepairAllowance +
    agriCost +
    listedGainsExemption
  );

  // Ordinary taxable income for progressive slabs (excludes listed share gains which have flat 15% rate above 50L)
  const taxableOrdinaryIncome = round2(
    taxableSalary +
    taxableRental +
    taxableAgri +
    taxableBusiness +
    otherCapitalGains +
    bankInterest +
    dpsProfit +
    sanchayapatraProfit +
    dividends +
    otherIncome
  );

  // Total net taxable income (Ordinary + Taxable Listed Share Gains)
  const netTaxableIncome = round2(taxableOrdinaryIncome + taxableListedGains);

  // 2. Slab Calculation on Taxable Ordinary Income
  let remaining = taxableOrdinaryIncome;
  let ordinaryGrossTax = 0;
  let cumulative = 0;
  const slabs: TaxSlabBreakdownItem[] = [];

  // Slab 1: Exemption threshold @ 0%
  const s1Taxable = Math.min(remaining, threshold);
  slabs.push({
    slabLabel: `First ৳ ${threshold.toLocaleString('en-IN')} (করমুক্ত সীমা)`,
    ratePct: 0,
    taxableInSlab: round2(s1Taxable),
    taxAmount: 0,
    cumulativeTax: 0,
  });
  remaining = Math.max(0, remaining - s1Taxable);

  // Progressive slabs from config
  for (const slab of config.slabs) {
    if (slab.size !== null) {
      const taxableInSlab = Math.min(remaining, slab.size);
      const taxAmount = round2(taxableInSlab * (slab.ratePct / 100));
      ordinaryGrossTax = round2(ordinaryGrossTax + taxAmount);
      cumulative = round2(cumulative + taxAmount);
      slabs.push({
        slabLabel: slab.label,
        ratePct: slab.ratePct,
        taxableInSlab: round2(taxableInSlab),
        taxAmount,
        cumulativeTax: round2(cumulative),
      });
      remaining = Math.max(0, remaining - taxableInSlab);
    } else {
      // Remaining balance slab
      if (remaining > 0) {
        const taxAmount = round2(remaining * (slab.ratePct / 100));
        ordinaryGrossTax = round2(ordinaryGrossTax + taxAmount);
        cumulative = round2(cumulative + taxAmount);
        slabs.push({
          slabLabel: slab.label,
          ratePct: slab.ratePct,
          taxableInSlab: round2(remaining),
          taxAmount,
          cumulativeTax: round2(cumulative),
        });
        remaining = 0;
      }
    }
  }

  // If there are taxable listed share capital gains (> 50L @ 15%), add to slabs breakdown
  if (taxableListedGains > 0) {
    cumulative = round2(cumulative + listedGainsTax);
    slabs.push({
      slabLabel: `শেয়ারবাজার মূলধনী লাভ (৫০ লাখের অতিরিক্ত অংশ)`,
      ratePct: config.capitalGainsListedTaxRatePct,
      taxableInSlab: round2(taxableListedGains),
      taxAmount: listedGainsTax,
      cumulativeTax: round2(cumulative),
    });
  }

  const grossTaxLiability = round2(ordinaryGrossTax + listedGainsTax);

  // 3. Investment Tax Rebate (ধারা ৭৮ ও ষষ্ঠ তফসিল অংশ ৩)
  // Ceiling under ITA 2023 §78: Lowest of:
  // (a) 3% of total taxable income
  // (b) 15% of actual eligible investment
  // (c) ৳ 10,00,000 (10 Lakh)
  const allowedDps = Math.min(Math.max(0, investments.dpsContribution), 120000);
  const allowedSanchaya = Math.min(Math.max(0, investments.sanchayapatraPurchase), 500000);
  const otherInvestments =
    Math.max(0, investments.dseStockPurchase) +
    Math.max(0, investments.lifeInsurancePremium) +
    Math.max(0, investments.providentFundContribution) +
    Math.max(0, investments.govtTreasuryBond) +
    Math.max(0, investments.benevolentFundOrGroupInsurance);

  const totalEligibleInvestment = round2(allowedDps + allowedSanchaya + otherInvestments);

  // Statutory limits under §78
  const limitByIncome = round2(netTaxableIncome * (config.rebateIncomeLimitPct / 100));
  const limitByInvestment = round2(totalEligibleInvestment * (config.rebateRatePct / 100));
  const limitByStatutoryCap = config.rebateMaxStatutoryCeiling;

  const rebateAmount = Math.min(limitByIncome, limitByInvestment, limitByStatutoryCap);
  const maxPotentialRebate = Math.min(limitByIncome, limitByStatutoryCap);
  const allowableInvestmentCeiling = round2(maxPotentialRebate / (config.rebateRatePct / 100));
  const allowableInvestment = Math.min(totalEligibleInvestment, allowableInvestmentCeiling);
  const recommendedAdditionalInvestment = round2(Math.max(0, allowableInvestmentCeiling - totalEligibleInvestment));

  // 4. Net Tax Liability & Minimum Tax Check
  let taxAfterRebate = Math.max(0, round2(grossTaxLiability - rebateAmount));
  const minTax = getMinimumTax(profile.location, profile.assessmentYear);

  // Under NBR rules, if total income exceeds the threshold, the tax payable cannot be less than minimum tax
  let finalTaxBeforeSurcharge = 0;
  if (netTaxableIncome > threshold) {
    finalTaxBeforeSurcharge = Math.max(taxAfterRebate, minTax);
  }

  // 5. Net Wealth Surcharge (সারচার্জ)
  // Wealth thresholds:
  // <= 4 Crore: 0%
  // > 4 Crore to 10 Crore: 10%
  // > 10 Crore to 20 Crore: 20%
  // > 20 Crore to 50 Crore: 30%
  // > 50 Crore: 35%
  // Or owning 2+ motor vehicles or > 8,000 sq ft house property in city corp: minimum 10%
  let surchargeRate = 0;
  let surchargeReason = 'No surcharge applicable (Net wealth under ৳ 4 Crore)';

  if (hasMultipleCarsOrLargeFlat && netWealthForSurcharge > 0) {
    surchargeRate = 10;
    surchargeReason = 'Multiple motor cars or >8,000 sq ft residential asset in city corporation (ন্যূনতম ১০%)';
  }

  if (netWealthForSurcharge > 500000000) {
    surchargeRate = 35;
    surchargeReason = 'Net wealth exceeds ৳ 50 Crore (৩৫% সারচার্জ)';
  } else if (netWealthForSurcharge > 200000000) {
    surchargeRate = 30;
    surchargeReason = 'Net wealth exceeds ৳ 20 Crore (৩০% সারচার্জ)';
  } else if (netWealthForSurcharge > 100000000) {
    surchargeRate = 20;
    surchargeReason = 'Net wealth exceeds ৳ 10 Crore (২০% সারচার্জ)';
  } else if (netWealthForSurcharge > 40000000) {
    surchargeRate = Math.max(surchargeRate, 10);
    surchargeReason = 'Net wealth exceeds ৳ 4 Crore (১০% সারচার্জ)';
  }

  const surchargeAmount = round2(finalTaxBeforeSurcharge * (surchargeRate / 100));
  const totalTaxAndSurcharge = round2(finalTaxBeforeSurcharge + surchargeAmount);

  // 6. Advance Tax Deductions & Credits
  const bankTds = Math.max(0, income.bankInterestTds);
  const sanchayapatraTds = Math.max(0, income.sanchayapatraTds);
  const dividendTds = Math.max(0, income.dividendTds);
  const otherAit = Math.max(0, income.advanceTaxAitPaid) + Math.max(0, income.taxPaidWithPriorReturn);
  const totalCredits = round2(bankTds + sanchayapatraTds + dividendTds + otherAit);

  const netTaxPayableOrRefund = round2(totalTaxAndSurcharge - totalCredits);

  return {
    exemptionThreshold: threshold,
    grossIncome,
    statutoryExemptions: {
      salaryExemption: round2(salaryExemption),
      rentalRepairAllowance: round2(rentalRepairAllowance),
      agriProductionCost: round2(agriCost),
      dividendExemption: 0,
      capitalGainsListedExemption: round2(listedGainsExemption),
      totalExemptions,
    },
    netTaxableIncome,
    taxableOrdinaryIncome,
    capitalGainsTax: listedGainsTax,
    slabs,
    grossTaxLiability,
    rebate: {
      totalEligibleInvestment,
      allowableInvestmentCeiling,
      allowableInvestment,
      rebateAmount,
      maxPotentialRebate,
      recommendedAdditionalInvestment,
    },
    taxAfterRebate,
    minimumTaxApplicable: minTax,
    finalTaxBeforeSurcharge,
    surcharge: {
      netWealth: netWealthForSurcharge,
      ratePct: surchargeRate,
      amount: surchargeAmount,
      reason: surchargeReason,
    },
    totalTaxAndSurcharge,
    advanceTaxCredits: {
      bankTds,
      sanchayapatraTds,
      dividendTds,
      otherAit,
      totalCredits,
    },
    netTaxPayableOrRefund,
  };
}

/**
 * Calculate IT-10B Wealth Statement & Accretion Reconciliation
 */
export function calculateIT10BStatement(
  data: IT10BAssetsLiabilities,
  netTaxableIncome: number
): IT10BStatementResult {
  const grossAssets = round2(
    Math.max(0, data.nonAgriPropertyCost) +
    Math.max(0, data.agriPropertyCost) +
    Math.max(0, data.bankAndCashBalances) +
    Math.max(0, data.fixedDepositsFdr) +
    Math.max(0, data.dpsBalance) +
    Math.max(0, data.sharesListedCost) +
    Math.max(0, data.sanchayapatraCost) +
    Math.max(0, data.otherFinancialAssets) +
    Math.max(0, data.motorVehicleCost) +
    Math.max(0, data.goldCostOrValue) +
    Math.max(0, data.furnitureAndElectronicsCost) +
    Math.max(0, data.otherAssetsCost) +
    Math.max(0, data.personalLoansGiven)
  );

  const totalLiabilities = round2(
    Math.max(0, data.bankMortgagesAndLoans) +
    Math.max(0, data.personalDebtsAndPayables) +
    Math.max(0, data.otherLiabilities)
  );

  const netWealth = round2(grossAssets - totalLiabilities);
  const prevWealth = Math.max(0, data.previousYearNetWealth);
  const netAccretionInWealth = round2(netWealth - prevWealth);

  // Total funds applied = Accretion + Family Living Expenses (IT-10BB)
  const familyExpense = Math.max(0, data.annualFamilyLivingExpenses);
  const totalOutflow = round2(netAccretionInWealth + familyExpense);

  // Total funds sourced = Taxable income + Tax-exempt income + Gifts/Inheritance
  const exemptIncome = Math.max(0, data.taxExemptIncome);
  const gifts = Math.max(0, data.giftOrInheritanceReceived);
  const totalInflowReconciled = round2(netTaxableIncome + exemptIncome + gifts);

  const reconciliationDifference = round2(totalInflowReconciled - totalOutflow);
  const isReconciled = Math.abs(reconciliationDifference) <= 500; // tolerance margin

  let surchargeRatePct = 0;
  if (netWealth > 500000000) surchargeRatePct = 35;
  else if (netWealth > 200000000) surchargeRatePct = 30;
  else if (netWealth > 100000000) surchargeRatePct = 20;
  else if (netWealth > 40000000) surchargeRatePct = 10;

  return {
    grossAssets,
    totalLiabilities,
    netWealth,
    previousYearNetWealth: prevWealth,
    netAccretionInWealth,
    totalOutflow,
    totalInflowReconciled,
    reconciliationDifference,
    isReconciled,
    surchargeRatePct,
  };
}
