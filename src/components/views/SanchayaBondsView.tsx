import React, { useState, useMemo, useEffect } from 'react';
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
  DEFAULT_SANCHAYA_BONDS,
  calculatePeriodicPayout,
  generateUpcomingSchedule,
  calculatePreMatureEncashment,
} from '../../lib/sanchaya-bond-engine';
import {
  Landmark,
  Plus,
  Calendar,
  Percent,
  Clock,
  ArrowRight,
  AlertTriangle,
  X,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Info,
  CalendarClock,
  FileText,
  Calculator,
  ExternalLink,
  ChevronRight,
  Building2,
  RefreshCw,
  Coins,
  Layers,
  HelpCircle,
  Trash2,
  Lock,
} from 'lucide-react';

const STORAGE_KEY = 'wealthfolio_sanchaya_bonds_v1';

export const SanchayaBondsView: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { accounts, postTransaction } = useLedger();

  // Primary list state with localStorage persistence
  const [bonds, setBonds] = useState<SanchayaBondItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load sanchaya bonds from storage', e);
    }
    return DEFAULT_SANCHAYA_BONDS;
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
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [principalAmount, setPrincipalAmount] = useState('500000');
  const [customRate, setCustomRate] = useState('11.52');
  const [customTenure, setCustomTenure] = useState('5');
  const [customFrequency, setCustomFrequency] = useState<PayoutFrequency>('monthly');
  const [taxRate, setTaxRate] = useState('10');
  const [linkedBankAccountId, setLinkedBankAccountId] = useState(
    accounts.find((a) => a.accountType === 'bank')?.id || ''
  );
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync form when preset changes
  const handlePresetSelect = (schemeType: SanchayaSchemeType) => {
    setSelectedPresetType(schemeType);
    const preset = SCHEME_PRESETS.find((p) => p.schemeType === schemeType);
    if (preset) {
      setCustomTitle(preset.nameBn);
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
      setFormError('অনুগ্রহ করে একটি সঠিক মূলধন পরিমাণ লিখুন।');
      return;
    }
    if (!certificateNumber.trim()) {
      setFormError('সার্টিফিকেট বা ইস্যু নম্বর আবশ্যক।');
      return;
    }

    const preset = SCHEME_PRESETS.find((p) => p.schemeType === selectedPresetType);
    const category = preset ? preset.category : 'sanchayapatra';

    // Calculate maturity date
    const pDate = new Date(purchaseDate);
    pDate.setFullYear(pDate.getFullYear() + parsedTenure);
    const maturityDate = pDate.toISOString().split('T')[0];

    const newBond: SanchayaBondItem = {
      id: `sb-${Date.now()}`,
      userId: 'user-default',
      category,
      schemeType: selectedPresetType,
      title: customTitle || (preset ? preset.nameBn : 'সঞ্চয়পত্র'),
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
    setActionFeedback('নতুন সঞ্চয়পত্র / বন্ড সফলভাবে পোর্টফোলিওতে যুক্ত করা হয়েছে!');
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
        note: `মুনাফা প্রাপ্তি: ${item.title} (${item.certificateNumber})`,
        lines: [
          {
            lineType: 'account',
            accountId: targetAccountId,
            amount: schedule.netProfit,
            memo: `সঞ্চয়পত্র/বন্ড কুপন আয়। নিট: ${formatBDT(schedule.netProfit)}, AIT কর্তন: ${formatBDT(schedule.taxDeducted)}`,
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
    setActionFeedback(`মুনাফা সফলভাবে ব্যাংক লেজারে পোস্ট করা হয়েছে! (নিট: ${formatBDT(schedule.netProfit)})`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Early Encashment / Break
  const handleConfirmEncashment = () => {
    if (!encashModalItem) return;

    const encashCalc = calculatePreMatureEncashment(encashModalItem, new Date().toISOString().split('T')[0]);
    const targetAccountId = encashModalItem.linkedBankAccountId || accounts.find((a) => a.accountType === 'bank')?.id;

    if (targetAccountId) {
      postTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        note: `মেয়াদপূর্ব সঞ্চয়পত্র ভাঙ্গানো: ${encashModalItem.title} (${encashModalItem.certificateNumber})`,
        lines: [
          {
            lineType: 'account',
            accountId: targetAccountId,
            amount: encashCalc.netPayableAtCounter,
            memo: `মূলধন ফেরত: ${formatBDT(encashModalItem.principalAmount)}, অতিরিক্ত মুনাফা কর্তন: ${formatBDT(encashCalc.excessProfitToDeduct)}`,
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
              encashedDate: new Date().toISOString().split('T')[0],
              encashedAmount: encashCalc.netPayableAtCounter,
            }
          : b
      )
    );

    setEncashModalItem(null);
    setActionFeedback(`সঞ্চয়পত্র সফলভাবে নগদায়ন করা হয়েছে! প্রাপ্ত নিট অর্থ: ${formatBDT(encashCalc.netPayableAtCounter)}`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleDeleteBond = (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই সঞ্চয়পত্র/বন্ড রেকর্ডটি মুছে ফেলতে চান?')) {
      setBonds((prev) => prev.filter((b) => b.id !== id));
      setActionFeedback('রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।');
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
                ১০০% সার্বভৌম নিরাপত্তা
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>সঞ্চয়পত্র, ট্রেজারি বন্ড ও সুকুক ট্র্যাকার</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              পরিবার সঞ্চয়পত্র, ৩-মাস অন্তর মুনাফা, পেনশনার সঞ্চয়পত্র, বাংলাদেশ ব্যাংক ট্রেজারি বন্ড (BGTB) ও সরকারি ইসলামিক সুকুকের মাসিক ক্যাশফ্লো এবং এনবিআর কর রেয়াত ব্যবস্থাপনা।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন সঞ্চয়পত্র / বন্ড যুক্ত করুন</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('tax')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                title="View Sanchayapatra in NBR Tax Planner"
              >
                <FileText className="h-4 w-4 text-emerald-400" />
                <span>আয়কর রিটার্নে দেখুন</span>
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
            <div className="text-[11px] font-mono text-slate-400">মোট বিনিয়োগকৃত মূলধন</div>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">
              {formatBDT(totalPrincipal)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>সক্রিয় সার্টিফিকেট:</span>
              <span className="font-semibold text-emerald-400">{activeBonds.length} টি</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-slate-400">বাৎসরিক নিট প্যাসিভ ইনকাম</div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">
              {formatBDT(annualMetrics.netAnnual)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              গ্রস মুনাফা: <span className="text-slate-300 font-semibold">{formatBDT(annualMetrics.grossAnnual)}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-slate-400">গড় মাসিক ক্যাশফ্লো (EFT)</div>
            <div className="text-base sm:text-lg font-bold text-sky-400 mt-0.5">
              {formatBDT(annualMetrics.monthlyNetAverage)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              সরাসরি ব্যাংক অ্যাকাউন্টে জমা
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/40 p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900/80">
            <div className="text-[11px] font-mono text-emerald-300">গড় মুনাফার হার (Yield)</div>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">
              {annualMetrics.weightedYield.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              সার্বভৌম জামানতযুক্ত আয়
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('holdings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'holdings'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>১. সার্টিফিকেট ও বন্ড পোর্টফোলিও ({activeBonds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'calendar'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          <span>২. আগামী ১২ মাসের ক্যাশফ্লো ক্যালেন্ডার</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'calculator'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>৩. রিটার্ন ও মেয়াদপূর্ব ভাঙ্গানোর ক্যালকুলেটর</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'rules'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Info className="h-3.5 w-3.5" />
          <span>৪. সরকারি বিনিয়োগ সীমা ও ট্যাক্স নিয়মাবলী</span>
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
              <span className="text-xs text-slate-400">ক্যাটাগরি ফিল্টার:</span>
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded ${
                    categoryFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  সব ({activeBonds.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('sanchayapatra')}
                  className={`px-2.5 py-1 rounded ${
                    categoryFilter === 'sanchayapatra' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  সঞ্চয়পত্র
                </button>
                <button
                  onClick={() => setCategoryFilter('treasury_bond')}
                  className={`px-2.5 py-1 rounded ${
                    categoryFilter === 'treasury_bond' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ট্রেজারি বন্ড (BGTB)
                </button>
                <button
                  onClick={() => setCategoryFilter('islamic_sukuk')}
                  className={`px-2.5 py-1 rounded ${
                    categoryFilter === 'islamic_sukuk' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ইসলামিক সুকুক
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              মোট ক্যাশফ্লো: <span className="text-emerald-400 font-bold">{formatBDT(annualMetrics.netAnnual)} / বছর</span>
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
                  ? 'মাসিক'
                  : bond.payoutFrequency === 'quarterly'
                  ? 'প্রতি ৩ মাসে'
                  : bond.payoutFrequency === 'semi_annually'
                  ? 'প্রতি ৬ মাসে'
                  : 'মেয়াদান্তে';

              const isMatured = new Date(bond.maturityDate) <= new Date();

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
                            {bond.category === 'sanchayapatra'
                              ? 'সঞ্চয়পত্র'
                              : bond.category === 'treasury_bond'
                              ? 'ট্রেজারি বন্ড'
                              : 'ইসলামিক সুকুক'}
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
                          {bond.interestRate}% বার্ষিক
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Box */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">প্রতি কিস্তিতে নিট জমা:</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {formatBDT(payout.netPerPeriod)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">({freqLabel})</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">উৎসে কর (AIT):</span>
                        <span className="text-sm font-bold text-slate-300">
                          {bond.taxDeductionRate}%
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          কর্তন: {formatBDT(payout.taxPerPeriod)}
                        </span>
                      </div>
                    </div>

                    {/* Dates & Nominee */}
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          ক্রয়: {bond.purchaseDate}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          মেয়াদপূর্তি: {bond.maturityDate} ({bond.tenureYears} বছর)
                        </span>
                      </div>

                      {bond.nomineeName && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[11px]">
                          <span>মনোনীত ব্যক্তি (Nominee):</span>
                          <span className="text-slate-300 font-semibold">{bond.nomineeName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setEncashModalItem(bond)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors flex items-center gap-1"
                    >
                      <span>ভাঙ্গানোর হিসাব</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteBond(bond.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete bond"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => {
                          const sched = generateUpcomingSchedule(bond, 1);
                          if (sched.length > 0) {
                            setCollectModalItem({ item: bond, schedule: sched[0] });
                          } else {
                            alert('বর্তমান মেয়াদে কোনো বকেয়া মুনাফা নেই।');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1"
                      >
                        <Coins className="h-3.5 w-3.5" />
                        <span>মুনাফা এন্ট্রি</span>
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
              <p className="text-sm font-semibold text-slate-300">কোনো সক্রিয় সঞ্চয়পত্র বা বন্ড পাওয়া যায়নি</p>
              <p className="text-xs text-slate-500 mt-1">উপরে "নতুন সঞ্চয়পত্র / বন্ড যুক্ত করুন" বাটনে ক্লিক করে যোগ করুন।</p>
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
                <span>আসন্ন মুনাফা জমা শিডিউল (Next 12 Months Cashflow)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                সরাসরি ব্যাংক অ্যাকাউন্টে ইএফটি মারফত জমা হওয়া প্রত্যাশিত মাসিক ও ত্রৈমাসিক মুনাফা।
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              মোট ১২ মাসের কিস্তি: {masterSchedule.length} টি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3">স্কিম ও সার্টিফিকেট</th>
                  <th className="py-2.5 px-3">ক্যাটাগরি</th>
                  <th className="py-2.5 px-3 text-right">গ্রস মুনাফা</th>
                  <th className="py-2.5 px-3 text-right">উৎসে কর (AIT)</th>
                  <th className="py-2.5 px-3 text-right">নিট প্রদেয় অর্থ</th>
                  <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
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
                          {sched.category}
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
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-[10px] font-bold transition-all"
                        >
                          জমা হয়েছে
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                <span>সঞ্চয়পত্র ও বন্ড রিটার্ন সিমুলেটর</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">সর্বশেষ সরকারি রেট</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">স্কিম নির্বাচন করুন</label>
                <select
                  value={selectedPresetType}
                  onChange={(e) => handlePresetSelect(e.target.value as SanchayaSchemeType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500"
                >
                  {SCHEME_PRESETS.map((p) => (
                    <option key={p.schemeType} value={p.schemeType}>
                      {p.nameBn} ({p.defaultRate}% • {p.defaultTenureYears} বছর)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">বিনিয়োগের পরিমাণ (টাকা)</label>
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
                      <span>বাৎসরিক মুনাফা হার:</span>
                      <span className="font-bold text-white">{rate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>প্রদেয় উৎসে কর (AIT):</span>
                      <span className="font-bold text-amber-400">{tax}% (ধারা ১২৪)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>প্রতি কিস্তিতে গ্রস মুনাফা:</span>
                      <span className="font-bold text-white">{formatBDT(out.grossPerPeriod)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>কিস্তিতে কর কর্তন:</span>
                      <span className="font-bold text-rose-400">- {formatBDT(out.taxPerPeriod)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                      <span className="text-emerald-300 font-bold">প্রতি কিস্তিতে নিট জমা (EFT):</span>
                      <span className="text-lg font-extrabold text-emerald-400">{formatBDT(out.netPerPeriod)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>বাৎসরিক নিট মোট প্যাসিভ আয়:</span>
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
                <span>মেয়াদপূর্ব ভাঙ্গানোর নিয়মাবলী (Encashment Rules)</span>
              </h3>
              <span className="text-[10px] text-amber-400 font-mono">জাতীয় সঞ্চয় অধিদপ্তর</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              সঞ্চয়পত্রের মেয়াদ পূর্ণ হওয়ার আগে ভাঙ্গালে বছরভিত্তিক রিডিউসড মুনাফা প্রযোজ্য হয়। ইতিপূর্বে অতিরিক্ত উত্তোলিত মুনাফা মূলধন থেকে সমন্বয় করা হয়:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-amber-400 font-bold block mb-1">১ম বছর পূর্ণ হওয়ার আগে ভাঙ্গালে:</span>
                <span className="text-slate-300 text-[11px]">কোনো মুনাফা প্রাপ্য হবে না। ইতোপূর্বে যে মুনাফা তোলা হয়েছে তা সরাসরি মূলধন থেকে কেটে রাখা হবে।</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-emerald-400 font-bold block mb-1">পরিবার সঞ্চয়পত্র (৫ বছর মেয়াদী):</span>
                <ul className="text-slate-300 text-[11px] space-y-1 list-disc pl-4">
                  <li>১ম বছর শেষ হলে: ৯.৫০% হারে</li>
                  <li>২য় বছর শেষ হলে: ১০.০০% হারে</li>
                  <li>৩য় বছর শেষ হলে: ১০.৫০% হারে</li>
                  <li>৪র্থ বছর শেষ হলে: ১১.০০% হারে</li>
                  <li>পূর্ণ ৫ বছর মেয়াদে: ১১.৫২% হারে</li>
                </ul>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-sky-400 font-bold block mb-1">৩-মাস অন্তর মুনাফাভিত্তিক সঞ্চয়পত্র (৩ বছর):</span>
                <ul className="text-slate-300 text-[11px] space-y-1 list-disc pl-4">
                  <li>১ম বছর শেষ হলে: ১০.০০% হারে</li>
                  <li>২য় বছর শেষ হলে: ১০.৫০% হারে</li>
                  <li>পূর্ণ ৩ বছর মেয়াদে: ১১.০৪% হারে</li>
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
              <span>জাতীয় সঞ্চয়পত্র ও সরকারি বন্ডের অফিশিয়াল নির্দেশিকা ও এনবিআর কর আইন</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              বাংলাদেশ ব্যাংক, জাতীয় সঞ্চয় অধিদপ্তর ও অর্থ মন্ত্রণালয়ের সর্বশেষ প্রজ্ঞাপন অনুযায়ী বিনিয়োগের বিধিমালা।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Investment Limits */}
            <div className="space-y-3">
              <h4 className="font-bold text-emerald-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Landmark className="h-4 w-4" />
                <span>বিনিয়োগের সর্বোচ্চ সীমা (Investment Ceiling)</span>
              </h4>
              <div className="space-y-2 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">একক ও যৌথ সর্বোচ্চ সীমা:</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    • একজন বিনিয়োগকারী একক নামে সঞ্চয়পত্রে সর্বোচ্চ ৳ ৫০,০০,০০০ (পঞ্চাশ লাখ) পর্যন্ত বিনিয়োগ করতে পারেন।<br />
                    • যৌথ নামে সর্বোচ্চ ৳ ১,০০,০০,০০০ (এক কোটি) পর্যন্ত বিনিয়োগ করা যায়।
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">পরিবার সঞ্চয়পত্র যোগ্যতা:</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    ১৮ বছর বা তদূর্ধ্ব বয়সের যেকোনো বাংলাদেশী নারী, শারীরিক প্রতিবন্ধী (পুরুষ/নারী) অথবা ৬৫ বছর ও তদূর্ধ্ব বয়সের যেকোনো নাগরিক।
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">ট্রেজারি বন্ড (BGTB) সীমা:</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    বাংলাদেশ ব্যাংক ট্রেজারি বন্ডে কোনো ব্যক্তি বিনিয়োগকারীর জন্য কোনো সর্বোচ্চ সীমা নেই। ন্যূনতম ১ লাখ টাকা থেকে শুরু করে যেকোনো অংক বিনিয়োগ সম্ভব।
                  </div>
                </div>
              </div>
            </div>

            {/* Income Tax & IT-10B Rules */}
            <div className="space-y-3">
              <h4 className="font-bold text-sky-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>এনবিআর আয়কর রেয়াত ও সম্পদ বিবরণী (IT-10B)</span>
              </h4>
              <div className="space-y-2 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">১৫% বিনিয়োগ কর রেয়াত (ধারা ৭৮):</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    আয়কর আইন ২০২৩-এর ষষ্ঠ তফসিল অংশ ৩ অনুযায়ী, বাৎসরিক সর্বোচ্চ ৳ ৫,০০,০০০ (পাঁচ লাখ) টাকার সঞ্চয়পত্র ক্রয় বিনিয়োগ কর রেয়াতের জন্য অনুমোদিত।
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">উৎস করের হার (AIT):</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    • মোট বিনিয়োগ ৫ লাখ টাকা পর্যন্ত হলে মুনাফার ওপর ৫% উৎসে কর কর্তন হয়।<br />
                    • বিনিয়োগ ৫ লাখ টাকার বেশি হলে পূর্ণ ১০% উৎসে কর কর্তন হয়।<br />
                    • ওয়েজ আর্নার্স ডেভেলপমেন্ট বন্ডের মুনাফা সম্পূর্ণ উৎসে কর মুক্ত (০%)।
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white">আইটি-১০বি সম্পদ বিবরণীতে প্রদর্শন:</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    আপনার ক্রয়কৃত সঞ্চয়পত্র ও সরকারি বন্ডের মূলধন আইটি-১০বি ফর্মে "Financial Assets / আর্থিক পরিসম্পদ" কলামে প্রদর্শন করা বাধ্যতামূলক।
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
                <h3 className="text-base font-bold text-white">নতুন সঞ্চয়পত্র / সরকারি বন্ড যুক্ত করুন</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
                  স্কিমের ধরন নির্বাচন করুন
                </label>
                <select
                  value={selectedPresetType}
                  onChange={(e) => handlePresetSelect(e.target.value as SanchayaSchemeType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-emerald-500 outline-none"
                >
                  {SCHEME_PRESETS.map((p) => (
                    <option key={p.schemeType} value={p.schemeType}>
                      {p.nameBn} ({p.defaultRate}% বার্ষিক • {p.defaultTenureYears} বছর)
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Certificate Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">শিরোনাম / স্কিম নাম</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="পরিবার সঞ্চয়পত্র"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">সার্টিফিকেট / ইস্যু নম্বর</label>
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
                  <label className="text-xs text-slate-400 block mb-1">ইস্যুকারী ব্যাংক / ব্যুরো</label>
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
                  <label className="text-xs text-slate-400 block mb-1">শাখা / অফিস</label>
                  <input
                    type="text"
                    value={issueOfficeBranch}
                    onChange={(e) => setIssueOfficeBranch(e.target.value)}
                    placeholder="মৌলভীবাজার শাখা / মতিঝিল"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              {/* Amount, Rate, Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">মূলধন পরিমাণ (টাকা)</label>
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
                  <label className="text-xs text-slate-400 block mb-1">বার্ষিক মুনাফার হার (%)</label>
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
                  <label className="text-xs text-slate-400 block mb-1">মেয়াদ (বছর)</label>
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
                  <label className="text-xs text-slate-400 block mb-1">ক্রয়ের তারিখ</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">মুনাফা প্রদানের ফ্রিকোয়েন্সি</label>
                  <select
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value as PayoutFrequency)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="monthly">মাসিক (Monthly EFT)</option>
                    <option value="quarterly">ত্রৈমাসিক (Quarterly)</option>
                    <option value="semi_annually">ষান্মাসিক (Semi-Annually)</option>
                    <option value="at_maturity">মেয়াদান্তে এককালীন (At Maturity)</option>
                  </select>
                </div>
              </div>

              {/* Linked Account & Nominee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">মুনাফা জমার ব্যাংক অ্যাকাউন্ট</label>
                  <select
                    value={linkedBankAccountId}
                    onChange={(e) => setLinkedBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="">নির্বাচন করুন (ঐচ্ছিক)</option>
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
                  <label className="text-xs text-slate-400 block mb-1">মনোনীত ব্যক্তি (Nominee)</label>
                  <input
                    type="text"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    placeholder="নাম ও সম্পর্ক"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  সংরক্ষণ করুন
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
                <span>মেয়াদপূর্ব ভাঙ্গানোর হিসাব (Pre-Mature Encashment)</span>
              </div>
              <button
                onClick={() => setEncashModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const encashCalc = calculatePreMatureEncashment(
                encashModalItem,
                new Date().toISOString().split('T')[0]
              );

              return (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="text-white font-bold">{encashModalItem.title}</div>
                    <div className="text-slate-400 text-[11px]">
                      সার্টিফিকেট: #{encashModalItem.certificateNumber} • মূলধন: {formatBDT(encashModalItem.principalAmount)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>হিসাব বিবরণী ({encashCalc.completedYears} বছর পূর্ণ):</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{encashCalc.notes}</p>
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>বিনিয়োগকৃত দিন:</span>
                      <span className="font-bold text-white">{encashCalc.investedDays} দিন</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>পুনর্নির্ধারিত মুনাফা হার:</span>
                      <span className="font-bold text-emerald-400">{encashCalc.applicableRatePct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>প্রাপ্য মোট অর্জিত মুনাফা:</span>
                      <span className="font-bold text-white">{formatBDT(encashCalc.totalProfitPayable)}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-400">
                      <span>অতিরিক্ত মুনাফা কর্তন:</span>
                      <span className="font-bold">- {formatBDT(encashCalc.excessProfitToDeduct)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                      <span className="font-bold text-white">কাউন্টারে ফেরতযোগ্য নিট অর্থ:</span>
                      <span className="font-extrabold text-emerald-400 text-base">
                        {formatBDT(encashCalc.netPayableAtCounter)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEncashModalItem(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmEncashment}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
                    >
                      এখনই নগদায়ন নিশ্চিত করুন
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
                <span>মুনাফা প্রাপ্তি রেকর্ড (Collect Profit)</span>
              </div>
              <button
                onClick={() => setCollectModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-bold text-white">{collectModalItem.item.title}</div>
                <div className="text-[11px] text-slate-400">
                  তারিখ: {collectModalItem.schedule.paymentDate}
                </div>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="flex items-center justify-between">
                  <span>গ্রস মুনাফা:</span>
                  <span className="font-bold text-white">{formatBDT(collectModalItem.schedule.grossProfit)}</span>
                </div>
                <div className="flex items-center justify-between text-rose-400">
                  <span>উৎসে কর কর্তন (AIT):</span>
                  <span className="font-bold">- {formatBDT(collectModalItem.schedule.taxDeducted)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                  <span className="font-bold text-emerald-300">ব্যাংক অ্যাকাউন্টে নিট জমা:</span>
                  <span className="font-extrabold text-emerald-400 text-base">
                    {formatBDT(collectModalItem.schedule.netProfit)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans pt-1">
                নিশ্চিত করলে এই নিট অর্থ সরাসরি আপনার লিংক করা ব্যাংক অ্যাকাউন্টের ব্যালেন্সে ক্রেডিট হিসেবে যুক্ত হবে।
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCollectModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCollectProfit}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  লেজারে জমা করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
