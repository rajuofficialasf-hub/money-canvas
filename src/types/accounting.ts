/**
 * Personal Finance & Investment Manager — Authoritative Types
 * Strict typing reflecting PostgreSQL exact schemas
 */

export type AccountType = 
  | 'cash'
  | 'bank'
  | 'mobile_wallet'
  | 'credit_card'
  | 'fd'
  | 'dps'
  | 'receivable'
  | 'payable'
  | 'loan'
  | 'asset'
  | 'liability';

export type CategoryType = 'income' | 'expense';

export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'split_expense'
  | 'cc_purchase'
  | 'cc_payment'
  | 'loan_disbursement'
  | 'loan_emi'
  | 'fd_open'
  | 'fd_maturity'
  | 'dps_installment'
  | 'dps_maturity'
  | 'broker_funding'
  | 'broker_withdrawal'
  | 'person_lend'
  | 'person_borrow'
  | 'debt_settlement'
  | 'asset_purchase'
  | 'zakat_payment'
  | 'opening_balance'
  | 'adjustment';

export type TransactionStatus = 'draft' | 'posted' | 'voided';
export type LineType = 'account' | 'category';

export interface Account {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  currency: string;
  institutionName?: string;
  accountNumberMask?: string;
  creditLimit?: number;
  isZakatable: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parentCategoryId?: string | null;
  isSystem: boolean;
}

export interface NewCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parentCategoryId?: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  type: TransactionType;
  status: TransactionStatus;
  version: number;
  note?: string;
  linkedTransactionId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionLine {
  id: string;
  transactionId: string;
  lineType: LineType;
  accountId?: string | null;
  categoryId?: string | null;
  amount: number; // Signed numeric
  memo?: string;
  createdAt: string;
}

export interface AccountBalanceView {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  currency: string;
  currentBalance: number;
}

export interface BrokerAccount {
  id: string;
  userId: string;
  brokerId: string;
  boId: string;
  accountName: string;
  isDefault: boolean;
  createdAt: string;
}

export type BrokerCashTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'buy_gross'
  | 'sell_gross'
  | 'commission'
  | 'tax'
  | 'other_charge'
  | 'dividend'
  | 'adjustment';

export interface BrokerCashTransaction {
  id: string;
  userId: string;
  brokerAccountId: string;
  transactionDate: string;
  type: BrokerCashTransactionType;
  transactionType?: BrokerCashTransactionType;
  amountSigned: number;
  sourceEventKey?: string;
  linkedStockTransactionId?: string;
  sourceBankAccountId?: string;
  destinationBankAccountId?: string;
  note?: string;
  createdAt?: string;
}

export interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  sector: string;
  exchange: 'DSE' | 'CSE';
  currentPrice: number;
  ycp?: number;
  highPrice?: number;
  lowPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  category?: string;
  priceSource?: 'api' | 'manual';
  lastSyncedAt?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface StockHoldingView {
  stockId: string;
  symbol: string;
  companyName: string;
  sector: string;
  quantity: number;
  weightedAverageCost: number;
  currentMarketPrice: number;
  investedValue: number;
  marketValue: number;
  unrealizedPl: number;
  returnPercent: number;
}

export interface NetWorthView {
  accountsBalance: number;
  brokerCash: number;
  stockMarketValue: number;
  netWorth: number;
}

export type CompoundingFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annually';
export type FdStatus = 'active' | 'matured' | 'broken';

