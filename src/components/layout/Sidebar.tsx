import appIcon from '../../assets/icon.png';
import React from 'react';
import { useAuth } from '../../lib/auth-context';
import { useLedger } from '../../lib/ledger-context';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import {
  LayoutDashboard,
  ShieldCheck,
  Lock,
  Sliders,
  Wallet,
  Building2,
  Landmark,
  Target,
  FileSpreadsheet,
  TrendingUp,
  X,
  PieChart,
  Repeat,
  CalendarClock,
  Users,
  Home,
  Coins,
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
  ArrowUpCircle,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useAppUpdate } from '../../lib/update-context';
import { Capacitor } from '@capacitor/core';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentView,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { user, isAdmin } = useAuth();
  const { systemAlerts } = useLedger();
  const { checkForUpdate, downloadApp, isChecking, currentVersionName } = useAppUpdate();

  const unreadAlertsCount = systemAlerts.length;

  const navItemClass = (viewId: string) => {
    const isActive = currentView === viewId;
    return `group w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all duration-150 ${
      isActive
        ? 'bg-emerald-500/10 text-emerald-400 font-semibold shadow-sm shadow-emerald-950/20'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70'
    }`;
  };

  const handleItemClick = (viewId: string) => {
    onNavigate(viewId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-slate-800/80 bg-slate-950/95 p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {/* Brand Wordmark & Mobile Close */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-900">
            <div className="flex items-center gap-2.5">
              <img
                src={appIcon}
                alt="Money Canvas"
                className="h-8 w-8 rounded-lg shadow-md shadow-emerald-500/20"
              />
              <div>
                <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>Money Canvas</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    OS
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Wealth & Accounting OS
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 lg:hidden transition-colors"
              aria-label="Close Sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Groups */}
          <div className="space-y-4 pt-1">
            {/* 1. Daily Cash Flow & Accounts */}
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Cash Flow & Accounts
              </div>
              <button
                onClick={() => handleItemClick('dashboard')}
                className={navItemClass('dashboard')}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Executive Dashboard</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('accounts')}
                className={navItemClass('accounts')}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Accounts & Balances</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('ledger')}
                className={navItemClass('ledger')}
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Income & Expenses</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('sms_parser')}
                className={navItemClass('sms_parser')}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>SMS Parser</span>
                </div>
              </button>
            </div>

            {/* 2. Savings & Term Deposits */}
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Savings & Deposits
              </div>
              <button
                onClick={() => handleItemClick('dps')}
                className={navItemClass('dps')}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarClock className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>DPS Accounts</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('fixed_deposits')}
                className={navItemClass('fixed_deposits')}
              >
                <div className="flex items-center gap-2.5">
                  <Landmark className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Fixed Deposits (FDR)</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('sanchaya_bonds')}
                className={navItemClass('sanchaya_bonds')}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Sanchayapatra & Bonds</span>
                </div>
              </button>
            </div>

            {/* 3. Investments & Capital Markets */}
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Investments & Markets
              </div>
              <button
                onClick={() => handleItemClick('stocks')}
                className={navItemClass('stocks')}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Stock Portfolio & WAC</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('trades')}
                className={navItemClass('trades')}
              >
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Trade Execution</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('brokerage')}
                className={navItemClass('brokerage')}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>BO & Brokerage Ledger</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('dividends')}
                className={navItemClass('dividends')}
              >
                <div className="flex items-center gap-2.5">
                  <Coins className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Dividends & Actions</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('performance')}
                className={navItemClass('performance')}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Portfolio Analytics & XIRR</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('gold_fx')}
                className={navItemClass('gold_fx')}
              >
                <div className="flex items-center gap-2.5">
                  <Coins className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Gold & FX Rates</span>
                </div>
              </button>
            </div>

            {/* 4. Planning & Budgets */}
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Planning & Budgets
              </div>
              <button
                onClick={() => handleItemClick('budgets')}
                className={navItemClass('budgets')}
              >
                <div className="flex items-center gap-2.5">
                  <PieChart className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Monthly Budgets</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('family_budget')}
                className={navItemClass('family_budget')}
              >
                <div className="flex items-center gap-2.5">
                  <HeartHandshake className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Family & Shared Ledgers</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('recurring')}
                className={navItemClass('recurring')}
              >
                <div className="flex items-center gap-2.5">
                  <Repeat className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Recurring Bills & Subs</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('goals')}
                className={navItemClass('goals')}
              >
                <div className="flex items-center gap-2.5">
                  <Target className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Financial Goals</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('fire')}
                className={navItemClass('fire')}
              >
                <div className="flex items-center gap-2.5">
                  <Flame className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>FIRE & Retirement</span>
                </div>
              </button>
            </div>

            {/* 5. Debts & Liabilities */}
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Debts & Assets
              </div>
              <button
                onClick={() => handleItemClick('debts')}
                className={navItemClass('debts')}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Debts & Receivables</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('loans')}
                className={navItemClass('loans')}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Loans & Mortgages</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('assets')}
                className={navItemClass('assets')}
              >
                <div className="flex items-center gap-2.5">
                  <Home className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Physical Assets</span>
                </div>
              </button>
            </div>

            {/* 6. Tax, Net Worth & Reports */}
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Tax & Reports
              </div>
              <button
                onClick={() => handleItemClick('zakat')}
                className={navItemClass('zakat')}
              >
                <div className="flex items-center gap-2.5">
                  <Coins className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Net Worth & Zakat</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('tax')}
                className={navItemClass('tax')}
              >
                <div className="flex items-center gap-2.5">
                  <Landmark className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Income Tax (IT-10B)</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('reports')}
                className={navItemClass('reports')}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Financial Statements</span>
                </div>
              </button>
            </div>

            {/* 7. System & Utilities */}
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                System & Utilities
              </div>
              <button
                onClick={() => handleItemClick('notifications')}
                className={navItemClass('notifications')}
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Alerts & Reminders</span>
                </div>
                {unreadAlertsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleItemClick('backup_restore')}
                className={navItemClass('backup_restore')}
              >
                <div className="flex items-center gap-2.5">
                  <HardDrive className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Backup & Drive Sync</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('audit_logs')}
                className={navItemClass('audit_logs')}
              >
                <div className="flex items-center gap-2.5">
                  <History className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Audit Trail & Activity</span>
                </div>
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => handleItemClick('admin_users')}
                  className={navItemClass('admin_users')}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 shrink-0 text-purple-400" />
                    <span>User Management</span>
                  </div>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => handleItemClick('rls')}
                  className={navItemClass('rls')}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>RLS Data Protection</span>
                  </div>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => handleItemClick('playstore_kit')}
                  className={navItemClass('playstore_kit')}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    <span>Play Store Kit</span>
                  </div>
                </button>
              )}
              <button
                onClick={() => handleItemClick('user_guide')}
                className={navItemClass('user_guide')}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>User Guide & Tour</span>
                </div>
              </button>
              <button
                onClick={() => handleItemClick('settings')}
                className={navItemClass('settings')}
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Preferences & Settings</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Clean Footer Info Card */}
        <div className="border-t border-slate-900/80 pt-3 mt-2 space-y-2">
          {/* App Auto Update / Download Android App in Sidebar */}
          {Capacitor.isNativePlatform() ? (
            <button
              onClick={() => checkForUpdate(true)}
              disabled={isChecking}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-950/20"
            >
              <div className="flex items-center gap-2">
                {isChecking ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span className="font-semibold">আপডেট চেক করুন</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                {currentVersionName}
              </span>
            </button>
          ) : (
            <button
              onClick={() => downloadApp()}
              disabled={isChecking}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 text-emerald-200 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-950/20"
              title="অ্যান্ড্রয়েড ফোন বা ট্যাবলেটে ব্যবহারের জন্য অ্যাপ ডাউনলোড করুন"
            >
              <div className="flex items-center gap-2">
                {isChecking ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span className="font-semibold text-white">Download App</span>
              </div>
              <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30 font-bold">
                <Download className="h-2.5 w-2.5" />
                <span>APK</span>
              </span>
            </button>
          )}

          <PWAInstallButton variant="sidebar" />

          <div className="rounded-xl bg-slate-900/40 p-2.5 border border-slate-800/60">
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="font-semibold text-white truncate max-w-[130px]">{user.fullName}</span>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-mono text-emerald-400 text-[10px]">Vault Active</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{user.email}</div>
            <div className="text-[10px] text-slate-500 font-sans mt-1.5 flex items-center gap-1.5 pt-1 border-t border-slate-800/40">
              <Lock className="h-3 w-3 text-slate-500 shrink-0" />
              <span className="truncate">100% Offline Vault · Double-Entry OS</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
