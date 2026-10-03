import React, { useState } from 'react';
import { Database, Table as TableIcon, Key, Link2, Copy, Check } from 'lucide-react';

interface SchemaTable {
  name: string;
  module: 'Core Ledger' | 'Savings & Debt' | 'Broker & Stock' | 'Views & Analytics';
  columns: Array<{
    name: string;
    type: string;
    pk?: boolean;
    fk?: string;
    notNull?: boolean;
    desc: string;
  }>;
  ddl: string;
}

const TABLES: SchemaTable[] = [
  {
    name: 'accounts',
    module: 'Core Ledger',
    columns: [
      { name: 'id', type: 'UUID', pk: true, notNull: true, desc: 'Primary Key' },
      { name: 'user_id', type: 'UUID', fk: 'profiles.id', notNull: true, desc: 'Tenant isolation' },
      { name: 'name', type: 'VARCHAR(128)', notNull: true, desc: 'Account title (e.g. City Bank)' },
      { name: 'account_type', type: 'VARCHAR(32)', notNull: true, desc: 'cash, bank, credit_card, fd, dps, loan, asset...' },
      { name: 'currency', type: 'VARCHAR(3)', notNull: true, desc: 'Default BDT' },
      { name: 'credit_limit', type: 'NUMERIC(14,2)', desc: 'Credit card or overdraft limit' },
      { name: 'is_zakatable', type: 'BOOLEAN', notNull: true, desc: 'Subject to zakat calculation' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', desc: 'Soft-delete marker' },
    ],
    ddl: `CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    account_type VARCHAR(32) NOT NULL CHECK (account_type IN ('cash', 'bank', 'mobile_wallet', 'credit_card', 'fd', 'dps', 'receivable', 'payable', 'loan', 'asset', 'liability')),
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    credit_limit NUMERIC(14,2),
    is_zakatable BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ
);`,
  },
  {
    name: 'transactions',
    module: 'Core Ledger',
    columns: [
      { name: 'id', type: 'UUID', pk: true, notNull: true, desc: 'Primary Key' },
      { name: 'user_id', type: 'UUID', fk: 'profiles.id', notNull: true, desc: 'Tenant isolation' },
      { name: 'date', type: 'DATE', notNull: true, desc: 'Economic event date' },
      { name: 'type', type: 'VARCHAR(32)', notNull: true, desc: 'expense, income, transfer, cc_purchase, loan_emi...' },
      { name: 'status', type: 'VARCHAR(16)', notNull: true, desc: 'draft, posted, voided' },
      { name: 'version', type: 'INTEGER', notNull: true, desc: 'Optimistic concurrency control' },
      { name: 'linked_transaction_id', type: 'UUID', fk: 'transactions.id', desc: 'Reversal or refund parent link' },
    ],
    ddl: `CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'voided')),
    version INTEGER NOT NULL DEFAULT 1,
    linked_transaction_id UUID REFERENCES transactions(id)
);`,
  },
  {
    name: 'transaction_lines',
    module: 'Core Ledger',
    columns: [
      { name: 'id', type: 'UUID', pk: true, notNull: true, desc: 'Primary Key' },
      { name: 'transaction_id', type: 'UUID', fk: 'transactions.id', notNull: true, desc: 'Parent header link' },
      { name: 'line_type', type: 'VARCHAR(16)', notNull: true, desc: 'account | category' },
      { name: 'account_id', type: 'UUID', fk: 'accounts.id', desc: 'Required when line_type = account' },
      { name: 'category_id', type: 'UUID', fk: 'categories.id', desc: 'Required when line_type = category' },
      { name: 'amount', type: 'NUMERIC(14,2)', notNull: true, desc: 'Signed numeric value' },
    ],
    ddl: `CREATE TABLE transaction_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    line_type VARCHAR(16) NOT NULL CHECK (line_type IN ('account', 'category')),
    account_id UUID REFERENCES accounts(id),
    category_id UUID REFERENCES categories(id),
    amount NUMERIC(14,2) NOT NULL,
    CONSTRAINT chk_line_type_exclusivity CHECK (
        (line_type = 'account' AND account_id IS NOT NULL AND category_id IS NULL) OR
        (line_type = 'category' AND category_id IS NOT NULL AND account_id IS NULL)
    )
);`,
  },
  {
    name: 'fixed_deposits',
    module: 'Savings & Debt',
    columns: [
      { name: 'id', type: 'UUID', pk: true, notNull: true, desc: 'Primary Key' },
      { name: 'fd_account_id', type: 'UUID', fk: 'accounts.id', notNull: true, desc: 'Canonical account row' },
      { name: 'principal_amount', type: 'NUMERIC(14,2)', notNull: true, desc: 'Deposit capital' },
      { name: 'interest_rate', type: 'NUMERIC(5,2)', notNull: true, desc: 'Promised annual rate' },
      { name: 'maturity_date', type: 'DATE', notNull: true, desc: 'Scheduled payoff date' },
      { name: 'status', type: 'VARCHAR(16)', notNull: true, desc: 'active, matured, broken' },
    ],
    ddl: `CREATE TABLE fixed_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fd_account_id UUID NOT NULL UNIQUE REFERENCES accounts(id),
    principal_amount NUMERIC(14,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    maturity_date DATE NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active'
);`,
  },
  {
    name: 'loans',
    module: 'Savings & Debt',
    columns: [
      { name: 'id', type: 'UUID', pk: true, notNull: true, desc: 'Primary Key' },
      { name: 'loan_account_id', type: 'UUID', fk: 'accounts.id', notNull: true, desc: 'Canonical liability account' },
      { name: 'interest_method', type: 'VARCHAR(16)', notNull: true, desc: 'reducing | flat' },
      { name: 'rate_type', type: 'VARCHAR(16)', notNull: true, desc: 'fixed | variable' },
      { name: 'principal', type: 'NUMERIC(14,2)', notNull: true, desc: 'Disbursed loan amount' },
      { name: 'emi_amount', type: 'NUMERIC(14,2)', notNull: true, desc: 'Scheduled monthly installment' },
    ],
    ddl: `CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    loan_account_id UUID NOT NULL UNIQUE REFERENCES accounts(id),
    interest_method VARCHAR(16) NOT NULL CHECK (interest_method IN ('reducing', 'flat')),
    rate_type VARCHAR(16) NOT NULL CHECK (rate_type IN ('fixed', 'variable')),
    principal NUMERIC(14,2) NOT NULL,
    emi_amount NUMERIC(14,2) NOT NULL
);`,
  },
  {
    name: 'broker_cash_transactions',
    module: 'Broker & Stock',
    columns: [
      { name: 'id', type: 'UUID', pk: true, notNull: true, desc: 'Primary Key' },
      { name: 'broker_account_id', type: 'UUID', fk: 'broker_accounts.id', notNull: true, desc: 'Target BO cash account' },
      { name: 'type', type: 'VARCHAR(32)', notNull: true, desc: 'deposit, withdrawal, buy_gross, commission, tax...' },
      { name: 'amount_signed', type: 'NUMERIC(14,2)', notNull: true, desc: 'Signed cash flow (+/-)' },
      { name: 'source_event_key', type: 'VARCHAR(128)', desc: 'UNIQUE idempotency key' },
    ],
    ddl: `CREATE TABLE broker_cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL REFERENCES broker_accounts(id),
    transaction_date DATE NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount_signed NUMERIC(14,2) NOT NULL,
    source_event_key VARCHAR(128) UNIQUE
);`,
  },
  {
    name: 'v_net_worth',
    module: 'Views & Analytics',
    columns: [
      { name: 'user_id', type: 'UUID', pk: true, notNull: true, desc: 'User profile link' },
      { name: 'accounts_balance', type: 'NUMERIC(14,2)', notNull: true, desc: 'SUM(canonical account balances)' },
      { name: 'broker_cash', type: 'NUMERIC(14,2)', notNull: true, desc: 'SUM(broker cash rows)' },
      { name: 'stock_market_value', type: 'NUMERIC(14,2)', notNull: true, desc: 'Current valuation of shares' },
      { name: 'net_worth', type: 'NUMERIC(14,2)', notNull: true, desc: 'Authoritative Live Net Worth' },
    ],
    ddl: `CREATE OR REPLACE VIEW v_net_worth AS
SELECT 
    p.id AS user_id,
    COALESCE(acc.total, 0.00) AS accounts_balance,
    COALESCE(bc.total, 0.00) AS broker_cash,
    COALESCE(smv.total, 0.00) AS stock_market_value,
    (COALESCE(acc.total, 0) + COALESCE(bc.total, 0) + COALESCE(smv.total, 0))::NUMERIC(14,2) AS net_worth
FROM profiles p
LEFT JOIN v_account_balances_sum acc ON p.id = acc.user_id
LEFT JOIN v_broker_cash_sum bc ON p.id = bc.user_id
LEFT JOIN v_stock_holdings_sum smv ON p.id = smv.user_id;`,
  },
];

export const SchemaVisualizer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<SchemaTable>(TABLES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedTable.ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div className="border-b border-edge pb-6">
        <div className="flex items-center gap-2 text-xs font-mono text-accent-strong mb-1.5">
          <Database className="h-4 w-4" />
          <span>RELATIONAL SCHEMA SPECIFICATION</span>
        </div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Database Tables, Foreign Keys & Authoritative Views</h1>
        <p className="text-ink-muted text-xs max-w-2xl mt-1 leading-relaxed">
          Exhaustive schema designed for zero balance drift, strict sub-ledger foreign keys, and atomic financial invariants.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Selector */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
            Schema Entities ({TABLES.length})
          </div>
          {TABLES.map((t) => (
            <button
              key={t.name}
              onClick={() => setSelectedTable(t)}
              className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex items-center justify-between ${
                selectedTable.name === t.name
                  ? 'border-accent/50 bg-emerald-950/20 text-ink font-medium'
                  : 'border-edge/80 bg-surface/40 text-ink-muted hover:border-edge-strong hover:text-ink-soft'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <TableIcon className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                <span className="font-mono text-xs">{t.name}</span>
              </div>
              <span className="text-[10px] text-ink-faint font-mono shrink-0">{t.module}</span>
            </button>
          ))}
        </div>

        {/* Table Details & DDL */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-edge bg-surface/60 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-edge/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-ink font-mono">{selectedTable.name}</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-raised text-ink-soft">
                    {selectedTable.module}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  {selectedTable.columns.length} columns defined with strict types & check constraints
                </p>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border border-edge-strong bg-raised text-ink-soft hover:text-ink hover:border-edge-strong transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-accent-strong" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy DDL'}</span>
              </button>
            </div>

            {/* Column Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-edge text-ink-muted font-mono">
                    <th className="py-2 pr-4">Column</th>
                    <th className="py-2 pr-4">Data Type</th>
                    <th className="py-2 pr-4">Keys / Constraints</th>
                    <th className="py-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/60 font-mono">
                  {selectedTable.columns.map((c) => (
                    <tr key={c.name} className="hover:bg-raised/30">
                      <td className="py-2.5 pr-4 text-accent-strong font-semibold">{c.name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{c.type}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          {c.pk && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-warning">
                              <Key className="h-3 w-3" /> PK
                            </span>
                          )}
                          {c.fk && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-sky-400">
                              <Link2 className="h-3 w-3" /> {c.fk}
                            </span>
                          )}
                          {c.notNull && !c.pk && (
                            <span className="text-[10px] text-ink-muted">NOT NULL</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-ink-muted font-sans">{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DDL Code Block */}
            <div className="rounded-lg bg-canvas p-4 border border-edge">
              <div className="text-[10px] font-mono text-ink-faint uppercase mb-2">Authoritative DDL Definition</div>
              <pre className="font-mono text-xs text-ink-soft overflow-x-auto leading-relaxed">
                {selectedTable.ddl}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
