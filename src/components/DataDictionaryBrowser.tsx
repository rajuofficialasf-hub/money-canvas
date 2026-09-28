import React, { useState, useMemo } from 'react';
import { Search, Filter, BookOpen } from 'lucide-react';

interface DictionaryEntry {
  table: string;
  column: string;
  type: string;
  nullable: boolean;
  defaultVal: string;
  module: 'Ledger' | 'Savings' | 'Debt & Loan' | 'Brokerage' | 'Reporting';
  businessDescription: string;
}

const DICTIONARY_ENTRIES: DictionaryEntry[] = [
  { table: 'profiles', column: 'base_currency', type: 'VARCHAR(3)', nullable: false, defaultVal: "'BDT'", module: 'Ledger', businessDescription: 'Locked base accounting currency. Always BDT in v1 master plan.' },
  { table: 'profiles', column: 'timezone', type: 'VARCHAR(64)', nullable: false, defaultVal: "'Asia/Dhaka'", module: 'Ledger', businessDescription: 'User operational timezone for closing prices, snapshots, and cron triggers.' },
  { table: 'accounts', column: 'account_type', type: 'VARCHAR(32)', nullable: false, defaultVal: 'None', module: 'Ledger', businessDescription: 'Canonical asset/liability type (cash, bank, credit_card, fd, dps, loan, asset).' },
  { table: 'accounts', column: 'credit_limit', type: 'NUMERIC(14,2)', nullable: true, defaultVal: 'NULL', module: 'Ledger', businessDescription: 'Total approved limit for credit cards or overdraft facilities.' },
  { table: 'accounts', column: 'is_zakatable', type: 'BOOLEAN', nullable: false, defaultVal: 'true', module: 'Ledger', businessDescription: 'Flag determining if account balance enters the Zakat net calculation pool.' },
  { table: 'transactions', column: 'type', type: 'VARCHAR(32)', nullable: false, defaultVal: 'None', module: 'Ledger', businessDescription: 'Economic event classification determining posting invariant formula.' },
  { table: 'transactions', column: 'status', type: 'VARCHAR(16)', nullable: false, defaultVal: "'posted'", module: 'Ledger', businessDescription: 'Lifecycle state: draft (unposted), posted (immutable), voided (reversal neutral).' },
  { table: 'transactions', column: 'version', type: 'INTEGER', nullable: false, defaultVal: '1', module: 'Ledger', businessDescription: 'Optimistic locking integer for concurrency control and conflict review.' },
  { table: 'transactions', column: 'linked_transaction_id', type: 'UUID', nullable: true, defaultVal: 'NULL', module: 'Ledger', businessDescription: 'Self-reference foreign key for refund, correction reversal, or adjustment chains.' },
  { table: 'transaction_lines', column: 'line_type', type: 'VARCHAR(16)', nullable: false, defaultVal: 'None', module: 'Ledger', businessDescription: 'Mutually exclusive flag: "account" updates ledger balance, "category" updates reporting.' },
  { table: 'transaction_lines', column: 'amount', type: 'NUMERIC(14,2)', nullable: false, defaultVal: 'None', module: 'Ledger', businessDescription: 'Signed monetary value: asset (+/-), liability (-/+), category (+ for expense/income, - for refund).' },
  { table: 'fixed_deposits', column: 'fd_account_id', type: 'UUID', nullable: false, defaultVal: 'None', module: 'Savings', businessDescription: 'Canonical account row holding the FD principal asset balance.' },
  { table: 'fixed_deposits', column: 'principal_amount', type: 'NUMERIC(14,2)', nullable: false, defaultVal: 'None', module: 'Savings', businessDescription: 'Guaranteed principal counted in Net Worth prior to maturity.' },
  { table: 'fixed_deposits', column: 'tax_rate', type: 'NUMERIC(5,2)', nullable: false, defaultVal: '10.00', module: 'Savings', businessDescription: 'Standard withholding tax percentage on bank interest (10% with TIN, 15% without).' },
  { table: 'dps_accounts', column: 'dps_account_id', type: 'UUID', nullable: false, defaultVal: 'None', module: 'Savings', businessDescription: 'Canonical account row receiving monthly transfer installments.' },
  { table: 'dps_accounts', column: 'monthly_installment', type: 'NUMERIC(14,2)', nullable: false, defaultVal: 'None', module: 'Savings', businessDescription: 'Fixed monthly commitment amount transferred from bank to DPS account.' },
  { table: 'loans', column: 'loan_account_id', type: 'UUID', nullable: false, defaultVal: 'None', module: 'Debt & Loan', businessDescription: 'Canonical liability account. Holds negative balance reflecting outstanding principal.' },
  { table: 'loans', column: 'interest_method', type: 'VARCHAR(16)', nullable: false, defaultVal: 'None', module: 'Debt & Loan', businessDescription: 'Specifies "reducing" (amortized interest on balance) vs "flat" interest calculation.' },
  { table: 'loans', column: 'rate_type', type: 'VARCHAR(16)', nullable: false, defaultVal: 'None', module: 'Debt & Loan', businessDescription: 'Specifies "fixed" rate vs "variable" rate with versioned amortization schedules.' },
  { table: 'loan_payment_schedule', column: 'version', type: 'INTEGER', nullable: false, defaultVal: '1', module: 'Debt & Loan', businessDescription: 'Schedule version. Variable rate shifts generate version 2 while keeping version 1 immutable.' },
  { table: 'assets', column: 'asset_account_id', type: 'UUID', nullable: false, defaultVal: 'None', module: 'Ledger', businessDescription: 'Canonical account holding asset valuation. Assets table holds only metadata.' },
  { table: 'broker_accounts', column: 'bo_id', type: 'VARCHAR(32)', nullable: false, defaultVal: 'None', module: 'Brokerage', businessDescription: '16-digit Beneficiary Owner (BO) identification number in CDBL depository.' },
  { table: 'broker_cash_transactions', column: 'amount_signed', type: 'NUMERIC(14,2)', nullable: false, defaultVal: 'None', module: 'Brokerage', businessDescription: 'Sole authoritative cash ledger for broker cash. Stored signed (+ in, - out).' },
  { table: 'broker_cash_transactions', column: 'source_event_key', type: 'VARCHAR(128)', nullable: true, defaultVal: 'NULL', module: 'Brokerage', businessDescription: 'Unique idempotency key preventing duplicate funding entries between bank and broker.' },
  { table: 'stock_transactions', column: 'gross_value', type: 'NUMERIC(14,2)', nullable: false, defaultVal: 'None', module: 'Brokerage', businessDescription: 'Total trade value before charges: Quantity × Price.' },
  { table: 'stock_transactions', column: 'net_value', type: 'NUMERIC(14,2)', nullable: false, defaultVal: 'None', module: 'Brokerage', businessDescription: 'Buy: Gross + Commission + Tax + Other | Sell: Gross - Commission - Tax - Other.' },
  { table: 'portfolio_snapshots', column: 'daily_twr', type: 'NUMERIC(10,6)', nullable: true, defaultVal: 'NULL', module: 'Reporting', businessDescription: 'Daily Time-Weighted Return neutralizing external cash flows for DSEX indexing.' },
  { table: 'audit_logs', column: 'action', type: 'VARCHAR(64)', nullable: false, defaultVal: 'None', module: 'Reporting', businessDescription: 'Event descriptor. Table is strictly INSERT-only in normal operations.' },
];

