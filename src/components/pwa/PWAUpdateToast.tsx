import React from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { useAppUpdate } from '../../lib/pwa-update';

export const PWAUpdateToast: React.FC = () => {
  const { needRefresh, updateApp, dismissUpdate } = useAppUpdate();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/80 border-2 border-emerald-500/60 p-4 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white tracking-tight">
              নতুন আপডেট উপলব্ধ!
            </h4>
            <span className="text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded uppercase">
              New Version
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Money Canvas-এর একটি নতুন সংস্করণ প্রকাশিত হয়েছে। নতুন ফিচার ও সর্বশেষ ফিক্স পেতে অ্যাপটি রিলোড করুন।
          </p>

          <div className="flex items-center gap-2.5 mt-3.5">
            <button
              onClick={() => updateApp()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>এখনই আপডেট করুন</span>
            </button>

            <button
              onClick={() => dismissUpdate()}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              পরে
            </button>
          </div>
        </div>

        <button
          onClick={() => dismissUpdate()}
          aria-label="Close update notification"
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
