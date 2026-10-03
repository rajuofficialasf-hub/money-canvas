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
import { Modal, Field, Input, Select, Button, ErrorBanner } from '../ui';

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
      <div className="rounded-2xl border border-edge bg-gradient-to-r from-canvas via-surface to-emerald-950/40 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Landmark className="h-48 w-48 text-accent-strong" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1.5 font-mono">
              <ShieldCheck className="h-4 w-4" />
              <span>National Savings Directorate & Bangladesh Bank Securities</span>
              <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent-strong text-[10px] border border-accent/20">
                {isBn ? '১০০% সার্বভৌম নিরাপত্তা' : '100% Sovereign Security'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight flex items-center gap-2.5">
              <span>{isBn ? 'সঞ্চয়পত্র, ট্রেজারি বন্ড ও সুকুক ট্র্যাকার' : 'Sanchayapatra, Treasury Bonds & Sukuk Tracker'}</span>
            </h1>
            <p className="text-ink-muted text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {isBn
                ? 'পরিবার সঞ্চয়পত্র, ৩-মাস অন্তর মুনাফা, পেনশনার সঞ্চয়পত্র, বাংলাদেশ ব্যাংক ট্রেজারি বন্ড (BGTB) ও সরকারি ইসলামিক সুকুকের মাসিক ক্যাশফ্লো এবং এনবিআর কর রেয়াত ব্যবস্থাপনা।'
                : 'Track monthly cash flows, maturity schedules, AIT deductions, and NBR tax rebates for Poribar, 3-Month, Pensioner, Bangladesh Bank Treasury Bonds (BGTB), and Govt Islamic Sukuk.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => {
                const preset = SCHEME_PRESETS.find((p) => p.schemeType === selectedPresetType);
                if (preset) {
                  setCustomTitle(isBn ? preset.nameBn : preset.nameEn);
                }
                setIsAddModalOpen(true);
              }}
              variant="primary"
              icon={Plus}
            >
              <span>{isBn ? 'নতুন সঞ্চয়পত্র / বন্ড যুক্ত করুন' : 'Add Sanchayapatra / Bond'}</span>
            </Button>

            {onNavigate && (
              <Button
                onClick={() => onNavigate('tax')}
                variant="secondary"
                title={isBn ? 'আয়কর রিটার্ন প্ল্যানারে দেখুন' : 'View in NBR Tax Planner'}
              >
                <FileText className="h-4 w-4 text-accent-strong" />
                <span>{isBn ? 'আয়কর রিটার্নে দেখুন' : 'View in Tax Return'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Action notification toast */}
        {actionFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-accent/10 border border-accent/30 text-accent-strong text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-accent-strong shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* High-level KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-edge/80">
          <div className="bg-surface/80 border border-edge p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-ink-muted">
              {isBn ? 'মোট বিনিয়োগকৃত মূলধন' : 'Total Invested Principal'}
            </div>
            <div className="text-base sm:text-lg font-bold text-ink mt-0.5">
              {formatBDT(totalPrincipal)}
            </div>
            <div className="text-[10px] text-ink-muted mt-1 flex items-center gap-1">
              <span>{isBn ? 'সক্রিয় সার্টিফিকেট:' : 'Active Certificates:'}</span>
              <span className="font-semibold text-accent-strong">
                {activeBonds.length} {isBn ? 'টি' : ''}
              </span>
            </div>
          </div>

          <div className="bg-surface/80 border border-edge p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-ink-muted">
              {isBn ? 'বাৎসরিক নিট প্যাসিভ ইনকাম' : 'Annual Net Passive Income'}
            </div>
            <div className="text-base sm:text-lg font-bold text-accent-strong mt-0.5">
              {formatBDT(annualMetrics.netAnnual)}
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              {isBn ? 'গ্রস মুনাফা: ' : 'Gross Profit: '}
              <span className="text-ink-soft font-semibold">{formatBDT(annualMetrics.grossAnnual)}</span>
            </div>
          </div>

          <div className="bg-surface/80 border border-edge p-3.5 rounded-xl">
            <div className="text-[11px] font-mono text-ink-muted">
              {isBn ? 'গড় মাসিক ক্যাশফ্লো (EFT)' : 'Avg Monthly Cash Flow (EFT)'}
            </div>
            <div className="text-base sm:text-lg font-bold text-sky-400 mt-0.5">
              {formatBDT(annualMetrics.monthlyNetAverage)}
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              {isBn ? 'সরাসরি ব্যাংক অ্যাকাউন্টে জমা' : 'Direct bank credit via EFT'}
            </div>
          </div>

          <div className="bg-surface/80 border border-accent/40 p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 to-surface/80">
            <div className="text-[11px] font-mono text-accent-strong">
              {isBn ? 'গড় মুনাফার হার (Yield)' : 'Weighted Avg Yield'}
            </div>
            <div className="text-base sm:text-lg font-bold text-ink mt-0.5">
              {annualMetrics.weightedYield.toFixed(2)}%
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              {isBn ? 'সার্বভৌম জামানতযুক্ত আয়' : 'Sovereign guaranteed yield'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface/90 border border-edge overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('holdings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'holdings'
              ? 'bg-accent text-accent-ink shadow-md font-bold'
              : 'text-ink-soft hover:text-ink hover:bg-raised/60'
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
              ? 'bg-accent text-accent-ink shadow-md font-bold'
              : 'text-ink-soft hover:text-ink hover:bg-raised/60'
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          <span>{isBn ? '২. আগামী ১২ মাসের ক্যাশফ্লো ক্যালেন্ডার' : '2. Next 12-Month Cashflow Calendar'}</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'calculator'
              ? 'bg-accent text-accent-ink shadow-md font-bold'
              : 'text-ink-soft hover:text-ink hover:bg-raised/60'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>{isBn ? '৩. রিটার্ন ও মেয়াদপূর্ব ভাঙ্গানোর ক্যালকুলেটর' : '3. Return & Encashment Calculator'}</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-accent text-accent-ink shadow-md font-bold'
              : 'text-ink-soft hover:text-ink hover:bg-raised/60'
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
              <span className="text-xs text-ink-muted">{isBn ? 'ক্যাটাগরি ফিল্টার:' : 'Category Filter:'}</span>
              <div className="flex items-center gap-1 bg-surface border border-edge p-1 rounded-lg text-xs">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoryFilter === 'all' ? 'bg-raised text-ink font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isBn ? `সব (${activeBonds.length})` : `All (${activeBonds.length})`}
                </button>
                <button
                  onClick={() => setCategoryFilter('sanchayapatra')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoryFilter === 'sanchayapatra' ? 'bg-accent/20 text-accent-strong font-bold border border-accent/30' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isBn ? 'সঞ্চয়পত্র' : 'Sanchayapatra'}
                </button>
                <button
                  onClick={() => setCategoryFilter('treasury_bond')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoryFilter === 'treasury_bond' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isBn ? 'ট্রেজারি বন্ড (BGTB)' : 'Treasury Bonds (BGTB)'}
                </button>
                <button
                  onClick={() => setCategoryFilter('islamic_sukuk')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoryFilter === 'islamic_sukuk' ? 'bg-warning/20 text-warning font-bold border border-warning/30' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isBn ? 'ইসলামিক সুকুক' : 'Islamic Sukuk'}
                </button>
              </div>
            </div>

            <div className="text-xs text-ink-muted font-mono">
              {isBn ? 'মোট ক্যাশফ্লো: ' : 'Total Cash Flow: '}
              <span className="text-accent-strong font-bold">
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
                  className="rounded-2xl border border-edge bg-surface/70 p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              bond.category === 'sanchayapatra'
                                ? 'bg-accent/20 text-accent-strong border border-accent/30'
                                : bond.category === 'treasury_bond'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-warning/20 text-warning border border-warning/30'
                            }`}
                          >
                            {categoryBadge}
                          </span>
                          <span className="text-xs text-ink-muted font-mono">#{bond.certificateNumber}</span>
                        </div>
                        <h3 className="text-base font-bold text-ink mt-1">{bond.title}</h3>
                        <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-ink-faint" />
                          <span>{bond.issuer}</span>
                          {bond.issueOfficeBranch && <span>• {bond.issueOfficeBranch}</span>}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-extrabold text-ink font-mono">
                          {formatBDT(bond.principalAmount)}
                        </div>
                        <div className="text-xs font-semibold text-accent-strong">
                          {bond.interestRate}% {isBn ? 'বার্ষিক' : 'p.a.'}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Box */}
                    <div className="p-3 rounded-xl bg-canvas border border-edge/80 grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-ink-muted block">
                          {isBn ? 'প্রতি কিস্তিতে নিট জমা:' : 'Net Payout per Period:'}
                        </span>
                        <span className="text-sm font-bold text-accent-strong">
                          {formatBDT(payout.netPerPeriod)}
                        </span>
                        <span className="text-[10px] text-ink-muted block mt-0.5">({freqLabel})</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-ink-muted block">
                          {isBn ? 'উৎসে কর (AIT):' : 'Source Tax (AIT):'}
                        </span>
                        <span className="text-sm font-bold text-ink-soft">
                          {bond.taxDeductionRate}%
                        </span>
                        <span className="text-[10px] text-ink-muted block mt-0.5">
                          {isBn ? 'কর্তন: ' : 'Deducted: '}{formatBDT(payout.taxPerPeriod)}
                        </span>
                      </div>
                    </div>

                    {/* Dates & Nominee */}
                    <div className="space-y-1 text-xs text-ink-muted">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-ink-faint" />
                          {isBn ? 'ক্রয়: ' : 'Purchased: '}{bond.purchaseDate}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-ink-soft">
                          <Clock className="h-3.5 w-3.5 text-ink-faint" />
                          {isBn ? 'মেয়াদপূর্তি: ' : 'Maturity: '}{bond.maturityDate} ({bond.tenureYears} {isBn ? 'বছর' : 'years'})
                        </span>
                      </div>

                      {bond.nomineeName && (
                        <div className="flex items-center justify-between pt-1 border-t border-edge/50 text-[11px]">
                          <span>{isBn ? 'মনোনীত ব্যক্তি (Nominee):' : 'Nominee:'}</span>
                          <span className="text-ink-soft font-semibold">{bond.nomineeName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-edge flex items-center justify-between gap-2">
                    <button
                      onClick={() => setEncashModalItem(bond)}
                      className="px-3 py-1.5 rounded-lg bg-warning/10 hover:bg-warning/20 text-warning text-xs font-semibold border border-warning/30 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isBn ? 'ভাঙ্গানোর হিসাব' : 'Encashment Calc'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteBond(bond.id)}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-negative hover:bg-negative/10 transition-colors cursor-pointer"
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
                        className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
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
            <div className="text-center py-12 rounded-2xl border border-dashed border-edge bg-surface/30">
              <Landmark className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink-soft">
                {isBn ? 'কোনো সক্রিয় সঞ্চয়পত্র বা বন্ড পাওয়া যায়নি' : 'No active savings certificates or bonds found'}
              </p>
              <p className="text-xs text-ink-faint mt-1">
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
        <div className="rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-edge pb-3">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-accent-strong" />
                <span>{isBn ? 'আসন্ন মুনাফা জমা শিডিউল (Next 12 Months Cashflow)' : 'Upcoming Profit Schedule (Next 12 Months)'}</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {isBn
                  ? 'সরাসরি ব্যাংক অ্যাকাউন্টে ইএফটি মারফত জমা হওয়া প্রত্যাশিত মাসিক ও ত্রৈমাসিক মুনাফা।'
                  : 'Expected monthly, quarterly, and semi-annual profits credited directly via BEFTN/EFT.'}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-accent-strong bg-accent/10 px-2.5 py-1 rounded-lg border border-accent/20">
              {isBn ? `মোট ১২ মাসের কিস্তি: ${masterSchedule.length} টি` : `Total 12-Month Installments: ${masterSchedule.length}`}
            </span>
          </div>

          {masterSchedule.length === 0 ? (
            <div className="text-center py-10 text-ink-faint text-xs">
              {isBn ? 'কোনো আসন্ন কিস্তি বা কুপন শিডিউল নেই।' : 'No upcoming coupon or profit installments found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-edge text-ink-muted uppercase text-[10px]">
                    <th className="py-2.5 px-3">{isBn ? 'তারিখ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isBn ? 'স্কিম ও সার্টিফিকেট' : 'Scheme & Certificate'}</th>
                    <th className="py-2.5 px-3">{isBn ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="py-2.5 px-3 text-right">{isBn ? 'গ্রস মুনাফা' : 'Gross Profit'}</th>
                    <th className="py-2.5 px-3 text-right">{isBn ? 'উৎসে কর (AIT)' : 'Source Tax (AIT)'}</th>
                    <th className="py-2.5 px-3 text-right">{isBn ? 'নিট প্রদেয় অর্থ' : 'Net Payout'}</th>
                    <th className="py-2.5 px-3 text-center">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/60 text-ink-soft">
                  {masterSchedule.map((sched) => {
                    const parentBond = activeBonds.find((b) => b.id === sched.investmentId);
                    return (
                      <tr key={sched.id} className="hover:bg-raised/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-ink whitespace-nowrap">
                          <span className="px-2 py-1 rounded bg-canvas border border-edge">
                            {sched.paymentDate}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-sans font-bold text-ink">{sched.schemeTitle}</div>
                          <div className="text-[10px] text-ink-muted font-mono">#{parentBond?.certificateNumber}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              sched.category === 'sanchayapatra'
                                ? 'bg-accent/10 text-accent-strong'
                                : sched.category === 'treasury_bond'
                                ? 'bg-sky-500/10 text-sky-400'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {sched.category === 'sanchayapatra'
                              ? (isBn ? 'সঞ্চয়পত্র' : 'Sanchayapatra')
                              : sched.category === 'treasury_bond'
                              ? (isBn ? 'ট্রেজারি বন্ড' : 'Treasury Bond')
                              : (isBn ? 'ইসলামিক সুকুক' : 'Sukuk')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-ink-soft">
                          {formatBDT(sched.grossProfit)}
                        </td>
                        <td className="py-3 px-3 text-right text-negative">
                          - {formatBDT(sched.taxDeducted)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-accent-strong text-sm">
                          {formatBDT(sched.netProfit)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              if (parentBond) {
                                setCollectModalItem({ item: parentBond, schedule: sched });
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-raised hover:bg-accent hover:text-accent-ink text-ink-soft text-[10px] font-bold transition-all cursor-pointer"
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
          <div className="lg:col-span-6 rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Calculator className="h-4 w-4 text-accent-strong" />
                <span>{isBn ? 'সঞ্চয়পত্র ও বন্ড রিটার্ন সিমুলেটর' : 'Savings Certificate & Bond Return Simulator'}</span>
              </h3>
              <span className="text-[10px] text-accent-strong font-mono">
                {isBn ? 'সর্বশেষ সরকারি রেট' : 'Latest Official Govt Rates'}
              </span>
            </div>

            <div className="space-y-3">
              <Field label={isBn ? 'স্কিম নির্বাচন করুন' : 'Select Scheme'}>
                <Select
                  value={selectedPresetType}
                  onChange={(e) => handlePresetSelect(e.target.value as SanchayaSchemeType)}
                >
                  {SCHEME_PRESETS.map((p) => (
                    <option key={p.schemeType} value={p.schemeType}>
                      {isBn ? p.nameBn : p.nameEn} ({p.defaultRate}% • {p.defaultTenureYears} {isBn ? 'বছর' : 'yrs'})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={isBn ? 'বিনিয়োগের পরিমাণ (টাকা)' : 'Investment Amount (BDT)'}>
                <Input
                  type="number"
                  step="any"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="font-mono"
                />
              </Field>

              {/* Calculator Output */}
              {(() => {
                const p = SCHEME_PRESETS.find((s) => s.schemeType === selectedPresetType);
                const rate = p ? p.defaultRate : 11.52;
                const freq = p ? p.payoutFrequency : 'monthly';
                const tax = parseFloat(principalAmount) > 500000 ? 10 : 5;
                const out = calculatePeriodicPayout(parseFloat(principalAmount) || 0, rate, freq, tax);

                return (
                  <div className="p-4 rounded-xl bg-canvas border border-edge space-y-3 font-mono text-xs mt-4">
                    <div className="flex items-center justify-between text-ink-soft">
                      <span>{isBn ? 'বাৎসরিক মুনাফা হার:' : 'Annual Profit Rate:'}</span>
                      <span className="font-bold text-ink">{rate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-soft">
                      <span>{isBn ? 'প্রদেয় উৎসে কর (AIT):' : 'Applicable Source Tax (AIT):'}</span>
                      <span className="font-bold text-warning">
                        {tax}% ({isBn ? 'ধারা ১২৪' : 'Section 124'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-ink-soft">
                      <span>{isBn ? 'প্রতি কিস্তিতে গ্রস মুনাফা:' : 'Gross Profit per Period:'}</span>
                      <span className="font-bold text-ink">{formatBDT(out.grossPerPeriod)}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-soft">
                      <span>{isBn ? 'কিস্তিতে কর কর্তন:' : 'Tax Deducted per Period:'}</span>
                      <span className="font-bold text-negative">- {formatBDT(out.taxPerPeriod)}</span>
                    </div>
                    <div className="pt-2 border-t border-edge flex items-center justify-between text-sm">
                      <span className="text-accent-strong font-bold">
                        {isBn ? 'প্রতি কিস্তিতে নিট জমা (EFT):' : 'Net Deposit per Period (EFT):'}
                      </span>
                      <span className="text-lg font-extrabold text-accent-strong">{formatBDT(out.netPerPeriod)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span>{isBn ? 'বাৎসরিক নিট মোট প্যাসিভ আয়:' : 'Total Annual Net Passive Income:'}</span>
                      <span className="font-bold text-ink">{formatBDT(out.annualNet)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right: Pre-Mature Encashment Rules & Guide */}
          <div className="lg:col-span-6 rounded-2xl border border-edge bg-surface/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>{isBn ? 'মেয়াদপূর্ব ভাঙ্গানোর নিয়মাবলী (Encashment Rules)' : 'Pre-Mature Encashment Rules & Penalties'}</span>
              </h3>
              <span className="text-[10px] text-warning font-mono">
                {isBn ? 'জাতীয় সঞ্চয় অধিদপ্তর' : 'National Savings Directorate'}
              </span>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              {isBn
                ? 'সঞ্চয়পত্রের মেয়াদ পূর্ণ হওয়ার আগে ভাঙ্গালে বছরভিত্তিক রিডিউসড মুনাফা প্রযোজ্য হয়। ইতিপূর্বে অতিরিক্ত উত্তোলিত মুনাফা মূলধন থেকে সমন্বয় করা হয়:'
                : 'Encashing savings certificates before full maturity applies a lower tenure-based rate. Previously drawn excess profit is adjusted from principal refund:'}
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-canvas border border-edge/80">
                <span className="text-warning font-bold block mb-1">
                  {isBn ? '১ম বছর পূর্ণ হওয়ার আগে ভাঙ্গালে:' : 'Encashment before completing 1st year:'}
                </span>
                <span className="text-ink-soft text-[11px]">
                  {isBn
                    ? 'কোনো মুনাফা প্রাপ্য হবে না। ইতোপূর্বে যে মুনাফা তোলা হয়েছে তা সরাসরি মূলধন থেকে কেটে রাখা হবে।'
                    : 'No profit is earned. Any previously collected monthly profits will be fully deducted from the principal refund.'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-canvas border border-edge/80">
                <span className="text-accent-strong font-bold block mb-1">
                  {isBn ? 'পরিবার সঞ্চয়পত্র (৫ বছর মেয়াদী):' : 'Poribar Sanchayapatra (5-Year Tenure):'}
                </span>
                <ul className="text-ink-soft text-[11px] space-y-1 list-disc pl-4">
                  <li>{isBn ? '১ম বছর শেষ হলে: ৯.৫০% হারে' : 'After Year 1: 9.50% rate'}</li>
                  <li>{isBn ? '২য় বছর শেষ হলে: ১০.০০% হারে' : 'After Year 2: 10.00% rate'}</li>
                  <li>{isBn ? '৩য় বছর শেষ হলে: ১০.৫০% হারে' : 'After Year 3: 10.50% rate'}</li>
                  <li>{isBn ? '৪র্থ বছর শেষ হলে: ১১.০০% হারে' : 'After Year 4: 11.00% rate'}</li>
                  <li>{isBn ? 'পূর্ণ ৫ বছর মেয়াদে: ১১.৫২% হারে' : 'At full 5-year maturity: 11.52% rate'}</li>
                </ul>
              </div>

              <div className="p-2.5 rounded-lg bg-canvas border border-edge/80">
                <span className="text-sky-400 font-bold block mb-1">
                  {isBn ? '৩-মাস অন্তর মুনাফাভিত্তিক সঞ্চয়পত্র (৩ বছর):' : '3-Month Profit-Bearing Sanchayapatra (3-Year):'}
                </span>
                <ul className="text-ink-soft text-[11px] space-y-1 list-disc pl-4">
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
        <div className="rounded-2xl border border-edge bg-surface/60 p-6 space-y-6">
          <div className="border-b border-edge pb-4">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent-strong" />
              <span>
                {isBn
                  ? 'জাতীয় সঞ্চয়পত্র ও সরকারি বন্ডের অফিশিয়াল নির্দেশিকা ও এনবিআর কর আইন'
                  : 'Official Sanchayapatra & Treasury Bonds Guidelines & NBR Tax Rules'}
              </span>
            </h3>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              {isBn
                ? 'বাংলাদেশ ব্যাংক, জাতীয় সঞ্চয় অধিদপ্তর ও অর্থ মন্ত্রণালয়ের সর্বশেষ প্রজ্ঞাপন অনুযায়ী বিনিয়োগের বিধিমালা।'
                : 'Regulatory investment guidelines per latest gazettes of Bangladesh Bank, National Savings Directorate & Ministry of Finance.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Investment Limits */}
            <div className="space-y-3">
              <h4 className="font-bold text-accent-strong uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Landmark className="h-4 w-4" />
                <span>{isBn ? 'বিনিয়োগের সর্বোচ্চ সীমা (Investment Ceiling)' : 'Investment Ceiling & Eligibility'}</span>
              </h4>
              <div className="space-y-2 text-ink-soft">
                <div className="p-3 rounded-xl bg-canvas border border-edge">
                  <div className="font-bold text-ink">
                    {isBn ? 'একক ও যৌথ সর্বোচ্চ সীমা:' : 'Single & Joint Investment Limits:'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
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

                <div className="p-3 rounded-xl bg-canvas border border-edge">
                  <div className="font-bold text-ink">
                    {isBn ? 'পরিবার সঞ্চয়পত্র যোগ্যতা:' : 'Poribar Sanchayapatra Eligibility:'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
                    {isBn
                      ? '১৮ বছর বা তদূর্ধ্ব বয়সের যেকোনো বাংলাদেশী নারী, শারীরিক প্রতিবন্ধী (পুরুষ/নারী) অথবা ৬৫ বছর ও তদূর্ধ্ব বয়সের যেকোনো নাগরিক।'
                      : 'Any Bangladeshi female citizen aged 18+, physically challenged citizens (male/female), or senior citizens aged 65+.'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-canvas border border-edge">
                  <div className="font-bold text-ink">
                    {isBn ? 'ট্রেজারি বন্ড (BGTB) সীমা:' : 'Treasury Bond (BGTB) Limits:'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
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
              <div className="space-y-2 text-ink-soft">
                <div className="p-3 rounded-xl bg-canvas border border-edge">
                  <div className="font-bold text-ink">
                    {isBn ? '১৫% বিনিয়োগ কর রেয়াত (ধারা ৭৮):' : '15% Investment Tax Rebate (Section 78):'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
                    {isBn
                      ? 'আয়কর আইন ২০২৩-এর ষষ্ঠ তফসিল অংশ ৩ অনুযায়ী, বাৎসরিক সর্বোচ্চ ৳ ৫,০০,০০০ (পাঁচ লাখ) টাকার সঞ্চয়পত্র ক্রয় বিনিয়োগ কর রেয়াতের জন্য অনুমোদিত।'
                      : 'Under Income Tax Act 2023 Sixth Schedule Part 3, fresh annual purchase of savings certificates up to BDT 5,00,000 is eligible for 15% tax rebate.'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-canvas border border-edge">
                  <div className="font-bold text-ink">
                    {isBn ? 'উৎস করের হার (AIT):' : 'Source Tax Rates (AIT):'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
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

                <div className="p-3 rounded-xl bg-canvas border border-edge">
                  <div className="font-bold text-ink">
                    {isBn ? 'আইটি-১০বি সম্পদ বিবরণীতে প্রদর্শন:' : 'Reporting in IT-10B Wealth Statement:'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
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
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-accent-strong" />
            <span>{isBn ? 'নতুন সঞ্চয়পত্র / সরকারি বন্ড যুক্ত করুন' : 'Add New Sanchayapatra / Govt Bond'}</span>
          </span>
        }
        maxWidth="2xl"
        className="max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}

          {/* Preset Selector */}
          <Field label={isBn ? 'স্কিমের ধরন নির্বাচন করুন' : 'Select Scheme Type'}>
            <Select
              value={selectedPresetType}
              onChange={(e) => handlePresetSelect(e.target.value as SanchayaSchemeType)}
            >
              {SCHEME_PRESETS.map((p) => (
                <option key={p.schemeType} value={p.schemeType}>
                  {isBn ? p.nameBn : p.nameEn} ({p.defaultRate}% {isBn ? 'বার্ষিক' : 'p.a.'} • {p.defaultTenureYears} {isBn ? 'বছর' : 'yrs'})
                </option>
              ))}
            </Select>
          </Field>

          {/* Title & Certificate Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={isBn ? 'শিরোনাম / স্কিম নাম' : 'Title / Scheme Name'} required>
              <Input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={isBn ? 'পরিবার সঞ্চয়পত্র' : 'Poribar Sanchayapatra'}
              />
            </Field>

            <Field label={isBn ? 'সার্টিফিকেট / ইস্যু নম্বর' : 'Certificate / Issue Number'} required>
              <Input
                type="text"
                required
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="PS-1092841"
                className="font-mono"
              />
            </Field>
          </div>

          {/* Issuer & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={isBn ? 'ইস্যুকারী ব্যাংক / ব্যুরো' : 'Issuer Bank / Bureau'} required>
              <Input
                type="text"
                required
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="Sonali Bank PLC / Bangladesh Bank"
              />
            </Field>

            <Field label={isBn ? 'শাখা / অফিস' : 'Branch / Office'}>
              <Input
                type="text"
                value={issueOfficeBranch}
                onChange={(e) => setIssueOfficeBranch(e.target.value)}
                placeholder={isBn ? 'মৌলভীবাজার শাখা / মতিঝিল' : 'Motijheel Corporate Branch'}
              />
            </Field>
          </div>

          {/* Amount, Rate, Tenure */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={isBn ? 'মূলধন পরিমাণ (টাকা)' : 'Principal Amount (BDT)'} required>
              <Input
                type="number"
                step="any"
                required
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                className="font-mono"
              />
            </Field>

            <Field label={isBn ? 'বার্ষিক মুনাফার হার (%)' : 'Annual Profit Rate (%)'} required>
              <Input
                type="number"
                step="any"
                required
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                className="font-mono"
              />
            </Field>

            <Field label={isBn ? 'মেয়াদ (বছর)' : 'Tenure (Years)'} required>
              <Input
                type="number"
                min="1"
                max="30"
                required
                value={customTenure}
                onChange={(e) => setCustomTenure(e.target.value)}
                className="font-mono"
              />
            </Field>
          </div>

          {/* Purchase Date & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={isBn ? 'ক্রয়ের তারিখ' : 'Purchase Date'} required>
              <Input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </Field>

            <Field label={isBn ? 'মুনাফা প্রদানের ফ্রিকোয়েন্সি' : 'Payout Frequency'}>
              <Select
                value={customFrequency}
                onChange={(e) => setCustomFrequency(e.target.value as PayoutFrequency)}
              >
                <option value="monthly">{isBn ? 'মাসিক (Monthly EFT)' : 'Monthly (BEFTN/EFT)'}</option>
                <option value="quarterly">{isBn ? 'ত্রৈমাসিক (Quarterly)' : 'Quarterly'}</option>
                <option value="semi_annually">{isBn ? 'ষান্মাসিক (Semi-Annually)' : 'Semi-Annually'}</option>
                <option value="at_maturity">{isBn ? 'মেয়াদান্তে এককালীন (At Maturity)' : 'At Maturity'}</option>
              </Select>
            </Field>
          </div>

          {/* Linked Account & Nominee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={isBn ? 'মুনাফা জমার ব্যাংক অ্যাকাউন্ট' : 'Linked Deposit Account'}>
              <Select
                value={linkedBankAccountId}
                onChange={(e) => setLinkedBankAccountId(e.target.value)}
              >
                <option value="">{isBn ? 'নির্বাচন করুন (ঐচ্ছিক)' : 'Select Account (Optional)'}</option>
                {accounts
                  .filter((a) => a.accountType === 'bank' || a.accountType === 'cash')
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institutionName || 'Bank'})
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label={isBn ? 'মনোনীত ব্যক্তি (Nominee)' : 'Nominee'}>
              <Input
                type="text"
                value={nomineeName}
                onChange={(e) => setNomineeName(e.target.value)}
                placeholder={isBn ? 'নাম ও সম্পর্ক' : 'Name & Relationship'}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-edge">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary">
              {isBn ? 'সংরক্ষণ করুন' : 'Save Investment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------------------- */}
      {/* EARLY BREAK / ENCASH MODAL */}
      {/* ----------------------------------------------------------------- */}
      {encashModalItem && (
        <Modal
          isOpen={!!encashModalItem}
          onClose={() => setEncashModalItem(null)}
          title={
            <span className="flex items-center gap-2 text-warning text-sm font-bold">
              <AlertTriangle className="h-5 w-5" />
              <span>{isBn ? 'মেয়াদপূর্ব ভাঙ্গানোর হিসাব (Pre-Mature Encashment)' : 'Pre-Mature Encashment Calculation'}</span>
            </span>
          }
          maxWidth="lg"
        >
          {(() => {
              const encashCalc = calculatePreMatureEncashment(
                encashModalItem,
                todayLocalISO(),
                isBn
              );

              return (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-canvas border border-edge space-y-1.5">
                    <div className="text-ink font-bold">{encashModalItem.title}</div>
                    <div className="text-ink-muted text-[11px]">
                      {isBn
                        ? `সার্টিফিকেট: #${encashModalItem.certificateNumber} • মূলধন: ${formatBDT(encashModalItem.principalAmount)}`
                        : `Certificate: #${encashModalItem.certificateNumber} • Principal: ${formatBDT(encashModalItem.principalAmount)}`}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-amber-200 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>
                        {isBn
                          ? `হিসাব বিবরণী (${encashCalc.completedYears} বছর পূর্ণ):`
                          : `Statement (${encashCalc.completedYears} Years Completed):`}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{encashCalc.notes}</p>
                  </div>

                  <div className="space-y-2 text-ink-soft">
                    <div className="flex items-center justify-between">
                      <span>{isBn ? 'বিনিয়োগকৃত দিন:' : 'Days Invested:'}</span>
                      <span className="font-bold text-ink">
                        {encashCalc.investedDays} {isBn ? 'দিন' : 'days'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{isBn ? 'পুনর্নির্ধারিত মুনাফা হার:' : 'Revised Rate Applied:'}</span>
                      <span className="font-bold text-accent-strong">{encashCalc.applicableRatePct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{isBn ? 'প্রাপ্য মোট অর্জিত মুনাফা:' : 'Total Earned Profit Payable:'}</span>
                      <span className="font-bold text-ink">{formatBDT(encashCalc.totalProfitPayable)}</span>
                    </div>
                    <div className="flex items-center justify-between text-negative">
                      <span>{isBn ? 'অতিরিক্ত মুনাফা কর্তন:' : 'Excess Profit Deducted:'}</span>
                      <span className="font-bold">- {formatBDT(encashCalc.excessProfitToDeduct)}</span>
                    </div>
                    <div className="pt-2 border-t border-edge flex items-center justify-between text-sm">
                      <span className="font-bold text-ink">{isBn ? 'কাউন্টারে ফেরতযোগ্য নিট অর্থ:' : 'Net Refund Payable at Counter:'}</span>
                      <span className="font-extrabold text-accent-strong text-base">
                        {formatBDT(encashCalc.netPayableAtCounter)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-edge">
                    <Button type="button" variant="secondary" onClick={() => setEncashModalItem(null)}>
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </Button>
                    <button
                      type="button"
                      onClick={handleConfirmEncashment}
                      className="px-4 py-2 rounded-xl bg-warning hover:bg-warning text-accent-ink text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      {isBn ? 'এখনই নগদায়ন নিশ্চিত করুন' : 'Confirm Encashment Now'}
                    </button>
                  </div>
                </div>
              );
            })()}
        </Modal>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* COLLECT PROFIT MODAL */}
      {/* ----------------------------------------------------------------- */}
      {collectModalItem && (
        <Modal
          isOpen={!!collectModalItem}
          onClose={() => setCollectModalItem(null)}
          title={
            <span className="flex items-center gap-2 text-accent-strong text-sm font-bold">
              <Coins className="h-5 w-5" />
              <span>{isBn ? 'মুনাফা প্রাপ্তি রেকর্ড (Collect Profit)' : 'Record Profit Collection'}</span>
            </span>
          }
          maxWidth="md"
        >
            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-canvas border border-edge space-y-1">
                <div className="font-bold text-ink">{collectModalItem.item.title}</div>
                <div className="text-[11px] text-ink-muted">
                  {isBn ? 'তারিখ: ' : 'Date: '}{collectModalItem.schedule.paymentDate}
                </div>
              </div>

              <div className="space-y-2 text-ink-soft">
                <div className="flex items-center justify-between">
                  <span>{isBn ? 'গ্রস মুনাফা:' : 'Gross Profit:'}</span>
                  <span className="font-bold text-ink">{formatBDT(collectModalItem.schedule.grossProfit)}</span>
                </div>
                <div className="flex items-center justify-between text-negative">
                  <span>{isBn ? 'উৎসে কর কর্তন (AIT):' : 'Source Tax Deducted (AIT):'}</span>
                  <span className="font-bold">- {formatBDT(collectModalItem.schedule.taxDeducted)}</span>
                </div>
                <div className="pt-2 border-t border-edge flex items-center justify-between text-sm">
                  <span className="font-bold text-accent-strong">{isBn ? 'ব্যাংক অ্যাকাউন্টে নিট জমা:' : 'Net Bank Credit:'}</span>
                  <span className="font-extrabold text-accent-strong text-base">
                    {formatBDT(collectModalItem.schedule.netProfit)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-ink-muted leading-relaxed font-sans pt-1">
                {isBn
                  ? 'নিশ্চিত করলে এই নিট অর্থ সরাসরি আপনার লিংক করা ব্যাংক অ্যাকাউন্টের ব্যালেন্সে ক্রেডিট হিসেবে যুক্ত হবে।'
                  : 'Confirming will credit this net profit directly to your linked bank account balance in the ledger.'}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-edge">
                <Button type="button" variant="secondary" onClick={() => setCollectModalItem(null)}>
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button type="button" variant="primary" onClick={handleConfirmCollectProfit}>
                  {isBn ? 'লেজারে জমা করুন' : 'Post to Ledger'}
                </Button>
              </div>
            </div>
        </Modal>
      )}
    </div>
  );
};
