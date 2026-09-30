import React, { useState, useEffect, useCallback } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { useLanguage } from '../../lib/language-context';
import {
  detectClipboardSms,
  markSmsDismissed,
} from '../../lib/clipboard-sms-service';
import { ParsedSmsTransaction } from '../../types/sms-parser';
import {
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';

interface ClipboardSmsBannerProps {
  onNavigate?: (view: string) => void;
}

export const ClipboardSmsBanner: React.FC<ClipboardSmsBannerProps> = ({ onNavigate }) => {
  const { accounts, categories, transactions, postTransaction } = useLedger();
  const { isBn } = useLanguage();

  const [detectedSms, setDetectedSms] = useState<{
    rawText: string;
    parsed: ParsedSmsTransaction;
    alreadyInLedger?: boolean;
  } | null>(null);

  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Check clipboard when window gains focus or visibility state changes
  const runDetection = useCallback(async () => {
    // Only detect if document is visible
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }

    try {
      const res = await detectClipboardSms(accounts, categories, transactions);
      if (res.detected && res.rawText && res.parsed) {
        setDetectedSms({
          rawText: res.rawText,
          parsed: res.parsed,
          alreadyInLedger: res.alreadyInLedger,
        });
      }
    } catch (e) {
      // Ignore background clipboard access rejection
    }
  }, [accounts, categories, transactions]);

  useEffect(() => {
    // Initial check on mount
    runDetection();

    const handleFocus = () => {
      runDetection();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runDetection();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [runDetection]);

  const handleDismiss = () => {
    if (detectedSms) {
      markSmsDismissed(detectedSms.rawText);
      setDetectedSms(null);
    }
  };

  // Quick 1-click direct posting into double-entry ledger
  const handleQuickPost = async () => {
    if (!detectedSms) return;
    const { parsed } = detectedSms;

    setIsPosting(true);
    try {
      // Find matching account or fallback to first
      const accountId =
        parsed.suggestedAccountId ||
        accounts.find((a) => a.accountType === 'mobile_wallet' || a.accountType === 'bank')?.id ||
        accounts[0]?.id;

      // Find matching category or fallback
      const catType = parsed.type === 'income' ? 'income' : 'expense';
      const categoryId =
        parsed.suggestedCategoryId ||
        categories.find((c) => c.type === catType)?.id ||
        categories[0]?.id;

      if (!accountId || !categoryId) {
        // Redirect to full parser view if accounts missing
        onNavigate?.('sms_parser');
        handleDismiss();
        return;
      }

      const noteText = [
        parsed.sourceProvider,
        parsed.counterparty ? `to ${parsed.counterparty}` : '',
        parsed.trxId ? `(TrxID: ${parsed.trxId})` : '',
      ]
        .filter(Boolean)
        .join(' ');

      // Double-entry balanced posting
      if (parsed.type === 'income') {
        // Income: Debit Account (+), Credit Category (-)
        await postTransaction({
          date: parsed.date,
          type: 'income',
          note: noteText || 'SMS Deposit',
          lines: [
            { lineType: 'account', accountId, amount: parsed.amount },
            { lineType: 'category', categoryId, amount: -parsed.amount },
          ],
        });
      } else {
        // Expense: Debit Category (+), Credit Account (-)
        await postTransaction({
          date: parsed.date,
          type: 'expense',
          note: noteText || 'SMS Expense',
          lines: [
            { lineType: 'account', accountId, amount: -parsed.amount },
            { lineType: 'category', categoryId, amount: parsed.amount },
          ],
        });
      }

      markSmsDismissed(detectedSms.rawText);
      setPostSuccess(true);
      setTimeout(() => {
        setDetectedSms(null);
        setPostSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Quick post failed:', err);
      // Fallback: navigate to parser
      onNavigate?.('sms_parser');
    } finally {
      setIsPosting(false);
    }
  };

  const handleOpenInParser = () => {
    if (detectedSms) {
      // Store in sessionStorage so SmsParserView picks it up
      try {
        sessionStorage.setItem('mc_pending_sms_input', detectedSms.rawText);
      } catch {}
      markSmsDismissed(detectedSms.rawText);
      setDetectedSms(null);
      onNavigate?.('sms_parser');
    }
  };

  if (!detectedSms) return null;

  const { parsed, alreadyInLedger } = detectedSms;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-sky-500/40 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 space-y-3 text-slate-100 ring-1 ring-sky-500/20">
        {/* Banner Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-white">
              {isBn ? 'ক্লিপবোর্ডে এসএমএস লেনদেন সনাক্ত!' : 'Transaction SMS Detected!'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 font-mono">
              {parsed.sourceProvider}
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                parsed.type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {parsed.type.toUpperCase()}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-xl font-black text-white font-mono">
              ৳{parsed.amount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              <Calendar className="h-3 w-3" />
              <span>{parsed.date}</span>
            </div>
          </div>

          {parsed.counterparty && (
            <p className="text-[11px] text-slate-300 truncate">
              বিবরণ: <strong>{parsed.counterparty}</strong>
            </p>
          )}

          {parsed.trxId && (
            <div className="text-[10px] font-mono text-slate-400 truncate">
              TrxID: {parsed.trxId}
            </div>
          )}

          {alreadyInLedger && (
            <div className="p-1.5 rounded-lg bg-amber-950/50 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>এই লেনদেনটি ইতিমধ্যে লেজারে যুক্ত থাকতে পারে।</span>
            </div>
          )}

          {postSuccess && (
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>লেনদেন সফলভাবে লেজারে যুক্ত হয়েছে!</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!postSuccess && (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              disabled={isPosting}
              onClick={handleQuickPost}
              className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-sky-950/50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isPosting ? 'যোগ হচ্ছে...' : isBn ? 'লেজারে যোগ করুন' : 'Add to Ledger'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenInParser}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-700"
              title="এডিট বা বিস্তারিত দেখুন"
            >
              <span>{isBn ? 'রিভিউ' : 'Review'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors border border-slate-800"
              title="উপেক্ষা করুন"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
