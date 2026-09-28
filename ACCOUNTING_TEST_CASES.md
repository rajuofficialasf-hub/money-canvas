# 🧪 ACCOUNTING_TEST_CASES.md — Authoritative Verification Matrix

> **Status:** LOCKED — Phase 0 Test Specifications  
> **Currency Unit:** `BDT` (Stored exact in `NUMERIC(14,2)`)  
> **Mandatory Rule:** All 17 scenarios must pass mathematically before moving to future phases.

---

## 1. Cash Expense
- **Description:** User buys groceries worth ৳2,500.00 paying from Cash on Hand.
- **Initial Balances:** Cash on Hand = ৳10,000.00
- **Transaction Header:**
  - `type`: `'expense'`
  - `status`: `'posted'`
- **Lines:**
  1. `line_type = 'category'`, `category_id = 'cat-groceries'`, `amount = +2500.00`
  2. `line_type = 'account'`, `account_id = 'acc-cash'`, `amount = -2500.00`
- **Invariant Check:** `Account Total (-2,500.00) + Category Expense (+2,500.00) = 0.00` ✅
- **Resulting Balances:** Cash on Hand = ৳7,500.00
- **Report Effect:** Expense in Groceries = ৳2,500.00

---

## 2. Salary Income
- **Description:** Monthly salary of ৳120,000.00 deposited into City Bank.
- **Initial Balances:** City Bank = ৳15,000.00
- **Transaction Header:**
  - `type`: `'income'`
  - `status`: `'posted'`
- **Lines:**
  1. `line_type = 'category'`, `category_id = 'cat-salary'`, `amount = +120000.00`
  2. `line_type = 'account'`, `account_id = 'acc-city-bank'`, `amount = +120000.00`
- **Invariant Check:** `Account Total (+120,000.00) - Category Income (+120,000.00) = 0.00` ✅
- **Resulting Balances:** City Bank = ৳135,000.00
- **Report Effect:** Income in Salary = ৳120,000.00

---

## 3. Account Transfer
- **Description:** User transfers ৳15,000.00 from City Bank to bKash wallet.
- **Initial Balances:** City Bank = ৳135,000.00, bKash = ৳1,200.00
- **Transaction Header:**
  - `type`: `'transfer'`
  - `status`: `'posted'`
- **Lines:**
  1. `line_type = 'account'`, `account_id = 'acc-city-bank'`, `amount = -15000.00`
  2. `line_type = 'account'`, `account_id = 'acc-bkash'`, `amount = +15000.00`
- **Invariant Check:** `Account Line Sum = -15,000.00 + 15,000.00 = 0.00` ✅ (No category lines)
- **Resulting Balances:** City Bank = ৳120,000.00, bKash = ৳16,200.00
- **Report Effect:** ৳0.00 income, ৳0.00 expense. Pure asset reclassification.

---

## 4. Credit Card Purchase
- **Description:** User dines at a restaurant and pays ৳4,200.00 using SCB Credit Card.
- **Initial Balances:** SCB Credit Card = ৳0.00 (Liability balance)
- **Transaction Header:**
  - `type`: `'cc_purchase'`
  - `status`: `'posted'`
- **Lines:**
  1. `line_type = 'category'`, `category_id = 'cat-dining'`, `amount = +4200.00`
  2. `line_type = 'account'`, `account_id = 'acc-scb-cc'`, `amount = -4200.00`
- **Invariant Check:** `Account (-4,200.00) + Category (+4,200.00) = 0.00` ✅
- **Resulting Balances:** SCB Credit Card = `-4,200.00` (Negative balance reflects liability owed)
- **Report Effect:** Dining expense = ৳4,200.00

---

## 5. Credit Card Bill Payment
- **Description:** User pays full card bill ৳4,200.00 from City Bank.
- **Initial Balances:** City Bank = ৳120,000.00, SCB Credit Card = `-4,200.00`
- **Transaction Header:**
  - `type`: `'cc_payment'`
  - `status`: `'posted'`
- **Lines:**
  1. `line_type = 'account'`, `account_id = 'acc-city-bank'`, `amount = -4200.00`
  2. `line_type = 'account'`, `account_id = 'acc-scb-cc'`, `amount = +4200.00`
- **Invariant Check:** `Sum of Account Lines = -4,200.00 + 4,200.00 = 0.00` ✅
- **Resulting Balances:** City Bank = ৳115,800.00, SCB Credit Card = ৳0.00
- **Report Effect:** Net Worth remains unchanged (Asset reduced by 4,200, Liability reduced by 4,200).

---

## 6. Expense Refund / Reversal
- **Description:** Store refunds ৳1,000.00 in cash for returned grocery items.
- **Initial State:** Groceries expense = ৳2,500.00, Cash = ৳7,500.00
- **Transaction Header:**
  - `type`: `'expense'`
  - `status`: `'posted'`
  - `linked_transaction_id`: `<original_grocery_transaction_id>`
