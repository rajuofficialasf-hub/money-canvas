import { todayLocalISO, toLocalISO } from '../../lib/date-utils';
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useLedger } from '../../lib/ledger-context';
import {
  calculateCapitalGainsTaxSummary,
  calculateTaxLossHarvesting,
  calculateSectorAllocation,
  generateBalanceSheetReport,
  generateIncomeStatementReport,
  generateCsvString,
  downloadBrowserFile,
} from '../../lib/accounting-engine';
import {
  exportNbrTaxStatementPdf,
  exportBalanceSheetPdf,
  exportIncomeStatementPdf,
} from '../../lib/pdf-export-engine';
import {
  FileText,
  PieChart,
  BarChart3,
  Download,
  Printer,
  ShieldCheck,
  AlertCircle,
  Percent,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  Scale,
  Receipt,
} from 'lucide-react';
import { Field, Input, Select, Button } from '../ui';

interface FinancialAnalyticsAndReportsViewProps {
  onNavigateToPortfolio?: () => void;
  onNavigateToTrades?: () => void;
  onNavigateToDividends?: () => void;
}

export const FinancialAnalyticsAndReportsView: React.FC<FinancialAnalyticsAndReportsViewProps> = ({
  onNavigateToPortfolio: _onNavigateToPortfolio,
  onNavigateToTrades: _onNavigateToTrades,
  onNavigateToDividends: _onNavigateToDividends,
}) => {
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
  } = useLedger();

  const { user } = useAuth();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'tax' | 'sectors' | 'statements' | 'export'>('tax');

  // Statements sub-tab
  const [statementSubTab, setStatementSubTab] = useState<'balance_sheet' | 'pnl'>('balance_sheet');
  const [pdfToast, setPdfToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showPdfToast = (message: string, type: 'success' | 'error' = 'success') => {
    setPdfToast({ message, type });
    setTimeout(() => setPdfToast(null), 4000);
  };

  // Fiscal Year & Tax configuration
  const [fiscalYear, setFiscalYear] = useState<string>('2026-2027');
  const [exemptionThreshold, setExemptionThreshold] = useState<number>(5000000); // 50 Lakh BDT
  const [taxRatePct, setTaxRatePct] = useState<number>(15); // 15% standard capital gains tax rate
  const [harvestTaxRate] = useState<number>(15);

  // Income Statement date filter
  const [pnlDateRange, setPnlDateRange] = useState<'month' | 'quarter' | 'year' | 'all'>('year');

  const { pnlStartDate, pnlEndDate } = useMemo(() => {
    const today = new Date();
    const todayStr = toLocalISO(today);
    if (pnlDateRange === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      return { pnlStartDate: firstDay, pnlEndDate: todayStr };
    } else if (pnlDateRange === 'quarter') {
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
      const firstDay = new Date(today.getFullYear(), quarterMonth, 1)
        .toISOString()
        .split('T')[0];
      return { pnlStartDate: firstDay, pnlEndDate: todayStr };
    } else if (pnlDateRange === 'year') {
      // Fiscal year: July 1 to June 30
      const currentYear = today.getFullYear();
      const fyStart =
        today.getMonth() >= 6
          ? `${currentYear}-07-01`
          : `${currentYear - 1}-07-01`;
      return { pnlStartDate: fyStart, pnlEndDate: todayStr };
    }
    return { pnlStartDate: undefined, pnlEndDate: undefined };
  }, [pnlDateRange]);

  // ----------------------------------------------------
  // Compute Phase 8 Models
  // ----------------------------------------------------

  // 1. Capital Gains & Tax Summary
  const taxSummary = useMemo(() => {
    // Calculate bank interest TDS estimate from FD / DPS
    const totalFdTax = fixedDeposits.reduce((s, fd) => {
      const grossInterest = Math.max(0, (fd.expectedMaturityAmount || 0) - (fd.principalAmount || 0));
      return s + grossInterest * ((fd.taxRate || 10) / 100);
    }, 0);
    const totalDpsTax = dpsAccounts.reduce((s, dps) => {
      return s + Math.max(0, (dps.grossInterest || 0) - (dps.netInterest || 0));
    }, 0);
    const estimatedBankTds = Math.round((totalFdTax + totalDpsTax) * 100) / 100;

    return calculateCapitalGainsTaxSummary(
      stockTransactions,
      stocks,
      dividends,
      estimatedBankTds,
      fiscalYear,
      exemptionThreshold,
      taxRatePct
    );
  }, [stockTransactions, stocks, dividends, fixedDeposits, dpsAccounts, fiscalYear, exemptionThreshold, taxRatePct]);

  // 2. Tax-Loss Harvesting Candidates
  const harvestCandidates = useMemo(() => {
    return calculateTaxLossHarvesting(stockHoldings, harvestTaxRate);
  }, [stockHoldings, harvestTaxRate]);

  const totalPotentialTaxSavings = harvestCandidates.reduce((s, h) => s + h.potentialTaxSavings, 0);

  // 3. Sector Allocation
  const sectorSummary = useMemo(() => {
    return calculateSectorAllocation(stockHoldings);
  }, [stockHoldings]);

  // 4. Balance Sheet Report (Lock 1 & Lock 2)
  const balanceSheet = useMemo(() => {
    return generateBalanceSheetReport(
      accountBalances,
      brokerCashBalances,
      stockHoldings,
      debts
    );
  }, [accountBalances, brokerCashBalances, stockHoldings, debts]);

  // 5. Income Statement (P&L) Report (Lock 6)
  const incomeStatement = useMemo(() => {
    const realizedGainsInPeriod = taxSummary.totalRealizedGains - taxSummary.totalRealizedLosses;
    return generateIncomeStatementReport(
      transactions,
      transactionLines,
      categories,
      dividends,
      realizedGainsInPeriod,
      pnlStartDate,
      pnlEndDate
    );
  }, [transactions, transactionLines, categories, dividends, taxSummary, pnlStartDate, pnlEndDate]);

  // ----------------------------------------------------
  // Export Handlers
  // ----------------------------------------------------

  const handleExportTaxCsv = () => {
    const headers = [
      'Trade Date',
      'Symbol',
      'Company Name',
      'Quantity Sold',
      'Gross Sale (BDT)',
      'Charges Deducted (BDT)',
      'Net Proceeds (BDT)',
      'Cost Basis WAC (BDT)',
      'Realized Gain/Loss (BDT)',
      'Return %',
      'Holding Type',
      'AIT 0.05% Withheld (BDT)',
    ];

    const rows = taxSummary.gainItems.map((item) => [
      item.tradeDate,
      item.symbol,
      item.companyName,
      item.quantity,
      item.grossSaleValue.toFixed(2),
      item.chargesDeducted.toFixed(2),
      item.netProceeds.toFixed(2),
      item.costBasis.toFixed(2),
      item.realizedGainLoss.toFixed(2),
      `${item.gainLossPct.toFixed(2)}%`,
      item.holdingType.toUpperCase(),
      item.aitWithheld.toFixed(2),
    ]);

    // Append summary rows
    rows.push([]);
    rows.push(['SUMMARY FOR FISCAL YEAR', fiscalYear]);
    rows.push(['Total Realized Capital Gains', taxSummary.totalRealizedGains.toFixed(2)]);
    rows.push(['Total Realized Capital Losses', taxSummary.totalRealizedLosses.toFixed(2)]);
    rows.push(['Net Capital Gain', taxSummary.netCapitalGain.toFixed(2)]);
    rows.push(['NBR Exemption Threshold', taxSummary.exemptionThreshold.toFixed(2)]);
    rows.push(['Taxable Capital Gain', taxSummary.taxableCapitalGain.toFixed(2)]);
    rows.push(['Estimated Tax Liability (15%)', taxSummary.estimatedTaxLiability.toFixed(2)]);
    rows.push(['Total Trade AIT Withheld (0.05%)', taxSummary.totalTradeAitPaid.toFixed(2)]);
    rows.push(['Total Dividend AIT Withheld (10%)', taxSummary.totalDividendAitPaid.toFixed(2)]);
    rows.push(['Total Bank Interest TDS Paid', taxSummary.totalBankTdsPaid.toFixed(2)]);
    rows.push(['Total Advance Tax Credits', taxSummary.totalAdvanceTaxCredits.toFixed(2)]);
    rows.push(['Net Tax Payable / (Refund)', taxSummary.netTaxPayableOrRefund.toFixed(2)]);

    const csv = generateCsvString(headers, rows);
    downloadBrowserFile(csv, `NBR_Capital_Gains_Tax_Return_${fiscalYear}.csv`);
    showPdfToast(`NBR Capital Gains Tax Return (${fiscalYear}) CSV downloaded.`);
  };

  const handleExportBalanceSheetCsv = () => {
    const headers = ['Category', 'Sub-Category / Account', 'Book Value (BDT)', 'Details'];
    const rows: (string | number)[][] = [];

    rows.push(['--- CURRENT ASSETS ---', '', balanceSheet.totalCurrentAssets.toFixed(2), '']);
    balanceSheet.currentAssetCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        rows.push([cat.categoryName, item.name, item.amount.toFixed(2), item.details || '']);
      });
    });

    rows.push([]);
    rows.push(['--- NON-CURRENT ASSETS ---', '', balanceSheet.totalNonCurrentAssets.toFixed(2), '']);
    balanceSheet.nonCurrentAssetCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        rows.push([cat.categoryName, item.name, item.amount.toFixed(2), item.details || '']);
      });
    });

    rows.push([]);
    rows.push(['TOTAL ASSETS', '', balanceSheet.totalAssets.toFixed(2), '100.00%']);

    rows.push([]);
    rows.push(['--- LIABILITIES (NEGATIVE IN CANONICAL LEDGER) ---', '', balanceSheet.totalLiabilities.toFixed(2), '']);
    balanceSheet.liabilityCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        rows.push([cat.categoryName, item.name, item.amount.toFixed(2), item.details || '']);
      });
    });

    rows.push([]);
    rows.push(['TOTAL LIABILITIES', '', balanceSheet.totalLiabilities.toFixed(2), `${balanceSheet.debtToAssetRatio.toFixed(2)}% of Assets`]);
    rows.push(['NET WORTH (OWNER EQUITY)', '', balanceSheet.netWorth.toFixed(2), `${balanceSheet.solvencyRatio.toFixed(2)}% Solvency`]);
    rows.push(['ACCOUNTING EQUATION BALANCED', '', balanceSheet.isBalanced ? 'TRUE (Assets = Net Worth + Liabilities)' : 'RECONCILING', '']);

    const csv = generateCsvString(headers, rows);
    downloadBrowserFile(csv, `Statement_of_Financial_Position_${balanceSheet.asOfDate}.csv`);
    showPdfToast(`Balance Sheet (${balanceSheet.asOfDate}) CSV downloaded.`);
  };

  const handleExportPnlCsv = () => {
    const headers = ['Type', 'Category Name', 'Gross Amount (BDT)', 'Refund Offsets (BDT)', 'Net Amount (BDT)', 'Share %'];
    const rows: (string | number)[][] = [];

    rows.push(['--- OPERATING & INVESTMENT INCOME ---', '', '', '', incomeStatement.totalIncome.toFixed(2), '100%']);
    incomeStatement.incomeCategories.forEach((c) => {
      rows.push(['Income', c.categoryName, c.grossAmount.toFixed(2), c.refundOffsets.toFixed(2), c.netAmount.toFixed(2), `${c.percentage.toFixed(1)}%`]);
    });

    rows.push([]);
    rows.push(['--- OPERATING EXPENSES (LOCK 6 REFUND OFFSET COMPLIANT) ---', '', '', '', incomeStatement.totalExpenses.toFixed(2), '100%']);
    incomeStatement.expenseCategories.forEach((c) => {
      rows.push(['Expense', c.categoryName, c.grossAmount.toFixed(2), c.refundOffsets.toFixed(2), c.netAmount.toFixed(2), `${c.percentage.toFixed(1)}%`]);
    });

    rows.push([]);
    rows.push(['NET OPERATING SURPLUS / (DEFICIT)', '', '', '', incomeStatement.netSurplus.toFixed(2), '']);
    rows.push(['SAVINGS RATE', '', '', '', `${incomeStatement.savingsRatePct.toFixed(2)}%`, '']);

    const csv = generateCsvString(headers, rows);
    downloadBrowserFile(csv, `Income_Statement_PnL_${incomeStatement.startDate}_to_${incomeStatement.endDate}.csv`);
    showPdfToast(`Income Statement (P&L) CSV downloaded.`);
  };

  const handleExportFullJsonBackup = () => {
    const backupData = {
      version: 'Build Plan v5 - Phase 8 Backup',
      exportDate: new Date().toISOString(),
      user: user,
      accounts,
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
      taxSummary,
      balanceSheet,
      sectorSummary,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    downloadBrowserFile(jsonStr, `Finance_OS_Full_Audit_Backup_${todayLocalISO()}.json`, 'application/json');
    showPdfToast('Complete System JSON Audit Backup downloaded.');
  };

  const handleExportTaxPdf = async () => {
    try {
      const ok = await exportNbrTaxStatementPdf(
        user,
        {
          fiscalYear,
          exemptionThreshold,
          taxRatePct,
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
            taxPayable: item.realizedGainLoss > 0 ? item.realizedGainLoss * (taxRatePct / 100) : 0,
          })),
        },
        fiscalYear
      );
      if (ok) {
        showPdfToast('NBR Capital Gains Tax Statement PDF downloaded successfully.');
      } else {
        showPdfToast('Failed to download PDF. Please check browser permissions.', 'error');
      }
    } catch (e) {
      showPdfToast('PDF generation error occurred.', 'error');
    }
  };

  const handleExportBalanceSheetPdf = async () => {
    try {
      const assetsItems = balanceSheet.currentAssetCategories
        .flatMap((cat) =>
          cat.items.map((it) => ({
            name: `${cat.categoryName} - ${it.name}`,
            amount: it.amount,
            code: it.details || '',
          }))
        )
        .concat(
          balanceSheet.nonCurrentAssetCategories.flatMap((cat) =>
            cat.items.map((it) => ({
              name: `${cat.categoryName} - ${it.name}`,
              amount: it.amount,
              code: it.details || '',
            }))
          )
        );

      const liabilitiesItems = balanceSheet.liabilityCategories.flatMap((cat) =>
        cat.items.map((it) => ({
          name: `${cat.categoryName} - ${it.name}`,
          amount: it.amount,
          code: it.details || '',
        }))
      );

      const equityItems = [
        { name: 'Retained Earnings & Cumulative Net Surplus', amount: balanceSheet.netWorth, code: 'EQ-3001' },
      ];

      const ok = await exportBalanceSheetPdf(
        user,
        assetsItems,
        liabilitiesItems,
        equityItems,
        balanceSheet.totalAssets,
        balanceSheet.totalLiabilities,
        balanceSheet.netWorth,
        balanceSheet.asOfDate
      );
      if (ok) {
        showPdfToast('Balance Sheet PDF downloaded successfully.');
      } else {
        showPdfToast('Failed to download PDF. Please check browser permissions.', 'error');
      }
    } catch (e) {
      showPdfToast('Balance Sheet PDF generation error.', 'error');
    }
  };

  const handleExportIncomeStatementPdf = async () => {
    try {
      const revenueItems = incomeStatement.incomeCategories.map((c) => ({
        name: c.categoryName,
        amount: c.netAmount,
        code: 'INC-4000',
      }));

      const expenseItems = incomeStatement.expenseCategories.map((c) => ({
        name: c.categoryName,
        amount: c.netAmount,
        code: 'EXP-5000',
      }));

      const ok = await exportIncomeStatementPdf(
        user,
        revenueItems,
        expenseItems,
        incomeStatement.totalIncome,
        incomeStatement.totalExpenses,
        incomeStatement.netSurplus,
        `${incomeStatement.startDate} to ${incomeStatement.endDate}`
      );
      if (ok) {
        showPdfToast('Income Statement PDF downloaded successfully.');
      } else {
        showPdfToast('Failed to download PDF. Please check browser permissions.', 'error');
      }
    } catch (e) {
      showPdfToast('Income Statement PDF generation error.', 'error');
    }
  };

  const handlePrint = () => {
    try {
      showPdfToast('Opening print dialog for financial statement view...');
      window.print();
    } catch {
      showPdfToast('Print dialog unavailable. You can download the PDF statement instead.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              Financial Analytics, Capital Gains & Tax Reports
            </h1>
            <span className="text-[10px] bg-accent/10 text-accent-strong font-mono px-2 py-0.5 rounded border border-accent/20">
              Phase 8 Active · NBR Compliant
            </span>
          </div>
          {/* UX-11: long feature paragraph compressed to one line; full text kept in the tooltip */}
          <p
            className="text-xs text-ink-muted mt-1 truncate max-w-xl cursor-help"
            title="Authoritative Capital Gains Tax Engine (Finance Act 2024), Multi-Asset Balance Sheet, Lock 6 Income Statement, and Sector Diversification Analytics."
          >
            NBR-compliant capital gains tax, financial statements &amp; sector analytics
          </p>
        </div>

        {/* Global Export & Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {activeTab === 'tax' && (
            <button
              onClick={handleExportTaxPdf}
              className="px-2.5 sm:px-3.5 py-1.5 bg-rose-600/90 hover:bg-negative text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-950 transition-colors"
              title="Generate NBR Schedule of Capital Gains PDF"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="sm:hidden">Tax PDF</span>
                <span className="hidden sm:inline">Download NBR Tax PDF</span>
              </span>
            </button>
          )}

          {activeTab === 'statements' && statementSubTab === 'balance_sheet' && (
            <Button
              onClick={handleExportBalanceSheetPdf}
              variant="primary"
              size="sm"
              icon={FileText}
              title="Generate Balance Sheet PDF Statement"
            >
              <span>
                <span className="sm:hidden">Balance Sheet PDF</span>
                <span className="hidden sm:inline">Download Balance Sheet PDF</span>
              </span>
            </Button>
          )}

          {activeTab === 'statements' && statementSubTab === 'pnl' && (
            <Button
              onClick={handleExportIncomeStatementPdf}
              variant="primary"
              size="sm"
              icon={FileText}
              title="Generate Income Statement (P&L) PDF"
            >
              <span>
                <span className="sm:hidden">P&L PDF</span>
                <span className="hidden sm:inline">Download P&L PDF</span>
              </span>
            </Button>
          )}

          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-3.5 w-3.5 text-ink-muted shrink-0" />
            <span>Print</span>
          </Button>
          <button
            onClick={handleExportFullJsonBackup}
            className="px-2.5 sm:px-3 py-1.5 bg-indigo-950/60 border border-indigo-700/60 hover:border-indigo-500 text-indigo-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span>
              <span className="sm:hidden">JSON</span>
              <span className="hidden sm:inline">JSON Backup</span>
            </span>
          </button>
          <Button
            onClick={() => {
              if (activeTab === 'statements') {
                if (statementSubTab === 'balance_sheet') {
                  handleExportBalanceSheetCsv();
                } else {
                  handleExportPnlCsv();
                }
              } else {
                handleExportTaxCsv();
              }
            }}
            variant="secondary"
            size="sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-accent-strong shrink-0" />
            <span>
              <span className="sm:hidden">CSV</span>
              <span className="hidden sm:inline">Export CSV</span>
            </span>
          </Button>
        </div>
      </div>

      {/* PDF Export Feedback Toast */}
      {pdfToast && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            pdfToast.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-accent-strong'
              : 'bg-rose-950/40 border-rose-800/60 text-negative'
          }`}
        >
          {pdfToast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-accent-strong shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-negative shrink-0" />
          )}
          <span>{pdfToast.message}</span>
        </div>
      )}

      {/* Top 4 KPI Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="bg-surface/60 border border-edge rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
            Consolidated Net Worth
          </div>
          <div className="text-2xl font-bold text-ink mt-1">
            ৳{balanceSheet.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-muted mt-1 flex items-center justify-between">
            <span>Solvency: <span className="text-accent-strong font-semibold">{balanceSheet.solvencyRatio.toFixed(1)}%</span></span>
            <span>Debt/Asset: <span className="text-warning font-semibold">{balanceSheet.debtToAssetRatio.toFixed(1)}%</span></span>
          </div>
        </div>

        {/* Realized Capital Gains */}
        <div className="bg-surface/60 border border-edge rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
            Net Realized Capital Gain ({fiscalYear})
          </div>
          <div className={`text-2xl font-bold mt-1 ${taxSummary.netCapitalGain >= 0 ? 'text-accent-strong' : 'text-negative'}`}>
            ৳{taxSummary.netCapitalGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-muted mt-1 flex items-center justify-between">
            <span>Taxable: ৳{taxSummary.taxableCapitalGain.toLocaleString()}</span>
            <span>Est. Tax: ৳{taxSummary.estimatedTaxLiability.toLocaleString()}</span>
          </div>
        </div>

        {/* Advance Tax Credits */}
        <div className="bg-surface/60 border border-edge rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
            Total Advance Tax (AIT / TDS) Paid
          </div>
          <div className="text-2xl font-bold text-sky-400 mt-1">
            ৳{taxSummary.totalAdvanceTaxCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-muted mt-1 flex items-center justify-between">
            <span>Trades: ৳{taxSummary.totalTradeAitPaid.toLocaleString()}</span>
            <span>Dividends: ৳{taxSummary.totalDividendAitPaid.toLocaleString()}</span>
            <span>Bank TDS: ৳{taxSummary.totalBankTdsPaid.toLocaleString()}</span>
          </div>
        </div>

        {/* Savings Rate & Net Surplus */}
        <div className="bg-surface/60 border border-edge rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
            Savings Rate (Lock 6 Compliant)
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {incomeStatement.savingsRatePct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-ink-muted mt-1 flex items-center justify-between">
            <span>Net Surplus:</span>
            <span className="text-indigo-300 font-semibold font-mono">
              ৳{incomeStatement.netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-edge gap-1 sm:gap-2 overflow-x-auto scrollbar-none whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('tax')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'tax'
              ? 'border-accent text-accent-strong bg-accent/10'
              : 'border-transparent text-ink-muted hover:text-ink-soft'
          }`}
        >
          <Receipt className="h-4 w-4 shrink-0" />
          <span>
            <span className="sm:hidden">Tax Engine</span>
            <span className="hidden sm:inline">Capital Gains & NBR Tax</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sectors')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'sectors'
              ? 'border-accent text-accent-strong bg-accent/10'
              : 'border-transparent text-ink-muted hover:text-ink-soft'
          }`}
        >
          <PieChart className="h-4 w-4 shrink-0" />
          <span>
            <span className="sm:hidden">Sectors & Risk</span>
            <span className="hidden sm:inline">Sector Allocation & Risk</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('statements')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'statements'
              ? 'border-accent text-accent-strong bg-accent/10'
              : 'border-transparent text-ink-muted hover:text-ink-soft'
          }`}
        >
          <Scale className="h-4 w-4 shrink-0" />
          <span>Financial Statements</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 shrink-0 transition-colors ${
            activeTab === 'export'
              ? 'border-accent text-accent-strong bg-accent/10'
              : 'border-transparent text-ink-muted hover:text-ink-soft'
          }`}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>
            <span className="sm:hidden">Export Center</span>
            <span className="hidden sm:inline">Export & Audit Center</span>
          </span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: CAPITAL GAINS & NBR TAX ENGINE                 */}
      {/* ==================================================== */}
      {activeTab === 'tax' && (
        <div className="space-y-6">
          {/* Tax Parameters & Configuration Bar */}
          <div className="bg-surface/60 border border-edge rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Field label="Tax Assessment Fiscal Year">
                <Select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                >
                  <option value="2026-2027">FY 2026-2027 (Assessment Year 2027-28)</option>
                  <option value="2025-2026">FY 2025-2026 (Assessment Year 2026-27)</option>
                  <option value="2024-2025">FY 2024-2025 (Assessment Year 2025-26)</option>
                </Select>
              </Field>

              <Field label="NBR Exemption Threshold (BDT)">
                <div className="flex items-center gap-2">
                  <div className="w-36">
                    <Input
                      type="number"
                      step="any"
                      value={exemptionThreshold}
                      onChange={(e) => setExemptionThreshold(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <button
                    onClick={() => setExemptionThreshold(5000000)}
                    className="text-[10px] px-2 py-1 bg-raised hover:bg-raised-2 text-ink-soft rounded transition-colors"
                  >
                    Set ৳50 Lakh
                  </button>
                </div>
              </Field>

              <Field label="Capital Gains Tax Rate">
                <div className="flex items-center gap-1.5">
                  <div className="w-20">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="50"
                      value={taxRatePct}
                      onChange={(e) => setTaxRatePct(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <span className="text-xs text-ink-muted font-mono">%</span>
                </div>
              </Field>
            </div>

            <Button
              onClick={handleExportTaxCsv}
              variant="secondary"
              size="sm"
              className="self-start md:self-auto"
            >
              <Download className="h-3.5 w-3.5 text-accent-strong shrink-0" />
              <span>Download NBR Schedule</span>
            </Button>
          </div>

          {/* Tax Assessment Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface/60 border border-edge rounded-xl p-4">
              <div className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-accent-strong" />
                <span>Capital Gains Ledger</span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Gross Sale Proceeds:</span>
                  <span className="font-mono text-ink">৳{taxSummary.totalGrossProceeds.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">WAC Cost Basis Sold:</span>
                  <span className="font-mono text-ink-soft">৳{taxSummary.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-accent-strong">
                  <span>Gross Realized Gains:</span>
                  <span className="font-mono font-semibold">+৳{taxSummary.totalRealizedGains.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-negative">
                  <span>Gross Realized Losses:</span>
                  <span className="font-mono font-semibold">-৳{taxSummary.totalRealizedLosses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-edge pt-2 flex justify-between font-bold">
                  <span className="text-ink">Net Capital Gain:</span>
                  <span className={`font-mono ${taxSummary.netCapitalGain >= 0 ? 'text-accent-strong' : 'text-negative'}`}>
                    ৳{taxSummary.netCapitalGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-surface/60 border border-edge rounded-xl p-4">
              <div className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-warning" />
                <span>Tax Liability Breakdown</span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Exemption Threshold:</span>
                  <span className="font-mono text-ink-soft">৳{taxSummary.exemptionThreshold.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Taxable Capital Gain:</span>
                  <span className="font-mono font-semibold text-warning">৳{taxSummary.taxableCapitalGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Applicable Tax Rate:</span>
                  <span className="font-mono text-ink">{taxRatePct}%</span>
                </div>
                <div className="border-t border-edge pt-2 flex justify-between font-bold">
                  <span className="text-ink">Est. Tax Liability:</span>
                  <span className="font-mono text-warning">৳{taxSummary.estimatedTaxLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface/60 border border-edge rounded-xl p-4">
              <div className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                <span>Tax Position & Advance Credits</span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Stock Sells AIT (0.05%):</span>
                  <span className="font-mono text-sky-400">৳{taxSummary.totalTradeAitPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Dividend AIT (10%):</span>
                  <span className="font-mono text-sky-400">৳{taxSummary.totalDividendAitPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Bank Interest TDS:</span>
                  <span className="font-mono text-sky-400">৳{taxSummary.totalBankTdsPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-ink font-semibold">
                  <span>Total Advance Credits:</span>
                  <span className="font-mono text-sky-300">৳{taxSummary.totalAdvanceTaxCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-edge pt-2 flex justify-between font-bold">
                  <span className="text-ink">{taxSummary.netTaxPayableOrRefund >= 0 ? 'Net Tax Payable:' : 'Net Tax Refund Due:'}</span>
                  <span className={`font-mono ${taxSummary.netTaxPayableOrRefund <= 0 ? 'text-accent-strong' : 'text-warning'}`}>
                    ৳{Math.abs(taxSummary.netTaxPayableOrRefund).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trade-by-Trade Capital Gains Log */}
          <div className="bg-surface/60 border border-edge rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Realized Capital Gains / Losses Schedule (Sec. 57 NBR)
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Every closed trade matched with cost basis via Weighted Average Cost (WAC) and Lock 4 charges engine.
                </p>
              </div>
              <span className="text-xs font-mono text-ink-muted">
                {taxSummary.gainItems.length} Closed Trade{taxSummary.gainItems.length === 1 ? '' : 's'}
              </span>
            </div>

            {taxSummary.gainItems.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">
                <Receipt className="h-8 w-8 mx-auto text-ink-faint mb-2" />
                <p className="text-sm font-medium text-ink-soft">No stock sales recorded yet</p>
                <p className="text-xs text-ink-faint mt-1 max-w-sm mx-auto">
                  When you sell equities in the Trading module, the realized gain/loss and 0.05% AIT turnover tax will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas/80 text-ink-muted font-mono border-b border-edge">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Security</th>
                      <th className="py-2.5 px-4 text-right">Shares Sold</th>
                      <th className="py-2.5 px-4 text-right">Gross Sale</th>
                      <th className="py-2.5 px-4 text-right">Cost Basis (WAC)</th>
                      <th className="py-2.5 px-4 text-right">Realized Gain / Loss</th>
                      <th className="py-2.5 px-4 text-center">Holding</th>
                      <th className="py-2.5 px-4 text-right">AIT Turnover Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge">
                    {taxSummary.gainItems.map((item) => (
                      <tr key={item.id} className="hover:bg-raised/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-ink-soft">{item.tradeDate}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink">{item.symbol}</div>
                          <div className="text-[11px] text-ink-muted truncate max-w-[150px]">
                            {item.companyName}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-ink">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-ink-soft">
                          ৳{item.grossSaleValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-ink-muted">
                          ৳{item.costBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span
                            className={item.realizedGainLoss >= 0 ? 'text-accent-strong' : 'text-negative'}
                          >
                            {item.realizedGainLoss >= 0 ? '+' : ''}৳{item.realizedGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <div className="text-[10px] text-ink-faint">
                            {item.gainLossPct >= 0 ? '+' : ''}{item.gainLossPct.toFixed(1)}%
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              item.holdingType === 'long_term'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-raised text-ink-muted border border-edge-strong'
                            }`}
                          >
                            {item.holdingType === 'long_term' ? 'Long-Term (≥1y)' : 'Short-Term'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sky-400">
                          ৳{item.aitWithheld.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tax-Loss Harvesting Radar */}
          <div className="bg-surface/60 border border-edge rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-edge pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-bold text-ink">Tax-Loss Harvesting Radar</h3>
                  <span className="text-[10px] bg-warning/10 text-warning font-mono px-2 py-0.5 rounded border border-warning/20">
                    Fiscal Planning
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  Offset taxable realized gains by harvesting unrealized equity losses before the fiscal year closing (June 30).
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Potential Tax Savings</div>
                  <div className="text-base font-bold text-accent-strong font-mono">
                    ৳{totalPotentialTaxSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {harvestCandidates.length === 0 ? (
              <div className="py-6 text-center text-ink-muted">
                <ShieldCheck className="h-8 w-8 mx-auto text-accent-strong mb-2" />
                <p className="text-sm font-medium text-ink-soft">No unrealized loss positions found</p>
                <p className="text-xs text-ink-faint mt-1">
                  All your active holdings are currently trading above their cost basis.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {harvestCandidates.map((h) => (
                  <div key={h.stockId} className="bg-canvas border border-edge rounded-xl p-3.5 hover:border-edge-strong transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-ink text-xs">{h.symbol}</div>
                        <div className="text-[11px] text-ink-muted truncate max-w-[150px]">{h.companyName}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-negative/10 text-negative border border-negative/20 rounded font-mono">
                        -{h.unrealizedLossPct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-faint">Unrealized Loss:</span>
                        <span className="font-mono text-negative font-semibold">
                          -৳{h.unrealizedLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint">Tax Shelter ({harvestTaxRate}%):</span>
                        <span className="font-mono text-accent-strong font-semibold">
                          ৳{h.potentialTaxSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-ink-muted pt-1 border-t border-edge/80">
                        <span>{h.quantity} sh @ ৳{h.currentPrice}</span>
                        <span>WAC: ৳{h.weightedAverageCost}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: SECTOR ALLOCATION & RISK ANALYTICS             */}
      {/* ==================================================== */}
      {activeTab === 'sectors' && (
        <div className="space-y-6">
          {/* Top Gauge & Allocation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Equity Value */}
            <div className="bg-surface/60 border border-edge rounded-xl p-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                Total Equity Portfolio
              </div>
              <div className="text-2xl font-bold text-ink mt-1">
                ৳{sectorSummary.totalEquityValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-ink-muted mt-1">
                Allocated across <span className="text-accent-strong font-semibold">{sectorSummary.sectors.length} sectors</span>
              </div>
            </div>

            {/* Top Sector Concentration */}
            <div className="bg-surface/60 border border-edge rounded-xl p-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                Top Sector Exposure
              </div>
              <div className="text-xl font-bold text-ink mt-1 truncate">
                {sectorSummary.topSector}
              </div>
              <div className="text-[11px] text-ink-muted mt-1">
                Accounts for <span className="text-warning font-semibold">{sectorSummary.topSectorPct.toFixed(1)}%</span> of total equity
              </div>
            </div>

            {/* Concentration Risk (HHI) */}
            <div className="bg-surface/60 border border-edge rounded-xl p-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                Herfindahl Index (HHI)
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-ink font-mono">{sectorSummary.herfindahlIndex}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                    sectorSummary.concentrationRisk === 'low'
                      ? 'bg-accent/10 text-accent-strong border border-accent/20'
                      : sectorSummary.concentrationRisk === 'moderate'
                      ? 'bg-warning/10 text-warning border border-warning/20'
                      : 'bg-negative/10 text-negative border border-negative/20'
                  }`}
                >
                  {sectorSummary.concentrationRisk} Concentration
                </span>
              </div>
              <div className="text-[11px] text-ink-muted mt-1">
                {sectorSummary.herfindahlIndex > 2500
                  ? 'High risk: Consider diversifying across more sectors.'
                  : sectorSummary.herfindahlIndex > 1500
                  ? 'Moderate concentration: Reasonable diversification.'
                  : 'Well-diversified portfolio structure.'}
              </div>
            </div>
          </div>

          {/* Detailed Sector Progress Breakdown */}
          <div className="bg-surface/60 border border-edge rounded-xl p-5">
            <h3 className="text-sm font-bold text-ink mb-4">
              Sector Distribution & Capital Allocation
            </h3>

            <div className="space-y-4">
              {sectorSummary.sectors.map((sec) => (
                <div key={sec.sector} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{sec.sector}</span>
                      <span className="text-[10px] text-ink-faint font-mono">
                        ({sec.holdingsCount} stock{sec.holdingsCount === 1 ? '' : 's'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-ink-soft">৳{sec.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className="font-bold text-accent-strong w-12 text-right">{sec.percentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-canvas h-2 rounded-full overflow-hidden border border-edge">
                    <div
                      className="bg-accent h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(1, sec.percentage))}%` }}
                    />
                  </div>

                  {/* Top stocks in sector chip list */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {sec.stocks.map((s) => (
                      <span
                        key={s.symbol}
                        className="text-[10px] px-2 py-0.5 bg-raised text-ink-soft rounded border border-edge-strong/60 font-mono"
                      >
                        {s.symbol}: ৳{s.marketValue.toLocaleString()} ({s.percentage.toFixed(1)}%)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: FINANCIAL STATEMENTS (BALANCE SHEET & P&L)     */}
      {/* ==================================================== */}
      {activeTab === 'statements' && (
        <div className="space-y-6">
          {/* Sub-tab switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-edge pb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none w-full sm:w-auto">
              <button
                onClick={() => setStatementSubTab('balance_sheet')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  statementSubTab === 'balance_sheet'
                    ? 'bg-accent-deep text-white shadow-sm shadow-emerald-950'
                    : 'bg-surface text-ink-muted hover:text-ink'
                }`}
              >
                <span className="sm:hidden">Balance Sheet</span>
                <span className="hidden sm:inline">Balance Sheet (Financial Position)</span>
              </button>
              <button
                onClick={() => setStatementSubTab('pnl')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  statementSubTab === 'pnl'
                    ? 'bg-accent-deep text-white shadow-sm shadow-emerald-950'
                    : 'bg-surface text-ink-muted hover:text-ink'
                }`}
              >
                <span className="sm:hidden">Income Statement</span>
                <span className="hidden sm:inline">Income Statement (P&L)</span>
              </button>
            </div>

            {statementSubTab === 'balance_sheet' ? (
              <Button
                onClick={handleExportBalanceSheetCsv}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto shrink-0"
              >
                <Download className="h-3.5 w-3.5 text-accent-strong shrink-0" />
                <span>Export Balance Sheet</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex-1 sm:flex-initial">
                  <Select
                    value={pnlDateRange}
                    onChange={(e) => setPnlDateRange(e.target.value as any)}
                    className="font-mono"
                  >
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">Fiscal Year 2026-27</option>
                    <option value="all">All Time History</option>
                  </Select>
                </div>
                <Button
                  onClick={handleExportPnlCsv}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <Download className="h-3.5 w-3.5 text-accent-strong shrink-0" />
                  <span>Export P&L</span>
                </Button>
              </div>
            )}
          </div>

          {/* Sub-Tab 1: Balance Sheet */}
          {statementSubTab === 'balance_sheet' && (
            <div className="space-y-6">
              {/* UX-11: Hero totals strip — Net Worth leads the statement */}
              <div className="bg-surface/80 border border-edge rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                    Net Worth (Owner's Equity) · নিট সম্পদ
                  </div>
                  <div className={`text-2xl sm:text-3xl font-bold font-mono ${balanceSheet.netWorth >= 0 ? 'text-positive' : 'text-negative'}`}>
                    ৳{balanceSheet.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex items-center gap-5 font-mono shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-ink-muted">Total Assets</div>
                    <div className="text-sm font-bold text-ink">৳{balanceSheet.totalAssets.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-ink-muted">Total Liabilities</div>
                    <div className="text-sm font-bold text-negative">৳{balanceSheet.totalLiabilities.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-ink-muted">Solvency</div>
                    <div className="text-sm font-bold text-accent-strong">{balanceSheet.solvencyRatio.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Assets & Liabilities 2-column view */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Left: ASSETS */}
                <div className="space-y-4">
                  <div className="bg-surface/80 border border-edge rounded-xl p-3.5 sm:p-4">
                    <div className="flex items-center justify-between border-b border-edge pb-3 gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                          Assets & Resources
                        </h3>
                        <p className="text-[11px] text-ink-muted">Current & Non-Current Investments</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base sm:text-lg font-bold text-accent-strong font-mono">
                          ৳{balanceSheet.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-ink-faint font-mono">100.0% of Assets</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {/* Current Assets */}
                      <div>
                        <div className="text-xs font-bold text-ink-soft font-mono mb-2 flex items-center justify-between">
                          <span>Current Assets (Liquid)</span>
                          <span className="text-accent-strong">৳{balanceSheet.totalCurrentAssets.toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                          {balanceSheet.currentAssetCategories.map((cat) => (
                            <div key={cat.categoryName} className="bg-canvas p-2.5 sm:p-3 rounded-lg border border-edge/80">
                              <div className="flex justify-between text-xs font-semibold text-ink">
                                <span>{cat.categoryName}</span>
                                <span className="font-mono text-accent-strong shrink-0">৳{cat.totalAmount.toLocaleString()}</span>
                              </div>
                              <div className="mt-1.5 space-y-1 text-[11px] text-ink-muted">
                                {cat.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between gap-2 py-0.5">
                                    <span className="truncate flex-1 min-w-0">{item.name}</span>
                                    <span className="font-mono text-ink-soft shrink-0">৳{item.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Non-Current Assets */}
                      <div>
                        <div className="text-xs font-bold text-ink-soft font-mono mb-2 flex items-center justify-between">
                          <span>Non-Current Assets & Investments</span>
                          <span className="text-accent-strong">৳{balanceSheet.totalNonCurrentAssets.toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                          {balanceSheet.nonCurrentAssetCategories.map((cat) => (
                            <div key={cat.categoryName} className="bg-canvas p-2.5 sm:p-3 rounded-lg border border-edge/80">
                              <div className="flex justify-between text-xs font-semibold text-ink">
                                <span>{cat.categoryName}</span>
                                <span className="font-mono text-accent-strong shrink-0">৳{cat.totalAmount.toLocaleString()}</span>
                              </div>
                              <div className="mt-1.5 space-y-1 text-[11px] text-ink-muted">
                                {cat.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between gap-2 py-0.5">
                                    <span className="truncate flex-1 min-w-0">{item.name}</span>
                                    <span className="font-mono text-ink-soft shrink-0">৳{item.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: LIABILITIES & EQUITY */}
                <div className="space-y-4">
                  <div className="bg-surface/80 border border-edge rounded-xl p-3.5 sm:p-4">
                    <div className="flex items-center justify-between border-b border-edge pb-3 gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                          Liabilities & Net Worth
                        </h3>
                        <p className="text-[11px] text-ink-muted">Lock 1: Canonical Negative Balances</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base sm:text-lg font-bold text-ink font-mono">
                          ৳{(balanceSheet.netWorth + balanceSheet.totalLiabilities).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-ink-faint font-mono">Total Claims</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {/* Liabilities Section */}
                      <div>
                        <div className="text-xs font-bold text-ink-soft font-mono mb-2 flex items-center justify-between">
                          <span>Total Obligations & Liabilities</span>
                          <span className="text-negative">৳{balanceSheet.totalLiabilities.toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                          {balanceSheet.liabilityCategories.map((cat) => (
                            <div key={cat.categoryName} className="bg-canvas p-2.5 sm:p-3 rounded-lg border border-edge/80">
                              <div className="flex justify-between text-xs font-semibold text-ink">
                                <span>{cat.categoryName}</span>
                                <span className="font-mono text-negative shrink-0">৳{cat.totalAmount.toLocaleString()}</span>
                              </div>
                              <div className="mt-1.5 space-y-1 text-[11px] text-ink-muted">
                                {cat.items.length === 0 ? (
                                  <div className="text-[11px] text-ink-faint italic">No open obligations</div>
                                ) : (
                                  cat.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-2 py-0.5">
                                      <span className="truncate flex-1 min-w-0">{item.name}</span>
                                      <span className="font-mono text-ink-soft shrink-0">৳{item.amount.toLocaleString()}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Net Worth / Owner Equity Section */}
                      <div className="bg-emerald-950/20 border border-accent/30 rounded-xl p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-accent-strong uppercase tracking-wider font-mono">
                              Net Worth (Owner's Equity)
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-accent-strong/80 mt-0.5">
                              Assets (৳{balanceSheet.totalAssets.toLocaleString()}) - Liabilities (৳{balanceSheet.totalLiabilities.toLocaleString()})
                            </div>
                          </div>
                          <div className="text-lg sm:text-xl font-bold text-accent-strong font-mono shrink-0">
                            ৳{balanceSheet.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-accent/20 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-ink-muted">Solvency Ratio: </span>
                            <span className="font-bold text-accent-strong">{balanceSheet.solvencyRatio.toFixed(1)}%</span>
                          </div>
                          <div className="text-right">
                            <span className="text-ink-muted">Equation: </span>
                            <span className="font-bold text-accent-strong font-mono">
                              {balanceSheet.isBalanced ? '✓ Balanced' : 'Reconciling'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Income Statement (P&L) */}
          {statementSubTab === 'pnl' && (
            <div className="space-y-6">
              {/* UX-11: Hero totals strip — Net Surplus leads the statement */}
              <div className="bg-surface/80 border border-edge rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                    Net Operating Surplus / (Deficit) · নিট উদ্বৃত্ত
                  </div>
                  <div className={`text-2xl sm:text-3xl font-bold font-mono ${incomeStatement.netSurplus >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {incomeStatement.netSurplus >= 0 ? '+' : ''}৳{incomeStatement.netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex items-center gap-5 font-mono shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-ink-muted">Income</div>
                    <div className="text-sm font-bold text-accent-strong">৳{incomeStatement.totalIncome.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-ink-muted">Expenses</div>
                    <div className="text-sm font-bold text-negative">৳{incomeStatement.totalExpenses.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-ink-muted">Savings Rate</div>
                    <div className="text-sm font-bold text-indigo-400">{incomeStatement.savingsRatePct.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div className="bg-surface/60 border border-edge rounded-xl p-3.5 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-edge pb-3 mb-4 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      Statement of Comprehensive Income (Profit & Loss)
                    </h3>
                    <p className="text-[11px] sm:text-xs text-ink-muted mt-0.5">
                      Period: <span className="font-mono text-accent-strong">{incomeStatement.startDate}</span> to{' '}
                      <span className="font-mono text-accent-strong">{incomeStatement.endDate}</span> · Lock 6 Refund Rules Active
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start">
                    <div className="text-xs text-ink-muted">Savings Rate</div>
                    <div className="text-base sm:text-lg font-bold text-indigo-400 font-mono">
                      {incomeStatement.savingsRatePct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  {/* Income column */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-accent-strong uppercase tracking-wider font-mono border-b border-edge pb-2">
                      <span>Income & Revenue</span>
                      <span className="shrink-0">৳{incomeStatement.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    {incomeStatement.incomeCategories.map((c) => (
                      <div key={c.categoryName} className="flex justify-between items-center text-xs py-1 gap-2">
                        <span className="text-ink-soft truncate flex-1 min-w-0">{c.categoryName}</span>
                        <div className="flex items-center gap-2 sm:gap-3 font-mono shrink-0">
                          <span className="text-ink">৳{c.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] sm:text-[11px] text-ink-faint w-8 sm:w-10 text-right">{c.percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expenses column */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-negative uppercase tracking-wider font-mono border-b border-edge pb-2">
                      <span>Expenses (Lock 6 Offsets Applied)</span>
                      <span className="shrink-0">৳{incomeStatement.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    {incomeStatement.expenseCategories.map((c) => (
                      <div key={c.categoryName} className="space-y-0.5 py-1">
                        <div className="flex justify-between items-center text-xs gap-2">
                          <span className="text-ink-soft truncate flex-1 min-w-0">{c.categoryName}</span>
                          <div className="flex items-center gap-2 sm:gap-3 font-mono shrink-0">
                            <span className="text-ink">৳{c.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] sm:text-[11px] text-ink-faint w-8 sm:w-10 text-right">{c.percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                        {c.refundOffsets > 0 && (
                          <div className="text-[10px] text-accent-strong font-mono pl-2">
                            ↳ Lock 6: Includes -৳{c.refundOffsets.toLocaleString()} refund offset
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Net Operating Surplus Banner */}
                <div className="mt-6 pt-4 border-t border-edge flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-canvas p-3.5 sm:p-4 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
                      Net Operating Surplus / (Deficit)
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-ink-muted mt-0.5">
                      Total Income (৳{incomeStatement.totalIncome.toLocaleString()}) - Total Expenses (৳{incomeStatement.totalExpenses.toLocaleString()})
                    </div>
                  </div>
                  <div className={`text-xl sm:text-2xl font-bold font-mono shrink-0 ${incomeStatement.netSurplus >= 0 ? 'text-accent-strong' : 'text-negative'}`}>
                    {incomeStatement.netSurplus >= 0 ? '+' : ''}৳{incomeStatement.netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: EXPORT & AUDIT CENTER                         */}
      {/* ==================================================== */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Export 1: NBR Tax Schedule */}
            <div className="bg-surface/60 border border-edge rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="p-2.5 w-fit rounded-lg bg-accent/10 text-accent-strong mb-3 border border-accent/20">
                  <Receipt className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-ink">NBR Capital Gains & AIT Schedule</h4>
                <p className="text-xs text-ink-muted mt-1">
                  Download the official schedule of realized capital gains, Lock 4 charges, 0.05% turnover AIT, and 10% dividend tax credits in CSV format.
                </p>
              </div>
              <Button
                onClick={handleExportTaxCsv}
                variant="primary"
                icon={Download}
                className="mt-4"
              >
                <span>Download Tax Return CSV</span>
              </Button>
            </div>

            {/* Export 2: Balance Sheet */}
            <div className="bg-surface/60 border border-edge rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="p-2.5 w-fit rounded-lg bg-sky-500/10 text-sky-400 mb-3 border border-sky-500/20">
                  <Scale className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-ink">Statement of Financial Position</h4>
                <p className="text-xs text-ink-muted mt-1">
                  Full Balance Sheet conforming to Lock 1 (negative liability balances) and Lock 2 (physical asset book valuations) with solvency ratios.
                </p>
              </div>
              <Button
                onClick={handleExportBalanceSheetCsv}
                variant="secondary"
                icon={Download}
                className="mt-4"
              >
                <span>Download Balance Sheet CSV</span>
              </Button>
            </div>

            {/* Export 3: Income Statement */}
            <div className="bg-surface/60 border border-edge rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="p-2.5 w-fit rounded-lg bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-ink">Income Statement (P&L)</h4>
                <p className="text-xs text-ink-muted mt-1">
                  Comprehensive Profit & Loss report showing operating income, investment returns, and Lock 6 refund offsets by category.
                </p>
              </div>
              <Button
                onClick={handleExportPnlCsv}
                variant="secondary"
                icon={Download}
                className="mt-4"
              >
                <span>Download P&L CSV</span>
              </Button>
            </div>

            {/* Export 4: JSON System Backup */}
            <div className="bg-surface/60 border border-edge rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="p-2.5 w-fit rounded-lg bg-warning/10 text-warning mb-3 border border-warning/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-ink">Complete System JSON Snapshot</h4>
                <p className="text-xs text-ink-muted mt-1">
                  Authoritative, full-fidelity database backup containing all 21 tables, double-entry journals, stock lots, amortization schedules, and settings.
                </p>
              </div>
              <button
                onClick={handleExportFullJsonBackup}
                className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Full JSON Audit</span>
              </button>
            </div>

            {/* Print Friendly Trigger */}
            <div className="bg-surface/60 border border-edge rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="p-2.5 w-fit rounded-lg bg-purple-500/10 text-purple-400 mb-3 border border-purple-500/20">
                  <Printer className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-ink">Printable Statement View</h4>
                <p className="text-xs text-ink-muted mt-1">
                  Clean, print-optimized format formatted for physical paper or PDF print drivers for tax submission or audit reviews.
                </p>
              </div>
              <Button
                onClick={handlePrint}
                variant="secondary"
                icon={Printer}
                className="mt-4"
              >
                <span>Print Statements</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
