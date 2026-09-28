import React, { useEffect } from 'react';
import { useBiometrics } from '../../lib/biometric-context';
import { useAuth } from '../../lib/auth-context';
import {
  Fingerprint,
  ShieldCheck,
  Lock,
  RefreshCw,
  LogOut,
  AlertCircle,
  Sparkles,
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

  // Trigger biometric prompt automatically once on mount
  useEffect(() => {
    if (isBiometricEnabled && isAppLocked && !isAuthenticating) {
      const timer = setTimeout(() => {
        authenticate();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isBiometricEnabled, isAppLocked]);

  if (!isBiometricEnabled || !isAppLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-between p-6 bg-slate-950/98 backdrop-blur-xl text-white select-none">
      {/* Top Security Banner */}
      <div className="w-full max-w-sm flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Money Canvas Security</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Lock className="h-3.5 w-3.5 text-amber-400" />
          <span>Locked</span>
        </div>
      </div>

      {/* Center Biometric Interactive Visualizer */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm my-auto">
        <div className="relative group cursor-pointer" onClick={() => !isAuthenticating && authenticate()}>
          {/* Animated Glow Rings */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative p-7 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center transition-transform active:scale-95 hover:border-emerald-500/40">
            {isAuthenticating ? (
              <RefreshCw className="h-16 w-16 text-emerald-400 animate-spin" />
            ) : (
              <Fingerprint className="h-16 w-16 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Money Canvas is Locked</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Please authenticate using {biometryTypeName} to access your financial vault.
          </p>
        </div>

        {/* User Card */}
        <div className="w-full p-3 rounded-2xl bg-slate-900/60 border border-slate-850 flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-sm shadow">
            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user.fullName || 'User'}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{user.email || 'Google User'}</div>
          </div>
        </div>

        {/* Error Notice */}
        {authError && (
          <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 text-left">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="leading-tight flex-1">{authError}</div>
          </div>
        )}

        {/* Unlock Action Button */}
        <button
          type="button"
          disabled={isAuthenticating}
          onClick={() => authenticate()}
          className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
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
          className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors py-2 px-3 rounded-lg hover:bg-slate-900"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>
    </div>
  );
};
