import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import {
  Search,
  LayoutDashboard,
  Building2,
  Wallet,
  Landmark,
  ShieldCheck,
  Sliders,
  User,
  X,
  CalendarClock,
  PieChart,
  Repeat,
  Target,
  Users,
  FileSpreadsheet,
  Home,
  Coins,
  TrendingUp,
  ArrowLeftRight,
  Activity,
  Bell,
  History,
  HardDrive,
  BookOpen,
  Flame,
  MessageSquare,
  HeartHandshake,
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { availableProfiles, switchProfile, user } = useAuth();
  const { isBn } = useLanguage();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const NAVIGATION_ITEMS = [
    // 1. Daily Cash Flow & Accounts
    {
      id: 'dashboard',
      title: isBn ? 'এক্সিকিউটিভ ড্যাশবোর্ড ও নিট সম্পদ' : 'Executive Overview & Live Net Worth',
      keywords: 'dashboard net worth summary সারসংক্ষেপ ড্যাশবোর্ড',
      section: isBn ? 'দৈনন্দিন হিসাব' : 'Daily Cash Flow',
      icon: LayoutDashboard,
    },
    {
      id: 'accounts',
      title: isBn ? 'অ্যাকাউন্টস ও ব্যালেন্স ওভারভিউ' : 'Accounts & Balances Overview',
      keywords: 'bank cash wallet হিসাব ব্যাংক ওয়ালেট ব্যালেন্স',
      section: isBn ? 'দৈনন্দিন হিসাব' : 'Daily Cash Flow',
      icon: Building2,
    },
    {
      id: 'ledger',
      title: isBn ? 'ডাবল-এন্ট্রি জেনারেল লেজার ও লেনদেন' : 'Double-Entry General Journal Ledger',
      keywords: 'ledger journal transaction expense income খরচ আয় লেজার লেনদেন',
      section: isBn ? 'দৈনন্দিন হিসাব' : 'Daily Cash Flow',
      icon: Wallet,
    },
    {
      id: 'sms_parser',
      title: isBn ? 'এসএমএস ও নোটিফিকেশন পার্সার (১০০% ফ্রি)' : 'SMS & Push Notification Parser (100% Free)',
      keywords: 'sms bkash nagad rocket parser বিকাশ নগদ রকেট পার্সার মেসেজ নোটিফিকেশন',
      section: isBn ? 'দৈনন্দিন হিসাব' : 'Daily Cash Flow',
      icon: MessageSquare,
    },

    // 2. Savings & Term Deposits
    {
      id: 'dps',
      title: isBn ? 'ডিপিএস একাউন্টস ও কিস্তি' : 'Deposit Pension Scheme (DPS) Accounts',
      keywords: 'dps pension ডিপিএস কিস্তি সঞ্চয়',
      section: isBn ? 'সঞ্চয় ও আমানত' : 'Savings & Deposits',
      icon: CalendarClock,
    },
    {
      id: 'fixed_deposits',
      title: isBn ? 'স্থায়ী আমানত (FDR) পোর্টফোলিও' : 'Fixed Deposits (FD) Portfolio',
      keywords: 'fixed deposit fdr এফডিআর স্থায়ী আমানত মুনাফা',
      section: isBn ? 'সঞ্চয় ও আমানত' : 'Savings & Deposits',
      icon: Landmark,
    },
    {
      id: 'sanchaya_bonds',
      title: isBn ? 'সঞ্চয়পত্র, ট্রেজারি বন্ড ও সুকুক' : 'National Savings Certificates, Treasury Bonds & Sukuk',
      keywords: 'sanchayapatra bonds sukuk সঞ্চয়পত্র বন্ড সুকুক সরকারি',
      section: isBn ? 'সঞ্চয় ও আমানত' : 'Savings & Deposits',
      icon: ShieldCheck,
    },

    // 3. Investments & Capital Markets
    {
      id: 'stocks',
      title: isBn ? 'শেয়ার পোর্টফোলিও ও WAC ক্রয়মূল্য' : 'Stock Portfolio & WAC Holdings',
      keywords: 'stocks dse share portfolio শেয়ার পোর্টফোলিও ডিএসই',
      section: isBn ? 'শেয়ার বাজার ও বিনিয়োগ' : 'Investments & Markets',
      icon: TrendingUp,
    },
    {
      id: 'trades',
      title: isBn ? 'শেয়ার ট্রেড ও লেনদেন এক্সিকিউশন' : 'Stock Trade Execution & Charges',
      keywords: 'trades buy sell ট্রেড ক্রয় বিক্রয় লেনদেন',
      section: isBn ? 'শেয়ার বাজার ও বিনিয়োগ' : 'Investments & Markets',
      icon: ArrowLeftRight,
    },
    {
      id: 'brokerage',
      title: isBn ? 'বিও অ্যাকাউন্ট ও ব্রোকারেজ ক্যাশ' : 'Brokerage Houses & Cash Sub-Ledger',
      keywords: 'brokerage bo cdbl ব্রোকার বিও ক্যাশ',
      section: isBn ? 'শেয়ার বাজার ও বিনিয়োগ' : 'Investments & Markets',
      icon: Building2,
    },
    {
      id: 'dividends',
      title: isBn ? 'ডিভিডেন্ড, বোনাস শেয়ার ও কর রেয়াত' : 'Dividends, Bonus Shares & Corporate Actions',
      keywords: 'dividend bonus corporate ait ডিভিডেন্ড বোনাস লভ্যাংশ',
      section: isBn ? 'শেয়ার বাজার ও বিনিয়োগ' : 'Investments & Markets',
      icon: Coins,
    },
    {
      id: 'performance',
      title: isBn ? 'পোর্টফোলিও পারফরম্যান্স ও রিটার্ন (XIRR)' : 'Portfolio Returns, XIRR & Performance',
      keywords: 'performance returns xirr লাভ রিটার্ন এক্সআইআরআর',
      section: isBn ? 'শেয়ার বাজার ও বিনিয়োগ' : 'Investments & Markets',
      icon: Activity,
    },
    {
      id: 'gold_fx',
      title: isBn ? 'বাজুস স্বর্ণের দর ও কারেন্সি এক্সচেঞ্জ' : 'BAJUS Gold Rates & Foreign Currency Exchange',
      keywords: 'gold bajus fx currency স্বর্ণ সোনা কারেন্সি ডলার বাজুস',
      section: isBn ? 'শেয়ার বাজার ও বিনিয়োগ' : 'Investments & Markets',
      icon: Coins,
    },

    // 4. Debts & Liabilities
    {
      id: 'debts',
      title: isBn ? 'ধার ও দেনা-পাওনা সাব-লেজার' : 'Peer Debts & Personal Lending Sub-Ledger',
      keywords: 'debt receivable payable ধার দেনা পাওনা বন্ধু',
      section: isBn ? 'ঋণ ও দেনা' : 'Debts & Liabilities',
      icon: Users,
    },
    {
      id: 'loans',
      title: isBn ? 'ব্যাংক লোন ও বন্ধক (Mortgage)' : 'Bank Loans & Mortgages Amortization',
      keywords: 'loan mortgage emi লোন ঋণ ইএমআই মর্টগেজ',
      section: isBn ? 'ঋণ ও দেনা' : 'Debts & Liabilities',
      icon: FileSpreadsheet,
    },
    {
      id: 'assets',
      title: isBn ? 'স্থাবর ও অস্থাবর সম্পদ' : 'Physical Assets & Balance Sheet Liabilities',
      keywords: 'assets property gold জমি বাড়ি সম্পদ প্রপার্টি',
      section: isBn ? 'ঋণ ও দেনা' : 'Debts & Liabilities',
      icon: Home,
    },

    // 5. Planning & Budgets
    {
      id: 'budgets',
      title: isBn ? 'মাসিক ক্যাটাগরি বাজেট ও খরচ সীমা' : 'Monthly Category Budgets & Variance',
      keywords: 'budget spending limit বাজেট খরচ সীমা ক্যাটাগরি',
      section: isBn ? 'পরিকল্পনা ও বাজেট' : 'Planning & Budgets',
      icon: PieChart,
    },
    {
      id: 'family_budget',
      title: isBn ? 'ফ্যামিলি বাজেট ও যৌথ খাতা (সংসার খরচ)' : 'Family & Shared Ledgers (Household Budget)',
      keywords: 'family budget shared ledger household grocery bazaar সংসার পরিবার যৌথ বাজেট ক্যাশ বাক্স মেম্বার পারমিশন',
      section: isBn ? 'পরিকল্পনা ও বাজেট' : 'Planning & Budgets',
      icon: HeartHandshake,
    },
    {
      id: 'recurring',
      title: isBn ? 'পুনরাবৃত্ত বিল ও নিয়মিত শিডিউল' : 'Recurring Schedules & Standing Orders',
      keywords: 'recurring bill subscription বিল পুনরাবৃত্তি শিডিউল',
      section: isBn ? 'পরিকল্পনা ও বাজেট' : 'Planning & Budgets',
      icon: Repeat,
    },
    {
      id: 'goals',
      title: isBn ? 'আর্থিক লক্ষ্যসমূহ ট্র্যাকার' : 'Financial Goals Tracker',
      keywords: 'goals target savings লক্ষ্য সঞ্চয় গোলস',
      section: isBn ? 'পরিকল্পনা ও বাজেট' : 'Planning & Budgets',
      icon: Target,
    },
    {
      id: 'fire',
      title: isBn ? 'রিটায়ারমেন্ট ও ফায়ার ক্যালকুলেটর' : 'Retirement & FIRE Calculator',
      keywords: 'fire retirement pension অবসর ফায়ার স্বাধীনতা',
      section: isBn ? 'পরিকল্পনা ও বাজেট' : 'Planning & Budgets',
      icon: Flame,
    },

    // 6. Tax, Net Worth & Reports
    {
      id: 'zakat',
      title: isBn ? 'নিট সম্পদ ও যাকাত হিসাব' : 'Net Worth Consolidation & Zakat Calculation',
      keywords: 'zakat nisab যাকাত নেসাব নিট সম্পদ',
      section: isBn ? 'ট্যাক্স ও নিট সম্পদ' : 'Tax & Net Worth',
      icon: Coins,
    },
    {
      id: 'tax',
      title: isBn ? 'বাংলাদেশ আয়কর ও IT-10B রিটার্ন প্ল্যানার' : 'Bangladesh Income Tax & NBR IT-10B Return Planner',
      keywords: 'tax nbr it10b income tax আয়কর কর এনবিআর রিটার্ন',
      section: isBn ? 'ট্যাক্স ও নিট সম্পদ' : 'Tax & Net Worth',
      icon: Landmark,
    },
    {
      id: 'reports',
      title: isBn ? 'মূলধনী লাভ, কর ও আর্থিক বিবরণী' : 'Capital Gains, Tax & Financial Statements',
      keywords: 'reports balance sheet p&l আর্থিক প্রতিবেদন স্টেটমেন্ট ব্যালেন্স শিট',
      section: isBn ? 'ট্যাক্স ও নিট সম্পদ' : 'Tax & Net Worth',
      icon: FileSpreadsheet,
    },

    // 7. System & Settings
    {
      id: 'notifications',
      title: isBn ? 'আর্থিক অ্যালার্ট ও নোটিফিকেশন' : 'Financial Alerts & Due Reminders',
      keywords: 'notifications alerts reminder সতর্কবার্তা নোটিফিকেশন অ্যালার্ট',
      section: isBn ? 'সিস্টেম ও সেটিংস' : 'System & Settings',
      icon: Bell,
    },
    {
      id: 'backup_restore',
      title: isBn ? 'ডাটা ব্যাকআপ ও গুগল ড্রাইভ সিঙ্ক' : 'Data Backup, Snapshot Export & Restore',
      keywords: 'backup drive sync restore ব্যাকআপ ড্রাইভ ক্লাউড',
      section: isBn ? 'সিস্টেম ও সেটিংস' : 'System & Settings',
      icon: HardDrive,
    },
    {
      id: 'audit_logs',
      title: isBn ? 'ফরেনসিক অডিট ট্রেইল ও সিকিউরিটি চেইন' : 'Forensic Audit Trail & Integrity Hash Chain',
      keywords: 'audit logs security অডিট লগ নিরাপত্তা ট্রেইল',
      section: isBn ? 'সিস্টেম ও সেটিংস' : 'System & Settings',
      icon: History,
    },
    {
      id: 'admin_users',
      title: isBn ? 'রেজিস্টার্ড ব্যবহারকারী ও অ্যাডমিন' : 'Registered App Users & Firebase Admin',
      keywords: 'admin users firebase অ্যাডমিন ইউজার ফায়ারবেস',
      section: isBn ? 'সিস্টেম ও সেটিংস' : 'System & Settings',
      icon: Users,
    },
    {
      id: 'rls',
      title: isBn ? 'ডাটা প্রাইভেসি ও অ্যাক্সেস কন্ট্রোল (RLS)' : 'Access Control & Data Security',
      keywords: 'rls security privacy নিরাপত্তা প্রাইভেসি আরএলএস',
      section: isBn ? 'সিস্টেম ও সেটিংস' : 'System & Settings',
      icon: ShieldCheck,
    },
    {
      id: 'playstore_kit',
      title: isBn ? 'গুগল প্লে স্টোর পাবলিশিং কিট ও অ্যাসেটস' : 'Play Store Assets, Graphics & Publishing Kit',
      keywords: 'playstore play console icon banner screenshot publishing প্লে স্টোর আইকন ব্যানার স্ক্রিনশট পাবলিশ',
      section: isBn ? 'সিস্টেম ও সেটিংস' : 'System & Settings',
      icon: Smartphone,
    },
    {
      id: 'user_guide',
      title: isBn ? 'ব্যবহারকারী সহায়িকা ও ইন্টারঅ্যাক্টিভ ট্যুর' : 'App User Guide & Interactive Walkthrough',
      keywords: 'guide help tour নির্দেশিকা সাহায্য গাইড',
      section: isBn ? 'সিস্টেম ও সেটিংস' : 'System & Settings',
      icon: BookOpen,
    },
    {
      id: 'settings',
      title: isBn ? 'ইউজার প্রোফাইল ও অ্যাপ পছন্দসমূহ' : 'User Profile & Preferences',
      keywords: 'settings preferences profile সেটিংস প্রোফাইল পছন্দ',
      section: isBn ? 'সিস্টেম ও সেটিংস' : 'System & Settings',
      icon: Sliders,
    },
  ];

  const isOwner = user.role === 'admin' || user.email?.toLowerCase() === 'raju.official.asf@gmail.com';

  const filteredNav = NAVIGATION_ITEMS.filter((item) => {
    if ((item.id === 'admin_users' || item.id === 'rls') && user.role !== 'admin') {
      return false;
    }
    if (item.id === 'playstore_kit' && !isOwner) {
      return false;
    }
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.toLowerCase().includes(q))
    );
  });

  const filteredProfiles = availableProfiles.filter((p) =>
    p.fullName.toLowerCase().includes(query.toLowerCase()) || p.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden font-sans text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3 bg-slate-950">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search commands, navigate, or switch profiles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-white rounded"
            aria-label="Close Command Palette"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Navigation Links */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Go to Screen
              </div>
              <div className="space-y-0.5">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{item.section}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Profiles Switcher */}
          {filteredProfiles.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Switch Profile
              </div>
              <div className="space-y-0.5">
                {filteredProfiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchProfile(p.id);
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      p.id === user.id
                        ? 'bg-emerald-950/40 text-emerald-300 font-medium'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <div>
                        <div>{p.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.email}</div>
                      </div>
                    </div>
                    {p.id === user.id && (
                      <span className="text-[10px] font-mono text-emerald-400">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Navigate with mouse or ESC to close</span>
          <span>Weathfolio OS</span>
        </div>
      </div>
    </div>
  );
};
