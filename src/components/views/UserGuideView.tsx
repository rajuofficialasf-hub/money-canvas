import React, { useState } from 'react';
import { UserGuideModal } from '../onboarding/UserGuideModal';
import { Sparkles, BookOpen, Globe, CheckCircle2, ArrowRight, PlayCircle } from 'lucide-react';

export const UserGuideView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <BookOpen className="h-4 w-4" />
            <span>App Knowledgebase & Walkthrough</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Money Canvas App User Guide
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Step-by-step interactive manual for managing bank accounts, DSE stock investments, loans, and Google Drive cloud backups.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all shrink-0"
        >
          <PlayCircle className="h-4 w-4" />
          <span>Start Interactive Tour</span>
        </button>
      </div>

      {/* Embedded Quick Guide Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <Sparkles className="h-4 w-4" />
            <span>1. Quick Overview & Dashboard</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Monitor net worth, liquid cash, bank balances, and monthly cash flow in real-time. Built on institutional double-entry standards.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <BookOpen className="h-4 w-4" />
            <span>2. DSE Stock Market Portfolio</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Track Weighted Average Cost (WAC), buy/sell executions, dividend tax credits (AIT), and capital gains tax calculations.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>3. Google Drive Cloud Sync</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sign in with Google to enable automatic background backup to your own private Google Drive AppData folder with 100% data privacy.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <Globe className="h-4 w-4" />
            <span>4. Official PDF & NBR Tax Export</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Generate vector PDF Balance Sheets, P&L statements, and Section 32/57 NBR Tax Schedules ready for official tax filing.
          </p>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Need a step-by-step walkthrough?</h3>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          Click the button below to open the step-by-step bilingual guide with Next/Skip system and interactive chapter navigation.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 inline-flex items-center gap-2 transition-all shadow-md"
        >
          <span>Open Full Interactive Manual</span>
          <ArrowRight className="h-4 w-4 text-emerald-400" />
        </button>
      </div>

      <UserGuideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
