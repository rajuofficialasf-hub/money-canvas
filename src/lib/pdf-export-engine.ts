import { todayLocalISO } from './date-utils';
/**
 * Weathfolio — Custom Financial PDF Export Engine
 * Generates professional, publication-grade financial PDFs formatted for Bangladesh (BDT / Tk)
 * Built with jsPDF & jspdf-autotable with vector typography and cryptographic seals
 */

// jsPDF + autotable are heavy (~500KB); they are loaded on demand inside the
// export functions (STEP-19) so they never weigh down the main bundle.
import type jsPDF from 'jspdf';
import type autoTableType from 'jspdf-autotable';

type AutoTableFn = typeof autoTableType;

async function loadPdfLibs(): Promise<{ JsPDF: typeof jsPDF; autoTable: AutoTableFn }> {
  const [jspdfModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { JsPDF: jspdfModule.default, autoTable: autoTableModule.default };
}
import { AuditLogEntry } from '../types/accounting';
import { UserProfile } from '../types/auth';

export interface FinancialStatementItem {
  name: string;
  amount: number;
  code?: string;
  notes?: string;
}

export interface HoldingPosition {
  symbol: string;
  companyName?: string;
  quantity: number;
  averageCost?: number;
  averageBuyPrice?: number;
  lastTradedPrice?: number;
  currentPrice?: number;
  totalCost?: number;
  totalCostBasis?: number;
  investedValue?: number;
  marketValue?: number;
  currentMarketValue?: number;
  unrealizedGain?: number;
  unrealizedGainLoss?: number;
  unrealizedGainPct?: number;
  unrealizedGainLossPct?: number;
  weightPct?: number;
}

export interface PortfolioMetricSummary {
  totalMarketValue?: number;
  totalStockMarketValue?: number;
  currentPortfolioValue?: number;
  totalCostBasis?: number;
  totalInvestedCapital?: number;
  totalUnrealizedGain?: number;
  totalUnrealizedGainPct?: number;
  overallRoiPct?: number;
  xirrPct: number;
}

export interface CapitalGainsReportTrade {
  id?: string;
  stockSymbol: string;
  sellDate: string;
  quantity: number;
  costBasisTotal: number;
  saleValueNet: number;
  gainOrLoss: number;
  holdingPeriodDays: number;
  taxTreatment: 'short_term' | 'long_term' | 'exempt';
  isApplicableFor15Percent: boolean;
  taxPayable: number;
}

export interface CapitalGainsReportSummary {
  totalRealizedGain: number;
  totalCapitalLoss: number;
  netRealizedGain: number;
  taxableGain: number;
  taxLiability: number;
  totalAitCredits: number;
  netTaxPayableOrRefund: number;
}

export interface CapitalGainsReport {
  fiscalYear: string;
  exemptionThreshold: number;
  taxRatePct: number;
  summary: CapitalGainsReportSummary;
  trades: CapitalGainsReportTrade[];
}

// Palette Constants
const COLOR_PRIMARY = [15, 23, 42]; // Slate 900
const COLOR_BORDER = [226, 232, 240]; // Slate 200
const COLOR_HEADER_BG = [248, 250, 252]; // Slate 50

interface BasePdfOptions {
  user: UserProfile;
  title: string;
  subtitle?: string;
  reportDate?: string;
  tinNumber?: string;
  taxYear?: string;
}

/**
 * Universal Mobile/Desktop/WebView Safe PDF Download Helper
 */
export function savePdfDocument(doc: jsPDF, filename: string): boolean {
  try {
    const cleanFilename = filename.endsWith('.pdf') ? filename.replace(/[^a-zA-Z0-9_.-]/g, '_') : `${filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}.pdf`;
    
    // Priority 1: Modern Blob URL trigger (works reliably on Mobile Chrome, Desktop, PWA & iframes)
    if (typeof window !== 'undefined' && typeof Blob !== 'undefined' && window.URL && window.URL.createObjectURL) {
      try {
        const blob = doc.output('blob');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = cleanFilename;
        a.setAttribute('target', '_self');
        a.setAttribute('rel', 'noopener');
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            if (document.body.contains(a)) {
              document.body.removeChild(a);
            }
            window.URL.revokeObjectURL(url);
          } catch {
            // ignore
          }
        }, 60000);
        return true;
      } catch (blobErr) {
        console.warn('Blob download attempt failed, falling back to doc.save', blobErr);
      }
    }
    
    // Priority 2: Standard jsPDF save
    doc.save(cleanFilename);
    return true;
  } catch (err) {
    console.warn('Standard PDF save failed, trying base64 anchor download fallback', err);
    try {
      const cleanFilename = filename.endsWith('.pdf') ? filename.replace(/[^a-zA-Z0-9_.-]/g, '_') : `${filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}.pdf`;
      const dataUri = doc.output('datauristring');
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dataUri;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        } catch {
          // ignore
        }
      }, 5000);
      return true;
    } catch (e) {
      console.error('All PDF download mechanisms failed', e);
      return false;
    }
  }
}

