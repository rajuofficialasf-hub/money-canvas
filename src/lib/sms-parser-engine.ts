import { todayLocalISO } from './date-utils';
import { newId } from './id-utils';
/**
 * 100% Free Offline Client-Side SMS & Notification Parser
 * Zero External API cost, Zero data transmission, 100% Private
 */

import { ParsedSmsTransaction, ParsedTransactionType, BANGLADESH_SMS_PRESETS } from '../types/sms-parser';
import { Account, Category } from '../types/accounting';

export { BANGLADESH_SMS_PRESETS };

// Month names dictionary for dates like '26-Sep-2026' or '26 Sep 2026'
const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

// Known merchant and keyword mapping to category names
const KEYWORD_CATEGORY_MAP: Array<{ regex: RegExp; categoryName: string; type: 'expense' | 'income' }> = [
  // Groceries & Daily Needs
  { regex: /\b(shwapno|agora|meena\s*bazar|unimart|chaldal|prince\s*bazar|daily\s*shopping|grocer|kitchen|bazar)\b/i, categoryName: 'Groceries', type: 'expense' },
  // Food & Dining
  { regex: /\b(foodpanda|pathao\s*food|kfc|pizza\s*hut|burger\s*king|bismillah|sultan|kacchi|madchef|domino|takeout|chillox|cafe|restaurant|coffee|snack|dining)\b/i, categoryName: 'Food & Dining', type: 'expense' },
  // Transportation & Rides
  { regex: /\b(pathao|uber|obhai|shohoz|cng|cng\s*gas|petrol|octane|fuel|padma\s*oil|meghna\s*petroleum|railway|biman|bus\s*ticket|flight)\b/i, categoryName: 'Transportation', type: 'expense' },
  // Shopping & Retail
  { regex: /\b(aarong|yellow|daraz|apex|bata|sailor|artisan|amazon|ecstasy|aliexpress|zara|cloth|fashion|shoes|gadget|shop)\b/i, categoryName: 'Shopping', type: 'expense' },
  // Utilities & Bills
  { regex: /\b(desco|dpdc|nesco|wasa|titas|bakhrabad|btcl|link3|amberit|carnival|electricity|water|gas|utility|internet|wifi|broadband)\b/i, categoryName: 'Utilities & Bills', type: 'expense' },
  // Mobile Recharge
  { regex: /\b(mobile\s*recharge|recharge|grameenphone|robi|banglalink|teletalk|airtel|topup)\b/i, categoryName: 'Utilities & Bills', type: 'expense' },
  // Healthcare & Medicine
  { regex: /\b(labaid|square\s*hospital|popular|pharmacy|medicine|evercare|united\s*hospital|doctor|clinic|health|diagnostic)\b/i, categoryName: 'Healthcare', type: 'expense' },
  // Entertainment & Streaming
  { regex: /\b(netflix|spotify|youtube|star\s*cineplex|blockbuster|cinema|movie|game|steam)\b/i, categoryName: 'Entertainment', type: 'expense' },
  // Education
  { regex: /\b(school|college|university|tuition|coursera|udemy|british\s*council|book|stationery)\b/i, categoryName: 'Education', type: 'expense' },
  // Salary & Income
  { regex: /\b(salary|payroll|remittance|beftn\s*salary|freelance|commission|upwork|fiverr|inward)\b/i, categoryName: 'Salary', type: 'income' },
  // Cashback & Rewards
  { regex: /\b(cashback|reward|bonus|interest|dividend)\b/i, categoryName: 'Other Income', type: 'income' },
];

/**
 * Normalizes number string like "1,250.50" to float
 */
function parseAmountNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

/**
 * Parses date string from SMS or returns today in YYYY-MM-DD
 */
