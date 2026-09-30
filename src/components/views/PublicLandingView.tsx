import React from 'react';
import {
  Wallet,
  TrendingUp,
  ShieldCheck,
  Lock,
  PieChart,
  ArrowRight,
  Database,
  Building2,
  Receipt,
} from 'lucide-react';

export const PublicLandingView: React.FC<{ onLaunchApp: () => void }> = ({ onLaunchApp }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="h-5 w-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">Money Canvas</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Wealth OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <a href="/privacy" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors">
              Terms
            </a>
            <button
              type="button"
              onClick={onLaunchApp}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <span>Launch App</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs mb-8">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Private, Secure & Cloud-Synchronized Personal Finance</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Master Your Net Worth with <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Money Canvas
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Comprehensive personal accounting, multi-asset portfolio tracking, banking management, and financial analytics — engineered with privacy-first architecture.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onLaunchApp}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-xl shadow-emerald-500/25 transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>Open Money Canvas</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="/privacy"
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <span>Read Privacy Policy</span>
          </a>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Designed for Complete Financial Mastery
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            From daily petty cash to long-term wealth, Money Canvas provides an all-in-one institutional-grade financial dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Double-Entry Accounting</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every taka or dollar is tracked with precision. Balance sheets, income statements, and cash flows update automatically with zero discrepancies.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Investment & Stock Portfolio</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Monitor capital gains, dividends, stock allocations (DSE / International), and track real-time portfolio valuation without manual spreadsheets.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Banking, DPS & Fixed Deposits</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Manage multiple bank accounts, recurring monthly savings (DPS), maturity schedules, and asset amortization with ease.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Smart Budgets & Analytics</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Set monthly category allowances, monitor burn rates, and receive early warning notifications before exceeding your budget limits.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Secure Cloud Sync</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Integrated with Google Authentication and Firebase Firestore. Each user's data is isolated in a private database partition.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Biometric Security</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Protect your sensitive financial records with on-device fingerprint and biometric security authentication.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-400">Money Canvas</p>
            <p className="mt-1">© {new Date().getFullYear()} All rights reserved. Personal Wealth & Investment Operating System.</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-slate-400 hover:text-emerald-400 transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-slate-400 hover:text-emerald-400 transition-colors">
              Terms of Service
            </a>
            <a href="#/data-deletion" className="text-slate-400 hover:text-rose-400 transition-colors">
              Data Deletion
            </a>
            <a href="mailto:raju.official.asf@gmail.com" className="text-slate-400 hover:text-emerald-400 transition-colors">
              Contact Developer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
