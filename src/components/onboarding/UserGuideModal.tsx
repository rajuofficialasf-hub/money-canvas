import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../lib/language-context';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Wallet,
  PieChart,
  TrendingUp,
  CreditCard,
  HardDrive,
  FileSpreadsheet,
  Compass,
  Sparkles,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoOpened?: boolean;
}

interface GuideStep {
  id: string;
  icon: React.ElementType;
  titleEn: string;
  titleBn: string;
  badgeEn: string;
  badgeBn: string;
  summaryEn: string;
  summaryBn: string;
  pointsEn: string[];
  pointsBn: string[];
  proTipEn?: string;
  proTipBn?: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    icon: Compass,
    badgeEn: 'Getting Started',
    badgeBn: 'শুরু করার টিপস',
    titleEn: 'Welcome to Money Canvas',
    titleBn: 'মানি ক্যানভাসে আপনাকে স্বাগতম',
    summaryEn: 'Your complete personal financial operating system. Manage accounts, investments, loans, and tax statements with 100% data privacy.',
    summaryBn: 'আপনার সম্পূর্ণ ব্যক্তিগত আর্থিক অপারেটিং সিস্টেম। আয়-ব্যয়, ব্যাংক হিসাব, শেয়ার বাজার পোর্টফোলিও ও ট্যাক্স হিসাব রাখুন সম্পূর্ণ নিরাপদে।',
    pointsEn: [
      'Dashboard Overview: See your net worth, total assets, liabilities, and monthly cash flow in one screen.',
      'Double-Entry Precision: Built on institutional accounting standards for zero calculation errors.',
      '100% Offline & Private: Your data stays strictly on your device or in your personal Google Drive.',
    ],
    pointsBn: [
      'ড্যাশবোর্ড সামারি: আপনার মোট সম্পদ, দায়, নিট সম্পত্তি এবং মাসিক আয়-ব্যয়ের হিসাব একপলকে দেখুন।',
      'ডাবল-এন্ট্রি নির্ভুলতা: আন্তর্জাতিক অ্যাকাউন্ট স্ট্যান্ডার্ডে তৈরি, তাই হিসাব মেলানো সম্পূর্ণ সহজ।',
      '১০০% প্রাইভেট ও নিরাপদ: আপনার কোনো ব্যক্তিগত তথ্য আমাদের সার্ভারে সেভ হয় না।',
    ],
    proTipEn: 'Use the search bar at the top (or press Ctrl + K) anytime to jump to any page or feature instantly.',
    proTipBn: 'যেকোনো পেজে দ্রুত যেতে উপরে সার্চ বারটি ব্যবহার করুন অথবা কীবোর্ডে Ctrl + K চাপুন।',
  },
  {
    id: 'accounts',
    icon: Wallet,
    badgeEn: 'Bank & Cash Accounts',
    badgeBn: 'ব্যাংক ও ক্যাশ হিসাব',
    titleEn: '1. Managing Accounts & Deposits',
    titleBn: '১. ব্যাংক, ক্যাশ ও ডিপিএস হিসাব পরিচালনা',
    summaryEn: 'Track liquid cash, bank balances, Fixed Deposits (FDR), DPS schemes, and mobile wallets in one place.',
    summaryBn: 'আপনার হাতে থাকা নগদ ক্যাশ, ব্যাংক ব্যালেন্স, ডিপিএস, এফডিআর ও বিকাশ/নগদ ওয়ালেট যুক্ত করুন।',
    pointsEn: [
      'Cash & Bank Accounts: Add checking, savings, or bKash/Nagad wallets to monitor real-time balances.',
      'DPS & Fixed Deposits: Setup recurring monthly DPS or FDRs with auto-accrued interest tracking.',
      'Multi-Profile Support: Separate personal accounts from business or family ledgers effortlessly.',
    ],
    pointsBn: [
      'ব্যাংক ও ওয়ালেট: আপনার ব্যাংক অ্যাকাউন্ট, ক্যাশ ইন হ্যান্ড কিংবা মোবাইল ব্যাংকিং হিসাব যুক্ত করুন।',
      'ডিপিএস ও এফডিআর: ডিপিএসের মাসিক কিস্তি এবং এফডিআরের মেয়াদ ও মুনাফার হিসাব রাখুন।',
      'মাল্টি-প্রোফাইল: ব্যক্তিগত হিসাব এবং ব্যবসার হিসাব আলাদা আলাদা প্রোফাইলে পরিচালনা করুন।',
    ],
    proTipEn: 'You can transfer funds between bank accounts or wallets in one click without double entry errors.',
    proTipBn: 'এক অ্যাকাউন্ট থেকে অন্য অ্যাকাউন্টে টাকা ট্রাফান্সার করতে "Transfer" বোতাম ব্যবহার করুন।',
  },
  {
    id: 'transactions',
    icon: PieChart,
    badgeEn: 'Income, Expense & Budget',
    badgeBn: 'আয়, ব্যয় ও বাজেট',
    titleEn: '2. Income, Expense & Monthly Budgets',
    titleBn: '২. আয়-ব্যয়ের ট্র্যাকিং ও ক্যাটাগরি বাজেট',
    summaryEn: 'Categorize daily expenses, schedule recurring salary/bills, and enforce monthly budget limits to save more.',
    summaryBn: 'দৈনন্দিন খরচ ক্যাটাগরি অনুযায়ী এন্ট্রি করুন, বাজেট সেট করুন এবং প্রতি মাসে সঞ্চয় বাড়ান।',
    pointsEn: [
      'Quick Transaction Entry: Record expenses with dates, categories, accounts, and memo notes.',
      'Category Budgets: Set spending limits for groceries, rent, or dining out with visual progress bars.',
      'Recurring Schedules: Automatically generate monthly salary or subscription payment reminders.',
    ],
    pointsBn: [
      'সহজ লেনদেন এন্ট্রি: খরচ বা আয়ের পরিমাণ, তারিখ ও ক্যাটাগরি দিয়ে দ্রুত এন্ট্রি দিন।',
      'মাসিক বাজেট: বাজার খরচ, বাসা ভাড়া বা অন্যান্য খাতে মাসিক বাজেট সীমা নির্ধারণ করুন।',
      'পুনরাবৃত্তিক কিস্তি: প্রতি মাসের বেতন বা ইউটিলিটি বিলের রিমাইন্ডার শিডিউল করে রাখুন।',
    ],
    proTipEn: 'If an expense exceeds its budget limit, the system alerts you in yellow/red warnings.',
    proTipBn: 'কোনো খাতের খরচ বাজেট অতিক্রম করলে সিস্টেম আপনাকে সতর্কবাণী দেখাবে।',
  },
  {
    id: 'investments',
    icon: TrendingUp,
    badgeEn: 'DSE Stock Portfolio',
    badgeBn: 'ডিএসই শেয়ার বাজার পোর্টফোলিও',
    titleEn: '3. DSE Stock Market & Investments',
    titleBn: '৩. ঢাকা শেয়ার বাজার (DSE) ও ইনভেস্টমেন্ট',
    summaryEn: 'Manage DSE stock portfolios with Weighted Average Cost (WAC), buy/sell executions, and dividend tax credits.',
    summaryBn: 'ডিএসই শেয়ার বাজার পোর্টফোলিও পরিচালনা করুন—WAC গড় ক্রয়মূল্য, লাভ-ক্ষতি ও ডিভিডেন্ড ট্র্যাক করুন।',
    pointsEn: [
      'Live Portfolio Valuation: Real-time holdings valuation based on current DSE stock prices.',
      'WAC Calculation: Automatic calculation of Weighted Average Cost and realized capital gains.',
      'Dividends & Corporate Actions: Log cash/stock dividends and auto-calculate 10%-15% AIT credits.',
    ],
    pointsBn: [
      'পোর্টফোলিও ভ্যালুয়েশন: শেয়ারের বর্তমান বাজারমূল্য অনুযায়ী পোর্টফোলিওর মোট ভ্যালু দেখুন।',
      'WAC ক্রয়মূল্য হিসাব: প্রতি শেয়ারের এভারেজ কস্ট এবং শেয়ার বিক্রির রিয়েলাইজড ক্যাপিটাল গেইন হিসাব।',
      'ডিভিডেন্ড ও উৎস কর: নগদ ও বোনাস ডিভিডেন্ডের হিসাব এবং ১০%-১৫% এআইটি অ্যাডজাস্টমেন্ট।',
    ],
    proTipEn: 'Filter trades by ticker symbol to see buy/sell order execution history and net gains.',
    proTipBn: 'শেয়ারের নাম সিলেক্ট করে যেকোনো কোম্পানির বাই-সেল ইতিহাস ও লাভ-ক্ষতির সামারি দেখুন।',
  },
  {
    id: 'debts',
    icon: CreditCard,
    badgeEn: 'Loans & Peer Lending',
    badgeBn: 'ধার-দেনা ও ব্যাংক লোন',
    titleEn: '4. Peer Debts, Bank Loans & Zakat',
    titleBn: '৪. ধার-দেনা, ব্যাংক লোন ও যাকাত ক্যালকুলেটর',
    summaryEn: 'Keep track of money lent to friends, bank mortgages, EMI schedules, and auto-calculate annual Zakat.',
    summaryBn: 'কাউকে দেওয়া ধার, ব্যাংক লোন বা ইএমআই এর হিসাব রাখুন এবং বার্ষিক যাকাত হিসাব করুন।',
    pointsEn: [
      'Peer Lending: Record money borrowed from or lent to family and friends with partial repayment tracking.',
      'Bank Loans & Mortgages: Manage loan principal, interest rates, and monthly EMI installments.',
      'Zakat & Net Worth Calculator: Calculate eligible Zakat (2.5%) based on hawl and net Zakatable assets.',
    ],
    pointsBn: [
      'ধার-দেনা সাব-লেজার: কাকে কত টাকা ধার দিয়েছেন বা কার কাছে কত দেনা আছেন তা নিখুঁতভাবে ট্র্যাক করুন।',
      'ব্যাংক লোন ও ইএমআই: লোন অ্যাকাউন্ট এবং মাসিক ইএমআই পরিশোধের কিস্তি হিসাব আপডেট রাখুন।',
      'যাকাত ক্যালকুলেটর: আপনার নিট যাকাতযোগ্য সম্পদের ওপর ২.৫% বার্ষিক যাকাতের হিসাব পাবেন এক ক্লিকে।',
    ],
    proTipEn: 'When someone repays a loan, click "Receive Payment" to auto-credit your bank account.',
    proTipBn: 'ধার শোধ হলে "Receive Payment" বোতামে চাপ দিলে আপনার ব্যাংক অ্যাকাউন্টে ব্যালেন্স যোগ হবে।',
  },
  {
    id: 'drive',
    icon: HardDrive,
    badgeEn: 'Google Drive Auto-Sync',
    badgeBn: 'গুগল ড্রাইভ অটো ব্যাকআপ',
    titleEn: '5. Google Drive Backup & Security',
    titleBn: '৫. গুগল ড্রাইভ ক্লাউড ব্যাকআপ ও নিরাপত্তা',
    summaryEn: 'Connect your Google account once to enable 100% private, automated cloud backup to your own Drive.',
    summaryBn: 'আপনার জিমেইল দিয়ে সাইন-ইন করুন। আপনার হিসাবের একটি এনক্রিপ্টেড ব্যাকআপ আপনার ড্রাইভে সেভ হবে।',
    pointsEn: [
      '1-Click Google Sign-In: Quick and standard Google authentication for automatic background sync.',
      'Private Drive AppFolder: Backup files are stored exclusively in your own private Google Drive app folder.',
      'Instant Restore: Switch devices or reinstall the app anytime and restore your full ledger in seconds.',
    ],
    pointsBn: [
      'গুগল সাইন-ইন: ১-ক্লিকে গুগল সাইন-ইন করে ব্যাকআপ সার্ভিস সচল করুন।',
      'প্রাইভেট অ্যাপ ফোল্ডার: ব্যাকআপ ফাইলটি শুধুমাত্র আপনার নিজস্ব জিমেইল ড্রাইভে এনক্রিপ্ট হয়ে সেভ থাকে।',
      'ইনস্ট্যান্ট রিস্টোর: ফোন পরিবর্তন করলেও ড্রাইভ থেকে এক ক্লিকে সমস্ত ডাটা রিস্টোর করা সম্ভব।',
    ],
    proTipEn: 'You can also download local JSON backup files or export Excel CSV spreadsheets anytime.',
    proTipBn: 'যেকোনো সময় চাইলে লোকাল JSON ব্যাকআপ অথবা এক্সেল CSV ফাইল পিসিতে ডাউনলোড করতে পারবেন।',
  },
  {
    id: 'reports',
    icon: FileSpreadsheet,
    badgeEn: 'Tax & PDF Reports',
    badgeBn: 'ট্যাক্স রিপোর্ট ও পিডিএফ',
    titleEn: '6. NBR Tax Statements & Official PDFs',
    titleBn: '৬. এনবিআর আয়কর রিটার্ন ও পিডিএফ রিপোর্ট',
    summaryEn: 'Generate official NBR tax schedules, Balance Sheets, P&L statements, and audit reports ready for printing.',
    summaryBn: 'এনবিআর আয়কর রিটার্নের তথ্য, ব্যালেন্স শিট, লাভ-ক্ষতির হিসাব ও অডিট সার্টিফিকেট এক ক্লিকে পিডিএফ ডাউনলোড করুন।',
    pointsEn: [
      'NBR Capital Gains Tax: Pre-calculated Section 32/57 capital gains schedule with Tk 50 Lakh exemption limits.',
      'Financial Statements: Publication-ready Balance Sheets and Profit & Loss operating surplus reports.',
      'Audit Certificate: Forensic hash chain seals to prove accounting data integrity for bank or tax submission.',
    ],
    pointsBn: [
      'এনবিআর ট্যাক্স স্টেটমেন্ট: ৫০ লাখ টাকা করমুক্ত সুবিধাসহ ক্যাপিটাল গেইন আয়কর স্টেটমেন্ট রেডি করা।',
      'ব্যালেন্স শিট ও পিঅ্যান্ডএল: অফিসিয়াল ব্যালেন্স শিট এবং লাভ-ক্ষতির স্টেটমেন্ট তৈরি করুন।',
      'অডিট সার্টিফিকেট: ব্যাংক বা ইনকাম ট্যাক্স ফাইলিংয়ের জন্য ডিজিটাল ওয়াটারমার্কসহ পিডিএফ প্রিন্ট করুন।',
    ],
    proTipEn: 'All PDF reports are generated with vector typography for clean printing on A4 paper.',
    proTipBn: 'সকল পিডিএফ রিপোর্ট A4 সাইজ কাগজে ঝকঝকে প্রিন্টের জন্য অপ্টিমাইজড।',
  },
];

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose, autoOpened }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { isBn, setLanguage } = useLanguage();
  const lang = isBn ? 'bn' : 'en';

  // Load seen status or initialize
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStep = GUIDE_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === GUIDE_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('has_seen_wealthfolio_guide_v1', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-canvas/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-ink-soft">
        
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-edge flex items-center justify-between bg-canvas/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 text-accent-strong rounded-xl border border-accent/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                <span>{lang === 'en' ? 'App Walkthrough & User Guide' : 'অ্যাপ ব্যবহারের সহজ নির্দেশিকা'}</span>
                {autoOpened && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent/20 text-accent-strong border border-accent/30">
                    Quick Tour
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-ink-muted">
                {lang === 'en'
                  ? `Step ${currentStepIndex + 1} of ${GUIDE_STEPS.length} • Master Wealthfolio in 2 minutes`
                  : `ধাপ ${currentStepIndex + 1} / ${GUIDE_STEPS.length} • ২ মিনিটে অ্যাপের ব্যবহার শিখুন`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-surface border border-edge rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                  lang === 'en'
                    ? 'bg-accent text-accent-ink font-bold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                  lang === 'bn'
                    ? 'bg-accent text-accent-ink font-bold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                বাংলা
              </button>
            </div>

            {/* Skip / Close Button */}
            <button
              onClick={handleComplete}
              className="p-1.5 rounded-xl hover:bg-raised text-ink-muted hover:text-ink transition-colors"
              title={lang === 'en' ? 'Close Tour' : 'বন্ধ করুন'}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-canvas h-1.5 shrink-0">
          <div
            className="bg-accent h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${((currentStepIndex + 1) / GUIDE_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Main Content Area: Sidebar Steps List + Active Step View */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-edge">
          
          {/* Left Steps Navigation (Desktop) */}
          <div className="hidden md:block md:col-span-4 p-4 space-y-1.5 bg-canvas/40 overflow-y-auto">
            <p className="text-[10px] uppercase font-mono font-bold text-ink-faint px-2 mb-2">
              {lang === 'en' ? 'Guide Chapters' : 'নির্দেশিকার অধ্যায়সমূহ'}
            </p>
            {GUIDE_STEPS.map((step, idx) => {
              const IconComp = step.icon;
              const isActive = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center gap-3 transition-all ${
                    isActive
                      ? 'bg-accent/10 border-accent/40 text-ink font-semibold shadow-xs'
                      : isPast
                      ? 'bg-surface/60 border-edge/80 text-ink-soft hover:bg-raised/50'
                      : 'bg-transparent border-transparent text-ink-muted hover:bg-raised/40 hover:text-ink-soft'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isActive
                        ? 'bg-accent text-accent-ink font-bold'
                        : isPast
                        ? 'bg-accent/15 text-accent-strong border border-accent/30'
                        : 'bg-raised text-ink-muted'
                    }`}
                  >
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="truncate flex-1">
                    <div className="truncate text-xs font-medium">
                      {lang === 'en' ? step.titleEn : step.titleBn}
                    </div>
                    <div className="text-[10px] text-ink-faint truncate">
                      {lang === 'en' ? step.badgeEn : step.badgeBn}
                    </div>
                  </div>
                  {isPast && <CheckCircle2 className="h-3.5 w-3.5 text-accent-strong shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Right Active Step Content */}
          <div className="md:col-span-8 p-5 sm:p-7 space-y-6 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-5">
              {/* Badge & Icon Header */}
              <div className="flex items-center justify-between gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-accent/10 text-accent-strong border border-accent/20 inline-flex items-center gap-1.5">
                  <StepIcon className="h-3.5 w-3.5" />
                  <span>{lang === 'en' ? currentStep.badgeEn : currentStep.badgeBn}</span>
                </span>
                <span className="text-[11px] font-mono text-ink-faint">
                  {currentStepIndex + 1} / {GUIDE_STEPS.length}
                </span>
              </div>

              {/* Title & Summary */}
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-ink tracking-tight leading-snug">
                  {lang === 'en' ? currentStep.titleEn : currentStep.titleBn}
                </h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed bg-canvas/60 p-3.5 rounded-xl border border-edge/80">
                  {lang === 'en' ? currentStep.summaryEn : currentStep.summaryBn}
                </p>
              </div>

              {/* Bullet Points */}
              <div className="space-y-2.5 pt-1">
                <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider font-mono">
                  {lang === 'en' ? 'Key Capabilities & Features' : 'প্রধান সুবিধাসমূহ:'}
                </h4>
                <div className="space-y-2">
                  {(lang === 'en' ? currentStep.pointsEn : currentStep.pointsBn).map((point, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 rounded-xl bg-canvas/40 border border-edge flex items-start gap-3 text-xs leading-relaxed"
                    >
                      <div className="p-1 rounded bg-accent/20 text-accent-strong shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-ink-soft">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro Tip Box */}
              {currentStep.proTipEn && (
                <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/20 text-amber-200 text-xs flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-warning font-semibold mr-1">
                      {lang === 'en' ? 'Pro Tip:' : 'টিপস:'}
                    </strong>
                    <span>{lang === 'en' ? currentStep.proTipEn : currentStep.proTipBn}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Step Indicator Dots */}
            <div className="flex md:hidden items-center justify-center gap-1.5 py-2">
              {GUIDE_STEPS.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => setCurrentStepIndex(dotIdx)}
                  className={`h-1.5 rounded-full transition-all ${
                    dotIdx === currentStepIndex
                      ? 'w-6 bg-accent'
                      : 'w-1.5 bg-raised'
                  }`}
                />
              ))}
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 border-t border-edge bg-canvas flex items-center justify-between shrink-0 gap-3">
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs font-semibold text-ink-muted hover:text-ink px-2 py-1 transition-colors"
          >
            {lang === 'en' ? 'Skip Tour' : 'এখনই শুরু করুন (Skip)'}
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl bg-raised hover:bg-slate-700 text-ink-soft text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{lang === 'en' ? 'Previous' : 'আগের ধাপ'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-strong text-accent-ink font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <span>
                {isLast
                  ? lang === 'en'
                    ? 'Get Started Now'
                    : 'অ্যাপ শুরু করুন'
                  : lang === 'en'
                  ? 'Next Step'
                  : 'পরবর্তী ধাপ'}
              </span>
              {isLast ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
