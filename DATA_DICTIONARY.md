# 📖 DATA_DICTIONARY.md — Authoritative Data Dictionary

> **Status:** LOCKED — Phase 0 Canonical Specification  
> **Database:** PostgreSQL (Supabase Engine)  
> **Currency Unit:** `BDT` (Stored exact in `NUMERIC(14,2)` or larger)  
> **Timezone:** `Asia/Dhaka`

---

## 1. Core Identity & Ledger Tables

### 1.1 `profiles`
Represents the user's primary application identity, financial settings, and tenant anchor.

| Column | Type | Nullable | Default | Constraints / Foreign Keys | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | None | PRIMARY KEY, REFERENCES `auth.users(id)` ON DELETE CASCADE | Unique user identifier synced with Supabase Auth |
| `full_name` | `VARCHAR(128)` | NO | None | None | User's full legal name |
| `base_currency` | `VARCHAR(3)` | NO | `'BDT'` | `CHECK (LENGTH(base_currency) = 3)` | Base accounting currency (locked to BDT for v1) |
| `timezone` | `VARCHAR(64)` | NO | `'Asia/Dhaka'` | None | User's operational timezone for daily snapshots & reporting |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Profile creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Last update timestamp |

---

### 1.2 `accounts`
Stores financial asset, liability, and sub-ledger holding accounts. Does NOT store mutable balances.

| Column | Type | Nullable | Default | Constraints / Foreign Keys | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY | Unique account identifier |
| `user_id` | `UUID` | NO | None | FOREIGN KEY -> `profiles(id)` ON DELETE CASCADE | Tenant isolation |
| `name` | `VARCHAR(128)` | NO | None | None | Display title (e.g., "City Bank Savings", "BRAC CC") |
| `account_type` | `VARCHAR(32)` | NO | None | `CHECK (account_type IN ('cash', 'bank', 'mobile_wallet', 'credit_card', 'fd', 'dps', 'receivable', 'payable', 'loan', 'asset', 'liability'))` | Canonical classification |
| `currency` | `VARCHAR(3)` | NO | `'BDT'` | None | Account currency |
| `institution_name` | `VARCHAR(128)` | YES | NULL | None | Bank / MFS / Broker name |
| `account_number_mask` | `VARCHAR(32)` | YES | NULL | None | Masked number (e.g. `**** 4092`) |
| `credit_limit` | `NUMERIC(14,2)` | YES | NULL | `CHECK (credit_limit >= 0)` | Credit card limit or OD limit |
| `is_zakatable` | `BOOLEAN` | NO | `true` | None | Whether this account contributes to zakatable wealth |
| `is_archived` | `BOOLEAN` | NO | `false` | None | Soft toggle hiding account from active transaction pickers |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Last modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | YES | NULL | None | Soft-delete timestamp |

---

### 1.3 `categories`
Hierarchical income and expense classification categories. Used strictly for reporting.

| Column | Type | Nullable | Default | Constraints / Foreign Keys | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY | Unique category identifier |
| `user_id` | `UUID` | NO | None | FOREIGN KEY -> `profiles(id)` ON DELETE CASCADE | Tenant isolation |
| `name` | `VARCHAR(64)` | NO | None | None | Category name (e.g., "Groceries", "Salary", "Interest Income") |
| `type` | `VARCHAR(16)` | NO | None | `CHECK (type IN ('income', 'expense'))` | Direction classification |
| `icon` | `VARCHAR(64)` | YES | NULL | None | UI icon key |
| `color` | `VARCHAR(32)` | YES | NULL | None | Hex or theme color |
| `parent_category_id` | `UUID` | YES | NULL | FOREIGN KEY -> `categories(id)` ON DELETE SET NULL | Sub-category support |
| `is_system` | `BOOLEAN` | NO | `false` | None | System-reserved default category (e.g. Tax, Interest) |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Last modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | YES | NULL | None | Soft-delete timestamp |

---

### 1.4 `transactions`
The immutable economic event header.

