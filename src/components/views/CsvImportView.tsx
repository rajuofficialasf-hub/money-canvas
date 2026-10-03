import React, { useState, useRef, useMemo } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { NewTransactionInput } from '../../types/accounting';
import {
  parseCsvText,
  autoDetectColumnMapping,
  parseStatementRows,
  BANK_PRESETS,
  ColumnMappingConfig,
  CsvParsedTable,
  ParsedStatementRow,
  AmountMode,
} from '../../lib/csv-parser-engine';
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Download,
  Building2,
  Check,
  BookOpen,
} from 'lucide-react';

interface CsvImportViewProps {
  onNavigate?: (view: string) => void;
}

export const CsvImportView: React.FC<CsvImportViewProps> = ({ onNavigate }) => {
  const { accounts, categories, transactions, transactionLines, postTransactionsBatch, getAccountBalance } = useLedger();

  // Wizard Step: 1 = Upload, 2 = Mapping, 3 = Review & Edit, 4 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File and Raw Table State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedTable, setParsedTable] = useState<CsvParsedTable | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Selected Target Account & Preset
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const bankOrWallet = accounts.find((a) => a.accountType === 'bank' || a.accountType === 'mobile_wallet');
    return bankOrWallet ? bankOrWallet.id : accounts[0]?.id || '';
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>('auto');

  // Mapping Configuration
  const [mapping, setMapping] = useState<ColumnMappingConfig>({
    dateColIndex: 0,
    descriptionColIndex: 1,
    amountMode: 'separate_dr_cr',
    debitColIndex: 2,
    creditColIndex: 3,
  });

  // Default Categories
  const [defaultExpenseCatId, setDefaultExpenseCatId] = useState<string>(() => {
    return categories.find((c) => c.type === 'expense')?.id || categories[0]?.id || '';
  });
  const [defaultIncomeCatId, setDefaultIncomeCatId] = useState<string>(() => {
    return categories.find((c) => c.type === 'income')?.id || categories[0]?.id || '';
  });

  // Parsed Statement Rows for Step 3
  const [statementRows, setStatementRows] = useState<ParsedStatementRow[]>([]);
  const [rowFilter, setRowFilter] = useState<'all' | 'ready' | 'duplicates' | 'invalid'>('all');
  const [searchQuery] = useState('');

  // Posting State
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postedCount, setPostedCount] = useState<number>(0);

  // Handle CSV File Selection
  const handleFileSelect = (file: File) => {
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseCsvText(text);

        if (result.headers.length === 0 || result.rows.length === 0) {
          setParseError('সিএসভি ফাইলে কোনো বৈধ ডেটা বা কলাম পাওয়া যায়নি (CSV contains no readable headers or rows).');
          return;
        }

        setParsedTable(result);

        // Auto-configure column mapping based on preset and detected headers
        const detected = autoDetectColumnMapping(result.headers, selectedPresetId);
        setMapping(detected);

        // Automatically advance to Step 2
        setCurrentStep(2);
      } catch (err: any) {
        setParseError(err?.message || 'ফাইলটি পড়তে সমস্যা হয়েছে। সঠিক CSV ফাইল কিনা যাচাই করুন।');
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Change Preset in Step 1 or 2
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (parsedTable) {
      const detected = autoDetectColumnMapping(parsedTable.headers, presetId);
      setMapping(detected);
    }
  };

  // Advance from Step 2 to Step 3 (Parse statement rows)
  const handleProceedToReview = () => {
    if (!parsedTable) return;
    const rows = parseStatementRows(parsedTable, mapping, categories, transactions, transactionLines);
    setStatementRows(rows);
    setCurrentStep(3);
  };

  // Row update handlers
  const handleToggleRow = (rowNumber: number) => {
    setStatementRows((prev) =>
      prev.map((r) => (r.rowNumber === rowNumber ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setStatementRows((prev) =>
      prev.map((r) => (r.isValid ? { ...r, selected: select } : r))
    );
  };

  const handleSelectNonDuplicatesOnly = () => {
    setStatementRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: r.isValid && !r.isDuplicate,
      }))
    );
  };

  const handleRowCategoryChange = (rowNumber: number, categoryId: string) => {
    setStatementRows((prev) =>
      prev.map((r) => (r.rowNumber === rowNumber ? { ...r, suggestedCategoryId: categoryId } : r))
    );
  };

  const handleRowDescriptionChange = (rowNumber: number, cleanDescription: string) => {
    setStatementRows((prev) =>
      prev.map((r) => (r.rowNumber === rowNumber ? { ...r, cleanDescription } : r))
    );
  };

  // Summary Metrics for Step 3
  const metrics = useMemo(() => {
    const total = statementRows.length;
    const selectedRows = statementRows.filter((r) => r.selected && r.isValid);
    const duplicates = statementRows.filter((r) => r.isDuplicate).length;
    const invalid = statementRows.filter((r) => !r.isValid).length;

    let totalExpense = 0;
    let totalIncome = 0;

    selectedRows.forEach((r) => {
      if (r.type === 'expense') {
        totalExpense += r.rawAmount;
      } else {
        totalIncome += r.rawAmount;
      }
    });

    return {
      total,
      selectedCount: selectedRows.length,
      duplicates,
      invalid,
      totalExpense,
      totalIncome,
    };
  }, [statementRows]);

  // Filtered rows for Step 3 table
  const displayedRows = useMemo(() => {
    return statementRows.filter((r) => {
      if (rowFilter === 'ready' && (!r.selected || !r.isValid)) return false;
      if (rowFilter === 'duplicates' && !r.isDuplicate) return false;
      if (rowFilter === 'invalid' && r.isValid) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.cleanDescription.toLowerCase().includes(q) ||
          r.rawDate.toLowerCase().includes(q) ||
          r.rawAmount.toString().includes(q)
        );
      }
      return true;
    });
  }, [statementRows, rowFilter, searchQuery]);

  // Final Batch Posting Execution
  const handleExecuteBatchPost = async () => {
    const rowsToPost = statementRows.filter((r) => r.selected && r.isValid);
    if (rowsToPost.length === 0) {
      setPostError('পোস্ট করার জন্য কোনো বৈধ লেনদেন নির্বাচিত নেই।');
      return;
    }

    setIsPosting(true);
    setPostError(null);

    const inputs: NewTransactionInput[] = rowsToPost.map((r) => {
      if (r.type === 'expense') {
        return {
          date: r.isoDate,
          type: 'expense',
          note: r.cleanDescription || 'Bank Statement Expense',
          lines: [
            {
              lineType: 'account',
              accountId: selectedAccountId,
              amount: -r.rawAmount,
              memo: r.cleanDescription,
            },
            {
              lineType: 'category',
              categoryId: r.suggestedCategoryId || defaultExpenseCatId,
              amount: r.rawAmount,
              memo: r.cleanDescription,
            },
          ],
        };
      } else {
        // Income convention: Category line negative, Account line positive
        return {
          date: r.isoDate,
          type: 'income',
          note: r.cleanDescription || 'Bank Statement Deposit',
          lines: [
            {
              lineType: 'account',
              accountId: selectedAccountId,
              amount: r.rawAmount,
              memo: r.cleanDescription,
            },
            {
              lineType: 'category',
              categoryId: r.suggestedCategoryId || defaultIncomeCatId,
              amount: -r.rawAmount,
              memo: r.cleanDescription,
            },
          ],
        };
      }
    });

    const result = postTransactionsBatch(inputs);
    setIsPosting(false);

    if (result.success) {
      setPostedCount(result.count || inputs.length);
      setCurrentStep(4);
    } else {
      setPostError(result.error || 'ব্যাচ পোস্টিং ব্যর্থ হয়েছে।');
    }
  };

  // Sample CSV Template Downloader
  const handleDownloadSampleCsv = () => {
    const sample = `Date,Description,Debit,Credit,Balance
2026-09-01,"Shwapno Super Shop, Dhanmondi",2500.00,,47500.00
2026-09-05,"Monthly Salary Tech Corp",,75000.00,122500.00
2026-09-10,"Uber Ride to Gulshan",450.00,,122050.00
2026-09-15,"Foodpanda Dinner",890.00,,121160.00
2026-09-20,"DPDC Electricity Bill",3200.00,,117960.00
`;
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'money_canvas_sample_bank_statement.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const targetAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header */}
      <div className="border-b border-edge pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Bank & Wallet Statement Batch Importer</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            CSV / ব্যাংক স্টেটমেন্ট ইমপোর্ট
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            যেকোনো ব্যাংক বা মোবাইল ওয়ালেট (bKash/Nagad/City/BRAC) এর স্টেটমেন্ট ফাইল আপলোড করে একসাথে একাধিক লেনদেন স্বয়ংক্রিয়ভাবে লেজারে যুক্ত করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('ledger')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-raised hover:bg-slate-700 text-ink-soft text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-ink-muted" />
              <span>লেজারে ফিরে যান</span>
            </button>
          )}

          <button
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-raised text-ink-soft text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-sky-400" />
            <span>স্যাম্পল CSV ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 font-mono text-xs">
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
            currentStep === 1
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
              : currentStep > 1
              ? 'bg-surface border-accent/30 text-accent-strong'
              : 'bg-canvas border-edge text-ink-faint'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-raised flex items-center justify-center text-[10px] font-bold shrink-0">
            {currentStep > 1 ? <Check className="h-3 w-3" /> : '1'}
          </span>
          <span className="truncate">১. ফাইল আপলোড</span>
        </div>

        <div
          className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
            currentStep === 2
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
              : currentStep > 2
              ? 'bg-surface border-accent/30 text-accent-strong'
              : 'bg-canvas border-edge text-ink-faint'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-raised flex items-center justify-center text-[10px] font-bold shrink-0">
            {currentStep > 2 ? <Check className="h-3 w-3" /> : '2'}
          </span>
          <span className="truncate">২. কলাম ম্যাপিং</span>
        </div>

        <div
          className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
            currentStep === 3
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
              : currentStep > 3
              ? 'bg-surface border-accent/30 text-accent-strong'
              : 'bg-canvas border-edge text-ink-faint'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-raised flex items-center justify-center text-[10px] font-bold shrink-0">
            {currentStep > 3 ? <Check className="h-3 w-3" /> : '3'}
          </span>
          <span className="truncate">৩. যাচাই ও ডুপ্লিকেট</span>
        </div>

        <div
          className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
            currentStep === 4
              ? 'bg-accent/10 border-accent/40 text-accent-strong'
              : 'bg-canvas border-edge text-ink-faint'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-raised flex items-center justify-center text-[10px] font-bold shrink-0">
            4
          </span>
          <span className="truncate">৪. পোস্টিং সম্পন্ন</span>
        </div>
      </div>

      {/* STEP 1: Upload File & Preset Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account & Preset Selectors */}
            <div className="rounded-2xl border border-edge bg-surface/50 p-6 space-y-4">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-400" />
                <span>টার্গেট অ্যাকাউন্ট ও ব্যাংক প্রিসেট</span>
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft">
                  কোন অ্যাকাউন্টে লেনদেন যুক্ত হবে?
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-slate-700 text-ink text-xs font-medium focus:outline-none focus:border-sky-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType.toUpperCase()} — ব্যালেন্স: ৳{getAccountBalance(acc.id).toLocaleString()})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-ink-muted">
                  স্টেটমেন্টের ডেবিট ও ক্রেডিট লেনদেন এই অ্যাকাউন্টে সমন্বয় হবে।
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-ink-soft">
                  স্টেটমেন্ট ফরম্যাট প্রিসেট:
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-slate-700 text-ink text-xs font-medium focus:outline-none focus:border-sky-500"
                >
                  {BANK_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-sky-500 bg-surface/30 hover:bg-surface/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, .txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="p-4 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Upload className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-ink">
                  {fileName ? fileName : 'সিএসভি ফাইল সিলেক্ট করুন বা ড্র্যাগ করে ছাড়ুন'}
                </h3>
                <p className="text-xs text-ink-muted mt-1 max-w-sm">
                  সাপোর্ট করে: .csv, .txt (bKash, Nagad, City Bank, BRAC Bank বা যেকোনো স্ট্যান্ডার্ড ব্যাংক স্টেটমেন্ট)
                </p>
              </div>

              <span className="px-4 py-1.5 rounded-lg bg-raised hover:bg-slate-700 text-ink-soft text-xs font-semibold border border-slate-700">
                কম্পিউটার বা মোবাইল থেকে ব্রাউজ করুন
              </span>
            </div>
          </div>

          {parseError && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-negative/30 text-negative text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-negative" />
              <span>{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {currentStep === 2 && parsedTable && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-edge bg-surface/50 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  <span>কলাম ম্যাপিং ও কনফিগারেশন</span>
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  ফাইল: <strong className="text-ink-soft">{fileName}</strong> ({parsedTable.totalRawRows}টি সারি ডিটেক্টেড)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3.5 py-1.5 rounded-lg bg-raised hover:bg-slate-700 text-ink-soft text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>ফাইল বদলান</span>
                </button>

                <button
                  onClick={handleProceedToReview}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-accent-ink text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span>যাচাই ও প্রিভিউ করুন</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Preview of first 3 raw rows */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-soft">
                ফাইল প্রিভিউ (প্রথম ৩টি লাইন):
              </label>
              <div className="overflow-x-auto rounded-xl border border-edge bg-canvas">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-surface text-ink-muted border-b border-edge">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      {parsedTable.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-sky-300">
                          {h || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge/60 text-ink-soft">
                    {parsedTable.rows.slice(0, 3).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-surface/30">
                        <td className="px-3 py-2 text-ink-faint">{rIdx + 1}</td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 truncate max-w-xs">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column Selectors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Date Column */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft">তারিখ কলাম (Date):</label>
                <select
                  value={mapping.dateColIndex}
                  onChange={(e) => setMapping({ ...mapping, dateColIndex: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-slate-700 text-ink text-xs focus:outline-none focus:border-sky-500"
                >
                  {parsedTable.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {i + 1}. {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description Column */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft">বিবরণ কলাম (Description):</label>
                <select
                  value={mapping.descriptionColIndex}
                  onChange={(e) => setMapping({ ...mapping, descriptionColIndex: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-slate-700 text-ink text-xs focus:outline-none focus:border-sky-500"
                >
                  {parsedTable.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {i + 1}. {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft">টাকার কলাম বিন্যাস (Format):</label>
                <select
                  value={mapping.amountMode}
                  onChange={(e) => setMapping({ ...mapping, amountMode: e.target.value as AmountMode })}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-slate-700 text-ink text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="separate_dr_cr">আলাদা ডেবিট ও ক্রেডিট কলাম (ব্যাংক স্ট্যান্ডার্ড)</option>
                  <option value="single_amount_signed">একটি মাত্র কলাম (চিহ্ন বা বিবরণ দিয়ে আয়/ব্যয়)</option>
                </select>
              </div>
            </div>

            {/* Debit/Credit or Single Amount Columns */}
            {mapping.amountMode === 'separate_dr_cr' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-negative">খরচ / ডেবিট কলাম (Debit / Withdrawal):</label>
                  <select
                    value={mapping.debitColIndex !== undefined ? mapping.debitColIndex : ''}
                    onChange={(e) => setMapping({ ...mapping, debitColIndex: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-slate-700 text-ink text-xs focus:outline-none focus:border-negative"
                  >
                    {parsedTable.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-accent-strong">জমা / ক্রেডিট কলাম (Credit / Deposit):</label>
                  <select
                    value={mapping.creditColIndex !== undefined ? mapping.creditColIndex : ''}
                    onChange={(e) => setMapping({ ...mapping, creditColIndex: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-slate-700 text-ink text-xs focus:outline-none focus:border-accent"
                  >
                    {parsedTable.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 max-w-md">
                <label className="text-xs font-semibold text-sky-300">টাকার কলাম (Amount Column):</label>
                <select
                  value={mapping.amountColIndex !== undefined ? mapping.amountColIndex : ''}
                  onChange={(e) => setMapping({ ...mapping, amountColIndex: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-slate-700 text-ink text-xs focus:outline-none focus:border-sky-500"
                >
                  {parsedTable.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {i + 1}. {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Default Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-edge">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft">ডিফল্ট খরচ ক্যাটাগরি (Default Expense):</label>
                <select
                  value={defaultExpenseCatId}
                  onChange={(e) => setDefaultExpenseCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-slate-700 text-ink text-xs focus:outline-none focus:border-sky-500"
                >
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft">ডিফল্ট আয় ক্যাটাগরি (Default Income):</label>
                <select
                  value={defaultIncomeCatId}
                  onChange={(e) => setDefaultIncomeCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-slate-700 text-ink text-xs focus:outline-none focus:border-sky-500"
                >
                  {categories
                    .filter((c) => c.type === 'income')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Edit Items Table */}
      {currentStep === 3 && (
        <div className="space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-surface border border-edge rounded-xl p-3">
              <span className="text-[10px] text-ink-faint uppercase">মোট লেনদেন</span>
              <p className="text-base font-bold text-ink mt-0.5">{metrics.total} টি</p>
              <span className="text-[10px] text-ink-muted">স্টেটমেন্ট ফাইল থেকে</span>
            </div>

            <div className="bg-surface border border-sky-500/30 rounded-xl p-3">
              <span className="text-[10px] text-sky-400 uppercase">নির্বাচিত হবে</span>
              <p className="text-base font-bold text-sky-300 mt-0.5">{metrics.selectedCount} টি</p>
              <span className="text-[10px] text-sky-400/80">লেজারে যুক্ত হবে</span>
            </div>

            <div className="bg-surface border border-negative/30 rounded-xl p-3">
              <span className="text-[10px] text-negative uppercase">মোট খরচ (Debit)</span>
              <p className="text-base font-bold text-negative mt-0.5">৳{metrics.totalExpense.toLocaleString()}</p>
              <span className="text-[10px] text-negative/80">অ্যাকাউন্ট থেকে কমবে</span>
            </div>

            <div className="bg-surface border border-accent/30 rounded-xl p-3">
              <span className="text-[10px] text-accent-strong uppercase">মোট আয় (Credit)</span>
              <p className="text-base font-bold text-accent-strong mt-0.5">৳{metrics.totalIncome.toLocaleString()}</p>
              <span className="text-[10px] text-accent-strong/80">অ্যাকাউন্টে বাড়বে</span>
            </div>
          </div>

          {/* Action Bar & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/60 border border-edge rounded-xl p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRowFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  rowFilter === 'all'
                    ? 'bg-sky-500 text-accent-ink font-bold shadow-xs'
                    : 'bg-raised text-ink-muted hover:text-ink'
                }`}
              >
                সব ({metrics.total})
              </button>

              <button
                onClick={() => setRowFilter('ready')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  rowFilter === 'ready'
                    ? 'bg-sky-500 text-accent-ink font-bold shadow-xs'
                    : 'bg-raised text-ink-muted hover:text-ink'
                }`}
              >
                আমদানির জন্য প্রস্তুত ({metrics.selectedCount})
              </button>

              {metrics.duplicates > 0 && (
                <button
                  onClick={() => setRowFilter('duplicates')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    rowFilter === 'duplicates'
                      ? 'bg-warning text-accent-ink font-bold shadow-xs'
                      : 'bg-amber-950/40 text-warning border border-warning/30'
                  }`}
                >
                  সম্ভাব্য ডুপ্লিকেট ({metrics.duplicates})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSelectNonDuplicatesOnly}
                className="px-3 py-1.5 rounded-lg bg-raised hover:bg-slate-700 text-ink-soft text-xs font-medium cursor-pointer"
              >
                ডুপ্লিকেট বাদে সব নির্বাচন
              </button>

              <button
                onClick={() => handleSelectAll(false)}
                className="px-2.5 py-1.5 rounded-lg bg-raised hover:bg-slate-700 text-ink-muted hover:text-ink text-xs cursor-pointer"
              >
                সব বাতিল
              </button>

              <button
                onClick={handleExecuteBatchPost}
                disabled={isPosting || metrics.selectedCount === 0}
                className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${isPosting ? 'animate-spin' : ''}`} />
                <span>{isPosting ? 'পোস্ট হচ্ছে...' : `${metrics.selectedCount}টি লেনদেন ইমপোর্ট করুন`}</span>
              </button>
            </div>
          </div>

          {postError && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-negative/30 text-negative text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-negative" />
              <span>{postError}</span>
            </div>
          )}

          {/* Statement Rows Table */}
          <div className="overflow-x-auto rounded-xl border border-edge bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-ink-muted border-b border-edge font-mono">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={metrics.selectedCount === metrics.total && metrics.total > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-700 bg-raised text-sky-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2.5">তারিখ (Date)</th>
                  <th className="px-3 py-2.5">বিবরণ (Narration)</th>
                  <th className="px-3 py-2.5">ক্যাটাগরি (Category)</th>
                  <th className="px-3 py-2.5">ধরণ (Type)</th>
                  <th className="px-3 py-2.5 text-right">পরিমাণ (Amount)</th>
                  <th className="px-3 py-2.5">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ink-faint text-xs">
                      কোনো লেনদেন পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={`transition-colors ${
                        !row.selected
                          ? 'opacity-60 bg-canvas'
                          : row.type === 'income'
                          ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                          : 'hover:bg-surface/30'
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!row.isValid}
                          onChange={() => handleToggleRow(row.rowNumber)}
                          className="rounded border-slate-700 bg-raised text-sky-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap text-ink-soft">
                        {row.isoDate}
                      </td>

                      <td className="px-3 py-2 max-w-xs">
                        <input
                          type="text"
                          value={row.cleanDescription}
                          onChange={(e) => handleRowDescriptionChange(row.rowNumber, e.target.value)}
                          className="w-full px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-xs focus:outline-none focus:border-sky-500 truncate"
                        />
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={row.suggestedCategoryId}
                          onChange={(e) => handleRowCategoryChange(row.rowNumber, e.target.value)}
                          className="px-2 py-1 rounded bg-surface border border-slate-700 text-ink text-xs focus:outline-none focus:border-sky-500"
                        >
                          {categories
                            .filter((c) => c.type === row.type)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            row.type === 'income'
                              ? 'bg-accent/20 text-accent-strong border border-accent/30'
                              : 'bg-negative/20 text-negative border border-negative/30'
                          }`}
                        >
                          {row.type === 'income' ? 'জমা / Income' : 'খরচ / Expense'}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap">
                        <span className={row.type === 'income' ? 'text-accent-strong' : 'text-negative'}>
                          {row.type === 'income' ? '+' : '-'}৳{row.rawAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                        {row.isDuplicate ? (
                          <span
                            className="text-warning flex items-center gap-1 cursor-help"
                            title={row.duplicateReason}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>ডুপ্লিকেট সতর্কতা</span>
                          </span>
                        ) : !row.isValid ? (
                          <span className="text-negative flex items-center gap-1" title={row.validationError}>
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>ত্রুটি</span>
                          </span>
                        ) : (
                          <span className="text-accent-strong flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>নতুন</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 4: Success Confirmation */}
      {currentStep === 4 && (
        <div className="rounded-2xl border border-accent/40 bg-emerald-950/20 p-8 text-center space-y-4 max-w-xl mx-auto">
          <div className="h-16 w-16 bg-accent/20 text-accent-strong rounded-full flex items-center justify-center mx-auto border border-accent/40">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-ink">স্টেটমেন্ট ইমপোর্ট সফলভাবে সম্পন্ন হয়েছে!</h2>
            <p className="text-xs text-ink-soft mt-1">
              মোট <strong className="text-accent-strong">{postedCount}টি</strong> লেনদেন আপনার "{targetAccount?.name}" অ্যাকাউন্টে ডাবল-এন্ট্রি ব্যালেন্স সহ পোস্ট করা হয়েছে।
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {onNavigate && (
              <button
                onClick={() => onNavigate('ledger')}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-strong text-accent-ink font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                <span>লেজারে গিয়ে লেনদেন দেখুন</span>
              </button>
            )}

            <button
              onClick={() => {
                setFileName('');
                setParsedTable(null);
                setStatementRows([]);
                setCurrentStep(1);
              }}
              className="px-4 py-2.5 rounded-xl bg-raised hover:bg-slate-700 text-ink-soft text-xs font-semibold border border-slate-700 cursor-pointer"
            >
              আরেকটি ফাইল ইমপোর্ট করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
