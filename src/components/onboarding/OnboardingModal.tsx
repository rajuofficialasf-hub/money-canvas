import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  Wallet,
  ShieldCheck,
  ArrowRight,
  User,
  Mail,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'My Personal Ledger';

    updateProfile({
      fullName: finalName,
      bio: bio.trim() || `Private Finance & Wealth Ledger of ${finalName}`,
    });

    localStorage.setItem('pfos_has_onboarded', 'true');
    onComplete();
  };

  const handleQuickStart = () => {
    updateProfile({
      fullName: 'My Personal Ledger',
      bio: 'Private Finance & Wealth Ledger',
    });
    localStorage.setItem('pfos_has_onboarded', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Welcome Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Welcome to Money Canvas
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            Set up your private personal finance, double-entry ledger, and Dhaka Stock Exchange portfolio.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <Wallet className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-slate-200">100% Private</div>
            <div className="text-[10px] text-slate-500">Stored on your device</div>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <TrendingUp className="h-4 w-4 text-sky-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-slate-200">DSE Live Sync</div>
            <div className="text-[10px] text-slate-500">StockChartBD feed</div>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <ShieldCheck className="h-4 w-4 text-purple-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-slate-200">Double-Entry</div>
            <div className="text-[10px] text-slate-500">Strict WAC & Ledger</div>
          </div>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Name / Ledger Title <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. Ahmed Kabir or My Personal Ledger"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email / Mobile Number <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. yourname@email.com or 017XXXXXXXX"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/50"
            >
              <span>Create My Ledger</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleQuickStart}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-colors"
            >
              Default Setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