| Column | Type | Nullable | Default | Constraints / Foreign Keys | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY | Unique transaction identifier |
| `user_id` | `UUID` | NO | None | FOREIGN KEY -> `profiles(id)` ON DELETE CASCADE | Tenant isolation |
| `date` | `DATE` | NO | None | None | Economic event date |
| `type` | `VARCHAR(32)` | NO | None | `CHECK (type IN ('expense', 'income', 'transfer', 'split_expense', 'cc_purchase', 'cc_payment', 'loan_disbursement', 'loan_emi', 'fd_open', 'fd_maturity', 'dps_installment', 'dps_maturity', 'broker_funding', 'broker_withdrawal', 'person_lend', 'person_borrow', 'asset_purchase', 'opening_balance', 'adjustment'))` | Event classification |
| `status` | `VARCHAR(16)` | NO | `'posted'` | `CHECK (status IN ('draft', 'posted', 'voided'))` | Financial lifecycle state |
| `version` | `INTEGER` | NO | `1` | `CHECK (version >= 1)` | Concurrency control & optimistic locking |
| `note` | `TEXT` | YES | NULL | None | Transaction memo / description |
| `linked_transaction_id` | `UUID` | YES | NULL | FOREIGN KEY -> `transactions(id)` ON DELETE RESTRICT | Self-reference for reversal or correction |
| `created_by` | `UUID` | NO | None | FOREIGN KEY -> `profiles(id)` ON DELETE CASCADE | Audit user link |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Timestamp transaction was created |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Timestamp transaction was modified |

---

### 1.5 `transaction_lines`
Atomic double-entry lines that enforce mathematical and ledger invariants.

| Column | Type | Nullable | Default | Constraints / Foreign Keys | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY | Unique line identifier |
| `transaction_id` | `UUID` | NO | None | FOREIGN KEY -> `transactions(id)` ON DELETE CASCADE | Parent header link |
| `line_type` | `VARCHAR(16)` | NO | None | `CHECK (line_type IN ('account', 'category'))` | Line role: account balance vs category reporting |
| `account_id` | `UUID` | YES | NULL | FOREIGN KEY -> `accounts(id)` ON DELETE RESTRICT | Target account (NOT NULL if line_type='account') |
| `category_id` | `UUID` | YES | NULL | FOREIGN KEY -> `categories(id)` ON DELETE RESTRICT | Target category (NOT NULL if line_type='category') |
| `amount` | `NUMERIC(14,2)` | NO | None | None | Signed monetary value |
| `memo` | `TEXT` | YES | NULL | None | Line-level item note |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | None | Creation timestamp |

---

## 2. Savings, Debt & Sub-Ledger Tables

### 2.1 `fixed_deposits`
Fixed Deposit sub-ledger metadata. The actual financial asset is held in `fd_account_id`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | NO | None | Tenant FK |
| `fd_account_id` | `UUID` | NO | None | UNIQUE FK -> `accounts(id)` (account_type='fd') |
| `source_account_id` | `UUID` | NO | None | FK -> `accounts(id)` (Bank funding account) |
| `principal_amount` | `NUMERIC(14,2)` | NO | None | Original investment amount |
| `interest_rate` | `NUMERIC(5,2)` | NO | None | Annual interest rate (e.g., 9.50%) |
| `tenure_months` | `INTEGER` | NO | None | Total duration in months |
| `start_date` | `DATE` | NO | None | FD start date |
| `maturity_date` | `DATE` | NO | None | Maturity date |
| `compounding_frequency`| `VARCHAR(16)` | NO | `'annually'` | monthly / quarterly / half_yearly / annually |
| `expected_maturity_amount` | `NUMERIC(14,2)` | NO | None | Projected total gross maturity amount |
| `tax_rate` | `NUMERIC(5,2)` | NO | `10.00` | Withholding tax percentage (10% with TIN, 15% without) |
| `status` | `VARCHAR(16)` | NO | `'active'` | active / matured / broken |

---

### 2.2 `dps_accounts` & `dps_installments`
Deposit Pension Scheme sub-ledger tracking periodic savings and maturity.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | NO | None | Tenant FK |
| `dps_account_id` | `UUID` | NO | None | UNIQUE FK -> `accounts(id)` (account_type='dps') |
| `source_account_id` | `UUID` | NO | None | FK -> `accounts(id)` (Bank funding account) |
| `monthly_installment` | `NUMERIC(14,2)` | NO | None | Fixed monthly commitment (e.g. 5,000.00) |
| `tenure_months` | `INTEGER` | NO | None | Duration in months (e.g. 36, 60, 120) |
| `interest_rate` | `NUMERIC(5,2)` | NO | None | Annual promised rate |
| `gross_interest` | `NUMERIC(14,2)` | NO | `0.00` | Total interest accrued |
| `net_interest` | `NUMERIC(14,2)` | NO | `0.00` | Interest after tax deduction |
| `status` | `VARCHAR(16)` | NO | `'active'` | active / matured / closed |

---

