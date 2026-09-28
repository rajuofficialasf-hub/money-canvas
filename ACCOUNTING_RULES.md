# 🏛️ ACCOUNTING_RULES.md — Authoritative Accounting Rules & Invariants

> **Status:** LOCKED — Phase 0 Canonical Source of Truth  
> **Currency Baseline:** `BDT` (Stored exact in `NUMERIC(14,2)` or larger; multi-currency field preserved)  
> **Timezone Baseline:** `Asia/Dhaka`  
> **Principle:** The UI is NEVER a source of truth for financial balances, P/L, cost basis, XIRR, TWR, or Net Worth. All authoritative logic is derived deterministically from database ledger lines, views, and functions.

---

## 1. Ledger Model & Architecture

We utilize an exact, practical middle-path double-entry ledger:

```
transactions (Economic Event Header)
  └── transaction_lines (Signed Account & Category Lines)
```

### 1.1 `transactions` Header Table
An atomic economic event record:
- `id`: UUID (Primary Key)
- `user_id`: UUID (RLS Isolation)
- `date`: DATE (Business event date)
- `type`: VARCHAR(32) (`expense`, `income`, `transfer`, `split_expense`, `cc_purchase`, `cc_payment`, `loan_disbursement`, `loan_emi`, `fd_open`, `fd_maturity`, `dps_installment`, `dps_maturity`, `broker_funding`, `broker_withdrawal`, `person_lend`, `person_borrow`, `asset_purchase`, `adjustment`)
- `status`: VARCHAR(16) (`draft`, `posted`, `voided`)
- `version`: INTEGER (Optimistic locking for concurrency control)
- `note`: TEXT (Optional description)
- `linked_transaction_id`: UUID (Self-reference foreign key for reversals, refunds, and adjustments)
- `created_by`: UUID
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 1.2 `transaction_lines` Table
Individual monetary line entries for the transaction:
- `id`: UUID (Primary Key)
- `transaction_id`: UUID (Foreign Key -> `transactions.id` ON DELETE CASCADE)
- `line_type`: VARCHAR(16) CHECK (`line_type IN ('account', 'category')`)
- `account_id`: UUID (Foreign Key -> `accounts.id`, NULL if `line_type = 'category'`)
- `category_id`: UUID (Foreign Key -> `categories.id`, NULL if `line_type = 'account'`)
- `amount`: NUMERIC(14,2) NOT NULL (Strictly signed)
- `memo`: TEXT
- `created_at`: TIMESTAMPTZ

### 1.3 Line Mutual Exclusivity Constraint
A single line MUST NOT reference both an account and a category:
```sql
CONSTRAINT chk_line_type_exclusivity CHECK (
  (line_type = 'account'  AND account_id IS NOT NULL  AND category_id IS NULL) OR
  (line_type = 'category' AND category_id IS NOT NULL AND account_id IS NULL)
)
```

---

## 2. Strict Sign Conventions

### 2.1 Account Lines (`line_type = 'account'`)
Account lines determine the physical and legal balance of assets and liabilities:

| Account Classification / Event | Signed Amount in `transaction_lines` | Rationale |
|---|---:|---|
| **Asset / Cash Increase** (Deposit, Income received, Asset purchase) | `+` (Positive) | Assets represent positive claims/funds. |
| **Asset / Cash Decrease** (Withdrawal, Bill paid, Loan given) | `-` (Negative) | Reduction of available assets. |
| **Liability Increase** (Credit card spend, Loan borrowed, Overdraft) | `-` (Negative) | Liabilities are debts owed; signed negative in ledger. |
| **Liability Decrease** (Credit card bill pay, Loan EMI principal repayment) | `+` (Positive) | Repaying liability brings the negative balance closer to 0. |

### 2.2 Category Lines (`line_type = 'category'`)
Category lines exist **strictly for budget and income/expense reporting**. They NEVER impact account balances:

| Event | Signed Amount in `transaction_lines` | Reporting Effect |
|---|---:|---|
| **Expense** | `+` (Positive) | Increases reported expense for that category. |
| **Income** | `+` (Positive) | Increases reported income for that category. |
| **Expense Refund / Reversal** | `-` (Signed Negative in SAME category) | Directly cancels/reverses original expense amount. |
| **Income Reversal / Chargeback** | `-` (Signed Negative in SAME category) | Directly cancels/reverses original income amount. |