export interface FixedDeposit {
  id: string;
  userId: string;
  fdAccountId: string;
  sourceAccountId: string;
  institutionName: string;
  fdNumber?: string;
  principalAmount: number;
  interestRate: number; // e.g. 8.5 (%)
  tenureMonths: number;
  startDate: string;
  maturityDate: string;
  compoundingFrequency: CompoundingFrequency;
  expectedMaturityAmount: number;
  taxRate: number; // e.g. 10 (%)
  status: FdStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewAccountInput {
  name: string;
  accountType: AccountType;
  currency: string;
  institutionName?: string;
  accountNumberMask?: string;
  creditLimit?: number;
  isZakatable: boolean;
  initialBalance?: number;
}

export interface NewTransactionLineInput {
  lineType: LineType;
  accountId?: string;
  categoryId?: string;
  amount: number; // Signed amount
  memo?: string;
}

export interface NewTransactionInput {
  date: string;
  type: TransactionType;
  note?: string;
  lines: NewTransactionLineInput[];
}

export interface NewFdInput {
  sourceAccountId: string;
  institutionName: string;
  fdNumber?: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  compoundingFrequency: CompoundingFrequency;
  taxRate: number;
}

// ----------------------------------------------------
// Phase 3: Budgets, Recurring, Goals & DPS Types
// ----------------------------------------------------

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  monthYear: string; // 'YYYY-MM'
  allocatedAmount: number;
  warningThresholdPct: number; // default 90.00 (%)
  createdAt: string;
  rolloverEnabled?: boolean; // FEAT-8: opt-in surplus carry-forward per category/budget
  rolloverAmount?: number; // FEAT-8: carried over amount from previous month
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  userId: string;
  name: string;
  templateTransaction: NewTransactionInput;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextRun: string;
  lastRun?: string;
  isPaused: boolean;
  autoPost: boolean;
  createdAt: string;
}

export type GoalMode = 'tracking_goal' | 'linked_savings_account_goal';
export type GoalStatus = 'in_progress' | 'achieved' | 'cancelled';

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  goalMode: GoalMode;
  linkedAccountId?: string | null;
  status: GoalStatus;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  contributionDate: string;
  note?: string;
  createdAt: string;
}

export type DpsStatus = 'active' | 'matured' | 'closed';