function extractDate(text: string): { date: string; time?: string } {
  const today = todayLocalISO();

  // Pattern 1: 26-Sep-2026 or 26 Sep 2026 or 26-09-2026
  const textDateMatch = text.match(/\b(\d{1,2})[-/\s]([A-Za-z]{3}|\d{1,2})[-/\s](\d{4}|\d{2})\b/);
  if (textDateMatch) {
    const day = textDateMatch[1].padStart(2, '0');
    let month = textDateMatch[2].toLowerCase();
    let year = textDateMatch[3];
    if (year.length === 2) year = '20' + year;

    if (MONTH_MAP[month]) {
      month = MONTH_MAP[month];
    } else {
      month = month.padStart(2, '0');
    }

    if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
      // Look for time HH:MM
      const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?:\s*(?:AM|PM|am|pm))?\b/);
      return {
        date: `${year}-${month}-${day}`,
        time: timeMatch ? timeMatch[0] : undefined,
      };
    }
  }

  // Pattern 2: YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return { date: isoMatch[0] };
  }

  // Look for time even if date wasn't explicitly found
  const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?:\s*(?:AM|PM|am|pm))?\b/);
  return {
    date: today,
    time: timeMatch ? timeMatch[0] : undefined,
  };
}

/**
 * Detects the Bank or MFS Provider from SMS content
 */
function detectProvider(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes('bkash') || lower.includes('বিকাশ')) return 'bKash';
  if (lower.includes('nagad') || lower.includes('নগদ')) return 'Nagad';
  if (lower.includes('rocket') || lower.includes('dbbl') || lower.includes('nexuspay')) return 'Rocket / DBBL';
  if (lower.includes('upay')) return 'Upay';
  if (lower.includes('cellfin') || lower.includes('ibbl') || lower.includes('islami bank')) return 'Cellfin / IBBL';
  if (lower.includes('city bank') || lower.includes('citytouch')) return 'City Bank';
  if (lower.includes('brac bank') || lower.includes('astha')) return 'BRAC Bank';
  if (lower.includes('ebl') || lower.includes('eastern bank') || lower.includes('skybanking')) return 'EBL (Eastern Bank)';
  if (lower.includes('standard chartered') || lower.includes('scb')) return 'Standard Chartered';
  if (lower.includes('mtb') || lower.includes('mutual trust')) return 'MTB';
  if (lower.includes('dhaka bank')) return 'Dhaka Bank';
  if (lower.includes('prime bank')) return 'Prime Bank';
  if (lower.includes('ucb') || lower.includes('upay')) return 'UCB';

  if (lower.includes('card') || lower.includes('a/c') || lower.includes('acct') || lower.includes('account')) {
    return 'Bank / Card';
  }

  return 'Mobile / Bank SMS';
}

/**
 * Detects transaction type from SMS text
 */
function detectTransactionType(text: string): ParsedTransactionType {
  const lower = text.toLowerCase();

  if (lower.includes('credited') || lower.includes('received') || lower.includes('cash in') || lower.includes('ক্যাশ ইন') || lower.includes('জমা')) {
    return 'income';
  }
  if (lower.includes('cash out') || lower.includes('ক্যাশ আউট') || lower.includes('withdrawn') || lower.includes('atm withdrawal')) {
    return 'cash_out';
  }
  if (lower.includes('send money') || lower.includes('fund transfer') || lower.includes('transfer')) {
    return 'transfer';
  }
  if (lower.includes('bill pay') || lower.includes('pay bill')) {
    return 'bill_pay';
  }
  if (lower.includes('recharge')) {
    return 'recharge';
  }
  if (lower.includes('payment') || lower.includes('paid') || lower.includes('debited') || lower.includes('পেমেন্ট') || lower.includes('কর্তন')) {
    return 'expense';
  }

  return 'expense';
}

/**
 * Extracts Transaction ID (TrxID, TxnID, etc.)
 */