> **Crucial Rule:** Because category lines are signed, an expense refund of ৳1,000 recorded with `-1,000` against the `Shopping` category reduces total `Shopping` expense by ৳1,000. It does NOT invent an artificial income category.

---

## 3. Posted Transaction Invariants

Any transaction moving to `status = 'posted'` MUST satisfy its event-specific invariant. If violated, the database trigger or RPC MUST raise an exception and rollback.

| Transaction Type | Account Lines Total | Category Lines Requirement | Invariant Formula |
|---|---:|---|---|
| **Transfer** | `0.00` | No category lines allowed | `SUM(amount WHERE line_type='account') = 0` |
| **Expense** | `-X` | Category lines = `+X` | `SUM(account) + SUM(category) = 0` |
| **Income** | `+X` | Category lines = `+X` | `SUM(account) - SUM(category) = 0` |
| **Split Expense** | `-X` | Sum of category lines = `+X` | `SUM(account) + SUM(category) = 0` |
| **Expense Refund** | `+X` (Asset increase) | Category line = `-X` (Same category) | `SUM(account) + SUM(category) = 0` |
| **Loan Disbursement** | `0.00` (Bank +L, Loan -L) | No category lines | `Bank (+L) + Loan Account (-L) = 0` |
| **Loan EMI Repayment** | `-EMI` (Bank) + `Principal` (Loan) | Category = `+Interest` | `Bank (-EMI) + Loan (+Principal) + Category (+Interest) = 0` |

---

## 4. Standard Transaction Examples

### 4.1 Cash Expense (Grocery ৳2,000 from Cash)
```text
Category: Groceries       +2,000.00  (line_type=category)
Account:  Cash on Hand    -2,000.00  (line_type=account)
Net Account Total: -2,000.00 | Net Expense Total: +2,000.00
```

### 4.2 Salary Income (৳100,000 into Bank)
```text
Category: Salary Income   +100,000.00  (line_type=category)
Account:  City Bank        +100,000.00  (line_type=account)
Net Account Total: +100,000.00 | Net Income Total: +100,000.00
```

### 4.3 Transfer (৳10,000 from Bank to bKash)
```text
Account:  City Bank       -10,000.00  (line_type=account)
Account:  bKash Wallet    +10,000.00  (line_type=account)
Sum of Account Lines: 0.00
```

### 4.4 Credit Card Purchase (Restaurant ৳3,500 on SCB Card)
```text
Category: Dining Out      +3,500.00  (line_type=category)
Account:  SCB Credit Card -3,500.00  (line_type=account, liability increases)
Net Card Balance Effect: -3,500.00
```

### 4.5 Credit Card Bill Payment (Pay ৳3,500 bill from City Bank)
```text
Account:  City Bank       -3,500.00  (line_type=account, asset decreases)
Account:  SCB Credit Card +3,500.00  (line_type=account, liability decreases towards 0)
Sum of Account Lines: 0.00
```

### 4.6 Expense Refund (৳1,000 returned to Cash for returned item)
```text
Account:  Cash on Hand    +1,000.00  (line_type=account)
Category: Groceries       -1,000.00  (line_type=category, reverses expense)
linked_transaction_id: <original_expense_id>
```

### 4.7 Person Lend (Lend ৳20,000 to Friend Rahim)
```text
Account:  Cash on Hand         -20,000.00  (line_type=account)
Account:  Receivable: Rahim    +20,000.00  (line_type=account, asset increases)
Sum of Account Lines: 0.00
```

### 4.8 Person Borrow (Borrow ৳50,000 from Brother)
```text
Account:  Bank Account         +50,000.00  (line_type=account)
Account:  Payable: Brother     -50,000.00  (line_type=account, liability increases)
Sum of Account Lines: 0.00
```

---

## 5. Lifecycle, Corrections & Immutability

```
draft  ──(post)──>  posted  ──(reverse)──>  voided (financial effect neutralized)
```

1. **Draft Transactions**:
   - May be updated or deleted freely.
   - Have **zero effect** on balances, reports, or Net Worth.