export interface DpsAccount {
  id: string;
  userId: string;
  dpsAccountId: string;
  sourceAccountId: string;
  institutionName: string;
  dpsNumber?: string;
  monthlyInstallment: number;
  tenureMonths: number;
  interestRate: number;
  interestCalculationMethod: string;
  taxRate: number;
  grossInterest: number;
  netInterest: number;
  startDate: string;
  maturityDate: string;
  status: DpsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DpsInstallment {
  id: string;
  dpsAccountId: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount?: number;
  paidDate?: string;
  status: 'pending' | 'paid' | 'missed';
  transactionId?: string;
  createdAt: string;
}

export interface NewBudgetInput {
  categoryId: string;
  monthYear: string;
  allocatedAmount: number;
  warningThresholdPct?: number;
  rolloverEnabled?: boolean;
  rolloverAmount?: number;
}

export interface NewRecurringInput {
  name: string;
  templateTransaction: NewTransactionInput;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  autoPost?: boolean;
}

export interface NewGoalInput {
  name: string;
  targetAmount: number;
  targetDate: string;
  goalMode: GoalMode;
  linkedAccountId?: string;
  initialDeposit?: number;
  sourceAccountId?: string;
}

export interface NewDpsInput {
  sourceAccountId: string;
  institutionName: string;
  dpsNumber?: string;
  monthlyInstallment: number;
  tenureMonths: number;
  interestRate: number;
  startDate: string;
  taxRate?: number;
}

// ----------------------------------------------------
// Phase 4: Debts, Loans, Assets, Net Worth & Zakat
// ----------------------------------------------------

export type DebtDirection = 'borrowed' | 'lent';
export type DebtStatus = 'active' | 'settled' | 'defaulted';

export interface Debt {
  id: string;
  userId: string;
  linkedAccountId: string; // references account (type receivable or payable)
  personName: string;
  contactPhone?: string;
  direction: DebtDirection;
  initialAmount: number;
  dueDate?: string;
  status: DebtStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewDebtInput {
  personName: string;
  contactPhone?: string;
  direction: DebtDirection;
  initialAmount: number;
  sourceOrDestAccountId: string; // If lent: source bank/cash. If borrowed: dest bank/cash.
  dueDate?: string;
  notes?: string;
}

export type LoanType = 'home' | 'auto' | 'personal' | 'overdraft' | 'business';
export type LoanInterestMethod = 'reducing' | 'flat';
export type LoanRateType = 'fixed' | 'variable';
export type LoanStatus = 'active' | 'paid_off' | 'restructured';

export interface Loan {
  id: string;
  userId: string;
  loanAccountId: string; // canonical account (type loan)
  disbursementAccountId: string; // account where cash landed
  institutionName: string;
  loanType: LoanType;
  interestMethod: LoanInterestMethod;
  rateType: LoanRateType;
  principal: number;
  annualInterestRate: number; // in percentage e.g. 9.0
  tenureMonths: number;
  emiAmount: number;
  disbursementDate: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPaymentScheduleItem {
  id: string;
  loanId: string;
  version: number;
  installmentNumber: number;
  dueDate: string;
  scheduledPrincipal: number;
  scheduledInterest: number;
  scheduledEmiAmount: number;
  remainingPrincipalAfter: number;
  status: 'pending' | 'paid' | 'missed' | 'waived';
  transactionId?: string;
  paidDate?: string;
  createdAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  scheduleId?: string;
  transactionId: string;
  principalPortion: number;
  interestPortion: number;
  paymentDate: string;
  createdAt: string;
}

export interface NewLoanInput {
  institutionName: string;
  loanType: LoanType;
  interestMethod: LoanInterestMethod;
  rateType: LoanRateType;
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  disbursementAccountId: string;
  disbursementDate: string;
}

export type AssetCategory = 'real_estate' | 'vehicle' | 'gold_jewelry' | 'electronics' | 'other' | (string & {});
export type PhysicalAssetCategory = AssetCategory;

export type FundingMethod = 'full_cash' | 'cash_plus_loan' | 'opening_balance';

export interface PhysicalAsset {
  id: string;
  userId: string;
  assetAccountId: string; // canonical account (type asset)
  assetName: string;
  assetCategory: AssetCategory;
  purchaseDate: string;
  purchasePrice: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewPhysicalAssetInput {
  assetName: string;
  assetCategory: AssetCategory;
  purchaseDate: string;
  purchasePrice: number;
  fundingMethod: FundingMethod;
  fundingAccountId?: string;
  cashDownpayment?: number;
  loanFinancedAmount?: number;
  loanAccountId?: string;
  description?: string;
}

export interface StaticLiability {
  id: string;
  userId: string;
  liabilityAccountId: string; // canonical account (type liability)
  liabilityName: string;
  liabilityType: string;
  initialAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorthSnapshot {
  id: string;
  userId: string;
  snapshotDate: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  notes?: string;
  createdAt: string;
}

export type NisabBasis = 'gold' | 'silver';

export interface ZakatSettings {
  id: string;
  userId: string;
  nisabBasis: NisabBasis;
  valuationMethod: 'market_price';
  zakatRate: number; // default 2.500 (%)
  liabilityDeductionRule: 'immediate_short_term' | 'all_debt';
  goldPricePerGram: number; // BDT
  silverPricePerGram: number; // BDT
  updatedAt: string;
}

export interface ZakatCalculationResult {
  nisabBasis: NisabBasis;
  effectiveNisabThreshold: number;
  goldNisabValue: number;
  silverNisabValue: number;
  zakatableCashAndBank: number;
  zakatableGoldSilver: number;
  zakatableTermDeposits: number;
  zakatableReceivables: number;
  zakatableStocks: number;
  grossZakatableWealth: number;
  deductibleLiabilities: number;
  netZakatablePool: number;
  isNisabMet: boolean;
  zakatRatePct: number;
  zakatDue: number;
}

export interface TestCaseResult {
  id: number;
  title: string;
  description: string;
  passed: boolean;
  invariantStatus: string;
  balanceDeltas: Record<string, number>;
  logs: string[];
  sampleTransaction: {
    header: Partial<Transaction>;
    lines: Array<{
      type: LineType;
      targetName: string;
      amount: number;
    }>;
  };
}

// ----------------------------------------------------
// Phase 5: Stock Brokerage, Securities & Cash Ledger
// ----------------------------------------------------

export interface Broker {
  id: string;
  userId: string;
  name: string;
  licenseNumber?: string;
  contactNumber?: string;
  createdAt: string;
}

export type StockTradeType = 'buy' | 'sell';

export interface StockTransaction {
  id: string;
  userId: string;
  brokerAccountId: string;
  stockId: string;
  tradeDate: string;
  settlementDate: string;
  transactionType: StockTradeType;
  quantity: number;
  price: number;
  grossValue: number;
  commission: number;
  tax: number;
  otherCharges: number;
  netValue: number; // For buy: gross + charges; for sell: gross - charges
  reference?: string;
  createdAt: string;
}

export type StockTransactionType = StockTradeType;

export interface StockHolding {
  stockId: string;
  symbol: string;
  companyName: string;
  sector: string;
  brokerAccountId: string;
  quantity: number;
  weightedAverageCost: number;
  currentMarketPrice: number;
  investedValue: number;
  currentMarketValue: number;
  unrealizedPL: number;
  unrealizedPLPct: number;

