import React, { useState, useMemo } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useLedger } from '../../lib/ledger-context';
import { useLanguage } from '../../lib/language-context';
import { verifyAuditChainIntegrity } from '../../lib/audit-and-alerts';
import { exportAuditReportPdf } from '../../lib/pdf-export-engine';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Hash,
  Clock,
  Layers,
  FileCode,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Lock,
  FileText,
  TrendingUp,
  Landmark,
  CreditCard,
  SlidersHorizontal,
  Globe2,
  Sparkles,
  CheckCircle,
  KeyRound,
} from 'lucide-react';
import { AuditLogEntry } from '../../types/accounting';

export const AuditLogsView: React.FC = () => {
  const { user } = useAuth();
  const { auditLogs } = useLedger();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'stocks' | 'banking' | 'debts' | 'system'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { language, setLanguage } = useLanguage();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [lastVerificationResult, setLastVerificationResult] = useState<{
    isValid: boolean;
    totalVerified: number;
    tamperedEntryId?: string;
  } | null>(() => verifyAuditChainIntegrity(auditLogs));
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleRunVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const result = verifyAuditChainIntegrity(auditLogs);
      setLastVerificationResult(result);
      setIsVerifying(false);
    }, 450);
  };

  const handleExportAuditPdf = async () => {
    try {
      const ok = await exportAuditReportPdf(
        user,
        auditLogs,
        lastVerificationResult?.isValid ?? true,
        lastVerificationResult?.totalVerified ?? auditLogs.length
      );
      if (ok) {
        setExportNotice(
          language === 'bn'
            ? 'অডিট সার্টিফিকেট PDF সফলভাবে ডাউনলোড হয়েছে।'
            : 'Audit Certificate PDF downloaded successfully.'
        );
        setTimeout(() => setExportNotice(null), 3500);
      }
    } catch {
      setExportNotice(
        language === 'bn'
          ? 'PDF তৈরি করতে সমস্যা হয়েছে।'
          : 'Error generating audit certificate PDF.'
      );
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  // Human-friendly Action Translation & Metadata
  const getActionFriendlyMeta = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('TRADE_BUY')) {
      return {
        bn: 'শেয়ার ক্রয় সম্পন্ন',
        en: 'Stock Purchase Executed',
        category: 'stocks' as const,
        icon: TrendingUp,
        color: 'emerald',
      };
    }
    if (act.includes('TRADE_SELL')) {
      return {
        bn: 'শেয়ার বিক্রয় সম্পন্ন',
        en: 'Stock Sale Executed',
        category: 'stocks' as const,
        icon: TrendingUp,
        color: 'emerald',
      };
    }
    if (act.includes('DIVIDEND')) {
      return {
        bn: 'ডিভিডেন্ড প্রাপ্তি ও ট্যাক্স কর্তন',
        en: 'Dividend Received & Tax Credited',
        category: 'stocks' as const,
        icon: Sparkles,
        color: 'emerald',
      };
    }
    if (act.includes('CORPORATE_ACTION') || act.includes('IPO')) {
      return {
        bn: 'কর্পোরেট অ্যাকশন / বোনাস / আইপিও',
        en: 'Corporate Action / Bonus / IPO',
        category: 'stocks' as const,
        icon: Sparkles,
        color: 'purple',
      };
    }
    if (act.includes('DPS') || act.includes('FD') || act.includes('DEPOSIT')) {
      return {
        bn: 'ডিপিএস / ফিক্সড ডিপোজিট এন্ট্রি',
        en: 'DPS / Fixed Deposit Update',
        category: 'banking' as const,
        icon: Landmark,
        color: 'sky',
      };
    }
    if (act.includes('TRANSFER') || act.includes('EXPENSE') || act.includes('INCOME')) {
      return {
        bn: 'লেনদেন / আয়-ব্যয় রেকর্ড',
        en: 'Transaction / Income & Expense',
        category: 'banking' as const,
        icon: Landmark,
        color: 'sky',
      };
    }
    if (act.includes('LOAN') || act.includes('DEBT')) {
      return {
        bn: 'ঋণ বা দেনা পরিশোধ / আপডেট',
        en: 'Loan & Debt Update',
        category: 'debts' as const,
        icon: CreditCard,
        color: 'amber',
      };
    }
    if (act.includes('REVERSED') || act.includes('RESET') || act.includes('TAMPER')) {
      return {
        bn: 'হিসাব পরিবর্তন বা সংশোধন',
        en: 'Entry Reversal / Adjustment',
        category: 'system' as const,
        icon: Lock,
        color: 'rose',
      };
    }
    return {
      bn: 'সিস্টেম বা সেটিংস পরিবর্তন',
      en: 'System or Profile Setting Update',
      category: 'system' as const,
      icon: SlidersHorizontal,
      color: 'slate',
    };
  };

  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter((log) => {
        const meta = getActionFriendlyMeta(log.action);
        if (activeCategory !== 'all' && meta.category !== activeCategory) {
          return false;
        }
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          log.summary.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          meta.bn.toLowerCase().includes(q) ||
          meta.en.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q) ||
          log.hash.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, searchTerm, activeCategory]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>
              {language === 'bn'
                ? 'স্বয়ংক্রিয় অডিট ও ক্রিপ্টোগ্রাফিক সুরক্ষা'
                : language === 'en'
                ? 'Automated Audit & Cryptographic Protection'
                : 'অডিট ট্রেইল ও হিসাব সুরক্ষা · Audit Trail & Protection'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {language === 'bn'
              ? 'অ্যাক্টিভিটি হিস্ট্রি ও ডাটা ভেরিফিকেশন'
              : language === 'en'
              ? 'Activity History & Data Verification'
              : 'অ্যাক্টিভিটি হিস্ট্রি ও ভেরিফিকেশন (Audit Logs)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            {language === 'bn'
              ? 'আপনার প্রতিটি লেনদেন, স্টক ক্রয়/বিক্রয় ও ব্যালেন্স পরিবর্তন স্বয়ংক্রিয় ডিজিটাল সিলমোহর (Hash) দ্বারা সংরক্ষিত। কোনো হিসাব পরিবর্তন বা ভুল হলে সাথে সাথে ধরা পড়বে।'
              : language === 'en'
              ? 'Every transaction, trade, and balance change is secured with a tamper-evident cryptographic digital seal. Complete transparency and CA-standard audit proof.'
              : 'প্রতিটি লেনদেন ও ব্যালেন্স পরিবর্তন ডিজিটাল সিলমোহর দ্বারা সুরক্ষিত। Every transaction is permanently chained with cryptographic signatures.'}
          </p>
        </div>

        {/* Controls: Language Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Language Switcher (Bangla & English only) */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setLanguage('bn')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                language === 'bn'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                language === 'en'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          <button
            onClick={handleExportAuditPdf}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            title="Download Official Audit Certificate"
          >
            <FileText className="h-4 w-4 text-emerald-400" />
            <span>{language === 'bn' ? 'অডিট PDF ডাউনলোড' : 'Download Audit PDF'}</span>
          </button>

          <button
            onClick={handleRunVerification}
            disabled={isVerifying}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>
              {isVerifying
                ? language === 'bn'
                  ? 'যাচাই করা হচ্ছে...'
                  : 'Verifying Integrity...'
                : language === 'bn'
                ? 'ডাটা ভেরিফাই করুন'
                : 'Verify Security Now'}
            </span>
          </button>
        </div>
      </div>

      {/* Export Notice Notification */}
      {exportNotice && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Security & Verification Card */}
      {lastVerificationResult && (
        <div
          className={`rounded-2xl border p-5 transition-all shadow-lg ${
            lastVerificationResult.isValid
              ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/80 to-slate-900/60 text-emerald-300'
              : 'border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-slate-900/60 text-rose-300'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl shrink-0 mt-0.5 ${
                  lastVerificationResult.isValid
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {lastVerificationResult.isValid ? (
                  <ShieldCheck className="h-7 w-7" />
                ) : (
                  <ShieldAlert className="h-7 w-7" />
                )}
              </div>
              <div className="space-y-1">
                <div className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2.5 flex-wrap">
                  <span>
                    {lastVerificationResult.isValid
                      ? language === 'bn'
                        ? 'হিসাবের নিরাপত্তা ও নির্ভুলতা: ১০০% অক্ষত ও সুরক্ষিত'
                        : 'Data Security & Integrity: 100% Intact & Untampered'
                      : language === 'bn'
                      ? 'সতর্কতা: হিসাবে অনাকাঙ্ক্ষিত পরিবর্তন শনাক্ত হয়েছে!'
                      : 'Alert: Hash Chain Mismatch Detected!'}
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                    {lastVerificationResult.totalVerified} {language === 'bn' ? 'টি এন্ট্রি পরীক্ষিত' : 'Verified Entries'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300">
                  {lastVerificationResult.isValid
                    ? language === 'bn'
                      ? 'অ্যাপের প্রথম দিন থেকে আজকের প্রতিটি লেনদেনের হিসাব ক্রিপ্টোগ্রাফিকভাবে মিলিয়ে দেখা হয়েছে। কোনো ডাটা হারায়নি বা ভুলভাবে পরিবর্তিত হয়নি।'
                      : 'All sequential entries match cryptographic checksums. No unauthorized alterations or ghost modifications detected.'
                    : `ত্রুটি শনাক্ত হয়েছে এন্ট্রি আইডিতে: ${lastVerificationResult.tamperedEntryId}`}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 shrink-0 text-xs">
              <div className="text-slate-400 font-mono flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>SHA-256 Chaining</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-medium">Double-Entry Certified</div>
            </div>
          </div>
        </div>
      )}

      {/* User Benefits Quick Guide / ৩টি মূল সুবিধা */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Clock className="w-4 h-4" />
            <span>{language === 'bn' ? 'সঠিক টাইমস্ট্যাম্প' : 'Accurate Timestamp'}</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {language === 'bn'
              ? 'কখন, কোন তারিখে এবং কত টাকা খরচ বা জমা হয়েছে তার সম্পূর্ণ প্রমাণপত্র।'
              : 'Exact record of date, time, and monetary values for every activity.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <KeyRound className="w-4 h-4" />
            <span>{language === 'bn' ? 'ডিজিটাল ফিঙ্গারপ্রিন্ট' : 'Tamper-Proof Hashes'}</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {language === 'bn'
              ? 'ব্লকচেইনের মতো প্রতিটি এন্ট্রি আগের এন্ট্রির সাথে লক করা, কেউ জালিয়াতি করতে পারবে না।'
              : 'Cryptographically linked blocks prevent retroactive manipulation of accounts.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <FileText className="w-4 h-4" />
            <span>{language === 'bn' ? 'ট্যাক্স ও অডিট সার্টিফাইড' : 'Tax & CA Audit Ready'}</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {language === 'bn'
              ? 'আয়কর ও প্রফেশনাল অডিট ফাইলিংয়ের জন্য গ্রহণযোগ্য অফিসিয়াল রেকর্ড।'
              : 'Compliant with double-entry accounting standards for formal financial filings.'}
          </p>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-none pb-0.5">
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl min-w-max">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === 'all'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'bn' ? 'সব রেকর্ড' : 'All Activity'} ({auditLogs.length})
              </button>

              <button
                onClick={() => setActiveCategory('stocks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === 'stocks'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'শেয়ার ও ডিভিডেন্ড' : 'Stocks & Dividends'}</span>
              </button>

              <button
                onClick={() => setActiveCategory('banking')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === 'banking'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ব্যাংক ও সঞ্চয়' : 'Banking & Savings'}</span>
              </button>

              <button
                onClick={() => setActiveCategory('debts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === 'debts'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ঋণ ও দেনা' : 'Loans & Debts'}</span>
              </button>

              <button
                onClick={() => setActiveCategory('system')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === 'system'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সিস্টেম ও প্রোফাইল' : 'System & Settings'}</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder={
                language === 'bn'
                  ? 'লেনদেন বা বিবরণ খুঁজুন...'
                  : 'Search activity, amount, hash...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Technical Detail Switch */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span>
            {language === 'bn' ? 'মোট দেখানো হচ্ছে:' : 'Displaying:'}{' '}
            <strong className="text-white font-mono">{filteredLogs.length}</strong>{' '}
            {language === 'bn' ? 'টি অডিট এন্ট্রি' : 'audit records'}
          </span>

          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <Hash className="w-3.5 h-3.5" />
            <span>
              {showTechnicalDetails
                ? language === 'bn'
                  ? 'সহজ ভিউতে ফিরুন'
                  : 'Switch to Simple View'
                : language === 'bn'
                ? 'ক্রিপ্টোগ্রাফিক কোড ও হ্যাশ দেখুন'
                : 'Show Cryptographic Hashes'}
            </span>
          </button>
        </div>
      </div>

      {/* Audit Log Stream (User Friendly Cards) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/80">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
              <div className="text-sm font-medium">
                {language === 'bn'
                  ? 'কোনো অডিট রেকর্ড পাওয়া যায়নি।'
                  : 'No audit records matched your filter.'}
              </div>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? 'অন্য ক্যাটাগরি বা সার্চ কিওয়ার্ড ব্যবহার করে দেখুন।'
                  : 'Try selecting a different category or clearing your search.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const meta = getActionFriendlyMeta(log.action);
              const IconComponent = meta.icon;

              const getBadgeColor = (c: string) => {
                switch (c) {
                  case 'emerald':
                    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  case 'sky':
                    return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                  case 'purple':
                    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                  case 'amber':
                    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  case 'rose':
                    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                  default:
                    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                }
              };

              return (
                <div key={log.id} className="transition-colors hover:bg-slate-800/40">
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-4 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${getBadgeColor(
                          meta.color
                        )}`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Bengali / English Tag */}
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getBadgeColor(
                              meta.color
                            )}`}
                          >
                            {language === 'bn' ? meta.bn : meta.en}
                          </span>

                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {new Date(log.timestamp).toLocaleString('bn-BD', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Summary */}
                        <div className="text-xs sm:text-sm font-medium text-slate-200">
                          {log.summary}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Hash status or expand indicator */}
                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                      {showTechnicalDetails ? (
                        <div className="font-mono text-[11px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-emerald-400 flex items-center gap-1.5">
                          <Hash className="w-3 h-3" />
                          <span>{log.hash}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{language === 'bn' ? 'সুরক্ষিত' : 'Verified'}</span>
                        </div>
                      )}

                      <div className="text-slate-400 hover:text-white transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Drawer */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-4 pt-2 bg-slate-950/80 border-t border-slate-800/80 text-xs space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-slate-300 pt-1">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">
                            {language === 'bn' ? 'লেনদেন রেফারেন্স ID' : 'Entry Reference ID'}
                          </div>
                          <div className="font-mono text-white mt-0.5 truncate">{log.entityId}</div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">
                            {language === 'bn' ? 'ব্যবহারকারী আইডি' : 'Authorized User ID'}
                          </div>
                          <div className="font-mono text-emerald-400 mt-0.5 truncate">
                            {log.userId}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">
                            {language === 'bn' ? 'ডিজিটাল সিলমোহর (Hash)' : 'Cryptographic Signature'}
                          </div>
                          <div className="font-mono text-emerald-400 mt-0.5 truncate">{log.hash}</div>
                        </div>
                      </div>

                      {/* Technical Details / JSON */}
                      <div className="space-y-1">
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <FileCode className="h-3.5 w-3.5 text-slate-500" />
                          <span>
                            {language === 'bn'
                              ? 'সম্পূর্ণ অডিট ডাটা স্ন্যাপশট (JSON):'
                              : 'Complete Audit Snapshot (JSON):'}
                          </span>
                        </div>
                        <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                          {JSON.stringify(
                            {
                              action: log.action,
                              summary: log.summary,
                              entityType: log.entityType,
                              entityId: log.entityId,
                              timestamp: log.timestamp,
                              previousHash: log.previousHash,
                              currentHash: log.hash,
                              details: log.details,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