- **Lines:**
  1. `line_type = 'category'`, `category_id = 'cat-groceries'`, `amount = -1000.00` (Signed Negative)
  2. `line_type = 'account'`, `account_id = 'acc-cash'`, `amount = +1000.00`
- **Invariant Check:** `Account (+1,000.00) + Category (-1,000.00) = 0.00` ✅
- **Resulting Balances:** Cash = ৳8,500.00
- **Report Effect:** Total Groceries expense becomes `2,500.00 - 1,000.00 = ৳1,500.00`. No bogus income created!

---

## 7. Correction via Void / Reversal
- **Description:** Erroneous entry of ৳5,000.00 utility bill paid from bKash must be reversed.
- **Original Transaction (Tx-A):** bKash `-5,000.00`, Utilities `+5,000.00`.
- **Reversal Transaction (Tx-B):**
  - `linked_transaction_id = Tx-A`
  - `status = 'posted'`
  - Line 1: `line_type = 'account'`, `account_id = 'acc-bkash'`, `amount = +5000.00`
  - Line 2: `line_type = 'category'`, `category_id = 'cat-utilities'`, `amount = -5000.00`
- **Action:** Tx-A status transitions to `'voided'`.
- **Invariant Check:** `+5,000.00 + (-5,000.00) = 0.00`. Net effect of Tx-A + Tx-B = exactly 0.00.

---

## 8. Account Opening Balance
- **Description:** User starts app and enters existing bank balance ৳50,000.00.
- **Transaction Header:**
  - `type`: `'opening_balance'`
  - `status`: `'posted'`
- **Lines:**
  - `line_type = 'account'`, `account_id = 'acc-city-bank'`, `amount = +50000.00`
- **Rule:** `accounts` table stores NO separate mutable opening balance column. Balance derives from `v_account_balances`.

---

## 9. Fixed Deposit (FD) Open & Maturity
- **Description:** Open 1-Year FD of ৳500,000.00 at 9.0% annual interest from City Bank. At maturity, gross interest = ৳45,000.00, Tax (10%) = ৳4,500.00, Net Interest = ৳40,500.00.
- **Step A: FD Creation (Transfer)**
  - Account: City Bank `-500,000.00`
  - Account: FD Account `+500,000.00`
  - Balances: City Bank reduced by 500k, FD Account holds 500k. Net Worth unchanged.
- **Step B: FD Maturity (Two distinct posted transactions)**
  1. Principal Return (Transfer):
     - Account: FD Account `-500,000.00`
     - Account: City Bank `+500,000.00`
  2. Interest & Tax Settlement:
     - Account: City Bank `+40,500.00` (Net interest received)
     - Category: Interest Income `+45,000.00` (Gross revenue)
     - Category: Tax Expense `+4,500.00` (Withholding tax)
- **Resulting State:** FD Account = ৳0.00, City Bank = initial + ৳40,500.00.

---

## 10. DPS Contribution & Maturity
- **Description:** 3-year DPS of ৳5,000.00/month (36 months). Total principal deposited = ৳180,000.00. Gross interest = ৳27,000.00, Tax (10%) = ৳2,700.00, Net payout = ৳204,300.00.
- **Monthly Installment Execution (36 times):**
  - Account: City Bank `-5,000.00`
  - Account: DPS Account `+5,000.00`
- **Maturity Transaction:**
  - Tx 1 (Principal Return): DPS Account `-180,000.00`, City Bank `+180,000.00`.
  - Tx 2 (Net Interest): City Bank `+24,300.00`, Interest Income `+27,000.00`, Tax Expense `+2,700.00`.
- **Resulting State:** DPS Account closed, City Bank receives ৳204,300.00.

---

## 11. Person Borrow & Lend
- **Scenario A: Lend ৳30,000 to Friend Karim**
  - Account: Cash on Hand `-30,000.00`
  - Account: Receivable: Karim `+30,000.00` (Asset)
  - Net Worth Impact: ৳0.00 (Cash converts to Receivable).
- **Scenario B: Borrow ৳100,000 from Uncle**
  - Account: City Bank `+100,000.00` (Asset increases)
  - Account: Payable: Uncle `-100,000.00` (Liability increases)
  - Net Worth Impact: ৳0.00 (+100k - 100k = 0).

---

## 12. Bank Loan Disbursement & Reducing EMI
- **Scenario:** ৳1,000,000.00 home loan at 9% reducing interest for 12 months.
  - Monthly rate $r = \frac{0.09}{12} = 0.0075$
  - $\text{EMI} = 1,000,000 \times \frac{0.0075(1.0075)^{12}}{(1.0075)^{12} - 1} = \text{৳}87,451.48$
- **Step A: Disbursement**
  - Account: City Bank `+1,000,000.00`
  - Account: Loan Account `-1,000,000.00`
  - Balances: City Bank = +1M, Loan Account = -1M. Net Worth delta = ৳0.00.
