import { useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  updateApp: () => Promise<void>;
  checkForUpdates: () => Promise<boolean>;
  dismissUpdate: () => void;
}

export function useAppUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(new Date());
  const [updateFunction, setUpdateFunction] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        // Periodic check every 15 minutes
        const interval = setInterval(async () => {
          if (!(!navigator.onLine)) {
            try {
              await registration.update();
              setLastChecked(new Date());
            } catch (err) {
              console.warn('[PWA] Periodic update check failed:', err);
            }
          }
        }, 15 * 60 * 1000);

        // Check on window visibility change (user re-opens the app or switches tab)
        const handleVisibilityChange = async () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            try {
              await registration.update();
              setLastChecked(new Date());
            } catch (err) {
              console.warn('[PWA] Visibility update check failed:', err);
            }
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          clearInterval(interval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      },
      onRegisterError(error) {
        console.error('[PWA] ServiceWorker registration error:', error);
      },
    });

    setUpdateFunction(() => updateSW);
  }, []);

  const updateApp = useCallback(async () => {
    if (updateFunction) {
      await updateFunction(true);
    } else {
      window.location.reload();
    }
  }, [updateFunction]);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setLastChecked(new Date());
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          // If a new worker is waiting
          if (registration.waiting) {
            setNeedRefresh(true);
            setIsChecking(false);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('[PWA] Manual update check error:', e);
    }
    
    // Simulate slight verification delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsChecking(false);
    return needRefresh;
  }, [needRefresh]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  return {
    needRefresh,
    offlineReady,
    isChecking,
    lastChecked,
    updateApp,
    checkForUpdates,
    dismissUpdate,
  };
}