export const DataDictionaryBrowser: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('All');

  const filteredEntries = useMemo(() => {
    return DICTIONARY_ENTRIES.filter((entry) => {
      const matchesSearch =
        entry.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.column.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.businessDescription.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModule = selectedModule === 'All' || entry.module === selectedModule;
      return matchesSearch && matchesModule;
    });
  }, [searchTerm, selectedModule]);

  const modules = ['All', 'Ledger', 'Savings', 'Debt & Loan', 'Brokerage', 'Reporting'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1.5">
            <BookOpen className="h-4 w-4" />
            <span>DATA DICTIONARY & FIELD SPECIFICATIONS</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PostgreSQL Column Registry</h1>
          <p className="text-slate-400 text-xs mt-1">
            Authoritative definition of data types, nullability, defaults, and business rules across all tables.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search column, table or rule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Module Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        {modules.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedModule(m)}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap font-mono text-xs ${
              selectedModule === m
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900/40 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {m}
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-auto font-mono">{filteredEntries.length} fields</span>
      </div>

      {/* Dictionary Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono">
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4">Column Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Null?</th>
                <th className="py-3 px-4">Default</th>
                <th className="py-3 px-4">Business Description & Invariant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredEntries.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-slate-300 font-semibold">{row.table}</td>
                  <td className="py-3 px-4 text-emerald-400">{row.column}</td>
                  <td className="py-3 px-4 text-slate-400">{row.type}</td>
                  <td className="py-3 px-4">
                    {row.nullable ? (
                      <span className="text-slate-500">YES</span>
                    ) : (
                      <span className="text-amber-400 font-medium">NO</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{row.defaultVal}</td>
                  <td className="py-3 px-4 font-sans text-slate-300 max-w-md">{row.businessDescription}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