function extractTrxId(text: string): string | undefined {
  const match = text.match(/\b(?:TrxID|TxnID|TxnId|Txn ID|Trx ID|Ref ID|ID)\s*[:#]?\s*([A-Za-z0-9_-]{5,20})\b/i);
  return match ? match[1] : undefined;
}

/**
 * Extracts Reference if any (e.g. Ref: GROCERY)
 */
function extractRef(text: string): string | undefined {
  const match = text.match(/\bRef\s*[:#]?\s*([A-Za-z0-9_\-\s]{2,20}?)(?=[.,;\s]+(?:TrxID|TxnID|Fee|Bal|at|\n|$))/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Extracts Fee / Charge
 */
function extractFee(text: string): number {
  const match = text.match(/\bFee\s*(?:is|:)?\s*(?:Tk|BDT|৳)?\s*([0-9]{1,4}(?:\.[0-9]{1,2})?)/i);
  return match ? parseAmountNumber(match[1]) : 0;
}

/**
 * Extracts Balance after transaction
 */
function extractBalance(text: string): number | undefined {
  const match = text.match(/\b(?:Balance|Bal|Avail Bal|Available Balance)\s*(?:is|:)?\s*(?:Tk|BDT|৳)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i);
  return match ? parseAmountNumber(match[1]) : undefined;
}

/**
 * Extracts Merchant or Counterparty
 */
function extractCounterparty(text: string, type: ParsedTransactionType): string {
  // Pattern 1: "...to [Name/Number] successful..."
  const toMatch = text.match(/\bto\s+([A-Za-z0-9\s._&-]+?)(?:\s+(?:is\s+)?successful|\s+at|\s+on|\s+Ref|\s+Fee|\s+TrxID|\s+TxnID|\.|\n|$)/i);
  if (toMatch && toMatch[1].trim().length > 1) {
    const raw = toMatch[1].trim();
    if (!['a/c', 'card', 'bank', 'the', 'tk', 'bdt'].includes(raw.toLowerCase())) {
      return raw;
    }
  }

  // Pattern 2: "...at [Store/Merchant] on..."
  const atMatch = text.match(/\bat\s+([A-Za-z0-9\s._&-]+?)(?:\s+on|\s+Avail|\s+Bal|\.|\n|$)/i);
  if (atMatch && atMatch[1].trim().length > 1) {
    const raw = atMatch[1].trim();
    if (!['a/c', 'card', 'the', 'tk', 'bdt'].includes(raw.toLowerCase())) {
      return raw;
    }
  }

  // Pattern 3: "...from [Name/Number]..."
  const fromMatch = text.match(/\bfrom\s+([A-Za-z0-9\s._&-]+?)(?:\s+(?:is\s+)?successful|\s+at|\s+on|\s+Ref|\s+Fee|\s+TrxID|\s+TxnID|\.|\n|$)/i);
  if (fromMatch && fromMatch[1].trim().length > 1) {
    const raw = fromMatch[1].trim();
    if (!['a/c', 'card', 'the', 'tk', 'bdt'].includes(raw.toLowerCase())) {
      return raw;
    }
  }

  return type === 'income' ? 'Sender / Source' : 'Merchant / Recipient';
}

/**
 * Extracts Transaction Amount
 */
function extractAmount(text: string): number {
  // Regex priorities:
  // 1. "debited (by/for)? (BDT|Tk)? 1,200.00"
  // 2. "credited (by/with/for)? (BDT|Tk)? 1,200.00"
  // 3. "Payment (of)? (Tk|BDT)? 1,200.00"
  // 4. "Cash Out (of)? (Tk|BDT)? 1,200.00"
  // 5. "Send Money (of)? (Tk|BDT)? 1,200.00"
  // 6. "received (Tk|BDT)? 1,200.00"
  // 7. "(Tk|BDT|৳)\s*1,200.00"

  const specificPatterns = [
    /(?:debited|credited|paid|spent)\s+(?:by|for|with)?\s*(?:Tk|BDT|৳)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:Payment|Cash Out|Send Money|Bill Pay|Recharge)\s+(?:of)?\s*(?:Tk|BDT|৳)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:received|transferred)\s+(?:Tk|BDT|৳)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:Tk|BDT|৳)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:Tk|BDT|৳)/i,
  ];

  for (const pattern of specificPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amt = parseAmountNumber(match[1]);
      if (amt > 0) return amt;
    }
  }

  // Fallback: any standalone number that looks like a currency amount
  const fallback = text.match(/\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]{2,}\.[0-9]{2})\b/);
  if (fallback && fallback[1]) {
    return parseAmountNumber(fallback[1]);
  }

  return 0;
}

