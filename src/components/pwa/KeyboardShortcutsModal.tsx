import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ K / Ctrl+K', desc: 'Open Omni-Command Palette (Instant View & Action Navigation)' },
    { key: '⌘ N / Ctrl+N', desc: 'Add New Income, Expense or Transfer Transaction' },
    { key: '⌘ T / Ctrl+T', desc: 'Navigate to DSE Stock Portfolio & Trade Desk' },
    { key: '⌘ L / Ctrl+L', desc: 'Navigate to Income & Expenses View' },
    { key: '⌘ B / Ctrl+B', desc: 'Navigate to Data Backup & Restore' },
    { key: '⌘ / / Ctrl+/', desc: 'Toggle this Keyboard Shortcuts Cheat Sheet' },
    { key: 'Esc', desc: 'Close any active modal or command palette' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Keyboard className="h-4 w-4 text-emerald-400" />
            <span>Power User Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          FinOS Master is built for keyboard-first speed and financial operational efficiency.
        </p>

        <div className="space-y-2">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs"
            >
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 text-emerald-400 font-mono text-[11px] font-semibold border border-slate-700 shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
