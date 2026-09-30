import {
  isLikelyTransactionSms,
  hashSmsText,
  isTransactionAlreadyInLedger,
} from '../src/lib/clipboard-sms-service';
import { parseSingleSms } from '../src/lib/sms-parser-engine';
import { Transaction } from '../src/types/accounting';

function runTests() {
  console.log('--- STARTING FEAT-6 CLIPBOARD SMS AUTO-DETECTION TESTS ---');

  // Test 1: SMS Heuristic Detection
  console.log('Test 1: Financial SMS detection heuristics...');
  const bkashSms = 'You have received Tk 2,500.00 from 01712345678. Fee Tk 0.00. Balance Tk 14,850.25. TrxID 9K48X7M9A at 26/09/2026 14:30';
  const cityBankSms = 'A/C *1234 has been debited by BDT 4,500.00 on 26-Sep-2026 15:20 at SHWAPNO DHANMONDI. Avail Bal BDT 92,300.00.';
  const nagadSms = 'Cash Out of Tk 1,000.00 to 01987654321 is successful. Fee: Tk 15.00. Balance: Tk 5,230.00. TxnID: 7M82N91A';
  const otpSms = 'Your OTP for login is 482910. Do not share this OTP with anyone.';
  const normalChat = 'Hey brother, are we meeting at the cafe tomorrow evening?';

  if (!isLikelyTransactionSms(bkashSms)) throw new Error('Failed to detect bKash SMS');
  if (!isLikelyTransactionSms(cityBankSms)) throw new Error('Failed to detect City Bank SMS');
  if (!isLikelyTransactionSms(nagadSms)) throw new Error('Failed to detect Nagad SMS');
  if (isLikelyTransactionSms(otpSms)) throw new Error('OTP SMS should NOT be detected as transaction SMS');
  if (isLikelyTransactionSms(normalChat)) throw new Error('Normal chat text should NOT be detected');
  console.log('✓ Heuristic SMS filter passed');

  // Test 2: Hash function determinism
  console.log('Test 2: Hash function determinism...');
  const h1 = hashSmsText(bkashSms);
  const h2 = hashSmsText(bkashSms);
  const h3 = hashSmsText(cityBankSms);
  if (h1 !== h2) throw new Error('Hash should be deterministic');
  if (h1 === h3) throw new Error('Different SMS should produce different hash');
  console.log('✓ Hash function passed');

  // Test 3: Parsing and Ledger duplicate detection
  console.log('Test 3: Parsing and ledger duplicate check...');
  const parsedBkash = parseSingleSms(bkashSms);
  if (!parsedBkash) throw new Error('Failed to parse bKash SMS');
  if (parsedBkash.amount !== 2500) throw new Error(`Expected amount 2500, got ${parsedBkash.amount}`);
  if (parsedBkash.trxId !== '9K48X7M9A') throw new Error(`Expected TrxID 9K48X7M9A, got ${parsedBkash.trxId}`);
  if (parsedBkash.type !== 'income') throw new Error('Expected income type for received bKash');

  const existingLedgerTxs: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-09-26',
      type: 'income',
      status: 'posted',
      note: 'bKash deposit (TrxID: 9K48X7M9A)',
      userId: 'u1',
      createdBy: 'u1',
      createdAt: '',
      updatedAt: '',
      version: 1,
    },
  ];

  if (!isTransactionAlreadyInLedger(parsedBkash, existingLedgerTxs)) {
    throw new Error('Expected transaction to be detected as already in ledger');
  }

  const parsedNagad = parseSingleSms(nagadSms);
  if (!parsedNagad) throw new Error('Failed to parse Nagad SMS');
  if (isTransactionAlreadyInLedger(parsedNagad, existingLedgerTxs)) {
    throw new Error('Nagad transaction should NOT be marked as duplicate');
  }
  console.log('✓ Parse and duplicate matching passed');

  console.log('🎉 ALL FEAT-6 CLIPBOARD SMS AUTO-DETECTION TESTS PASSED PERFECTLY!');
}

runTests();
