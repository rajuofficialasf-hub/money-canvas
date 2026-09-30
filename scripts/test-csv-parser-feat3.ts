import {
  parseCsvText,
  normalizeDateToISO,
  parseCurrencyAmount,
  autoDetectColumnMapping,
  suggestCategoryFromDescription,
  checkDuplicateTransaction,
  parseStatementRows,
  BANK_PRESETS,
} from '../src/lib/csv-parser-engine';
import { Transaction, TransactionLine, Category } from '../src/types/accounting';

function runTests() {
  console.log('--- STARTING FEAT-3 CSV PARSER TESTS ---');

  // Test 1: RFC-4180 CSV Text Parsing
  console.log('Test 1: RFC-4180 CSV parsing with quotes and commas...');
  const sampleCsv = `Date,Description,Debit,Credit,Balance
2026-09-01,"Shwapno Super Shop, Dhanmondi",1500.00,,48500.00
2026-09-02,"Monthly Salary ""Tech Corp""",,65000.00,113500.00
১২/০৯/২০২৬,Uber Trip to Gulshan,450.50,,113049.50
`;
  const parsed = parseCsvText(sampleCsv);
  if (parsed.headers.length !== 5) throw new Error(`Expected 5 headers, got ${parsed.headers.length}`);
  if (parsed.rows.length !== 3) throw new Error(`Expected 3 rows, got ${parsed.rows.length}`);
  if (parsed.rows[0][1] !== 'Shwapno Super Shop, Dhanmondi') throw new Error('Comma in quotes failed');
  if (parsed.rows[1][1] !== 'Monthly Salary "Tech Corp"') throw new Error('Escaped quotes failed');
  console.log('✓ RFC-4180 CSV parser passed perfectly');

  // Test 2: Date Normalization
  console.log('Test 2: Date normalization across various formats...');
  if (normalizeDateToISO('2026-09-15') !== '2026-09-15') throw new Error('ISO format failed');
  if (normalizeDateToISO('15/09/2026') !== '2026-09-15') throw new Error('DD/MM/YYYY failed');
  if (normalizeDateToISO('15-Sep-2026') !== '2026-09-15') throw new Error('DD-MMM-YYYY failed');
  if (normalizeDateToISO('১৫/০৯/২০২৬') !== '2026-09-15') throw new Error('Bengali digits date failed');
  console.log('✓ Date normalizer passed with all formats & Bengali numerals');

  // Test 3: Currency Amount Parsing
  console.log('Test 3: Currency amounts parsing...');
  const amt1 = parseCurrencyAmount('৳1,50,000.00');
  if (amt1.amount !== 150000 || amt1.isNegative) throw new Error('Bangla lakh format failed');
  const amt2 = parseCurrencyAmount('(2,500.50)');
  if (amt2.amount !== 2500.50 || !amt2.isNegative) throw new Error('Parenthesis negative failed');
  const amt3 = parseCurrencyAmount('-৳৪৫০.৫০');
  if (amt3.amount !== 450.50 || !amt3.isNegative) throw new Error('Bengali digit amount failed');
  console.log('✓ Currency parser passed with lakhs format & negative variations');

  // Test 4: Auto-detect mapping
  console.log('Test 4: Auto-detect column mapping for bank statements...');
  const headers = ['Txn Date', 'Particulars', 'Debit Amount', 'Credit Amount', 'Running Balance'];
  const mapping = autoDetectColumnMapping(headers, 'auto');
  if (mapping.dateColIndex !== 0) throw new Error('Failed to detect date col');
  if (mapping.descriptionColIndex !== 1) throw new Error('Failed to detect description col');
  if (mapping.debitColIndex !== 2) throw new Error('Failed to detect debit col');
  if (mapping.creditColIndex !== 3) throw new Error('Failed to detect credit col');
  console.log('✓ Auto-detect column mapping passed');

  // Test 5: Auto-categorization
  console.log('Test 5: Auto-categorization rules...');
  const categories: Category[] = [
    { id: 'cat-grocery', userId: 'u1', name: 'Groceries (মুদি ও বাজার)', type: 'expense', isSystem: true },
    { id: 'cat-transport', userId: 'u1', name: 'Transportation (যানবাহন)', type: 'expense', isSystem: true },
    { id: 'cat-salary', userId: 'u1', name: 'Salary (বেতন)', type: 'income', isSystem: true },
  ];
  const catGrocery = suggestCategoryFromDescription('Shwapno Bazaar Banani', categories, 'expense');
  if (catGrocery !== 'cat-grocery') throw new Error('Failed to auto-categorize grocery');
  const catTransport = suggestCategoryFromDescription('Uber trip ride payment', categories, 'expense');
  if (catTransport !== 'cat-transport') throw new Error('Failed to auto-categorize transport');
  const catSalary = suggestCategoryFromDescription('Monthly salary deposit', categories, 'income');
  if (catSalary !== 'cat-salary') throw new Error('Failed to auto-categorize salary');
  console.log('✓ Auto-categorization passed');

  // Test 6: Duplicate Detection
  console.log('Test 6: Duplicate transaction detection...');
  const existingTxs: Transaction[] = [
    {
      id: 'tx-existing-1',
      date: '2026-09-01',
      type: 'expense',
      status: 'posted',
      note: 'Grocery bazaar',
      userId: 'u1',
      createdBy: 'u1',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      version: 1,
    },
  ];
  const existingLines: TransactionLine[] = [
    {
      id: 'line-1',
      transactionId: 'tx-existing-1',
      lineType: 'account',
      accountId: 'acc-1',
      amount: -1500,
      createdAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'line-2',
      transactionId: 'tx-existing-1',
      lineType: 'category',
      categoryId: 'cat-grocery',
      amount: 1500,
      createdAt: '2026-09-01T10:00:00.000Z',
    },
  ];

  const dup = checkDuplicateTransaction('2026-09-01', 1500, 'Shwapno', existingTxs, existingLines);
  if (!dup.isDuplicate) throw new Error('Expected duplicate detection to flag matching row');
  const notDup = checkDuplicateTransaction('2026-09-02', 1500, 'Different day', existingTxs, existingLines);
  if (notDup.isDuplicate) throw new Error('Did not expect duplicate for different date');
  console.log('✓ Duplicate detection passed');

  // Test 7: Full Statement Rows Processing
  console.log('Test 7: Full statement rows processing...');
  const rows = parseStatementRows(parsed, mapping, categories, existingTxs, existingLines);
  if (rows.length !== 3) throw new Error(`Expected 3 parsed rows, got ${rows.length}`);
  if (rows[0].isDuplicate !== true) throw new Error('Row 1 should be flagged duplicate');
  if (rows[0].selected !== false) throw new Error('Duplicate row should be unselected by default');
  if (rows[1].type !== 'income' || rows[1].rawAmount !== 65000) throw new Error('Row 2 income parsed incorrectly');
  if (rows[1].selected !== true) throw new Error('Valid row 2 should be selected');
  if (rows[2].isoDate !== '2026-09-12') throw new Error('Row 3 date parsing failed');
  console.log('✓ Full statement processing passed');

  console.log('🎉 ALL FEAT-3 CSV PARSER TESTS PASSED PERFECTLY!');
}

runTests();