/**
 * Matches extracted SMS with existing user account
 */
function matchAccount(
  provider: string,
  rawText: string,
  userAccounts: Account[]
): { accountId?: string; accountName: string } {
  if (userAccounts.length === 0) {
    return { accountName: provider };
  }

  const lower = rawText.toLowerCase();

  // Try matching mask digits (e.g. "...3456" or "*1234")
  const maskMatch = rawText.match(/(?:\.\.\.|\*|x+|X+)(\d{4})/);
  if (maskMatch) {
    const digits = maskMatch[1];
    const foundByMask = userAccounts.find(
      (a) => a.accountNumberMask && a.accountNumberMask.includes(digits)
    );
    if (foundByMask) {
      return { accountId: foundByMask.id, accountName: foundByMask.name };
    }
  }

  // Try matching by provider name in account name or institution
  if (provider.includes('bKash')) {
    const bkashAcc = userAccounts.find(
      (a) =>
        a.name.toLowerCase().includes('bkash') ||
        (a.institutionName && a.institutionName.toLowerCase().includes('bkash')) ||
        a.accountType === 'mobile_wallet'
    );
    if (bkashAcc) return { accountId: bkashAcc.id, accountName: bkashAcc.name };
  }

  if (provider.includes('Nagad')) {
    const nagadAcc = userAccounts.find(
      (a) =>
        a.name.toLowerCase().includes('nagad') ||
        (a.institutionName && a.institutionName.toLowerCase().includes('nagad'))
    );
    if (nagadAcc) return { accountId: nagadAcc.id, accountName: nagadAcc.name };
  }

  if (provider.includes('Rocket')) {
    const rocketAcc = userAccounts.find(
      (a) =>
        a.name.toLowerCase().includes('rocket') ||
        (a.institutionName && a.institutionName.toLowerCase().includes('rocket'))
    );
    if (rocketAcc) return { accountId: rocketAcc.id, accountName: rocketAcc.name };
  }

  if (provider.includes('City Bank')) {
    const cityAcc = userAccounts.find(
      (a) =>
        a.name.toLowerCase().includes('city') ||
        (a.institutionName && a.institutionName.toLowerCase().includes('city'))
    );
    if (cityAcc) return { accountId: cityAcc.id, accountName: cityAcc.name };
  }

  if (provider.includes('BRAC')) {
    const bracAcc = userAccounts.find(
      (a) =>
        a.name.toLowerCase().includes('brac') ||
        (a.institutionName && a.institutionName.toLowerCase().includes('brac'))
    );
    if (bracAcc) return { accountId: bracAcc.id, accountName: bracAcc.name };
  }

  if (provider.includes('EBL') || provider.includes('Eastern')) {
    const eblAcc = userAccounts.find(
      (a) =>
        a.name.toLowerCase().includes('ebl') ||
        a.name.toLowerCase().includes('eastern') ||
        (a.institutionName && a.institutionName.toLowerCase().includes('ebl'))
    );
    if (eblAcc) return { accountId: eblAcc.id, accountName: eblAcc.name };
  }

  if (provider.includes('Cellfin') || provider.includes('IBBL') || provider.includes('Islami')) {
    const ibblAcc = userAccounts.find(
      (a) =>
        a.name.toLowerCase().includes('islami') ||
        a.name.toLowerCase().includes('ibbl') ||
        a.name.toLowerCase().includes('cellfin')
    );
    if (ibblAcc) return { accountId: ibblAcc.id, accountName: ibblAcc.name };
  }

  // Fallback to first active account
  const defaultAcc = userAccounts.find((a) => !a.isArchived) || userAccounts[0];
  return { accountId: defaultAcc.id, accountName: defaultAcc.name };
}

/**
 * Matches category using intelligent keyword matching
 */