  // Convenience aliases for views
  marketValue?: number;
  totalCostBasis?: number;
  unrealizedGain?: number;
  unrealizedGainPct?: number;
  currentPrice?: number;
}

export interface BrokerCashBalance {
  brokerAccountId: string;
  boId: string;
  cashBalance: number;
}

export interface NewBrokerInput {
  name: string;
  licenseNumber?: string;
  contactNumber?: string;
}

export interface NewBrokerAccountInput {
  brokerId: string;
  boId: string;
  accountName: string;
  isDefault?: boolean;
}

export interface NewBrokerDepositInput {
  brokerAccountId: string;
  sourceBankAccountId: string;
  amount: number;
  date?: string;
  note?: string;
}

export interface NewBrokerWithdrawalInput {
  brokerAccountId: string;
  destinationBankAccountId: string;
  amount: number;
  date?: string;
  note?: string;
}

export interface NewStockTradeInput {
  brokerAccountId: string;
  stockId: string;
  tradeDate?: string;
  settlementDate?: string;
  transactionType: StockTradeType;
  quantity: number;
  price: number;
  commissionRatePct?: number; // default 0.4% in BD
  commissionAmount?: number;
  taxAmount?: number; // AIT 0.05% on sale in DSE
  otherCharges?: number; // Hawla / laga fee
  reference?: string;
}

// ----------------------------------------------------
// Phase 6: Portfolio Analytics, History, XIRR & TWR
// ----------------------------------------------------

export interface StockPriceHistory {
  id: string;
  stockId: string;
  priceDate: string; // 'YYYY-MM-DD'
  closePrice: number;
  source: string; // 'DSE_FEED' | 'MANUAL'
  createdAt: string;
}

export interface BenchmarkIndexPrice {
  id: string;
  indexSymbol: string; // 'DSEX'
  priceDate: string; // 'YYYY-MM-DD'
  closeValue: number;
  createdAt: string;
}

export interface PortfolioSnapshot {
  id: string;
  userId: string;
  snapshotDate: string; // 'YYYY-MM-DD'
  totalInvested: number;
  currentMarketValue: number;
  brokerCashBalance: number;
  unrealizedPl: number;
  dailyTwr?: number;
  cumulativeTwr?: number;
  createdAt: string;
}

export interface PortfolioCashFlow {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'dividend' | 'terminal_valuation';
  amount: number; // Signed for XIRR: deposits are negative, withdrawals / valuation positive
  description: string;
  sourceRef?: string;
}

export interface TwrSubPeriod {
  startDate: string;
  endDate: string;
  beginValue: number;
  cashFlow: number;
  endValue: number;
  subPeriodReturnPct: number;
  cumulativeTwrPct: number;
}

export interface BenchmarkComparisonPoint {
  date: string;
  portfolioIndexed: number; // starts at 100.00
  dsexIndexed: number; // starts at 100.00
  portfolioCumulativeReturnPct: number;
  dsexCumulativeReturnPct: number;
  alphaPct: number;
}

export interface PortfolioPerformanceMetrics {
  xirrPct: number;
  twrPct: number;
  dsexTwrPct: number;
  alphaPct: number;
  totalInvestedCapital: number;
  currentPortfolioValue: number;
  totalStockMarketValue: number;
  totalBrokerCash: number;
  totalRealizedGain: number;
  totalUnrealizedGain: number;
  totalNetDividends: number;
  totalNetProfit: number;
  overallRoiPct: number;
}

export interface NewStockPriceHistoryInput {
  stockId: string;
  priceDate: string;
  closePrice: number;
  source?: string;
}

export interface NewBenchmarkPriceInput {
  indexSymbol?: string;
  priceDate: string;
  closeValue: number;
}

// ----------------------------------------------------
// Phase 7: Dividends, Corporate Actions & IPO Applications
// ----------------------------------------------------

export interface Dividend {
  id: string;
  userId: string;
  brokerAccountId: string;
  stockId: string;
  declarationDate?: string;
  recordDate: string;
  paymentDate: string;
  shares: number;
  dividendPerShare: number;
  grossDividend: number;
  tax: number;
  netDividend: number;
  isExternalPayout: boolean;
  notes?: string;
  createdAt: string;
}

export interface NewDividendInput {
  brokerAccountId: string;
  stockId: string;
  declarationDate?: string;
  recordDate: string;
  paymentDate: string;
  shares: number;
  dividendPerShare: number;
  taxRate?: number; // e.g. 10 or 15 percent, default 10
  isExternalPayout?: boolean;
  notes?: string;
}

export type CorporateActionType = 'bonus' | 'split' | 'right' | 'merger' | 'consolidation';

export interface CorporateAction {
  id: string;
  userId: string;
  stockId: string;
  brokerAccountId?: string;
  type: CorporateActionType;
  announcementDate: string;
  effectiveDate: string;
  ratio: string; // e.g. "10:1" (bonus) or "1:2" (split) or "1:5" (right)
  eligibleQuantity: number;
  newQuantity: number; // total shares after action
  cashComponent: number; // cash paid (e.g. right subscription) or received
  newCostBasis: number; // total cost basis after action
  newWac: number; // newCostBasis / newQuantity
  notes?: string;
  createdAt: string;
}

export interface NewCorporateActionInput {
  stockId: string;
  brokerAccountId?: string;
  type: CorporateActionType;
  announcementDate: string;
  effectiveDate: string;
  ratio: string;
  eligibleQuantity: number;
  additionalShares: number; // bonus or split shares added
  cashComponent?: number; // for rights
  notes?: string;
}

export type IpoStatus = 'applied' | 'allotted' | 'refunded' | 'partially_allotted';

export interface IpoApplication {
  id: string;
  userId: string;
  brokerAccountId: string;
  companyName: string;
  symbol: string;
  applicationDate: string;
  lotSize: number;
  offerPrice: number;
  totalAmount: number;
  status: IpoStatus;
  allottedShares?: number;
  refundAmount?: number;
  allotmentDate?: string;
  notes?: string;
  createdAt: string;
}

export interface NewIpoApplicationInput {
  brokerAccountId: string;
  companyName: string;
  symbol: string;
  applicationDate: string;
  lotSize: number;
  offerPrice: number;
  notes?: string;
}

export interface SettleIpoInput {
  applicationId: string;
  status: 'allotted' | 'refunded' | 'partially_allotted';
  allottedShares: number;
  refundAmount: number;
  allotmentDate: string;
}

// ----------------------------------------------------
// Phase 8: Analytics, Capital Gains & Financial Reports
// ----------------------------------------------------

export interface CapitalGainItem {
  id: string;
  stockId: string;
  symbol: string;
  companyName: string;
  tradeDate: string;
  quantity: number;
  grossSaleValue: number;
  chargesDeducted: number;
  netProceeds: number;
  costBasis: number;
  realizedGainLoss: number;
  gainLossPct: number;
  holdingType: 'short_term' | 'long_term';
  aitWithheld: number;
}

export interface CapitalGainsTaxSummary {
  fiscalYear: string;
  totalGrossProceeds: number;
  totalCostBasis: number;
  totalRealizedGains: number;
  totalRealizedLosses: number;
  netCapitalGain: number;
  exemptionThreshold: number; // e.g. 5,000,000 BDT in BD
  taxableCapitalGain: number;
  estimatedTaxLiability: number; // 15% on taxable
  totalTradeAitPaid: number; // 0.05% turnover tax
  totalDividendAitPaid: number; // 10%/15% on cash dividends
  totalBankTdsPaid: number; // TDS on interest
  totalAdvanceTaxCredits: number;
  netTaxPayableOrRefund: number;
  gainItems: CapitalGainItem[];
}

export interface TaxLossHarvestItem {
  stockId: string;
  symbol: string;
  companyName: string;
  sector: string;
  quantity: number;
  currentPrice: number;
  weightedAverageCost: number;
  investedValue: number;
  currentMarketValue: number;
  unrealizedLoss: number;
  unrealizedLossPct: number;
  potentialTaxSavings: number;
}

export interface SectorAllocationItem {
  sector: string;
  marketValue: number;
  costBasis: number;
  unrealizedPl: number;
  percentage: number;
  holdingsCount: number;
  stocks: Array<{
    symbol: string;
    companyName: string;
    marketValue: number;
    percentage: number;
  }>;
}

export interface SectorAllocationSummary {
  totalEquityValue: number;
  sectors: SectorAllocationItem[];
  herfindahlIndex: number; // 0 - 10000
  concentrationRisk: 'low' | 'moderate' | 'high';
  topSector: string;
  topSectorPct: number;
}

export interface BalanceSheetCategory {
  categoryName: string;
  totalAmount: number;
  percentageOfAssets: number;
  items: Array<{
    id: string;
    name: string;
    amount: number;
    details?: string;
  }>;
}

export interface BalanceSheetReport {
  asOfDate: string;
  totalCurrentAssets: number;
  totalNonCurrentAssets: number;
  totalAssets: number;
  currentAssetCategories: BalanceSheetCategory[];
  nonCurrentAssetCategories: BalanceSheetCategory[];
  