2. **Posted Transactions**:
   - **IMMUTABLE**: Never updated or deleted in place.
   - Balance changes require a **Reversal Transaction** (`linked_transaction_id` points to original).
   - If a transaction had errors, a complete opposite reversal is posted, and a corrected new transaction is posted.
   - The original transaction status is updated to `voided` only when a valid reversal is executed.

3. **Opening Balance Rule**:
   - Account opening balance is created as the very first **Posted Transaction** of type `opening_balance`.
   - `accounts` table has NO mutable `current_balance` or `opening_balance` column that can drift.

---

## 6. Sub-Ledgers & Canonical Account Links

All sub-modules (FD, DPS, Loans, Debts, Physical Assets) link to a canonical `accounts` row:

| Sub-Module Table | Link Column | Target Table | Account Type |
|---|---|---|---|
| `fixed_deposits` | `fd_account_id` | `accounts(id)` | `fd` |
| `dps_accounts` | `dps_account_id` | `accounts(id)` | `dps` |
| `debts` | `linked_account_id` | `accounts(id)` | `receivable` or `payable` |
| `loans` | `loan_account_id` | `accounts(id)` | `loan` |
| `assets` (Physical) | `asset_account_id` | `accounts(id)` | `asset` |
| `liabilities` | `liability_account_id` | `accounts(id)` | `liability` |

### Physical Asset Architecture
- Metadata (property deeds, vehicle VIN, gold purity, storage location) resides in `assets`.
- The financial valuation is held in the linked `accounts` row (`asset_account_id`).
- Net Worth queries ONLY the canonical `accounts` row. Metadata tables never store a competing balance.

---

## 7. Authoritative Net Worth Calculation

```
Net Worth = 
    SUM(canonical asset/liability account balances from v_account_balances)
  + Broker Cash Balance (from v_broker_cash_balance)
  + Current Market Value of Stock Holdings (from v_stock_holdings)
```

### ⚠️ Liability Double-Counting Prevention Rule
Because liability accounts (Credit Cards, Bank Loans, Payables) naturally hold **NEGATIVE balances** in `v_account_balances`, we **DO NOT subtract liabilities again**.

$$\text{Net Worth} = \sum_{\text{all canonical accounts}} \text{balance} + \text{Broker Cash} + \text{Stock Market Value}$$

*Example:*
- Bank Account: `+100,000`
- Fixed Deposit: `+500,000`
- Credit Card: `-25,000`
- Bank Loan: `-300,000`
- Broker Cash: `+50,000`
- Stock Holdings Market Value: `+200,000`

$$\text{Net Worth} = 100,000 + 500,000 + (-25,000) + (-300,000) + 50,000 + 200,000 = \text{৳}525,000.00$$

---

## 8. Broker Cash & Stock Transactions

### 8.1 Single Source of Truth
`broker_cash_transactions` is the sole authoritative sub-ledger for broker cash. `broker_accounts.cash_balance` is a computed view (`v_broker_cash_balance`), NOT a mutable column.

### 8.2 Detailed Row Convention on Buy / Sell
When a stock trade occurs, the system records detailed component cash rows:

#### Buy Order
- `Gross Value`: `-gross_value`
- `Commission`: `-commission`
- `Tax`: `-tax`
- `Other Charges`: `-other_charges`

#### Sell Order
- `Gross Value`: `+gross_value`
- `Commission`: `-commission`
- `Tax`: `-tax`
- `Other Charges`: `-other_charges`

#### Cash Dividend
- `Gross Dividend`: `+gross_dividend`
- `Tax Withheld`: `-tax`

### 8.3 Weighted Average Cost (WAC)
All stock positions use Weighted Average Cost:
- **Buy Cost Basis** = $\text{Gross Buy Value} + \text{Commission} + \text{Tax} + \text{Other Charges}$
- **Cost Per Share** = $\frac{\text{Total Cumulative Cost Basis}}{\text{Total Shares Held}}$
- **Sell Proceeds** = $\text{Gross Sell Value} - \text{Commission} - \text{Tax} - \text{Other Charges}$
- **Realized P/L** = $\text{Net Sale Proceeds} - (\text{Shares Sold} \times \text{Weighted Average Cost Per Share})$

---

## 9. Loan Interest & Amortization

