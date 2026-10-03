import React from 'react';
import appIcon from '../../assets/icon.png';
import {
  TrendingUp,
  ShieldCheck,
  Lock,
  PieChart,
  ArrowRight,
  Database,
  Building2,
  Receipt,
  Download,
} from 'lucide-react';
import { GITHUB_LATEST_APK_URL } from '../../lib/app-version';

export const PublicLandingView: React.FC<{ onLaunchApp: () => void }> = ({ onLaunchApp }) => {
  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-accent/20 selection:text-accent-strong">
      {/* Top Navbar */}
      <header className="border-b border-edge/80 bg-canvas/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={appIcon}
              alt="Money Canvas"
              className="w-9 h-9 rounded-xl shadow-lg shadow-emerald-500/20"
            />
            <div>
              <span className="font-bold text-lg text-ink tracking-tight">Money Canvas</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-accent-strong font-mono bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                Wealth OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <a href="/privacy" className="text-xs sm:text-sm text-ink-muted hover:text-ink transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-xs sm:text-sm text-ink-muted hover:text-ink transition-colors">
              Terms
            </a>
            <button
              type="button"
              onClick={onLaunchApp}
              className="px-4 py-2 bg-accent hover:bg-accent-strong text-accent-ink font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <span>Launch App</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-edge text-ink-soft text-xs mb-8">
          <ShieldCheck className="h-4 w-4 text-accent-strong" />
          <span>Private, Secure & Cloud-Synchronized Personal Finance</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-ink tracking-tight max-w-4xl mx-auto leading-tight">
          Master Your Net Worth with <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Money Canvas
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed">
          Comprehensive personal accounting, multi-asset portfolio tracking, banking management, and financial analytics — engineered with privacy-first architecture.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="w-full sm:w-auto px-8 py-3.5 bg-accent hover:bg-accent-strong text-accent-ink font-bold rounded-xl shadow-xl shadow-emerald-500/25 transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>Open Money Canvas</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href={GITHUB_LATEST_APK_URL}
            rel="noopener"
            className="w-full sm:w-auto px-6 py-3.5 bg-surface hover:bg-raised text-accent-strong border border-accent/30 font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Download Android App (APK)</span>
          </a>
          <a
            href="/privacy"
            className="w-full sm:w-auto px-6 py-3.5 bg-surface hover:bg-raised text-ink-soft border border-edge font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck className="h-4 w-4 text-ink-muted" />
            <span>Read Privacy Policy</span>
          </a>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-edge-soft">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Designed for Complete Financial Mastery
          </h2>
          <p className="mt-3 text-sm text-ink-muted">
            From daily petty cash to long-term wealth, Money Canvas provides an all-in-one institutional-grade financial dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface/50 border border-edge rounded-2xl p-6 hover:border-edge-strong transition-all">
            <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent-strong flex items-center justify-center mb-4">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink">Double-Entry Accounting</h3>
            <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Every taka or dollar is tracked with precision. Balance sheets, income statements, and cash flows update automatically with zero discrepancies.
            </p>
          </div>

          <div className="bg-surface/50 border border-edge rounded-2xl p-6 hover:border-edge-strong transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink">Investment & Stock Portfolio</h3>
            <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Monitor capital gains, dividends, stock allocations (DSE / International), and track real-time portfolio valuation without manual spreadsheets.
            </p>
          </div>

          <div className="bg-surface/50 border border-edge rounded-2xl p-6 hover:border-edge-strong transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink">Banking, DPS & Fixed Deposits</h3>
            <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Manage multiple bank accounts, recurring monthly savings (DPS), maturity schedules, and asset amortization with ease.
            </p>
          </div>

          <div className="bg-surface/50 border border-edge rounded-2xl p-6 hover:border-edge-strong transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink">Smart Budgets & Analytics</h3>
            <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Set monthly category allowances, monitor burn rates, and receive early warning notifications before exceeding your budget limits.
            </p>
          </div>

          <div className="bg-surface/50 border border-edge rounded-2xl p-6 hover:border-edge-strong transition-all">
            <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center mb-4">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink">Secure Cloud Sync</h3>
            <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Integrated with Google Authentication and Firebase Firestore. Each user's data is isolated in a private database partition.
            </p>
          </div>

          <div className="bg-surface/50 border border-edge rounded-2xl p-6 hover:border-edge-strong transition-all">
            <div className="w-12 h-12 rounded-xl bg-negative/10 text-negative flex items-center justify-center mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-ink">Biometric Security</h3>
            <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Protect your sensitive financial records with on-device fingerprint and biometric security authentication.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-edge bg-canvas py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-faint">
          <div>
            <p className="font-semibold text-ink-muted">Money Canvas</p>
            <p className="mt-1">© {new Date().getFullYear()} All rights reserved. Personal Wealth & Investment Operating System.</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-ink-muted hover:text-accent-strong transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-ink-muted hover:text-accent-strong transition-colors">
              Terms of Service
            </a>
            <a href="#/data-deletion" className="text-ink-muted hover:text-negative transition-colors">
              Data Deletion
            </a>
            <a href="mailto:raju.official.asf@gmail.com" className="text-ink-muted hover:text-accent-strong transition-colors">
              Contact Developer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
