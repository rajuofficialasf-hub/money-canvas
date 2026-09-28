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
    totalExemptions: number;
  };
  netTaxableIncome: number;
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

/**
 * Get base exemption threshold under BD Income Tax Act 2023
 */
export function getExemptionThreshold(
  category: TaxpayerCategory,
  hasDisabledDependent: boolean = false,
  disabledCount: number = 0
): number {
  let base = 350000;
  switch (category) {
    case 'female_or_senior':
      base = 400000;
      break;
    case 'third_gender_or_disabled':
      base = 475000;
      break;
    case 'freedom_fighter':
      base = 500000;
      break;
    case 'general_male':
    default:
      base = 350000;
      break;
  }

  if (hasDisabledDependent && disabledCount > 0) {
    base += disabledCount * 50000;
  }

  return base;
}

/**
 * Get minimum tax based on location
 */
export function getMinimumTax(location: TaxZoneLocation): number {
  switch (location) {
    case 'dhaka_chattogram_city':
      return 5000;
    case 'other_city_corporation':
      return 4000;
    case 'non_city_areas':
    default:
      return 3000;
  }
}

/**
 * Calculate BD Income Tax based on NBR Slabs
 */
export function calculateBangladeshTax(
  profile: TaxpayerProfile,
  income: IncomeHeadsInput,
  investments: EligibleInvestmentsInput,
  netWealthForSurcharge: number = 0,
  hasMultipleCarsOrLargeFlat: boolean = false
): TaxCalculationResult {
  const threshold = getExemptionThreshold(
    profile.category,
    profile.hasDisabledDependent,
    profile.disabledDependentsCount
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

  // Capital Gains: Listed shares (individual threshold or regular)
  const capitalGains = Math.max(0, income.capitalGainsListedShares) +
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
    capitalGains +
    bankInterest +
    dpsProfit +
    sanchayapatraProfit +
    dividends +
    otherIncome
  );

  const totalExemptions = round2(salaryExemption + rentalRepairAllowance + agriCost);

  const netTaxableIncome = round2(
    taxableSalary +
    taxableRental +
    taxableAgri +
    taxableBusiness +
    capitalGains +
    bankInterest +
    dpsProfit +
    sanchayapatraProfit +
    dividends +
    otherIncome
  );

  // 2. Slab Calculation
  let remaining = netTaxableIncome;
  let grossTax = 0;
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

  // Slab 2: Next ৳ 1,00,000 @ 5%
  const s2Size = 100000;
  const s2Taxable = Math.min(remaining, s2Size);
  const s2Tax = round2(s2Taxable * 0.05);
  grossTax += s2Tax;
  cumulative += s2Tax;
  slabs.push({
    slabLabel: `Next ৳ 1,00,000 (পরবর্তী ১ লাখ)`,
    ratePct: 5,
    taxableInSlab: round2(s2Taxable),
    taxAmount: s2Tax,
    cumulativeTax: round2(cumulative),
  });
  remaining = Math.max(0, remaining - s2Taxable);

  // Slab 3: Next ৳ 4,00,000 @ 10%
  const s3Size = 400000;
  const s3Taxable = Math.min(remaining, s3Size);
  const s3Tax = round2(s3Taxable * 0.10);
  grossTax += s3Tax;
  cumulative += s3Tax;
  slabs.push({
    slabLabel: `Next ৳ 4,00,000 (পরবর্তী ৪ লাখ)`,
    ratePct: 10,
    taxableInSlab: round2(s3Taxable),
    taxAmount: s3Tax,
    cumulativeTax: round2(cumulative),
  });
  remaining = Math.max(0, remaining - s3Taxable);

  // Slab 4: Next ৳ 5,00,000 @ 15%
  const s4Size = 500000;
  const s4Taxable = Math.min(remaining, s4Size);
  const s4Tax = round2(s4Taxable * 0.15);
  grossTax += s4Tax;
  cumulative += s4Tax;
  slabs.push({
    slabLabel: `Next ৳ 5,00,000 (পরবর্তী ৫ লাখ)`,
    ratePct: 15,
    taxableInSlab: round2(s4Taxable),
    taxAmount: s4Tax,
    cumulativeTax: round2(cumulative),
  });
  remaining = Math.max(0, remaining - s4Taxable);

  // Slab 5: Next ৳ 5,00,000 @ 20%
  const s5Size = 500000;
  const s5Taxable = Math.min(remaining, s5Size);
  const s5Tax = round2(s5Taxable * 0.20);
  grossTax += s5Tax;
  cumulative += s5Tax;
  slabs.push({
    slabLabel: `Next ৳ 5,00,000 (পরবর্তী ৫ লাখ)`,
    ratePct: 20,
    taxableInSlab: round2(s5Taxable),
    taxAmount: s5Tax,
    cumulativeTax: round2(cumulative),
  });
  remaining = Math.max(0, remaining - s5Taxable);

  // Slab 6: Remaining @ 25%
  if (remaining > 0) {
    const s6Tax = round2(remaining * 0.25);
    grossTax += s6Tax;
    cumulative += s6Tax;
    slabs.push({
      slabLabel: `Remaining balance (অবশিষ্টাংশ)`,
      ratePct: 25,
      taxableInSlab: round2(remaining),
      taxAmount: s6Tax,
      cumulativeTax: round2(cumulative),
    });
  }

  // 3. Investment Tax Rebate (ধারা ৭৮ ও ষষ্ঠ তফসিল অংশ ৩)
  // Ceiling: Lowest of: (a) actual eligible investment, (b) 20% of taxable income, (c) ৳ 1,00,00,000
  // Note: DPS has statutory cap of ৳ 1,20,000 and Sanchayapatra has statutory cap of ৳ 5,00,000
  const allowedDps = Math.min(Math.max(0, investments.dpsContribution), 120000);
  const allowedSanchaya = Math.min(Math.max(0, investments.sanchayapatraPurchase), 500000);
  const otherInvestments =
    Math.max(0, investments.dseStockPurchase) +
    Math.max(0, investments.lifeInsurancePremium) +
    Math.max(0, investments.providentFundContribution) +
    Math.max(0, investments.govtTreasuryBond) +
    Math.max(0, investments.benevolentFundOrGroupInsurance);

  const totalEligibleInvestment = round2(allowedDps + allowedSanchaya + otherInvestments);
  const allowableCeiling = round2(Math.min(netTaxableIncome * 0.20, 10000000));
  const allowableInvestment = Math.min(totalEligibleInvestment, allowableCeiling);

  // BD Tax Rebate rule: 15% on allowable investment
  const rebateAmount = round2(allowableInvestment * 0.15);
  const maxPotentialRebate = round2(allowableCeiling * 0.15);
  const recommendedAdditionalInvestment = round2(Math.max(0, allowableCeiling - allowableInvestment));

  // 4. Net Tax Liability & Minimum Tax Check
  let taxAfterRebate = Math.max(0, round2(grossTax - rebateAmount));
  const minTax = getMinimumTax(profile.location);

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
      totalExemptions,
    },
    netTaxableIncome,
    slabs,
    grossTaxLiability: round2(grossTax),
    rebate: {
      totalEligibleInvestment,
      allowableInvestmentCeiling: allowableCeiling,
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
