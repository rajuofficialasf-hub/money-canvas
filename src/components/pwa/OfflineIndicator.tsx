import React from 'react';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="Offline Mode Notification"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/90 text-slate-950 px-4 py-2 text-xs font-mono font-semibold shadow-2xl backdrop-blur border border-amber-400 animate-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center justify-center p-1 rounded-full bg-slate-950 text-amber-400">
        <WifiOff className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-2">
        <span>Offline Mode</span>
        <span className="text-[11px] opacity-80 border-l border-slate-900/30 pl-2">
          Local double-entry ledger & cached portfolio active
        </span>
      </div>
    </aside>
  );
};