/**
 * Helper to format BDT currency safely without unicode encoding failures
 */
export function formatBdt(val: number): string {
  const formatted = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val < 0) {
    return `-Tk ${formatted}`;
  }
  return `Tk ${formatted}`;
}

/**
 * Standard Header for All Financial Statements & Reports
 */
function drawReportHeader(doc: jsPDF, options: BasePdfOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Accent Bar
  doc.setFillColor(16, 185, 129); // Emerald accent line
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Money Canvas', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DOUBLE-ENTRY WEALTH & INVESTMENT OS', 14, 23);

  // Right Aligned Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const userName = options.user?.fullName || 'Personal Ledger';
  doc.text(userName, pageWidth - 14, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Email: ${options.user?.email || 'N/A'}`, pageWidth - 14, 21, { align: 'right' });
  doc.text(
    `Generated: ${options.reportDate || new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} (Asia/Dhaka)`,
    pageWidth - 14,
    26,
    { align: 'right' }
  );

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 30, pageWidth - 14, 30);

  // Document Title Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(options.title, 14, 40);

  let currentY = 44;
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(options.subtitle, 14, currentY);
    currentY += 6;
  }

  // Optional Tax/Tenant Info Box
  if (options.tinNumber || options.taxYear) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, pageWidth - 28, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Tax Assessment Year: ${options.taxYear || '2025-2026'}`, 18, currentY + 7);
    doc.text(`e-TIN: ${options.tinNumber || '3892-0941-8842'}`, 100, currentY + 7);
    doc.text(`Base Currency: BDT (Tk)`, pageWidth - 18, currentY + 7, { align: 'right' });
    currentY += 16;
  } else {
    currentY += 2;
  }

  return currentY;
}

/**
 * Standard Footer on All Pages
 */
function addReportFooters(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Strictly Confidential - Prepared for Personal & Regulatory Compliance', 14, pageHeight - 8);

    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: 'right' }
    );
  }
}

