/**
 * SMS & Push Notification Parser Engine
 * 100% Free, Client-Side, Zero API Cost, 100% Private (No data sent to any server)
 * 
 * Supports bKash, Nagad, Rocket, Upay, Cellfin/IBBL, City Bank (Citytouch),
 * BRAC Bank (Astha), EBL (Skybanking), DBBL (NexusPay), SCB, MTB,
 * Visa/Mastercard transaction alerts, and international debit/credit formats.
 */

export type ParsedTransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'cash_out'
  | 'cash_in'
  | 'bill_pay'
  | 'recharge'
  | 'fee';

export interface ParsedSmsTransaction {
  id: string;
  rawText: string;
  sourceProvider: string; // e.g., 'bKash', 'Nagad', 'Rocket', 'City Bank', 'BRAC Bank', 'Cellfin', 'EBL', 'DBBL', 'Generic Bank'
  type: ParsedTransactionType;
  amount: number;
  fee: number;
  balanceAfter?: number;
  trxId?: string;
  ref?: string;
  counterparty?: string; // Merchant, receiver phone, or source
  date: string; // 'YYYY-MM-DD'
  time?: string; // 'HH:MM'
  confidence: 'high' | 'medium' | 'low';
  suggestedCategoryId?: string;
  suggestedCategoryName: string;
  suggestedAccountId?: string;
  suggestedAccountName: string;
  selected: boolean;
  validationError?: string;
}

export interface SmsTemplateExample {
  title: string;
  titleEn: string;
  provider: string;
  smsText: string;
  description: string;
  descriptionEn: string;
}

// Pre-defined sample SMS templates for 1-click test
export const BANGLADESH_SMS_PRESETS: SmsTemplateExample[] = [
  {
    title: 'বিকাশ মার্চেন্ট পেমেন্ট',
    titleEn: 'bKash Merchant Payment',
    provider: 'bKash',
    smsText: 'Payment Tk 850.00 to Shwapno successful. Ref: GROCERY. TrxID 9K8L1M2N3P at 26/09/2026 14:30. Balance Tk 5,420.00.',
    description: 'দৈনন্দিন মুদি বাজার বা শপিংয়ে বিকাশ মার্চেন্ট পেমেন্ট',
    descriptionEn: 'Daily grocery or supermarket merchant QR payment',
  },
  {
    title: 'বিকাশ ক্যাশ ইন / টাকা প্রাপ্তি',
    titleEn: 'bKash Cash In / Received Money',
    provider: 'bKash',
    smsText: 'You have received Tk 15,000.00 from 01711223344. Fee Tk 0.00. Balance Tk 24,500.00. TrxID 8A7B6C5D4E at 26/09/2026 10:15.',
    description: 'বেতন, ফ্রিল্যান্সিং বা কারো থেকে টাকা পাওয়ার নোটিফিকেশন',
    descriptionEn: 'Salary, freelance inward remittance, or peer cash-in alert',
  },
  {
    title: 'বিকাশ ক্যাশ আউট (এজেন্ট)',
    titleEn: 'bKash Cash Out to Agent',
    provider: 'bKash',
    smsText: 'Cash Out Tk 2,000.00 to 01819887766 successful. Fee Tk 29.80. Balance Tk 22,470.20. TrxID 7H6G5F4E3D at 26/09/2026 16:45.',
    description: 'এজেন্ট বা এটিএম থেকে ক্যাশ উত্তোলন ও ফি হিসাব',
    descriptionEn: 'Agent ATM cash withdrawal with fee tracking',
  },
  {
    title: 'নগদ ফুডপ্যান্ডা / পেমেন্ট',
    titleEn: 'Nagad Foodpanda / Merchant Payment',
    provider: 'Nagad',
    smsText: 'Payment of Tk 420.00 to Foodpanda is successful. TxnID: 71AF839D at 26/09/2026 13:20. Balance: Tk 3,180.00.',
    description: 'নগদ দিয়ে খাবার অর্ডার বা অনলাইন পেমেন্ট',
    descriptionEn: 'Food delivery or online merchant payment via Nagad',
  },
  {
    title: 'সিটি ব্যাংক ডেবিট কার্ড অ্যালার্ট',
    titleEn: 'City Bank Debit Card POS Alert',
    provider: 'City Bank',
    smsText: 'Dear Cardholder, your A/C ...3456 has been debited by BDT 3,500.00 on 26-Sep-2026 18:22 at UNIMART DHAKA. Avail Bal BDT 45,800.00.',
    description: 'সুপারশপ বা পিওএস মেশিনে ডেবিট/ক্রেডিট কার্ড সোয়াইপ',
    descriptionEn: 'Superstore POS debit card swipe transaction',
  },
  {
    title: 'ব্র্যাক ব্যাংক বেতন ক্রেডিট',
    titleEn: 'BRAC Bank Salary Credit',
    provider: 'BRAC Bank',
    smsText: 'Your A/C ...7890 has been credited for BDT 75,000.00 on 25-Sep-2026 via BEFTN/SALARY. Avail Bal BDT 115,200.00.',
    description: 'ব্যাংক অ্যাকাউন্টে কোম্পানির বেতন বা রেমিট্যান্স জমা',
    descriptionEn: 'Company salary or inward corporate BEFTN deposit',
  },
  {
    title: 'সেলফিন ফান্ড ট্রান্সফার',
    titleEn: 'Cellfin / IBBL Fund Transfer',
    provider: 'Cellfin',
    smsText: 'Cellfin: Tk 5,000.00 debited from A/C ...2345 for Fund Transfer to bKash 01700112233. TrxID 2609267789. Bal Tk 12,400.00.',
    description: 'ইসলামী ব্যাংক সেলফিন থেকে বিকাশ/অন্য ব্যাংকে ফান্ড ট্রান্সফার',
    descriptionEn: 'Bank-to-wallet inter-account transfer from IBBL',
  },
  {
    title: 'রকেট ডেসকো বিদ্যুৎ বিল পেমেন্ট',
    titleEn: 'Rocket Electricity Bill Payment',
    provider: 'Rocket',
    smsText: 'Bill Pay Tk 1,850.00 to DESCO POSTPAID successful from 01911223344. Fee Tk 0.00. TxnId: 99887766. Bal Tk 4,150.00.',
    description: 'বিদ্যুৎ, গ্যাস, পানি বা ইন্টারনেট বিল পেমেন্ট',
    descriptionEn: 'Utility bill payment to DESCO via DBBL Rocket',
  },
];
