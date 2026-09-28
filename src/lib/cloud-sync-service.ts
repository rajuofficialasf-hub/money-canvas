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
import { BackupBundle } from '../types/accounting';

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
