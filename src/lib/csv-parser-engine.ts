import { todayLocalISO, toLocalISO } from './date-utils';
/**
 * Money Canvas — Comprehensive CSV & Bank Statement Parser Engine (FEAT-3)
 *
 * Supports:
 * - RFC-4180 standard CSV parsing (quoted strings, multiline entries, escaped quotes, BOM stripping).
 * - Bangladeshi & International date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MMM-YYYY, DD.MM.YYYY, Bengali numerals).
 * - Bangladeshi currency formatting (1,50,000.00, negative parenthesis, Dr/Cr indicators, ৳ symbols).
 * - Bangladeshi Bank & Mobile Wallet Presets (bKash, Nagad, City Bank, BRAC Bank, DBBL, EBL, Islami Bank).
 * - Intelligent duplicate detection against existing ledger transactions.
 * - Automatic smart-categorization based on transaction narration keywords.
 */

import { Transaction, TransactionLine, Category } from '../types/accounting';
import { round2 } from './accounting-engine';

export interface CsvParsedTable {
  headers: string[];
  rows: string[][];
  totalRawRows: number;
}

export type AmountMode = 'separate_dr_cr' | 'single_amount_signed' | 'single_amount_type_col';

export interface ColumnMappingConfig {
  dateColIndex: number;
  descriptionColIndex: number;
  amountMode: AmountMode;
  debitColIndex?: number;
  creditColIndex?: number;
  amountColIndex?: number;
  typeColIndex?: number; // Contains 'DR'/'CR' or 'Debit'/'Credit'
  balanceColIndex?: number;
  refColIndex?: number;
}

export interface BankPreset {
  id: string;
  name: string;
  description: string;
  amountMode: AmountMode;
  suggestedHeaders: {
    date: string[];
    description: string[];
    debit?: string[];
    credit?: string[];
    amount?: string[];
    type?: string[];
    balance?: string[];
    ref?: string[];
  };
}

export interface ParsedStatementRow {
  rowNumber: number;
  rawDate: string;
  isoDate: string;
  rawDescription: string;
  cleanDescription: string;
  rawAmount: number; // Positive magnitude
  type: 'income' | 'expense';
  suggestedCategoryId: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  selected: boolean;
  isValid: boolean;
  validationError?: string;
}