function matchCategory(
  rawText: string,
  counterparty: string,
  txType: ParsedTransactionType,
  userCategories: Category[]
): { categoryId?: string; categoryName: string } {
  const combined = `${rawText} ${counterparty}`.toLowerCase();

  for (const item of KEYWORD_CATEGORY_MAP) {
    if (item.regex.test(combined)) {
      // Find matching user category
      const found = userCategories.find(
        (c) =>
          c.name.toLowerCase() === item.categoryName.toLowerCase() ||
          c.name.toLowerCase().includes(item.categoryName.toLowerCase())
      );
      if (found) {
        return { categoryId: found.id, categoryName: found.name };
      }
      return { categoryName: item.categoryName };
    }
  }

  // Fallback defaults based on transaction type
  if (txType === 'income') {
    const incCat = userCategories.find((c) => c.type === 'income');
    return {
      categoryId: incCat?.id,
      categoryName: incCat?.name || 'General Income',
    };
  }

  const expCat = userCategories.find((c) => c.type === 'expense');
  return {
    categoryId: expCat?.id,
    categoryName: expCat?.name || 'General Expense',
  };
}

/**
 * Parses a single SMS text into structured transaction data
 */
export function parseSingleSms(
  rawSms: string,
  userAccounts: Account[] = [],
  userCategories: Category[] = []
): ParsedSmsTransaction | null {
  const trimmed = rawSms.trim();
  if (!trimmed || trimmed.length < 10) return null;

  const provider = detectProvider(trimmed);
  const txType = detectTransactionType(trimmed);
  const amount = extractAmount(trimmed);
  const fee = extractFee(trimmed);
  const balanceAfter = extractBalance(trimmed);
  const trxId = extractTrxId(trimmed);
  const ref = extractRef(trimmed);
  const { date, time } = extractDate(trimmed);
  const counterparty = extractCounterparty(trimmed, txType);

  // Confidence assessment
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (amount > 0 && (trxId || provider !== 'Mobile / Bank SMS')) {
    confidence = 'high';
  } else if (amount > 0) {
    confidence = 'medium';
  }

  const accountMatch = matchAccount(provider, trimmed, userAccounts);
  const categoryMatch = matchCategory(trimmed, counterparty, txType, userCategories);

  return {
    id: newId('sms'),
    rawText: trimmed,
    sourceProvider: provider,
    type: txType,
    amount,
    fee,
    balanceAfter,
    trxId,
    ref,
    counterparty,
    date,
    time,
    confidence,
    suggestedAccountId: accountMatch.accountId,
    suggestedAccountName: accountMatch.accountName,
    suggestedCategoryId: categoryMatch.categoryId,
    suggestedCategoryName: categoryMatch.categoryName,
    selected: amount > 0,
    validationError: amount <= 0 ? 'Amount could not be detected' : undefined,
  };
}

/**
 * Splits pasted text containing one or multiple SMSes into separate messages
 */
export function splitMultiSmsText(rawInput: string): string[] {
  if (!rawInput.trim()) return [];

  // If separated by 2 or more newlines or dashed lines
  const rawBlocks = rawInput
    .split(/\n\s*\n+|---[-]+|\bFrom:\s*/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (rawBlocks.length > 1) {
    return rawBlocks;
  }

  // If pasted as continuous lines where each line or sentence has "TrxID" or "debited" or "Payment"
  const lines = rawInput.split('\n').map((l) => l.trim()).filter((l) => l.length > 20);
  const looksLikeIndividualSmsLines = lines.length > 1 && lines.every((l) => 
    /\b(Tk|BDT|৳|debited|credited|Payment|TrxID|TxnID|Cellfin|bKash|Nagad)\b/i.test(l)
  );

  if (looksLikeIndividualSmsLines) {
    return lines;
  }

  return [rawInput.trim()];
}

/**
 * Main batch parsing function
 */
export function parseBatchSms(
  rawInput: string,
  userAccounts: Account[] = [],
  userCategories: Category[] = []
): ParsedSmsTransaction[] {
  const blocks = splitMultiSmsText(rawInput);
  const results: ParsedSmsTransaction[] = [];

  for (const block of blocks) {
    const parsed = parseSingleSms(block, userAccounts, userCategories);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}
