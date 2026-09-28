/**
 * GitHub Releases Auto-Updater for Money Canvas
 * Queries the public GitHub repository releases API to detect and download new APK releases.
 */

import {
  CURRENT_APP_VERSION,
  GITHUB_LATEST_RELEASE_API,
  GITHUB_RELEASES_URL,
  compareSemver,
} from './app-version';
import { Capacitor } from '@capacitor/core';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  publishedAt: string;
  apkDownloadUrl: string | null;
  releasePageUrl: string;
  apkSizeFormatted?: string;
  apkFileName?: string;
}

const CACHE_KEY = 'mc_latest_update_cache';
const DISMISSED_KEY_PREFIX = 'mc_update_dismissed_';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if the user dismissed this specific version within the last 24 hours.
 */
export function isUpdateDismissed(version: string): boolean {
  try {
    const raw = localStorage.getItem(`${DISMISSED_KEY_PREFIX}${version}`);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    if (isNaN(timestamp)) return false;
    return Date.now() - timestamp < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

/**
 * Mark a version as dismissed for 24 hours.
 */
export function dismissUpdate(version: string): void {
  try {
    localStorage.setItem(
      `${DISMISSED_KEY_PREFIX}${version}`,
      Date.now().toString()
    );
  } catch (e) {
    console.error('Failed to dismiss update:', e);
  }
}

/**
 * Clear dismissed state (e.g. when manually checking for updates).
 */
export function clearDismissedUpdate(version: string): void {
  try {
    localStorage.removeItem(`${DISMISSED_KEY_PREFIX}${version}`);
  } catch (e) {
    console.error('Failed to clear dismissed update:', e);
  }
}

/**
 * Format bytes to MB/KB string
 */
function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

/**
 * Fetch latest release from GitHub
 */
export async function checkForAppUpdate(force = false): Promise<AppUpdateInfo> {
  const defaultNoUpdate: AppUpdateInfo = {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    releaseTitle: '',
    releaseNotes: '',
    publishedAt: '',
    apkDownloadUrl: null,
    releasePageUrl: GITHUB_RELEASES_URL,
  };

  // Check cache first if not forced
  if (!force) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          // Re-evaluate hasUpdate in case CURRENT_APP_VERSION changed
          const hasUpdate = compareSemver(data.latestVersion, CURRENT_APP_VERSION) > 0;
          return { ...data, hasUpdate, currentVersion: CURRENT_APP_VERSION };
        }
      }
    } catch {
      // cache read failed, proceed to fetch
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(GITHUB_LATEST_RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // 404 means no releases published yet
    if (res.status === 404) {
      return defaultNoUpdate;
    }

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const data = await res.json();
    const tag = (data.tag_name || '').replace(/^[vV]/, '').trim();
    const latestVersion = tag || CURRENT_APP_VERSION;
    const hasUpdate = compareSemver(latestVersion, CURRENT_APP_VERSION) > 0;

    // Search for .apk asset in release
    let apkDownloadUrl: string | null = null;
    let apkSizeFormatted: string | undefined = undefined;
    let apkFileName: string | undefined = undefined;

    if (Array.isArray(data.assets) && data.assets.length > 0) {
      const apkAsset = data.assets.find((asset: any) =>
        asset.name?.toLowerCase().endsWith('.apk')
      );
      if (apkAsset) {
        apkDownloadUrl = apkAsset.browser_download_url;
        apkFileName = apkAsset.name;
        if (apkAsset.size) {
          apkSizeFormatted = formatFileSize(apkAsset.size);
        }
      }
    }

    // Fallback: If no .apk asset found, use the release HTML page
    if (!apkDownloadUrl) {
      apkDownloadUrl = data.html_url || GITHUB_RELEASES_URL;
    }

    const updateInfo: AppUpdateInfo = {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion,
      releaseTitle: data.name || `Version ${latestVersion}`,
      releaseNotes: data.body || 'নতুন ফিচার এবং বাগ ফিক্স যুক্ত করা হয়েছে।',
      publishedAt: data.published_at || new Date().toISOString(),
      apkDownloadUrl,
      releasePageUrl: data.html_url || GITHUB_RELEASES_URL,
      apkSizeFormatted,
      apkFileName,
    };

    // Save to cache
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: updateInfo,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore storage error
    }

    return updateInfo;
  } catch (error) {
    console.warn('Failed to check for app update:', error);
    return defaultNoUpdate;
  }
}

/**
 * Open APK download link or release URL in system browser / web downloader
 */
export function openUpdateUrl(url: string): void {
  if (!url || typeof window === 'undefined') return;

  if (Capacitor.isNativePlatform()) {
    // In native Android, launch the system browser to trigger APK download
    window.open(url, '_system');
  } else {
    // In web browsers, create an anchor element to download cleanly
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (url.toLowerCase().endsWith('.apk')) {
      link.setAttribute('download', '');
    }
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 150);
  }
}