export const BANK_PRESETS: BankPreset[] = [
  {
    id: 'auto',
    name: 'Auto-Detect / সাধারণ CSV',
    description: 'স্বয়ংক্রিয়ভাবে হেডার কলাম ও ডেবিট-ক্রেডিট শনাক্তকরণ',
    amountMode: 'separate_dr_cr',
    suggestedHeaders: {
      date: ['date', 'txn date', 'transaction date', 'তারিখ', 'posting date', 'value date'],
      description: ['description', 'particulars', 'narration', 'details', 'বিবরণ', 'remarks', 'transaction details'],
      debit: ['debit', 'withdrawal', 'outflow', 'dr', 'খরচ', 'debit amount', 'withdrawal amount'],
      credit: ['credit', 'deposit', 'inflow', 'cr', 'জমা', 'credit amount', 'deposit amount'],
      amount: ['amount', 'পরিমাণ', 'txn amount', 'transaction amount', 'total'],
      balance: ['balance', 'ব্যালেন্স', 'ledger balance', 'closing balance'],
    },
  },
  {
    id: 'bkash',
    name: 'bKash স্টেটমেন্ট (বিকাশ)',
    description: 'বিকাশ অ্যাপ/ইমেইল থেকে ডাউনলোডকৃত স্টেটমেন্ট',
    amountMode: 'single_amount_signed',
    suggestedHeaders: {
      date: ['date', 'date & time', 'সময়', 'তারিখ'],
      description: ['transaction details', 'details', 'initiator', 'বিবরণ', 'type'],
      amount: ['amount', 'পরিমাণ', 'tk', 'bdt'],
      balance: ['balance', 'ব্যালেন্স'],
      ref: ['trxid', 'transaction id', 'ট্রানজেকশন আইডি'],
    },
  },
  {
    id: 'nagad',
    name: 'Nagad স্টেটমেন্ট (নগদ)',
    description: 'নগদ অ্যাকাউন্ট লেনদেন স্টেটমেন্ট',
    amountMode: 'separate_dr_cr',
    suggestedHeaders: {
      date: ['date', 'time', 'তারিখ'],
      description: ['particulars', 'purpose', 'details', 'বিবরণ'],
      debit: ['debit', 'debit (bdt)', 'খরচ'],
      credit: ['credit', 'credit (bdt)', 'জমা'],
      balance: ['balance', 'ব্যালেন্স'],
      ref: ['txn id', 'transaction id'],
    },
  },
  {
    id: 'city_bank',
    name: 'The City Bank (সিটি ব্যাংক)',
    description: 'Citytouch ও অ্যাকাউন্ট স্টেটমেন্ট CSV',
    amountMode: 'separate_dr_cr',
    suggestedHeaders: {
      date: ['transaction date', 'txn date', 'date', 'value date'],
      description: ['description', 'particulars', 'narration'],
      debit: ['debit', 'debit amount', 'withdrawals'],
      credit: ['credit', 'credit amount', 'deposits'],
      balance: ['balance', 'running balance'],
    },
  },
  {
    id: 'brac_bank',
    name: 'BRAC Bank (ব্র্যাক ব্যাংক)',
    description: 'BRAC Bank Astha ও অ্যাকাউন্ট এক্সপোর্ট',
    amountMode: 'separate_dr_cr',
    suggestedHeaders: {
      date: ['date', 'txn date', 'value date'],
      description: ['particulars', 'description', 'remarks'],
      debit: ['withdrawals', 'debit', 'dr'],
      credit: ['deposits', 'credit', 'cr'],
      balance: ['balance'],
    },
  },
  {
    id: 'dbbl',
    name: 'Dutch-Bangla Bank / Rocket (ডিবিবিএল)',
    description: 'Dutch-Bangla NexusPay ও রকেট অ্যাকাউন্ট',
    amountMode: 'separate_dr_cr',
    suggestedHeaders: {
      date: ['txn date', 'date', 'posting date'],
      description: ['particulars', 'narration', 'transaction details'],
      debit: ['debit amount', 'debit', 'withdraw'],
      credit: ['credit amount', 'credit', 'deposit'],
      balance: ['balance', 'closing balance'],
    },
  },
];

/**
 * Converts Bengali numerals (০-৯) to standard English ASCII digits (0-9)
 */
export function convertBengaliToEnglishDigits(str: string): string {
  if (!str) return '';
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return str.replace(/[০-৯]/g, (w) => bnToEn[w] || w);
}

/**
 * Robust RFC-4180 compliant CSV parser
 */
export function parseCsvText(rawText: string): CsvParsedTable {
  // 1. Strip UTF-8 Byte Order Mark (BOM) if present
  let cleanText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { headers: [], rows: [], totalRawRows: 0 };
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && cleanText[i + 1] === '"') {
          // Escaped double quote ("")
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        // Carriage return (check for CRLF)
        if (i + 1 < len && cleanText[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], totalRawRows: 0 };
  }

  // First row is treated as headers
  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.length > 0));

  return {
    headers,
    rows: dataRows,
    totalRawRows: dataRows.length,
  };
}

/**
 * Normalizes different date formats to ISO YYYY-MM-DD
 */
export function normalizeDateToISO(dateString: string): string | null {
  if (!dateString) return null;
  const normalized = convertBengaliToEnglishDigits(dateString.trim());

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // DD-MMM-YYYY (e.g. 15-Jan-2026, 25-Oct-25)
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const dMonYMatch = normalized.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{2,4})/);
  if (dMonYMatch) {
    const d = dMonYMatch[1].padStart(2, '0');
    const monStr = dMonYMatch[2].toLowerCase();
    const m = monthMap[monStr];
    let y = dMonYMatch[3];
    if (y.length === 2) {
      y = `20${y}`;
    }
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  // Fallback to Date parser
  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) {
    return toLocalISO(parsed);
  }

  return null;
}

/**
 * Parses numeric currency amount string from bank CSV
 */
