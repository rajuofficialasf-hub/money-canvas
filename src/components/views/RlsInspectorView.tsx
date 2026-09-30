import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { APP_CONFIG } from '../../lib/app-config';
import { useLanguage } from '../../lib/language-context';
import { GoogleIcon } from '../icons/GoogleIcon';
import {
  RLS_TABLES_LIST,
  generateFullRlsMigrationSql,
  testRlsAccess,
} from '../../lib/rls-policies';
import {
  ShieldCheck,
  Lock,
  Copy,
  Check,
  Play,
  FileCode,
  AlertCircle,
  Database,
  Shield,
  EyeOff,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

export const RlsInspectorView: React.FC = () => {
  const { user, availableProfiles, openAuthModal, isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-2xl space-y-4">
        <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl w-16 h-16 mx-auto border border-purple-500/20 flex items-center justify-center">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted (Admin Only)</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          Database SQL Code, Protected Tables & RLS Inspector are restricted to System Administrator (<strong className="text-white font-mono">{APP_CONFIG.OWNER_EMAIL}</strong>). Please sign in with your authorized Google account.
        </p>
        <div className="pt-2">
          <button
            onClick={openAuthModal}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <GoogleIcon className="h-4 w-4 bg-white p-0.5 rounded-full shrink-0" />
            <span>Sign In with Google</span>
          </button>
        </div>
      </div>
    );
  }

  const [copied, setCopied] = useState(false);
  const [selectedTable, setSelectedTable] = useState(RLS_TABLES_LIST[0]);
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'tables' | 'sql'>('overview');

  // RLS Simulation state
  const otherProfile = availableProfiles.find((p) => p.id !== user.id) || availableProfiles[0];
  const [simulatedOwnerId, setSimulatedOwnerId] = useState<string>(
    otherProfile?.id !== user.id ? otherProfile.id : user.id
  );
  const [simResult, setSimResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  const fullSql = generateFullRlsMigrationSql();

  const handleCopySql = () => {
    navigator.clipboard.writeText(fullSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunSimulation = () => {
    const res = testRlsAccess(user.id, simulatedOwnerId);
    setSimResult(res);
  };

  // Friendly human names for protected tables
  const getTableFriendlyInfo = (tableName: string) => {
    switch (tableName) {
      case 'accounts':
        return {
          bn: 'ব্যাংক, ক্যাশ ও ব্রোকারেজ অ্যাকাউন্ট',
          en: 'Bank, Cash & Brokerage Accounts',
          descBn: 'আপনার ব্যাংক ব্যালেন্স ও ক্যাশের তথ্য শুধুমাত্র আপনার অ্যাকাউন্টে লক করা।',
          descEn: 'Bank and cash balances are strictly locked to your authenticated user profile.',
        };
      case 'transactions':
        return {
          bn: 'দৈনন্দিন আয় ও ব্যয়ের লেনদেন',
          en: 'Income & Expense Transactions',
          descBn: 'প্রতিটি খরচের হিসাব ব্যক্তিগত এবং অন্য কারও সাথে শেয়ার হয় না।',
          descEn: 'Every expense and income line item is isolated to your profile only.',
        };
      case 'stock_holdings':
      case 'stock_trades':
        return {
          bn: 'ডিএসই স্টক পোর্টফোলিও ও ট্রেডিং',
          en: 'DSE Stock Holdings & Trade Orders',
          descBn: 'আপনার শেয়ার পোর্টফোলিও, ক্রয়মূল্য এবং লাভ-ক্ষতির গোপনীয়তা সুরক্ষিত।',
          descEn: 'Real-time DSE holdings, cost bases, and buy/sell orders are fully private.',
        };
      case 'loans':
      case 'debts':
        return {
          bn: 'ব্যক্তিগত ও প্রাতিষ্ঠানিক ঋণ/দেনা',
          en: 'Personal Loans & Liabilities',
          descBn: 'আপনার সমস্ত দেনা এবং কিস্তির হিসাব সর্বোচ্চ নিরাপত্তায় সংরক্ষিত।',
          descEn: 'Liability schedules and personal borrowings are kept strictly confidential.',
        };
      case 'dps_schemes':
      case 'fixed_deposits':
        return {
          bn: 'ডিপিএস ও ফিক্সড ডিপোজিট',
          en: 'DPS Schemes & Fixed Deposits',
          descBn: 'মেয়াদী সঞ্চয় ও মুনাফার হিসাব ব্যক্তিগতভাবে সুরক্ষিত।',
          descEn: 'Term deposits, maturity forecasts, and profits are fully isolated.',
        };
      case 'zakat_records':
        return {
          bn: 'যাকাত হিসাব ও অনুদান রেকর্ড',
          en: 'Zakat Computations & Records',
          descBn: 'যাকাত হিসাবের নিসাব ও সম্পদ মূল্যায়ন ব্যক্তিগত গোপনীয়তায় আবদ্ধ।',
          descEn: 'Zakat calculations and gold/silver nisab assessments remain completely private.',
        };
      case 'dividends':
        return {
          bn: 'ডিভিডেন্ড আয় ও এআইটি ট্যাক্স',
          en: 'Cash Dividends & AIT Tax',
          descBn: 'কোম্পানি ডিভিডেন্ড এবং কর রেয়াতের ডাটা সুরক্ষিত।',
          descEn: 'Withholding tax credits and cash dividends are guarded per user.',
        };
      default:
        return {
          bn: tableName.replace(/_/g, ' '),
          en: tableName.replace(/_/g, ' '),
          descBn: 'ডাটাবেস লেভেলে ১০০% সুরক্ষিত ও সংরক্ষিত।',
          descEn: 'Secured at database layer with strict user isolation.',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Shield className="h-4 w-4" />
            <span>
              {language === 'bn'
                ? 'ব্যক্তিগত তথ্যের গোপনীয়তা ও সুরক্ষা ব্যবস্থা'
                : 'Data Privacy & Tenant Isolation'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {language === 'bn'
              ? 'অ্যাকাউন্ট সিকিউরিটি ও প্রাইভেসি পলিসি'
              : 'Account Security & Data Privacy'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            {language === 'bn'
              ? 'আপনার প্রতিটি ব্যাংক অ্যাকাউন্ট, স্টক পোর্টফোলিও এবং খরচের হিসাব ডাটাবেস লেভেলে লক করা। অন্য কোনো ব্যবহারকারী বা থার্ড-পার্টি আপনার আর্থিক তথ্য দেখতে বা পরিবর্তন করতে পারবে না।'
              : 'Your financial records, bank accounts, and stock portfolios are cryptographically locked per profile (Row-Level Security). Zero cross-user data leakage guaranteed.'}
          </p>
        </div>

        {/* Top Controls: Language Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                language === 'en'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('bn')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                language === 'bn'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              বাংলা
            </button>
          </div>

          <button
            onClick={handleCopySql}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium transition-colors"
            title="Copy PostgreSQL RLS Migration SQL"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>
              {copied
                ? language === 'bn'
                  ? 'SQL কোড কপি হয়েছে!'
                  : 'SQL Copied!'
                : language === 'bn'
                ? 'মাইগ্রেশন SQL কপি'
                : 'Copy Migration SQL'}
            </span>
          </button>
        </div>
      </div>

      {/* Active Session & Security Metrics Ribbon */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
          <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'bn' ? 'সক্রিয় ব্যবহারকারী' : 'Active Account Profile'}</span>
          </div>
          <div className="text-white font-bold text-sm truncate">{user.fullName}</div>
          <div className="text-[11px] text-emerald-400 font-mono truncate">
            {user.email} (ID: {user.id.slice(0, 10)}...)
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
          <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'bn' ? 'সুরক্ষা পলিসি স্ট্যাটাস' : 'Security Isolation Status'}</span>
          </div>
          <div className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>{language === 'bn' ? '২০টি ডাটা মডিউল সম্পূর্ণ লকড' : 'Enforced on 20 Entities'}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {language === 'bn'
              ? 'জিরো ডাটা লিক গ্যারান্টি (Zero Data Leak)'
              : 'Zero cross-tenant data leakage'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
          <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'bn' ? 'বেস কারেন্সি ও অঞ্চল' : 'Base Currency & Zone'}</span>
          </div>
          <div className="text-white font-bold text-sm">BDT (৳) · Asia/Dhaka</div>
          <div className="text-[11px] text-slate-400">
            {language === 'bn' ? 'অফলাইন ও লোকাল ডাটা সুরক্ষিত' : 'Offline & Local Protected'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Easy Switch */}
      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none gap-2 pb-1 text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{language === 'bn' ? 'সুরক্ষা বিবরণ ও সুবিধা' : 'Security Overview'}</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>{language === 'bn' ? 'নিরাপত্তা পরীক্ষা (Simulator)' : 'Privacy Simulator'}</span>
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'tables'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{language === 'bn' ? 'সুরক্ষিত সেকশন তালিকা' : 'Protected Tables'}</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`px-4 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'sql'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>{language === 'bn' ? 'ডেভেলপার SQL কোড' : 'Database SQL Code'}</span>
        </button>
      </div>

      {/* ====================================================
          TAB 1: USER FRIENDLY SECURITY OVERVIEW
          ==================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {language === 'bn' ? '১০০% ব্যক্তিগত হিসাব (Private)' : '100% Private Records'}
                  </h3>
                  <p className="text-xs text-slate-400">Zero Cross-Account Visibility</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {language === 'bn'
                  ? 'আপনার কোনো ব্যাংক ব্যালেন্স, শেয়ার পোর্টফোলিও বা খরচের হিসাব অন্য কোনো ইউজার দেখতে পারবেন না। এমনকি একই ডিভাইসে অন্য কেউ লগইন করলেও আগের ইউজারের তথ্য সম্পূর্ণ গোপন থাকে।'
                  : 'No unauthorized user can ever see your bank balances, transactions, or stock trades. Complete user isolation is maintained at all times.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {language === 'bn' ? 'ব্যাংকিং গ্রেড সুরক্ষা (RLS)' : 'Row Level Security (RLS)'}
                  </h3>
                  <p className="text-xs text-slate-400">PostgreSQL Database Layer Lockdown</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {language === 'bn'
                  ? 'ডাটাবেস লেভেলেই রুলস সেট করা আছে: শুধুমাত্র বর্তমান ভেরিফাইড ইউজার আইডির (auth.uid) সাথে ম্যাচ করলেই তথ্য শো করা হয়, অন্যথায় সিস্টেম সাথে সাথে এক্সেস ব্লক করে দেয়।'
                  : 'Database-enforced access policies ensure every query is bound to your authorized profile ID with zero leak probability.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {language === 'bn' ? 'অননুমোদিত পরিবর্তন প্রতিরোধ' : 'Anti-Tamper Modification'}
                  </h3>
                  <p className="text-xs text-slate-400">Restricted Insert, Update & Delete</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {language === 'bn'
                  ? 'অন্য কোনো প্রোফাইল থেকে আপনার হিসাবে কোনো ভুয়া লেনদেন এন্ট্রি বা ডিলিট করার চেষ্টা করলে ডাটাবেস স্বয়ংক্রিয়ভাবে সেই রিকোয়েস্ট রিজেক্ট করে দেয়।'
                  : 'Data mutations (INSERT/UPDATE/DELETE) are strictly authorized against owner foreign keys to prevent rogue modifications.'}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {language === 'bn' ? 'অফলাইন ও ক্লাউড ব্যাকআপ সুরক্ষা' : 'Encrypted Local & Cloud Sync'}
                  </h3>
                  <p className="text-xs text-slate-400">IndexedDB & Cloud Backup</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {language === 'bn'
                  ? 'আপনার ডিভাইসে অফলাইনে সংরক্ষিত সমস্ত ডাটা এনক্রিপ্ট থাকে এবং ক্লাউডে এক্সপোর্ট করার সময়ও সিকিউর জেসন ফরম্যাট ব্যবহার করা হয়।'
                  : 'Local cache and backup exports are secured so you never lose your important financial records.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 2: INTERACTIVE PRIVACY SIMULATOR
          ==================================================== */}
      {activeTab === 'simulator' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              {language === 'bn'
                ? 'গোপনীয়তা সুরক্ষা সিমুলেটর (Privacy Test)'
                : 'Interactive Access Control Simulator'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {language === 'bn'
              ? 'পরীক্ষা করে দেখুন: আপনি বর্তমান প্রোফাইলে থাকা অবস্থায় যদি কোনো অননুমোদিত ইউজার বা অন্য প্রোফাইলের ডাটা এক্সেস করার চেষ্টা করা হয়, সিস্টেম কীভাবে তা প্রতিহত করে।'
              : 'Test what happens when the current active session attempts to query or alter a record belonging to another user profile.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">
                {language === 'bn' ? '১. বর্তমান লগইন প্রোফাইল' : '1. Current Logged In Profile'}
              </label>
              <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white truncate font-mono">
                {user.fullName} ({user.id.slice(0, 10)}...)
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">
                {language === 'bn' ? '২. কোন প্রোফাইলের ডাটা দেখতে চান?' : '2. Target Profile to Query'}
              </label>
              <select
                value={simulatedOwnerId}
                onChange={(e) => setSimulatedOwnerId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white focus:border-emerald-500 focus:outline-none text-xs"
              >
                {availableProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.id === user.id ? '(আপনার নিজস্ব প্রোফাইল)' : '(অন্য ইউজার)'}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunSimulation}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <span>{language === 'bn' ? 'নিরাপত্তা টেস্ট রান করুন' : 'Run Privacy Test'}</span>
            </button>
          </div>

          {simResult && (
            <div
              className={`p-4 rounded-xl border text-xs mt-4 animate-in fade-in duration-200 ${
                simResult.allowed
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {simResult.allowed ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-400" />
                )}
                <span>
                  {simResult.allowed
                    ? language === 'bn'
                      ? 'অ্যাক্সেস অনুমোদিত (নিজস্ব অ্যাকাউন্ট)'
                      : 'ACCESS GRANTED (Owner Match)'
                    : language === 'bn'
                    ? 'অ্যাক্সেস সম্পূর্ণ নিষিদ্ধ ও ব্লকড (Security Blocked)'
                    : 'ACCESS DENIED (RLS Policy Block)'}
                </span>
              </div>
              <div className="text-slate-300 mt-1 leading-relaxed">
                {simResult.allowed
                  ? language === 'bn'
                    ? 'আপনি আপনার নিজের অ্যাকাউন্টের তথ্যের মালিক হওয়ায় সিস্টেম ডাটা প্রদর্শনের অনুমতি দিয়েছে।'
                    : simResult.reason
                  : language === 'bn'
                  ? 'সিস্টেম অন্য প্রোফাইলের হিসাব দেখতে সম্পূর্ণ বাধা দিয়েছে। Row-Level Security রুল অনুযায়ী এই ডাটা অ্যাক্সেস অসম্ভব।'
                  : simResult.reason}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================
          TAB 3: PROTECTED TABLES & AREAS LIST
          ==================================================== */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Table List */}
          <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
            <div className="text-xs uppercase text-slate-400 font-bold mb-2">
              {language === 'bn' ? 'সুরক্ষিত ক্যাটাগরিসমূহ' : 'Protected Entities'} ({RLS_TABLES_LIST.length})
            </div>
            {RLS_TABLES_LIST.map((t) => {
              const info = getTableFriendlyInfo(t.tableName);
              const isSelected = selectedTable.tableName === t.tableName;
              return (
                <button
                  key={t.tableName}
                  onClick={() => setSelectedTable(t)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-950/30 text-white font-semibold'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Lock
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isSelected ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-white font-medium truncate">
                        {language === 'bn' ? info.bn : info.en}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{t.tableName}</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-400 font-mono">
                    {t.command}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Selected Policy Details */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              {(() => {
                const info = getTableFriendlyInfo(selectedTable.tableName);
                return (
                  <>
                    <div className="border-b border-slate-800 pb-3">
                      <div className="text-xs font-semibold text-emerald-400 mb-1">
                        {language === 'bn' ? 'সুরক্ষা নিয়মাবলী' : 'Security Rule Details'}
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {language === 'bn' ? info.bn : info.en}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">
                        {language === 'bn' ? info.descBn : info.descEn}
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-500 uppercase text-[10px] font-bold">
                          {language === 'bn' ? 'ডাটাবেস টেবিল:' : 'Target Database Table:'}{' '}
                        </span>
                        <span className="text-white font-mono font-semibold">
                          public.{selectedTable.tableName}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 uppercase text-[10px] font-bold">
                          {language === 'bn' ? 'অনুমোদিত একশন:' : 'Allowed Commands:'}{' '}
                        </span>
                        <span className="text-emerald-400 font-semibold">{selectedTable.command}</span>
                      </div>

                      <div>
                        <div className="text-slate-500 uppercase text-[10px] font-bold mb-1">
                          {language === 'bn'
                            ? 'সিকিউরিটি ফিল্টার ক্লজ (SQL USING):'
                            : 'SQL USING Filter Clause:'}
                        </div>
                        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                          {selectedTable.usingClause}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 4: FULL DEVELOPER / CA AUDIT SQL CODE
          ==================================================== */}
      {activeTab === 'sql' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>
                  {language === 'bn'
                    ? 'সম্পূর্ণ PostgreSQL / Supabase সিকিউরিটি স্ক্রিপ্ট'
                    : 'Complete PostgreSQL RLS Migration Script'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'bn'
                  ? 'আপনি যদি ভবিষ্যতে নিজস্ব ডেডিকেটেড ক্লাউড ডাটাবেস রান করেন, এই স্ক্রিপ্ট সরাসরি এক্সিকিউট করতে পারবেন।'
                  : 'Ready-to-run DDL migration script for production PostgreSQL or Supabase instances.'}
              </p>
            </div>

            <button
              onClick={handleCopySql}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy All SQL'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[400px] leading-relaxed">
            {fullSql}
          </pre>
        </div>
      )}
    </div>
  );
};
