import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  BiometricAuth,
  BiometryType,
  BiometryError,
  BiometryErrorType,
  getBiometryName,
} from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_ENABLED_KEY = 'moneycanvas_biometric_enabled';
const BIOMETRIC_PROMPT_SHOWN_KEY = 'moneycanvas_biometric_prompt_shown';

export interface BiometricContextType {
  isSupported: boolean;
  isAvailable: boolean;
  biometryType: BiometryType;
  biometryTypeName: string;
  isBiometricEnabled: boolean;
  isAppLocked: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  authenticate: (reason?: string) => Promise<{ success: boolean; error?: string }>;
  enableBiometric: () => Promise<{ success: boolean; error?: string }>;
  disableBiometric: () => void;
  lockApp: () => void;
  unlockAppManually: () => void;
  promptEnableModal: boolean;
  setPromptEnableModal: (open: boolean) => void;
  checkAvailability: () => Promise<boolean>;
}

const BiometricContext = createContext<BiometricContextType | null>(null);

export const BiometricProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [biometryType, setBiometryType] = useState<BiometryType>(BiometryType.none);
  const [biometryTypeName, setBiometryTypeName] = useState<string>('বায়োমেট্রিক');
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    // If biometric was already enabled previously, start in locked state
    try {
      return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [promptEnableModal, setPromptEnableModal] = useState<boolean>(false);

  const authInProgressRef = useRef(false);

  // Helper to get friendly Bengali/English label for biometry type
  const getFriendlyBiometryName = (type: BiometryType): string => {
    switch (type) {
      case BiometryType.fingerprintAuthentication:
      case BiometryType.touchId:
        return 'ফিঙ্গারপ্রিন্ট (Fingerprint)';
      case BiometryType.faceAuthentication:
      case BiometryType.faceId:
        return 'ফেস আইডি (Face ID)';
      case BiometryType.irisAuthentication:
        return 'আইরিস স্ক্যান (Iris)';
      default:
        return 'বায়োমেট্রিক (Biometrics)';
    }
  };

  // Check hardware availability and enrollment
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const result = await BiometricAuth.checkBiometry();
      const available = Boolean(result.isAvailable || result.strongBiometryIsAvailable);
      setIsSupported(true);
      setIsAvailable(available);
      setBiometryType(result.biometryType);

      if (result.biometryType) {
        setBiometryTypeName(getFriendlyBiometryName(result.biometryType));
      } else {
        const engName = getBiometryName(result.biometryType);
        setBiometryTypeName(engName || 'বায়োমেট্রিক');
      }

      return available;
    } catch (err) {
      console.warn('BiometricAuth check notice:', err);
      // Fallback for web / simulated platform
      if (!Capacitor.isNativePlatform()) {
        setIsSupported(true);
        setIsAvailable(true);
        setBiometryTypeName('বায়োমেট্রিক (Web / Device PIN)');
        return true;
      }
      setIsSupported(false);
      setIsAvailable(false);
      return false;
    }
  }, []);

  // Initialize and check hardware on mount
  useEffect(() => {
    checkAvailability();

    // Register resume listener
    let listenerHandle: any = null;
    try {
      BiometricAuth.addResumeListener((info) => {
        setIsAvailable(Boolean(info.isAvailable || info.strongBiometryIsAvailable));
        if (info.biometryType) {
          setBiometryType(info.biometryType);
          setBiometryTypeName(getFriendlyBiometryName(info.biometryType));
        }
      }).then((handle) => {
        listenerHandle = handle;
      });
    } catch (err) {
      console.debug('Resume listener not supported on current platform:', err);
    }

    return () => {
      if (listenerHandle?.remove) {
        listenerHandle.remove();
      }
    };
  }, [checkAvailability]);

  // Lock when app goes to background and comes back (security measure)
  useEffect(() => {
    let backgroundTime: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        backgroundTime = Date.now();
      } else {
        // If app was in background for more than 15 seconds and biometrics are enabled, lock
        if (backgroundTime && Date.now() - backgroundTime > 15000) {
          if (localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true') {
            setIsAppLocked(true);
          }
        }
        backgroundTime = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Authenticate user with biometric prompt
  const authenticate = useCallback(
    async (customReason?: string): Promise<{ success: boolean; error?: string }> => {
      if (authInProgressRef.current) {
        return { success: false, error: 'প্রমাণীকরণ প্রক্রিয়া ইতোমধ্যে সক্রিয় আছে।' };
      }

      authInProgressRef.current = true;
      setIsAuthenticating(true);
      setAuthError(null);

      try {
        await BiometricAuth.authenticate({
          reason: customReason || 'মানি ক্যানভাস নিরাপদে আনলক করতে আপনার ফিঙ্গারপ্রিন্ট বা ফেস আইডি স্ক্যান করুন।',
          androidTitle: 'মানি ক্যানভাস বায়োমেট্রিক সিকিউরিটি',
          androidSubtitle: 'আপনার ফিঙ্গারপ্রিন্ট বা ফেস আইডি ব্যবহার করুন',
          cancelTitle: 'বাতিল করুন',
          allowDeviceCredential: true,
        });

        // If it resolved without throwing, authentication succeeded!
        setIsAppLocked(false);
        setAuthError(null);
        return { success: true };
      } catch (err: any) {
        let msg = 'বায়োমেট্রিক যাচাই সম্পন্ন হয়নি।';

        if (err instanceof BiometryError || err?.code) {
          switch (err.code) {
            case BiometryErrorType.userCancel:
            case 'userCancel':
              msg = 'যাচাই প্রক্রিয়া বাতিল করা হয়েছে।';
              break;
            case BiometryErrorType.biometryLockout:
            case 'biometryLockout':
              msg = 'অতিরিক্ত ভুল চেষ্টার কারণে বায়োমেট্রিক সাময়িকভাবে লক হয়েছে। ডিভাইসের পিন বা প্যাটার্ন ব্যবহার করুন।';
              break;
            case BiometryErrorType.authenticationFailed:
            case 'authenticationFailed':
              msg = 'ফিঙ্গারপ্রিন্ট বা ফেস মিলছে না। আবার চেষ্টা করুন।';
              break;
            case BiometryErrorType.biometryNotEnrolled:
            case 'biometryNotEnrolled':
              msg = 'ডিভাইসে কোনো ফিঙ্গারপ্রিন্ট বা ফেস আইডি এনরোল করা নেই।';
              break;
            default:
              msg = err?.message || 'বায়োমেট্রিক প্রমাণীকরণ ব্যর্থ হয়েছে।';
          }
        } else if (err?.message) {
          msg = err.message;
        }

        setAuthError(msg);
        return { success: false, error: msg };
      } finally {
        setIsAuthenticating(false);
        authInProgressRef.current = false;
      }
    },
    []
  );

  // Enable biometric feature (requires a successful scan first)
  const enableBiometric = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const res = await authenticate('বায়োমেট্রিক অ্যাপ লক সক্রিয় করতে আপনার ফিঙ্গারপ্রিন্ট বা ফেস আইডি নিশ্চিত করুন।');
    if (res.success) {
      try {
        localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        localStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, 'true');
      } catch {}
      setIsBiometricEnabled(true);
      setIsAppLocked(false);
      setPromptEnableModal(false);
      return { success: true };
    }
    return res;
  }, [authenticate]);

  // Disable biometric feature
  const disableBiometric = useCallback(() => {
    try {
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    } catch {}
    setIsBiometricEnabled(false);
    setIsAppLocked(false);
  }, []);

  // Lock the app immediately
  const lockApp = useCallback(() => {
    if (isBiometricEnabled) {
      setIsAppLocked(true);
    }
  }, [isBiometricEnabled]);

  const unlockAppManually = useCallback(() => {
    setIsAppLocked(false);
  }, []);

  return (
    <BiometricContext.Provider
      value={{
        isSupported,
        isAvailable,
        biometryType,
        biometryTypeName,
        isBiometricEnabled,
        isAppLocked,
        isAuthenticating,
        authError,
        authenticate,
        enableBiometric,
        disableBiometric,
        lockApp,
        unlockAppManually,
        promptEnableModal,
        setPromptEnableModal,
        checkAvailability,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
};

export const useBiometrics = (): BiometricContextType => {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometrics must be used within a BiometricProvider');
  }
  return context;
};