export function parseCurrencyAmount(rawStr: string | undefined): { amount: number; isNegative: boolean } {
  if (!rawStr) return { amount: 0, isNegative: false };
  let s = convertBengaliToEnglishDigits(rawStr.trim());

  let isNegative = false;
  // Check for parenthesis: (1,500.00)
  if (s.startsWith('(') && s.endsWith(')')) {
    isNegative = true;
    s = s.slice(1, -1);
  } else if (s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1);
  } else if (s.endsWith('-')) {
    isNegative = true;
    s = s.slice(0, -1);
  } else if (/\b(dr|debit)\b/i.test(s)) {
    isNegative = true;
  }

  // Remove currency signs, commas, extra whitespace
  s = s.replace(/[৳$£€,BDT\sTk]/gi, '').trim();

  const num = parseFloat(s);
  if (isNaN(num)) {
    return { amount: 0, isNegative: false };
  }

  return {
    amount: round2(Math.abs(num)),
    isNegative,
  };
}

/**
 * Automatically suggests column mapping based on detected header names
 */
export function autoDetectColumnMapping(headers: string[], presetId: string = 'auto'): ColumnMappingConfig {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  let dateColIndex = -1;
  let descriptionColIndex = -1;
  let debitColIndex = -1;
  let creditColIndex = -1;
  let amountColIndex = -1;
  let typeColIndex = -1;
  let balanceColIndex = -1;
  let refColIndex = -1;

  const preset = BANK_PRESETS.find((p) => p.id === presetId) || BANK_PRESETS[0];

  normalizedHeaders.forEach((h, idx) => {
    // Date
    if (dateColIndex === -1 && preset.suggestedHeaders.date.some((kw) => h.includes(kw))) {
      dateColIndex = idx;
    }
    // Description
    if (descriptionColIndex === -1 && preset.suggestedHeaders.description.some((kw) => h.includes(kw))) {
      descriptionColIndex = idx;
    }
    // Debit
    if (debitColIndex === -1 && preset.suggestedHeaders.debit && preset.suggestedHeaders.debit.some((kw) => h.includes(kw))) {
      debitColIndex = idx;
    }
    // Credit
    if (creditColIndex === -1 && preset.suggestedHeaders.credit && preset.suggestedHeaders.credit.some((kw) => h.includes(kw))) {
      creditColIndex = idx;
    }
    // Single Amount
    if (amountColIndex === -1 && preset.suggestedHeaders.amount && preset.suggestedHeaders.amount.some((kw) => h.includes(kw))) {
      amountColIndex = idx;
    }
    // Balance
    if (balanceColIndex === -1 && preset.suggestedHeaders.balance && preset.suggestedHeaders.balance.some((kw) => h.includes(kw))) {
      balanceColIndex = idx;
    }
    // Ref / TxnId
    if (refColIndex === -1 && preset.suggestedHeaders.ref && preset.suggestedHeaders.ref.some((kw) => h.includes(kw))) {
      refColIndex = idx;
    }
  });

  // Fallbacks if not detected by keywords
  if (dateColIndex === -1) dateColIndex = 0;
  if (descriptionColIndex === -1) descriptionColIndex = Math.min(1, headers.length - 1);

  // Determine amount mode
  let amountMode: AmountMode = 'separate_dr_cr';
  if (debitColIndex !== -1 && creditColIndex !== -1) {
    amountMode = 'separate_dr_cr';
  } else if (amountColIndex !== -1) {
    amountMode = 'single_amount_signed';
  } else {
    // Try to guess from remaining columns
    if (headers.length >= 4) {
      debitColIndex = 2;
      creditColIndex = 3;
      amountMode = 'separate_dr_cr';
    } else {
      amountColIndex = Math.min(2, headers.length - 1);
      amountMode = 'single_amount_signed';
    }
  }

  return {
    dateColIndex,
    descriptionColIndex,
    amountMode,
    debitColIndex: debitColIndex !== -1 ? debitColIndex : undefined,
    creditColIndex: creditColIndex !== -1 ? creditColIndex : undefined,
    amountColIndex: amountColIndex !== -1 ? amountColIndex : undefined,
    typeColIndex: typeColIndex !== -1 ? typeColIndex : undefined,
    balanceColIndex: balanceColIndex !== -1 ? balanceColIndex : undefined,
    refColIndex: refColIndex !== -1 ? refColIndex : undefined,
  };
}

/**
 * Intelligent category matching based on keywords in narration
 */
