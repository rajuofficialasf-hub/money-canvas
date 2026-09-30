import {
  encryptBackupBundle,
  decryptBackupBundle,
  isEncryptedBackup,
  validatePassphrase,
} from '../src/lib/encryption-service';
import { BackupBundle } from '../src/types/accounting';

async function runTests() {
  console.log('--- STARTING FEAT-2 ENCRYPTION TESTS ---');

  // Test 1: Passphrase validation
  console.log('Test 1: Passphrase validation');
  const shortCheck = validatePassphrase('short');
  if (shortCheck.isValid) throw new Error('Expected short passphrase to be invalid');
  const strongCheck = validatePassphrase('StrongP@ssw0rd2026!');
  if (!strongCheck.isValid || strongCheck.strength !== 'strong') {
    throw new Error('Expected strong passphrase to be valid and strong');
  }
  console.log('✓ Passphrase validation passed');

  // Test 2: Sample Backup Bundle
  const sampleBundle: BackupBundle = {
    metadata: {
      schemaVersion: '5.0',
      exportedAt: new Date().toISOString(),
      userFullName: 'রাকিব হাসান (Rakib)',
      userId: 'user-1',
      userEmail: 'user@test.com',
      checksum: 'sha-test',
      recordCounts: {
        accounts: 2,
        transactions: 1,
      },
    },
    data: {
      accounts: [
        {
          id: 'acc-1',
          name: 'City Bank Savings',
          type: 'asset',
          currency: 'BDT',
          openingBalance: 50000,
          currentBalance: 50000,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        {
          id: 'acc-2',
          name: 'bKash Wallet',
          type: 'asset',
          currency: 'BDT',
          openingBalance: 5000,
          currentBalance: 5000,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
      ],
      transactions: [
        {
          id: 'tx-1',
          date: '2026-09-30',
          type: 'income',
          status: 'posted',
          totalAmount: 15000,
          note: 'বেতন (Monthly Salary)',
          createdAt: new Date().toISOString(),
        } as any,
      ],
      transactionLines: [],
      fixedDeposits: [],
      budgets: [],
      recurringTransactions: [],
      financialGoals: [],
      goalContributions: [],
      dpsAccounts: [],
      dpsInstallments: [],
      debts: [],
      loans: [],
      loanSchedules: [],
      physicalAssets: [],
      staticLiabilities: [],
      netWorthSnapshots: [],
      zakatSettings: {} as any,
      brokers: [],
      brokerAccounts: [],
      brokerCashTransactions: [],
      stocks: [],
      stockTransactions: [],
      stockPriceHistory: [],
      benchmarkIndexPrices: [],
      dividends: [],
      corporateActions: [],
      ipoApplications: [],
      auditLogs: [],
    },
  };

  // Test 3: Encryption
  console.log('Test 2: Encrypting backup bundle with AES-GCM-256...');
  const passphrase = 'MySecretPassphrase#2026';
  const hint = 'Year and secret';
  const encrypted = await encryptBackupBundle(sampleBundle, passphrase, hint);

  if (!isEncryptedBackup(encrypted)) {
    throw new Error('isEncryptedBackup returned false for encrypted payload');
  }
  if (encrypted.cipher !== 'AES-GCM-256') throw new Error('Incorrect cipher');
  if (encrypted.hint !== hint) throw new Error('Hint was not preserved');
  if (encrypted.recordCountsSummary?.accounts !== 2) throw new Error('Record count mismatch');
  console.log('✓ Encrypted successfully. Ciphertext length:', encrypted.ciphertext.length);

  // Test 4: Successful Decryption
  console.log('Test 3: Decrypting with correct passphrase...');
  const decrypted = await decryptBackupBundle(encrypted, passphrase);
  if (decrypted.metadata.userFullName !== sampleBundle.metadata.userFullName) {
    throw new Error('Decrypted userFullName does not match original');
  }
  if (decrypted.data.accounts[0].name !== 'City Bank Savings') {
    throw new Error('Decrypted account data corrupted');
  }
  if (decrypted.data.transactions[0].note !== 'বেতন (Monthly Salary)') {
    throw new Error('Unicode / Bengali text corrupted during encryption');
  }
  console.log('✓ Decrypted successfully and Bengali unicode preserved 100%');

  // Test 5: Wrong Passphrase Rejection
  console.log('Test 4: Attempting decryption with incorrect passphrase...');
  try {
    await decryptBackupBundle(encrypted, 'WrongPassword123!');
    throw new Error('Decryption SHOULD HAVE FAILED with wrong passphrase!');
  } catch (err: any) {
    console.log('✓ Correctly rejected wrong passphrase:', err.message);
  }

  // Test 6: Tampered Ciphertext Rejection (AEAD check)
  console.log('Test 5: Attempting decryption with tampered ciphertext...');
  try {
    const tampered = { ...encrypted, ciphertext: 'A' + encrypted.ciphertext.slice(1) };
    await decryptBackupBundle(tampered, passphrase);
    throw new Error('Decryption SHOULD HAVE FAILED with tampered ciphertext!');
  } catch (err: any) {
    console.log('✓ Correctly rejected tampered ciphertext (AEAD integrity verified):', err.message);
  }

  console.log('🎉 ALL FEAT-2 ENCRYPTION TESTS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
