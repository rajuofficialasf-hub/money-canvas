import React, { useState } from 'react';
import { usePWAInstall } from '../../lib/usePWAInstall';
import { Download, Share2, X, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed standalone PWA, hide button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'sidebar') {
      return (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-semibold">Install FinOS App</span>
          </div>
          <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
            PWA
          </span>
        </button>
      );
    }

    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs transition-all shadow-sm hover:shadow-emerald-500/20 disabled:opacity-50"
        title="Install Progressive Web App for offline access"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'sidebar' ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-sky-400" />
              <span>Install on iOS</span>
            </div>
            <span className="text-[10px] text-sky-400">Safari</span>
          </button>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-mono text-xs transition-colors"
            title="Install FinOS on iPhone / iPad"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Install on iOS</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Smartphone className="h-4 w-4 text-sky-400" />
                  <span>Install FinOS on iOS</span>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Add FinOS Master to your iOS Home Screen for instant launch and offline double-entry capability:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <div className="text-slate-300">
                    Tap the <strong className="text-white">Share</strong> button in Safari's bottom toolbar (<Share2 className="inline h-3.5 w-3.5 text-sky-400" />).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <div className="text-slate-300">
                    Scroll down and select <strong className="text-white">"Add to Home Screen"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <div className="text-slate-300">
                    Tap <strong className="text-white">Add</strong> in top-right corner to finish.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
