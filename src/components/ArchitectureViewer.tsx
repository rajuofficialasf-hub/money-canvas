import React, { useState } from 'react';
import { Check, ShieldCheck, Scale, ArrowRightLeft, BookOpen, Layers } from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeLockIndex, setActiveLockIndex] = useState(0);

  const locks = [
    {
      title: 'Net Worth Sign Convention',
      tag: 'Lock 1',
      summary: 'Liability accounts inherently hold negative balances; never subtract liabilities a second time.',
      rule: 'Net Worth = SUM(canonical account balances) + Broker Cash + Stock Market Value',
      formula: 'NW = ∑ Balance(acc) + Cash_broker + MV_stocks',
      detail:
        'Because Credit Cards, Bank Loans, and Payables record liability increases as negative lines (-X), their balances in v_account_balances are already negative. If Net Worth subtracted them again, it would falsely turn liabilities into assets or double-penalize them.',
      example: 'Bank: +৳100,000 | Loan: -৳300,000 | Car: +৳2,000,000 => NW = 100k + (-300k) + 2M = ৳1,800,000.00',
    },
    {
      title: 'Physical Assets & Static Liabilities',
      tag: 'Lock 2',
      summary: 'Metadata stored in assets/liabilities; financial balance lives strictly in a linked canonical accounts row.',
      rule: 'assets.asset_account_id -> accounts.id (account_type = "asset")',
      formula: 'Single Financial Source of Truth',
      detail:
        'Physical Gold, Vehicles, and Properties have deeds, specs, and purchase notes in the assets table, but their valuation is stored exclusively as an account row. Net Worth queries accounts ONLY, eliminating balance duplication.',
      example: 'Buy Car for ৳2.2M: Bank -700k, Auto Loan -1.5M, Vehicle Asset +2.2M. Balance sum = 0.00.',
    },
    {
      title: 'Savings Goals Dual Modes',
      tag: 'Lock 3',
      summary: 'tracking_goal (virtual progress) vs linked_savings_account_goal (dedicated account).',
      rule: 'Tracking goals do not touch balances; dedicated goals execute standard Transfers.',
      formula: 'Goal contribution ≠ Expense',
      detail:
        'A tracking goal assigns funds virtually inside existing bank accounts. A dedicated goal creates an account where real double-entry transfers move funds. Neither mode ever classifies savings as an Expense.',
      example: 'Hajj Fund (Dedicated): City Bank -10k -> Hajj Account +10k (Transfer). Net Worth remains unchanged.',
    },
    {
      title: 'Stock Acquisition Charges & Proceeds',
      tag: 'Lock 4',
      summary: 'Buy cost basis includes all fees; Sell proceeds deduct all fees.',
      rule: 'Buy WAC = Gross + Fees; Sell Proceeds = Gross - Fees; Realized P/L = Net Proceeds - (Qty * WAC)',
      formula: 'P/L = Proceeds_net - (Sold_shares × WAC)',
      detail:
        'Broker commission, AIT, and CDBL fees capitalize into the stock purchase cost basis. At sale, fees reduce realized proceeds. Realized P/L is measured against the cumulative Weighted Average Cost.',
      example: 'Buy 100 @ 250 (+100 fees) = 25,100 (WAC 251). Sell @ 300 (-315 fees) = 44,685 proceeds. Gain = +৳5,529.00.',
    },
    {
      title: 'Variable Loan Schedule Versioning',
      tag: 'Lock 5',
      summary: 'Rate changes generate an immutable new schedule version; prior payment history is never rewritten.',
      rule: 'loan_payment_schedule.version incremented on rate adjustment.',
      formula: 'Immutable Historical Amortization',
      detail:
        'When Bangladesh Bank or the commercial bank alters the variable lending rate, past installments remain locked. A new schedule version is populated from the effective date forward.',
      example: 'Loan Version 1 (9% for 12 mos) -> Version 2 (11.5% from month 7 forward). Historical paid installments remain intact.',
    },
    {
      title: 'Signed Category Lines for Refunds',
      tag: 'Lock 6',
      summary: 'Refunds post negative amounts in the original expense category, reversing the expense directly.',
      rule: 'Category line amount = -X in same expense category; Account line = +X.',
      formula: 'Reported Expense = ∑(Expense) + ∑(Refunds)',
      detail:
        'If ৳1,000 of groceries is returned, recording -৳1,000 under the Groceries category decrements grocery expense in monthly reports. It does not fabricate artificial miscellaneous income.',
      example: 'Bought groceries +৳2,500. Returned items -৳1,000. Net grocery expense in P&L report = ৳1,500.00.',
    },
    {
      title: 'Portfolio XIRR vs Benchmark TWR',
      tag: 'Lock 7',
      summary: 'Portfolio XIRR strictly considers external cash flows; benchmark TWR normalizes timing against DSEX.',
      rule: 'Internal trades, broker cash swaps, and retained dividends are excluded from Portfolio XIRR.',
      formula: 'XIRR(Deposits_ext, Withdrawals_ext, Ending_portfolio_val)',
      detail:
        'Retained dividends remain inside portfolio broker cash, which is already captured in the ending valuation. Injecting them as positive external cash flows causes double-counting and artificially inflates XIRR.',
      example: 'Deposit 100k, buy GP for 50k, receive 5k dividend into broker cash. XIRR cash flows: Day 0: -100k, Today: +Ending Valuation.',
    },
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-4">
      {/* Hero Header */}
      <div className="border-b border-edge pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-accent-strong mb-2">
          <ShieldCheck className="h-4 w-4" />
          <span>PHASE 0 ARCHITECTURE LOCK</span>
          <span>·</span>
          <span>MASTER SPECIFICATION V5</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink mb-3">
          Authoritative Accounting & Financial Ledger Architecture
        </h1>
        <p className="text-ink-muted text-sm max-w-3xl leading-relaxed">
          The user interface is never a source of truth for financial balances, P/L, cost basis, XIRR, or Net Worth.
          All balances and performance returns are deterministically derived from immutable, signed double-entry ledger lines.
        </p>
      </div>

      {/* 7 Final Locks Interactive Explorer */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">The 7 Master Architectural Locks</h2>
            <p className="text-xs text-ink-muted">Non-negotiable accounting rules locked in Build Plan v5</p>
          </div>
          <span className="text-xs font-mono text-ink-faint">{activeLockIndex + 1} of 7</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lock Selector List */}
          <div className="lg:col-span-4 space-y-1.5">
            {locks.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setActiveLockIndex(idx)}
                className={`w-full text-left p-3.5 rounded-lg border transition-all text-xs ${
                  activeLockIndex === idx
                    ? 'border-accent/50 bg-emerald-950/20 text-ink'
                    : 'border-edge/80 bg-surface/40 text-ink-muted hover:border-edge-strong hover:text-ink-soft'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-accent-strong">{item.tag}</span>
                  {activeLockIndex === idx && <Check className="h-3.5 w-3.5 text-accent-strong" />}
                </div>
                <div className="font-medium text-sm text-ink-soft truncate">{item.title}</div>
                <div className="text-[11px] text-ink-faint line-clamp-1 mt-0.5">{item.summary}</div>
              </button>
            ))}
          </div>

          {/* Detailed Lock Showcase */}
          <div className="lg:col-span-8 rounded-xl border border-edge bg-surface/60 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/10 text-accent-strong border border-accent/30">
                  {locks[activeLockIndex].tag}
                </span>
                <span className="text-xs text-ink-muted font-mono">Status: Locked & Invariant Enforced</span>
              </div>

              <h3 className="text-xl font-bold text-ink tracking-tight">
                {locks[activeLockIndex].title}
              </h3>

              <div className="rounded-lg bg-canvas p-4 border border-edge font-mono text-xs text-accent-strong">
                <div className="text-ink-faint text-[10px] uppercase mb-1">Authoritative Formula / Rule</div>
                <div>{locks[activeLockIndex].rule}</div>
              </div>

              <div className="text-sm text-ink-soft leading-relaxed">
                {locks[activeLockIndex].detail}
              </div>

              <div className="rounded-lg bg-canvas/80 p-3.5 border border-edge/80 text-xs">
                <div className="text-ink-muted font-medium mb-1 flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-ink-muted" />
                  <span>Concrete Example:</span>
                </div>
                <div className="font-mono text-ink-soft">{locks[activeLockIndex].example}</div>
              </div>
            </div>

            <div className="pt-6 border-t border-edge/80 flex items-center justify-between text-xs text-ink-faint">
              <span>PostgreSQL Constraint & Trigger Verified</span>
              <span>Decimal-Safe Numeric(14,2)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Model & Invariants Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="rounded-xl border border-edge bg-surface/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-accent-strong text-sm font-semibold">
            <Layers className="h-4 w-4" />
            <span>Double-Entry Model</span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Practical middle-path: <code className="text-ink-soft font-mono">transactions</code> event header and{' '}
            <code className="text-ink-soft font-mono">transaction_lines</code>. Lines strictly hold either an{' '}
            <code className="text-ink-soft font-mono">account_id</code> OR a{' '}
            <code className="text-ink-soft font-mono">category_id</code>, never both.
          </p>
        </div>

        <div className="rounded-xl border border-edge bg-surface/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-accent-strong text-sm font-semibold">
            <ArrowRightLeft className="h-4 w-4" />
            <span>Sign Conventions</span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Asset increase: <span className="font-mono text-accent-strong">+</span> | Asset decrease:{' '}
            <span className="font-mono text-negative">-</span>. Liability increase:{' '}
            <span className="font-mono text-negative">-</span> | Liability decrease:{' '}
            <span className="font-mono text-accent-strong">+</span>. Category lines: Expense/Income are positive, refunds are signed negative.
          </p>
        </div>

        <div className="rounded-xl border border-edge bg-surface/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-accent-strong text-sm font-semibold">
            <BookOpen className="h-4 w-4" />
            <span>Immutability & Reversals</span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Posted transactions are permanently immutable. Corrections require posting an equal and opposite reversal transaction with{' '}
            <code className="text-ink-soft font-mono">linked_transaction_id</code>. Audit log is strictly INSERT-only.
          </p>
        </div>
      </div>
    </div>
  );
};
