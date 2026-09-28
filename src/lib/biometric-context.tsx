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
  const [biometryTypeName, setBiometryTypeName] = useState<string>('Biometrics');
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

  // Helper to get friendly English label for biometry type
  const getFriendlyBiometryName = (type: BiometryType): string => {
    switch (type) {
      case BiometryType.fingerprintAuthentication:
      case BiometryType.touchId:
        return 'Fingerprint';
      case BiometryType.faceAuthentication:
      case BiometryType.faceId:
        return 'Face ID';
      case BiometryType.irisAuthentication:
        return 'Iris';
      default:
        return 'Biometrics';
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
        setBiometryTypeName(engName || 'Biometrics');
      }

      return available;
    } catch (err) {
      console.warn('BiometricAuth check notice:', err);
      // Fallback for web / simulated platform
      if (!Capacitor.isNativePlatform()) {
        setIsSupported(true);
        setIsAvailable(true);
        setBiometryTypeName('Biometrics (Device PIN / Fingerprint)');
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
        return { success: false, error: 'Authentication is already in progress.' };
      }

      authInProgressRef.current = true;
      setIsAuthenticating(true);
      setAuthError(null);

      try {
        await BiometricAuth.authenticate({
          reason: customReason || 'Scan your fingerprint or biometric credential to unlock Money Canvas.',
          androidTitle: 'Money Canvas Security',
          androidSubtitle: 'Use your fingerprint or face to verify your identity',
          cancelTitle: 'Cancel',
          allowDeviceCredential: true,
        });

        // If it resolved without throwing, authentication succeeded!
        setIsAppLocked(false);
        setAuthError(null);
        return { success: true };
      } catch (err: any) {
        let msg = 'Biometric verification failed.';

        if (err instanceof BiometryError || err?.code) {
          switch (err.code) {
            case BiometryErrorType.userCancel:
            case 'userCancel':
              msg = 'Authentication was cancelled.';
              break;
            case BiometryErrorType.biometryLockout:
            case 'biometryLockout':
              msg = 'Biometrics locked due to too many attempts. Please use your device PIN or pattern.';
              break;
            case BiometryErrorType.authenticationFailed:
            case 'authenticationFailed':
              msg = 'Biometric credential not recognized. Please try again.';
              break;
            case BiometryErrorType.biometryNotEnrolled:
            case 'biometryNotEnrolled':
              msg = 'No fingerprint or biometric credentials are enrolled on this device.';
              break;
            default:
              msg = err?.message || 'Biometric authentication failed.';
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
    const res = await authenticate('Scan your fingerprint or face to enable biometric app lock.');
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
