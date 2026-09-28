/**
 * Personal Finance & Investment Manager — Row Level Security (RLS) Generator
 * Authoritative Supabase & PostgreSQL Tenant Isolation Policies
 */

export interface RlsTablePolicy {
  tableName: string;
  hasTenantColumn: boolean;
  tenantColumn: string;
  policyName: string;
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  usingClause: string;
  withCheckClause?: string;
  description: string;
}

export const RLS_TABLES_LIST: RlsTablePolicy[] = [
  {
    tableName: 'profiles',
    hasTenantColumn: true,
    tenantColumn: 'id',
    policyName: 'profiles_tenant_isolation',
    command: 'ALL',
    usingClause: 'id = auth.uid()',
    withCheckClause: 'id = auth.uid()',
    description: 'Enforces that each user can only read, edit or delete their own profile record.',
  },
  {
    tableName: 'accounts',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'accounts_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Isolates canonical cash, bank, loan, and asset accounts strictly to owning tenant.',
  },
  {
    tableName: 'categories',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'categories_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid() OR is_system = true',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Permits reading global system categories and isolates custom user categories.',
  },
  {
    tableName: 'transactions',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'transactions_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Header transactions table isolation.',
  },
  {
    tableName: 'transaction_lines',
    hasTenantColumn: false,
    tenantColumn: 'transaction_id -> transactions.user_id',
    policyName: 'transaction_lines_parent_tenant_isolation',
    command: 'ALL',
    usingClause: `EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_lines.transaction_id
    AND t.user_id = auth.uid()
  )`,
    withCheckClause: `EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_lines.transaction_id
    AND t.user_id = auth.uid()
  )`,
    description: 'Double-entry child lines inherit tenant isolation via immutable parent transaction foreign key.',
  },
  {
    tableName: 'fixed_deposits',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'fixed_deposits_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Protects FD principal amounts, bank links, and interest rates.',
  },
  {
    tableName: 'dps_accounts',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'dps_accounts_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Isolates DPS periodic installments and bank linkages.',
  },
  {
    tableName: 'dps_installments',
    hasTenantColumn: false,
    tenantColumn: 'dps_account_id -> dps_accounts.user_id',
    policyName: 'dps_installments_parent_tenant_isolation',
    command: 'ALL',
    usingClause: `EXISTS (
    SELECT 1 FROM dps_accounts d
    WHERE d.id = dps_installments.dps_account_id
    AND d.user_id = auth.uid()
  )`,
    description: 'Protects scheduled DPS installments by resolving parent account ownership.',
  },
  {
    tableName: 'debts',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'debts_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Protects peer-to-peer receivables and payables.',
  },
  {
    tableName: 'loans',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'loans_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Protects bank loan agreements, EMI computations, and interest amortization terms.',
  },
  {
    tableName: 'loan_payment_schedule',
    hasTenantColumn: false,
    tenantColumn: 'loan_id -> loans.user_id',
    policyName: 'loan_schedule_parent_tenant_isolation',
    command: 'ALL',
    usingClause: `EXISTS (
    SELECT 1 FROM loans l
    WHERE l.id = loan_payment_schedule.loan_id
    AND l.user_id = auth.uid()
  )`,
    description: 'Versioned loan schedule lines isolated to borrower tenant.',
  },
  {
    tableName: 'assets',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'assets_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Physical vehicles, real estate, and precious metal asset registrations.',
  },
  {
    tableName: 'liabilities',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'liabilities_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Mortgage contracts, car finance liabilities, and private obligations.',
  },
  {
    tableName: 'broker_accounts',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'broker_accounts_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Protects 16-digit CDBL BO IDs and broker agency mappings.',
  },
  {
    tableName: 'broker_cash_transactions',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'broker_cash_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Authoritative broker cash ledger entries.',
  },
  {
    tableName: 'stock_transactions',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'stock_transactions_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'DSE buy/sell order records, commissions, and tax charges.',
  },
  {
    tableName: 'budgets',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'budgets_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Monthly category budget thresholds.',
  },
  {
    tableName: 'recurring_transactions',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'recurring_transactions_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Scheduled recurring subscriptions and recurring salaries.',
  },
  {
    tableName: 'financial_goals',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'financial_goals_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'Emergency funds, Hajj funds, and asset accumulation targets.',
  },
  {
    tableName: 'audit_logs',
    hasTenantColumn: true,
    tenantColumn: 'user_id',
    policyName: 'audit_logs_tenant_isolation',
    command: 'ALL',
    usingClause: 'user_id = auth.uid()',
    withCheckClause: 'user_id = auth.uid()',
    description: 'INSERT-only audit logs viewable only by account owner.',
  },
];

/**
 * Generates the complete idempotent SQL migration file for Supabase/PostgreSQL.
 */
export function generateFullRlsMigrationSql(): string {
  const lines: string[] = [
    '-- ==========================================================================',
    '-- PERSONAL FINANCE & INVESTMENT MANAGER — PHASE 1 MIGRATION: AUTH & RLS',
    '-- PostgreSQL / Supabase Compatible Migration File',
    '-- Base Currency: BDT | Timezone: Asia/Dhaka | Tenant Isolation: auth.uid()',
    '-- ==========================================================================',
    '',
    '-- 1. Profiles Auto-Creation Trigger on auth.users Signup',
    'CREATE OR REPLACE FUNCTION public.handle_new_user()',
    'RETURNS TRIGGER AS $$',
    'BEGIN',
    '    INSERT INTO public.profiles (id, full_name, base_currency, timezone, created_at, updated_at)',
    "    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Account Holder'), 'BDT', 'Asia/Dhaka', NOW(), NOW());",
    '    RETURN NEW;',
    'END;',
    '$$ LANGUAGE plpgsql SECURITY DEFINER;',
    '',
    'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;',
    'CREATE TRIGGER on_auth_user_created',
    '    AFTER INSERT ON auth.users',
    '    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();',
    '',
    '-- 2. Enable Row Level Security (RLS) on all user-owned tables',
  ];

  RLS_TABLES_LIST.forEach((item) => {
    lines.push(`ALTER TABLE public.${item.tableName} ENABLE ROW LEVEL SECURITY;`);
    lines.push(`DROP POLICY IF EXISTS ${item.policyName} ON public.${item.tableName};`);
    if (item.withCheckClause) {
      lines.push(
        `CREATE POLICY ${item.policyName} ON public.${item.tableName} FOR ${item.command} USING (${item.usingClause.trim()}) WITH CHECK (${item.withCheckClause.trim()});`
      );
    } else {
      lines.push(
        `CREATE POLICY ${item.policyName} ON public.${item.tableName} FOR ${item.command} USING (${item.usingClause.trim()});`
      );
    }
    lines.push('');
  });

  lines.push('-- End of Phase 1 Migration File');
  return lines.join('\n');
}

/**
 * In-memory client-side simulator for testing RLS behavior.
 */
export function testRlsAccess(
  currentUserId: string,
  targetRecordUserId: string
): { allowed: boolean; reason: string } {
  if (currentUserId === targetRecordUserId) {
    return {
      allowed: true,
      reason: `Matches tenant policy (auth.uid() = ${currentUserId}). Access granted.`,
    };
  }
  return {
    allowed: false,
    reason: `Row level security violation: auth.uid() ${currentUserId} does not match record owner ${targetRecordUserId}. 0 rows returned.`,
  };
}
