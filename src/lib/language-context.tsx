import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'bn' | 'en';

export interface Translations {
  [key: string]: {
    bn: string;
    en: string;
  };
}

export const DICTIONARY: Translations = {
  // Brand
  appName: { bn: 'মানি ক্যানভাস', en: 'Money Canvas' },
  appTagline: { bn: 'ব্যক্তিগত সম্পদ ও ডাবল-এন্ট্রি লেজার', en: 'Wealth & Double-Entry Accounting OS' },

  // Navigation Groups (7 Logical Workflow Domains)
  groupDaily: { bn: 'দৈনন্দিন ক্যাশফ্লো ও হিসাব', en: 'Daily Cash Flow & Accounts' },
  groupSavings: { bn: 'সঞ্চয় ও স্থায়ী আমানত', en: 'Savings & Term Deposits' },
  groupInvestments: { bn: 'শেয়ার বাজার ও বিনিয়োগ', en: 'Investments & Capital Markets' },
  groupDebts: { bn: 'ঋণ, দেনা ও দায়', en: 'Debts & Liabilities' },
  groupPlanning: { bn: 'বাজেট ও আর্থিক পরিকল্পনা', en: 'Planning & Budgets' },
  groupTaxWealth: { bn: 'ট্যাক্স, নিট সম্পদ ও রিপোর্ট', en: 'Tax, Net Worth & Reports' },
  groupSystem: { bn: 'সিস্টেম, ব্যাকআপ ও সেটিংস', en: 'System & Settings' },

  // Navigation items & Header views
  navDashboard: { bn: 'এক্সিকিউটিভ ড্যাশবোর্ড', en: 'Executive Dashboard' },
  navAccounts: { bn: 'অ্যাকাউন্টস ও ব্যালেন্স', en: 'Accounts & Balances' },
  navLedger: { bn: 'আয় ও ব্যয় (লেজার)', en: 'Income & Expenses' },
  navSmsParser: { bn: 'এসএমএস পার্সার (SMS Parser)', en: 'SMS & Alert Parser' },
  navFixedDeposits: { bn: 'স্থায়ী আমানত (FDR)', en: 'Fixed Deposits (FD)' },
  navDps: { bn: 'ডিপিএস একাউন্টস (DPS)', en: 'DPS Accounts' },
  navSanchayaBonds: { bn: 'সঞ্চয়পত্র, বন্ড ও সুকুক ট্র্যাকার', en: 'Sanchayapatra & Treasury Bonds' },
  navGoldFx: { bn: 'বাজুস স্বর্ণের দর ও কারেন্সি এক্সচেঞ্জ', en: 'BAJUS Gold & FX Rates' },
  navBudgets: { bn: 'মাসিক বাজেট ও খরচ সীমা', en: 'Monthly Budgets' },
  navFamilyBudget: { bn: 'ফ্যামিলি বাজেট ও যৌথ খাতা', en: 'Family & Shared Ledgers' },
  navRecurring: { bn: 'পুনরাবৃত্ত বিল ও খরচ', en: 'Recurring & Bills' },
  navGoals: { bn: 'আর্থিক লক্ষ্যসমূহ', en: 'Financial Goals' },
  navFire: { bn: 'রিটায়ারমেন্ট ও ফায়ার ক্যালকুলেটর', en: 'Retirement & FIRE Planner' },
  navDebts: { bn: 'পাওনা ও দেনা (Debts)', en: 'Debts & Receivables' },
  navLoans: { bn: 'লোন ও বন্ধক (Mortgage)', en: 'Loans & Mortgages' },
  navAssets: { bn: 'স্থাবর ও অস্থাবর সম্পদ', en: 'Physical Assets & Liab' },
  navZakat: { bn: 'নিট সম্পদ ও যাকাত হিসাব', en: 'Net Worth & Zakat' },
  navStocks: { bn: 'শেয়ার পোর্টফোলিও ও WAC', en: 'Stock Portfolio & WAC' },
  navBrokerage: { bn: 'বিও অ্যাকাউন্ট ও ব্রোকারেজ', en: 'Brokerages & Cash Ledger' },
  navTrades: { bn: 'শেয়ার ট্রেড ও লেনদেন', en: 'Trade Execution' },
  navPerformance: { bn: 'পারফরম্যান্স ও রিটার্ন (XIRR)', en: 'Performance & Returns' },
  navDividends: { bn: 'ডিভিডেন্ড ও বোনাস শেয়ার', en: 'Dividends & Corporate Actions' },
  navTax: { bn: 'বাংলাদেশ আয়কর ও IT-10B রিটার্ন', en: 'BD Tax & IT-10B Returns' },
  navReports: { bn: 'মূলধনী লাভ ও বার্ষিক রিপোর্ট', en: 'Capital Gains & Reports' },
  navNotifications: { bn: 'নোটিফিকেশন ও অ্যালার্ট', en: 'Alerts & Reminders' },
  navAuditLogs: { bn: 'অ্যাক্টিভিটি ও অডিট ট্রেইল', en: 'Activity & Audit Trail' },
  navAdminUsers: { bn: 'অ্যাপ ব্যবহারকারী ও অ্যাডমিন', en: 'App Users & Admin' },
  navBackupRestore: { bn: 'ব্যাকআপ ও গুগল ড্রাইভ', en: 'Backup & Google Drive' },
  navRls: { bn: 'ডাটা প্রাইভেসি ও নিরাপত্তা (RLS)', en: 'Data Privacy & Protection' },
  navUserGuide: { bn: 'ব্যবহারকারী নির্দেশিকা ও ট্যুর', en: 'App User Guide & Tour' },
  navSettings: { bn: 'পছন্দসমূহ ও প্রোফাইল সেটিংস', en: 'Preferences & Profiles' },

  // Header controls
  quickSearch: { bn: 'দ্রুত অ্যাকশন ও অনুসন্ধান... (⌘K)', en: 'Quick actions & search... (⌘K)' },
  driveSynced: { bn: 'ড্রাইভ সিঙ্কড', en: 'Drive Synced' },
  signIn: { bn: 'সাইন ইন', en: 'Sign In' },
  guide: { bn: 'নির্দেশিকা', en: 'Guide' },
  shortcuts: { bn: 'কীবোর্ড শর্টকাট', en: 'Shortcuts' },
  alerts: { bn: 'আর্থিক অ্যালার্ট', en: 'Financial Alerts' },
  clearAll: { bn: 'সব মুছুন', en: 'Clear all' },
  noAlerts: { bn: 'কোনো সক্রিয় সতর্কবার্তা নেই', en: 'No active financial alerts' },
  toggleLangBn: { bn: 'বাংলা', en: 'Bangla' },
  toggleLangEn: { bn: 'English', en: 'English' },
  langSwitchPrompt: { bn: 'Switch to English (ইংরেজি করুন)', en: 'বাংলা ভাষায় পরিবর্তন করুন' },

  // Mobile Bottom Bar
  mobileDashboard: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  mobileLedger: { bn: 'লেজার', en: 'Ledger' },
  mobilePortfolio: { bn: 'পোর্টফোলিও', en: 'Portfolio' },
  mobileAlerts: { bn: 'অ্যালার্ট', en: 'Alerts' },
  mobileBackup: { bn: 'ব্যাকআপ', en: 'Backup' },

  // Common UI Actions
  save: { bn: 'সংরক্ষণ করুন', en: 'Save' },
  cancel: { bn: 'বাতিল', en: 'Cancel' },
  delete: { bn: 'মুছুন', en: 'Delete' },
  edit: { bn: 'সম্পাদনা', en: 'Edit' },
  add: { bn: 'নতুন যোগ করুন', en: 'Add New' },
  close: { bn: 'বন্ধ করুন', en: 'Close' },
  export: { bn: 'রপ্তানি (Export)', en: 'Export' },
  download: { bn: 'ডাউনলোড', en: 'Download' },
  filter: { bn: 'ফিল্টার', en: 'Filter' },
  all: { bn: 'সব', en: 'All' },
  active: { bn: 'সক্রিয়', en: 'Active' },
  total: { bn: 'মোট', en: 'Total' },
  currencyBDT: { bn: '৳ টাকা', en: 'BDT (৳)' },
  status: { bn: 'অবস্থা', en: 'Status' },
  actions: { bn: 'পদক্ষেপ', en: 'Actions' },
  loading: { bn: 'লোড হচ্ছে...', en: 'Loading...' },
  sync: { bn: 'সিঙ্ক করুন', en: 'Sync Now' },
};

interface LanguageContextType {
  language: Language;
  isBn: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_KEY = 'wealthfolio_language_v1';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'bn' || saved === 'en') {
        return saved;
      }
    }
    // Default to English ('en') as standard interface, with 1-click Bengali ('bn') switch
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'bn' ? 'en' : 'bn'));
  };

  const t = (key: string, fallback?: string): string => {
    const entry = DICTIONARY[key];
    if (entry) {
      return entry[language] || fallback || entry.en;
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isBn: language === 'bn',
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
