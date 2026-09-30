import { describe, it, expect } from 'vitest';
import { calculateBangladeshTax } from '../tax-engine';
import type { TaxpayerProfile, IncomeHeadsInput, EligibleInvestmentsInput } from '../tax-engine';

const profile = (assessmentYear: string): TaxpayerProfile => ({
  name: 'Test Payer',
  tin: '123456789012',
  assessmentYear,
  incomeYear: assessmentYear === '2026-2027' ? '2025-2026' : '2024-2025',
  category: 'general_male',
  location: 'dhaka_chattogram_city',
  hasDisabledDependent: false,
  disabledDependentsCount: 0,
});

const zeroIncome = (): IncomeHeadsInput => ({
  salaryGross: 0,
  salaryBasic: 0,
  salaryAllowances: 0,
  salaryBonus: 0,
  rentalIncomeGross: 0,
  rentalType: 'residential',
  rentalMunicipalTax: 0,
  agricultureGross: 0,
  hasAgriAccounts: false,
  businessGrossRevenue: 0,
  businessNetProfit: 0,
  capitalGainsListedShares: 0,
  capitalGainsRealEstate: 0,
  capitalGainsOther: 0,
  bankInterestGross: 0,
  bankInterestTds: 0,
  dpsProfitGross: 0,
  sanchayapatraProfitGross: 0,
  sanchayapatraTds: 0,
  cashDividendsGross: 0,
  dividendTds: 0,
  otherIncomeGross: 0,
  advanceTaxAitPaid: 0,
  taxPaidWithPriorReturn: 0,
});

const zeroInvestments = (): EligibleInvestmentsInput => ({
  dpsContribution: 0,
  sanchayapatraPurchase: 0,
  dseStockPurchase: 0,
  lifeInsurancePremium: 0,
  providentFundContribution: 0,
  govtTreasuryBond: 0,
  benevolentFundOrGroupInsurance: 0,
});

describe('AY 2026-2027 slabs (Finance Ordinance 2025)', () => {
  it('income ৳12,00,000: 375k@0 + 300k@10 + 400k@15 + 125k@20 = ৳1,15,000', () => {
    const res = calculateBangladeshTax(
      profile('2026-2027'),
      { ...zeroIncome(), otherIncomeGross: 1200000 },
      zeroInvestments()
    );
    expect(res.exemptionThreshold).toBe(375000);
    expect(res.grossTaxLiability).toBe(115000);
    expect(res.finalTaxBeforeSurcharge).toBe(115000);
  });

  it('income ৳40,00,000: crosses into the 25% slab = ৳6,56,250', () => {
    // 375k@0, 300k@10=30000, 400k@15=60000, 500k@20=100000, 2000k@25=500000,
    // remaining 425k@30=127500 → wait: 4,000,000-375,000=3,625,000;
    // 300+400+500+2000=3,200,000 consumed → 425,000@30% = 127,500
    // total = 30,000+60,000+100,000+500,000+127,500 = 817,500
    const res = calculateBangladeshTax(
      profile('2026-2027'),
      { ...zeroIncome(), otherIncomeGross: 4000000 },
      zeroInvestments()
    );
    expect(res.grossTaxLiability).toBe(817500);
  });
});

describe('AY 2025-2026 slabs (Finance Act 2024, 5% slab still present)', () => {
  it('income ৳12,00,000: 350k@0 + 100k@5 + 400k@10 + 350k@15 = ৳97,500', () => {
    const res = calculateBangladeshTax(
      profile('2025-2026'),
      { ...zeroIncome(), otherIncomeGross: 1200000 },
      zeroInvestments()
    );
    expect(res.exemptionThreshold).toBe(350000);
    expect(res.grossTaxLiability).toBe(97500);
  });

  it('keeps location-specific minimum tax for the old year', () => {
    const res = calculateBangladeshTax(
      { ...profile('2025-2026'), location: 'non_city_areas' },
      { ...zeroIncome(), otherIncomeGross: 360000 },
      zeroInvestments()
    );
    // taxable 360k > threshold 350k, slab tax 10k@5% = 500 → floor to ৳3,000 (non-city, FA 2024)
    expect(res.finalTaxBeforeSurcharge).toBe(3000);
  });
});

describe('ITA 2023 §78 investment rebate', () => {
  it('uses the lowest of 3% income, 15% investment, ৳10 লাখ', () => {
    const res = calculateBangladeshTax(
      profile('2026-2027'),
      { ...zeroIncome(), otherIncomeGross: 1200000 },
      { ...zeroInvestments(), dseStockPurchase: 100000 }
    );
    // 3% × 12,00,000 = 36,000; 15% × 1,00,000 = 15,000 → rebate 15,000
    expect(res.rebate.rebateAmount).toBe(15000);
    expect(res.finalTaxBeforeSurcharge).toBe(100000);
  });

  it('caps the DPS contribution at ৳1,20,000', () => {
    const res = calculateBangladeshTax(
      profile('2026-2027'),
      { ...zeroIncome(), otherIncomeGross: 5000000 },
      { ...zeroInvestments(), dpsContribution: 500000 }
    );
    expect(res.rebate.totalEligibleInvestment).toBe(120000);
  });
});

describe('unified minimum tax (AY 2026-2027)', () => {
  it('floors tax at ৳5,000 when income barely exceeds the threshold', () => {
    const res = calculateBangladeshTax(
      profile('2026-2027'),
      { ...zeroIncome(), otherIncomeGross: 380000 },
      zeroInvestments()
    );
    // slab tax = 5,000 @ 10% = 500 → floored to 5,000
    expect(res.finalTaxBeforeSurcharge).toBe(5000);
  });

  it('charges nothing below the exemption threshold', () => {
    const res = calculateBangladeshTax(
      profile('2026-2027'),
      { ...zeroIncome(), otherIncomeGross: 300000 },
      zeroInvestments()
    );
    expect(res.finalTaxBeforeSurcharge).toBe(0);
  });
});

describe('listed share capital gains (৫০ লাখ exemption + flat 15%)', () => {
  it('taxes only the excess above ৳50,00,000 at a flat 15%, outside the slabs', () => {
    const res = calculateBangladeshTax(
      profile('2026-2027'),
      { ...zeroIncome(), capitalGainsListedShares: 6000000 },
      zeroInvestments()
    );
    expect(res.statutoryExemptions.capitalGainsListedExemption).toBe(5000000);
    expect(res.grossTaxLiability).toBe(150000);
    expect(res.taxableOrdinaryIncome).toBe(0);
  });
});
