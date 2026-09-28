import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBiometrics } from '../../lib/biometric-context';
import {
  Fingerprint,
  ShieldCheck,
  Sparkles,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const EnableBiometricPromptModal: React.FC = () => {
  const {
    promptEnableModal,
    setPromptEnableModal,
    enableBiometric,
    biometryTypeName,
  } = useBiometrics();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!promptEnableModal) return null;

  const handleEnable = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await enableBiometric();
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setPromptEnableModal(false);
        }, 1200);
      } else {
        if (!res.error?.toLowerCase().includes('cancel')) {
          setErrorMsg(res.error || 'Failed to enable biometrics. Please try again.');
        }
      }
    } catch (err: any) {
      if (!err?.message?.toLowerCase().includes('cancel')) {
        setErrorMsg(err?.message || 'Biometric sensor error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setPromptEnableModal(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setPromptEnableModal(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <div className="relative">
            <div className="absolute -inset-2 bg-emerald-500/20 rounded-full blur-md" />
            <div className="relative p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 text-emerald-400 shadow-inner">
              <Fingerprint className="h-10 w-10 text-emerald-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
              <Sparkles className="h-3 w-3" />
              <span>Fast & Secure Access</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Enable {biometryTypeName} Lock?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Protect your personal financial records and unlock Money Canvas instantly using your biometric credential.
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 text-left">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-tight flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Success notification */}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{biometryTypeName} lock enabled successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isLoading || success}
            onClick={handleEnable}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4" />
                <span>Enable {biometryTypeName}</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => setPromptEnableModal(false)}
            className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            Not now, maybe later
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
