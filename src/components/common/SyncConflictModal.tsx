import React, { useState } from 'react';
import { Cloud, Laptop, GitBranch } from 'lucide-react';
import { Modal, Button } from '../ui';
import { useSyncStatus } from '../../lib/ledger-context';

/**
 * STEP-15: When both this device and the cloud changed since their last common
 * sync point, neither side can safely win automatically. This modal shows both
 * sides (last saved time + record count) and lets the user pick.
 */
export const SyncConflictModal: React.FC = () => {
  const { syncConflict, resolveSyncConflict } = useSyncStatus();
  const [resolving, setResolving] = useState<'local' | 'cloud' | null>(null);

  if (!syncConflict) return null;

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'অজানা (Unknown)';

  const choose = async (choice: 'local' | 'cloud') => {
    setResolving(choice);
    try {
      await resolveSyncConflict(choice);
    } finally {
      setResolving(null);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => {}}
      title={
        <span className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-warning" />
          <span>সিঙ্ক দ্বন্দ্ব — কোন ডেটা রাখবেন?</span>
        </span>
      }
      description="এই ডিভাইস ও ক্লাউড — দুই জায়গাতেই আলাদা পরিবর্তন হয়েছে। কোন সংস্করণটি রাখতে চান তা বেছে নিন; অন্যটির সাম্প্রতিক পরিবর্তন মুছে যাবে। (Both this device and the cloud have diverging changes. Pick the version to keep.)"
      maxWidth="lg"
      closeOnBackdropClick={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-canvas border border-edge rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
            <Laptop className="h-4 w-4" />
            <span>এই ডিভাইস (This Device)</span>
          </div>
          <p className="text-xs text-ink-muted">
            সর্বশেষ সিঙ্ক: <span className="text-ink-soft">{fmt(syncConflict.localLastSavedAt)}</span>
          </p>
          <p className="text-xs text-ink-muted">
            রেকর্ড সংখ্যা: <span className="text-ink-soft">{syncConflict.localRecordCount.toLocaleString()}</span>
          </p>
          <Button
            variant="primary"
            className="w-full mt-2"
            disabled={resolving !== null}
            onClick={() => choose('local')}
          >
            {resolving === 'local' ? 'আপলোড হচ্ছে...' : 'এই ডিভাইসের ডেটা রাখুন'}
          </Button>
        </div>

        <div className="bg-canvas border border-edge rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-accent-strong text-xs font-bold">
            <Cloud className="h-4 w-4" />
            <span>ক্লাউড (Cloud)</span>
          </div>
          <p className="text-xs text-ink-muted">
            সর্বশেষ সেভ: <span className="text-ink-soft">{fmt(syncConflict.cloudExportedAt)}</span>
          </p>
          <p className="text-xs text-ink-muted">
            রেকর্ড সংখ্যা: <span className="text-ink-soft">{syncConflict.cloudRecordCount.toLocaleString()}</span>
          </p>
          <Button
            variant="secondary"
            className="w-full mt-2"
            disabled={resolving !== null}
            onClick={() => choose('cloud')}
          >
            {resolving === 'cloud' ? 'লোড হচ্ছে...' : 'ক্লাউডের ডেটা রাখুন'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