  totalCurrentLiabilities: number;
  totalLongTermLiabilities: number;
  totalLiabilities: number;
  liabilityCategories: BalanceSheetCategory[];
  
  netWorth: number; // Assets - |Liabilities|
  debtToAssetRatio: number;
  solvencyRatio: number;
  isBalanced: boolean;
}

export interface IncomeStatementCategory {
  categoryName: string;
  grossAmount: number;
  refundOffsets: number; // Lock 6 compliant
  netAmount: number;
  percentage: number;
}

export interface IncomeStatementReport {
  startDate: string;
  endDate: string;
  operatingIncome: number;
  investmentIncome: number; // Dividends + Realized Capital Gains
  totalIncome: number;
  incomeCategories: IncomeStatementCategory[];
  
  operatingExpenses: number;
  totalExpenses: number;
  expenseCategories: IncomeStatementCategory[];
  
  netSurplus: number; // Total Income - Total Expenses
  savingsRatePct: number;
}

// ==========================================
// PHASE 9: AUDIT TRAIL, ALERTS & BACKUP DATA
// ==========================================

export type AuditActionType =
  | 'TRANSACTION_POSTED'
  | 'TRANSACTION_REVERSED'
  | 'FD_OPENED'
  | 'FD_MATURED'
  | 'FD_BROKEN'
  | 'DPS_OPENED'
  | 'DPS_INSTALLMENT_PAID'
  | 'DPS_MATURED'
  | 'LOAN_CREATED'
  | 'LOAN_EMI_PAID'
  | 'DEBT_CREATED'
  | 'DEBT_SETTLED'
  | 'ASSET_CREATED'
  | 'TRADE_EXECUTED'
  | 'DIVIDEND_RECORDED'
  | 'CORPORATE_ACTION_EXECUTED'
  | 'IPO_APPLIED'
  | 'IPO_SETTLED'
  | 'BUDGET_SAVED'
  | 'RECURRING_EXECUTED'
  | 'GOAL_CONTRIBUTED'
  | 'ZAKAT_DISBURSED'
  | 'BACKUP_EXPORTED'
  | 'BACKUP_RESTORED'
  | 'LEDGER_RESET'
  | 'PROFILE_UPDATED';

export interface AuditLogEntry {
  id: string;
  userId: string;
  timestamp: string;
  action: AuditActionType;
  entityType: 'transaction' | 'account' | 'stock_trade' | 'dividend' | 'loan' | 'dps' | 'fd' | 'budget' | 'backup' | 'system';
  entityId: string;
  summary: string;
  details: Record<string, any>;
  hash: string;
  previousHash: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';

export type AlertCategory =
  | 'dps_due'
  | 'loan_emi'
  | 'fd_maturity'
  | 'recurring_due'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'low_balance'
  | 'goal_deadline'
  | 'zakat_due'
  | 'security_notice';

export interface SystemAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  targetView: string;
  targetId?: string;
  dueDate?: string;
  amount?: number;
  actionLabel?: string;
  isDismissed?: boolean;
  createdAt: string;
}

export interface BackupMetadata {
  schemaVersion: string;
  exportedAt: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  recordCounts: Record<string, number>;
  checksum: string;
  revision?: number;
}

export interface BackupBundle {
  metadata: BackupMetadata;
  data: {
    accounts: Account[];
    categories?: Category[];
    transactions: Transaction[];
    transactionLines: TransactionLine[];
    fixedDeposits: FixedDeposit[];
    budgets: Budget[];
    recurringTransactions: RecurringTransaction[];
    financialGoals: FinancialGoal[];
    goalContributions: GoalContribution[];
    dpsAccounts: DpsAccount[];
    dpsInstallments: DpsInstallment[];
    debts: Debt[];
    loans: Loan[];
    loanSchedules: LoanPaymentScheduleItem[];
    physicalAssets: PhysicalAsset[];
    staticLiabilities: StaticLiability[];
    netWorthSnapshots: NetWorthSnapshot[];
    zakatSettings: ZakatSettings;
    brokers: Broker[];
    brokerAccounts: BrokerAccount[];
    brokerCashTransactions: BrokerCashTransaction[];
    stocks: Stock[];
    stockTransactions: StockTransaction[];
    stockPriceHistory: StockPriceHistory[];
    benchmarkIndexPrices: BenchmarkIndexPrice[];
    dividends: Dividend[];
    corporateActions: CorporateAction[];
    ipoApplications: IpoApplication[];
    auditLogs: AuditLogEntry[];
  };
}

export interface EncryptedBackupBundle {
  version: '1.0';
  isEncrypted: true;
  cipher: 'AES-GCM-256';
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  salt: string;
  iv: string;
  iterations: number;
  ciphertext: string;
  exportedAt: string;
  userFullName?: string;
  recordCountsSummary?: {
    accounts: number;
    transactions: number;
    stocks: number;
  };
  hint?: string;
}