### 2.3 `loans`, `loan_payment_schedule` & `loan_payments`
Bank loans, mortgages, auto loans, and overdraft facilities.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | NO | None | Tenant FK |
| `loan_account_id` | `UUID` | NO | None | UNIQUE FK -> `accounts(id)` (account_type='loan') |
| `disbursement_account_id` | `UUID` | NO | None | FK -> `accounts(id)` (Bank receiving funds) |
| `loan_type` | `VARCHAR(32)` | NO | None | home / auto / personal / overdraft / business |
| `interest_method` | `VARCHAR(16)` | NO | None | `reducing` or `flat` |
| `rate_type` | `VARCHAR(16)` | NO | None | `fixed` or `variable` |
| `principal` | `NUMERIC(14,2)` | NO | None | Total sanctioned disbursement |
| `annual_interest_rate` | `NUMERIC(5,2)` | NO | None | Annual nominal interest rate |
| `tenure_months` | `INTEGER` | NO | None | Repayment duration |
| `emi_amount` | `NUMERIC(14,2)` | NO | None | Scheduled monthly EMI |
| `status` | `VARCHAR(16)` | NO | `'active'` | active / paid_off / restructured |

---

### 2.4 `debts` (Peer-to-Peer Loans)
Tracking lent and borrowed funds with friends, relatives, and colleagues.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | NO | None | Tenant FK |
| `linked_account_id` | `UUID` | NO | None | UNIQUE FK -> `accounts(id)` (receivable or payable) |
| `person_name` | `VARCHAR(128)` | NO | None | Name of the counterparty |
| `direction` | `VARCHAR(16)` | NO | None | `borrowed` (Payable) or `lent` (Receivable) |
| `initial_amount` | `NUMERIC(14,2)` | NO | None | Original principal amount |
| `status` | `VARCHAR(16)` | NO | `'active'` | active / settled / defaulted |

---

## 3. Stock Brokerage & Securities Tables

### 3.1 `broker_accounts` & `broker_cash_transactions`
The single authoritative cash sub-ledger for investment accounts.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | NO | None | Tenant FK |
| `broker_account_id` | `UUID` | NO | None | FK -> `broker_accounts(id)` |
| `transaction_date` | `DATE` | NO | None | Cash movement date |
| `type` | `VARCHAR(32)` | NO | None | `deposit`, `withdrawal`, `buy_gross`, `sell_gross`, `commission`, `tax`, `other_charge`, `dividend`, `adjustment` |
| `amount_signed` | `NUMERIC(14,2)` | NO | None | Signed amount (+ for cash in, - for cash out) |
| `source_event_key` | `VARCHAR(128)` | YES | NULL | UNIQUE idempotency key to prevent double funding |

---

### 3.2 `stock_transactions`
Records actual trade execution on DSE / CSE.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | NO | None | Tenant FK |
| `stock_id` | `UUID` | NO | None | FK -> `stocks(id)` |
| `broker_account_id` | `UUID` | NO | None | FK -> `broker_accounts(id)` |
| `transaction_type` | `VARCHAR(8)` | NO | None | `buy` or `sell` |
| `quantity` | `NUMERIC(14,2)` | NO | None | Number of shares |
| `price` | `NUMERIC(14,4)` | NO | None | Execution price per share |
| `gross_value` | `NUMERIC(14,2)` | NO | None | Quantity * Price |
| `commission` | `NUMERIC(14,2)` | NO | `0.00` | Broker commission fee |
| `tax` | `NUMERIC(14,2)` | NO | `0.00` | AIT / Capital gains tax |
| `other_charges` | `NUMERIC(14,2)` | NO | `0.00` | Central depository (CDBL) / exchange fee |
| `net_value` | `NUMERIC(14,2)` | NO | None | Buy: Gross + Charges \| Sell: Gross - Charges |

---

## 4. Derived & Authoritative View Mapping

| Derived Value | Authoritative Source View / Function | Formula / Logic |
|---|---|---|
| **Account Balance** | `v_account_balances` | `SUM(transaction_lines.amount)` WHERE `line_type='account'` AND `transactions.status='posted'` |
| **Broker Cash Balance** | `v_broker_cash_balance` | `SUM(broker_cash_transactions.amount_signed)` |
| **Stock Holdings & WAC** | `v_stock_holdings` | Remaining shares + Cumulative acquisition cost / total buy shares |
| **Realized P/L** | `stock_transactions` + WAC | `Net Sale Proceeds - (Sold Shares * WAC)` |
| **Unrealized P/L** | `v_stock_holdings` | `(Current Market Price - WAC) * Remaining Shares` |
| **Live Net Worth** | `v_net_worth` | `SUM(all canonical accounts) + Broker Cash + Stock Holdings MV` |
| **Portfolio XIRR** | `calculate_portfolio_xirr(user_id)` | Newton-Raphson on external deposits (-), withdrawals (+), ending value (+) |
| **Benchmark TWR** | `calculate_portfolio_twr(user_id)` | Geometric linking of external cash flow sub-periods |
