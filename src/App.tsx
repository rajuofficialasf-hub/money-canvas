/**
 * Weathfolio — Wealth, Investment & Double-Entry Accounting OS
 */

import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { AuthProvider } from './lib/auth-context';
import { LedgerProvider } from './lib/ledger-context';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { PWAUpdateToast } from './components/pwa/PWAUpdateToast';
import { KeyboardShortcutsModal } from './components/pwa/KeyboardShortcutsModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ClipboardSmsBanner } from './components/common/ClipboardSmsBanner';
import { SyncConflictModal } from './components/common/SyncConflictModal';
import { LedgerHealthBanners } from './components/common/LedgerHealthBanners';
import { Capacitor } from '@capacitor/core';
import { UserGuideModal } from './components/onboarding/UserGuideModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { AuthModal } from './components/auth/AuthModal';
import { BiometricLockScreen } from './components/auth/BiometricLockScreen';
import { EnableBiometricPromptModal } from './components/auth/EnableBiometricPromptModal';
import { UpdateProvider } from './lib/update-context';
import { BiometricProvider } from './lib/biometric-context';
import { useAuth } from './lib/auth-context';
import { LanguageProvider, useLanguage } from './lib/language-context';
import { FamilyProvider } from './lib/family-context';
import { LayoutDashboard, Wallet, TrendingUp, History, Bell } from 'lucide-react';
import { HashRouter, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getViewFromPath, getPathFromView } from './lib/routes';

