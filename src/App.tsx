/**
 * Weathfolio — Wealth, Investment & Double-Entry Accounting OS
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './lib/auth-context';
import { LedgerProvider } from './lib/ledger-context';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { PWAUpdateToast } from './components/pwa/PWAUpdateToast';
import { KeyboardShortcutsModal } from './components/pwa/KeyboardShortcutsModal';
import { DashboardView } from './components/views/DashboardView';
import { AccountsView } from './components/views/AccountsView';
import { LedgerView } from './components/views/LedgerView';
import { SmsParserView } from './components/views/SmsParserView';
import { FixedDepositsView } from './components/views/FixedDepositsView';
import { DpsView } from './components/views/DpsView';
import { SanchayaBondsView } from './components/views/SanchayaBondsView';
import { GoldFxRatesView } from './components/views/GoldFxRatesView';
import { RetirementFireView } from './components/views/RetirementFireView';
import { BudgetsView } from './components/views/BudgetsView';
import { FamilyLedgerView } from './components/views/FamilyLedgerView';
import { RecurringView } from './components/views/RecurringView';
import { GoalsView } from './components/views/GoalsView';
import { DebtsView } from './components/views/DebtsView';
import { LoansView } from './components/views/LoansView';
import { AssetsView } from './components/views/AssetsView';
import { ZakatView } from './components/views/ZakatView';
import { StockPortfolioView } from './components/views/StockPortfolioView';
import { BrokerageView } from './components/views/BrokerageView';
import { StockTradesView } from './components/views/StockTradesView';
import { PortfolioAnalyticsView } from './components/views/PortfolioAnalyticsView';
import { DividendsAndCorporateActionsView } from './components/views/DividendsAndCorporateActionsView';
import { FinancialAnalyticsAndReportsView } from './components/views/FinancialAnalyticsAndReportsView';
import { IncomeTaxView } from './components/views/IncomeTaxView';
import { NotificationsView } from './components/views/NotificationsView';
import { AuditLogsView } from './components/views/AuditLogsView';
import { BackupRestoreView } from './components/views/BackupRestoreView';
import { AdminUsersView } from './components/views/AdminUsersView';
import { RlsInspectorView } from './components/views/RlsInspectorView';
import { SettingsView } from './components/views/SettingsView';
import { PlayStoreKitView } from './components/views/PlayStoreKitView';
import { UserGuideView } from './components/views/UserGuideView';
import { PrivacyPolicyView } from './components/views/PrivacyPolicyView';
import { TermsOfServiceView } from './components/views/TermsOfServiceView';
import { PublicLandingView } from './components/views/PublicLandingView';
import { Capacitor } from '@capacitor/core';
import { UserGuideModal } from './components/onboarding/UserGuideModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { AuthModal } from './components/auth/AuthModal';
import { BiometricLockScreen } from './components/auth/BiometricLockScreen';
import { EnableBiometricPromptModal } from './components/auth/EnableBiometricPromptModal';
import { AppUpdateModal } from './components/common/AppUpdateModal';
import { checkForAppUpdate, isUpdateDismissed, AppUpdateInfo } from './lib/github-updater';
import { BiometricProvider } from './lib/biometric-context';
import { useAuth } from './lib/auth-context';
import { LanguageProvider, useLanguage } from './lib/language-context';
import { FamilyProvider } from './lib/family-context';
import { LayoutDashboard, Wallet, TrendingUp, History, Bell } from 'lucide-react';

function AppContent() {
  const {
    hasCompletedOnboarding,
    completeOnboarding,
    user,
    isAuthModalOpen,
    closeAuthModal,
  } = useAuth();
  const { language, t } = useLanguage();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [tradeStockId, setTradeStockId] = useState<string | undefined>(undefined);
  const [webShowApp, setWebShowApp] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.search.includes('app=true') ||
        Boolean(localStorage.getItem('mc_enter_app'))
      );
    }
    return false;
  });

  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : ''
  );

  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Auto open guide modal for new installs/users
  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_wealthfolio_guide_v1');
    if (!hasSeen) {
      setIsGuideModalOpen(true);
    }
  }, []);

  // Silent GitHub Releases APK Auto-Update check (3.5s after launch)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const info = await checkForAppUpdate(false);
        if (info.hasUpdate && !isUpdateDismissed(info.latestVersion)) {
          setAppUpdateInfo(info);
          setIsUpdateModalOpen(true);
        }
      } catch (err) {
        console.warn('Auto update check failed:', err);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  // Global Keyboard Shortcuts (⌘K, ⌘N, ⌘T, ⌘L, ⌘B, ⌘/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCurrentView('ledger');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setCurrentView('trades');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setCurrentView('ledger');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCurrentView('backup_restore');
      } else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLaunchApp = () => {
    try {
      localStorage.setItem('mc_enter_app', 'true');
    } catch {}
    setWebShowApp(true);
    if (typeof window !== 'undefined' && window.location.pathname === '/landing') {
      try {
        window.history.pushState({}, '', '/');
      } catch {}
      setPathname('/');
    }
  };

  // 1. Direct Public Routes (accessible without authentication/onboarding)
  if (pathname === '/privacy' || pathname === '/privacy-policy') {
    return (
      <PrivacyPolicyView
        onBack={() => {
          if (typeof window !== 'undefined') {
            try {
              window.history.pushState({}, '', '/');
            } catch {}
            setPathname('/');
          }
        }}
      />
    );
  }

  if (pathname === '/terms' || pathname === '/terms-of-service') {
    return (
      <TermsOfServiceView
        onBack={() => {
          if (typeof window !== 'undefined') {
            try {
              window.history.pushState({}, '', '/');
            } catch {}
            setPathname('/');
          }
        }}
      />
    );
  }

  if (pathname === '/landing') {
    return <PublicLandingView onLaunchApp={handleLaunchApp} />;
  }

  // 2. On Web browsers: If user has not onboarded and hasn't clicked Launch App,
  // show public landing page outlining app purpose & features (avoids Google "behind login page" flag)
  if (!Capacitor.isNativePlatform() && !hasCompletedOnboarding && !webShowApp) {
    return <PublicLandingView onLaunchApp={handleLaunchApp} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-emerald-500/20 selection:text-emerald-300 pb-24 lg:pb-0">
      {/* Collapsible / Responsive Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace Frame (offset for lg screens where sidebar is 64 / 16rem wide) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Global Top Header */}
        <Header
          currentView={currentView}
          onNavigate={setCurrentView}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isMobileSidebarOpen={isSidebarOpen}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />

        {/* Dynamic Viewport Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto py-6">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'accounts' && <AccountsView />}

          {currentView === 'ledger' && (
            <LedgerView onNavigate={setCurrentView} />
          )}

          {currentView === 'sms_parser' && (
            <SmsParserView onNavigate={setCurrentView} />
          )}

          {currentView === 'fixed_deposits' && <FixedDepositsView />}

          {currentView === 'dps' && <DpsView />}

          {currentView === 'sanchaya_bonds' && (
            <SanchayaBondsView onNavigate={setCurrentView} />
          )}

          {currentView === 'gold_fx' && (
            <GoldFxRatesView onNavigate={setCurrentView} />
          )}

          {currentView === 'fire' && (
            <RetirementFireView onNavigate={setCurrentView} />
          )}

          {currentView === 'budgets' && <BudgetsView />}
          {currentView === 'family_budget' && <FamilyLedgerView />}

          {currentView === 'recurring' && <RecurringView />}

          {currentView === 'goals' && <GoalsView />}

          {currentView === 'debts' && <DebtsView />}

          {currentView === 'loans' && <LoansView />}

          {currentView === 'assets' && <AssetsView />}

          {currentView === 'zakat' && <ZakatView />}

          {currentView === 'stocks' && (
            <StockPortfolioView
              onNavigateToTrades={(stockId) => {
                setTradeStockId(stockId);
                setCurrentView('trades');
              }}
              onNavigateToBrokerage={() => setCurrentView('brokerage')}
              onNavigateToPerformance={() => setCurrentView('performance')}
              onNavigateToDividends={() => setCurrentView('dividends')}
              onNavigateToReports={() => setCurrentView('reports')}
            />
          )}

          {currentView === 'brokerage' && (
            <BrokerageView
              onNavigateToTrades={() => setCurrentView('trades')}
            />
          )}

          {currentView === 'trades' && (
            <StockTradesView
              initialStockId={tradeStockId}
              onNavigateToPortfolio={() => setCurrentView('stocks')}
              onNavigateToBrokerage={() => setCurrentView('brokerage')}
            />
          )}

          {currentView === 'performance' && (
            <PortfolioAnalyticsView
              onNavigateToPortfolio={() => setCurrentView('stocks')}
              onNavigateToTrades={() => setCurrentView('trades')}
            />
          )}

          {currentView === 'dividends' && <DividendsAndCorporateActionsView />}

          {currentView === 'reports' && (
            <FinancialAnalyticsAndReportsView
              onNavigateToPortfolio={() => setCurrentView('stocks')}
              onNavigateToTrades={() => setCurrentView('trades')}
              onNavigateToDividends={() => setCurrentView('dividends')}
            />
          )}

          {currentView === 'tax' && <IncomeTaxView />}

          {currentView === 'notifications' && (
            <NotificationsView onNavigate={setCurrentView} />
          )}

          {currentView === 'audit_logs' && <AuditLogsView />}

          {currentView === 'admin_users' &&
            (user.role === 'admin' ? (
              <AdminUsersView />
            ) : (
              <DashboardView onNavigate={setCurrentView} />
            ))}

          {currentView === 'backup_restore' && <BackupRestoreView />}

          {currentView === 'rls' &&
            (user.role === 'admin' ? (
              <RlsInspectorView />
            ) : (
              <DashboardView onNavigate={setCurrentView} />
            ))}

          {currentView === 'settings' && <SettingsView onNavigate={setCurrentView} />}

          {currentView === 'playstore_kit' &&
            (user.role === 'admin' || user.email?.toLowerCase() === 'raju.official.asf@gmail.com' ? (
              <PlayStoreKitView onNavigate={setCurrentView} />
            ) : (
              <DashboardView onNavigate={setCurrentView} />
            ))}

          {currentView === 'user_guide' && <UserGuideView />}

          {currentView === 'privacy' && (
            <PrivacyPolicyView onBack={() => setCurrentView('settings')} />
          )}

          {currentView === 'terms' && (
            <TermsOfServiceView onBack={() => setCurrentView('settings')} />
          )}
        </main>

        {/* Global Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={setCurrentView}
        />

        {/* Global Keyboard Shortcuts Guide Modal */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        {/* Interactive App User Guide Tour */}
        <UserGuideModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
          autoOpened={true}
        />

        {/* First-Time User Onboarding & Setup */}
        <OnboardingModal
          isOpen={!hasCompletedOnboarding}
          onComplete={completeOnboarding}
        />

        {/* Global Google Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
        />

        {/* Biometric Native App Lock Screen */}
        <BiometricLockScreen />

        {/* Post Google-Login Biometric Enable Prompt */}
        <EnableBiometricPromptModal />

        {/* Offline Connectivity Status Toast */}
        <OfflineIndicator />

        {/* PWA New Code Update Notification Toast */}
        <PWAUpdateToast />

        {/* GitHub Releases In-App Auto-Updater Modal */}
        {appUpdateInfo && (
          <AppUpdateModal
            updateInfo={appUpdateInfo}
            isOpen={isUpdateModalOpen}
            onClose={() => setIsUpdateModalOpen(false)}
          />
        )}

        {/* Mobile Bottom Quick-Access Bar (visible on < lg) */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-2xl"
        >
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl text-[10px] font-mono transition-all active:scale-95 ${
              currentView === 'dashboard'
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5 mb-0.5" />
            <span>{t('mobileDashboard', 'Dashboard')}</span>
          </button>
          <button
            onClick={() => setCurrentView('ledger')}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl text-[10px] font-mono transition-all active:scale-95 ${
              currentView === 'ledger'
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="h-4.5 w-4.5 mb-0.5" />
            <span>{t('mobileLedger', 'Ledger')}</span>
          </button>
          <button
            onClick={() => setCurrentView('stocks')}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl text-[10px] font-mono transition-all active:scale-95 ${
              currentView === 'stocks'
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="h-4.5 w-4.5 mb-0.5" />
            <span>{t('mobilePortfolio', 'Portfolio')}</span>
          </button>
          <button
            onClick={() => setCurrentView('notifications')}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl text-[10px] font-mono transition-all active:scale-95 ${
              currentView === 'notifications'
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="h-4.5 w-4.5 mb-0.5" />
            <span>{t('mobileAlerts', 'Alerts')}</span>
          </button>
          <button
            onClick={() => setCurrentView('backup_restore')}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl text-[10px] font-mono transition-all active:scale-95 ${
              currentView === 'backup_restore'
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-4.5 w-4.5 mb-0.5" />
            <span>{t('mobileBackup', 'Backup')}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BiometricProvider>
        <LedgerProvider>
          <LanguageProvider>
            <FamilyProvider>
              <AppContent />
            </FamilyProvider>
          </LanguageProvider>
        </LedgerProvider>
      </BiometricProvider>
    </AuthProvider>
  );
}
