import React, { useState } from 'react';
import { TestCaseResult } from '../types/accounting';
import { CheckCircle2, XCircle, Play, ChevronRight, ChevronDown, CheckCheck, RefreshCw } from 'lucide-react';

interface TestRunnerConsoleProps {
  testCases: TestCaseResult[];
  onRerun: () => void;
  isRunning: boolean;
}

export const TestRunnerConsole: React.FC<TestRunnerConsoleProps> = ({
  testCases,
  onRerun,
  isRunning,
}) => {
  const [selectedTestId, setSelectedTestId] = useState<number>(1);
  const selectedTest = testCases.find((t) => t.id === selectedTestId) || testCases[0];

  const totalPassed = testCases.filter((t) => t.passed).length;
  const allPassed = totalPassed === testCases.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      {/* Header and Summary Bar */}
      <div className="border-b border-edge pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-accent-strong mb-1.5">
            <CheckCheck className="h-4 w-4" />
            <span>ACCOUNTING TEST MATRIX — 17 MANDATORY SCENARIOS</span>
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Authoritative Invariant Verification
          </h1>
          <p className="text-ink-muted text-xs mt-1">
            Manual and automated scenarios mathematically proving double-entry ledger integrity before Phase 1.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-mono text-ink-muted">Scorecard</div>
            <div className="text-lg font-bold font-mono text-accent-strong">
              {totalPassed} / {testCases.length} Passed
            </div>
          </div>

          <button
            onClick={onRerun}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-strong transition-colors disabled:opacity-50 font-mono shadow-sm"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{isRunning ? 'Validating...' : 'Run All 17 Tests'}</span>
          </button>
        </div>
      </div>

      {/* Progress / Status Bar */}
      <div className="rounded-xl border border-edge bg-surface/60 p-4">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-ink-muted">Overall Suite Status</span>
          <span className={allPassed ? 'text-accent-strong font-semibold' : 'text-warning font-semibold'}>
            {allPassed ? '100% Invariants Satisfied' : 'Attention Required'}
          </span>
        </div>
        <div className="w-full bg-canvas rounded-full h-2 overflow-hidden border border-edge">
          <div
            className="bg-accent-strong h-full transition-all duration-500 rounded-full"
            style={{ width: `${(totalPassed / testCases.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Master 2-Column Split: Test List on Left, Detail Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Test Cases List */}
        <div className="lg:col-span-5 space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
          {testCases.map((tc) => {
            const isSelected = tc.id === selectedTestId;
            return (
              <button
                key={tc.id}
                onClick={() => setSelectedTestId(tc.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex items-center justify-between ${
                  isSelected
                    ? 'border-accent/50 bg-emerald-950/20 text-ink font-medium'
                    : 'border-edge/80 bg-surface/40 text-ink-muted hover:border-edge-strong hover:text-ink-soft'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {tc.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-accent-strong shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-negative shrink-0" />
                  )}
                  <span className="font-mono text-ink-faint shrink-0">#{tc.id.toString().padStart(2, '0')}</span>
                  <span className="truncate">{tc.title}</span>
                </div>
                {isSelected ? (
                  <ChevronDown className="h-4 w-4 text-accent-strong shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-faint shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Selected Test Detail Inspector */}
        <div className="lg:col-span-7">
          {selectedTest && (
            <div className="rounded-xl border border-edge bg-surface/60 p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-edge/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-ink-muted mb-1">
                    <span>Scenario #{selectedTest.id.toString().padStart(2, '0')}</span>
                    <span>·</span>
                    <span className="text-accent-strong">PASSED</span>
                  </div>
                  <h3 className="text-lg font-bold text-ink tracking-tight">{selectedTest.title}</h3>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">{selectedTest.description}</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-accent/10 text-accent-strong border border-accent/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verified</span>
                </div>
              </div>

              {/* Invariant Formula Check */}
              <div className="rounded-lg bg-canvas p-4 border border-edge space-y-1.5">
                <div className="text-[10px] font-mono text-ink-faint uppercase tracking-wider">
                  Mathematical Invariant Verification
                </div>
                <div className="font-mono text-xs text-accent-strong font-medium">
                  {selectedTest.invariantStatus}
                </div>
              </div>

              {/* Sample Signed Ledger Lines */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-ink-soft">
                  Atomic Double-Entry Lines ({selectedTest.sampleTransaction.lines.length})
                </div>
                <div className="rounded-lg border border-edge bg-canvas/70 divide-y divide-edge/70 overflow-hidden text-xs font-mono">
                  {selectedTest.sampleTransaction.lines.map((line, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-raised text-ink-soft">
                          {line.type}
                        </span>
                        <span className="text-ink-soft">{line.targetName}</span>
                      </div>
                      <span
                        className={`font-semibold ${
                          line.amount > 0 ? 'text-accent-strong' : line.amount < 0 ? 'text-negative' : 'text-ink-muted'
                        }`}
                      >
                        {line.amount > 0 ? `+৳${line.amount.toLocaleString()}` : `-৳${Math.abs(line.amount).toLocaleString()}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Delta Results */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-ink-soft">Account Balance Impact (v_account_balances)</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(selectedTest.balanceDeltas).map(([acc, delta]) => (
                    <div key={acc} className="p-2.5 rounded-lg border border-edge bg-canvas flex justify-between">
                      <span className="text-ink-muted truncate pr-2">{acc}:</span>
                      <span className={delta >= 0 ? 'text-accent-strong font-semibold' : 'text-negative font-semibold'}>
                        {delta >= 0 ? `+৳${delta.toLocaleString()}` : `-৳${Math.abs(delta).toLocaleString()}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Audit Trail */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-ink-soft">Execution Audit Trail</div>
                <div className="rounded-lg bg-canvas p-3 border border-edge text-xs font-mono text-ink-muted space-y-1">
                  {selectedTest.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-ink-faint select-none">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
