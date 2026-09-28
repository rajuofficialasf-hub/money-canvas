import React, { useState, useRef } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { useAuth } from '../../lib/auth-context';
import { GoogleIcon } from '../icons/GoogleIcon';
import {
  uploadBackupToGoogleDrive,
  findBackupInGoogleDrive,
  downloadBackupFromGoogleDrive,
} from '../../lib/google-drive-service';
import {
  exportAccountsToCsv,
  exportTransactionsToCsv,
  exportTradesToCsv,
  exportDividendsToCsv,
  downloadFile,
} from '../../lib/audit-and-alerts';
import {
  exportNbrTaxStatementPdf,
  exportBalanceSheetPdf,
  exportIncomeStatementPdf,
  exportPortfolioValuationPdf,
  exportAuditReportPdf,
} from '../../lib/pdf-export-engine';
import {
  generateBalanceSheetReport,
  generateIncomeStatementReport,
  calculateCapitalGainsTaxSummary,
} from '../../lib/accounting-engine';
import {
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  HardDrive,
  Shield,
  Layers,
  FileText,
  CloudUpload,
  CloudDownload,
  Users,
} from 'lucide-react';
import { BackupBundle } from '../../types/accounting';

export const BackupRestoreView: React.FC = () => {
  const { user, googleAccessToken, isGoogleAuthenticated, signInWithGoogle, updateUserDriveSyncStatus } = useAuth();
  const {
    accounts,
    accountBalances,
    transactions,
    transactionLines,
    categories,
    stocks,
    stockHoldings,
    stockTransactions,
    brokerCashBalances,
    dividends,
    debts,
    loans,
    physicalAssets,
    fixedDeposits,
    dpsAccounts,
    auditLogs,
    portfolioPerformanceMetrics,
    exportFullBackup,
    restoreFromBackup,
    resetTenantLedger,
  } = useLedger();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);
  const [isDriveRestoring, setIsDriveRestoring] = useState(false);
  const [driveMsg, setDriveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [parsedBundle, setParsedBundle] = useState<BackupBundle | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Reset confirmation state
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmResetText, setConfirmResetText] = useState('');

  const handleBackupToDrive = async () => {
    if (!googleAccessToken) {
      setDriveMsg({ type: 'error', text: 'Not signed in with Google. Please sign in first.' });
      return;
    }

    setIsDriveBackingUp(true);
    setDriveMsg(null);
    await updateUserDriveSyncStatus('pending');

    const bundle = exportFullBackup();
    const result = await uploadBackupToGoogleDrive(googleAccessToken, bundle);

    setIsDriveBackingUp(false);

    if (result.success) {
      await updateUserDriveSyncStatus('synced', result.lastBackupAt);
      setDriveMsg({
        type: 'success',
        text: `Your ledger was successfully backed up to Google Drive! (${new Date().toLocaleTimeString()})`,
      });
    } else {
      await updateUserDriveSyncStatus('error');
      setDriveMsg({
        type: 'error',
        text: result.error || 'Failed to save backup to Google Drive.',
      });
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!googleAccessToken) {
      setDriveMsg({ type: 'error', text: 'Not signed in with Google. Please sign in first.' });
      return;
    }

    setIsDriveRestoring(true);
    setDriveMsg(null);

    const backupInfo = await findBackupInGoogleDrive(googleAccessToken);

    if (!backupInfo) {
      setIsDriveRestoring(false);
      setDriveMsg({
        type: 'error',
        text: 'No backup file found in your Google Drive AppData folder.',
      });
      return;
    }

    const { bundle, error } = await downloadBackupFromGoogleDrive(googleAccessToken, backupInfo.fileId);

    setIsDriveRestoring(false);

    if (error || !bundle) {
      setDriveMsg({
        type: 'error',
        text: error || 'Failed to download backup from Google Drive.',
      });
      return;
    }

    const res = restoreFromBackup(bundle);
    if (res.success) {
      setRestoreSuccess(true);
      setDriveMsg({
        type: 'success',
        text: `Successfully restored all ledger data from Google Drive backup!`,
      });
    } else {
      setDriveMsg({
        type: 'error',
        text: res.error || 'Failed to restore backup file.',
      });
    }
  };

  const handleExportFullJson = () => {
    setIsExporting(true);
    setTimeout(() => {
      const bundle = exportFullBackup();
      const content = JSON.stringify(bundle, null, 2);
      const filename = `weathfolio-backup-${user.fullName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(filename, content, 'application/json');
      setIsExporting(false);
    }, 400);
  };

  const handleExportCsv = (type: 'accounts' | 'ledger' | 'trades' | 'dividends') => {
    const dateStr = new Date().toISOString().split('T')[0];
    if (type === 'accounts') {
      const csv = exportAccountsToCsv(accounts, accountBalances);
      downloadFile(`accounts-registry-${dateStr}.csv`, csv, 'text/csv');
    } else if (type === 'ledger') {
      const csv = exportTransactionsToCsv(transactions, transactionLines);
      downloadFile(`double-entry-ledger-${dateStr}.csv`, csv, 'text/csv');
    } else if (type === 'trades') {
      const csv = exportTradesToCsv(stockTransactions);
      downloadFile(`dse-stock-trades-${dateStr}.csv`, csv, 'text/csv');
    } else if (type === 'dividends') {
      const csv = exportDividendsToCsv(dividends);
      downloadFile(`dividends-portfolio-${dateStr}.csv`, csv, 'text/csv');
    }
  };

  const handleExportPdfStatement = (type: 'nbr_tax' | 'balance_sheet' | 'pnl' | 'valuation' | 'audit') => {
    if (type === 'nbr_tax') {
      const taxSummary = calculateCapitalGainsTaxSummary(stockTransactions, stocks, dividends, 0, '2025-2026', 5000000, 15);
      exportNbrTaxStatementPdf(
        user,
        {
          fiscalYear: '2025-2026',
          exemptionThreshold: 5000000,
          taxRatePct: 15,
          summary: {
            totalRealizedGain: taxSummary.totalRealizedGains,
            totalCapitalLoss: taxSummary.totalRealizedLosses,
            netRealizedGain: taxSummary.netCapitalGain,
            taxableGain: taxSummary.taxableCapitalGain,
            taxLiability: taxSummary.estimatedTaxLiability,
            totalAitCredits: taxSummary.totalAdvanceTaxCredits,
            netTaxPayableOrRefund: taxSummary.netTaxPayableOrRefund,
          },
          trades: taxSummary.gainItems.map((item) => ({
            id: item.id,
            stockSymbol: item.symbol,
            sellDate: item.tradeDate,
            quantity: item.quantity,
            saleValueNet: item.netProceeds,
            costBasisTotal: item.costBasis,
            gainOrLoss: item.realizedGainLoss,
            gainOrLossPct: item.gainLossPct,
            holdingPeriodDays: item.holdingType === 'long_term' ? 400 : 120,
            isApplicableFor15Percent: item.holdingType === 'long_term',
            taxTreatment: item.holdingType === 'long_term' ? 'long_term' : 'short_term',
            taxPayable: item.realizedGainLoss > 0 ? (item.realizedGainLoss * 0.15) : 0,
          })),
        },
        '2025-2026'
      );
    } else if (type === 'balance_sheet') {
      const bs = generateBalanceSheetReport(accountBalances, brokerCashBalances, stockHoldings, debts);
      const assetsItems = bs.currentAssetCategories.flatMap((cat) =>
        cat.items.map((it) => ({
          name: `${cat.categoryName} - ${it.name}`,
          amount: it.amount,
          code: it.details || '',
        }))
      ).concat(
        bs.nonCurrentAssetCategories.flatMap((cat) =>
          cat.items.map((it) => ({
            name: `${cat.categoryName} - ${it.name}`,
            amount: it.amount,
            code: it.details || '',
          }))
        )
      );

      const liabilitiesItems = bs.liabilityCategories.flatMap((cat) =>
        cat.items.map((it) => ({
          name: `${cat.categoryName} - ${it.name}`,
          amount: it.amount,
          code: it.details || '',
        }))
      );

      const equityItems = [
        { name: 'Retained Earnings & Cumulative Net Surplus', amount: bs.netWorth, code: 'EQ-3001' },
      ];

      exportBalanceSheetPdf(user, assetsItems, liabilitiesItems, equityItems, bs.totalAssets, bs.totalLiabilities, bs.netWorth, bs.asOfDate);
    } else if (type === 'pnl') {
      const pnl = generateIncomeStatementReport(transactions, transactionLines, categories, dividends, 0, '2026-01-01', '2026-12-31');
      const revenueItems = pnl.incomeCategories.map((c) => ({
        name: c.categoryName,
        amount: c.netAmount,
        code: 'INC-4000',
      }));
      const expenseItems = pnl.expenseCategories.map((c) => ({
        name: c.categoryName,
        amount: c.netAmount,
        code: 'EXP-5000',
      }));

      exportIncomeStatementPdf(user, revenueItems, expenseItems, pnl.totalIncome, pnl.totalExpenses, pnl.netSurplus, 'CY 2026');
    } else if (type === 'valuation') {
      exportPortfolioValuationPdf(user, stockHoldings, portfolioPerformanceMetrics, {
        dsexReturnPct: portfolioPerformanceMetrics.dsexTwrPct,
        alphaPct: portfolioPerformanceMetrics.alphaPct,
      });
    } else if (type === 'audit') {
      exportAuditReportPdf(user, auditLogs, true, auditLogs.length);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setParseError(null);
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text) as BackupBundle;

        if (!json.metadata || !json.data) {
          throw new Error('Invalid schema: Root object must contain "metadata" and "data" keys.');
        }

        if (!json.data.accounts || !json.data.transactions) {
          throw new Error('Incomplete ledger bundle: Missing core accounts or transactions tables.');
        }

        setParsedBundle(json);
      } catch (err: any) {
        setParseError(err?.message || 'Failed to read or parse JSON file.');
        setParsedBundle(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!parsedBundle) return;
    const result = restoreFromBackup(parsedBundle);
    if (result.success) {
      setRestoreSuccess(true);
      setRestoreFile(null);
      setParsedBundle(null);
      setTimeout(() => setRestoreSuccess(false), 5000);
    } else {
      setParseError(result.error || 'Failed to apply backup.');
    }
  };

  const handleExecuteReset = () => {
    if (confirmResetText.trim() === 'CONFIRM RESET') {
      resetTenantLedger();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
          <Database className="h-4 w-4" />
          <span>Data Lifecycle & Backup Portal</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Data Backup, Export & Restore
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Export full encrypted JSON snapshots, download granular CSV spreadsheets for tax and audit compliance, or restore past state.
        </p>
      </div>

      {/* Google Drive Cloud Sync Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Automatic Google Drive Cloud Backup</h2>
                {isGoogleAuthenticated && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Connected
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Your financial data is encrypted and saved inside your private Google Drive AppData folder. Even if you re-install the app, your data restores instantly.
              </p>
            </div>
          </div>

          {!isGoogleAuthenticated ? (
            <button
              onClick={signInWithGoogle}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-lg transition-all shrink-0"
            >
              <GoogleIcon className="h-4 w-4 bg-white p-0.5 rounded-full shrink-0" />
              <span>Sign In with Google</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleBackupToDrive}
                disabled={isDriveBackingUp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                <CloudUpload className={`h-4 w-4 ${isDriveBackingUp ? 'animate-bounce' : ''}`} />
                <span>{isDriveBackingUp ? 'Saving to Drive...' : 'Backup to Drive'}</span>
              </button>

              <button
                onClick={handleRestoreFromDrive}
                disabled={isDriveRestoring}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <CloudDownload className={`h-4 w-4 ${isDriveRestoring ? 'animate-spin' : ''}`} />
                <span>{isDriveRestoring ? 'Restoring...' : 'Restore from Drive'}</span>
              </button>
            </div>
          )}
        </div>

        {driveMsg && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              driveMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {driveMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{driveMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <p className="text-[10px] text-slate-500 uppercase font-mono">Logged In User</p>
            <p className="text-slate-200 font-semibold mt-0.5 truncate">{user.fullName}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <p className="text-[10px] text-slate-500 uppercase font-mono">Cloud Security</p>
            <p className="text-emerald-400 font-semibold mt-0.5">100% Encrypted & Private</p>
            <p className="text-[10px] text-slate-400">Stored in your private Google Drive</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <p className="text-[10px] text-slate-500 uppercase font-mono">Last Drive Backup</p>
            <p className="text-slate-200 font-semibold mt-0.5">
              {user.lastDriveBackupAt
                ? new Date(user.lastDriveBackupAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No backup taken yet'}
            </p>
            <p className="text-[10px] text-slate-400">Automatic Sync Active</p>
          </div>
        </div>
      </div>

      {restoreSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white text-sm">Ledger State Restored Successfully!</div>
            <p className="text-slate-300 mt-0.5">
              All accounts, journal lines, investment holdings, loans, and audit records have been loaded.
            </p>
          </div>
        </div>
      )}

      {/* Grid: JSON Export & CSV Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Complete JSON Backup Export */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FileJson className="h-5 w-5 text-emerald-400" />
                <span>Full JSON System Backup</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Schema v5.0 Encapsulated
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Downloads a unified, portable JSON snapshot containing your entire financial graph — 
              accounts, double-entry transactions, loans, fixed deposits, stock portfolios, and cryptographic audit hashes.
            </p>

            <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 text-xs font-mono space-y-2 text-slate-400">
              <div className="flex justify-between">
                <span>Active Tenant:</span>
                <span className="text-white font-medium">{user.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Accounts:</span>
                <span className="text-emerald-400">{accounts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Journal Transactions:</span>
                <span className="text-emerald-400">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>DSE Stock Trades:</span>
                <span className="text-emerald-400">{stockTransactions.length}</span>
              </div>
            </div>

            <button
              onClick={handleExportFullJson}
              disabled={isExporting}
              className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Packaging Snapshot...' : 'Download Complete Backup (JSON)'}</span>
            </button>
          </div>
        </div>

        {/* Right: Granular CSV Exports */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FileSpreadsheet className="h-5 w-5 text-sky-400" />
                <span>Spreadsheet / CSV Exports</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">RFC-4180 Format</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Export specific ledgers to CSV format for Excel, Google Sheets, or accountant tax submission.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Accounts & Balances</div>
                  <div className="text-[11px] text-slate-400">{accounts.length} accounts with live balances</div>
                </div>
                <button
                  onClick={() => handleExportCsv('accounts')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">General Journal Ledger</div>
                  <div className="text-[11px] text-slate-400">{transactionLines.length} double-entry line items</div>
                </div>
                <button
                  onClick={() => handleExportCsv('ledger')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Stock Trades & Execution Log</div>
                  <div className="text-[11px] text-slate-400">{stockTransactions.length} buy/sell trade records</div>
                </div>
                <button
                  onClick={() => handleExportCsv('trades')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Dividends & Corporate Actions</div>
                  <div className="text-[11px] text-slate-400">{dividends.length} dividend payouts & tax credits</div>
                </div>
                <button
                  onClick={() => handleExportCsv('dividends')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Financial PDF Statements & Reports */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <FileText className="h-5 w-5 text-rose-400" />
            <span>Official Financial PDF Statement Generation</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Vector Typography & Auto-Calculated Stamps
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Generate publication-grade PDF documents with official double-entry verification seals, tax assessment schedules, and cryptographic authenticity headers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">NBR Tax Schedule</div>
              <div className="text-[11px] text-slate-400 mt-1">Section 32/57 Capital Gains Return</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('nbr_tax')}
              className="w-full py-2 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Tax PDF</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">Balance Sheet</div>
              <div className="text-[11px] text-slate-400 mt-1">Statement of Financial Position</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('balance_sheet')}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Balance Sheet PDF</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">Income Statement</div>
              <div className="text-[11px] text-slate-400 mt-1">P&L Operating Surplus & Margins</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('pnl')}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>P&L PDF</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">DSE Valuation</div>
              <div className="text-[11px] text-slate-400 mt-1">Holdings, WAC & Return Analysis</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('valuation')}
              className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Valuation PDF</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">Audit Certificate</div>
              <div className="text-[11px] text-slate-400 mt-1">Cryptographic Hash Seal Log</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('audit')}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Audit PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Upload className="h-5 w-5 text-amber-400" />
            <span>Restore Ledger from JSON Backup</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Pre-flight Validation Enabled</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/50"
            >
              <Upload className="h-8 w-8 text-slate-500 mx-auto mb-3" />
              <div className="text-xs font-semibold text-white">
                {restoreFile ? restoreFile.name : 'Click to select JSON backup file'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Accepts .json backup files generated by FinOS Master v5
              </p>
            </div>

            {parseError && (
              <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 space-y-4">
            {parsedBundle ? (
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-semibold border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Valid Backup Verified</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Schema {parsedBundle.metadata.schemaVersion}</span>
                </div>

                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div>Original Owner: <span className="text-white">{parsedBundle.metadata.userFullName}</span></div>
                  <div>Export Timestamp: <span className="text-slate-400">{parsedBundle.metadata.exportedAt}</span></div>
                  <div>Accounts Included: <span className="text-emerald-400">{parsedBundle.metadata.recordCounts.accounts || 0}</span></div>
                  <div>Transactions Included: <span className="text-emerald-400">{parsedBundle.metadata.recordCounts.transactions || 0}</span></div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExecuteRestore}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Apply & Overwrite Current Tenant State</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-950/40 border border-slate-800/60 p-6 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center h-full">
                <Shield className="h-6 w-6 text-slate-600 mb-2" />
                <span>Select a backup file to inspect record contents before applying.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone: Factory Reset */}
      <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <span>Danger Zone: Hard Tenant Factory Reset</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          Permanently wipes all local accounts, transactions, investments, and audit records for the active tenant profile. 
          The application will return to a clean initial state. This action cannot be undone.
        </p>

        {!showResetModal ? (
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-mono font-semibold flex items-center gap-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset Tenant Data</span>
          </button>
        ) : (
          <div className="p-4 rounded-lg bg-slate-950 border border-rose-500/50 space-y-3 max-w-md font-mono text-xs">
            <div className="text-rose-400 font-semibold">
              Type "CONFIRM RESET" to purge active tenant:
            </div>
            <input
              type="text"
              value={confirmResetText}
              onChange={(e) => setConfirmResetText(e.target.value)}
              placeholder="CONFIRM RESET"
              className="w-full px-3 py-2 rounded border border-slate-800 bg-slate-900 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleExecuteReset}
                disabled={confirmResetText.trim() !== 'CONFIRM RESET'}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors disabled:opacity-30"
              >
                Permanently Purge
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setConfirmResetText('');
                }}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
