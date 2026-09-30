/**
 * Money Canvas — Clipboard Transaction SMS Auto-Detector (FEAT-6)
 *
 * Provides safe, Google Play Store compliant automatic transaction capture.
 * When the user copies a transaction SMS (bKash, Nagad, City Bank, BRAC, DBBL, etc.)
 * and opens or resumes Money Canvas, this service detects the financial SMS
 * without requiring the restricted and prohibited Android READ_SMS permission.
 */

import { Clipboard } from '@capacitor/clipboard';
import { parseSingleSms } from './sms-parser-engine';
import { Account, Category, Transaction } from '../types/accounting';
import { ParsedSmsTransaction } from '../types/sms-parser';

const DISMISSED_SMS_KEY = 'mc_dismissed_sms_hashes';

/**
 * 32-bit FNV-1a hash of SMS text string
 */
export function hashSmsText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Reads text from system clipboard using Capacitor or Web Clipboard API
 */
export async function readClipboardText(): Promise<string> {
  try {
    const { value } = await Clipboard.read();
    if (value && typeof value === 'string') {
      return value.trim();
    }
  } catch {
    // Fallback to browser navigator.clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        return (text || '').trim();
      }
    } catch {}
  }
  return '';
}

/**
 * Fast heuristic to check if text resembles a Bangladeshi or international financial SMS
 */
export function isLikelyTransactionSms(text: string): boolean {
  if (!text || text.length < 15 || text.length > 1000) return false;

  const lower = text.toLowerCase();

  // Keyword indicators of financial transactions
  const hasCurrencyOrAmount = /\b(tk|bdt|৳|amount|balance)\b/i.test(text) || /[০-৯0-9,.]+\s*(?:tk|bdt|৳)/i.test(text);
  const hasTxAction = /\b(debited|credited|paid|payment|transfer|sent|received|cash\s*in|cash\s*out|fee|withdrawn|deposit|purchase|trxid|txnid|ref)\b/i.test(lower);
  const hasProvider = /\b(bkash|nagad|rocket|dbbl|city\s*bank|brac|ebl|islami\s*bank|cellfin|upay|scb|standard\s*chartered|hsbc|trust\s*bank|midland|pubali)\b/i.test(lower);

  // Must match at least two strong indicators
  let matches = 0;
  if (hasCurrencyOrAmount) matches++;
  if (hasTxAction) matches++;
  if (hasProvider) matches++;

  return matches >= 2;
}

/**
 * Check if this SMS was already dismissed by the user
 */
export function isSmsDismissed(text: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_SMS_KEY);
    if (!raw) return false;
    const dismissed: string[] = JSON.parse(raw);
    const hash = hashSmsText(text);
    return Array.isArray(dismissed) && dismissed.includes(hash);
  } catch {
    return false;
  }
}

/**
 * Mark this SMS as dismissed so user is not prompted again
 */
export function markSmsDismissed(text: string): void {
  try {
    const hash = hashSmsText(text);
    const raw = localStorage.getItem(DISMISSED_SMS_KEY);
    const dismissed: string[] = raw ? JSON.parse(raw) : [];
    if (!dismissed.includes(hash)) {
      // Keep only last 50 dismissed hashes
      const updated = [hash, ...dismissed].slice(0, 50);
      localStorage.setItem(DISMISSED_SMS_KEY, JSON.stringify(updated));
    }
  } catch {}
}

/**
 * Check if the transaction represented in the SMS is already recorded in the ledger
 */
export function isTransactionAlreadyInLedger(
  parsed: ParsedSmsTransaction,
  existingTransactions: Transaction[]
): boolean {
  for (const tx of existingTransactions) {
    if (tx.status === 'voided') continue;

    // 1. Check TrxID match if available
    if (parsed.trxId && tx.note && tx.note.toLowerCase().includes(parsed.trxId.toLowerCase())) {
      return true;
    }

    // 2. Check identical date and amount with matching source keyword
    if (tx.date === parsed.date && tx.note) {
      if (parsed.counterparty && tx.note.toLowerCase().includes(parsed.counterparty.toLowerCase())) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detect transaction SMS in the clipboard
 */
export async function detectClipboardSms(
  accounts: Account[],
  categories: Category[],
  existingTransactions: Transaction[]
): Promise<{
  detected: boolean;
  rawText?: string;
  parsed?: ParsedSmsTransaction;
  alreadyInLedger?: boolean;
}> {
  const text = await readClipboardText();
  if (!text || !isLikelyTransactionSms(text)) {
    return { detected: false };
  }

  if (isSmsDismissed(text)) {
    return { detected: false };
  }

  const parsed = parseSingleSms(text, accounts, categories);
  if (!parsed || parsed.amount <= 0 || parsed.confidence === 'low') {
    return { detected: false };
  }

  const alreadyInLedger = isTransactionAlreadyInLedger(parsed, existingTransactions);

  return {
    detected: true,
    rawText: text,
    parsed,
    alreadyInLedger,
  };
}
