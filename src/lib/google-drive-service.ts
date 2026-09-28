import { BackupBundle } from '../types/accounting';

const DRIVE_FILE_NAME = 'wealthfolio_ledger_backup.json';

/**
 * Uploads or updates the BackupBundle file in the user's Google Drive (appDataFolder or root with drive.file scope)
 */
export async function uploadBackupToGoogleDrive(
  accessToken: string,
  bundle: BackupBundle
): Promise<{ success: boolean; fileId?: string; lastBackupAt?: string; error?: string }> {
  try {
    if (!accessToken) {
      return { success: false, error: 'Google OAuth Access Token is missing' };
    }

    // 1. Search if backup file already exists in Drive
    const existingFile = await findBackupInGoogleDrive(accessToken);

    const fileMetadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: 'Wealthfolio Personal Finance & Ledger Auto Backup',
      parents: existingFile ? undefined : ['appDataFolder'], // Save to AppData folder for security
    };

    const fileData = JSON.stringify(bundle, null, 2);

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFile?.fileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.fileId}?uploadType=multipart`;
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
      // Fallback: If appDataFolder fails due to scope mismatch, try saving to Drive root
      if (!existingFile && res.status === 403) {
        return uploadToDriveRoot(accessToken, bundle);
      }
      const errText = await res.text();
      return { success: false, error: `Drive API Error (${res.status}): ${errText}` };
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
 * Fallback to Drive Root if AppData folder is inaccessible
 */
async function uploadToDriveRoot(accessToken: string, bundle: BackupBundle) {
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}' and trashed=false`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const searchData = await searchRes.json();
    const existingFileId = searchData.files && searchData.files[0]?.id;

    const fileMetadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
    };
    const fileData = JSON.stringify(bundle, null, 2);

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileData], { type: 'application/json' }));

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (!res.ok) {
      return { success: false, error: 'Failed to upload to Drive Root' };
    }

    const data = await res.json();
    return { success: true, fileId: data.id, lastBackupAt: new Date().toISOString() };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Drive root fallback failed' };
  }
}

/**
 * Searches for existing Wealthfolio backup file in Google Drive AppData / Root
 */
export async function findBackupInGoogleDrive(
  accessToken: string
): Promise<{ fileId: string; modifiedTime: string } | null> {
  try {
    // Check appDataFolder first
    const appDataUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${DRIVE_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime)`;
    const res = await fetch(appDataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return { fileId: data.files[0].id, modifiedTime: data.files[0].modifiedTime };
      }
    }

    // Check Drive Root fallback
    const rootUrl = `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime)`;
    const rootRes = await fetch(rootUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (rootRes.ok) {
      const rootData = await rootRes.json();
      if (rootData.files && rootData.files.length > 0) {
        return { fileId: rootData.files[0].id, modifiedTime: rootData.files[0].modifiedTime };
      }
    }

    return null;
  } catch (err) {
    console.error('Error finding Google Drive backup:', err);
    return null;
  }
}

/**
 * Downloads and parses the BackupBundle from Google Drive
 */
export async function downloadBackupFromGoogleDrive(
  accessToken: string,
  fileId: string
): Promise<{ bundle: BackupBundle | null; error?: string }> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      return { bundle: null, error: `Failed to download file from Google Drive (${res.status})` };
    }

    const bundle: BackupBundle = await res.json();
    return { bundle };
  } catch (err: any) {
    return { bundle: null, error: err?.message || 'Failed to parse Google Drive backup content' };
  }
}