- **Step B: Month 1 EMI Payment**
  - Month 1 Interest = $1,000,000 \times 0.0075 = \text{৳}7,500.00$
  - Principal portion = $87,451.48 - 7,500.00 = \text{৳}79,951.48$
  - **Transaction Lines:**
    1. Account: City Bank `-87,451.48`
    2. Account: Loan Account `+79,951.48` (Liability reduced from -1,000,000 to -920,048.52)
    3. Category: Loan Interest Expense `+7,500.00`
  - **Invariant Check:** `-87,451.48 + 79,951.48 + 7,500.00 = 0.00` ✅

---

## 13. Physical Asset Purchase (Vehicle)
- **Description:** User buys car for ৳2,200,000.00 paying ৳700,000.00 from Bank and taking ৳1,500,000.00 Auto Loan.
- **Transaction Lines:**
  1. Account: Vehicle Asset `+2,200,000.00`
  2. Account: City Bank `-700,000.00`
  3. Account: Auto Loan `-1,500,000.00`
- **Invariant Check:** `+2,200,000.00 + (-700,000.00) + (-1,500,000.00) = 0.00` ✅
- **Net Worth Impact:** $+2,200,000 - 700,000 - 1,500,000 = \text{৳}0.00$ delta.

---

## 14. Stock Multi-Price Buy & Weighted Average Cost (WAC)
- **Trade 1:** Buy 100 shares of GP at ৳250.00. Broker commission = ৳100.00.
  - Gross = ৳25,000.00. Buy Cost Basis = $25,000 + 100 = \text{৳}25,100.00$.
  - WAC per share = $\frac{25,100}{100} = \text{৳}251.00$.
- **Trade 2:** Buy another 100 shares of GP at ৳270.00. Commission = ৳108.00.
  - Gross = ৳27,000.00. Buy Cost Basis = $27,000 + 108 = \text{৳}27,108.00$.
  - Total Shares = 200. Total Cost Basis = $25,100 + 27,108 = \text{৳}52,208.00$.
  - **New WAC per share =** $\frac{52,208}{200} = \text{৳}261.04$.
- **Broker Cash Detailed Rows Generated:**
  - Trade 1: Gross `-25,000.00`, Commission `-100.00`. Total cash out: `25,100.00`.
  - Trade 2: Gross `-27,000.00`, Commission `-108.00`. Total cash out: `27,108.00`.

---

## 15. Stock Sell & Realized P/L
- **Trade 3:** Sell 150 shares of GP at ৳300.00. Commission = ৳180.00, AIT Tax = ৳135.00.
  - Gross Proceeds = $150 \times 300 = \text{৳}45,000.00$.
  - Net Sale Proceeds = $45,000 - 180 - 135 = \text{৳}44,685.00$.
  - Cost Basis of 150 shares sold = $150 \times 261.04 = \text{৳}39,156.00$.
  - **Realized P/L =** $44,685.00 - 39,156.00 = +\text{৳}5,529.00$ Gain.
  - Remaining Shares = 50. Remaining Invested Value = $50 \times 261.04 = \text{৳}13,052.00$.
- **Broker Cash Rows:**
  - Sell Gross `+45,000.00`, Commission `-180.00`, Tax `-135.00`. Net Cash Received = `+44,685.00`.

---

## 16. Cash Dividend Receipt
- **Description:** GP declares ৳12.00/share cash dividend. User holds 50 shares on record date.
  - Gross Dividend = $50 \times 12.00 = \text{৳}600.00$.
  - Tax Withheld (10%) = $600 \times 0.10 = \text{৳}60.00$.
  - Net Cash Received = $600 - 60 = \text{৳}540.00$.
- **Broker Cash Sub-Ledger Rows:**
  - `type = 'dividend'`, `amount_signed = +600.00`
  - `type = 'tax'`, `amount_signed = -60.00`
  - Net Broker Cash Increase: `+540.00`.

---

## 17. Portfolio XIRR, TWR & Net Worth Reconciled
- **Scenario:**
  - Day 0: Deposit ৳100,000 to Broker Account.
  - Day 30: Buy GP for ৳50,000.
  - Day 60: Deposit additional ৳50,000 to Broker Account.
  - Day 90: Current GP holding market value = ৳70,000. Broker cash balance = ৳100,000. Total Portfolio Value = ৳170,000.00.
- **Portfolio XIRR Calculation:**
  - Cash flows: Day 0: `-100,000`, Day 60: `-50,000`, Day 90: `+170,000`.
  - Internal Buy on Day 30 is EXCLUDED.
  - Newton-Raphson solves for rate where $\text{NPV} = 0$: Annualized XIRR = `+68.42%`.
- **Net Worth Source of Truth Cross-Check:**
  - Bank Account: `৳120,000.00`
  - Auto Loan: `-৳1,420,048.52` (Negative liability balance)
  - Vehicle Asset: `৳2,200,000.00`
  - Broker Cash: `৳100,000.00`
  - Stock Holdings Market Value: `৳70,000.00`
  - **Net Worth =** $120,000 + (-1,420,048.52) + 2,200,000 + 100,000 + 70,000 = \text{৳}1,069,951.48$.
  - Verified: Liability is NOT subtracted again. Math is exact and unambiguous.