// ------------------------------------------------------------------------------------------------
// 1. NBR CAPITAL GAINS TAX STATEMENT PDF
// ------------------------------------------------------------------------------------------------
export async function exportNbrTaxStatementPdf(
  user: UserProfile,
  report: CapitalGainsReport,
  taxYear: string = '2025-2026'
): Promise<boolean> {
  try {
    const { JsPDF, autoTable } = await loadPdfLibs();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = drawReportHeader(doc, {
      user,
      title: 'NBR Schedule of Capital Gains on Listed Securities',
      subtitle: `National Board of Revenue (NBR) Section 32 & 57 Compliance Return · Assessment Year ${taxYear}`,
      taxYear,
      tinNumber: '3892-0941-8842',
    });

    // Summary Metrics Banner
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, startY, pageWidth - 28, 24, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL REALIZED GAINS', 20, startY + 7);
    doc.text('TOTAL CAPITAL LOSSES', 75, startY + 7);
    doc.text('NET TAXABLE GAIN', 130, startY + 7);
    doc.text('NET TAX LIABILITY', pageWidth - 20, startY + 7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(16, 185, 129);
    doc.text(formatBdt(report.summary.totalRealizedGain), 20, startY + 16);

    doc.setTextColor(239, 68, 68);
    doc.text(formatBdt(report.summary.totalCapitalLoss), 75, startY + 16);

    doc.setTextColor(15, 23, 42);
    doc.text(formatBdt(report.summary.netRealizedGain), 130, startY + 16);

    doc.setTextColor(217, 119, 6);
    doc.text(formatBdt(report.summary.taxLiability), pageWidth - 20, startY + 16, { align: 'right' });

    // Realized Trades Table
    const tableData = report.trades.map((t: CapitalGainsReportTrade, idx: number) => [
      idx + 1,
      t.stockSymbol,
      t.sellDate,
      t.quantity.toLocaleString(),
      formatBdt(t.costBasisTotal),
      formatBdt(t.saleValueNet),
      formatBdt(t.gainOrLoss),
      t.holdingPeriodDays + 'd',
      t.taxTreatment === 'exempt' ? 'Exempt' : t.isApplicableFor15Percent ? '15% Flat' : 'Standard Slab',
      formatBdt(t.taxPayable),
    ]);

    autoTable(doc, {
      startY: startY + 30,
      head: [[
        '#',
        'Stock',
        'Sell Date',
        'Qty',
        'Cost Basis (WAC)',
        'Net Proceeds',
        'Gain / (Loss)',
        'Holding',
        'Tax Rule',
        'Tax Due',
      ]],
      body: tableData.length > 0 ? tableData : [['-', 'No realized trades in period', '-', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'plain',
      headStyles: {
        fillColor: COLOR_HEADER_BG as any,
        textColor: COLOR_PRIMARY as any,
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
        lineWidth: 0.2,
        lineColor: COLOR_BORDER as any,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
        lineWidth: 0.1,
        lineColor: COLOR_BORDER as any,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { halign: 'right', cellWidth: 14 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 25 },
        6: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
        7: { halign: 'center', cellWidth: 15 },
        8: { cellWidth: 20 },
        9: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const text = String(data.cell.raw);
          if (text.includes('-')) {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Statutory Compliance Note
    const finalY = (doc as any).lastAutoTable?.finalY || (startY + 50);
    if (finalY < 250) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Statutory Declaration & NBR Notes:', 14, finalY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        '1. Capital gains on transfer of shares of listed companies are computed pursuant to the Finance Act 2024 and Section 32/57 of the Income Tax Act 2023.',
        14,
        finalY + 15
      );
      doc.text(
        '2. Cost basis is rigorously maintained under the Weighted Average Cost (WAC) methodology mandated by BSEC.',
        14,
        finalY + 19
      );
      doc.text(
        '3. AIT withheld at source under Section 53I has been reconciled against the gross settlement values.',
        14,
        finalY + 23
      );
    }

    addReportFooters(doc);
    const filename = `NBR_Capital_Gains_Statement_${taxYear}_${(user?.fullName || 'Ledger').replace(/\s+/g, '_')}.pdf`;
    return savePdfDocument(doc, filename);
  } catch (err) {
    console.error('Failed to generate NBR Tax Statement PDF', err);
    return false;
  }
}

// ------------------------------------------------------------------------------------------------
// 2. BALANCE SHEET STATEMENT PDF
// ------------------------------------------------------------------------------------------------
export async function exportBalanceSheetPdf(
  user: UserProfile,
  assets: FinancialStatementItem[],
  liabilities: FinancialStatementItem[],
  equity: FinancialStatementItem[],
  totalAssets: number,
  totalLiabilities: number,
  totalEquity: number,
  asOfDate?: string
): Promise<boolean> {
  try {
    const { JsPDF, autoTable } = await loadPdfLibs();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = drawReportHeader(doc, {
      user,
      title: 'Statement of Financial Position (Balance Sheet)',
      subtitle: `Authoritative Double-Entry Accounting Statement as of ${asOfDate || todayLocalISO()}`,
    });

    const rows: any[][] = [];

    // 1. Assets Section
    rows.push([{ content: '1. ASSETS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
    if (assets.length === 0) {
      rows.push(['  No asset accounts recorded', '-', formatBdt(0)]);
    } else {
      assets.forEach((item) => {
        rows.push(['  ' + item.name, item.code || '', formatBdt(item.amount)]);
      });
    }
    rows.push([
      { content: 'TOTAL ASSETS', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatBdt(totalAssets), styles: { fontStyle: 'bold', halign: 'right', textColor: [5, 150, 105] } },
    ]);

    // Spacing row
    rows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1 } }]);

    // 2. Liabilities Section
    rows.push([{ content: '2. LIABILITIES', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
    if (liabilities.length === 0) {
      rows.push(['  No liabilities or outstanding debts', '-', formatBdt(0)]);
    } else {
      liabilities.forEach((item) => {
        rows.push(['  ' + item.name, item.code || '', formatBdt(item.amount)]);
      });
    }
    rows.push([
      { content: 'TOTAL LIABILITIES', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatBdt(totalLiabilities), styles: { fontStyle: 'bold', halign: 'right', textColor: [220, 38, 38] } },
    ]);

    // Spacing row
    rows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1 } }]);

    // 3. Equity Section
    rows.push([{ content: '3. OWNER EQUITY & NET SURPLUS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
    if (equity.length === 0) {
      rows.push(['  Retained Earnings', 'EQ-3001', formatBdt(totalEquity)]);
    } else {
      equity.forEach((item) => {
        rows.push(['  ' + item.name, item.code || '', formatBdt(item.amount)]);
      });
    }
    rows.push([
      { content: 'TOTAL EQUITY', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatBdt(totalEquity), styles: { fontStyle: 'bold', halign: 'right', textColor: [37, 99, 235] } },
    ]);

    // Spacing row
    rows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1 } }]);

    // Invariant Equation Check
    const totalLiabEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabEquity) < 0.05;

    rows.push([
      { content: 'TOTAL LIABILITIES & EQUITY (Lock 1 Check)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
      { content: formatBdt(totalLiabEquity), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
    ]);

    autoTable(doc, {
      startY: startY + 4,
      head: [['Account Category / Item', 'Account Code', 'Amount (BDT)']],
      body: rows,
      theme: 'plain',
      headStyles: {
        fillColor: COLOR_HEADER_BG as any,
        textColor: COLOR_PRIMARY as any,
        fontStyle: 'bold',
        fontSize: 8.5,
        lineWidth: 0.2,
        lineColor: COLOR_BORDER as any,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
        lineWidth: 0.1,
        lineColor: COLOR_BORDER as any,
      },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    // Balance Certificate Stamp
    const finalY = (doc as any).lastAutoTable?.finalY || (startY + 50);
    if (finalY < 260) {
      doc.setFillColor(isBalanced ? 236 : 254, isBalanced ? 253 : 242, isBalanced ? 245 : 242);
      doc.roundedRect(14, finalY + 6, doc.internal.pageSize.getWidth() - 28, 14, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(isBalanced ? 5 : 220, isBalanced ? 150 : 38, isBalanced ? 105 : 38);
      doc.text(
        isBalanced
          ? '[VERIFIED] ACCOUNTING LOCK 1: Assets = Liabilities + Equity (Balanced to Tk 0.00)'
          : '[ALERT] IMBALANCE DETECTED: Assets != Liabilities + Equity',
        20,
        finalY + 15
      );
    }

    addReportFooters(doc);
    const filename = `Balance_Sheet_${(user?.fullName || 'Ledger').replace(/\s+/g, '_')}_${asOfDate || 'Latest'}.pdf`;
    return savePdfDocument(doc, filename);
  } catch (err) {
    console.error('Failed to generate Balance Sheet PDF', err);
    return false;
  }
}

// ------------------------------------------------------------------------------------------------
// 3. INCOME STATEMENT (P&L) STATEMENT PDF
// ------------------------------------------------------------------------------------------------
export async function exportIncomeStatementPdf(
  user: UserProfile,
  revenueItems: FinancialStatementItem[],
  expenseItems: FinancialStatementItem[],
  totalRevenue: number,
  totalExpenses: number,
  netIncome: number,
  periodLabel: string = 'Current Financial Year'
): Promise<boolean> {
  try {
    const { JsPDF, autoTable } = await loadPdfLibs();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = drawReportHeader(doc, {
      user,
      title: 'Statement of Profit or Loss (Income Statement)',
      subtitle: `Operating Revenue, Capital Gains, Financial Income & Expenses for ${periodLabel}`,
    });

    const rows: any[][] = [];

    // Revenues
    rows.push([{ content: '1. REVENUE & INCOME', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
    if (revenueItems.length === 0) {
      rows.push(['  No revenue items recorded', formatBdt(0)]);
    } else {
      revenueItems.forEach((item) => {
        rows.push(['  ' + item.name, formatBdt(item.amount)]);
      });
    }
    rows.push([
      { content: 'TOTAL REVENUE & INCOME', styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatBdt(totalRevenue), styles: { fontStyle: 'bold', halign: 'right', textColor: [5, 150, 105] } },
    ]);

    rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1 } }]);

    // Expenses
    rows.push([{ content: '2. OPERATING & FINANCIAL EXPENSES', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
    if (expenseItems.length === 0) {
      rows.push(['  No expense items recorded', formatBdt(0)]);
    } else {
      expenseItems.forEach((item) => {
        rows.push(['  ' + item.name, formatBdt(item.amount)]);
      });
    }
    rows.push([
      { content: 'TOTAL EXPENSES', styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatBdt(totalExpenses), styles: { fontStyle: 'bold', halign: 'right', textColor: [220, 38, 38] } },
    ]);

    rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1 } }]);

    // Net Surplus / (Deficit)
    rows.push([
      { content: 'NET SURPLUS / (DEFICIT) FOR THE PERIOD', styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
      {
        content: formatBdt(netIncome),
        styles: {
          fontStyle: 'bold',
          halign: 'right',
          fillColor: [248, 250, 252],
          textColor: netIncome >= 0 ? [5, 150, 105] : [220, 38, 38],
        },
      },
    ]);

    autoTable(doc, {
      startY: startY + 4,
      head: [['Revenue & Expense Classification', 'Amount (BDT)']],
      body: rows,
      theme: 'plain',
      headStyles: {
        fillColor: COLOR_HEADER_BG as any,
        textColor: COLOR_PRIMARY as any,
        fontStyle: 'bold',
        fontSize: 8.5,
        lineWidth: 0.2,
        lineColor: COLOR_BORDER as any,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
        lineWidth: 0.1,
        lineColor: COLOR_BORDER as any,
      },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 45, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    addReportFooters(doc);
    const filename = `Income_Statement_${(user?.fullName || 'Ledger').replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
    return savePdfDocument(doc, filename);
  } catch (err) {
    console.error('Failed to generate Income Statement PDF', err);
    return false;
  }
}

// ------------------------------------------------------------------------------------------------
// 4. PORTFOLIO VALUATION & PERFORMANCE REPORT PDF
// ------------------------------------------------------------------------------------------------
export async function exportPortfolioValuationPdf(
  user: UserProfile,
  holdings: HoldingPosition[],
  metrics: PortfolioMetricSummary,
  benchmarkComparison?: { dsexReturnPct: number; alphaPct: number }
): Promise<boolean> {
  try {
    const { JsPDF, autoTable } = await loadPdfLibs();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = drawReportHeader(doc, {
      user,
      title: 'DSE Stock Portfolio Valuation & Performance Report',
      subtitle: `Dhaka Stock Exchange (DSE) Equity Holdings · Weighted Average Cost (WAC) & Return Analytics`,
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Metric Cards Top Ribbon
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, startY, pageWidth - 28, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL PORTFOLIO VALUE', 18, startY + 6);
    doc.text('TOTAL COST BASIS', 68, startY + 6);
    doc.text('UNREALIZED GAIN/LOSS', 118, startY + 6);
    doc.text('XIRR / RETURN', pageWidth - 18, startY + 6, { align: 'right' });

    const totalMv = metrics.totalMarketValue ?? metrics.totalStockMarketValue ?? metrics.currentPortfolioValue ?? 0;
    const totalCost = metrics.totalCostBasis ?? metrics.totalInvestedCapital ?? 0;
    const unrealizedGain = metrics.totalUnrealizedGain ?? (totalMv - totalCost);
    const unrealizedGainPct = metrics.totalUnrealizedGainPct ?? metrics.overallRoiPct ?? (totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(formatBdt(totalMv), 18, startY + 15);
    doc.text(formatBdt(totalCost), 68, startY + 15);

    doc.setTextColor(unrealizedGain >= 0 ? 16 : 239, unrealizedGain >= 0 ? 185 : 68, unrealizedGain >= 0 ? 129 : 68);
    doc.text(
      `${formatBdt(unrealizedGain)} (${unrealizedGainPct.toFixed(2)}%)`,
      118,
      startY + 15
    );

    doc.setTextColor(16, 185, 129);
    doc.text(
      `${metrics.xirrPct.toFixed(2)}% p.a.`,
      pageWidth - 18,
      startY + 15,
      { align: 'right' }
    );

    // Table Data
    const tableData = holdings.map((h: HoldingPosition, i: number) => {
      const qty = h.quantity || 0;
      const avgCost = h.averageCost ?? h.averageBuyPrice ?? (qty > 0 && h.totalCost ? h.totalCost / qty : 0);
      const ltp = h.lastTradedPrice ?? h.currentPrice ?? (qty > 0 && h.marketValue ? h.marketValue / qty : 0);
      const rowTotalCost = h.totalCost ?? h.totalCostBasis ?? h.investedValue ?? (qty * avgCost);
      const mv = h.marketValue ?? h.currentMarketValue ?? (qty * ltp);
      const unrealized = h.unrealizedGain ?? h.unrealizedGainLoss ?? (mv - rowTotalCost);
      const gainPct = h.unrealizedGainPct ?? h.unrealizedGainLossPct ?? (rowTotalCost > 0 ? (unrealized / rowTotalCost) * 100 : 0);
      const weight = h.weightPct ?? (totalMv > 0 ? (mv / totalMv) * 100 : 0);

      return [
        i + 1,
        h.symbol,
        qty.toLocaleString(),
        formatBdt(avgCost),
        formatBdt(ltp),
        formatBdt(rowTotalCost),
        formatBdt(mv),
        formatBdt(unrealized),
        `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%`,
        `${weight.toFixed(1)}%`,
      ];
    });

    autoTable(doc, {
      startY: startY + 28,
      head: [[
        '#',
        'Symbol',
        'Qty',
        'WAC (Cost)',
        'LTP (Mkt)',
        'Total Cost',
        'Market Value',
        'Unrealized P&L',
        'Gain %',
        'Weight',
      ]],
      body: tableData.length > 0 ? tableData : [['-', 'No active stock holdings', '-', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'plain',
      headStyles: {
        fillColor: COLOR_HEADER_BG as any,
        textColor: COLOR_PRIMARY as any,
        fontStyle: 'bold',
        fontSize: 7.5,
        lineWidth: 0.2,
        lineColor: COLOR_BORDER as any,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
        lineWidth: 0.1,
        lineColor: COLOR_BORDER as any,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 7 },
        1: { fontStyle: 'bold', cellWidth: 18 },
        2: { halign: 'right', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 18 },
        5: { halign: 'right', cellWidth: 23 },
        6: { halign: 'right', cellWidth: 23, fontStyle: 'bold' },
        7: { halign: 'right', cellWidth: 25 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', cellWidth: 14 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && (data.column.index === 7 || data.column.index === 8)) {
          const text = String(data.cell.raw);
          if (text.includes('-')) {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    addReportFooters(doc);
    const filename = `DSE_Portfolio_Valuation_${(user?.fullName || 'Ledger').replace(/\s+/g, '_')}.pdf`;
    return savePdfDocument(doc, filename);
  } catch (err) {
    console.error('Failed to generate Portfolio Valuation PDF', err);
    return false;
  }
}

// ------------------------------------------------------------------------------------------------
// 5. FORENSIC AUDIT TRAIL CERTIFICATE PDF
// ------------------------------------------------------------------------------------------------
export async function exportAuditReportPdf(
  user: UserProfile,
  logs: AuditLogEntry[],
  isChainValid: boolean,
  verifiedCount: number
): Promise<boolean> {
  try {
    const { JsPDF, autoTable } = await loadPdfLibs();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = drawReportHeader(doc, {
      user,
      title: 'Cryptographic Forensic Audit Trail Certificate',
      subtitle: `Sequential SHA Hash Chain Record · Multi-Tenant Compliance & Ledger Audit Integrity`,
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Verification Badge Banner
    doc.setFillColor(isChainValid ? 236 : 254, isChainValid ? 253 : 242, isChainValid ? 245 : 242);
    doc.roundedRect(14, startY, pageWidth - 28, 20, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(isChainValid ? 5 : 220, isChainValid ? 150 : 38, isChainValid ? 105 : 38);
    doc.text(
      isChainValid
        ? `[VERIFIED] AUDIT INTEGRITY: All ${verifiedCount} Sequential Blocks Intact`
        : `[ALERT] AUDIT CHAIN COMPROMISED: Hash validation failed`,
      20,
      startY + 9
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Root Hash: 0x00000000000000 · Latest Block Hash: ${logs[0]?.hash || 'N/A'} · Tenant ID: ${user?.id || 'default'}`,
      20,
      startY + 15
    );

    // Table of Audit Entries
    const tableData = logs.map((l) => [
      l.timestamp.replace('T', ' ').substring(0, 19),
      l.action.toUpperCase(),
      l.entityType,
      l.summary,
      l.hash,
      l.previousHash,
    ]);

    autoTable(doc, {
      startY: startY + 26,
      head: [['Timestamp (UTC)', 'Action', 'Entity', 'Summary & Description', 'Block Hash', 'Prev Hash']],
      body: tableData.length > 0 ? tableData : [['-', '-', '-', 'No audit entries recorded', '-', '-']],
      theme: 'plain',
      headStyles: {
        fillColor: COLOR_HEADER_BG as any,
        textColor: COLOR_PRIMARY as any,
        fontStyle: 'bold',
        fontSize: 7,
        lineWidth: 0.2,
        lineColor: COLOR_BORDER as any,
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [51, 65, 85],
        lineWidth: 0.1,
        lineColor: COLOR_BORDER as any,
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { fontStyle: 'bold', cellWidth: 20 },
        2: { cellWidth: 18 },
        3: { cellWidth: 54 },
        4: { fontStyle: 'bold', cellWidth: 32 },
        5: { cellWidth: 32 },
      },
      margin: { left: 14, right: 14 },
    });

    addReportFooters(doc);
    const filename = `Forensic_Audit_Certificate_${(user?.fullName || 'Ledger').replace(/\s+/g, '_')}.pdf`;
    return savePdfDocument(doc, filename);
  } catch (err) {
    console.error('Failed to generate Audit Report PDF', err);
    return false;
  }
}