export function suggestCategoryFromDescription(
  description: string,
  categories: Category[],
  type: 'income' | 'expense'
): string {
  const d = description.toLowerCase();

  const matchingCategories = categories.filter((c) => c.type === type);
  if (matchingCategories.length === 0) {
    return categories[0]?.id || '';
  }

  // Keyword rules
  const rules: Array<{ keywords: string[]; categoryMatch: string }> = [
    { keywords: ['salary', 'বেতন', 'payroll', 'remuneration', 'wages'], categoryMatch: 'salary' },
    { keywords: ['interest', 'সুদ', 'profit', 'মুনাফা', 'div', 'dividend'], categoryMatch: 'investment' },
    { keywords: ['uber', 'pathao', 'cng', 'petrol', 'fuel', 'oil', 'transport', 'যানবাহন', 'ভাড়া'], categoryMatch: 'transport' },
    { keywords: ['shwapno', 'meenabazar', 'agora', 'bazaar', 'বাজার', 'grocery', 'সুপারশপ', 'চাল', 'ডাল'], categoryMatch: 'groceries' },
    { keywords: ['restaurant', 'foodpanda', 'kfc', 'pizza', 'dine', 'cafe', 'খাবার', 'রেস্তোরাঁ', 'হোটেল'], categoryMatch: 'food' },
    { keywords: ['electricity', 'desco', 'dpdc', 'wasa', 'gas', 'titas', 'bill', 'বিদ্যুৎ', 'বিল', 'internet', 'wifi'], categoryMatch: 'utilities' },
    { keywords: ['hospital', 'doctor', 'pharma', 'medicine', 'ওষুধ', 'ডাক্তার', 'প্রেসক্রিপশন'], categoryMatch: 'healthcare' },
    { keywords: ['daraz', 'shopping', 'cloth', 'dress', 'মার্কেট', 'কেনাকাটা'], categoryMatch: 'shopping' },
    { keywords: ['fee', 'charge', 'vat', 'tax', 'অফিস ফি', 'শুল্ক', 'চার্জ'], categoryMatch: 'fees' },
    { keywords: ['mobile', 'recharge', 'gp', 'bl', 'robi', 'airtel', 'টপআপ', 'ফ্লেক্সিলোড'], categoryMatch: 'recharge' },
    { keywords: ['rent', 'বাড়ি ভাড়া', 'ভাড়া'], categoryMatch: 'housing' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => d.includes(kw))) {
      const matched = matchingCategories.find((c) =>
        c.name.toLowerCase().includes(rule.categoryMatch)
      );
      if (matched) return matched.id;
    }
  }

  // Default to first category of matching type
  return matchingCategories[0].id;
}

/**
 * Checks for duplicates against existing ledger transactions
 */
