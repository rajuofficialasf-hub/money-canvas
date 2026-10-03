import React from 'react';
import { AlertTriangle, HardDrive } from 'lucide-react';
import { useSyncStatus } from '../../lib/ledger-context';

/**
 * STEP-16: Fixed, always-visible banners for local persistence failures
 * (storage quota) and double-entry integrity violations. Rendered once at the
 * app shell level so the user sees them regardless of the active view.
 */
export const LedgerHealthBanners: React.FC = () => {
  const { storageWarning, integrityWarning } = useSyncStatus();

  if (!storageWarning && !integrityWarning) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,42rem)] space-y-2 pointer-events-none">
      {storageWarning && (
        <div
          role="alert"
          className="pointer-events-auto flex items-start gap-2 bg-red-950/95 border border-red-500/40 text-red-200 text-xs rounded-xl p-3 shadow-2xl backdrop-blur"
        >
          <HardDrive className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{storageWarning}</p>
        </div>
      )}
      {integrityWarning && (
        <div
          role="alert"
          className="pointer-events-auto flex items-start gap-2 bg-amber-950/95 border border-warning/40 text-amber-200 text-xs rounded-xl p-3 shadow-2xl backdrop-blur"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{integrityWarning}</p>
        </div>
      )}
    </div>
  );
};
