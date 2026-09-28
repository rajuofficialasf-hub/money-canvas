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
  Download,
  Printer,
  Sparkles,
  RefreshCw,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Landmark,
  Coins,
  Home,
  Car,
  PieChart,
  Sliders,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

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
    assessmentYear: '2025-2026',
    incomeYear: '2024-2025',
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
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Landmark className="h-48 w-48 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1.5 font-mono">
              <ShieldCheck className="h-4 w-4" />
              <span>NBR Income Tax Act 2023 Compliant</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                AY {profile.assessmentYear}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>বাংলাদেশ আয়কর ও এনবিআর রিটার্ন প্ল্যানার</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              স্বয়ংক্রিয় কর নির্ধারণ, ষষ্ঠ তফসিল অনুযায়ী বিনিয়োগ কর রেয়াত, আইটি-১০বি সম্পদ ও দায় বিবরণী এবং এনবিআর রিটার্ন সামারি।
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncFromCanvas}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              title="Pull balances from double-entry accounts, DSE stocks, and physical assets"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>লেজার থেকে ডেটা আনুন (Auto-Sync)</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-sky-400" />
              <span>রিটার্ন সামারি</span>
            </button>
          </div>
        </div>

        {/* Sync alert banner */}
        {syncFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* High-level Tax KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-slate-400">করযোগ্য মোট আয় (Net Taxable)</div>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">
              {formatBDT(taxResult.netTaxableIncome)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>করমুক্ত সীমা:</span>
              <span className="font-semibold text-emerald-400">{formatBDT(taxResult.exemptionThreshold)}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-slate-400">বিনিয়োগ কর রেয়াত (Tax Rebate)</div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">
              {formatBDT(taxResult.rebate.rebateAmount)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              অনুমোদিত বিনিয়োগ: <span className="text-slate-300 font-semibold">{formatBDT(taxResult.rebate.allowableInvestment)}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-slate-400">মোট নিট সম্পদ (Net Wealth IT-10B)</div>
            <div className="text-base sm:text-lg font-bold text-sky-400 mt-0.5">
              {formatBDT(it10bResult.netWealth)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              সারচার্জ হার: <span className="font-semibold text-amber-400">{taxResult.surcharge.ratePct}%</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/40 p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900/80">
            <div className="text-[11px] font-mono text-emerald-300">রিটার্নের সাথে প্রদেয় কর (Net Payable)</div>
            <div className={`text-base sm:text-lg font-bold mt-0.5 ${taxResult.netTaxableIncome <= taxResult.exemptionThreshold ? 'text-emerald-400' : 'text-amber-400'}`}>
              {taxResult.netTaxPayableOrRefund > 0
                ? formatBDT(taxResult.netTaxPayableOrRefund)
                : taxResult.netTaxPayableOrRefund < 0
                ? `${formatBDT(Math.abs(taxResult.netTaxPayableOrRefund))} (রিফান্ড)`
                : '৳ 0 (করমুক্ত)'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              উৎস কর ক্রেডিট: <span className="text-slate-300 font-semibold">{formatBDT(taxResult.advanceTaxCredits.totalCredits)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'calculator'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>১. আয়কর ও স্ল্যাব ক্যালকুলেটর</span>
        </button>

        <button
          onClick={() => setActiveTab('rebate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'rebate'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>২. বিনিয়োগ কর রেয়াত প্ল্যানার</span>
        </button>

        <button
          onClick={() => setActiveTab('it10b')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'it10b'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>৩. আইটি-১০বি সম্পদ ও দায় বিবরণী</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'summary'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                  <Sliders className="h-4 w-4" />
                  <span>করদাতার ধরন ও কর অঞ্চল সেটিংস</span>
                </div>
                <span className="text-[11px] text-slate-400">অর্থবছর: {profile.incomeYear}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">
                    করদাতার শ্রেণি (Taxpayer Category)
                  </label>
                  <select
                    value={profile.category}
                    onChange={(e) =>
                      setProfile({ ...profile, category: e.target.value as TaxpayerCategory })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-emerald-500 outline-none"
                  >
                    <option value="general_male">সাধারণ পুরুষ (করমুক্ত: ৳ ৩,৫০,০০০)</option>
                    <option value="female_or_senior">নারী ও জ্যেষ্ঠ নাগরিক ৬৫+ (করমুক্ত: ৳ ৪,০০,০০০)</option>
                    <option value="third_gender_or_disabled">প্রতিবন্ধী ব্যক্তি ও ৩য় লিঙ্গ (করমুক্ত: ৳ ৪,৭৫,০০০)</option>
                    <option value="freedom_fighter">গেজেটভুক্ত যুদ্ধাহত বীর মুক্তিযোদ্ধা (করমুক্ত: ৳ ৫,০০,০০০)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">
                    কর অঞ্চল ও ন্যূনতম কর এলাকা
                  </label>
                  <select
                    value={profile.location}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value as TaxZoneLocation })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-emerald-500 outline-none"
                  >
                    <option value="dhaka_chattogram_city">ঢাকা ও চট্টগ্রাম সিটি কর্পোরেশন (ন্যূনতম: ৳ ৫,০০০)</option>
                    <option value="other_city_corporation">অন্যান্য সিটি কর্পোরেশন (ন্যূনতম: ৳ ৪,০০০)</option>
                    <option value="non_city_areas">পৌরসভা / সিটি কর্পোরেশন বহির্ভূত (ন্যূনতম: ৳ ৩,০০০)</option>
                  </select>
                </div>
              </div>

              {/* Disabled child allowance */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">প্রতিবন্ধী সন্তানের পিতা/মাতা/অভিভাবক</div>
                  <div className="text-[10px] text-slate-400">প্রতি সন্তানের জন্য অতিরিক্ত ৳ ৫০,০০০ করমুক্ত সুবিধা</div>
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
                      className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs text-center"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Income Heads Input Form */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold font-mono">
                  <DollarSign className="h-4 w-4" />
                  <span>আয়ের খাতসমূহ (Heads of Income — ধারা ৩২-৬৬)</span>
                </div>
                <span className="text-[11px] text-slate-400">NBR Income Tax Act 2023</span>
              </div>

              {/* 1. Employment / Salary */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">1</span>
                    বেতন খাতে আয় (Employment / Salary)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    করছাড়: ১/৩ বা সর্বোচ্চ ৪.৫ লাখ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400">মোট গ্রস বেতন (Gross Annual Salary)</label>
                    <input
                      type="number"
                      value={income.salaryGross || ''}
                      onChange={(e) => setIncome({ ...income, salaryGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">অনুমোদিত করমুক্ত অংশ (স্বয়ংক্রিয়)</label>
                    <div className="mt-1 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800 text-emerald-400 text-xs font-mono font-semibold">
                      - {formatBDT(taxResult.statutoryExemptions.salaryExemption)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. House Property Rent */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-mono">2</span>
                    ভাড়া খাতে আয় (House Property / Rent)
                  </span>
                  <span className="text-[10px] font-mono text-sky-400">
                    মেরামত ব্যয় ২৫% বা ৩০% ছাড়
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400">বাৎসরিক মোট ভাড়া</label>
                    <input
                      type="number"
                      value={income.rentalIncomeGross || ''}
                      onChange={(e) => setIncome({ ...income, rentalIncomeGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">ভাড়ার ধরন</label>
                    <select
                      value={income.rentalType}
                      onChange={(e) => setIncome({ ...income, rentalType: e.target.value as 'residential' | 'commercial' })}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="residential">আবাসিক (২৫% মেরামত ছাড়)</option>
                      <option value="commercial">বাণিজ্যিক (৩০% মেরামত ছাড়)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">পৌর কর / মিউনিসিপ্যাল ট্যাক্স</label>
                    <input
                      type="number"
                      value={income.rentalMunicipalTax || ''}
                      onChange={(e) => setIncome({ ...income, rentalMunicipalTax: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Agriculture & Business */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono">3</span>
                      কৃষি খাতে আয়
                    </span>
                    <span className="text-[10px] text-amber-400">৬০% উৎপাদন খরচ ছাড়</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">বাৎসরিক মোট কৃষি আয়</label>
                    <input
                      type="number"
                      value={income.agricultureGross || ''}
                      onChange={(e) => setIncome({ ...income, agricultureGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-mono">4</span>
                      ব্যবসা ও পেশা
                    </span>
                    <span className="text-[10px] text-purple-400">নিট মুনাফা</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">ব্যবসার নিট লাভ (Net Profit)</label>
                    <input
                      type="number"
                      value={income.businessNetProfit || ''}
                      onChange={(e) => setIncome({ ...income, businessNetProfit: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Capital Gains & Financial Assets */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">5</span>
                    মূলধনী মুনাফা ও আর্থিক পরিসম্পদ (DSE Stocks, Bank & Savings)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    উৎস কর ক্রেডিট সহ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400">ডিএসই স্টক ক্যাপিটাল গেইন</label>
                    <input
                      type="number"
                      value={income.capitalGainsListedShares || ''}
                      onChange={(e) => setIncome({ ...income, capitalGainsListedShares: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">ব্যাংক মুনাফা / FDR সুদ</label>
                    <input
                      type="number"
                      value={income.bankInterestGross || ''}
                      onChange={(e) => setIncome({ ...income, bankInterestGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">সঞ্চয়পত্র থেকে মুনাফা</label>
                    <input
                      type="number"
                      value={income.sanchayapatraProfitGross || ''}
                      onChange={(e) => setIncome({ ...income, sanchayapatraProfitGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">ক্যাশ ডিভিডেন্ড আয়</label>
                    <input
                      type="number"
                      value={income.cashDividendsGross || ''}
                      onChange={(e) => setIncome({ ...income, cashDividendsGross: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">ব্যাংক/সঞ্চয়পত্র উৎসে কর (AIT/TDS)</label>
                    <input
                      type="number"
                      value={(income.bankInterestTds + income.sanchayapatraTds) || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setIncome({ ...income, bankInterestTds: val });
                      }}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">অগ্রিম আয়কর (মোটরযান AIT ইত্যাদি)</label>
                    <input
                      type="number"
                      value={income.advanceTaxAitPaid || ''}
                      onChange={(e) => setIncome({ ...income, advanceTaxAitPaid: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Reactive Slab Breakdown & Live Tax Ledger */}
          <div className="lg:col-span-5 space-y-6">
            {/* Slab Calculation Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                  <PieChart className="h-4 w-4" />
                  <span>স্ল্যাবভিত্তিক আয়কর গণনা (Tax Slabs)</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
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
                        ? 'bg-slate-950 border-slate-700 shadow-sm'
                        : 'bg-slate-950/40 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 text-center py-0.5 rounded text-[10px] font-bold ${
                            slab.ratePct === 0
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {slab.ratePct}%
                        </span>
                        <span className="text-slate-200">{slab.slabLabel}</span>
                      </div>
                      <span className="font-bold text-white">
                        {slab.taxAmount > 0 ? formatBDT(slab.taxAmount) : '৳ ০'}
                      </span>
                    </div>

                    {slab.taxableInSlab > 0 && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-1.5 font-mono">
                        <span>করযোগ্য আয়: {formatBDT(slab.taxableInSlab)}</span>
                        <span>ক্রমপুঞ্জিত কর: {formatBDT(slab.cumulativeTax)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tax Summary Subtotal */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span>গ্রস কর দায় (Gross Tax Liability):</span>
                  <span className="font-bold text-white">{formatBDT(taxResult.grossTaxLiability)}</span>
                </div>

                <div className="flex items-center justify-between text-emerald-400">
                  <span>(-) বিনিয়োগ কর রেয়াত (Rebate):</span>
                  <span className="font-bold">- {formatBDT(taxResult.rebate.rebateAmount)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>রেয়াত পরবর্তী কর:</span>
                  <span className="font-bold text-white">{formatBDT(taxResult.taxAfterRebate)}</span>
                </div>

                {taxResult.minimumTaxApplicable > taxResult.taxAfterRebate && taxResult.netTaxableIncome > taxResult.exemptionThreshold && (
                  <div className="flex items-center justify-between text-amber-400 text-[11px] bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
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

                <div className="flex items-center justify-between text-slate-300">
                  <span>(-) পরিশোধিত অগ্রিম ও উৎসে কর (AIT):</span>
                  <span className="font-bold text-emerald-400">- {formatBDT(taxResult.advanceTaxCredits.totalCredits)}</span>
                </div>

                {/* Final Net Payable Box */}
                <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border-2 border-emerald-500/50 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      রিটার্নের সাথে প্রদেয় কর (Net Payable)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      চালান বা ই-পেমেন্টের মাধ্যমে প্রদেয়
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-white">
                      {taxResult.netTaxPayableOrRefund > 0
                        ? formatBDT(taxResult.netTaxPayableOrRefund)
                        : '৳ ০'}
                    </div>
                    {taxResult.netTaxPayableOrRefund < 0 && (
                      <div className="text-[11px] text-emerald-400 font-bold">
                        ফেরত দাবি (Refund): {formatBDT(Math.abs(taxResult.netTaxPayableOrRefund))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Surcharge Checkbox */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMultipleCarsOrLargeFlat}
                  onChange={(e) => setHasMultipleCarsOrLargeFlat(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200">
                    একাধিক মোটরগাড়ি বা সিটি কর্পোরেশনে ৮,০০০+ বর্গফুট আবাসিক ভবন আছে
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                  <TrendingUp className="h-4 w-4" />
                  <span>অনুমোদিত বিনিয়োগের খাতসমূহ (ধারা ৭৮ ও ষষ্ঠ তফসিল অংশ ৩)</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                  ১৫% কর রেয়াত
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {/* DPS */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>ডিপোজিট পেনশন স্কিম (DPS)</span>
                      <span className="text-[10px] text-emerald-400 font-normal">(সর্বোচ্চ ১.২ লাখ অনুমোদন)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      বাৎসরিক জমা করা মাসিক ডিপিএস কিস্তি
                    </div>
                  </div>
                  <input
                    type="number"
                    value={investments.dpsContribution || ''}
                    onChange={(e) =>
                      setInvestments({ ...investments, dpsContribution: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full sm:w-44 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-right"
                  />
                </div>

                {/* Sanchayapatra */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>জাতীয় সঞ্চয়পত্র ক্রয় (Sanchayapatra)</span>
                      <span className="text-[10px] text-sky-400 font-normal">(সর্বোচ্চ ৫ লাখ বিবেচনা)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      পরিবার, পেনশনার বা ৩ মাস অন্তর মুনাফাভিত্তিক সঞ্চয়পত্র
                    </div>
                  </div>
                  <input
                    type="number"
                    value={investments.sanchayapatraPurchase || ''}
                    onChange={(e) =>
                      setInvestments({ ...investments, sanchayapatraPurchase: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full sm:w-44 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-right"
                  />
                </div>

                {/* DSE Shares */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>ডিএসই শেয়ারবাজার ও মিউচুয়াল ফান্ড (DSE Stocks)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      শেয়ারবাজারে তালিকাভুক্ত শেয়ার বা অনুমোদিত ইউনিট ফান্ড ক্রয়
                    </div>
                  </div>
                  <input
                    type="number"
                    value={investments.dseStockPurchase || ''}
                    onChange={(e) =>
                      setInvestments({ ...investments, dseStockPurchase: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full sm:w-44 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-right"
                  />
                </div>

                {/* Life Insurance */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>জীবন বীমা প্রিমিয়াম (Life Insurance)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      পলিসি মূল্যের সর্বোচ্চ ১০% পর্যন্ত অনুমোদনযোগ্য
                    </div>
                  </div>
                  <input
                    type="number"
                    value={investments.lifeInsurancePremium || ''}
                    onChange={(e) =>
                      setInvestments({ ...investments, lifeInsurancePremium: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full sm:w-44 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-right"
                  />
                </div>

                {/* Provident Fund */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>অনুমোদিত ভবিষ্যৎ তহবিল (Provident Fund)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      জিপিএফ / আরপিএফ ও কল্যাণ তহবিল চাঁদা
                    </div>
                  </div>
                  <input
                    type="number"
                    value={investments.providentFundContribution || ''}
                    onChange={(e) =>
                      setInvestments({ ...investments, providentFundContribution: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full sm:w-44 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rebate Optimization Advice Box */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Sparkles className="h-5 w-5" />
                <span>ট্যাক্স রিবেট সামারি ও সেভিংস অ্যাডভাইজার</span>
              </div>

              <div className="space-y-3 font-mono text-xs pt-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span>প্রকৃত মোট বিনিয়োগ:</span>
                  <span className="font-bold text-white">{formatBDT(taxResult.rebate.totalEligibleInvestment)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>অনুমোদিত বিনিয়োগ সিলিং (২০% বা ১ কোটি):</span>
                  <span className="font-bold text-white">{formatBDT(taxResult.rebate.allowableInvestmentCeiling)}</span>
                </div>

                <div className="flex items-center justify-between text-emerald-400 border-t border-slate-800 pt-2">
                  <span>বিবেচিত বিনিয়োগ (Allowable):</span>
                  <span className="font-bold text-lg">{formatBDT(taxResult.rebate.allowableInvestment)}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-300 font-sans">
                      মোট অর্জিত কর রেয়াত (Tax Rebate)
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">১৫% হারে সরাসরি কর থেকে বাদ</div>
                  </div>
                  <div className="text-xl font-extrabold text-emerald-400 font-mono">
                    {formatBDT(taxResult.rebate.rebateAmount)}
                  </div>
                </div>
              </div>

              {/* Recommendation for more savings */}
              {taxResult.rebate.recommendedAdditionalInvestment > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 font-sans">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Info className="h-4 w-4" />
                    <span>আরও কর বাঁচানোর সুযোগ!</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    আপনার মোট করযোগ্য আয়ের ২০% সিলিং পূর্ণ করতে আপনি আরও{' '}
                    <strong className="text-white font-mono">{formatBDT(taxResult.rebate.recommendedAdditionalInvestment)}</strong>{' '}
                    টাকা ডিপিএস বা শেয়ারবাজারে বিনিয়োগ করতে পারেন। এতে আপনার আরও{' '}
                    <strong className="text-emerald-400 font-mono">
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span>আইটি-১০বি সম্পদ, দায় ও ব্যয় বিবরণী (IT-10B Statement)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  জাতীয় রাজস্ব বোর্ড (NBR) নির্ধারিত ফরম্যাট — ধারা ৭৮ ও আয়কর আইন ২০২৩
                </p>
              </div>

              <button
                onClick={handleSyncFromCanvas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>লেজার ব্যালেন্স অটো-সিঙ্ক</span>
              </button>
            </div>

            {/* Grid of Assets & Liabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Part A: Assets */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-emerald-400 font-mono flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span>ক. পরিসম্পদ (Gross Assets)</span>
                  <span>{formatBDT(it10bResult.grossAssets)}</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {/* Non-Agri Property */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">১. অকৃষি সম্পত্তি (ফ্ল্যাট, জমি, বাড়ি)</span>
                      <input
                        type="number"
                        value={it10b.nonAgriPropertyCost || ''}
                        onChange={(e) => setIt10b({ ...it10b, nonAgriPropertyCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                      />
                    </div>
                    <input
                      type="text"
                      value={it10b.nonAgriPropertyDescription}
                      onChange={(e) => setIt10b({ ...it10b, nonAgriPropertyDescription: e.target.value })}
                      placeholder="বিবরণ (ঠিকানা ও আয়তন)"
                      className="w-full px-2 py-1 rounded bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400"
                    />
                  </div>

                  {/* Agricultural Land */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">২. কৃষি সম্পত্তি (জমি)</span>
                      <input
                        type="number"
                        value={it10b.agriPropertyCost || ''}
                        onChange={(e) => setIt10b({ ...it10b, agriPropertyCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                      />
                    </div>
                  </div>

                  {/* Financial Assets */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-slate-200 font-bold block">৩. আর্থিক পরিসম্পদ (Financial Assets)</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">ক্যাশ ও ব্যাংক ব্যালেন্স:</span>
                        <input
                          type="number"
                          value={it10b.bankAndCashBalances || ''}
                          onChange={(e) => setIt10b({ ...it10b, bankAndCashBalances: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">এফডিআর ও ডিপিএস ব্যালেন্স:</span>
                        <input
                          type="number"
                          value={(it10b.fixedDepositsFdr + it10b.dpsBalance) || ''}
                          onChange={(e) => setIt10b({ ...it10b, fixedDepositsFdr: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">শেয়ারবাজার বিনিয়োগ (ক্রয়মূল্য):</span>
                        <input
                          type="number"
                          value={it10b.sharesListedCost || ''}
                          onChange={(e) => setIt10b({ ...it10b, sharesListedCost: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">সঞ্চয়পত্র ক্রয়মূল্য:</span>
                        <input
                          type="number"
                          value={it10b.sanchayapatraCost || ''}
                          onChange={(e) => setIt10b({ ...it10b, sanchayapatraCost: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Motor Vehicle */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">৪. মোটরযান (Motor Vehicle)</span>
                      <input
                        type="number"
                        value={it10b.motorVehicleCost || ''}
                        onChange={(e) => setIt10b({ ...it10b, motorVehicleCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                      />
                    </div>
                  </div>

                  {/* Gold & Jewellery */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">৫. স্বর্ণালঙ্কার ও মূল্যবান ধাতু</span>
                      <input
                        type="number"
                        value={it10b.goldCostOrValue || ''}
                        onChange={(e) => setIt10b({ ...it10b, goldCostOrValue: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                      />
                    </div>
                  </div>

                  {/* Furniture & Electronics */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">৬. আসবাবপত্র ও ইলেকট্রনিক্স</span>
                      <input
                        type="number"
                        value={it10b.furnitureAndElectronicsCost || ''}
                        onChange={(e) => setIt10b({ ...it10b, furnitureAndElectronicsCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Part B: Liabilities & Reconciliation */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-rose-400 font-mono flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span>খ. দায়সমূহ (Liabilities / Borrowings)</span>
                  <span>{formatBDT(it10bResult.totalLiabilities)}</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-200">১. ব্যাংক ঋণ ও গৃহনির্মাণ ঋণ</span>
                    <input
                      type="number"
                      value={it10b.bankMortgagesAndLoans || ''}
                      onChange={(e) => setIt10b({ ...it10b, bankMortgagesAndLoans: parseFloat(e.target.value) || 0 })}
                      className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-200">২. ব্যক্তিগত ধারদেনা (Unsecured Loans)</span>
                    <input
                      type="number"
                      value={it10b.personalDebtsAndPayables || ''}
                      onChange={(e) => setIt10b({ ...it10b, personalDebtsAndPayables: parseFloat(e.target.value) || 0 })}
                      className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                    />
                  </div>
                </div>

                {/* Net Wealth Box */}
                <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-sky-400 font-mono">
                      গ. বছর শেষে নিট সম্পদ (Net Wealth)
                    </div>
                    <div className="text-[11px] text-slate-400">মোট পরিসম্পদ বাদ মোট দায় (ক - খ)</div>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {formatBDT(it10bResult.netWealth)}
                  </div>
                </div>

                {/* Part C: Accretion & Family Living Expenses */}
                <div className="text-xs font-bold text-amber-400 font-mono flex items-center justify-between border-b border-slate-800/80 pt-2 pb-2">
                  <span>ঘ. সম্পদ বৃদ্ধি ও পারিবারিক জীবনযাপন ব্যয় (Reconciliation)</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-200">পূর্ববর্তী বছরের নিট সম্পদ</span>
                      <div className="text-[10px] text-slate-400">গত বছরের শেষ দিনে থাকা সম্পদ</div>
                    </div>
                    <input
                      type="number"
                      value={it10b.previousYearNetWealth || ''}
                      onChange={(e) => setIt10b({ ...it10b, previousYearNetWealth: parseFloat(e.target.value) || 0 })}
                      className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-200">পারিবারিক জীবনযাপন ব্যয় (IT-10BB)</span>
                      <div className="text-[10px] text-slate-400">বাৎসরিক খাবার, বাড়িভাড়া, শিক্ষা ও চিকিৎসা খরচ</div>
                    </div>
                    <input
                      type="number"
                      value={it10b.annualFamilyLivingExpenses || ''}
                      onChange={(e) => setIt10b({ ...it10b, annualFamilyLivingExpenses: parseFloat(e.target.value) || 0 })}
                      className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right"
                    />
                  </div>

                  {/* Accretion summary */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>চলতি বছরে সম্পদ বৃদ্ধি (Accretion):</span>
                      <span className="font-bold text-white">{formatBDT(it10bResult.netAccretionInWealth)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>মোট ব্যয় ও বিনিয়োগ তহবিল (Outflow):</span>
                      <span className="font-bold text-white">{formatBDT(it10bResult.totalOutflow)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>প্রদর্শিত আয়ের উৎস (Inflow):</span>
                      <span className="font-bold text-emerald-400">{formatBDT(it10bResult.totalInflowReconciled)}</span>
                    </div>
                  </div>

                  {/* Reconciliation feedback */}
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      it10bResult.isReconciled
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {it10bResult.isReconciled ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>আইটি-১০বি আয়ের উৎস ও সম্পদ বৃদ্ধির সম্পূর্ণ সামঞ্জস্য রয়েছে (Reconciled)!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span>জাতীয় রাজস্ব বোর্ড (NBR) আয়কর রিটার্ন সারাংশ</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  কর বছর {profile.assessmentYear} | ই-রিটার্ন (etaxnbr.gov.bd) দাখিলের জন্য প্রস্তুত ফরম্যাট
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>প্রিন্ট / PDF সংরক্ষণ</span>
                </button>

                <a
                  href="https://etaxnbr.gov.bd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>NBR e-Return Portal</span>
                </a>
              </div>
            </div>

            {/* Print-friendly Return Document Preview */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-6 text-slate-200">
              {/* Header Slip */}
              <div className="text-center space-y-1 border-b border-slate-800 pb-4">
                <div className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                  Government of the People's Republic of Bangladesh
                </div>
                <div className="text-sm font-bold text-white">National Board of Revenue (NBR)</div>
                <div className="text-xs text-slate-400">
                  Acknowledgement & Income Tax Return Summary (কর নির্ধারণ ও প্রাপ্তিস্বীকার)
                </div>
              </div>

              {/* Taxpayer Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border-b border-slate-800 pb-4">
                <div>
                  <span className="text-slate-400 block text-[10px]">করদাতার নাম:</span>
                  <span className="font-bold text-white">{profile.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ই-টিআইএন (e-TIN):</span>
                  <span className="font-bold text-white">{profile.tin}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">কর নির্ধারণী বছর:</span>
                  <span className="font-bold text-emerald-400">{profile.assessmentYear}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">আয় বর্ষ:</span>
                  <span className="font-bold text-white">{profile.incomeYear}</span>
                </div>
              </div>

              {/* Comprehensive Statement Table */}
              <div className="space-y-3 font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2">ক্রমিক</th>
                      <th className="py-2">আয় ও করের বিবরণী</th>
                      <th className="py-2 text-right">টাকার পরিমাণ (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2 text-slate-500">১</td>
                      <td className="py-2">বেতন খাতে করযোগ্য আয় (ধারা ৩৩)</td>
                      <td className="py-2 text-right font-bold text-white">
                        {formatBDT(Math.max(0, income.salaryGross - taxResult.statutoryExemptions.salaryExemption))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">২</td>
                      <td className="py-2">ভাড়া খাতে করযোগ্য আয় (ধারা ৩৫)</td>
                      <td className="py-2 text-right font-bold text-white">
                        {formatBDT(Math.max(0, income.rentalIncomeGross - taxResult.statutoryExemptions.rentalRepairAllowance - income.rentalMunicipalTax))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">৩</td>
                      <td className="py-2">কৃষি খাতে করযোগ্য আয়</td>
                      <td className="py-2 text-right font-bold text-white">
                        {formatBDT(Math.max(0, income.agricultureGross - taxResult.statutoryExemptions.agriProductionCost))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">৪</td>
                      <td className="py-2">ব্যবসা, শেয়ারবাজার মূলধনী লাভ ও ব্যাংক মুনাফা</td>
                      <td className="py-2 text-right font-bold text-white">
                        {formatBDT(
                          income.businessNetProfit +
                            income.capitalGainsListedShares +
                            income.bankInterestGross +
                            income.sanchayapatraProfitGross +
                            income.cashDividendsGross
                        )}
                      </td>
                    </tr>
                    <tr className="bg-slate-900/50 font-bold text-white">
                      <td className="py-2.5 text-emerald-400">৫</td>
                      <td className="py-2.5">মোট করযোগ্য আয় (Total Taxable Income)</td>
                      <td className="py-2.5 text-right text-emerald-400">
                        {formatBDT(taxResult.netTaxableIncome)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">৬</td>
                      <td className="py-2">গ্রস কর দায় (স্ল্যাব অনুযায়ী)</td>
                      <td className="py-2 text-right text-white">
                        {formatBDT(taxResult.grossTaxLiability)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">৭</td>
                      <td className="py-2 text-emerald-400">(-) বিনিয়োগ কর রেয়াত (Tax Rebate)</td>
                      <td className="py-2 text-right text-emerald-400">
                        - {formatBDT(taxResult.rebate.rebateAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">৮</td>
                      <td className="py-2">নিট সম্পদ সারচার্জ (যদি থাকে)</td>
                      <td className="py-2 text-right text-white">
                        {formatBDT(taxResult.surcharge.amount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">৯</td>
                      <td className="py-2 text-sky-400">(-) উৎসে কর ও অগ্রিম কর ক্রেডিট (AIT/TDS)</td>
                      <td className="py-2 text-right text-sky-400">
                        - {formatBDT(taxResult.advanceTaxCredits.totalCredits)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-950/40 text-emerald-300 font-extrabold text-sm">
                      <td className="py-3 text-emerald-400">১০</td>
                      <td className="py-3">রিটার্নের সাথে প্রদেয় কর (Net Tax Payable)</td>
                      <td className="py-3 text-right">
                        {taxResult.netTaxPayableOrRefund > 0
                          ? formatBDT(taxResult.netTaxPayableOrRefund)
                          : '৳ ০ (করমুক্ত)'}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-slate-800">
                      <td className="py-2 text-slate-500">১১</td>
                      <td className="py-2">বছর শেষে মোট নিট সম্পদ (IT-10B Net Wealth)</td>
                      <td className="py-2 text-right font-bold text-sky-400">
                        {formatBDT(it10bResult.netWealth)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Verification & Signoff */}
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-mono">
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