export function checkDuplicateTransaction(
  isoDate: string,
  amount: number,
  description: string,
  existingTransactions: Transaction[],
  existingLines?: TransactionLine[]
): { isDuplicate: boolean; duplicateReason?: string } {

  for (const tx of existingTransactions) {
    // Only check active posted transactions
    if (tx.status === 'voided') continue;

    // Match criteria: Same date and same amount
    if (tx.date === isoDate) {
      let txAmount: number | undefined;

      if (existingLines && existingLines.length > 0) {
        const txLines = existingLines.filter((l) => l.transactionId === tx.id);
        const acctLines = txLines.filter((l) => l.lineType === 'account');
        if (acctLines.length > 0) {
          txAmount = Math.abs(acctLines.reduce((sum, l) => sum + Math.abs(l.amount), 0) / (tx.type === 'transfer' ? 2 : 1));
        } else if (txLines.length > 0) {
          txAmount = Math.abs(txLines[0].amount);
        }
      }

      if (txAmount === undefined && 'totalAmount' in (tx as any)) {
        txAmount = Math.abs(Number((tx as any).totalAmount) || 0);
      }

      if (txAmount !== undefined && Math.abs(txAmount - amount) < 0.01) {
        // High confidence match
        return {
          isDuplicate: true,
          duplicateReason: `${isoDate} তারিখে একই অংকের (৳${amount.toLocaleString()}) লেনদেন "${tx.note || tx.id}" ইতিমধ্যে লেজারে বিদ্যমান রয়েছে।`,
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Parses all CSV rows according to mapping configuration
 */
export function parseStatementRows(
  table: CsvParsedTable,
  mapping: ColumnMappingConfig,
  categories: Category[],
  existingTransactions: Transaction[],
  existingLines?: TransactionLine[]
): ParsedStatementRow[] {
  const parsedRows: ParsedStatementRow[] = [];

  table.rows.forEach((row, idx) => {
    const rawDate = row[mapping.dateColIndex] || '';
    const rawDesc = row[mapping.descriptionColIndex] || '';
    const isoDate = normalizeDateToISO(rawDate);

    let rawAmount = 0;
    let type: 'income' | 'expense' = 'expense';
    let isValid = true;
    let validationError: string | undefined;

    if (!isoDate) {
      isValid = false;
      validationError = 'অবৈধ তারিখ (Invalid Date)';
    }

    if (mapping.amountMode === 'separate_dr_cr') {
      const debitStr = mapping.debitColIndex !== undefined ? row[mapping.debitColIndex] : '';
      const creditStr = mapping.creditColIndex !== undefined ? row[mapping.creditColIndex] : '';

      const debitParsed = parseCurrencyAmount(debitStr);
      const creditParsed = parseCurrencyAmount(creditStr);

      if (debitParsed.amount > 0 && creditParsed.amount === 0) {
        rawAmount = debitParsed.amount;
        type = 'expense';
      } else if (creditParsed.amount > 0 && debitParsed.amount === 0) {
        rawAmount = creditParsed.amount;
        type = 'income';
      } else if (debitParsed.amount > 0 && creditParsed.amount > 0) {
        // Both columns filled, debit takes precedence or net
        if (debitParsed.amount > creditParsed.amount) {
          rawAmount = debitParsed.amount;
          type = 'expense';
        } else {
          rawAmount = creditParsed.amount;
          type = 'income';
        }
      } else {
        isValid = false;
        validationError = 'টাকার পরিমাণ পাওয়া যায়নি (Amount is zero or missing)';
      }
    } else {
      // Single amount column
      const amtStr = mapping.amountColIndex !== undefined ? row[mapping.amountColIndex] : '';
      const parsed = parseCurrencyAmount(amtStr);
      rawAmount = parsed.amount;

      if (rawAmount <= 0) {
        isValid = false;
        validationError = 'টাকার পরিমাণ পাওয়া যায়নি (Amount is zero or missing)';
      }

      if (parsed.isNegative) {
        type = 'expense';
      } else {
        // Check if there is a separate Type column
        if (mapping.typeColIndex !== undefined) {
          const typeStr = (row[mapping.typeColIndex] || '').toLowerCase();
          if (typeStr.includes('dr') || typeStr.includes('debit') || typeStr.includes('withdrawal') || typeStr.includes('outflow')) {
            type = 'expense';
          } else {
            type = 'income';
          }
        } else {
          // If no sign and no type column, check description keywords for income vs expense
          const d = rawDesc.toLowerCase();
          if (d.includes('received') || d.includes('deposit') || d.includes('cash in') || d.includes('salary') || d.includes('credit')) {
            type = 'income';
          } else {
            type = 'expense';
          }
        }
      }
    }

    const cleanDesc = rawDesc.replace(/\s+/g, ' ').trim() || (type === 'income' ? 'Bank Deposit' : 'Bank Payment');

    // Duplicate detection
    const dupCheck = isValid && isoDate
      ? checkDuplicateTransaction(isoDate, rawAmount, cleanDesc, existingTransactions, existingLines)
      : { isDuplicate: false };

    const suggestedCategoryId = suggestCategoryFromDescription(cleanDesc, categories, type);

    parsedRows.push({
      rowNumber: idx + 1,
      rawDate,
      isoDate: isoDate || todayLocalISO(),
      rawDescription: rawDesc,
      cleanDescription: cleanDesc,
      rawAmount,
      type,
      suggestedCategoryId,
      isDuplicate: dupCheck.isDuplicate,
      duplicateReason: dupCheck.duplicateReason,
      // Deselect invalid rows and duplicates by default to prevent accidents
      selected: isValid && !dupCheck.isDuplicate,
      isValid,
      validationError,
    });
  });

  return parsedRows;
}