// STEP-19: every view is code-split so the initial bundle stays small;
// each route chunk loads on first navigation.
const DashboardView = lazy(() => import('./components/views/DashboardView').then((m) => ({ default: m.DashboardView })));
const AccountsView = lazy(() => import('./components/views/AccountsView').then((m) => ({ default: m.AccountsView })));
const LedgerView = lazy(() => import('./components/views/LedgerView').then((m) => ({ default: m.LedgerView })));
const CsvImportView = lazy(() => import('./components/views/CsvImportView').then((m) => ({ default: m.CsvImportView })));
const SmsParserView = lazy(() => import('./components/views/SmsParserView').then((m) => ({ default: m.SmsParserView })));
const FixedDepositsView = lazy(() => import('./components/views/FixedDepositsView').then((m) => ({ default: m.FixedDepositsView })));
const DpsView = lazy(() => import('./components/views/DpsView').then((m) => ({ default: m.DpsView })));
const SanchayaBondsView = lazy(() => import('./components/views/SanchayaBondsView').then((m) => ({ default: m.SanchayaBondsView })));
const GoldFxRatesView = lazy(() => import('./components/views/GoldFxRatesView').then((m) => ({ default: m.GoldFxRatesView })));
const RetirementFireView = lazy(() => import('./components/views/RetirementFireView').then((m) => ({ default: m.RetirementFireView })));
const BudgetsView = lazy(() => import('./components/views/BudgetsView').then((m) => ({ default: m.BudgetsView })));
const FamilyLedgerView = lazy(() => import('./components/views/FamilyLedgerView').then((m) => ({ default: m.FamilyLedgerView })));
const RecurringView = lazy(() => import('./components/views/RecurringView').then((m) => ({ default: m.RecurringView })));
const GoalsView = lazy(() => import('./components/views/GoalsView').then((m) => ({ default: m.GoalsView })));
const DebtsView = lazy(() => import('./components/views/DebtsView').then((m) => ({ default: m.DebtsView })));
const LoansView = lazy(() => import('./components/views/LoansView').then((m) => ({ default: m.LoansView })));
const AssetsView = lazy(() => import('./components/views/AssetsView').then((m) => ({ default: m.AssetsView })));
const ZakatView = lazy(() => import('./components/views/ZakatView').then((m) => ({ default: m.ZakatView })));
const StockPortfolioView = lazy(() => import('./components/views/StockPortfolioView').then((m) => ({ default: m.StockPortfolioView })));
const BrokerageView = lazy(() => import('./components/views/BrokerageView').then((m) => ({ default: m.BrokerageView })));
const StockTradesView = lazy(() => import('./components/views/StockTradesView').then((m) => ({ default: m.StockTradesView })));
const PortfolioAnalyticsView = lazy(() => import('./components/views/PortfolioAnalyticsView').then((m) => ({ default: m.PortfolioAnalyticsView })));
const DividendsAndCorporateActionsView = lazy(() => import('./components/views/DividendsAndCorporateActionsView').then((m) => ({ default: m.DividendsAndCorporateActionsView })));
const FinancialAnalyticsAndReportsView = lazy(() => import('./components/views/FinancialAnalyticsAndReportsView').then((m) => ({ default: m.FinancialAnalyticsAndReportsView })));
const IncomeTaxView = lazy(() => import('./components/views/IncomeTaxView').then((m) => ({ default: m.IncomeTaxView })));
const NotificationsView = lazy(() => import('./components/views/NotificationsView').then((m) => ({ default: m.NotificationsView })));
const AuditLogsView = lazy(() => import('./components/views/AuditLogsView').then((m) => ({ default: m.AuditLogsView })));
const BackupRestoreView = lazy(() => import('./components/views/BackupRestoreView').then((m) => ({ default: m.BackupRestoreView })));
const AdminUsersView = lazy(() => import('./components/views/AdminUsersView').then((m) => ({ default: m.AdminUsersView })));
const RlsInspectorView = lazy(() => import('./components/views/RlsInspectorView').then((m) => ({ default: m.RlsInspectorView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then((m) => ({ default: m.SettingsView })));
const PlayStoreKitView = lazy(() => import('./components/views/PlayStoreKitView').then((m) => ({ default: m.PlayStoreKitView })));
const UserGuideView = lazy(() => import('./components/views/UserGuideView').then((m) => ({ default: m.UserGuideView })));
const PrivacyPolicyView = lazy(() => import('./components/views/PrivacyPolicyView').then((m) => ({ default: m.PrivacyPolicyView })));
const TermsOfServiceView = lazy(() => import('./components/views/TermsOfServiceView').then((m) => ({ default: m.TermsOfServiceView })));
const PublicLandingView = lazy(() => import('./components/views/PublicLandingView').then((m) => ({ default: m.PublicLandingView })));
const DataDeletionRequestView = lazy(() => import('./components/views/DataDeletionRequestView').then((m) => ({ default: m.DataDeletionRequestView })));

const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24" role="status" aria-label="Loading view">
    <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
  </div>
);

function AppContent() {
  const {
    hasCompletedOnboarding,
    completeOnboarding,
    user,
    isAdmin,
    isAuthModalOpen,
    closeAuthModal,
  } = useAuth();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Resolve active view from URL hash route for browser back/forward and deep linking
  const currentView = getViewFromPath(location.pathname);

  const setCurrentView = useCallback(
    (view: string) => {
      navigate(getPathFromView(view));
    },
    [navigate]
  );

  // Stable handlers so the memoized Header/Sidebar do not re-render on every
  // App state change (STEP-20).
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((p) => !p), []);
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const openShortcuts = useCallback(() => setIsShortcutsOpen(true), []);

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

  // Auto open guide modal for new installs/users
  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_wealthfolio_guide_v1');
    if (!hasSeen) {
      setIsGuideModalOpen(true);
    }
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
    navigate('/dashboard');
  };

  // 1. Direct Public Routes (accessible without authentication/onboarding)
  if (currentView === 'privacy' || pathname === '/privacy' || pathname === '/privacy-policy') {
    return <Suspense fallback={<ViewLoader />}><PrivacyPolicyView onBack={() => navigate('/settings')} /></Suspense>;
  }

  if (currentView === 'terms' || pathname === '/terms' || pathname === '/terms-of-service') {
    return <Suspense fallback={<ViewLoader />}><TermsOfServiceView onBack={() => navigate('/settings')} /></Suspense>;
  }

  if (currentView === 'landing' || pathname === '/landing') {
    return <Suspense fallback={<ViewLoader />}><PublicLandingView onLaunchApp={handleLaunchApp} /></Suspense>;
  }

  if (
    currentView === 'data_deletion' ||
    pathname === '/data-deletion' ||
    pathname === '/delete-account' ||
    pathname === '/account-deletion'
  ) {
    return <Suspense fallback={<ViewLoader />}><DataDeletionRequestView onBack={() => navigate('/settings')} /></Suspense>;
  }

  // 2. On Web browsers: If user has not onboarded and hasn't clicked Launch App,
  // show public landing page outlining app purpose & features (avoids Google "behind login page" flag)
  if (!Capacitor.isNativePlatform() && !hasCompletedOnboarding && !webShowApp) {
    return <Suspense fallback={<ViewLoader />}><PublicLandingView onLaunchApp={handleLaunchApp} /></Suspense>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-emerald-500/20 selection:text-emerald-300 pb-24 lg:pb-0">
      {/* Collapsible / Responsive Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Workspace Frame (offset for lg screens where sidebar is 64 / 16rem wide) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Global Top Header */}
        <Header
          currentView={currentView}
          onNavigate={setCurrentView}
          onOpenCommandPalette={openCommandPalette}
          onToggleSidebar={toggleSidebar}
          isMobileSidebarOpen={isSidebarOpen}
          onOpenShortcuts={openShortcuts}
        />

        {/* Dynamic Viewport Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto py-6">
          <ErrorBoundary
            key={currentView}
            viewName={currentView}
            onNavigateHome={() => setCurrentView('dashboard')}
          >
            <Suspense fallback={<ViewLoader />}>
            {currentView === 'dashboard' && (
              <DashboardView
                onNavigate={setCurrentView}
              />
            )}

          {currentView === 'accounts' && <AccountsView />}

          {currentView === 'ledger' && (
            <LedgerView onNavigate={setCurrentView} />
          )}

          {currentView === 'csv_import' && (
            <CsvImportView onNavigate={setCurrentView} />
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
                navigate(stockId ? `/trades?stockId=${encodeURIComponent(stockId)}` : '/trades');
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
              initialStockId={searchParams.get('stockId') || tradeStockId}
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
            (isAdmin ? (
              <RlsInspectorView />
            ) : (
              <DashboardView onNavigate={setCurrentView} />
            ))}

          {currentView === 'settings' && <SettingsView onNavigate={setCurrentView} />}

          {currentView === 'playstore_kit' &&
            (isAdmin ? (
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

            {currentView === 'data_deletion' && (
              <DataDeletionRequestView onBack={() => setCurrentView('settings')} />
            )}
            </Suspense>
          </ErrorBoundary>
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

        {/* FEAT-6: Floating Clipboard SMS Transaction Auto-Detection Prompt */}
        <ClipboardSmsBanner onNavigate={setCurrentView} />

        {/* STEP-15: Multi-device sync fork resolution prompt */}
        <SyncConflictModal />

        {/* STEP-16: Storage quota & ledger integrity warnings */}
        <LedgerHealthBanners />

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
              <UpdateProvider>
                <HashRouter>
                  <AppContent />
                </HashRouter>
              </UpdateProvider>
            </FamilyProvider>
          </LanguageProvider>
        </LedgerProvider>
      </BiometricProvider>
    </AuthProvider>
  );
}
