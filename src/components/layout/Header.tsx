import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useLedger } from '../../lib/ledger-context';
import { useBiometrics } from '../../lib/biometric-context';
import {
  Search,
  Shield,
  ChevronDown,
  Users,
  LogOut,
  Sliders,
  Bell,
  Menu,
  ArrowRight,
  HardDrive,
  Keyboard,
  ShieldCheck,
  BookOpen,
  Fingerprint,
  X,
  Trash2,
  ArrowUpCircle,
  RefreshCw,
  Download,
  Smartphone,
} from 'lucide-react';
import { useAppUpdate } from '../../lib/update-context';
import { Capacitor } from '@capacitor/core';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  onOpenShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  currentView,
  onNavigate,
  onOpenCommandPalette,
  onToggleSidebar,
  onOpenShortcuts,
}) => {
  const {
    user,
    signOut,
    isGoogleAuthenticated,
    openAuthModal,
  } = useAuth();
  const { isBiometricEnabled, lockApp } = useBiometrics();
  const { systemAlerts, dismissAlert } = useLedger();
  const { checkForUpdate, downloadApp, isChecking, currentVersionName } = useAppUpdate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAlertsMenuOpen, setIsAlertsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setIsAlertsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getViewMeta = () => {
    switch (currentView) {
      // 1. Daily Cash Flow & Accounts
      case 'dashboard':
        return { category: 'Cash Flow', title: 'Executive Dashboard' };
      case 'accounts':
        return { category: 'Cash Flow', title: 'Accounts & Balances' };
      case 'ledger':
        return { category: 'Cash Flow', title: 'Income & Expenses (Ledger)' };
      case 'sms_parser':
        return { category: 'Cash Flow', title: 'SMS & Notification Parser' };

      // 2. Savings & Term Deposits
      case 'dps':
        return { category: 'Savings & Deposits', title: 'Deposit Pension Scheme (DPS)' };
      case 'fixed_deposits':
        return { category: 'Savings & Deposits', title: 'Fixed Deposits (FDR)' };
      case 'sanchaya_bonds':
        return { category: 'Savings & Deposits', title: 'Sanchayapatra & Treasury Bonds' };

      // 3. Investments & Capital Markets
      case 'stocks':
        return { category: 'Investments', title: 'Stock Portfolio & WAC' };
      case 'trades':
        return { category: 'Investments', title: 'Trade Execution' };
      case 'brokerage':
        return { category: 'Investments', title: 'BO Accounts & Brokerage Cash' };
      case 'dividends':
        return { category: 'Investments', title: 'Dividends & Corporate Actions' };
      case 'performance':
        return { category: 'Investments', title: 'Portfolio Performance & XIRR' };
      case 'gold_fx':
        return { category: 'Investments', title: 'Gold & Currency Rates' };

      // 4. Debts & Liabilities
      case 'debts':
        return { category: 'Debts & Credit', title: 'Debts & Receivables' };
      case 'loans':
        return { category: 'Debts & Credit', title: 'Loans & Mortgages' };
      case 'assets':
        return { category: 'Debts & Credit', title: 'Physical Assets' };

      // 5. Planning & Budgets
      case 'budgets':
        return { category: 'Planning', title: 'Budgets & Expense Ceilings' };
      case 'family_budget':
        return { category: 'Planning', title: 'Family & Shared Ledgers' };
      case 'recurring':
        return { category: 'Planning', title: 'Recurring Bills & Schedules' };
      case 'goals':
        return { category: 'Planning', title: 'Financial Goals' };
      case 'fire':
        return { category: 'Planning', title: 'FIRE & Retirement Projection' };

      // 6. Tax, Net Worth & Reports
      case 'zakat':
        return { category: 'Tax & Wealth', title: 'Net Worth & Zakat (Nisab)' };
      case 'tax':
        return { category: 'Tax & Wealth', title: 'Income Tax & IT-10B' };
      case 'reports':
        return { category: 'Tax & Wealth', title: 'Financial Reports & Statements' };

      // 7. System & Settings
      case 'notifications':
        return { category: 'System', title: 'Alerts & Reminders' };
      case 'backup_restore':
        return { category: 'System', title: 'Backup & Google Drive' };
      case 'audit_logs':
        return { category: 'System', title: 'Audit Trail & Logs' };
      case 'admin_users':
        return { category: 'System', title: 'App Users & Admin' };
      case 'rls':
        return { category: 'System', title: 'Data Privacy & RLS' };
      case 'user_guide':
        return { category: 'System', title: 'User Guide & Tutorial' };
      case 'settings':
        return { category: 'System', title: 'Settings & Profile' };
      case 'playstore_kit':
        return { category: 'System', title: 'Google Play Store Kit' };
      default:
        return { category: 'Finance OS', title: 'Overview' };
    }
  };

  const viewMeta = getViewMeta();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 sm:px-6 backdrop-blur-xl">
      {/* Left: Mobile menu toggle & Crisp Breadcrumb Header */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 lg:hidden transition-colors shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline text-xs font-medium text-slate-500 shrink-0">
            {viewMeta.category}
          </span>
          <span className="hidden sm:inline text-slate-700 text-xs">/</span>
          <h1 className="text-sm font-semibold text-white truncate tracking-tight">
            {viewMeta.title}
          </h1>
        </div>
      </div>

      {/* Middle: Minimalist Command Palette Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-300 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            <span className="text-slate-400">Search commands, accounts or records...</span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-700/80 bg-slate-800/80 text-[10px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Streamlined, Uncluttered Utility Hub */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          aria-label="Quick Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Quick App Update / Download Button */}
        {Capacitor.isNativePlatform() ? (
          <button
            onClick={() => checkForUpdate(true)}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-950/20"
            title="অ্যাপের নতুন ভার্সন চেক করুন"
          >
            {isChecking ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span className="font-mono text-[11px] font-bold text-emerald-400">{currentVersionName}</span>
            <span className="hidden sm:inline text-[11px] font-medium text-emerald-300">আপডেট</span>
          </button>
        ) : (
          <button
            onClick={() => downloadApp()}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-950/20 group"
            title="মোবাইলের জন্য অ্যান্ড্রয়েড APK অ্যাপ ডাউনলোড করুন"
          >
            {isChecking ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <Smartphone className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-medium text-white text-[11px] sm:text-xs">Download App</span>
            <Download className="h-3 w-3 text-emerald-400 hidden sm:inline" />
          </button>
        )}

        {/* Sync Status Badge (Compact & Clean) */}
        {isGoogleAuthenticated ? (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
            title="Google Drive Auto Sync Active"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <HardDrive className="h-3.5 w-3.5 ml-0.5" />
            <span className="text-[11px] font-mono hidden xl:inline">Drive Synced</span>
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Live Notification Bell with Dropdown */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setIsAlertsMenuOpen(!isAlertsMenuOpen)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
            aria-label="View Financial Alerts"
          >
            <Bell className="h-4 w-4" />
            {systemAlerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
            )}
          </button>

          {/* Quick Alerts Dropdown */}
          {isAlertsMenuOpen && (
            <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-96 rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl z-50 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 px-1">
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  <Bell className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Financial Alerts ({systemAlerts.length})</span>
                </div>
                <div className="flex items-center gap-2.5">
                  {systemAlerts.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        systemAlerts.forEach((a) => dismissAlert(a.id));
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                      title="Clear all alerts"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onNavigate('notifications');
                      setIsAlertsMenuOpen(false);
                    }}
                    className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-slate-800/40 pr-0.5">
                {systemAlerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 font-mono">
                    No active alerts. All accounts healthy!
                  </div>
                ) : (
                  systemAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-2 rounded-lg hover:bg-slate-900 transition-colors space-y-1 pt-2 group relative"
                    >
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <span
                          onClick={() => {
                            onNavigate(alert.targetView || 'notifications');
                            setIsAlertsMenuOpen(false);
                          }}
                          className={`font-semibold cursor-pointer hover:underline flex-1 truncate ${
                            alert.severity === 'critical'
                              ? 'text-rose-400'
                              : alert.severity === 'warning'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {alert.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {alert.dueDate && (
                            <span className="text-[10px] font-mono text-slate-500">{alert.dueDate}</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissAlert(alert.id);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Dismiss notification"
                            aria-label="Clear alert"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p
                        onClick={() => {
                          onNavigate(alert.targetView || 'notifications');
                          setIsAlertsMenuOpen(false);
                        }}
                        className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed cursor-pointer"
                      >
                        {alert.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
                <span>{systemAlerts.length} Active Alert{systemAlerts.length === 1 ? '' : 's'}</span>
                <button
                  onClick={() => {
                    onNavigate('notifications');
                    setIsAlertsMenuOpen(false);
                  }}
                  className="text-slate-300 hover:text-white"
                >
                  Manage Reminders
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Comprehensive Action Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-xs transition-all"
            aria-label="User Menu"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-6 w-6 rounded-md object-cover border border-emerald-500/40"
              />
            ) : (
              <div className="h-6 w-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-mono font-semibold text-emerald-300 text-xs">
                {user.fullName.charAt(0)}
              </div>
            )}

            <div className="hidden xl:block text-left">
              <div className="text-white font-medium leading-none text-xs truncate max-w-[100px]">
                {user.fullName}
              </div>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>

          {/* Clean User Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl z-50 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
              {/* Active Profile Info */}
              <div className="p-2.5 border-b border-slate-800/80 mb-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white truncate">{user.fullName}</div>
                  {isGoogleAuthenticated ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                      Google Account
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 text-slate-400 rounded">
                      Local Vault
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{user.email}</div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-emerald-400">
                  <Shield className="h-3 w-3" />
                  <span className="truncate">UID: {user.id.slice(0, 14)}...</span>
                </div>
              </div>

              {/* Google Sign-in / Cloud Status Banner */}
              {!isGoogleAuthenticated && (
                <div className="p-2 border-b border-slate-800/80 mb-1 space-y-1.5">
                  <button
                    onClick={() => {
                      openAuthModal();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Sign In with Google</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">
                    Enable automatic Google Drive backups and cloud sync.
                  </p>
                </div>
              )}

              {/* Dropdown Menu Items */}
              <div className="space-y-0.5 py-1">
                {user.role === 'admin' && (
                  <button
                    onClick={() => {
                      onNavigate('admin_users');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-900 flex items-center gap-2.5 text-xs transition-colors"
                  >
                    <Users className="h-3.5 w-3.5 text-purple-400" />
                    <span>Admin Panel & Users</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onNavigate('user_guide');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-900 flex items-center gap-2.5 text-xs transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                  <span>User Guide & Tour</span>
                </button>

                {onOpenShortcuts && (
                  <button
                    onClick={() => {
                      onOpenShortcuts();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-900 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Keyboard className="h-3.5 w-3.5 text-slate-400" />
                      <span>Keyboard Shortcuts</span>
                    </div>
                    <kbd className="text-[10px] font-mono text-slate-500">⌘/</kbd>
                  </button>
                )}

                <button
                  onClick={() => {
                    onNavigate('backup_restore');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-900 flex items-center gap-2.5 text-xs transition-colors"
                >
                  <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Backup & Drive Sync</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('settings');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-900 flex items-center gap-2.5 text-xs transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                  <span>App Preferences</span>
                </button>

                {Capacitor.isNativePlatform() ? (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      checkForUpdate(true);
                    }}
                    disabled={isChecking}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-emerald-300 hover:bg-emerald-950/30 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isChecking ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      <span>Check for Updates</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {currentVersionName}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      downloadApp();
                    }}
                    disabled={isChecking}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-emerald-300 hover:bg-emerald-950/30 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isChecking ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      <span>Download Android App</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/90 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      <Download className="h-2.5 w-2.5" />
                      <span>APK</span>
                    </span>
                  </button>
                )}

                {isBiometricEnabled && (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      lockApp();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/30 flex items-center gap-2.5 text-xs transition-colors"
                  >
                    <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Lock App Now</span>
                  </button>
                )}
              </div>

              {/* Sign Out / Switch Profile */}
              <div className="border-t border-slate-800/80 pt-1 mt-1">
                <button
                  onClick={() => {
                    signOut();
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 flex items-center gap-2.5 text-xs transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-400" />
                  <span>{isGoogleAuthenticated ? 'Sign Out Google' : 'Switch Profile'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
