import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBiometrics } from '../../lib/biometric-context';
import {
  Fingerprint,
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
        className="relative w-full max-w-sm rounded-3xl border border-edge bg-canvas p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setPromptEnableModal(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <div className="relative">
            <div className="absolute -inset-2 bg-accent/20 rounded-full blur-md" />
            <div className="relative p-4 rounded-2xl bg-surface border border-accent/40 text-accent-strong shadow-inner">
              <Fingerprint className="h-10 w-10 text-accent-strong" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent-strong text-[10px] font-semibold">
              <Sparkles className="h-3 w-3" />
              <span>Fast & Secure Access</span>
            </div>
            <h3 className="text-lg font-bold text-ink tracking-tight">
              Enable {biometryTypeName} Lock?
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed max-w-xs mx-auto">
              Protect your personal financial records and unlock Money Canvas instantly using your biometric credential.
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-negative/10 border border-negative/30 text-negative text-xs flex items-start gap-2 text-left">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-negative" />
            <span className="leading-tight flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Success notification */}
        {success && (
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 text-accent-strong text-xs flex items-center justify-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-accent-strong shrink-0" />
            <span>{biometryTypeName} lock enabled successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isLoading || success}
            onClick={handleEnable}
            className="w-full py-3 px-4 rounded-2xl bg-accent hover:bg-accent-strong active:bg-accent-deep text-accent-ink font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
            className="w-full py-2.5 px-4 rounded-xl text-ink-muted hover:text-ink-soft text-xs transition-colors"
          >
            Not now, maybe later
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
