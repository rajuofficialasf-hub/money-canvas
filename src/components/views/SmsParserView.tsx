import React, { useState, useEffect } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { useLanguage } from '../../lib/language-context';
import {
  parseBatchSms,
  BANGLADESH_SMS_PRESETS,
} from '../../lib/sms-parser-engine';
import { readClipboardText } from '../../lib/clipboard-sms-service';
import { ParsedSmsTransaction } from '../../types/sms-parser';
import { NewTransactionLineInput } from '../../types/accounting';
import {
  MessageSquare,
  Sparkles,
  ClipboardPaste,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Info,
} from 'lucide-react';

interface SmsParserViewProps {
  onNavigate?: (view: string) => void;
}

export const SmsParserView: React.FC<SmsParserViewProps> = ({ onNavigate }) => {
  const { accounts, categories, postTransaction } = useLedger();
  const { isBn } = useLanguage();

  const [rawInput, setRawInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedSmsTransaction[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [postingStatus, setPostingStatus] = useState<{
    loading: boolean;
    successMessage?: string;
    errorMessage?: string;
    postedCount?: number;
  }>({ loading: false });

  const [expandedRawId, setExpandedRawId] = useState<string | null>(null);

  // Auto-pickup pending SMS from clipboard auto-detection banner
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('mc_pending_sms_input');
      if (pending) {
        sessionStorage.removeItem('mc_pending_sms_input');
        setRawInput(pending);
        handleParse(pending);
      }
    } catch {}
  }, []);

  // Parse logic
  const handleParse = (textToParse?: string) => {
    const text = typeof textToParse === 'string' ? textToParse : rawInput;
    if (!text.trim()) {
      setParsedItems([]);
      setHasParsed(false);
      return;
    }

    const results = parseBatchSms(text, accounts, categories);
    setParsedItems(results);
    setHasParsed(true);
    setPostingStatus({ loading: false });
  };

  // Paste from clipboard (Native & Web)
  const handlePasteClipboard = async () => {
    try {
      const text = await readClipboardText();
      if (text) {
        setRawInput(text);
        handleParse(text);
      } else {
        const el = document.getElementById('sms-input-area');
        if (el) el.focus();
      }
    } catch {
      const el = document.getElementById('sms-input-area');
      if (el) el.focus();
    }
  };

  // Load preset template
  const handleSelectPreset = (smsText: string) => {
    setRawInput(smsText);
    handleParse(smsText);
  };

  // Clear all
  const handleClear = () => {
    setRawInput('');
    setParsedItems([]);
    setHasParsed(false);
    setPostingStatus({ loading: false });
  };

  // Toggle item selection
  const toggleSelect = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Toggle select all
  const toggleSelectAll = (select: boolean) => {
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  // Update item field
  const updateItemField = <K extends keyof ParsedSmsTransaction>(
    id: string,
    field: K,
    value: ParsedSmsTransaction[K]
  ) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Remove single item
  const removeItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Post selected items to Ledger
  const handlePostToLedger = () => {
    const selected = parsedItems.filter((i) => i.selected && i.amount > 0);
    if (selected.length === 0) return;

    setPostingStatus({ loading: true });

    let successCount = 0;
    const errors: string[] = [];

    // Ensure fallback category exists
    const defaultExpenseCat = categories.find((c) => c.type === 'expense') || categories[0];
    const defaultIncomeCat = categories.find((c) => c.type === 'income') || categories[0];
    const defaultAccount = accounts[0];

    for (const item of selected) {
      const targetAccountId = item.suggestedAccountId || defaultAccount?.id;
      if (!targetAccountId) {
        errors.push(`No account available for transaction: ${item.counterparty || item.sourceProvider}`);
        continue;
      }

      if (item.type === 'income') {
        const catId = item.suggestedCategoryId || defaultIncomeCat?.id;
        const res = postTransaction({
          date: item.date,
          type: 'income',
          note: `[SMS-${item.sourceProvider}] ${item.counterparty || 'Received'} ${item.trxId ? `| TrxID: ${item.trxId}` : ''}`,
          lines: [
            {
              lineType: 'account',
              accountId: targetAccountId,
              amount: item.amount,
              memo: `Deposit from ${item.sourceProvider}`,
            },
            {
              lineType: 'category',
              categoryId: catId,
              amount: -item.amount,
              memo: `Income: ${item.counterparty || item.sourceProvider}`,
            },
          ],
        });

        if (res.success) {
          successCount++;
        } else {
          errors.push(res.error || 'Failed to post income');
        }
      } else {
        // Expense, Cash Out, Bill Pay, Recharge
        const catId = item.suggestedCategoryId || defaultExpenseCat?.id;
        const note = `[SMS-${item.sourceProvider}] ${item.counterparty || 'Payment'} ${item.ref ? `| Ref: ${item.ref}` : ''} ${item.trxId ? `| TrxID: ${item.trxId}` : ''}`;

        const lines: NewTransactionLineInput[] = [
          {
            lineType: 'account',
            accountId: targetAccountId,
            amount: -item.amount,
            memo: `${item.sourceProvider} payment`,
          },
          {
            lineType: 'category',
            categoryId: catId,
            amount: item.amount,
            memo: item.counterparty || `${item.sourceProvider} payment`,
          },
        ];

        // If there's an explicit fee (e.g. bKash cash out charge)
        if (item.fee > 0) {
          const feeCat = categories.find((c) => c.name.toLowerCase().includes('fee') || c.name.toLowerCase().includes('charge')) || defaultExpenseCat;
          lines.push(
            {
              lineType: 'account',
              accountId: targetAccountId,
              amount: -item.fee,
              memo: `${item.sourceProvider} fee`,
            },
            {
              lineType: 'category',
              categoryId: feeCat.id,
              amount: item.fee,
              memo: `${item.sourceProvider} fee / charge`,
            }
          );
        }

        const res = postTransaction({
          date: item.date,
          type: 'expense',
          note,
          lines,
        });

        if (res.success) {
          successCount++;
        } else {
          errors.push(res.error || 'Failed to post expense');
        }
      }
    }

    setPostingStatus({
      loading: false,
      postedCount: successCount,
      successMessage:
        successCount > 0
          ? isBn
            ? `${successCount} টি লেনদেন সফলভাবে ডাবল-এন্ট্রি লেজারে সংরক্ষিত হয়েছে!`
            : `Successfully posted ${successCount} transactions to double-entry ledger!`
          : undefined,
      errorMessage: errors.length > 0 ? errors[0] : undefined,
    });

    if (successCount > 0) {
      // Remove successfully posted items
      setParsedItems((prev) => prev.filter((i) => !i.selected || i.amount <= 0));
    }
  };

  // Calculations
  const selectedCount = parsedItems.filter((i) => i.selected && i.amount > 0).length;
  const totalExpense = parsedItems
    .filter((i) => i.selected && i.type !== 'income')
    .reduce((sum, i) => sum + i.amount + (i.fee || 0), 0);
  const totalIncome = parsedItems
    .filter((i) => i.selected && i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0);

  const getProviderBadgeColor = (provider: string) => {
    const p = provider.toLowerCase();
    if (p.includes('bkash')) return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    if (p.includes('nagad')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (p.includes('city')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (p.includes('brac')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (p.includes('rocket')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (p.includes('cellfin') || p.includes('ibbl')) return 'bg-accent/20 text-accent-strong border-accent/30';
    if (p.includes('ebl')) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-slate-700 text-ink-soft border-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Privacy / Free Guarantee Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <MessageSquare className="h-5 w-5 text-accent-ink stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-ink">
                  {isBn ? 'এসএমএস / নোটিফিকেশন কপি-পেস্ট পার্সার' : 'SMS & Push Notification Parser'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent/20 text-accent-strong border border-accent/30">
                  100% FREE
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Client-Side Private
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                {isBn
                  ? 'বিকাশ, নগদ, রকেট, ব্যাংক ডেবিট কার্ড ও ট্রানজেকশন এসএমএস পেস্ট করলেই স্বয়ংক্রিয় লেজার এন্ট্রি'
                  : 'Instantly paste & convert bKash, Nagad, Rocket, or Bank SMS alerts into double-entry accounting records'}
              </p>
            </div>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('ledger')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-edge text-xs font-medium text-ink-soft hover:text-ink hover:border-slate-700 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-accent-strong" />
            <span>{isBn ? 'লেজার খতিয়ানে যান' : 'Go to Ledger'}</span>
          </button>
        )}
      </div>

      {/* 2. Free & Offline Guarantee Card (Answers user question) */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900 border border-accent/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent-strong shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-accent-strong flex items-center gap-2">
              <span>{isBn ? 'এটি কি ১০০% ফ্রি ও নিরাপদ?' : 'Is this 100% Free & Private?'}</span>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-accent/20 text-accent-strong">
                {isBn ? 'হ্যাঁ, সম্পূর্ণ ফ্রি!' : 'Yes, 100% Free!'}
              </span>
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              {isBn
                ? 'হ্যাঁ! এই পার্সারটি সম্পূর্ণ আপনার ব্রাউজারে ক্লায়েন্ট-সাইড রেগুলার এক্সপ্রেশন (Regex) ও লোকাল প্যাটার্ন ম্যাচিং ইঞ্জিনের মাধ্যমে অফলাইনে চলে। কোনো পেইড এআই এপিআই (Gemini/OpenAI) বা সার্ভার রিকোয়েস্টের প্রয়োজন নেই। আপনার ব্যাংকের গোপন এসএমএস কোনো সার্ভারে পাঠানো হয় না—আপনার ফোনেই নিরাপদ থাকে।'
                : 'Yes! This parser runs 100% locally in your browser using high-speed client-side regex heuristics. Zero API tokens required, zero server network calls, and 100% confidential financial data privacy.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Input Textarea & Action Bar */}
      <div className="p-5 rounded-2xl bg-surface/70 border border-edge space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-accent-strong" />
            <label htmlFor="sms-input-area" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              {isBn ? 'ব্যাংক বা এমএফএস থেকে কপি করা এসএমএস এখানে পেস্ট করুন:' : 'Paste Copied SMS / Alert Text Here:'}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePasteClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs font-medium text-accent-strong hover:bg-accent/20 transition-all cursor-pointer"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span>{isBn ? 'ক্লিপবোর্ড থেকে পেস্ট' : 'Paste from Clipboard'}</span>
            </button>
            {rawInput && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-raised text-xs font-medium text-ink-muted hover:text-negative transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isBn ? 'মুছুন' : 'Clear'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <textarea
            id="sms-input-area"
            rows={5}
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              if (e.target.value.trim().length > 15) {
                handleParse(e.target.value);
              }
            }}
            placeholder={
              isBn
                ? 'উদাহরণস্বরূপ বিকাশ, নগদ বা সিটি ব্যাংকের এসএমএস পেস্ট করুন:\n"Payment Tk 850.00 to Shwapno successful. Ref: GROCERY. TrxID 9K8L1M2N3P at 26/09/2026 14:30. Balance Tk 5,420.00."'
                : 'e.g. Paste one or multiple bank SMSes:\n"Payment Tk 850.00 to Shwapno successful. Ref: GROCERY. TrxID 9K8L1M2N3P at 26/09/2026 14:30. Balance Tk 5,420.00."'
            }
            className="w-full rounded-xl bg-canvas border border-edge p-3.5 text-xs text-ink placeholder:text-slate-600 font-mono focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed resize-y"
          />
        </div>

        {/* Preset Sample Templates */}
        <div className="space-y-2 pt-1 border-t border-edge/80">
          <div className="flex items-center justify-between text-[11px] text-ink-muted">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              {isBn ? 'দ্রুত টেস্ট করার জন্য স্যাম্পল টেমপ্লেট ক্লিক করুন:' : 'Quick 1-Click Real-world SMS Presets:'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {BANGLADESH_SMS_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(preset.smsText)}
                className="px-2.5 py-1.5 rounded-lg bg-canvas border border-edge text-[11px] font-medium text-ink-soft hover:text-accent-strong hover:border-accent/40 transition-all text-left flex items-center gap-2 cursor-pointer shadow-sm"
                title={isBn ? preset.description : (preset.descriptionEn || preset.description)}
              >
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${getProviderBadgeColor(preset.provider)}`}>
                  {preset.provider}
                </span>
                <span>{isBn ? preset.title : (preset.titleEn || preset.title)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-ink-muted">
            {parsedItems.length > 0 && (
              <span className="font-mono text-accent-strong font-medium">
                {isBn
                  ? `✓ ${parsedItems.length} টি এসএমএস শনাক্ত করা হয়েছে`
                  : `✓ ${parsedItems.length} transactions detected`}
              </span>
            )}
          </div>
          <button
            onClick={() => handleParse()}
            disabled={!rawInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-ink font-bold text-xs hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>{isBn ? 'এসএমএস পার্স করুন' : 'Parse SMS Now'}</span>
          </button>
        </div>
      </div>

      {/* 4. Posting Status Banner */}
      {postingStatus.successMessage && (
        <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-between gap-3 text-accent-strong">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{postingStatus.successMessage}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('ledger')}
              className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:bg-accent-strong transition-colors shrink-0"
            >
              {isBn ? 'লেজারে দেখুন →' : 'View in Ledger →'}
            </button>
          )}
        </div>
      )}

      {postingStatus.errorMessage && (
        <div className="p-4 rounded-xl bg-negative/10 border border-negative/30 flex items-center gap-2.5 text-negative text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{postingStatus.errorMessage}</span>
        </div>
      )}

      {/* 5. Parsed Review Table / Cards */}
      {hasParsed && parsedItems.length === 0 && (
        <div className="p-8 rounded-2xl bg-surface/40 border border-edge text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-warning mx-auto" />
          <h4 className="text-sm font-semibold text-ink-soft">
            {isBn ? 'কোনো বৈধ লেনদেন পাওয়া যায়নি' : 'No Valid Transaction Detected'}
          </h4>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {isBn
              ? 'অনুগ্রহ করে নিশ্চিত করুন যে এসএমএস-এ টাকার পরিমাণ (যেমন: Tk 500, BDT 1200) এবং লেনদেনের ধরন রয়েছে।'
              : 'Please ensure the copied text includes amount markers (e.g. Tk 500, BDT 1,200) and transaction keywords.'}
          </p>
        </div>
      )}

      {parsedItems.length > 0 && (
        <div className="space-y-4">
          {/* Summary and Selection Bar */}
          <div className="p-4 rounded-xl bg-surface/90 border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={parsedItems.every((i) => i.selected)}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="rounded border-slate-700 bg-canvas text-accent focus:ring-accent h-4 w-4"
                />
                <span>{isBn ? 'সবগুলো নির্বাচন করুন' : 'Select All'}</span>
              </label>
              <div className="h-4 w-px bg-raised" />
              <div className="text-xs font-mono text-ink-muted">
                {isBn
                  ? `${selectedCount} / ${parsedItems.length} টি নির্বাচিত`
                  : `${selectedCount} of ${parsedItems.length} selected`}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              {totalExpense > 0 && (
                <div className="text-negative">
                  {isBn ? 'মোট খরচ:' : 'Total Outflow:'} <span className="font-bold">৳{totalExpense.toLocaleString()}</span>
                </div>
              )}
              {totalIncome > 0 && (
                <div className="text-accent-strong">
                  {isBn ? 'মোট আয়:' : 'Total Inflow:'} <span className="font-bold">৳{totalIncome.toLocaleString()}</span>
                </div>
              )}
            </div>

            <button
              onClick={handlePostToLedger}
              disabled={selectedCount === 0 || postingStatus.loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-ink font-bold text-xs hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <FileCheck className="h-4 w-4" />
              <span>
                {isBn
                  ? `${selectedCount} টি লেজারে পোস্ট করুন`
                  : `Post ${selectedCount} to Ledger`}
              </span>
            </button>
          </div>

          {/* Transaction Cards List */}
          <div className="space-y-3">
            {parsedItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.selected
                    ? 'bg-surface border-slate-700 shadow-md'
                    : 'bg-canvas/60 border-edge/80 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Checkbox, Provider, Counterparty, Note */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleSelect(item.id)}
                      className="mt-1 rounded border-slate-700 bg-canvas text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                    />

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getProviderBadgeColor(item.sourceProvider)}`}>
                          {item.sourceProvider}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            item.type === 'income'
                              ? 'bg-accent/20 text-accent-strong border border-accent/30'
                              : 'bg-negative/20 text-negative border border-negative/30'
                          }`}
                        >
                          {item.type}
                        </span>

                        {item.trxId && (
                          <span className="text-[11px] font-mono text-ink-muted bg-canvas px-2 py-0.5 rounded border border-edge">
                            TrxID: {item.trxId}
                          </span>
                        )}

                        {item.ref && (
                          <span className="text-[11px] font-mono text-ink-muted bg-canvas px-2 py-0.5 rounded border border-edge">
                            Ref: {item.ref}
                          </span>
                        )}

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            item.confidence === 'high'
                              ? 'text-accent-strong bg-accent/10'
                              : item.confidence === 'medium'
                              ? 'text-warning bg-warning/10'
                              : 'text-negative bg-negative/10'
                          }`}
                        >
                          {item.confidence.toUpperCase()} CONFIDENCE
                        </span>
                      </div>

                      {/* Editable Description / Merchant */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.counterparty || ''}
                          onChange={(e) => updateItemField(item.id, 'counterparty', e.target.value)}
                          placeholder="Merchant or Recipient Note"
                          className="bg-canvas border border-edge rounded px-2.5 py-1 text-xs text-ink-soft focus:border-accent focus:outline-none w-full max-w-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Middle: Account, Category, Date Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 text-xs">
                    {/* Date */}
                    <div>
                      <label className="text-[10px] text-ink-faint uppercase font-mono block mb-0.5">
                        {isBn ? 'তারিখ' : 'Date'}
                      </label>
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateItemField(item.id, 'date', e.target.value)}
                        className="bg-canvas border border-edge rounded px-2 py-1 text-ink-soft focus:border-accent focus:outline-none w-full"
                      />
                    </div>

                    {/* Account Selector */}
                    <div>
                      <label className="text-[10px] text-ink-faint uppercase font-mono block mb-0.5">
                        {isBn ? 'অ্যাকাউন্ট' : 'Account'}
                      </label>
                      <select
                        value={item.suggestedAccountId || ''}
                        onChange={(e) => {
                          const acc = accounts.find((a) => a.id === e.target.value);
                          updateItemField(item.id, 'suggestedAccountId', e.target.value);
                          if (acc) updateItemField(item.id, 'suggestedAccountName', acc.name);
                        }}
                        className="bg-canvas border border-edge rounded px-2 py-1 text-ink-soft focus:border-accent focus:outline-none w-full"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.accountType})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Selector */}
                    <div>
                      <label className="text-[10px] text-ink-faint uppercase font-mono block mb-0.5">
                        {isBn ? 'ক্যাটাগরি' : 'Category'}
                      </label>
                      <select
                        value={item.suggestedCategoryId || ''}
                        onChange={(e) => {
                          const cat = categories.find((c) => c.id === e.target.value);
                          updateItemField(item.id, 'suggestedCategoryId', e.target.value);
                          if (cat) updateItemField(item.id, 'suggestedCategoryName', cat.name);
                        }}
                        className="bg-canvas border border-edge rounded px-2 py-1 text-ink-soft focus:border-accent focus:outline-none w-full"
                      >
                        {categories
                          .filter((c) => (item.type === 'income' ? c.type === 'income' : c.type === 'expense'))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Right: Amount, Fee & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 border-edge pt-2 lg:pt-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-ink-muted font-mono">৳</span>
                        <input
                          type="number"
                          step="any"
                          value={item.amount || ''}
                          onChange={(e) => updateItemField(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          className={`w-28 text-right font-mono font-bold text-sm bg-canvas border border-edge rounded px-2 py-0.5 ${
                            item.type === 'income' ? 'text-accent-strong' : 'text-ink'
                          }`}
                        />
                      </div>
                      {item.fee > 0 && (
                        <div className="text-[11px] font-mono text-warning/90 mt-0.5">
                          {isBn ? 'ফি:' : 'Fee:'} ৳{item.fee.toFixed(2)}
                        </div>
                      )}
                      {item.balanceAfter !== undefined && (
                        <div className="text-[10px] font-mono text-ink-faint">
                          {isBn ? 'অবশিষ্ট:' : 'Bal:'} ৳{item.balanceAfter.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setExpandedRawId(expandedRawId === item.id ? null : item.id)
                        }
                        className="p-1.5 rounded-lg bg-canvas border border-edge text-ink-muted hover:text-ink transition-colors"
                        title="View Raw SMS"
                      >
                        {expandedRawId === item.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-lg bg-canvas border border-edge text-ink-muted hover:text-negative transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Raw SMS preview drawer */}
                {expandedRawId === item.id && (
                  <div className="mt-3 p-3 rounded-lg bg-canvas border border-edge text-xs font-mono text-ink-muted space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-ink-faint font-bold">
                      {isBn ? 'মূল এসএমএস টেক্সট:' : 'Raw SMS Message:'}
                    </div>
                    <div className="text-ink-soft whitespace-pre-wrap">{item.rawText}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. How it Works Guide */}
      <div className="p-5 rounded-2xl bg-surface/40 border border-edge space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-2">
          <Info className="h-4 w-4 text-accent-strong" />
          <span>{isBn ? 'কীভাবে ব্যবহার করবেন (সহজ ৩টি ধাপ):' : 'How it Works (3 Easy Steps):'}</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-ink-soft">
          <div className="p-3.5 rounded-xl bg-canvas/80 border border-edge space-y-1">
            <div className="font-bold text-accent-strong">
              {isBn ? '১. এসএমএস কপি করুন' : '1. Copy SMS Alert'}
            </div>
            <p className="text-ink-muted text-[11px] leading-relaxed">
              {isBn
                ? 'আপনার ফোনের মেসেজিং অ্যাপ থেকে বিকাশ, নগদ, রকেট বা ব্যাংক ডেবিট কার্ডের ট্রানজেকশন নোটিফিকেশন কপি করুন।'
                : 'Copy transaction SMS or notification alerts from bKash, Nagad, Rocket, or your bank cards.'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-canvas/80 border border-edge space-y-1">
            <div className="font-bold text-accent-strong">
              {isBn ? '২. এখানে পেস্ট করুন' : '2. Paste Here'}
            </div>
            <p className="text-ink-muted text-[11px] leading-relaxed">
              {isBn
                ? ' "ক্লিপবোর্ড থেকে পেস্ট" চাপুন অথবা বক্সে পেস্ট করুন। মুহূর্তের মধ্যে পার্সার টাকা, প্রতিষ্ঠান, তারিখ ও ক্যাটাগরি স্বয়ংক্রিয় সাজিয়ে দেবে।'
                : 'Click "Paste from Clipboard" or paste into the box. The engine instantly detects amounts, merchants, dates, and categories.'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-canvas/80 border border-edge space-y-1">
            <div className="font-bold text-accent-strong">
              {isBn ? '৩. ১-ক্লিকে লেজারে সেভ' : '3. 1-Click Post to Ledger'}
            </div>
            <p className="text-ink-muted text-[11px] leading-relaxed">
              {isBn
                ? 'লেনদেনগুলো রিভিউ করে "লেজারে পোস্ট করুন" বাটনে ক্লিক করলেই আপনার ডাবল-এন্ট্রি খতিয়ানে নির্ভুলভাবে জমা বা খরচ রেকর্ড হয়ে যাবে।'
                : 'Review extracted entries and click "Post to Ledger" to automatically update your double-entry accounts with balanced debit/credit lines.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
