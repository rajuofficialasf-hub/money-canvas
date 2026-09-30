import { BackupBundle, EncryptedBackupBundle } from '../types/accounting';
import { isEncryptedBackup } from './encryption-service';

export const PRIMARY_DRIVE_FILE_NAME = 'money_canvas_ledger_backup.json';
export const LEGACY_DRIVE_FILE_NAME = 'wealthfolio_ledger_backup.json';

export interface GoogleDriveFindResult {
  found: boolean;
  fileId?: string;
  fileName?: string;
  modifiedTime?: string;
  isAuthError?: boolean;
  error?: string;
}

/**
 * Uploads or updates the BackupBundle file in the user's Google Drive.
 * Files are saved in the user's Google Drive so both Mobile App (Capacitor)
 * and Web Browser can access and share the same backup file.
 */
export async function uploadBackupToGoogleDrive(
  accessToken: string,
  bundle: BackupBundle | EncryptedBackupBundle
): Promise<{ success: boolean; fileId?: string; lastBackupAt?: string; error?: string; isAuthError?: boolean }> {
  try {
    if (!accessToken) {
      return { success: false, isAuthError: true, error: 'Google OAuth Access Token is missing. Please sign in with Google.' };
    }

    // 1. Search if backup file already exists in Drive (checking both current and legacy names)
    const existingSearch = await findBackupInGoogleDrive(accessToken);

    if (existingSearch.isAuthError) {
      return { success: false, isAuthError: true, error: existingSearch.error || 'Google session expired. Please sign in again.' };
    }

    const encrypted = isEncryptedBackup(bundle);
    const fileMetadata = {
      name: PRIMARY_DRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: encrypted
        ? 'Money Canvas Financial Ledger Backup (AES-GCM-256 Encrypted)'
        : 'Money Canvas Financial Ledger Backup (Cross-Device Sync)',
    };

    const fileData = JSON.stringify(bundle, null, 2);

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingSearch.found && existingSearch.fileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingSearch.fileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' })
    );
    form.append('file', new Blob([fileData], { type: 'application/json' }));

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Drive upload failed:', res.status, errText);

      if (res.status === 401) {
        return {
          success: false,
          isAuthError: true,
          error: 'Google login session expired. Please sign out and sign in with Google again.',
        };
      }

      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          msg = parsed.error.message;
        }
      } catch {}

      return {
        success: false,
        error: `Drive API Error (${res.status}): ${msg}. Google Cloud Console-এ Google Drive API Enable করা থাকতে হবে।`,
      };
    }

    const responseData = await res.json();
    const nowISO = new Date().toISOString();

    return {
      success: true,
      fileId: responseData.id,
      lastBackupAt: nowISO,
    };
  } catch (err: any) {
    console.error('Failed to upload backup to Google Drive:', err);
    return { success: false, error: err?.message || 'Failed to upload backup to Google Drive' };
  }
}

/**
 * Searches for existing Money Canvas backup file in Google Drive.
 * Searches across Google Drive root, folders, and legacy AppData folder
 * for both new ('money_canvas_ledger_backup.json') and legacy ('wealthfolio_ledger_backup.json') files.
 */
export async function findBackupInGoogleDrive(
  accessToken: string
): Promise<GoogleDriveFindResult> {
  try {
    if (!accessToken) {
      return { found: false, isAuthError: true, error: 'Google OAuth token is missing' };
    }

    const searchQueries = [
      // 1. Primary file in user's Drive root/folders
      `https://www.googleapis.com/drive/v3/files?q=name='${PRIMARY_DRIVE_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime)&orderBy=modifiedTime desc`,
      // 2. Legacy file in user's Drive root/folders
      `https://www.googleapis.com/drive/v3/files?q=name='${LEGACY_DRIVE_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime)&orderBy=modifiedTime desc`,
      // 3. Primary file in AppData folder (backward compatibility)
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${PRIMARY_DRIVE_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime)&orderBy=modifiedTime desc`,
      // 4. Legacy file in AppData folder (backward compatibility)
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${LEGACY_DRIVE_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime)&orderBy=modifiedTime desc`,
    ];

    let lastError: string | undefined;
    let authError = false;

    for (const url of searchQueries) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.status === 401) {
          authError = true;
          lastError = 'গুগল সাইন-ইন সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার Sign In with Google করুন।';
          break;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            return {
              found: true,
              fileId: data.files[0].id,
              fileName: data.files[0].name,
              modifiedTime: data.files[0].modifiedTime,
            };
          }
        } else {
          const errText = await res.text();
          console.warn('Drive search error at', url, res.status, errText);
          if (res.status === 403) {
            lastError = 'গুগল ড্রাইভ পারমিশন প্রয়োজন। অনুগ্রহ করে ড্রাইভ পারমিশন Allow দিন।';
          }
        }
      } catch (reqErr: any) {
        console.warn('Drive search request exception:', reqErr);
      }
    }

    if (authError) {
      return { found: false, isAuthError: true, error: lastError };
    }

    return {
      found: false,
      error: lastError,
    };
  } catch (err: any) {
    console.error('Error finding Google Drive backup:', err);
    return { found: false, error: err?.message || 'Error communicating with Google Drive' };
  }
}

/**
 * Downloads and parses the BackupBundle from Google Drive.
 * Automatically detects whether the file is encrypted with AES-GCM.
 */
export async function downloadBackupFromGoogleDrive(
  accessToken: string,
  fileId: string
): Promise<{
  bundle: BackupBundle | null;
  encryptedBundle?: EncryptedBackupBundle | null;
  isEncrypted?: boolean;
  error?: string;
}> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      return { bundle: null, error: `Failed to download file from Google Drive (${res.status})` };
    }

    const json = await res.json();
    if (isEncryptedBackup(json)) {
      return { bundle: null, encryptedBundle: json, isEncrypted: true };
    }
    return { bundle: json as BackupBundle, isEncrypted: false };
  } catch (err: any) {
    return { bundle: null, error: err?.message || 'Failed to parse Google Drive backup content' };
  }
}
