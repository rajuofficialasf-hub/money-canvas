import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  checkForAppUpdate,
  isUpdateDismissed,
  AppUpdateInfo,
  openUpdateUrl,
} from './github-updater';
import { CURRENT_APP_VERSION, CURRENT_APP_VERSION_NAME, GITHUB_RELEASES_URL } from './app-version';
import { AppUpdateModal } from '../components/common/AppUpdateModal';
import { CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface ToastState {
  message: string;
  type: 'success' | 'info' | 'error';
}

interface UpdateContextType {
  checkForUpdate: (force?: boolean) => Promise<void>;
  downloadApp: () => Promise<void>;
  isChecking: boolean;
  appUpdateInfo: AppUpdateInfo | null;
  isUpdateModalOpen: boolean;
  openUpdateModal: () => void;
  closeUpdateModal: () => void;
  currentVersion: string;
  currentVersionName: string;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const checkForUpdate = async (force = false) => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      // Also trigger Service Worker update if in browser / PWA
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const reg of regs) reg.update().catch(() => {});
        }).catch(() => {});
      }

      const info = await checkForAppUpdate(force);
      setAppUpdateInfo(info);

      if (info.hasUpdate) {
        setIsUpdateModalOpen(true);
        if (force) {
          showToast(
            `নতুন আপডেট পাওয়া গেছে (${info.releaseTitle || 'v' + info.latestVersion})!`,
            'success'
          );
        }
      } else {
        if (force) {
          showToast(
            `🎉 আপনি অ্যাপটির সর্বশেষ সংস্করণ (${CURRENT_APP_VERSION_NAME}) ব্যবহার করছেন!`,
            'info'
          );
        }
      }
    } catch (err) {
      console.warn('Update check failed:', err);
      if (force) {
        showToast(
          'আপডেট চেক করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ চেক করুন।',
          'error'
        );
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Download Android APK app (especially for web users)
  const downloadApp = async () => {
    try {
      setIsChecking(true);
      let info = appUpdateInfo;
      if (!info || !info.apkDownloadUrl) {
        info = await checkForAppUpdate(true);
        setAppUpdateInfo(info);
      }
      setIsUpdateModalOpen(true);
      if (info.apkDownloadUrl) {
        openUpdateUrl(info.apkDownloadUrl);
        showToast('অ্যান্ড্রয়েড অ্যাপ APK ডাউনলোড শুরু হয়েছে!', 'success');
      } else {
        openUpdateUrl(info.releasePageUrl || GITHUB_RELEASES_URL);
        showToast('রিলিজ পেজ খোলা হয়েছে। সেখান থেকে APK ডাউনলোড করুন।', 'info');
      }
    } catch (err) {
      console.warn('Download app failed:', err);
      showToast('অ্যাপ ডাউনলোড লিংক পেতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  // Silent check 3.5 seconds after app launch (ONLY for Native Android APK!)
  useEffect(() => {
    // In web browsers, updates are handled automatically by the Service Worker / PWA.
    // Never auto-popup native Android APK installer modals on web browsers!
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const info = await checkForAppUpdate(false);
        if (info.hasUpdate && !isUpdateDismissed(info.latestVersion)) {
          setAppUpdateInfo(info);
          setIsUpdateModalOpen(true);
        }
      } catch (err) {
        // silent fail on auto-check
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <UpdateContext.Provider
      value={{
        checkForUpdate,
        downloadApp,
        isChecking,
        appUpdateInfo,
        isUpdateModalOpen,
        openUpdateModal: () => setIsUpdateModalOpen(true),
        closeUpdateModal: () => setIsUpdateModalOpen(false),
        currentVersion: CURRENT_APP_VERSION,
        currentVersionName: CURRENT_APP_VERSION_NAME,
      }}
    >
      {children}

      {/* Global In-App Update Modal */}
      {appUpdateInfo && (
        <AppUpdateModal
          updateInfo={appUpdateInfo}
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}

      {/* Floating Status Toast Notification */}
      {toast && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[92vw] sm:max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border text-xs sm:text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/90 border-sky-500/40 text-sky-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0 text-sky-400" />
            )}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </UpdateContext.Provider>
  );
};

export const useAppUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useAppUpdate must be used within an UpdateProvider');
  }
  return context;
};