### 9.1 Two Dimensions
- `interest_method`: `reducing` | `flat`
- `rate_type`: `fixed` | `variable`

### 9.2 Reducing Rate Monthly EMI Formula
$$\text{EMI} = P \times \frac{r(1+r)^n}{(1+r)^n - 1}$$
Where:
- $P$ = Principal
- $r$ = Monthly interest rate ($\frac{\text{Annual Rate}}{12}$)
- $n$ = Total number of monthly installments

### 9.3 Variable-Rate Versioning Rule
When an interest rate changes on a variable loan:
1. Past paid installments remain completely immutable.
2. An updated amortization schedule is generated under `version = version + 1` starting from the effective rate-change date.
3. Prior schedule versions are preserved for historical audit.

### 9.4 EMI Payment Posting
Each EMI payment creates an atomic transaction:
```text
Account:  Bank Account        -10,000.00  (Asset decreases by full EMI)
Account:  Loan Account         +8,200.00  (Principal paid reduces debt)
Category: Interest Expense     +1,800.00  (Reported expense for interest)
```

---

## 10. Savings Goals, FD & DPS Rules

### 10.1 Savings Goals Modes
1. `tracking_goal`: Tracks progress against general savings without moving money. Goal contribution is NOT an expense.
2. `linked_savings_account_goal`: Has a dedicated `accounts` row. Contributions are standard Transfers from a funding account.

### 10.2 Fixed Deposit (FD)
- **FD Creation**: Transfer from Source Bank to FD Account (`fd_account_id`).
- **Maturity Payout**:
  - Principal Transfer: FD Account `-Principal` $\rightarrow$ Source Bank `+Principal`.
  - Interest Income: Source Bank `+Net Interest`, Category `Interest Income` `+Gross Interest`, Category `Tax Expense` `+Tax`.
- **Pre-Maturity Valuation**: Net Worth counts ONLY the guaranteed Principal. Accrued interest is shown purely as an informational projection.

### 10.3 DPS (Deposit Pension Scheme)
- **Monthly Installment**: Transfer from Source Bank to DPS Account (`dps_account_id`).
- **Maturity Payout**:
  1. Principal Transfer: DPS Account `-Total Principal` $\rightarrow$ Source Bank `+Total Principal`.
  2. Net Interest Income: Source Bank `+Net Interest`, Category `Interest Income` `+Gross Interest`, Category `Tax Expense` `+Tax`.

---

## 11. Performance Returns: XIRR & TWR

### 11.1 Portfolio XIRR (Money-Weighted Investor Return)
Measures the investor's actual internal rate of return based **strictly on external cash flows**:
- External Deposit to Broker: `-Deposit`
- External Withdrawal from Broker: `+Withdrawal`
- External Dividend Payout (taken outside portfolio): `+Dividend`
- Ending Portfolio Value: `+Current Value`
- **EXCLUDED from Portfolio XIRR:**
  - Internal Buy / Sell transactions (these occur inside the portfolio boundary).
  - Retained / Reinvested Dividends (these are already embedded in the ending portfolio valuation; counting them as a positive cash flow causes double-counting).

### 11.2 Benchmark Comparison via TWR (Time-Weighted Return)
To compare fairly against the DSEX index, Time-Weighted Return (TWR) neutralizes the timing of cash injections:
- Sub-periods are formed at each external deposit/withdrawal date.
- Sub-period return: $R_i = \frac{V_{\text{end}, i}}{V_{\text{begin}, i} + \text{CashFlow}_i} - 1$
- Overall TWR: $\prod (1 + R_i) - 1$
- Both Portfolio TWR and DSEX are indexed to `100.00` at the inception date.

---

## 12. Audit Log & Deletion Protocols

1. **Audit Logs Immutability**:
   - `audit_logs` is strictly `INSERT-only` in normal operations.
   - Any modification or deletion attempt is blocked by database trigger.

2. **Privileged Account Deletion Sequence**:
   To satisfy privacy regulations and ensure zero orphan records:
   ```
   1. Delete user-owned storage objects (receipts, statements)
   2. Purge user transactional and sub-ledger data (CASCADE)
   3. Purge user audit logs (Privileged documented exception)
   4. Delete user profile and Auth identity
   5. Invalidate active sessions and sign out
   ```
