import React, { useEffect, useRef } from 'react';
import { useBiometrics } from '../../lib/biometric-context';
import { useAuth } from '../../lib/auth-context';
import {
  Fingerprint,
  ShieldCheck,
  Lock,
  RefreshCw,
  LogOut,
  AlertCircle,
} from 'lucide-react';

export const BiometricLockScreen: React.FC = () => {
  const {
    isAppLocked,
    isBiometricEnabled,
    isAuthenticating,
    authError,
    authenticate,
    biometryTypeName,
  } = useBiometrics();
  const { user, signOutGoogle } = useAuth();
  const hasAutoPromptedRef = useRef(false);

  // Trigger biometric prompt automatically once when screen locks
  useEffect(() => {
    if (isBiometricEnabled && isAppLocked && !hasAutoPromptedRef.current) {
      hasAutoPromptedRef.current = true;
      const timer = setTimeout(() => {
        authenticate();
      }, 500);
      return () => clearTimeout(timer);
    } else if (!isAppLocked) {
      hasAutoPromptedRef.current = false;
    }
  }, [isBiometricEnabled, isAppLocked, authenticate]);

  if (!isBiometricEnabled || !isAppLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-between p-6 bg-canvas/98 backdrop-blur-xl text-ink select-none">
      {/* Top Security Banner */}
      <div className="w-full max-w-sm flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent-strong text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Money Canvas Security</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted font-mono">
          <Lock className="h-3.5 w-3.5 text-warning" />
          <span>Locked</span>
        </div>
      </div>

      {/* Center Biometric Interactive Visualizer */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm my-auto">
        <div className="relative group cursor-pointer" onClick={() => !isAuthenticating && authenticate()}>
          {/* Animated Glow Rings */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative p-7 rounded-3xl bg-surface border border-edge shadow-2xl flex items-center justify-center transition-transform active:scale-95 hover:border-accent/40">
            {isAuthenticating ? (
              <RefreshCw className="h-16 w-16 text-accent-strong animate-spin" />
            ) : (
              <Fingerprint className="h-16 w-16 text-accent-strong drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center justify-center gap-2">
            <span>Money Canvas is Locked</span>
          </h1>
          <p className="text-xs text-ink-muted max-w-xs leading-relaxed">
            Please authenticate using {biometryTypeName} to access your financial vault.
          </p>
        </div>

        {/* User Card */}
        <div className="w-full p-3 rounded-2xl bg-surface/60 border border-slate-850 flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-sm shadow">
            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ink truncate">{user.fullName || 'User'}</div>
            <div className="text-[11px] text-ink-muted font-mono truncate">{user.email || 'Google User'}</div>
          </div>
        </div>

        {/* Error Notice */}
        {authError && (
          <div className="w-full p-3 rounded-xl bg-negative/10 border border-negative/30 text-negative text-xs flex items-start gap-2.5 text-left">
            <AlertCircle className="h-4 w-4 shrink-0 text-negative mt-0.5" />
            <div className="leading-tight flex-1">{authError}</div>
          </div>
        )}

        {/* Unlock Action Button */}
        <button
          type="button"
          disabled={isAuthenticating}
          onClick={() => authenticate()}
          className="w-full py-3.5 px-6 rounded-2xl bg-accent hover:bg-accent-strong active:bg-accent-deep text-accent-ink font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {isAuthenticating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <Fingerprint className="h-4 w-4" />
              <span>Unlock with {biometryTypeName}</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Switch / Log Out option */}
      <div className="w-full max-w-sm flex items-center justify-center pb-2">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Are you sure you want to sign out from this device?')) {
              signOutGoogle();
            }
          }}
          className="text-xs text-ink-muted hover:text-negative flex items-center gap-1.5 transition-colors py-2 px-3 rounded-lg hover:bg-surface"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>
    </div>
  );
};
