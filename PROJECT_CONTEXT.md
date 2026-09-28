# 📌 PROJECT_CONTEXT.md — Personal Finance & Investment Manager

> **Specification Version:** Build Plan v5  
> **Current Phase:** Phase 4 Completed & Verified  
> **Next Phase:** Phase 5 — Stock Core + Broker Cash (Brokers, BO Accounts, Broker Cash Ledger, Stock Trades with Lock 4 Charges)  
> **Source of Truth Documents:**  
> - `/ACCOUNTING_RULES.md` (Authoritative Accounting Logic)  
> - `/ERD.md` (Relational Schema & Views)  
> - `/DATA_DICTIONARY.md` (Exhaustive Column Definitions)  
> - `/ACCOUNTING_TEST_CASES.md` (17 Manual & Automated Test Cases)

---

## 1. Locked Decisions (v5 Master Lock)

1. **Net Worth Sign Rule Locked:**
   - Liability account balances are stored and derived as **negative numbers**.
   - Net Worth formula: $\sum \text{canonical account balances} + \text{Broker Cash} + \text{Stock Market Value}$.
   - Liabilities are **never subtracted a second time**.

2. **Physical Asset / Liability Architecture Locked:**
   - Metadata lives in `assets` or `liabilities`.
   - Authoritative valuation balance lives in a linked row in `accounts` (`asset_account_id` / `liability_account_id`).
   - Financial value is never duplicated in two places.

3. **Savings Goal Modes Locked:**
   - `tracking_goal`: Visual progress tracker against general savings. No separate account; contributions are not expenses.
   - `linked_savings_account_goal`: Dedicated `accounts` row; contributions are standard double-entry Transfers.

4. **Stock Trade Charges Locked:**
   - Buy Cost Basis = $\text{Gross Value} + \text{Commission} + \text{Tax} + \text{Other Charges}$.
   - Sell Net Proceeds = $\text{Gross Value} - \text{Commission} - \text{Tax} - \text{Other Charges}$.
   - Realized P/L = $\text{Net Sale Proceeds} - (\text{Shares Sold} \times \text{Weighted Average Cost})$.

5. **Loan Schedule Versioning Locked:**
   - Variable interest rate adjustments create a new amortization schedule version (`version = version + 1`).
   - Prior schedule versions remain completely immutable.

6. **Refund & Reporting Locked:**
   - Category lines are signed.
   - Expense refunds are recorded as negative amounts in the same expense category.
   - Cancels the original expense in reporting without manufacturing artificial income.

7. **Portfolio Return Locked:**
   - Portfolio XIRR considers **external contributions and distributions only**.
   - Internal trades, broker transfers, and retained dividends are excluded to prevent double counting.
   - Benchmark comparison uses Time-Weighted Return (TWR) indexed to 100 with DSEX.

---

## 2. Phase Execution Status

| Phase | Title | Status | Deliverables |
|---|---|---|---|
| **Phase 0** | Accounting & Data Architecture Lock | **DONE** | `ACCOUNTING_RULES.md`, `ERD.md`, `DATA_DICTIONARY.md`, `ACCOUNTING_TEST_CASES.md`, `PROJECT_CONTEXT.md` |
| **Phase 1** | Foundation: Setup + Auth + Layout | **DONE** | React/Vite SPA Shell, AuthContext, profiles, RLS template & SQL generator, responsive layout, settings |
| **Phase 2** | Finance Core: Ledger + Accounts + FD | **DONE** | Canonical accounts registry, double-entry ledger (`transactions` + `transaction_lines`), `v_account_balances` invariant engine, immutable reversals, Fixed Deposits lifecycle (funding, compound returns, withholding tax, maturity, early break) |
| **Phase 3** | Budget + Recurring + Goals + DPS | **DONE** | Monthly category budgets with live variance tracking, copy-to-next-month, recurring schedules with auto-post / run-now / pause, Lock 3 dual-mode goals (virtual tracking vs linked account transfer), DPS compound monthly sub-ledger with full amortization schedule, installment payments, and maturity settlement |
| **Phase 4** | Debt/Loan + Net Worth + Zakat | **DONE** | Peer debts sub-ledger, bank loans & reducing-rate amortization schedules (versioned), physical assets with Lock 2 canonical account valuation & multi-source financing, static liabilities, Lock 1 net worth consolidation, Shariah Zakat assessment & disbursement |
| **Phase 5** | Stock Core + Broker Cash | **DONE** | brokers, broker_accounts, broker_cash_transactions, stocks, buy/sell trades with charges (Lock 4) |
| **Phase 6** | Portfolio + History + XIRR + TWR | **DONE** | v_stock_holdings, stock_price_history, XIRR, TWR, DSEX Alpha, benchmark comparison (Lock 7) |
| **Phase 7** | Dividend + Corporate Actions | **DONE** | dividends, corporate_actions (bonus dilution, split, rights), IPO quota management & settlement |
| **Phase 8** | Analytics + Capital Gains + Reports | **IN PROGRESS** | Sector allocation, NBR capital gains tax, AIT/TDS reconciliation, P&L, Balance Sheet, CSV/PDF reports |
| **Phase 9** | Utility + Security + Notifications | Pending | Search, attachments, pg_cron alerts, audit immutability |
| **Phase 10** | Native Mobile App (React Native/Expo)| Pending | Expo app, offline read cache, conflict review |
| **Phase 11** | Google Play Store Launch Prep | Pending | Privacy policy, account deletion, Play Console assets |
| **Phase 12** | Advanced Intelligence & Integrations | Future | AI statement parser, live DSE feed, OCR receipts |

---

## 3. Directory Layout & Architecture

```
/
├── ACCOUNTING_RULES.md
├── ERD.md
├── DATA_DICTIONARY.md
├── ACCOUNTING_TEST_CASES.md
├── PROJECT_CONTEXT.md
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx
    ├── types/
    │   ├── accounting.ts
    │   └── auth.ts
    ├── lib/
    │   ├── accounting-engine.ts
    │   ├── auth-context.tsx
    │   ├── rls-policies.ts
    │   └── test-runner.ts
    └── components/
        ├── TopNavigation.tsx
        ├── ArchitectureViewer.tsx
        ├── SchemaVisualizer.tsx
        ├── DataDictionaryBrowser.tsx
        ├── TestRunnerConsole.tsx
        ├── LedgerSandbox.tsx
        ├── CommandPalette.tsx
        ├── layout/
        │   ├── Header.tsx
        │   └── Sidebar.tsx
        └── views/
            ├── DashboardView.tsx
            ├── RlsInspectorView.tsx
            └── SettingsView.tsx
```
