/**
 * Cloud Sync Service for Money Canvas
 * Provides seamless multi-device synchronization (Mobile App <-> Web Browser)
 * powered by Firebase Firestore with offline-first caching and real-time listeners.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { BackupBundle, EncryptedBackupBundle } from '../types/accounting';
import { isEncryptedBackup } from './encryption-service';

export interface CloudSyncResult {
  success: boolean;
  syncedAt?: string;
  recordCount?: number;
  error?: string;
}

/**
 * Remove undefined values recursively to ensure Firestore document compliance
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

/**
 * Calculates total record count in a BackupBundle
 */
export function calculateBundleRecordCount(bundle: BackupBundle): number {
  if (!bundle?.data) return 0;
  return (
    (bundle.data.accounts?.length || 0) +
    (bundle.data.transactions?.length || 0) +
    (bundle.data.transactionLines?.length || 0) +
    (bundle.data.stocks?.length || 0) +
    (bundle.data.stockTransactions?.length || 0) +
    (bundle.data.fixedDeposits?.length || 0) +
    (bundle.data.dpsAccounts?.length || 0) +
    (bundle.data.debts?.length || 0) +
    (bundle.data.loans?.length || 0) +
    (bundle.data.budgets?.length || 0) +
    (bundle.data.financialGoals?.length || 0) +
    (bundle.data.dividends?.length || 0)
  );
}

/**
 * Fast deterministic FNV-1a 64-bit content hash formatted as hex string.
 * Generates an identical checksum for identical JSON payload structure.
 */
export function computeContentHash(data: any): string {
  if (!data) return 'sha-0000000000000000';
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch >>> 4), 0x01000193);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `sha-${hex1}${hex2}`;
}

/**
 * Saves the user's complete financial ledger bundle to Firestore Cloud
 */
export async function saveLedgerToFirestore(
  userId: string,
  bundle: BackupBundle
): Promise<CloudSyncResult> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required for cloud sync' };
    }

    const nowISO = new Date().toISOString();
    const sanitizedBundle = sanitizeForFirestore(bundle);
    const totalRecords = calculateBundleRecordCount(bundle);

    // 1. Save complete ledger bundle in user's cloud_ledger subcollection
    const ledgerDocRef = doc(db, 'users', userId, 'cloud_ledger', 'current');
    await setDoc(
      ledgerDocRef,
      {
        ...sanitizedBundle,
        syncedAt: nowISO,
        updatedAtServer: serverTimestamp(),
        totalRecords,
      },
      { merge: true }
    );

    // 2. Update user profile document with sync metadata
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        lastCloudSyncAt: nowISO,
        cloudRecordCount: totalRecords,
        driveBackupStatus: 'synced',
        lastDriveBackupAt: nowISO,
      });
    } catch (profileErr) {
      console.warn('Could not update user profile sync timestamp:', profileErr);
    }

    return {
      success: true,
      syncedAt: nowISO,
      recordCount: totalRecords,
    };
  } catch (err: any) {
    console.error('Failed to save ledger to Firestore cloud:', err);
    return {
      success: false,
      error: err?.message || 'Failed to sync data with cloud database',
    };
  }
}

/**
 * Loads the user's latest ledger bundle from Firestore Cloud
 */
export async function fetchLedgerFromFirestore(
  userId: string
): Promise<{ success: boolean; bundle?: BackupBundle; syncedAt?: string; error?: string }> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const ledgerDocRef = doc(db, 'users', userId, 'cloud_ledger', 'current');
    const docSnap = await getDoc(ledgerDocRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'No cloud ledger found for this user' };
    }

    const data = docSnap.data();
    if (!data || !data.metadata || !data.data) {
      return { success: false, error: 'Cloud ledger data format is invalid' };
    }

    const bundle: BackupBundle = {
      metadata: data.metadata,
      data: data.data,
    };

    return {
      success: true,
      bundle,
      syncedAt: data.syncedAt || data.metadata?.exportedAt,
    };
  } catch (err: any) {
    console.error('Failed to fetch ledger from Firestore cloud:', err);
    return {
      success: false,
      error: err?.message || 'Failed to load data from cloud database',
    };
  }
}

/**
 * Subscribes to real-time cloud updates for instant cross-device sync
 */
export function subscribeToCloudLedger(
  userId: string,
  onRemoteUpdate: (bundle: BackupBundle, syncedAt: string) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  if (!userId) return null;

  try {
    const ledgerDocRef = doc(db, 'users', userId, 'cloud_ledger', 'current');
    return onSnapshot(
      ledgerDocRef,
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (data && data.metadata && data.data) {
          const bundle: BackupBundle = {
            metadata: data.metadata,
            data: data.data,
          };
          onRemoteUpdate(bundle, data.syncedAt || data.metadata?.exportedAt || new Date().toISOString());
        }
      },
      (err) => {
        console.warn('Real-time cloud sync subscription warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (e: any) {
    console.warn('Failed to subscribe to cloud updates:', e);
    return null;
  }
}

/**
 * Saves an AES-GCM encrypted backup snapshot into Firestore Cloud Vault
 */
export async function saveEncryptedBackupToFirestore(
  userId: string,
  encryptedBundle: EncryptedBackupBundle
): Promise<CloudSyncResult> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    const nowISO = new Date().toISOString();
    const vaultDocRef = doc(db, 'users', userId, 'cloud_vault', 'current');
    await setDoc(vaultDocRef, {
      ...encryptedBundle,
      updatedAtServer: serverTimestamp(),
      savedAt: nowISO,
    });
    return {
      success: true,
      syncedAt: nowISO,
      recordCount:
        (encryptedBundle.recordCountsSummary?.accounts || 0) +
        (encryptedBundle.recordCountsSummary?.transactions || 0),
    };
  } catch (err: any) {
    console.error('Failed to save encrypted backup to Firestore vault:', err);
    return {
      success: false,
      error: err?.message || 'Failed to save encrypted backup to Firestore vault',
    };
  }
}

/**
 * Fetches the user's AES-GCM encrypted backup snapshot from Firestore Cloud Vault
 */
export async function fetchEncryptedBackupFromFirestore(
  userId: string
): Promise<{ success: boolean; encryptedBundle?: EncryptedBackupBundle; error?: string }> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    const vaultDocRef = doc(db, 'users', userId, 'cloud_vault', 'current');
    const docSnap = await getDoc(vaultDocRef);
    if (!docSnap.exists()) {
      return {
        success: false,
        error: 'ক্লাউড ভল্টে কোনো এনক্রিপ্টেড ব্যাকআপ পাওয়া যায়নি (No encrypted backup found in cloud vault).',
      };
    }
    const data = docSnap.data();
    if (!data || !isEncryptedBackup(data)) {
      return { success: false, error: 'ক্লাউড ভল্টের ব্যাকআপ ফাইলটি সঠিক এনক্রিপ্টেড ফরম্যাটে নেই।' };
    }
    return {
      success: true,
      encryptedBundle: data as EncryptedBackupBundle,
    };
  } catch (err: any) {
    console.error('Failed to fetch encrypted backup from Firestore vault:', err);
    return {
      success: false,
      error: err?.message || 'Failed to fetch encrypted backup from Firestore vault',
    };
  }
}
