import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Mail,
  Clock,
  Database,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface DataDeletionRequestViewProps {
  onBack?: () => void;
}

export const DataDeletionRequestView: React.FC<DataDeletionRequestViewProps> = ({ onBack }) => {
  const { submitWebDeletionRequest } = useAuth();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please provide a valid registered email address.');
      return;
    }

    if (!agreeChecked) {
      setErrorMessage('Please confirm that you understand this action is permanent.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitWebDeletionRequest(email, reason);
      if (res.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(res.error || 'Failed to submit request. Please contact support directly.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while submitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink py-12 px-4 sm:px-6 lg:px-8 selection:bg-negative/20 selection:text-negative">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack || (() => window.history.back())}
            className="flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors bg-surface/80 hover:bg-raised border border-edge px-3.5 py-2 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Money Canvas</span>
          </button>

          <span className="text-[11px] font-mono uppercase tracking-wider text-negative bg-rose-950/40 border border-rose-800/40 px-3 py-1 rounded-full flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Play Store Compliance</span>
          </span>
        </div>

        {/* Header Banner */}
        <div className="rounded-2xl border border-rose-900/40 bg-gradient-to-br from-rose-950/30 via-surface/90 to-canvas p-6 sm:p-8 space-y-4 shadow-xl shadow-rose-950/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-negative/10 border border-negative/20 text-negative">
              <Trash2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                Account & Data Deletion
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted font-medium">
                অ্যাকাউন্ট ও ব্যক্তিগত ডেটা স্থায়ী অপসারণ নীতি এবং ওয়েব রিকোয়েস্ট পোর্টাল
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed pt-2">
            In compliance with <strong>Google Play Store User Data and Account Deletion Policy</strong>, 
            Money Canvas provides complete transparency and controls to delete your user account, 
            cloud-synced financial ledgers, and all associated personal records permanently.
          </p>
        </div>

        {/* What gets deleted breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-negative text-xs font-bold uppercase tracking-wider">
              <Database className="h-4 w-4" />
              <span>What Gets Deleted / যা যা মুছে যায়</span>
            </div>
            <ul className="text-xs text-ink-soft space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Firebase authentication profile & email linkage</li>
              <li>Cloud-synced double-entry financial ledger</li>
              <li>Zero-knowledge encrypted cloud vaults (AES-256)</li>
              <li>All asset, loan, stock, and bank accounts</li>
              <li>Locally cached app data, settings & biometrics</li>
            </ul>
          </div>

          <div className="rounded-xl border border-edge bg-surface/50 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-accent-strong text-xs font-bold uppercase tracking-wider">
              <Clock className="h-4 w-4" />
              <span>Data Retention Policy / ডেটা সংরক্ষণ নীতি</span>
            </div>
            <ul className="text-xs text-ink-soft space-y-1.5 list-disc pl-4 leading-relaxed">
              <li><strong>Zero Data Retained:</strong> No financial data is kept after deletion.</li>
              <li><strong>Instant in-app:</strong> In-app deletion purges data immediately.</li>
              <li><strong>Web Requests:</strong> Processed within 24 to 48 hours of verification.</li>
              <li><strong>No third-party sales:</strong> Money Canvas never sells your financial data.</li>
            </ul>
          </div>
        </div>

        {/* Step-by-step instructions for in-app deletion */}
        <div className="rounded-xl border border-edge bg-surface/40 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Smartphone className="h-4 w-4" />
            <span>How to Delete from Within the App / অ্যাপের ভেতর থেকে তাৎক্ষণিক ডিলিট পদ্ধতি</span>
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">
            If you have the Money Canvas app installed, you can delete your account instantly without waiting:
          </p>
          <ol className="text-xs text-ink-soft space-y-1 list-decimal pl-5 leading-relaxed">
            <li>Open the <strong>Money Canvas</strong> app on your device.</li>
            <li>Go to <strong>Settings (সেটিংস)</strong> from the sidebar menu.</li>
            <li>Scroll down to the <strong>Danger Zone (বিপজ্জনক এলাকা)</strong>.</li>
            <li>Click <strong>&quot;Delete Account & All Data&quot;</strong> and re-authenticate to confirm.</li>
            <li>Your account and data are permanently purged in real-time.</li>
          </ol>
        </div>

        {/* Web Deletion Request Form (for uninstalled app or lost device) */}
        <div className="rounded-2xl border border-edge bg-surface/80 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <Mail className="h-5 w-5 text-negative" />
              <span>Web Deletion Request Form (অ্যাপ আনইনস্টল করে থাকলে)</span>
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              If you have already uninstalled the application or cannot access your account from the device, 
              submit your request below to have our systems delete all your records.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-xl border border-accent/40 bg-emerald-950/30 p-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-strong">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-ink">
                Deletion Request Received / অনুরোধ গৃহীত হয়েছে
              </h3>
              <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                Your account deletion request for <strong className="text-ink font-mono">{email}</strong> has been logged. 
                Associated cloud records will be permanently expunged within 24–48 hours.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                    setReason('');
                    setAgreeChecked(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-raised hover:bg-raised-2 text-xs font-semibold text-ink-soft"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl border border-negative/40 bg-rose-950/40 text-negative text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-negative" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft">
                  Registered Email Address <span className="text-negative">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@example.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-edge text-ink text-xs placeholder:text-ink-faint focus:outline-none focus:border-negative"
                />
                <p className="text-[11px] text-ink-faint">
                  The email associated with your Google Sign-in or Money Canvas profile.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft">
                  Reason for Deletion (Optional / ঐচ্ছিক)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Optional feedback or reason for closing your account..."
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-edge text-ink text-xs placeholder:text-ink-faint focus:outline-none focus:border-negative resize-none"
                />
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agree-delete"
                  checked={agreeChecked}
                  onChange={(e) => setAgreeChecked(e.target.checked)}
                  className="mt-0.5 rounded bg-canvas border-edge-strong text-negative focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="agree-delete" className="text-xs text-ink-soft leading-snug cursor-pointer">
                  I understand that this action is irreversible and permanently erases all my transactions, 
                  cloud backups, and accounts. (আমি নিশ্চিত করছি যে এই অপসারণ স্থায়ী এবং অপরিবর্তনীয়।)
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !agreeChecked}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-negative disabled:bg-rose-950 disabled:text-ink-faint disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  {isSubmitting ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Submit Account & Data Deletion Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Developer Contact Footer */}
        <div className="rounded-xl border border-edge/80 bg-surface/30 p-5 text-center space-y-2">
          <p className="text-xs text-ink-muted">
            For further privacy inquiries or manual assistance, reach the developer directly:
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-medium text-ink-soft">
            <a
              href="mailto:raju.official.asf@gmail.com?subject=Money%20Canvas%20Data%20Deletion%20Request"
              className="text-sky-400 hover:underline flex items-center gap-1"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>raju.official.asf@gmail.com</span>
            </a>
          </div>
          <p className="text-[11px] text-ink-faint pt-1">
            Money Canvas — Personal Finance & Wealth OS © 2026. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
