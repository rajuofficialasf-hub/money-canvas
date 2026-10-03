import React from 'react';
import { Play } from 'lucide-react';

interface TopNavigationProps {
  activeTab: 'architecture' | 'schema' | 'dictionary' | 'tests' | 'sandbox';
  setActiveTab: (tab: 'architecture' | 'schema' | 'dictionary' | 'tests' | 'sandbox') => void;
  onRunAllTests: () => void;
  allPassed: boolean;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  setActiveTab,
  onRunAllTests,
  allPassed,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-edge bg-canvas/90 px-6 py-3.5 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('architecture');
          }}
          className="text-base font-semibold tracking-tight text-ink hover:text-accent-strong transition-colors"
        >
          Finance & Investment OS
        </a>
        <div className="hidden sm:flex items-center gap-2 text-xs text-ink-muted font-mono">
          <span>·</span>
          <span>Phase 0 Locked</span>
          <span>·</span>
          <span>Build Plan v5</span>
        </div>
      </div>

      {/* Zone 2: 4-5 clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-ink-muted">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`transition-colors hover:text-ink ${
            activeTab === 'architecture' ? 'text-accent-strong font-semibold border-b-2 border-accent-strong pb-0.5' : ''
          }`}
        >
          Accounting Rules
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`transition-colors hover:text-ink ${
            activeTab === 'schema' ? 'text-accent-strong font-semibold border-b-2 border-accent-strong pb-0.5' : ''
          }`}
        >
          Relational ERD
        </button>
        <button
          onClick={() => setActiveTab('dictionary')}
          className={`transition-colors hover:text-ink ${
            activeTab === 'dictionary' ? 'text-accent-strong font-semibold border-b-2 border-accent-strong pb-0.5' : ''
          }`}
        >
          Data Dictionary
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`transition-colors hover:text-ink ${
            activeTab === 'tests' ? 'text-accent-strong font-semibold border-b-2 border-accent-strong pb-0.5' : ''
          }`}
        >
          Test Cases (17/17)
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`transition-colors hover:text-ink ${
            activeTab === 'sandbox' ? 'text-accent-strong font-semibold border-b-2 border-accent-strong pb-0.5' : ''
          }`}
        >
          Live Sandbox
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-accent-strong font-mono">
          <span className="inline-block h-2 w-2 rounded-full bg-accent-strong animate-pulse"></span>
          <span>{allPassed ? 'Invariants Verified' : 'Checking Math'}</span>
        </div>

        <button
          onClick={onRunAllTests}
          className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-strong border border-accent/30 hover:bg-accent/20 transition-colors whitespace-nowrap"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Verify Math</span>
        </button>
      </div>
    </header>
  );
};
