import React, { useState, useMemo } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { useAuth } from '../../lib/auth-context';
import {
  TaxpayerProfile,
  TaxpayerCategory,
  TaxZoneLocation,
  IncomeHeadsInput,
  EligibleInvestmentsInput,
  IT10BAssetsLiabilities,
  calculateBangladeshTax,
  calculateIT10BStatement,
  getExemptionThreshold,
  getMinimumTax,
} from '../../lib/tax-engine';
import {
  FileText,
  Calculator,
  ShieldCheck,
  TrendingUp,
  Printer,
  Sparkles,
  RefreshCw,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Landmark,
  PieChart,
  Sliders,
  Info,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { Field, Input, Select, Button, ErrorBanner } from '../ui';

export const IncomeTaxView: React.FC = () => {
  const { user } = useAuth();
  const {
    accounts,
    accountBalances,
    physicalAssets,
    debts,
    loans,
    stockHoldings,
    dividends,
  } = useLedger();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'calculator' | 'rebate' | 'it10b' | 'summary'>('calculator');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // 1. Taxpayer Profile
  const [profile, setProfile] = useState<TaxpayerProfile>({
    name: user.fullName || 'Registered Taxpayer',
    tin: '123456789012',
    assessmentYear: '2026-2027',
    incomeYear: '2025-2026',
    category: 'general_male',
    location: 'dhaka_chattogram_city',
    hasDisabledDependent: false,
    disabledDependentsCount: 0,
  });

  // 2. Income Heads
  const [income, setIncome] = useState<IncomeHeadsInput>({
    salaryGross: 1200000,
    salaryBasic: 720000,
    salaryAllowances: 360000,
    salaryBonus: 120000,
    rentalIncomeGross: 360000,
    rentalType: 'residential',
    rentalMunicipalTax: 12000,
    agricultureGross: 0,
    hasAgriAccounts: false,
    businessGrossRevenue: 0,
    businessNetProfit: 0,
    capitalGainsListedShares: 50000,
    capitalGainsRealEstate: 0,
    capitalGainsOther: 0,
    bankInterestGross: 45000,
    bankInterestTds: 4500, // 10% TDS with TIN
    dpsProfitGross: 25000,
    sanchayapatraProfitGross: 60000,
    sanchayapatraTds: 6000, // 10% TDS
    cashDividendsGross: 15000,
    dividendTds: 1500,
    otherIncomeGross: 0,
    advanceTaxAitPaid: 25000,
    taxPaidWithPriorReturn: 0,
  });

  // 3. Eligible Investments
  const [investments, setInvestments] = useState<EligibleInvestmentsInput>({
    dpsContribution: 120000, // Statutorily capped at 1.2L
    sanchayapatraPurchase: 200000,
    dseStockPurchase: 150000,
    lifeInsurancePremium: 30000,
    providentFundContribution: 60000,
    govtTreasuryBond: 0,
    benevolentFundOrGroupInsurance: 5000,
  });

  // 4. IT-10B Assets & Liabilities
  const [it10b, setIt10b] = useState<IT10BAssetsLiabilities>({
    nonAgriPropertyCost: 4500000,
    nonAgriPropertyDescription: 'Residential Apartment (1,450 sq ft), Dhanmondi, Dhaka',
    agriPropertyCost: 800000,
    agriPropertyDescription: 'Agricultural land (0.45 acre), Cumilla',
    bankAndCashBalances: 450000,
    fixedDepositsFdr: 1000000,
    dpsBalance: 360000,
    sharesListedCost: 850000,
    sanchayapatraCost: 500000,
    otherFinancialAssets: 50000,
    motorVehicleCost: 1800000,
    motorVehicleCount: 1,
    motorVehicleDescription: 'Toyota Corolla Sedan (Reg: Dhaka Metro)',
    goldBhori: 15,
    goldCostOrValue: 650000,
    furnitureAndElectronicsCost: 350000,
    otherAssetsCost: 150000,
    personalLoansGiven: 100000,
    bankMortgagesAndLoans: 1200000,
    personalDebtsAndPayables: 150000,
    otherLiabilities: 0,
    previousYearNetWealth: 8500000,
    annualFamilyLivingExpenses: 650000,
    giftOrInheritanceReceived: 0,
    taxExemptIncome: 120000,
  });

  // Extra surcharge flags
  const [hasMultipleCarsOrLargeFlat, setHasMultipleCarsOrLargeFlat] = useState(false);

  // -----------------------------------------------------------
  // Auto-Sync from Money Canvas Double-Entry Accounts & Assets
  // -----------------------------------------------------------
  const handleSyncFromCanvas = () => {
    // 1. Bank and Cash balances
    let bankCashSum = 0;
    let fdrSum = 0;
    let dpsSum = 0;

    accountBalances.forEach((bal) => {
      const acc = accounts.find((a) => a.id === bal.accountId);
      if (!acc) return;
      if (acc.accountType === 'cash' || acc.accountType === 'bank' || acc.accountType === 'mobile_wallet') {
        bankCashSum += Math.max(0, bal.currentBalance);
      } else if (acc.accountType === 'fd') {
        fdrSum += Math.max(0, bal.currentBalance);
      } else if (acc.accountType === 'dps') {
        dpsSum += Math.max(0, bal.currentBalance);
      }
    });

    // 2. Listed shares value (cost basis from stockHoldings)
    const stockCostBasis = stockHoldings.reduce((sum, h) => sum + (h.investedValue || 0), 0);

    // 3. Physical Assets categorisation
    let nonAgriCost = 0;
    let vehicleCost = 0;
    let goldCost = 0;
    let furnitureElectronicsCost = 0;
    let otherAssetCost = 0;

    physicalAssets.forEach((pa) => {
      const cost = pa.purchasePrice || 0;
      const cat = pa.assetCategory || '';
      if (cat === 'real_estate') {
        nonAgriCost += cost;
      } else if (cat === 'vehicle') {
        vehicleCost += cost;
      } else if (cat === 'gold_jewelry') {
        goldCost += cost;
      } else if (cat === 'electronics') {
        furnitureElectronicsCost += cost;
      } else {
        otherAssetCost += cost;
      }
    });

    // 4. Liabilities from Loans & Debts
    const bankLoanSum = loans
      .filter((l) => l.status === 'active')
      .reduce((s, l) => s + (l.principal || 0), 0);
    const personalDebtSum = debts
      .filter((d) => d.direction === 'borrowed' && d.status === 'active')
      .reduce((s, d) => s + (d.initialAmount || 0), 0);
    const personalLoanGivenSum = debts
      .filter((d) => d.direction === 'lent' && d.status === 'active')
      .reduce((s, d) => s + (d.initialAmount || 0), 0);

    // 5. Dividend income
    const dividendSum = dividends.reduce((s, d) => s + (d.grossDividend || 0), 0);
    const dividendTdsSum = dividends.reduce((s, d) => s + (d.tax || 0), 0);

    // 6. Sanchayapatra & Treasury Bonds
    let sanchayaPrincipalSum = 0;
    let sanchayaAnnualGrossProfit = 0;
    let sanchayaAnnualTds = 0;
    try {
      const storedBonds = localStorage.getItem('wealthfolio_sanchaya_bonds_v1');
      if (storedBonds) {
        const parsed = JSON.parse(storedBonds);
        if (Array.isArray(parsed)) {
          parsed.filter((b: { status?: string }) => b.status === 'active').forEach((b: { principalAmount?: number; interestRate?: number; taxDeductionRate?: number }) => {
            const p = b.principalAmount || 0;
            const r = b.interestRate || 0;
            const t = b.taxDeductionRate ?? 10;
            sanchayaPrincipalSum += p;
            const gross = (p * r) / 100;
            const tax = (gross * t) / 100;
            sanchayaAnnualGrossProfit += gross;
            sanchayaAnnualTds += tax;
          });
        }
      }
    } catch (e) {
      console.warn('Error reading sanchaya bonds for tax sync', e);
    }

    // Apply sync to state
    setIt10b((prev) => ({
      ...prev,
      bankAndCashBalances: bankCashSum > 0 ? bankCashSum : prev.bankAndCashBalances,
      fixedDepositsFdr: fdrSum > 0 ? fdrSum : prev.fixedDepositsFdr,
      dpsBalance: dpsSum > 0 ? dpsSum : prev.dpsBalance,
      sharesListedCost: stockCostBasis > 0 ? stockCostBasis : prev.sharesListedCost,
      sanchayapatraCost: sanchayaPrincipalSum > 0 ? sanchayaPrincipalSum : prev.sanchayapatraCost,
      nonAgriPropertyCost: nonAgriCost > 0 ? nonAgriCost : prev.nonAgriPropertyCost,
      motorVehicleCost: vehicleCost > 0 ? vehicleCost : prev.motorVehicleCost,
      goldCostOrValue: goldCost > 0 ? goldCost : prev.goldCostOrValue,
      furnitureAndElectronicsCost: furnitureElectronicsCost > 0 ? furnitureElectronicsCost : prev.furnitureAndElectronicsCost,
      otherAssetsCost: otherAssetCost > 0 ? otherAssetCost : prev.otherAssetsCost,
      personalLoansGiven: personalLoanGivenSum > 0 ? personalLoanGivenSum : prev.personalLoansGiven,
      bankMortgagesAndLoans: bankLoanSum > 0 ? bankLoanSum : prev.bankMortgagesAndLoans,
      personalDebtsAndPayables: personalDebtSum > 0 ? personalDebtSum : prev.personalDebtsAndPayables,
    }));

    if (dividendSum > 0) {
      setIncome((prev) => ({
        ...prev,
        cashDividendsGross: dividendSum,
        dividendTds: dividendTdsSum,
      }));
    }

    if (sanchayaPrincipalSum > 0) {
      setInvestments((prev) => ({
        ...prev,
        sanchayapatraPurchase: Math.min(500000, sanchayaPrincipalSum),
      }));
      setIncome((prev) => ({
        ...prev,
        sanchayapatraProfitGross: Math.round(sanchayaAnnualGrossProfit),
        sanchayapatraTds: Math.round(sanchayaAnnualTds),
      }));
    }

    if (dpsSum > 0) {
      setInvestments((prev) => ({
        ...prev,
        dpsContribution: Math.min(120000, dpsSum > 120000 ? 120000 : dpsSum),
      }));
    }

    setSyncFeedback('লেজার, ব্যাংক অ্যাকাউন্ট, ডিএসই পোর্টফোলিও ও সঞ্চয়পত্র/বন্ড থেকে সফলভাবে লাইভ ডেটা সিঙ্ক করা হয়েছে!');
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // -----------------------------------------------------------
  // Calculations
  // -----------------------------------------------------------
  const it10bResult = useMemo(() => {
    // Preliminary net taxable income
    const tempTax = calculateBangladeshTax(profile, income, investments, 0, false);
    return calculateIT10BStatement(it10b, tempTax.netTaxableIncome);
  }, [it10b, profile, income, investments]);

  const taxResult = useMemo(() => {
    return calculateBangladeshTax(
      profile,
      income,
      investments,
      it10bResult.netWealth,
      hasMultipleCarsOrLargeFlat
    );
  }, [profile, income, investments, it10bResult.netWealth, hasMultipleCarsOrLargeFlat]);

  // Currency Formatter
  const formatBDT = (num: number) => {
    return `৳ ${Math.round(num).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-edge bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Landmark className="h-48 w-48 text-accent-strong" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1.5 font-mono">
              <ShieldCheck className="h-4 w-4" />
              <span>NBR Income Tax Act 2023 Compliant</span>
              <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent-strong text-[10px] border border-accent/20">
                AY {profile.assessmentYear}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight flex items-center gap-2.5">
              <span>বাংলাদেশ আয়কর ও এনবিআর রিটার্ন প্ল্যানার</span>
            </h1>
            <p className="text-ink-muted text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              স্বয়ংক্রিয় কর নির্ধারণ, ষষ্ঠ তফসিল অনুযায়ী বিনিয়োগ কর রেয়াত, আইটি-১০বি সম্পদ ও দায় বিবরণী এবং এনবিআর রিটার্ন সামারি।
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleSyncFromCanvas}
              variant="primary"
              icon={RefreshCw}
              title="Pull balances from double-entry accounts, DSE stocks, and physical assets"
            >
              <span>লেজার থেকে ডেটা আনুন (Auto-Sync)</span>
            </Button>

            <Button
              onClick={() => setActiveTab('summary')}
              variant="secondary"
            >
              <Printer className="h-3.5 w-3.5 text-sky-400" />
              <span>রিটার্ন সামারি</span>
            </Button>
          </div>
        </div>

        {/* Sync alert banner */}
        {syncFeedback && (
          <ErrorBanner variant="success" message={syncFeedback} className="mt-4" />
        )}

        {/* High-level Tax KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-edge/80">
          <div className="bg-surface/80 border border-edge p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-ink-muted">করযোগ্য মোট আয় (Net Taxable)</div>
            <div className="text-base sm:text-lg font-bold text-ink mt-0.5">
              {formatBDT(taxResult.netTaxableIncome)}
            </div>
            <div className="text-[10px] text-ink-muted mt-1 flex items-center gap-1">
              <span>করমুক্ত সীমা:</span>
              <span className="font-semibold text-accent-strong">{formatBDT(taxResult.exemptionThreshold)}</span>
            </div>
          </div>

          <div className="bg-surface/80 border border-edge p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-ink-muted">বিনিয়োগ কর রেয়াত (Tax Rebate)</div>
            <div className="text-base sm:text-lg font-bold text-accent-strong mt-0.5">
              {formatBDT(taxResult.rebate.rebateAmount)}
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              অনুমোদিত বিনিয়োগ: <span className="text-ink-soft font-semibold">{formatBDT(taxResult.rebate.allowableInvestment)}</span>
            </div>
          </div>

          <div className="bg-surface/80 border border-edge p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-ink-muted">মোট নিট সম্পদ (Net Wealth IT-10B)</div>
            <div className="text-base sm:text-lg font-bold text-sky-400 mt-0.5">
              {formatBDT(it10bResult.netWealth)}
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              সারচার্জ হার: <span className="font-semibold text-warning">{taxResult.surcharge.ratePct}%</span>
            </div>
          </div>

          <div className="bg-surface/80 border border-accent/40 p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900/80">
            <div className="text-[11px] font-mono text-accent-strong">রিটার্নের সাথে প্রদেয় কর (Net Payable)</div>
            <div className={`text-base sm:text-lg font-bold mt-0.5 ${taxResult.netTaxableIncome <= taxResult.exemptionThreshold ? 'text-accent-strong' : 'text-warning'}`}>
              {taxResult.netTaxPayableOrRefund > 0
                ? formatBDT(taxResult.netTaxPayableOrRefund)
                : taxResult.netTaxPayableOrRefund < 0
                ? `${formatBDT(Math.abs(taxResult.netTaxPayableOrRefund))} (রিফান্ড)`
                : '৳ 0 (করমুক্ত)'}
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              উৎস কর ক্রেডিট: <span className="text-ink-soft font-semibold">{formatBDT(taxResult.advanceTaxCredits.totalCredits)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface/90 border border-edge overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'calculator'
              ? 'bg-accent text-accent-ink shadow-md font-bold'
              : 'text-ink-soft hover:text-ink hover:bg-raised/60'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>১. আয়কর ও স্ল্যাব ক্যালকুলেটর</span>
        </button>

        <button
          onClick={() => setActiveTab('rebate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'rebate'
              ? 'bg-accent text-accent-ink shadow-md font-bold'
              : 'text-ink-soft hover:text-ink hover:bg-raised/60'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>২. বিনিয়োগ কর রেয়াত প্ল্যানার</span>
        </button>

        <button
          onClick={() => setActiveTab('it10b')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'it10b'
              ? 'bg-accent text-accent-ink shadow-md font-bold'
              : 'text-ink-soft hover:text-ink hover:bg-raised/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>৩. আইটি-১০বি সম্পদ ও দায় বিবরণী</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'summary'
              ? 'bg-accent text-accent-ink shadow-md font-bold'
              : 'text-ink-soft hover:text-ink hover:bg-raised/60'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>৪. এনবিআর রিটার্ন সামারি ও প্রিন্ট</span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: TAX CALCULATOR & SLABS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Taxpayer Profile & Income Inputs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Taxpayer Config Card */}
            <div className="rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2 text-accent-strong text-xs font-bold font-mono">
                  <Sliders className="h-4 w-4" />
                  <span>করদাতার ধরন ও কর অঞ্চল সেটিংস</span>
                </div>
                <span className="text-[11px] text-ink-muted">অর্থবছর: {profile.incomeYear}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="কর বছর (Assessment Year)">
                  <Select
                    value={profile.assessmentYear}
                    onChange={(e) => {
                      const ay = e.target.value;
                      const iy = ay === '2026-2027' ? '2025-2026' : '2024-2025';
                      setProfile({ ...profile, assessmentYear: ay, incomeYear: iy });
                    }}
                  >
                    <option value="2026-2027">২০২৬-২০২৭ (অধ্যাদেশ ২০২৫)</option>
                    <option value="2025-2026">২০২৫-২০২৬ (আইন ২০২৪)</option>
                  </Select>
                </Field>

                <Field label="করদাতার শ্রেণি (Taxpayer Category)">
                  <Select
                    value={profile.category}
                    onChange={(e) =>
                      setProfile({ ...profile, category: e.target.value as TaxpayerCategory })
                    }
                  >
                    <option value="general_male">
                      সাধারণ পুরুষ (করমুক্ত: {formatBDT(getExemptionThreshold('general_male', false, 0, profile.assessmentYear))})
                    </option>
                    <option value="female_or_senior">
                      নারী ও জ্যেষ্ঠ নাগরিক ৬৫+ (করমুক্ত: {formatBDT(getExemptionThreshold('female_or_senior', false, 0, profile.assessmentYear))})
                    </option>
                    <option value="third_gender_or_disabled">
                      প্রতিবন্ধী ব্যক্তি ও ৩য় লিঙ্গ (করমুক্ত: {formatBDT(getExemptionThreshold('third_gender_or_disabled', false, 0, profile.assessmentYear))})
                    </option>
                    <option value="freedom_fighter">
                      গেজেটভুক্ত যুদ্ধাহত বীর মুক্তিযোদ্ধা (করমুক্ত: {formatBDT(getExemptionThreshold('freedom_fighter', false, 0, profile.assessmentYear))})
                    </option>
                  </Select>
                </Field>

                <Field label="কর অঞ্চল ও ন্যূনতম কর এলাকা">
                  <Select
                    value={profile.location}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value as TaxZoneLocation })
                    }
                  >
                    <option value="dhaka_chattogram_city">
                      ঢাকা ও চট্টগ্রাম সিটি কর্পোরেশন (ন্যূনতম: {formatBDT(getMinimumTax('dhaka_chattogram_city', profile.assessmentYear))})
                    </option>
                    <option value="other_city_corporation">
                      অন্যান্য সিটি কর্পোরেশন (ন্যূনতম: {formatBDT(getMinimumTax('other_city_corporation', profile.assessmentYear))})
                    </option>
                    <option value="non_city_areas">
                      পৌরসভা / সিটি কর্পোরেশন বহির্ভূত (ন্যূনতম: {formatBDT(getMinimumTax('non_city_areas', profile.assessmentYear))})
                    </option>
                  </Select>
                </Field>
              </div>

              {/* Disabled child allowance */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-edge/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-ink-soft">প্রতিবন্ধী সন্তানের পিতা/মাতা/অভিভাবক</div>
                  <div className="text-[10px] text-ink-muted">প্রতি সন্তানের জন্য অতিরিক্ত ৳ ৫০,০০০ করমুক্ত সুবিধা</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.hasDisabledDependent}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        hasDisabledDependent: e.target.checked,
                        disabledDependentsCount: e.target.checked ? 1 : 0,
                      })
                    }
                    className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                  />
                  {profile.hasDisabledDependent && (
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={profile.disabledDependentsCount}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          disabledDependentsCount: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-14 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-xs text-center"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Income Heads Input Form */}
            <div className="rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold font-mono">
                  <DollarSign className="h-4 w-4" />
                  <span>আয়ের খাতসমূহ (Heads of Income — ধারা ৩২-৬৬)</span>
                </div>
                <span className="text-[11px] text-ink-muted">NBR Income Tax Act 2023</span>
              </div>

              {/* 1. Employment / Salary */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-edge/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent-strong flex items-center justify-center text-[10px] font-mono">1</span>
                    বেতন খাতে আয় (Employment / Salary)
                  </span>
                  <span className="text-[10px] font-mono text-accent-strong">
                    করছাড়: ১/৩ বা সর্বোচ্চ ৪.৫ লাখ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Field label="মোট গ্রস বেতন (Gross Annual Salary)">
                    <Input
                      type="number"
                      value={income.salaryGross || ''}
                      onChange={(e) => setIncome({ ...income, salaryGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="অনুমোদিত করমুক্ত অংশ (স্বয়ংক্রিয়)">
                    <div className="px-3 py-1.5 rounded-lg bg-surface/50 border border-edge text-accent-strong text-xs font-mono font-semibold">
                      - {formatBDT(taxResult.statutoryExemptions.salaryExemption)}
                    </div>
                  </Field>
                </div>
              </div>

              {/* 2. House Property Rent */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-edge/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-mono">2</span>
                    ভাড়া খাতে আয় (House Property / Rent)
                  </span>
                  <span className="text-[10px] font-mono text-sky-400">
                    মেরামত ব্যয় ২৫% বা ৩০% ছাড়
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <Field label="বাৎসরিক মোট ভাড়া">
                    <Input
                      type="number"
                      value={income.rentalIncomeGross || ''}
                      onChange={(e) => setIncome({ ...income, rentalIncomeGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="ভাড়ার ধরন">
                    <Select
                      value={income.rentalType}
                      onChange={(e) => setIncome({ ...income, rentalType: e.target.value as 'residential' | 'commercial' })}
                    >
                      <option value="residential">আবাসিক (২৫% মেরামত ছাড়)</option>
                      <option value="commercial">বাণিজ্যিক (৩০% মেরামত ছাড়)</option>
                    </Select>
                  </Field>
                  <Field label="পৌর কর / মিউনিসিপ্যাল ট্যাক্স">
                    <Input
                      type="number"
                      value={income.rentalMunicipalTax || ''}
                      onChange={(e) => setIncome({ ...income, rentalMunicipalTax: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                </div>
              </div>

              {/* 3. Agriculture & Business */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-canvas border border-edge/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-warning/20 text-warning flex items-center justify-center text-[10px] font-mono">3</span>
                      কৃষি খাতে আয়
                    </span>
                    <span className="text-[10px] text-warning">৬০% উৎপাদন খরচ ছাড়</span>
                  </div>
                  <Field label="বাৎসরিক মোট কৃষি আয়">
                    <Input
                      type="number"
                      value={income.agricultureGross || ''}
                      onChange={(e) => setIncome({ ...income, agricultureGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                </div>

                <div className="p-3.5 rounded-xl bg-canvas border border-edge/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-mono">4</span>
                      ব্যবসা ও পেশা
                    </span>
                    <span className="text-[10px] text-purple-400">নিট মুনাফা</span>
                  </div>
                  <Field label="ব্যবসার নিট লাভ (Net Profit)">
                    <Input
                      type="number"
                      value={income.businessNetProfit || ''}
                      onChange={(e) => setIncome({ ...income, businessNetProfit: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                </div>
              </div>

              {/* 4. Capital Gains & Financial Assets */}
              <div className="p-3.5 rounded-xl bg-canvas border border-edge/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent-strong flex items-center justify-center text-[10px] font-mono">5</span>
                    মূলধনী মুনাফা ও আর্থিক পরিসম্পদ (DSE Stocks, Bank & Savings)
                  </span>
                  <span className="text-[10px] font-mono text-accent-strong">
                    উৎস কর ক্রেডিট সহ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field
                    label={
                      <span className="flex items-center justify-between">
                        <span>ডিএসই স্টক ক্যাপিটাল গেইন</span>
                        <span className="text-[9px] text-accent-strong font-mono">৫০ লাখ পর্যন্ত করমুক্ত</span>
                      </span>
                    }
                  >
                    <Input
                      type="number"
                      value={income.capitalGainsListedShares || ''}
                      onChange={(e) => setIncome({ ...income, capitalGainsListedShares: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="ব্যাংক মুনাফা / FDR সুদ">
                    <Input
                      type="number"
                      value={income.bankInterestGross || ''}
                      onChange={(e) => setIncome({ ...income, bankInterestGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="সঞ্চয়পত্র থেকে মুনাফা">
                    <Input
                      type="number"
                      value={income.sanchayapatraProfitGross || ''}
                      onChange={(e) => setIncome({ ...income, sanchayapatraProfitGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="ক্যাশ ডিভিডেন্ড আয়">
                    <Input
                      type="number"
                      value={income.cashDividendsGross || ''}
                      onChange={(e) => setIncome({ ...income, cashDividendsGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="ব্যাংক/সঞ্চয়পত্র উৎসে কর (AIT/TDS)">
                    <Input
                      type="number"
                      value={(income.bankInterestTds + income.sanchayapatraTds) || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setIncome({ ...income, bankInterestTds: val });
                      }}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="অগ্রিম আয়কর (মোটরযান AIT ইত্যাদি)">
                    <Input
                      type="number"
                      value={income.advanceTaxAitPaid || ''}
                      onChange={(e) => setIncome({ ...income, advanceTaxAitPaid: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Reactive Slab Breakdown & Live Tax Ledger */}
          <div className="lg:col-span-5 space-y-6">
            {/* Slab Calculation Card */}
            <div className="rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2 text-accent-strong text-xs font-bold font-mono">
                  <PieChart className="h-4 w-4" />
                  <span>স্ল্যাবভিত্তিক আয়কর গণনা (Tax Slabs)</span>
                </div>
                <span className="text-[10px] font-mono bg-accent/10 text-accent-strong px-2 py-0.5 rounded border border-accent/20">
                  {profile.category === 'general_male' ? 'পুরুষ: ৩.৫ লাখ' : 'বিশেষ: ৪.০+ লাখ'}
                </span>
              </div>

              {/* Slabs List */}
              <div className="space-y-2.5">
                {taxResult.slabs.map((slab, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      slab.taxableInSlab > 0
                        ? 'bg-canvas border-slate-700 shadow-sm'
                        : 'bg-canvas/40 border-edge-soft opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 text-center py-0.5 rounded text-[10px] font-bold ${
                            slab.ratePct === 0
                              ? 'bg-raised text-ink-soft'
                              : 'bg-accent/20 text-accent-strong border border-accent/30'
                          }`}
                        >
                          {slab.ratePct}%
                        </span>
                        <span className="text-ink-soft">{slab.slabLabel}</span>
                      </div>
                      <span className="font-bold text-ink">
                        {slab.taxAmount > 0 ? formatBDT(slab.taxAmount) : '৳ ০'}
                      </span>
                    </div>

                    {slab.taxableInSlab > 0 && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted border-t border-edge/80 pt-1.5 font-mono">
                        <span>করযোগ্য আয়: {formatBDT(slab.taxableInSlab)}</span>
                        <span>ক্রমপুঞ্জিত কর: {formatBDT(slab.cumulativeTax)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tax Summary Subtotal */}
              <div className="space-y-2 pt-2 border-t border-edge text-xs font-mono">
                <div className="flex items-center justify-between text-ink-soft">
                  <span>গ্রস কর দায় (Gross Tax Liability):</span>
                  <span className="font-bold text-ink">{formatBDT(taxResult.grossTaxLiability)}</span>
                </div>

                <div className="flex items-center justify-between text-accent-strong">
                  <span>(-) বিনিয়োগ কর রেয়াত (Rebate):</span>
                  <span className="font-bold">- {formatBDT(taxResult.rebate.rebateAmount)}</span>
                </div>

                <div className="flex items-center justify-between text-ink-soft">
                  <span>রেয়াত পরবর্তী কর:</span>
                  <span className="font-bold text-ink">{formatBDT(taxResult.taxAfterRebate)}</span>
                </div>

                {taxResult.minimumTaxApplicable > taxResult.taxAfterRebate && taxResult.netTaxableIncome > taxResult.exemptionThreshold && (
                  <div className="flex items-center justify-between text-warning text-[11px] bg-warning/10 p-2 rounded-lg border border-warning/20">
                    <span>ন্যূনতম কর প্রযোজ্য (Minimum Tax):</span>
                    <span className="font-bold">{formatBDT(taxResult.minimumTaxApplicable)}</span>
                  </div>
                )}

                {taxResult.surcharge.amount > 0 && (
                  <div className="flex items-center justify-between text-sky-400 text-[11px] bg-sky-500/10 p-2 rounded-lg border border-sky-500/20">
                    <span>নিট সম্পদ সারচার্জ ({taxResult.surcharge.ratePct}%):</span>
                    <span className="font-bold">+ {formatBDT(taxResult.surcharge.amount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-ink-soft">
                  <span>(-) পরিশোধিত অগ্রিম ও উৎসে কর (AIT):</span>
                  <span className="font-bold text-accent-strong">- {formatBDT(taxResult.advanceTaxCredits.totalCredits)}</span>
                </div>

                {/* Final Net Payable Box */}
                <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border-2 border-accent/50 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-accent-strong tracking-wider">
                      রিটার্নের সাথে প্রদেয় কর (Net Payable)
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      চালান বা ই-পেমেন্টের মাধ্যমে প্রদেয়
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-ink">
                      {taxResult.netTaxPayableOrRefund > 0
                        ? formatBDT(taxResult.netTaxPayableOrRefund)
                        : '৳ ০'}
                    </div>
                    {taxResult.netTaxPayableOrRefund < 0 && (
                      <div className="text-[11px] text-accent-strong font-bold">
                        ফেরত দাবি (Refund): {formatBDT(Math.abs(taxResult.netTaxPayableOrRefund))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Surcharge Checkbox */}
            <div className="rounded-xl border border-edge bg-surface/40 p-4 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMultipleCarsOrLargeFlat}
                  onChange={(e) => setHasMultipleCarsOrLargeFlat(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-ink-soft">
                    একাধিক মোটরগাড়ি বা সিটি কর্পোরেশনে ৮,০০০+ বর্গফুট আবাসিক ভবন আছে
                  </span>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    আইন অনুযায়ী মোট নিট সম্পদ ৪ কোটি টাকার নিচে হলেও ন্যূনতম ১০% সারচার্জ আরোপিত হবে।
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: INVESTMENT TAX REBATE PLANNER */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'rebate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2 text-accent-strong text-xs font-bold font-mono">
                  <TrendingUp className="h-4 w-4" />
                  <span>অনুমোদিত বিনিয়োগের খাতসমূহ (ধারা ৭৮ ও ষষ্ঠ তফসিল অংশ ৩)</span>
                </div>
                <span className="text-[10px] font-mono bg-accent/10 text-accent-strong px-2 py-0.5 rounded border border-accent/20">
                  ১৫% কর রেয়াত
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {/* DPS */}
                <div className="p-3 rounded-xl bg-canvas border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>ডিপোজিট পেনশন স্কিম (DPS)</span>
                      <span className="text-[10px] text-accent-strong font-normal">(সর্বোচ্চ ১.২ লাখ অনুমোদন)</span>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5 font-sans">
                      বাৎসরিক জমা করা মাসিক ডিপিএস কিস্তি
                    </div>
                  </div>
                  <div className="w-full sm:w-44">
                    <Input
                      type="number"
                      value={investments.dpsContribution || ''}
                      onChange={(e) =>
                        setInvestments({ ...investments, dpsContribution: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="text-right font-mono"
                    />
                  </div>
                </div>

                {/* Sanchayapatra */}
                <div className="p-3 rounded-xl bg-canvas border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>জাতীয় সঞ্চয়পত্র ক্রয় (Sanchayapatra)</span>
                      <span className="text-[10px] text-sky-400 font-normal">(সর্বোচ্চ ৫ লাখ বিবেচনা)</span>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5 font-sans">
                      পরিবার, পেনশনার বা ৩ মাস অন্তর মুনাফাভিত্তিক সঞ্চয়পত্র
                    </div>
                  </div>
                  <div className="w-full sm:w-44">
                    <Input
                      type="number"
                      value={investments.sanchayapatraPurchase || ''}
                      onChange={(e) =>
                        setInvestments({ ...investments, sanchayapatraPurchase: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="text-right font-mono"
                    />
                  </div>
                </div>

                {/* DSE Shares */}
                <div className="p-3 rounded-xl bg-canvas border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>ডিএসই শেয়ারবাজার ও মিউচুয়াল ফান্ড (DSE Stocks)</span>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5 font-sans">
                      শেয়ারবাজারে তালিকাভুক্ত শেয়ার বা অনুমোদিত ইউনিট ফান্ড ক্রয়
                    </div>
                  </div>
                  <div className="w-full sm:w-44">
                    <Input
                      type="number"
                      value={investments.dseStockPurchase || ''}
                      onChange={(e) =>
                        setInvestments({ ...investments, dseStockPurchase: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="text-right font-mono"
                    />
                  </div>
                </div>

                {/* Life Insurance */}
                <div className="p-3 rounded-xl bg-canvas border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>জীবন বীমা প্রিমিয়াম (Life Insurance)</span>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5 font-sans">
                      পলিসি মূল্যের সর্বোচ্চ ১০% পর্যন্ত অনুমোদনযোগ্য
                    </div>
                  </div>
                  <div className="w-full sm:w-44">
                    <Input
                      type="number"
                      value={investments.lifeInsurancePremium || ''}
                      onChange={(e) =>
                        setInvestments({ ...investments, lifeInsurancePremium: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="text-right font-mono"
                    />
                  </div>
                </div>

                {/* Provident Fund */}
                <div className="p-3 rounded-xl bg-canvas border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>অনুমোদিত ভবিষ্যৎ তহবিল (Provident Fund)</span>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5 font-sans">
                      জিপিএফ / আরপিএফ ও কল্যাণ তহবিল চাঁদা
                    </div>
                  </div>
                  <div className="w-full sm:w-44">
                    <Input
                      type="number"
                      value={investments.providentFundContribution || ''}
                      onChange={(e) =>
                        setInvestments({ ...investments, providentFundContribution: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="text-right font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rebate Optimization Advice Box */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-6 space-y-4">
              <div className="flex items-center gap-2 text-accent-strong font-bold text-sm">
                <Sparkles className="h-5 w-5" />
                <span>ট্যাক্স রিবেট সামারি ও সেভিংস অ্যাডভাইজার</span>
              </div>

              <div className="space-y-3 font-mono text-xs pt-2">
                <div className="flex items-center justify-between text-ink-soft">
                  <span>প্রকৃত মোট বিনিয়োগ:</span>
                  <span className="font-bold text-ink">{formatBDT(taxResult.rebate.totalEligibleInvestment)}</span>
                </div>

                <div className="flex items-center justify-between text-ink-soft">
                  <span>অনুমোদিত বিনিয়োগ সিলিং (ধারা ৭৮):</span>
                  <span className="font-bold text-ink">{formatBDT(taxResult.rebate.allowableInvestmentCeiling)}</span>
                </div>

                <div className="flex items-center justify-between text-accent-strong border-t border-edge pt-2">
                  <span>বিবেচিত বিনিয়োগ (Allowable):</span>
                  <span className="font-bold text-lg">{formatBDT(taxResult.rebate.allowableInvestment)}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-accent-strong font-sans">
                      মোট অর্জিত কর রেয়াত (Tax Rebate)
                    </div>
                    <div className="text-[10px] text-ink-muted font-sans">১৫% হারে সরাসরি কর থেকে বাদ</div>
                  </div>
                  <div className="text-xl font-extrabold text-accent-strong font-mono">
                    {formatBDT(taxResult.rebate.rebateAmount)}
                  </div>
                </div>
              </div>

              {/* Recommendation for more savings */}
              {taxResult.rebate.recommendedAdditionalInvestment > 0 && (
                <div className="p-4 rounded-xl bg-surface border border-edge space-y-2 font-sans">
                  <div className="flex items-center gap-2 text-xs font-bold text-warning">
                    <Info className="h-4 w-4" />
                    <span>আরও কর বাঁচানোর সুযোগ!</span>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed">
                    আপনার ধারা ৭৮ অনুযায়ী সর্বোচ্চ কর রেয়াত অর্জন করতে আপনি আরও{' '}
                    <strong className="text-ink font-mono">{formatBDT(taxResult.rebate.recommendedAdditionalInvestment)}</strong>{' '}
                    টাকা ডিপিএস বা শেয়ারবাজারে বিনিয়োগ করতে পারেন। এতে আপনার আরও{' '}
                    <strong className="text-accent-strong font-mono">
                      {formatBDT(taxResult.rebate.recommendedAdditionalInvestment * 0.15)}
                    </strong>{' '}
                    টাকা সরাসরি ট্যাক্স সেভ হবে!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: IT-10B WEALTH STATEMENT */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'it10b' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-edge bg-surface/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-edge pb-4">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent-strong" />
                  <span>আইটি-১০বি সম্পদ, দায় ও ব্যয় বিবরণী (IT-10B Statement)</span>
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  জাতীয় রাজস্ব বোর্ড (NBR) নির্ধারিত ফরম্যাট — ধারা ৭৮ ও আয়কর আইন ২০২৩
                </p>
              </div>

              <Button
                onClick={handleSyncFromCanvas}
                variant="success"
                size="sm"
                className="font-mono"
              >
                <RefreshCw className="h-3 w-3" />
                <span>লেজার ব্যালেন্স অটো-সিঙ্ক</span>
              </Button>
            </div>

            {/* Grid of Assets & Liabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Part A: Assets */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-accent-strong font-mono flex items-center justify-between border-b border-edge/80 pb-2">
                  <span>ক. পরিসম্পদ (Gross Assets)</span>
                  <span>{formatBDT(it10bResult.grossAssets)}</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {/* Non-Agri Property */}
                  <div className="p-3 rounded-xl bg-canvas border border-edge space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-soft">১. অকৃষি সম্পত্তি (ফ্ল্যাট, জমি, বাড়ি)</span>
                      <input
                        type="number"
                        value={it10b.nonAgriPropertyCost || ''}
                        onChange={(e) => setIt10b({ ...it10b, nonAgriPropertyCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                      />
                    </div>
                    <input
                      type="text"
                      value={it10b.nonAgriPropertyDescription}
                      onChange={(e) => setIt10b({ ...it10b, nonAgriPropertyDescription: e.target.value })}
                      placeholder="বিবরণ (ঠিকানা ও আয়তন)"
                      className="w-full px-2 py-1 rounded bg-surface/50 border border-edge text-[11px] text-ink-muted"
                    />
                  </div>

                  {/* Agricultural Land */}
                  <div className="p-3 rounded-xl bg-canvas border border-edge space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-soft">২. কৃষি সম্পত্তি (জমি)</span>
                      <input
                        type="number"
                        value={it10b.agriPropertyCost || ''}
                        onChange={(e) => setIt10b({ ...it10b, agriPropertyCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                      />
                    </div>
                  </div>

                  {/* Financial Assets */}
                  <div className="p-3 rounded-xl bg-canvas border border-edge space-y-2">
                    <span className="text-ink-soft font-bold block">৩. আর্থিক পরিসম্পদ (Financial Assets)</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-ink-muted">ক্যাশ ও ব্যাংক ব্যালেন্স:</span>
                        <input
                          type="number"
                          value={it10b.bankAndCashBalances || ''}
                          onChange={(e) => setIt10b({ ...it10b, bankAndCashBalances: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                        />
                      </div>
                      <div>
                        <span className="text-ink-muted">এফডিআর ও ডিপিএস ব্যালেন্স:</span>
                        <input
                          type="number"
                          value={(it10b.fixedDepositsFdr + it10b.dpsBalance) || ''}
                          onChange={(e) => setIt10b({ ...it10b, fixedDepositsFdr: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                        />
                      </div>
                      <div>
                        <span className="text-ink-muted">শেয়ারবাজার বিনিয়োগ (ক্রয়মূল্য):</span>
                        <input
                          type="number"
                          value={it10b.sharesListedCost || ''}
                          onChange={(e) => setIt10b({ ...it10b, sharesListedCost: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                        />
                      </div>
                      <div>
                        <span className="text-ink-muted">সঞ্চয়পত্র ক্রয়মূল্য:</span>
                        <input
                          type="number"
                          value={it10b.sanchayapatraCost || ''}
                          onChange={(e) => setIt10b({ ...it10b, sanchayapatraCost: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Motor Vehicle */}
                  <div className="p-3 rounded-xl bg-canvas border border-edge space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-soft">৪. মোটরযান (Motor Vehicle)</span>
                      <input
                        type="number"
                        value={it10b.motorVehicleCost || ''}
                        onChange={(e) => setIt10b({ ...it10b, motorVehicleCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                      />
                    </div>
                  </div>

                  {/* Gold & Jewellery */}
                  <div className="p-3 rounded-xl bg-canvas border border-edge space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-soft">৫. স্বর্ণালঙ্কার ও মূল্যবান ধাতু</span>
                      <input
                        type="number"
                        value={it10b.goldCostOrValue || ''}
                        onChange={(e) => setIt10b({ ...it10b, goldCostOrValue: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                      />
                    </div>
                  </div>

                  {/* Furniture & Electronics */}
                  <div className="p-3 rounded-xl bg-canvas border border-edge space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-soft">৬. আসবাবপত্র ও ইলেকট্রনিক্স</span>
                      <input
                        type="number"
                        value={it10b.furnitureAndElectronicsCost || ''}
                        onChange={(e) => setIt10b({ ...it10b, furnitureAndElectronicsCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Part B: Liabilities & Reconciliation */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-negative font-mono flex items-center justify-between border-b border-edge/80 pb-2">
                  <span>খ. দায়সমূহ (Liabilities / Borrowings)</span>
                  <span>{formatBDT(it10bResult.totalLiabilities)}</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-canvas border border-edge flex items-center justify-between">
                    <span className="text-ink-soft">১. ব্যাংক ঋণ ও গৃহনির্মাণ ঋণ</span>
                    <input
                      type="number"
                      value={it10b.bankMortgagesAndLoans || ''}
                      onChange={(e) => setIt10b({ ...it10b, bankMortgagesAndLoans: parseFloat(e.target.value) || 0 })}
                      className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-edge flex items-center justify-between">
                    <span className="text-ink-soft">২. ব্যক্তিগত ধারদেনা (Unsecured Loans)</span>
                    <input
                      type="number"
                      value={it10b.personalDebtsAndPayables || ''}
                      onChange={(e) => setIt10b({ ...it10b, personalDebtsAndPayables: parseFloat(e.target.value) || 0 })}
                      className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                    />
                  </div>
                </div>

                {/* Net Wealth Box */}
                <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-sky-400 font-mono">
                      গ. বছর শেষে নিট সম্পদ (Net Wealth)
                    </div>
                    <div className="text-[11px] text-ink-muted">মোট পরিসম্পদ বাদ মোট দায় (ক - খ)</div>
                  </div>
                  <div className="text-xl font-bold text-ink font-mono">
                    {formatBDT(it10bResult.netWealth)}
                  </div>
                </div>

                {/* Part C: Accretion & Family Living Expenses */}
                <div className="text-xs font-bold text-warning font-mono flex items-center justify-between border-b border-edge/80 pt-2 pb-2">
                  <span>ঘ. সম্পদ বৃদ্ধি ও পারিবারিক জীবনযাপন ব্যয় (Reconciliation)</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-canvas border border-edge flex items-center justify-between">
                    <div>
                      <span className="text-ink-soft">পূর্ববর্তী বছরের নিট সম্পদ</span>
                      <div className="text-[10px] text-ink-muted">গত বছরের শেষ দিনে থাকা সম্পদ</div>
                    </div>
                    <input
                      type="number"
                      value={it10b.previousYearNetWealth || ''}
                      onChange={(e) => setIt10b({ ...it10b, previousYearNetWealth: parseFloat(e.target.value) || 0 })}
                      className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-edge flex items-center justify-between">
                    <div>
                      <span className="text-ink-soft">পারিবারিক জীবনযাপন ব্যয় (IT-10BB)</span>
                      <div className="text-[10px] text-ink-muted">বাৎসরিক খাবার, বাড়িভাড়া, শিক্ষা ও চিকিৎসা খরচ</div>
                    </div>
                    <input
                      type="number"
                      value={it10b.annualFamilyLivingExpenses || ''}
                      onChange={(e) => setIt10b({ ...it10b, annualFamilyLivingExpenses: parseFloat(e.target.value) || 0 })}
                      className="w-36 px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-right"
                    />
                  </div>

                  {/* Accretion summary */}
                  <div className="p-3 rounded-xl bg-canvas border border-edge text-[11px] space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-ink-soft">
                      <span>চলতি বছরে সম্পদ বৃদ্ধি (Accretion):</span>
                      <span className="font-bold text-ink">{formatBDT(it10bResult.netAccretionInWealth)}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-soft">
                      <span>মোট ব্যয় ও বিনিয়োগ তহবিল (Outflow):</span>
                      <span className="font-bold text-ink">{formatBDT(it10bResult.totalOutflow)}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-soft">
                      <span>প্রদর্শিত আয়ের উৎস (Inflow):</span>
                      <span className="font-bold text-accent-strong">{formatBDT(it10bResult.totalInflowReconciled)}</span>
                    </div>
                  </div>

                  {/* Reconciliation feedback */}
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      it10bResult.isReconciled
                        ? 'bg-accent/10 border-accent/30 text-accent-strong'
                        : 'bg-warning/10 border-warning/30 text-warning'
                    }`}
                  >
                    {it10bResult.isReconciled ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-accent-strong shrink-0" />
                        <span>আইটি-১০বি আয়ের উৎস ও সম্পদ বৃদ্ধির সম্পূর্ণ সামঞ্জস্য রয়েছে (Reconciled)!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                        <span>
                          আয় ও সম্পদ বৃদ্ধির ব্যবধান: {formatBDT(Math.abs(it10bResult.reconciliationDifference))} (
                          {it10bResult.reconciliationDifference > 0 ? 'অতিরিক্ত প্রদর্শিত আয়' : 'অপ্রদর্শিত আয়ের ঝুঁকি'}
                          )
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: NBR RETURN SUMMARY & PRINT */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-edge bg-surface/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-edge pb-4">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent-strong" />
                  <span>জাতীয় রাজস্ব বোর্ড (NBR) আয়কর রিটার্ন সারাংশ</span>
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  কর বছর {profile.assessmentYear} | ই-রিটার্ন (etaxnbr.gov.bd) দাখিলের জন্য প্রস্তুত ফরম্যাট
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.print()}
                  variant="primary"
                  size="sm"
                  icon={Printer}
                >
                  <span>প্রিন্ট / PDF সংরক্ষণ</span>
                </Button>

                <a
                  href="https://etaxnbr.gov.bd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-raised hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>NBR e-Return Portal</span>
                </a>
              </div>
            </div>

            {/* Print-friendly Return Document Preview */}
            <div className="rounded-xl border border-edge bg-canvas p-6 space-y-6 text-ink-soft">
              {/* Header Slip */}
              <div className="text-center space-y-1 border-b border-edge pb-4">
                <div className="text-xs font-mono uppercase tracking-widest text-accent-strong">
                  Government of the People's Republic of Bangladesh
                </div>
                <div className="text-sm font-bold text-ink">National Board of Revenue (NBR)</div>
                <div className="text-xs text-ink-muted">
                  Acknowledgement & Income Tax Return Summary (কর নির্ধারণ ও প্রাপ্তিস্বীকার)
                </div>
              </div>

              {/* Taxpayer Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border-b border-edge pb-4">
                <div>
                  <span className="text-ink-muted block text-[10px]">করদাতার নাম:</span>
                  <span className="font-bold text-ink">{profile.name}</span>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px]">ই-টিআইএন (e-TIN):</span>
                  <span className="font-bold text-ink">{profile.tin}</span>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px]">কর নির্ধারণী বছর:</span>
                  <span className="font-bold text-accent-strong">{profile.assessmentYear}</span>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px]">আয় বর্ষ:</span>
                  <span className="font-bold text-ink">{profile.incomeYear}</span>
                </div>
              </div>

              {/* Comprehensive Statement Table */}
              <div className="space-y-3 font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-edge text-ink-muted text-[11px]">
                      <th className="py-2">ক্রমিক</th>
                      <th className="py-2">আয় ও করের বিবরণী</th>
                      <th className="py-2 text-right">টাকার পরিমাণ (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge/60 text-ink-soft">
                    <tr>
                      <td className="py-2 text-ink-faint">১</td>
                      <td className="py-2">বেতন খাতে করযোগ্য আয় (ধারা ৩৩)</td>
                      <td className="py-2 text-right font-bold text-ink">
                        {formatBDT(Math.max(0, income.salaryGross - taxResult.statutoryExemptions.salaryExemption))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-ink-faint">২</td>
                      <td className="py-2">ভাড়া খাতে করযোগ্য আয় (ধারা ৩৫)</td>
                      <td className="py-2 text-right font-bold text-ink">
                        {formatBDT(Math.max(0, income.rentalIncomeGross - taxResult.statutoryExemptions.rentalRepairAllowance - income.rentalMunicipalTax))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-ink-faint">৩</td>
                      <td className="py-2">কৃষি খাতে করযোগ্য আয়</td>
                      <td className="py-2 text-right font-bold text-ink">
                        {formatBDT(Math.max(0, income.agricultureGross - taxResult.statutoryExemptions.agriProductionCost))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-ink-faint">৪</td>
                      <td className="py-2">ব্যবসা, শেয়ারবাজার মূলধনী লাভ ও ব্যাংক মুনাফা</td>
                      <td className="py-2 text-right font-bold text-ink">
                        {formatBDT(
                          income.businessNetProfit +
                            income.capitalGainsListedShares +
                            income.bankInterestGross +
                            income.sanchayapatraProfitGross +
                            income.cashDividendsGross
                        )}
                      </td>
                    </tr>
                    <tr className="bg-surface/50 font-bold text-ink">
                      <td className="py-2.5 text-accent-strong">৫</td>
                      <td className="py-2.5">মোট করযোগ্য আয় (Total Taxable Income)</td>
                      <td className="py-2.5 text-right text-accent-strong">
                        {formatBDT(taxResult.netTaxableIncome)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-ink-faint">৬</td>
                      <td className="py-2">গ্রস কর দায় (স্ল্যাব অনুযায়ী)</td>
                      <td className="py-2 text-right text-ink">
                        {formatBDT(taxResult.grossTaxLiability)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-ink-faint">৭</td>
                      <td className="py-2 text-accent-strong">(-) বিনিয়োগ কর রেয়াত (Tax Rebate)</td>
                      <td className="py-2 text-right text-accent-strong">
                        - {formatBDT(taxResult.rebate.rebateAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-ink-faint">৮</td>
                      <td className="py-2">নিট সম্পদ সারচার্জ (যদি থাকে)</td>
                      <td className="py-2 text-right text-ink">
                        {formatBDT(taxResult.surcharge.amount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-ink-faint">৯</td>
                      <td className="py-2 text-sky-400">(-) উৎসে কর ও অগ্রিম কর ক্রেডিট (AIT/TDS)</td>
                      <td className="py-2 text-right text-sky-400">
                        - {formatBDT(taxResult.advanceTaxCredits.totalCredits)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-950/40 text-accent-strong font-extrabold text-sm">
                      <td className="py-3 text-accent-strong">১০</td>
                      <td className="py-3">রিটার্নের সাথে প্রদেয় কর (Net Tax Payable)</td>
                      <td className="py-3 text-right">
                        {taxResult.netTaxPayableOrRefund > 0
                          ? formatBDT(taxResult.netTaxPayableOrRefund)
                          : '৳ ০ (করমুক্ত)'}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-edge">
                      <td className="py-2 text-ink-faint">১১</td>
                      <td className="py-2">বছর শেষে মোট নিট সম্পদ (IT-10B Net Wealth)</td>
                      <td className="py-2 text-right font-bold text-sky-400">
                        {formatBDT(it10bResult.netWealth)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Verification & Signoff */}
              <div className="pt-6 border-t border-edge flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-ink-muted font-mono">
                <div>
                  Generated securely by Money Canvas Wealth OS
                  <br />
                  Timestamp: {new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-center sm:text-right">
                  <div className="w-44 border-b border-slate-700 mb-1"></div>
                  <span>করদাতার স্বাক্ষর ও তারিখ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
