import { todayLocalISO, toLocalISO } from '../../lib/date-utils';
import { newId } from '../../lib/id-utils';
import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../lib/language-context';
import { useLedger } from '../../lib/ledger-context';
import {
  BondCategory,
  SanchayaSchemeType,
  PayoutFrequency,
  SanchayaBondItem,
  UpcomingPaymentSchedule,
} from '../../types/sanchaya-bond';
import {
  SCHEME_PRESETS,
  calculatePeriodicPayout,
  generateUpcomingSchedule,
  calculatePreMatureEncashment,
} from '../../lib/sanchaya-bond-engine';
import {
  Landmark,
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  X,
  ShieldCheck,
  CheckCircle2,
  Info,
  CalendarClock,
  FileText,
  Calculator,
  Building2,
  Coins,
  Layers,
  Trash2,
} from 'lucide-react';

const STORAGE_KEY = 'wealthfolio_sanchaya_bonds_v1';
const DEMO_BOND_IDS = new Set(['sb-001', 'sb-002', 'sb-003', 'sb-004']);

export const SanchayaBondsView: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { isBn } = useLanguage();
  const { accounts, postTransaction } = useLedger();

  // Primary list state with localStorage persistence, filtering out all testing/demo data
  const [bonds, setBonds] = useState<SanchayaBondItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Remove all legacy testing / demo data
          const cleaned = parsed.filter(
            (b) =>
              !DEMO_BOND_IDS.has(b.id) &&
              !b.title?.includes('— সোনালী ব্যাংক') &&
              !b.title?.includes('— জাতীয় সঞ্চয় ব্যুরো') &&
              !b.certificateNumber?.includes('PS-8921094') &&
              !b.certificateNumber?.includes('TM-441829') &&
              !b.certificateNumber?.includes('BGTB-10Y-2034') &&
              !b.certificateNumber?.includes('BB-SUKUK-IJ')
          );
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Failed to load sanchaya bonds from storage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bonds));
    } catch (e) {
      console.warn('Failed saving sanchaya bonds', e);
    }
  }, [bonds]);

  // View state
  const [activeTab, setActiveTab] = useState<'holdings' | 'calendar' | 'calculator' | 'rules'>('holdings');
  const [categoryFilter, setCategoryFilter] = useState<'all' | BondCategory>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [encashModalItem, setEncashModalItem] = useState<SanchayaBondItem | null>(null);
  const [collectModalItem, setCollectModalItem] = useState<{
    item: SanchayaBondItem;
    schedule: UpcomingPaymentSchedule;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // New Certificate Form State
  const [selectedPresetType, setSelectedPresetType] = useState<SanchayaSchemeType>('poribar');
  const [customTitle, setCustomTitle] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issuer, setIssuer] = useState('Sonali Bank PLC');
  const [issueOfficeBranch, setIssueOfficeBranch] = useState('Motijheel Corporate Branch');
  const [purchaseDate, setPurchaseDate] = useState(() => todayLocalISO());
  const [principalAmount, setPrincipalAmount] = useState('500000');
  const [customRate, setCustomRate] = useState('11.52');
  const [customTenure, setCustomTenure] = useState('5');
  const [customFrequency, setCustomFrequency] = useState<PayoutFrequency>('monthly');
  const [taxRate, setTaxRate] = useState('10');
  const [linkedBankAccountId, setLinkedBankAccountId] = useState(
    accounts.find((a) => a.accountType === 'bank')?.id || ''
  );
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync form title and details when preset changes
  const handlePresetSelect = (schemeType: SanchayaSchemeType) => {
    setSelectedPresetType(schemeType);
    const preset = SCHEME_PRESETS.find((p) => p.schemeType === schemeType);
    if (preset) {
      setCustomTitle(isBn ? preset.nameBn : preset.nameEn);
      setCustomRate(preset.defaultRate.toString());
      setCustomTenure(preset.defaultTenureYears.toString());
      setCustomFrequency(preset.payoutFrequency);
      setTaxRate(preset.taxDeductionRate.toString());
    }
  };

  // -----------------------------------------------------------------
  // KPIs
  // -----------------------------------------------------------------
  const activeBonds = useMemo(() => bonds.filter((b) => b.status === 'active'), [bonds]);

  const filteredBonds = useMemo(() => {
    if (categoryFilter === 'all') return activeBonds;
    return activeBonds.filter((b) => b.category === categoryFilter);
  }, [activeBonds, categoryFilter]);

  const totalPrincipal = useMemo(
    () => activeBonds.reduce((sum, b) => sum + b.principalAmount, 0),
    [activeBonds]
  );

  const annualMetrics = useMemo(() => {
    let grossSum = 0;
    let netSum = 0;

    activeBonds.forEach((b) => {
      const calc = calculatePeriodicPayout(b.principalAmount, b.interestRate, b.payoutFrequency, b.taxDeductionRate);
      grossSum += calc.annualGross;
      netSum += calc.annualNet;
    });

    const weightedYield = totalPrincipal > 0 ? (grossSum / totalPrincipal) * 100 : 0;
    const monthlyNetAverage = netSum / 12;

    return {
      grossAnnual: grossSum,
      netAnnual: netSum,
      weightedYield,
      monthlyNetAverage,
    };
  }, [activeBonds, totalPrincipal]);

  // Upcoming 12-Month Schedule across all active bonds
  const masterSchedule = useMemo(() => {
    const list: UpcomingPaymentSchedule[] = [];
    activeBonds.forEach((b) => {
      const sched = generateUpcomingSchedule(b, 12);
      list.push(...sched);
    });
    // Sort chronologically
    return list.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }, [activeBonds]);

  // Formatter helper
  const formatBDT = (amount: number) => `৳ ${Math.round(amount).toLocaleString('en-IN')}`;

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedPrincipal = parseFloat(principalAmount) || 0;
    const parsedRate = parseFloat(customRate) || 0;
    const parsedTenure = parseInt(customTenure) || 5;
    const parsedTax = parseFloat(taxRate) || 10;

    if (parsedPrincipal <= 0) {
      setFormError(isBn ? 'অনুগ্রহ করে একটি সঠিক মূলধন পরিমাণ লিখুন।' : 'Please enter a valid principal amount.');
      return;
    }
    if (parsedRate <= 0) {
      setFormError(isBn ? 'অনুগ্রহ করে একটি সঠিক মুনাফার হার লিখুন।' : 'Please enter a valid profit rate.');
      return;
    }
    if (!certificateNumber.trim()) {
      setFormError(isBn ? 'অনুগ্রহ করে সার্টিফিকেট অথবা ইস্যু নম্বর লিখুন।' : 'Please enter the certificate or issue number.');
      return;
    }

    const preset = SCHEME_PRESETS.find((p) => p.schemeType === selectedPresetType);
    let category: BondCategory = 'sanchayapatra';
    if (selectedPresetType.startsWith('treasury_bond')) category = 'treasury_bond';
    else if (selectedPresetType === 'govt_ijarah_sukuk') category = 'islamic_sukuk';

    // Calculate maturity date
    const pDate = new Date(purchaseDate);
    pDate.setFullYear(pDate.getFullYear() + parsedTenure);
    const maturityDate = toLocalISO(pDate);

    const fallbackTitle = preset ? (isBn ? preset.nameBn : preset.nameEn) : (isBn ? 'সঞ্চয়পত্র' : 'Savings Certificate');

    const newBond: SanchayaBondItem = {
      id: newId('sb'),
      userId: 'user-active',
      category,
      schemeType: selectedPresetType,
      title: customTitle.trim() || fallbackTitle,
      certificateNumber: certificateNumber.trim(),
      issuer: issuer.trim(),
      issueOfficeBranch: issueOfficeBranch.trim(),
      purchaseDate,
      tenureYears: parsedTenure,
      maturityDate,
      principalAmount: parsedPrincipal,
      interestRate: parsedRate,
      payoutFrequency: customFrequency,
      taxDeductionRate: parsedTax,
      linkedBankAccountId: linkedBankAccountId || undefined,
      isTaxRebateEligible: true,
      nomineeName: nomineeName.trim() || undefined,
      nomineeRelation: nomineeRelation.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'active',
      totalProfitReceivedToDate: 0,
      createdAt: new Date().toISOString(),
    };

    setBonds((prev) => [newBond, ...prev]);
    setIsAddModalOpen(false);

    // Reset form
    setCertificateNumber('');
    setPrincipalAmount('500000');
    setNotes('');
    setActionFeedback(
      isBn
        ? 'নতুন সঞ্চয়পত্র / বন্ড সফলভাবে পোর্টফোলিওতে যুক্ত করা হয়েছে!'
        : 'New Sanchayapatra / Bond added to portfolio successfully!'
    );
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Collect coupon profit and post to ledger bank account
  const handleConfirmCollectProfit = () => {
    if (!collectModalItem) return;

    const { item, schedule } = collectModalItem;
    const targetAccountId = schedule.linkedBankAccountId || item.linkedBankAccountId || accounts.find((a) => a.accountType === 'bank')?.id;

    if (targetAccountId) {
      postTransaction({
        date: schedule.paymentDate,
        type: 'income',
        note: isBn
          ? `মুনাফা প্রাপ্তি: ${item.title} (${item.certificateNumber})`
          : `Profit Received: ${item.title} (${item.certificateNumber})`,
        lines: [
          {
            lineType: 'account',
            accountId: targetAccountId,
            amount: schedule.netProfit,
            memo: isBn
              ? `সঞ্চয়পত্র/বন্ড কুপন আয়। নিট: ${formatBDT(schedule.netProfit)}, AIT কর্তন: ${formatBDT(schedule.taxDeducted)}`
              : `Sanchayapatra/Bond coupon income. Net: ${formatBDT(schedule.netProfit)}, AIT deducted: ${formatBDT(schedule.taxDeducted)}`,
          },
        ],
      });
    }

    // Update total profit received in item
    setBonds((prev) =>
      prev.map((b) =>
        b.id === item.id
          ? { ...b, totalProfitReceivedToDate: (b.totalProfitReceivedToDate || 0) + schedule.netProfit }
          : b
      )
    );

    setCollectModalItem(null);
    setActionFeedback(
      isBn
        ? `মুনাফা সফলভাবে ব্যাংক লেজারে পোস্ট করা হয়েছে! (নিট: ${formatBDT(schedule.netProfit)})`
        : `Profit posted to bank ledger successfully! (Net: ${formatBDT(schedule.netProfit)})`
    );
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Early Encashment / Break
  const handleConfirmEncashment = () => {
    if (!encashModalItem) return;

    const encashCalc = calculatePreMatureEncashment(
      encashModalItem,
      todayLocalISO(),
      isBn
    );
    const targetAccountId = encashModalItem.linkedBankAccountId || accounts.find((a) => a.accountType === 'bank')?.id;

    if (targetAccountId) {
      postTransaction({
        date: todayLocalISO(),
        type: 'income',
        note: isBn
          ? `মেয়াদপূর্ব সঞ্চয়পত্র ভাঙ্গানো: ${encashModalItem.title} (${encashModalItem.certificateNumber})`
          : `Pre-mature Encashment: ${encashModalItem.title} (${encashModalItem.certificateNumber})`,
        lines: [
          {
            lineType: 'account',
            accountId: targetAccountId,
            amount: encashCalc.netPayableAtCounter,
            memo: isBn
              ? `মূলধন ফেরত: ${formatBDT(encashModalItem.principalAmount)}, অতিরিক্ত মুনাফা কর্তন: ${formatBDT(encashCalc.excessProfitToDeduct)}`
              : `Principal refunded: ${formatBDT(encashModalItem.principalAmount)}, Excess profit deducted: ${formatBDT(encashCalc.excessProfitToDeduct)}`,
          },
        ],
      });
    }

    setBonds((prev) =>
      prev.map((b) =>
        b.id === encashModalItem.id
          ? {
              ...b,
              status: 'encashed',
              encashedDate: todayLocalISO(),
              encashedAmount: encashCalc.netPayableAtCounter,
            }
          : b
      )
    );

    setEncashModalItem(null);
    setActionFeedback(
      isBn
        ? `সঞ্চয়পত্র সফলভাবে নগদায়ন করা হয়েছে! প্রাপ্ত নিট অর্থ: ${formatBDT(encashCalc.netPayableAtCounter)}`
        : `Bond encashed successfully! Net amount received: ${formatBDT(encashCalc.netPayableAtCounter)}`
    );
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleDeleteBond = (id: string) => {
    const confirmMessage = isBn
      ? 'আপনি কি নিশ্চিত যে এই সঞ্চয়পত্র/বন্ড রেকর্ডটি মুছে ফেলতে চান?'
      : 'Are you sure you want to delete this savings certificate / bond record?';

    if (window.confirm(confirmMessage)) {
      setBonds((prev) => prev.filter((b) => b.id !== id));
      setActionFeedback(isBn ? 'রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।' : 'Record deleted successfully.');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Top Banner Card */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Landmark className="h-48 w-48 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1.5 font-mono">
              <ShieldCheck className="h-4 w-4" />
              <span>National Savings Directorate & Bangladesh Bank Securities</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                {isBn ? '১০০% সার্বভৌম নিরাপত্তা' : '100% Sovereign Security'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>{isBn ? 'সঞ্চয়পত্র, ট্রেজারি বন্ড ও সুকুক ট্র্যাকার' : 'Sanchayapatra, Treasury Bonds & Sukuk Tracker'}</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {isBn
                ? 'পরিবার সঞ্চয়পত্র, ৩-মাস অন্তর মুনাফা, পেনশনার সঞ্চয়পত্র, বাংলাদেশ ব্যাংক ট্রেজারি বন্ড (BGTB) ও সরকারি ইসলামিক সুকুকের মাসিক ক্যাশফ্লো এবং এনবিআর কর রেয়াত ব্যবস্থাপনা।'
                : 'Track monthly cash flows, maturity schedules, AIT deductions, and NBR tax rebates for Poribar, 3-Month, Pensioner, Bangladesh Bank Treasury Bonds (BGTB), and Govt Islamic Sukuk.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                const preset = SCHEME_PRESETS.find((p) => p.schemeType === selectedPresetType);
                if (preset) {
                  setCustomTitle(isBn ? preset.nameBn : preset.nameEn);
                }
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isBn ? 'নতুন সঞ্চয়পত্র / বন্ড যুক্ত করুন' : 'Add Sanchayapatra / Bond'}</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('tax')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title={isBn ? 'আয়কর রিটার্ন প্ল্যানারে দেখুন' : 'View in NBR Tax Planner'}
              >
                <FileText className="h-4 w-4 text-emerald-400" />
                <span>{isBn ? 'আয়কর রিটার্নে দেখুন' : 'View in Tax Return'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Action notification toast */}
        {actionFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* High-level KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-slate-400">
              {isBn ? 'মোট বিনিয়োগকৃত মূলধন' : 'Total Invested Principal'}
            </div>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">
              {formatBDT(totalPrincipal)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{isBn ? 'সক্রিয় সার্টিফিকেট:' : 'Active Certificates:'}</span>
              <span className="font-semibold text-emerald-400">
                {activeBonds.length} {isBn ? 'টি' : ''}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-slate-400">
              {isBn ? 'বাৎসরিক নিট প্যাসিভ ইনকাম' : 'Annual Net Passive Income'}
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">
              {formatBDT(annualMetrics.netAnnual)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isBn ? 'গ্রস মুনাফা: ' : 'Gross Profit: '}
              <span className="text-slate-300 font-semibold">{formatBDT(annualMetrics.grossAnnual)}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-slate-400">
              {isBn ? 'গড় মাসিক ক্যাশফ্লো (EFT)' : 'Avg Monthly Cash Flow (EFT)'}
            </div>
            <div className="text-base sm:text-lg font-bold text-sky-400 mt-0.5">
              {formatBDT(annualMetrics.monthlyNetAverage)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isBn ? 'সরাসরি ব্যাংক অ্যাকাউন্টে জমা' : 'Direct bank credit via EFT'}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/40 p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900/80">
            <div className="text-[11px] font-mono text-emerald-300">
              {isBn ? 'গড় মুনাফার হার (Yield)' : 'Weighted Avg Yield'}
            </div>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">
              {annualMetrics.weightedYield.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isBn ? 'সার্বভৌম জামানতযুক্ত আয়' : 'Sovereign guaranteed yield'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('holdings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'holdings'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>
            {isBn
              ? `১. সার্টিফিকেট ও বন্ড পোর্টফোলিও (${activeBonds.length})`
              : `1. Certificates & Bonds Portfolio (${activeBonds.length})`}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          <span>{isBn ? '২. আগামী ১২ মাসের ক্যাশফ্লো ক্যালেন্ডার' : '2. Next 12-Month Cashflow Calendar'}</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'calculator'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>{isBn ? '৩. রিটার্ন ও মেয়াদপূর্ব ভাঙ্গানোর ক্যালকুলেটর' : '3. Return & Encashment Calculator'}</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Info className="h-3.5 w-3.5" />
          <span>{isBn ? '৪. সরকারি বিনিয়োগ সীমা ও ট্যাক্স নিয়মাবলী' : '4. Govt Investment Limits & Tax Rules'}</span>
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* TAB 1: ACTIVE HOLDINGS */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'holdings' && (
        <div className="space-y-4">
          {/* Sub Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{isBn ? 'ক্যাটাগরি ফিল্টার:' : 'Category Filter:'}</span>
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoryFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isBn ? `সব (${activeBonds.length})` : `All (${activeBonds.length})`}
                </button>
                <button
                  onClick={() => setCategoryFilter('sanchayapatra')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoryFilter === 'sanchayapatra' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isBn ? 'সঞ্চয়পত্র' : 'Sanchayapatra'}
                </button>
                <button
                  onClick={() => setCategoryFilter('treasury_bond')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoryFilter === 'treasury_bond' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isBn ? 'ট্রেজারি বন্ড (BGTB)' : 'Treasury Bonds (BGTB)'}
                </button>
                <button
                  onClick={() => setCategoryFilter('islamic_sukuk')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoryFilter === 'islamic_sukuk' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isBn ? 'ইসলামিক সুকুক' : 'Islamic Sukuk'}
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              {isBn ? 'মোট ক্যাশফ্লো: ' : 'Total Cash Flow: '}
              <span className="text-emerald-400 font-bold">
                {formatBDT(annualMetrics.netAnnual)} / {isBn ? 'বছর' : 'year'}
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBonds.map((bond) => {
              const payout = calculatePeriodicPayout(
                bond.principalAmount,
                bond.interestRate,
                bond.payoutFrequency,
                bond.taxDeductionRate
              );

              const freqLabel =
                bond.payoutFrequency === 'monthly'
                  ? (isBn ? 'মাসিক' : 'Monthly')
                  : bond.payoutFrequency === 'quarterly'
                  ? (isBn ? 'প্রতি ৩ মাসে' : 'Quarterly')
                  : bond.payoutFrequency === 'semi_annually'
                  ? (isBn ? 'প্রতি ৬ মাসে' : 'Semi-Annually')
                  : (isBn ? 'মেয়াদান্তে' : 'At Maturity');

              const categoryBadge =
                bond.category === 'sanchayapatra'
                  ? (isBn ? 'সঞ্চয়পত্র' : 'Sanchayapatra')
                  : bond.category === 'treasury_bond'
                  ? (isBn ? 'ট্রেজারি বন্ড' : 'Treasury Bond')
                  : (isBn ? 'ইসলামিক সুকুক' : 'Islamic Sukuk');

              return (
                <div
                  key={bond.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              bond.category === 'sanchayapatra'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : bond.category === 'treasury_bond'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {categoryBadge}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">#{bond.certificateNumber}</span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1">{bond.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-500" />
                          <span>{bond.issuer}</span>
                          {bond.issueOfficeBranch && <span>• {bond.issueOfficeBranch}</span>}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-extrabold text-white font-mono">
                          {formatBDT(bond.principalAmount)}
                        </div>
                        <div className="text-xs font-semibold text-emerald-400">
                          {bond.interestRate}% {isBn ? 'বার্ষিক' : 'p.a.'}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Box */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {isBn ? 'প্রতি কিস্তিতে নিট জমা:' : 'Net Payout per Period:'}
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          {formatBDT(payout.netPerPeriod)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">({freqLabel})</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {isBn ? 'উৎসে কর (AIT):' : 'Source Tax (AIT):'}
                        </span>
                        <span className="text-sm font-bold text-slate-300">
                          {bond.taxDeductionRate}%
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {isBn ? 'কর্তন: ' : 'Deducted: '}{formatBDT(payout.taxPerPeriod)}
                        </span>
                      </div>
                    </div>

                    {/* Dates & Nominee */}
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {isBn ? 'ক্রয়: ' : 'Purchased: '}{bond.purchaseDate}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          {isBn ? 'মেয়াদপূর্তি: ' : 'Maturity: '}{bond.maturityDate} ({bond.tenureYears} {isBn ? 'বছর' : 'years'})
                        </span>
                      </div>

                      {bond.nomineeName && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[11px]">
                          <span>{isBn ? 'মনোনীত ব্যক্তি (Nominee):' : 'Nominee:'}</span>
                          <span className="text-slate-300 font-semibold">{bond.nomineeName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setEncashModalItem(bond)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isBn ? 'ভাঙ্গানোর হিসাব' : 'Encashment Calc'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteBond(bond.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={isBn ? 'সঞ্চয়পত্র রেকর্ড মুছুন' : 'Delete bond record'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => {
                          const sched = generateUpcomingSchedule(bond, 1);
                          if (sched.length > 0) {
                            setCollectModalItem({ item: bond, schedule: sched[0] });
                          } else {
                            alert(isBn ? 'বর্তমান মেয়াদে কোনো বকেয়া মুনাফা নেই।' : 'No pending coupon payout for current period.');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Coins className="h-3.5 w-3.5" />
                        <span>{isBn ? 'মুনাফা এন্ট্রি' : 'Collect Profit'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredBonds.length === 0 && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
              <Landmark className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">
                {isBn ? 'কোনো সক্রিয় সঞ্চয়পত্র বা বন্ড পাওয়া যায়নি' : 'No active savings certificates or bonds found'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isBn
                  ? 'উপরে "নতুন সঞ্চয়পত্র / বন্ড যুক্ত করুন" বাটনে ক্লিক করে যোগ করুন।'
                  : 'Click the "Add Sanchayapatra / Bond" button above to add your investments.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 2: 12-MONTH CASHFLOW CALENDAR */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'calendar' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-emerald-400" />
                <span>{isBn ? 'আসন্ন মুনাফা জমা শিডিউল (Next 12 Months Cashflow)' : 'Upcoming Profit Schedule (Next 12 Months)'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBn
                  ? 'সরাসরি ব্যাংক অ্যাকাউন্টে ইএফটি মারফত জমা হওয়া প্রত্যাশিত মাসিক ও ত্রৈমাসিক মুনাফা।'
                  : 'Expected monthly, quarterly, and semi-annual profits credited directly via BEFTN/EFT.'}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {isBn ? `মোট ১২ মাসের কিস্তি: ${masterSchedule.length} টি` : `Total 12-Month Installments: ${masterSchedule.length}`}
            </span>
          </div>

          {masterSchedule.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              {isBn ? 'কোনো আসন্ন কিস্তি বা কুপন শিডিউল নেই।' : 'No upcoming coupon or profit installments found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">{isBn ? 'তারিখ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isBn ? 'স্কিম ও সার্টিফিকেট' : 'Scheme & Certificate'}</th>
                    <th className="py-2.5 px-3">{isBn ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="py-2.5 px-3 text-right">{isBn ? 'গ্রস মুনাফা' : 'Gross Profit'}</th>
                    <th className="py-2.5 px-3 text-right">{isBn ? 'উৎসে কর (AIT)' : 'Source Tax (AIT)'}</th>
                    <th className="py-2.5 px-3 text-right">{isBn ? 'নিট প্রদেয় অর্থ' : 'Net Payout'}</th>
                    <th className="py-2.5 px-3 text-center">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {masterSchedule.map((sched) => {
                    const parentBond = activeBonds.find((b) => b.id === sched.investmentId);
                    return (
                      <tr key={sched.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                          <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800">
                            {sched.paymentDate}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-sans font-bold text-white">{sched.schemeTitle}</div>
                          <div className="text-[10px] text-slate-400 font-mono">#{parentBond?.certificateNumber}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              sched.category === 'sanchayapatra'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : sched.category === 'treasury_bond'
                                ? 'bg-sky-500/10 text-sky-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {sched.category === 'sanchayapatra'
                              ? (isBn ? 'সঞ্চয়পত্র' : 'Sanchayapatra')
                              : sched.category === 'treasury_bond'
                              ? (isBn ? 'ট্রেজারি বন্ড' : 'Treasury Bond')
                              : (isBn ? 'ইসলামিক সুকুক' : 'Sukuk')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300">
                          {formatBDT(sched.grossProfit)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-400">
                          - {formatBDT(sched.taxDeducted)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400 text-sm">
                          {formatBDT(sched.netProfit)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              if (parentBond) {
                                setCollectModalItem({ item: parentBond, schedule: sched });
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            {isBn ? 'জমা হয়েছে' : 'Mark Collected'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 3: CALCULATOR & PRE-MATURE ENCASHMENT */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Scheme Comparison Calculator */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-400" />
                <span>{isBn ? 'সঞ্চয়পত্র ও বন্ড রিটার্ন সিমুলেটর' : 'Savings Certificate & Bond Return Simulator'}</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">
                {isBn ? 'সর্বশেষ সরকারি রেট' : 'Latest Official Govt Rates'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  {isBn ? 'স্কিম নির্বাচন করুন' : 'Select Scheme'}
                </label>
                <select
                  value={selectedPresetType}
                  onChange={(e) => handlePresetSelect(e.target.value as SanchayaSchemeType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500"
                >
                  {SCHEME_PRESETS.map((p) => (
                    <option key={p.schemeType} value={p.schemeType}>
                      {isBn ? p.nameBn : p.nameEn} ({p.defaultRate}% • {p.defaultTenureYears} {isBn ? 'বছর' : 'yrs'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  {isBn ? 'বিনিয়োগের পরিমাণ (টাকা)' : 'Investment Amount (BDT)'}
                </label>
                <input
                  type="number"
                  step="10000"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono outline-none focus:border-emerald-500"
                />
              </div>

              {/* Calculator Output */}
              {(() => {
                const p = SCHEME_PRESETS.find((s) => s.schemeType === selectedPresetType);
                const rate = p ? p.defaultRate : 11.52;
                const freq = p ? p.payoutFrequency : 'monthly';
                const tax = parseFloat(principalAmount) > 500000 ? 10 : 5;
                const out = calculatePeriodicPayout(parseFloat(principalAmount) || 0, rate, freq, tax);

                return (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs mt-4">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>{isBn ? 'বাৎসরিক মুনাফা হার:' : 'Annual Profit Rate:'}</span>
                      <span className="font-bold text-white">{rate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>{isBn ? 'প্রদেয় উৎসে কর (AIT):' : 'Applicable Source Tax (AIT):'}</span>
                      <span className="font-bold text-amber-400">
                        {tax}% ({isBn ? 'ধারা ১২৪' : 'Section 124'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>{isBn ? 'প্রতি কিস্তিতে গ্রস মুনাফা:' : 'Gross Profit per Period:'}</span>
                      <span className="font-bold text-white">{formatBDT(out.grossPerPeriod)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>{isBn ? 'কিস্তিতে কর কর্তন:' : 'Tax Deducted per Period:'}</span>
                      <span className="font-bold text-rose-400">- {formatBDT(out.taxPerPeriod)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                      <span className="text-emerald-300 font-bold">
                        {isBn ? 'প্রতি কিস্তিতে নিট জমা (EFT):' : 'Net Deposit per Period (EFT):'}
                      </span>
                      <span className="text-lg font-extrabold text-emerald-400">{formatBDT(out.netPerPeriod)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{isBn ? 'বাৎসরিক নিট মোট প্যাসিভ আয়:' : 'Total Annual Net Passive Income:'}</span>
                      <span className="font-bold text-white">{formatBDT(out.annualNet)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right: Pre-Mature Encashment Rules & Guide */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>{isBn ? 'মেয়াদপূর্ব ভাঙ্গানোর নিয়মাবলী (Encashment Rules)' : 'Pre-Mature Encashment Rules & Penalties'}</span>
              </h3>
              <span className="text-[10px] text-amber-400 font-mono">
                {isBn ? 'জাতীয় সঞ্চয় অধিদপ্তর' : 'National Savings Directorate'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {isBn
                ? 'সঞ্চয়পত্রের মেয়াদ পূর্ণ হওয়ার আগে ভাঙ্গালে বছরভিত্তিক রিডিউসড মুনাফা প্রযোজ্য হয়। ইতিপূর্বে অতিরিক্ত উত্তোলিত মুনাফা মূলধন থেকে সমন্বয় করা হয়:'
                : 'Encashing savings certificates before full maturity applies a lower tenure-based rate. Previously drawn excess profit is adjusted from principal refund:'}
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-amber-400 font-bold block mb-1">
                  {isBn ? '১ম বছর পূর্ণ হওয়ার আগে ভাঙ্গালে:' : 'Encashment before completing 1st year:'}
                </span>
                <span className="text-slate-300 text-[11px]">
                  {isBn
                    ? 'কোনো মুনাফা প্রাপ্য হবে না। ইতোপূর্বে যে মুনাফা তোলা হয়েছে তা সরাসরি মূলধন থেকে কেটে রাখা হবে।'
                    : 'No profit is earned. Any previously collected monthly profits will be fully deducted from the principal refund.'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-emerald-400 font-bold block mb-1">
                  {isBn ? 'পরিবার সঞ্চয়পত্র (৫ বছর মেয়াদী):' : 'Poribar Sanchayapatra (5-Year Tenure):'}
                </span>
                <ul className="text-slate-300 text-[11px] space-y-1 list-disc pl-4">
                  <li>{isBn ? '১ম বছর শেষ হলে: ৯.৫০% হারে' : 'After Year 1: 9.50% rate'}</li>
                  <li>{isBn ? '২য় বছর শেষ হলে: ১০.০০% হারে' : 'After Year 2: 10.00% rate'}</li>
                  <li>{isBn ? '৩য় বছর শেষ হলে: ১০.৫০% হারে' : 'After Year 3: 10.50% rate'}</li>
                  <li>{isBn ? '৪র্থ বছর শেষ হলে: ১১.০০% হারে' : 'After Year 4: 11.00% rate'}</li>
                  <li>{isBn ? 'পূর্ণ ৫ বছর মেয়াদে: ১১.৫২% হারে' : 'At full 5-year maturity: 11.52% rate'}</li>
                </ul>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-sky-400 font-bold block mb-1">
                  {isBn ? '৩-মাস অন্তর মুনাফাভিত্তিক সঞ্চয়পত্র (৩ বছর):' : '3-Month Profit-Bearing Sanchayapatra (3-Year):'}
                </span>
                <ul className="text-slate-300 text-[11px] space-y-1 list-disc pl-4">
                  <li>{isBn ? '১ম বছর শেষ হলে: ১০.০০% হারে' : 'After Year 1: 10.00% rate'}</li>
                  <li>{isBn ? '২য় বছর শেষ হলে: ১০.৫০% হারে' : 'After Year 2: 10.50% rate'}</li>
                  <li>{isBn ? 'পূর্ণ ৩ বছর মেয়াদে: ১১.০৪% হারে' : 'At full 3-year maturity: 11.04% rate'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 4: OFFICIAL GUIDELINES & TAX RULES */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'rules' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span>
                {isBn
                  ? 'জাতীয় সঞ্চয়পত্র ও সরকারি বন্ডের অফিশিয়াল নির্দেশিকা ও এনবিআর কর আইন'
                  : 'Official Sanchayapatra & Treasury Bonds Guidelines & NBR Tax Rules'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isBn
                ? 'বাংলাদেশ ব্যাংক, জাতীয় সঞ্চয় অধিদপ্তর ও অর্থ মন্ত্রণালয়ের সর্বশেষ প্রজ্ঞাপন অনুযায়ী বিনিয়োগের বিধিমালা।'
                : 'Regulatory investment guidelines per latest gazettes of Bangladesh Bank, National Savings Directorate & Ministry of Finance.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Investment Limits */}
            <div className="space-y-3">
              <h4 className="font-bold text-emerald-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Landmark className="h-4 w-4" />
                <span>{isBn ? 'বিনিয়োগের সর্বোচ্চ সীমা (Investment Ceiling)' : 'Investment Ceiling & Eligibility'}</span>
              </h4>
              <div className="space-y-2 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">
                    {isBn ? 'একক ও যৌথ সর্বোচ্চ সীমা:' : 'Single & Joint Investment Limits:'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isBn ? (
                      <>
                        • একজন বিনিয়োগকারী একক নামে সঞ্চয়পত্রে সর্বোচ্চ ৳ ৫০,০০,০০০ (পঞ্চাশ লাখ) পর্যন্ত বিনিয়োগ করতে পারেন।<br />
                        • যৌথ নামে সর্বোচ্চ ৳ ১,০০,০০,০০০ (এক কোটি) পর্যন্ত বিনিয়োগ করা যায়।
                      </>
                    ) : (
                      <>
                        • An individual can invest up to BDT 50,00,000 (Fifty Lakh) in single name across certificates.<br />
                        • Joint investments are allowed up to BDT 1,00,00,000 (One Crore) across eligible schemes.
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">
                    {isBn ? 'পরিবার সঞ্চয়পত্র যোগ্যতা:' : 'Poribar Sanchayapatra Eligibility:'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isBn
                      ? '১৮ বছর বা তদূর্ধ্ব বয়সের যেকোনো বাংলাদেশী নারী, শারীরিক প্রতিবন্ধী (পুরুষ/নারী) অথবা ৬৫ বছর ও তদূর্ধ্ব বয়সের যেকোনো নাগরিক।'
                      : 'Any Bangladeshi female citizen aged 18+, physically challenged citizens (male/female), or senior citizens aged 65+.'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">
                    {isBn ? 'ট্রেজারি বন্ড (BGTB) সীমা:' : 'Treasury Bond (BGTB) Limits:'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isBn
                      ? 'বাংলাদেশ ব্যাংক ট্রেজারি বন্ডে কোনো ব্যক্তি বিনিয়োগকারীর জন্য কোনো সর্বোচ্চ সীমা নেই। ন্যূনতম ১ লাখ টাকা থেকে শুরু করে যেকোনো অংক বিনিয়োগ সম্ভব।'
                      : 'No maximum ceiling for individual retail investors in Bangladesh Govt Treasury Bonds (BGTB). Minimum investment starts from BDT 1,00,000 with unlimited upper capacity.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Income Tax & IT-10B Rules */}
            <div className="space-y-3">
              <h4 className="font-bold text-sky-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>{isBn ? 'এনবিআর আয়কর রেয়াত ও সম্পদ বিবরণী (IT-10B)' : 'NBR Tax Rebate & Wealth Statement (IT-10B)'}</span>
              </h4>
              <div className="space-y-2 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">
                    {isBn ? '১৫% বিনিয়োগ কর রেয়াত (ধারা ৭৮):' : '15% Investment Tax Rebate (Section 78):'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isBn
                      ? 'আয়কর আইন ২০২৩-এর ষষ্ঠ তফসিল অংশ ৩ অনুযায়ী, বাৎসরিক সর্বোচ্চ ৳ ৫,০০,০০০ (পাঁচ লাখ) টাকার সঞ্চয়পত্র ক্রয় বিনিয়োগ কর রেয়াতের জন্য অনুমোদিত।'
                      : 'Under Income Tax Act 2023 Sixth Schedule Part 3, fresh annual purchase of savings certificates up to BDT 5,00,000 is eligible for 15% tax rebate.'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">
                    {isBn ? 'উৎস করের হার (AIT):' : 'Source Tax Rates (AIT):'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isBn ? (
                      <>
                        • মোট বিনিয়োগ ৫ লাখ টাকা পর্যন্ত হলে মুনাফার ওপর ৫% উৎসে কর কর্তন হয়।<br />
                        • বিনিয়োগ ৫ লাখ টাকার বেশি হলে পূর্ণ ১০% উৎসে কর কর্তন হয়।<br />
                        • ওয়েজ আর্নার্স ডেভেলপমেন্ট বন্ডের মুনাফা সম্পূর্ণ উৎসে কর মুক্ত (০%)।
                      </>
                    ) : (
                      <>
                        • 5% Advance Income Tax (AIT) for cumulative investment up to BDT 5 Lakh.<br />
                        • 10% AIT for cumulative investment exceeding BDT 5 Lakh.<br />
                        • 0% AIT (Tax-free) for Wage Earners Development Bond (WEDB).
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">
                    {isBn ? 'আইটি-১০বি সম্পদ বিবরণীতে প্রদর্শন:' : 'Reporting in IT-10B Wealth Statement:'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isBn
                      ? 'আপনার ক্রয়কৃত সঞ্চয়পত্র ও সরকারি বন্ডের মূলধন আইটি-১০বি ফর্মে "Financial Assets / আর্থিক পরিসম্পদ" কলামে প্রদর্শন করা বাধ্যতামূলক।'
                      : 'All savings certificates and government bonds must be declared under "Financial Assets" in the NBR IT-10B Statement of Assets and Liabilities.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* ADD NEW CERTIFICATE / BOND MODAL */}
      {/* ----------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {isBn ? 'নতুন সঞ্চয়পত্র / সরকারি বন্ড যুক্ত করুন' : 'Add New Sanchayapatra / Govt Bond'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Preset Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isBn ? 'স্কিমের ধরন নির্বাচন করুন' : 'Select Scheme Type'}
                </label>
                <select
                  value={selectedPresetType}
                  onChange={(e) => handlePresetSelect(e.target.value as SanchayaSchemeType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-emerald-500 outline-none"
                >
                  {SCHEME_PRESETS.map((p) => (
                    <option key={p.schemeType} value={p.schemeType}>
                      {isBn ? p.nameBn : p.nameEn} ({p.defaultRate}% {isBn ? 'বার্ষিক' : 'p.a.'} • {p.defaultTenureYears} {isBn ? 'বছর' : 'yrs'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Certificate Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'শিরোনাম / স্কিম নাম' : 'Title / Scheme Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={isBn ? 'পরিবার সঞ্চয়পত্র' : 'Poribar Sanchayapatra'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'সার্টিফিকেট / ইস্যু নম্বর' : 'Certificate / Issue Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    placeholder="PS-1092841"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Issuer & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'ইস্যুকারী ব্যাংক / ব্যুরো' : 'Issuer Bank / Bureau'}
                  </label>
                  <input
                    type="text"
                    required
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder="Sonali Bank PLC / Bangladesh Bank"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'শাখা / অফিস' : 'Branch / Office'}
                  </label>
                  <input
                    type="text"
                    value={issueOfficeBranch}
                    onChange={(e) => setIssueOfficeBranch(e.target.value)}
                    placeholder={isBn ? 'মৌলভীবাজার শাখা / মতিঝিল' : 'Motijheel Corporate Branch'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              {/* Amount, Rate, Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'মূলধন পরিমাণ (টাকা)' : 'Principal Amount (BDT)'}
                  </label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'বার্ষিক মুনাফার হার (%)' : 'Annual Profit Rate (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'মেয়াদ (বছর)' : 'Tenure (Years)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={customTenure}
                    onChange={(e) => setCustomTenure(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Purchase Date & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'ক্রয়ের তারিখ' : 'Purchase Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'মুনাফা প্রদানের ফ্রিকোয়েন্সি' : 'Payout Frequency'}
                  </label>
                  <select
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value as PayoutFrequency)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="monthly">{isBn ? 'মাসিক (Monthly EFT)' : 'Monthly (BEFTN/EFT)'}</option>
                    <option value="quarterly">{isBn ? 'ত্রৈমাসিক (Quarterly)' : 'Quarterly'}</option>
                    <option value="semi_annually">{isBn ? 'ষান্মাসিক (Semi-Annually)' : 'Semi-Annually'}</option>
                    <option value="at_maturity">{isBn ? 'মেয়াদান্তে এককালীন (At Maturity)' : 'At Maturity'}</option>
                  </select>
                </div>
              </div>

              {/* Linked Account & Nominee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'মুনাফা জমার ব্যাংক অ্যাকাউন্ট' : 'Linked Deposit Account'}
                  </label>
                  <select
                    value={linkedBankAccountId}
                    onChange={(e) => setLinkedBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="">{isBn ? 'নির্বাচন করুন (ঐচ্ছিক)' : 'Select Account (Optional)'}</option>
                    {accounts
                      .filter((a) => a.accountType === 'bank' || a.accountType === 'cash')
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.institutionName || 'Bank'})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isBn ? 'মনোনীত ব্যক্তি (Nominee)' : 'Nominee'}
                  </label>
                  <input
                    type="text"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    placeholder={isBn ? 'নাম ও সম্পর্ক' : 'Name & Relationship'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {isBn ? 'সংরক্ষণ করুন' : 'Save Investment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* EARLY BREAK / ENCASH MODAL */}
      {/* ----------------------------------------------------------------- */}
      {encashModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                <AlertTriangle className="h-5 w-5" />
                <span>{isBn ? 'মেয়াদপূর্ব ভাঙ্গানোর হিসাব (Pre-Mature Encashment)' : 'Pre-Mature Encashment Calculation'}</span>
              </div>
              <button
                onClick={() => setEncashModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const encashCalc = calculatePreMatureEncashment(
                encashModalItem,
                todayLocalISO(),
                isBn
              );

              return (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="text-white font-bold">{encashModalItem.title}</div>
                    <div className="text-slate-400 text-[11px]">
                      {isBn
                        ? `সার্টিফিকেট: #${encashModalItem.certificateNumber} • মূলধন: ${formatBDT(encashModalItem.principalAmount)}`
                        : `Certificate: #${encashModalItem.certificateNumber} • Principal: ${formatBDT(encashModalItem.principalAmount)}`}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>
                        {isBn
                          ? `হিসাব বিবরণী (${encashCalc.completedYears} বছর পূর্ণ):`
                          : `Statement (${encashCalc.completedYears} Years Completed):`}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{encashCalc.notes}</p>
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>{isBn ? 'বিনিয়োগকৃত দিন:' : 'Days Invested:'}</span>
                      <span className="font-bold text-white">
                        {encashCalc.investedDays} {isBn ? 'দিন' : 'days'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{isBn ? 'পুনর্নির্ধারিত মুনাফা হার:' : 'Revised Rate Applied:'}</span>
                      <span className="font-bold text-emerald-400">{encashCalc.applicableRatePct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{isBn ? 'প্রাপ্য মোট অর্জিত মুনাফা:' : 'Total Earned Profit Payable:'}</span>
                      <span className="font-bold text-white">{formatBDT(encashCalc.totalProfitPayable)}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-400">
                      <span>{isBn ? 'অতিরিক্ত মুনাফা কর্তন:' : 'Excess Profit Deducted:'}</span>
                      <span className="font-bold">- {formatBDT(encashCalc.excessProfitToDeduct)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                      <span className="font-bold text-white">{isBn ? 'কাউন্টারে ফেরতযোগ্য নিট অর্থ:' : 'Net Refund Payable at Counter:'}</span>
                      <span className="font-extrabold text-emerald-400 text-base">
                        {formatBDT(encashCalc.netPayableAtCounter)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEncashModalItem(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmEncashment}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      {isBn ? 'এখনই নগদায়ন নিশ্চিত করুন' : 'Confirm Encashment Now'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* COLLECT PROFIT MODAL */}
      {/* ----------------------------------------------------------------- */}
      {collectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                <Coins className="h-5 w-5" />
                <span>{isBn ? 'মুনাফা প্রাপ্তি রেকর্ড (Collect Profit)' : 'Record Profit Collection'}</span>
              </div>
              <button
                onClick={() => setCollectModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-bold text-white">{collectModalItem.item.title}</div>
                <div className="text-[11px] text-slate-400">
                  {isBn ? 'তারিখ: ' : 'Date: '}{collectModalItem.schedule.paymentDate}
                </div>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="flex items-center justify-between">
                  <span>{isBn ? 'গ্রস মুনাফা:' : 'Gross Profit:'}</span>
                  <span className="font-bold text-white">{formatBDT(collectModalItem.schedule.grossProfit)}</span>
                </div>
                <div className="flex items-center justify-between text-rose-400">
                  <span>{isBn ? 'উৎসে কর কর্তন (AIT):' : 'Source Tax Deducted (AIT):'}</span>
                  <span className="font-bold">- {formatBDT(collectModalItem.schedule.taxDeducted)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                  <span className="font-bold text-emerald-300">{isBn ? 'ব্যাংক অ্যাকাউন্টে নিট জমা:' : 'Net Bank Credit:'}</span>
                  <span className="font-extrabold text-emerald-400 text-base">
                    {formatBDT(collectModalItem.schedule.netProfit)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans pt-1">
                {isBn
                  ? 'নিশ্চিত করলে এই নিট অর্থ সরাসরি আপনার লিংক করা ব্যাংক অ্যাকাউন্টের ব্যালেন্সে ক্রেডিট হিসেবে যুক্ত হবে।'
                  : 'Confirming will credit this net profit directly to your linked bank account balance in the ledger.'}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCollectModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCollectProfit}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {isBn ? 'লেজারে জমা করুন' : 'Post to Ledger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
