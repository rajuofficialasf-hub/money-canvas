import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  X,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  Smartphone,
} from 'lucide-react';
import {
  AppUpdateInfo,
  dismissUpdate,
  openUpdateUrl,
} from '../../lib/github-updater';
import { Capacitor } from '@capacitor/core';

interface AppUpdateModalProps {
  updateInfo: AppUpdateInfo;
  isOpen: boolean;
  onClose: () => void;
  isManualCheck?: boolean;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  updateInfo,
  isOpen,
  onClose,
}) => {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  if (!isOpen) return null;

  const handleUpdateClick = () => {
    if (updateInfo.apkDownloadUrl) {
      setDownloadStarted(true);
      openUpdateUrl(updateInfo.apkDownloadUrl);
    }
  };

  const handleDismiss = () => {
    dismissUpdate(updateInfo.latestVersion);
    onClose();
  };

  // Format date
  let publishedDateFormatted = '';
  if (updateInfo.publishedAt) {
    try {
      publishedDateFormatted = new Date(updateInfo.publishedAt).toLocaleDateString(
        'bn-BD',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      );
    } catch {
      publishedDateFormatted = updateInfo.publishedAt;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
        className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-accent/30 shadow-2xl shadow-emerald-950/50 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Glow Ambient Banner */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-raised/80 transition-colors cursor-pointer"
          title="বন্ধ করুন"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative p-6 sm:p-7 space-y-5">
          {/* Header Badge & Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent-strong text-xs font-bold tracking-wide">
              {isNative ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-accent-strong animate-pulse" />
                  <span>নতুন সংস্করণ উপলব্ধ (Update Available)</span>
                </>
              ) : (
                <>
                  <Smartphone className="h-3.5 w-3.5 text-accent-strong" />
                  <span>Money Canvas অ্যান্ড্রয়েড অ্যাপ (Official APK)</span>
                </>
              )}
            </div>

            <h2
              id="update-modal-title"
              className="text-xl sm:text-2xl font-black text-ink tracking-tight flex items-center gap-2"
            >
              <span>Money Canvas {updateInfo.releaseTitle || `v${updateInfo.latestVersion}`}</span>
            </h2>

            {/* Version Diff / Info Pill */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {isNative ? (
                <>
                  <span className="px-2.5 py-1 rounded-lg bg-raised/90 text-ink-muted font-mono border border-slate-700">
                    বর্তমান: <span className="text-ink-soft font-bold">v{updateInfo.currentVersion}</span>
                  </span>
                  <span className="text-ink-faint">➔</span>
                  <span className="px-2.5 py-1 rounded-lg bg-accent/20 text-accent-strong font-mono font-bold border border-accent/40">
                    নতুন: v{updateInfo.latestVersion}
                  </span>
                </>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-accent/20 text-accent-strong font-mono font-bold border border-accent/40">
                  সর্বশেষ রিলিজ: v{updateInfo.latestVersion}
                </span>
              )}
              {updateInfo.apkSizeFormatted && (
                <span className="px-2 py-1 rounded-lg bg-sky-500/15 text-sky-300 font-mono text-[11px] border border-sky-500/30">
                  সাইজ: {updateInfo.apkSizeFormatted}
                </span>
              )}
              {publishedDateFormatted && (
                <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                  <Clock className="h-3 w-3" />
                  <span>{publishedDateFormatted}</span>
                </span>
              )}
            </div>
          </div>

          {/* Release Notes / Changelog */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
              <span className="flex items-center gap-1.5 text-accent-strong">
                <PackageCheck className="h-4 w-4" />
                <span>কী কী নতুন যুক্ত হয়েছে (Changelog):</span>
              </span>
              <a
                href={updateInfo.releasePageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
              >
                <span>GitHub রিলিজ পেজ</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl bg-canvas/70 border border-edge p-3.5 text-xs text-ink-soft leading-relaxed font-sans whitespace-pre-line custom-scrollbar">
              {updateInfo.releaseNotes || '• পারফরম্যান্স বৃদ্ধি ও নিরাপত্তা আপডেট করা হয়েছে।\n• বাগ ফিক্স এবং সাধারণ উন্নয়ন।'}
            </div>
          </div>

          {/* Data Safety Assurance Note */}
          <div className="rounded-xl bg-emerald-950/30 border border-accent/30 p-3 flex items-start gap-2.5 text-xs text-emerald-200">
            <ShieldCheck className="h-4.5 w-4.5 text-accent-strong shrink-0 mt-0.5" />
            <p className="leading-snug">
              {isNative ? (
                <>
                  <strong className="text-accent-strong font-semibold">আপনার ডাটা ১০০% সুরক্ষিত:</strong> অ্যাপটি আপডেট করলে আপনার বিদ্যমান কোনো একাউন্ট, লেনদেন বা সেটিংস মুছে যাবে না। সরাসরি ইনস্টল/আপডেট হবে।
                </>
              ) : (
                <>
                  <strong className="text-accent-strong font-semibold">ফুল ডিভাইস ক্লাউড সিঙ্ক:</strong> অ্যান্ড্রয়েড ফোনে অ্যাপটি ইনস্টল করে একই গুগল একাউন্টে লগইন করুন। আপনার সমস্ত ডাটা ব্রাউজার এবং মোবাইল ফোনে রিয়েল-টাইমে স্বয়ংক্রিয়ভাবে সিঙ্ক থাকবে।
                </>
              )}
            </p>
          </div>

          {/* Download Notification Banner if clicked */}
          {downloadStarted && (
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/40 text-sky-200 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sky-300">ডাউনলোড শুরু হয়েছে!</p>
                <p className="text-[11px] text-sky-200/90 mt-0.5">
                  {isNative
                    ? 'ডাউনলোড সম্পূর্ণ হলে আপনার ফোনের নোটিফিকেশন বার থেকে APK ফাইলে ট্যাপ করে \'Update\' চাপুন।'
                    : 'ডাউনলোড সম্পূর্ণ হলে আপনার ফোনের নোটিফিকেশন বার বা ডাউনলোড ফোল্ডার থেকে APK ফাইলে ট্যাপ করে \'Install\' বা \'Update\' চাপুন।'}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full sm:w-1/3 px-4 py-2.5 rounded-xl bg-raised hover:bg-slate-700/80 border border-slate-700 text-ink-soft text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              {isNative ? 'পরে মনে করান' : 'বন্ধ করুন'}
            </button>

            <button
              type="button"
              onClick={handleUpdateClick}
              className="w-full sm:w-2/3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-accent-ink font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
            >
              <Download className="h-4 w-4 stroke-[2.5]" />
              <span>
                {downloadStarted
                  ? 'পুনরায় ডাউনলোড করুন'
                  : isNative
                  ? 'এখনই আপডেট করুন (Update Now)'
                  : 'APK ডাউনলোড করুন (Download APK)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
