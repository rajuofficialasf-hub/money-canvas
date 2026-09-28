import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../lib/auth-context';
import { useBiometrics } from '../../lib/biometric-context';
import { GoogleIcon } from '../icons/GoogleIcon';
import {
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Lock,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle } = useAuth();
  const { isAvailable, isBiometricEnabled, setPromptEnableModal } = useBiometrics();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        setSuccessMessage('Successfully signed in with Google!');
        setTimeout(() => {
          onClose();
          // If biometric is available on device and not yet enabled, offer biometric setup
          if (isAvailable && !isBiometricEnabled) {
            setTimeout(() => {
              setPromptEnableModal(true);
            }, 600);
          }
        }, 800);
      } else {
        setErrorMessage(res.error || 'Google sign-in could not be completed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to complete Google sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md my-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Sign In with Google
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Connect your Google account to enable secure cloud sync and automated Google Drive backups in Money Canvas.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 text-left animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2 animate-in fade-in font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Google Sign In Action */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 shadow-xl shadow-slate-950/50 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-slate-700" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="h-5 w-5 shrink-0" />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-3 text-left">
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-850 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400 leading-tight">
              <span className="font-semibold text-slate-300 block mb-0.5">Private & Secure</span>
              Your financial records stay strictly under your control.
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-850 flex items-start gap-2">
            <HardDrive className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400 leading-tight">
              <span className="font-semibold text-slate-300 block mb-0.5">Drive Backup</span>
              Automated backup directly to your Google Drive.
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 font-mono">
          Privileges and cloud features are securely configured after signing in with your Google account.
        </p>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
