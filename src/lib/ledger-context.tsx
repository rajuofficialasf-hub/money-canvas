import { newId } from './id-utils';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './auth-context';
import {
  Account,
  AccountBalanceView,
  AccountType,
  Budget,
  Category,
  Debt,
  DebtStatus,
  DpsAccount,
  DpsInstallment,
  FinancialGoal,
  FixedDeposit,
  GoalContribution,
  Loan,
  LoanPaymentScheduleItem,
  NetWorthSnapshot,
  NewAccountInput,
  NewBudgetInput,
  NewCategoryInput,
  NewDebtInput,
  NewDpsInput,
  NewFdInput,
  NewGoalInput,
  NewLoanInput,
  NewPhysicalAssetInput,
  NewRecurringInput,
  NewTransactionInput,
  PhysicalAsset,
  RecurringTransaction,
  StaticLiability,
  Transaction,
  TransactionLine,
  ZakatSettings,
  Broker,
  BrokerAccount,
  BrokerCashBalance,
  BrokerCashTransaction,
  NewBrokerAccountInput,
  NewBrokerDepositInput,
  NewBrokerInput,
  NewBrokerWithdrawalInput,
  NewStockTradeInput,
  Stock,
  StockHolding,
  StockTransaction,
  StockPriceHistory,
  BenchmarkIndexPrice,
  PortfolioSnapshot,
  PortfolioCashFlow,
  TwrSubPeriod,
  BenchmarkComparisonPoint,
  PortfolioPerformanceMetrics,
  NewStockPriceHistoryInput,
  NewBenchmarkPriceInput,
  Dividend,
  NewDividendInput,
  CorporateAction,
  NewCorporateActionInput,
  IpoApplication,
  NewIpoApplicationInput,
  SettleIpoInput,
  AuditLogEntry,
  AuditActionType,
  SystemAlert,
  BackupBundle,
} from '../types/accounting';
import {
  createAuditEntry,
  evaluateSystemAlerts,
} from './audit-and-alerts';
import {
  saveLedgerToFirestore,
  fetchLedgerFromFirestore,
  subscribeToCloudLedger,
  computeContentHash,
} from './cloud-sync-service';
import {
  fetchDseMarketQuotes,
  parseDseCsvPriceFile,
  DEFAULT_DSE_SECURITIES,
  getDseApiConfig,
  saveDseApiConfig,
} from './dse-market-service';
import {
  advanceRecurringDate,
  calculateAccountBalances,
  calculateDpsMaturity,
  calculateFdMaturity,
  calculateFlatEmi,
  calculateReducingEmi,
  calculateTradeValues,
  calculateXirr,
  calculateDividendValues,
  calculateBonusShareDilution,
  calculateStockSplit,
  calculateRightIssue,
  computeBrokerCashBalances,
  computeStockHoldings,
  computePortfolioExternalCashFlows,
  computeTwrSubPeriods,
  computeBenchmarkComparison,
  computePortfolioPerformanceMetrics,
  generateLoanAmortizationSchedule,
  round2,
  validateTransactionLines,
} from './accounting-engine';

interface LedgerContextType {
  accounts: Account[];
  categories: Category[];
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
  accountBalances: AccountBalanceView[];
  getAccountBalance: (accountId: string) => number;
  isLoading: boolean;
  createAccount: (input: NewAccountInput) => { account: Account; transaction?: Transaction };
  postTransaction: (input: NewTransactionInput) => { success: boolean; transaction?: Transaction; error?: string };
  postTransactionsBatch: (inputs: NewTransactionInput[]) => { success: boolean; count?: number; transactions?: Transaction[]; error?: string };
  reverseTransaction: (transactionId: string, reason?: string) => { success: boolean; reversalTransaction?: Transaction; error?: string };
  openFixedDeposit: (input: NewFdInput) => { success: boolean; fd?: FixedDeposit; error?: string };
  matureFixedDeposit: (fdId: string, destinationAccountId: string) => { success: boolean; error?: string };
  breakFixedDeposit: (fdId: string, destinationAccountId: string, penaltyInterestPct?: number) => { success: boolean; error?: string };
  archiveAccount: (accountId: string) => void;
  unarchiveAccount: (accountId: string) => void;
  createCategory: (input: NewCategoryInput) => Category;
  deleteCategory: (categoryId: string) => { success: boolean; error?: string };

  // Phase 3 Actions
  upsertBudget: (input: NewBudgetInput) => void;
  deleteBudget: (budgetId: string) => void;
  getCategorySpent: (categoryId: string, monthYear: string) => number;
  createRecurring: (input: NewRecurringInput) => RecurringTransaction;
  toggleRecurringPause: (id: string) => void;
  executeRecurringNow: (id: string) => { success: boolean; transaction?: Transaction; error?: string };
  deleteRecurring: (id: string) => void;
  createGoal: (input: NewGoalInput) => FinancialGoal;
  contributeToGoal: (goalId: string, amount: number, sourceAccountId?: string, note?: string) => { success: boolean; error?: string };
  updateGoalStatus: (goalId: string, status: 'in_progress' | 'achieved' | 'cancelled') => void;
  openDps: (input: NewDpsInput) => { success: boolean; dps?: DpsAccount; error?: string };
  payDpsInstallment: (dpsAccountId: string, installmentNumber: number, sourceAccountId: string) => { success: boolean; error?: string };
  matureDps: (dpsAccountId: string, destinationAccountId: string) => { success: boolean; error?: string };

  // Phase 4 Actions
  createDebt: (input: NewDebtInput) => { success: boolean; debt?: Debt; error?: string };
  settleDebt: (debtId: string, amount: number, settlementAccountId: string, note?: string) => { success: boolean; error?: string };
  updateDebtStatus: (debtId: string, status: DebtStatus) => void;
  createLoan: (input: NewLoanInput) => { success: boolean; loan?: Loan; error?: string };
  payLoanEmi: (loanId: string, installmentNumber: number, paymentAccountId: string) => { success: boolean; error?: string };
  createPhysicalAsset: (input: NewPhysicalAssetInput) => { success: boolean; asset?: PhysicalAsset; error?: string };
  createStaticLiability: (name: string, type: string, amount: number, sourceAccountId?: string) => { success: boolean; error?: string };
  saveNetWorthSnapshot: (notes?: string) => NetWorthSnapshot;
  updateZakatSettings: (settings: Partial<ZakatSettings>) => void;
  disburseZakat: (amount: number, sourceAccountId: string, note?: string) => { success: boolean; error?: string };

  // Phase 5: Stock Brokerage, Securities & Cash Ledger
  brokers: Broker[];
  brokerAccounts: BrokerAccount[];
  brokerCashTransactions: BrokerCashTransaction[];
  stocks: Stock[];
  stockTransactions: StockTransaction[];
  stockHoldings: StockHolding[];
  brokerCashBalances: BrokerCashBalance[];
  createBroker: (input: NewBrokerInput) => Broker;
  createBrokerAccount: (input: NewBrokerAccountInput) => BrokerAccount;
  depositBrokerCash: (input: NewBrokerDepositInput) => { success: boolean; error?: string };
  withdrawBrokerCash: (input: NewBrokerWithdrawalInput) => { success: boolean; error?: string };
  executeStockTrade: (input: NewStockTradeInput) => { success: boolean; transaction?: StockTransaction; error?: string };
  updateStockPrice: (stockId: string, newPrice: number) => void;
  addCustomStock: (stock: Omit<Stock, 'id' | 'createdAt'>) => Stock;
  deleteStock: (stockId: string) => { success: boolean; message: string };
  clearUnusedStocks: () => number;

  // Dhaka Stock Exchange & StockChartBD Market Data Sync
  dseSyncStatus: {
    status: 'idle' | 'syncing' | 'success' | 'failed';
    message?: string;
    lastSyncedAt?: string;
    source?: string;
    isManualOnly?: boolean;
  };
  syncDsePrices: () => Promise<{ success: boolean; message: string; updatedCount: number; source: string }>;
  batchUpdateStockPrices: (updates: Array<{ stockId: string; price: number }>) => void;
  importDseCsvPrices: (csvText: string) => { success: boolean; updatedCount: number; message: string };
  toggleDseManualMode: (manualOnly: boolean) => void;

  // Phase 6: Portfolio Analytics, History, XIRR & TWR
  stockPriceHistory: StockPriceHistory[];
  benchmarkIndexPrices: BenchmarkIndexPrice[];
  portfolioSnapshots: PortfolioSnapshot[];
  portfolioCashFlows: PortfolioCashFlow[];
  twrSubPeriods: TwrSubPeriod[];
  benchmarkComparisonData: BenchmarkComparisonPoint[];
  portfolioPerformanceMetrics: PortfolioPerformanceMetrics;
  addStockPriceHistoryRecord: (input: NewStockPriceHistoryInput) => StockPriceHistory;
  addBenchmarkPriceRecord: (input: NewBenchmarkPriceInput) => BenchmarkIndexPrice;
  recordPortfolioSnapshot: (date?: string) => PortfolioSnapshot;
  backfillHistoricalSnapshots: () => void;

  // Phase 7: Dividends, Corporate Actions & IPO Applications
  dividends: Dividend[];
  corporateActions: CorporateAction[];
  ipoApplications: IpoApplication[];
  recordDividend: (input: NewDividendInput) => { success: boolean; dividend?: Dividend; error?: string };
  executeCorporateAction: (input: NewCorporateActionInput) => { success: boolean; action?: CorporateAction; error?: string };
  applyIpo: (input: NewIpoApplicationInput) => { success: boolean; application?: IpoApplication; error?: string };
  settleIpo: (input: SettleIpoInput) => { success: boolean; error?: string };

  // Phase 9: Audit Trail, Financial Alert Engine & Backup Management
  auditLogs: AuditLogEntry[];
  systemAlerts: SystemAlert[];
  dismissAlert: (alertId: string) => void;
  logAuditEvent: (
    action: AuditActionType,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    summary: string,
    details?: Record<string, any>
  ) => void;
  exportFullBackup: (options?: { incrementRevision?: boolean }) => BackupBundle;
  restoreFromBackup: (bundle: BackupBundle) => { success: boolean; error?: string };
  resetTenantLedger: () => void;

  // Real-Time Cloud Sync (Mobile <-> Web)
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastCloudSyncAt: string | null;
  cloudSyncError: string | null;
  syncWithCloud: () => Promise<{ success: boolean; error?: string }>;
  restoreFromCloud: () => Promise<{ success: boolean; error?: string }>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

// Initial Categories Seed (Matches standard Bangladesh personal finance)
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-inc-1', userId: 'system', name: 'Salary & Professional Income', type: 'income', isSystem: true, color: '#10B981' },
  { id: 'cat-inc-2', userId: 'system', name: 'Freelance & Consulting', type: 'income', isSystem: true, color: '#06B6D4' },
  { id: 'cat-inc-3', userId: 'system', name: 'Bank Interest & Profit', type: 'income', isSystem: true, color: '#3B82F6' },
  { id: 'cat-inc-4', userId: 'system', name: 'Dividends & Capital Gains', type: 'income', isSystem: true, color: '#8B5CF6' },
  { id: 'cat-exp-1', userId: 'system', name: 'Food & Dining', type: 'expense', isSystem: true, color: '#F59E0B' },
  { id: 'cat-exp-2', userId: 'system', name: 'Groceries & Household', type: 'expense', isSystem: true, color: '#EAB308' },
  { id: 'cat-exp-3', userId: 'system', name: 'Rent & Housing', type: 'expense', isSystem: true, color: '#EC4899' },
  { id: 'cat-exp-4', userId: 'system', name: 'Utilities & Bills', type: 'expense', isSystem: true, color: '#F97316' },
  { id: 'cat-exp-5', userId: 'system', name: 'Transportation & Fuel', type: 'expense', isSystem: true, color: '#64748B' },
  { id: 'cat-exp-6', userId: 'system', name: 'Healthcare & Medical', type: 'expense', isSystem: true, color: '#EF4444' },
  { id: 'cat-exp-7', userId: 'system', name: 'Bank Charges & Withholding Tax', type: 'expense', isSystem: true, color: '#94A3B8' },
  { id: 'cat-exp-8', userId: 'system', name: 'Shopping & Electronics', type: 'expense', isSystem: true, color: '#A855F7' },
  { id: 'cat-exp-9', userId: 'system', name: 'Loan Interest Expense', type: 'expense', isSystem: true, color: '#DC2626' },
  { id: 'cat-exp-10', userId: 'system', name: 'Zakat & Charitable Donations', type: 'expense', isSystem: true, color: '#059669' },
  { id: 'cat-adj-1', userId: 'system', name: 'Opening Balance Equity', type: 'income', isSystem: true, color: '#6B7280' },
];

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, firebaseUser } = useAuth();
  const userId = user.id;

  // Real-Time Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`pfos_${userId}_last_cloud_sync`) || null;
    } catch {
      return null;
    }
  });
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const lastSyncedChecksumRef = useRef<string>('');
  const currentLoadedUserIdRef = useRef<string>(userId);
  const isInitialMountRef = useRef<boolean>(true);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const localRevisionRef = useRef<number>(0);

  // Synchronize local revision ref when active tenant changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pfos_${userId}_local_revision`);
      localRevisionRef.current = saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      localRevisionRef.current = 0;
    }
  }, [userId]);

  // Local Storage Keys scoped by active tenant user id
  const ACCOUNTS_KEY = `pfos_${userId}_accounts`;
  const CATEGORIES_KEY = `pfos_${userId}_categories`;
  const TRANSACTIONS_KEY = `pfos_${userId}_transactions`;
  const LINES_KEY = `pfos_${userId}_lines`;
  const FD_KEY = `pfos_${userId}_fds`;
  const BUDGETS_KEY = `pfos_${userId}_budgets`;
  const RECURRING_KEY = `pfos_${userId}_recurring`;
  const GOALS_KEY = `pfos_${userId}_goals`;
  const GOAL_CONTRIBS_KEY = `pfos_${userId}_goal_contribs`;
  const DPS_KEY = `pfos_${userId}_dps`;
  const DPS_INSTALLMENTS_KEY = `pfos_${userId}_dps_installments`;
  const DEBTS_KEY = `pfos_${userId}_debts`;
  const LOANS_KEY = `pfos_${userId}_loans`;
  const LOAN_SCHEDULES_KEY = `pfos_${userId}_loan_schedules`;
  const PHYSICAL_ASSETS_KEY = `pfos_${userId}_assets`;
  const STATIC_LIABILITIES_KEY = `pfos_${userId}_liabilities`;
  const NET_WORTH_SNAPSHOTS_KEY = `pfos_${userId}_net_worth_snapshots`;
  const ZAKAT_SETTINGS_KEY = `pfos_${userId}_zakat_settings`;
  const BROKERS_KEY = `pfos_${userId}_brokers`;
  const BROKER_ACCOUNTS_KEY = `pfos_${userId}_broker_accounts`;
  const BROKER_CASH_TRANSACTIONS_KEY = `pfos_${userId}_broker_cash_txs`;
  const STOCKS_KEY = `pfos_${userId}_stocks`;
  const STOCK_TRANSACTIONS_KEY = `pfos_${userId}_stock_txs`;
  const STOCK_PRICE_HISTORY_KEY = `pfos_${userId}_stock_price_hist`;
  const BENCHMARK_PRICES_KEY = `pfos_${userId}_benchmark_prices`;
  const PORTFOLIO_SNAPSHOTS_KEY = `pfos_${userId}_portfolio_snapshots`;
  const DIVIDENDS_KEY = `pfos_${userId}_dividends`;
  const CORPORATE_ACTIONS_KEY = `pfos_${userId}_corporate_actions`;
  const IPO_APPLICATIONS_KEY = `pfos_${userId}_ipo_applications`;
  const AUDIT_LOGS_KEY = `pfos_${userId}_audit_logs`;
  const DISMISSED_ALERTS_KEY = `pfos_${userId}_dismissed_alerts`;

  const [isLoading, setIsLoading] = useState(false);

  // Phase 9: Dismissed Alert IDs
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ALERTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Phase 9: Immutable Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(AUDIT_LOGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(auditLogs));
  }, [AUDIT_LOGS_KEY, auditLogs]);

  useEffect(() => {
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(dismissedAlertIds));
  }, [DISMISSED_ALERTS_KEY, dismissedAlertIds]);

  // Initialize or load accounts
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const stored = localStorage.getItem(ACCOUNTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed reading accounts from localStorage', e);
    }
    return [];
  });

  // Initialize or load categories (defaults seeded, user can add unlimited custom categories)
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem(CATEGORIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed reading categories from localStorage', e);
    }
    return DEFAULT_CATEGORIES;
  });

  // Initialize or load transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(TRANSACTIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed reading transactions from localStorage', e);
    }
    return [];
  });

  // Initialize or load transaction lines
  const [transactionLines, setTransactionLines] = useState<TransactionLine[]>(() => {
    try {
      const stored = localStorage.getItem(LINES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed reading lines from localStorage', e);
    }
    return [];
  });

  // Initialize or load Fixed Deposits
  const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>(() => {
    try {
      const stored = localStorage.getItem(FD_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading FDs from localStorage', e);
    }
    return [];
  });

  // Phase 3: Budgets State
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const stored = localStorage.getItem(BUDGETS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading budgets', e);
    }
    return [];
  });

  // Phase 3: Recurring Transactions State
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(RECURRING_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading recurring', e);
    }
    return [];
  });

  // Phase 3: Financial Goals State
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>(() => {
    try {
      const stored = localStorage.getItem(GOALS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading goals', e);
    }
    return [];
  });

  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>(() => {
    try {
      const stored = localStorage.getItem(GOAL_CONTRIBS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading goal contributions', e);
    }
    return [];
  });

  // Phase 3: DPS Accounts State
  const [dpsAccounts, setDpsAccounts] = useState<DpsAccount[]>(() => {
    try {
      const stored = localStorage.getItem(DPS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading DPS from localStorage', e);
    }
    return [];
  });

  const [dpsInstallments, setDpsInstallments] = useState<DpsInstallment[]>(() => {
    try {
      const stored = localStorage.getItem(DPS_INSTALLMENTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading DPS installments from localStorage', e);
    }
    return [];
  });

  // Phase 4: Debts State
  const [debts, setDebts] = useState<Debt[]>(() => {
    try {
      const stored = localStorage.getItem(DEBTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading debts from localStorage', e);
    }
    return [];
  });

  // Phase 4: Loans State
  const [loans, setLoans] = useState<Loan[]>(() => {
    try {
      const stored = localStorage.getItem(LOANS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading loans from localStorage', e);
    }
    return [];
  });

  // Phase 4: Loan Amortization Schedules State
  const [loanSchedules, setLoanSchedules] = useState<LoanPaymentScheduleItem[]>(() => {
    try {
      const stored = localStorage.getItem(LOAN_SCHEDULES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading loan schedules', e);
    }
    return [];
  });

  // Phase 4: Physical Assets State
  const [physicalAssets, setPhysicalAssets] = useState<PhysicalAsset[]>(() => {
    try {
      const stored = localStorage.getItem(PHYSICAL_ASSETS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading assets from localStorage', e);
    }
    return [];
  });

  // Phase 4: Static Liabilities State
  const [staticLiabilities, setStaticLiabilities] = useState<StaticLiability[]>(() => {
    try {
      const stored = localStorage.getItem(STATIC_LIABILITIES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading liabilities', e);
    }
    return [];
  });

  // Phase 4: Net Worth Snapshots State
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<NetWorthSnapshot[]>(() => {
    try {
      const stored = localStorage.getItem(NET_WORTH_SNAPSHOTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading net worth snapshots', e);
    }
    return [];
  });

  // Phase 4: Zakat Settings State
  const [zakatSettings, setZakatSettings] = useState<ZakatSettings>(() => {
    try {
      const stored = localStorage.getItem(ZAKAT_SETTINGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading zakat settings', e);
    }
    return {
      id: `zakat-set-${userId.slice(0, 6)}`,
      userId,
      nisabBasis: 'silver',
      valuationMethod: 'market_price',
      zakatRate: 2.5,
      liabilityDeductionRule: 'immediate_short_term',
      goldPricePerGram: 13500.0,
      silverPricePerGram: 220.0,
      updatedAt: new Date().toISOString(),
    };
  });

  // Phase 5: Brokers State
  const [brokers, setBrokers] = useState<Broker[]>(() => {
    try {
      const stored = localStorage.getItem(BROKERS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading brokers from localStorage', e);
    }
    return [
      {
        id: `broker-brac-epl`,
        userId,
        name: 'BRAC EPL Stock Brokerage Ltd.',
        licenseNumber: 'DSE-TREC-083',
        contactNumber: '+8802-9852441',
        createdAt: new Date().toISOString(),
      },
      {
        id: `broker-lankabangla`,
        userId,
        name: 'LankaBangla Securities Ltd.',
        licenseNumber: 'DSE-TREC-132',
        contactNumber: '+8802-9563501',
        createdAt: new Date().toISOString(),
      },
      {
        id: `broker-idlc`,
        userId,
        name: 'IDLC Securities Limited',
        licenseNumber: 'DSE-TREC-060',
        contactNumber: '+8802-9571170',
        createdAt: new Date().toISOString(),
      },
      {
        id: `broker-ucb`,
        userId,
        name: 'UCB Stock Brokerage Ltd.',
        licenseNumber: 'DSE-TREC-181',
        contactNumber: '+8802-9854420',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Phase 5: Broker Accounts (BO Accounts) State
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>(() => {
    try {
      const stored = localStorage.getItem(BROKER_ACCOUNTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading broker accounts from localStorage', e);
    }
    return [];
  });

  // Phase 5: Stocks Master Catalog State (Reference DSE securities catalog)
  const [stocks, setStocks] = useState<Stock[]>(() => {
    try {
      const stored = localStorage.getItem(STOCKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed reading stocks from localStorage', e);
    }
    return DEFAULT_DSE_SECURITIES.map((s) => ({
      ...s,
      id: `stock-${s.symbol.toLowerCase()}`,
      createdAt: new Date().toISOString(),
    }));
  });

  // Phase 5: Stock Transactions State
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STOCK_TRANSACTIONS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading stock transactions from localStorage', e);
    }
    return [];
  });

  // Phase 5: Broker Cash Transactions Sub-Ledger
  const [brokerCashTransactions, setBrokerCashTransactions] = useState<BrokerCashTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(BROKER_CASH_TRANSACTIONS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading broker cash transactions from localStorage', e);
    }
    return [];
  });

  // Phase 5 Derived Views: Stock Holdings & Broker Cash Balances
  const stockHoldings = useMemo(() => {
    return computeStockHoldings(stockTransactions, stocks);
  }, [stockTransactions, stocks]);

  const brokerCashBalances = useMemo(() => {
    return computeBrokerCashBalances(brokerCashTransactions, brokerAccounts);
  }, [brokerCashTransactions, brokerAccounts]);

  // Phase 6: Stock Price History
  const [stockPriceHistory, setStockPriceHistory] = useState<StockPriceHistory[]>(() => {
    try {
      const stored = localStorage.getItem(STOCK_PRICE_HISTORY_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading stock price history', e);
    }
    return [];
  });

  // Phase 6: Benchmark Index Prices (DSEX)
  const [benchmarkIndexPrices, setBenchmarkIndexPrices] = useState<BenchmarkIndexPrice[]>(() => {
    try {
      const stored = localStorage.getItem(BENCHMARK_PRICES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading benchmark prices', e);
    }
    return [
      { id: 'bench-1', indexSymbol: 'DSEX', priceDate: '2026-06-01', closeValue: 6042.5, createdAt: new Date().toISOString() },
      { id: 'bench-2', indexSymbol: 'DSEX', priceDate: '2026-07-01', closeValue: 6112.8, createdAt: new Date().toISOString() },
      { id: 'bench-3', indexSymbol: 'DSEX', priceDate: '2026-08-01', closeValue: 6182.0, createdAt: new Date().toISOString() },
      { id: 'bench-4', indexSymbol: 'DSEX', priceDate: '2026-09-01', closeValue: 6224.7, createdAt: new Date().toISOString() },
      { id: 'bench-5', indexSymbol: 'DSEX', priceDate: '2026-09-23', closeValue: 6284.0, createdAt: new Date().toISOString() },
    ];
  });

  // Phase 6: Portfolio Snapshots
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<PortfolioSnapshot[]>(() => {
    try {
      const stored = localStorage.getItem(PORTFOLIO_SNAPSHOTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading portfolio snapshots', e);
    }
    return [];
  });

  // Phase 7: Dividends State
  const [dividends, setDividends] = useState<Dividend[]>(() => {
    try {
      const stored = localStorage.getItem(DIVIDENDS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading dividends from localStorage', e);
    }
    return [];
  });

  // Phase 7: Corporate Actions State
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>(() => {
    try {
      const stored = localStorage.getItem(CORPORATE_ACTIONS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading corporate actions from localStorage', e);
    }
    return [];
  });

  // Phase 7: IPO Applications State
  const [ipoApplications, setIpoApplications] = useState<IpoApplication[]>(() => {
    try {
      const stored = localStorage.getItem(IPO_APPLICATIONS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed reading IPO applications from localStorage', e);
    }
    return [];
  });

  // Phase 6 Derived State: External Cash Flows, TWR Sub-Periods, Benchmark & Performance
  const totalStockMarketValue = useMemo(() => {
    return stockHoldings.reduce((sum, h) => sum + (h.marketValue ?? h.currentMarketValue), 0);
  }, [stockHoldings]);

  const totalBrokerCash = useMemo(() => {
    return brokerCashBalances.reduce((sum, b) => sum + b.cashBalance, 0);
  }, [brokerCashBalances]);

  const currentPortfolioValue = useMemo(() => {
    return round2(totalStockMarketValue + totalBrokerCash);
  }, [totalStockMarketValue, totalBrokerCash]);

  const portfolioCashFlows = useMemo(() => {
    return computePortfolioExternalCashFlows(brokerCashTransactions, currentPortfolioValue);
  }, [brokerCashTransactions, currentPortfolioValue]);

  const twrSubPeriods = useMemo(() => {
    return computeTwrSubPeriods(portfolioSnapshots, brokerCashTransactions);
  }, [portfolioSnapshots, brokerCashTransactions]);

  const benchmarkComparisonData = useMemo(() => {
    return computeBenchmarkComparison(portfolioSnapshots, benchmarkIndexPrices);
  }, [portfolioSnapshots, benchmarkIndexPrices]);

  const portfolioPerformanceMetrics = useMemo(() => {
    return computePortfolioPerformanceMetrics(
      stockHoldings,
      brokerCashBalances,
      brokerCashTransactions,
      stockTransactions,
      portfolioSnapshots,
      benchmarkIndexPrices
    );
  }, [
    stockHoldings,
    brokerCashBalances,
    brokerCashTransactions,
    stockTransactions,
    portfolioSnapshots,
    benchmarkIndexPrices,
  ]);

  // Persist all state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      localStorage.setItem(LINES_KEY, JSON.stringify(transactionLines));
      localStorage.setItem(FD_KEY, JSON.stringify(fixedDeposits));
      localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
      localStorage.setItem(RECURRING_KEY, JSON.stringify(recurringTransactions));
      localStorage.setItem(GOALS_KEY, JSON.stringify(financialGoals));
      localStorage.setItem(GOAL_CONTRIBS_KEY, JSON.stringify(goalContributions));
      localStorage.setItem(DPS_KEY, JSON.stringify(dpsAccounts));
      localStorage.setItem(DPS_INSTALLMENTS_KEY, JSON.stringify(dpsInstallments));
      localStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
      localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
      localStorage.setItem(LOAN_SCHEDULES_KEY, JSON.stringify(loanSchedules));
      localStorage.setItem(PHYSICAL_ASSETS_KEY, JSON.stringify(physicalAssets));
      localStorage.setItem(STATIC_LIABILITIES_KEY, JSON.stringify(staticLiabilities));
      localStorage.setItem(NET_WORTH_SNAPSHOTS_KEY, JSON.stringify(netWorthSnapshots));
      localStorage.setItem(ZAKAT_SETTINGS_KEY, JSON.stringify(zakatSettings));
      localStorage.setItem(BROKERS_KEY, JSON.stringify(brokers));
      localStorage.setItem(BROKER_ACCOUNTS_KEY, JSON.stringify(brokerAccounts));
      localStorage.setItem(BROKER_CASH_TRANSACTIONS_KEY, JSON.stringify(brokerCashTransactions));
      localStorage.setItem(STOCKS_KEY, JSON.stringify(stocks));
      localStorage.setItem(STOCK_TRANSACTIONS_KEY, JSON.stringify(stockTransactions));
      localStorage.setItem(STOCK_PRICE_HISTORY_KEY, JSON.stringify(stockPriceHistory));
      localStorage.setItem(BENCHMARK_PRICES_KEY, JSON.stringify(benchmarkIndexPrices));
      localStorage.setItem(PORTFOLIO_SNAPSHOTS_KEY, JSON.stringify(portfolioSnapshots));
      localStorage.setItem(DIVIDENDS_KEY, JSON.stringify(dividends));
      localStorage.setItem(CORPORATE_ACTIONS_KEY, JSON.stringify(corporateActions));
      localStorage.setItem(IPO_APPLICATIONS_KEY, JSON.stringify(ipoApplications));
    } catch (e) {
      console.warn('Failed persisting state to localStorage', e);
    }
  }, [
    accounts,
    transactions,
    transactionLines,
    fixedDeposits,
    budgets,
    recurringTransactions,
    financialGoals,
    goalContributions,
    dpsAccounts,
    dpsInstallments,
    debts,
    loans,
    loanSchedules,
    physicalAssets,
    staticLiabilities,
    netWorthSnapshots,
    zakatSettings,
    brokers,
    brokerAccounts,
    brokerCashTransactions,
    stocks,
    stockTransactions,
    stockPriceHistory,
    benchmarkIndexPrices,
    portfolioSnapshots,
    dividends,
    corporateActions,
    ipoApplications,
    ACCOUNTS_KEY,
    TRANSACTIONS_KEY,
    LINES_KEY,
    FD_KEY,
    BUDGETS_KEY,
    RECURRING_KEY,
    GOALS_KEY,
    GOAL_CONTRIBS_KEY,
    DPS_KEY,
    DPS_INSTALLMENTS_KEY,
    DEBTS_KEY,
    LOANS_KEY,
    LOAN_SCHEDULES_KEY,
    PHYSICAL_ASSETS_KEY,
    STATIC_LIABILITIES_KEY,
    NET_WORTH_SNAPSHOTS_KEY,
    ZAKAT_SETTINGS_KEY,
    BROKERS_KEY,
    BROKER_ACCOUNTS_KEY,
    BROKER_CASH_TRANSACTIONS_KEY,
    STOCKS_KEY,
    STOCK_TRANSACTIONS_KEY,
    STOCK_PRICE_HISTORY_KEY,
    BENCHMARK_PRICES_KEY,
    PORTFOLIO_SNAPSHOTS_KEY,
    DIVIDENDS_KEY,
    CORPORATE_ACTIONS_KEY,
    IPO_APPLICATIONS_KEY,
    categories,
    CATEGORIES_KEY,
  ]);

  // Derived Authoritative Account Balances (v_account_balances view)
  const accountBalances = useMemo(() => {
    return calculateAccountBalances(accounts, transactions, transactionLines);
  }, [accounts, transactions, transactionLines]);

  /**
   * Authoritative Account Balance Helper
   * Returns current real-time balance of any account
   */
  const getAccountBalance = useCallback(
    (accountId: string): number => {
      const row = accountBalances.find((b) => b.accountId === accountId);
      return row ? row.currentBalance : 0;
    },
    [accountBalances]
  );

  /**
   * Action: Create Custom User Category (Income or Expense)
   */
  const createCategory = (input: NewCategoryInput): Category => {
    const newCat: Category = {
      id: newId(input.type === 'income' ? 'cat-inc' : 'cat-exp'),
      userId,
      name: input.name.trim(),
      type: input.type,
      icon: input.icon,
      color: input.color || (input.type === 'income' ? '#10B981' : '#F59E0B'),
      parentCategoryId: input.parentCategoryId || null,
      isSystem: false,
    };

    setCategories((prev) => [...prev, newCat]);

    logAuditEvent(
      'CATEGORY_CREATED' as any,
      'category' as any,
      newCat.id,
      `Created custom category "${newCat.name}" (${newCat.type})`,
      { category: newCat }
    );

    return newCat;
  };

  /**
   * Action: Delete Custom Category
   */
  const deleteCategory = (categoryId: string): { success: boolean; error?: string } => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return { success: false, error: 'Category not found.' };
    if (cat.isSystem) return { success: false, error: 'System standard categories cannot be deleted.' };

    const isUsedInLines = transactionLines.some((l) => l.categoryId === categoryId);
    const isUsedInBudgets = budgets.some((b) => b.categoryId === categoryId);
    if (isUsedInLines || isUsedInBudgets) {
      return { success: false, error: 'Cannot delete category because it is used in existing transactions or budgets.' };
    }

    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    return { success: true };
  };

  /**
   * Action: Create New Account
   */
  const createAccount = (input: NewAccountInput) => {
    const accountId = newId('acc');
    const newAcc: Account = {
      id: accountId,
      userId,
      name: input.name,
      accountType: input.accountType,
      currency: input.currency || 'BDT',
      institutionName: input.institutionName,
      accountNumberMask: input.accountNumberMask,
      creditLimit: input.creditLimit,
      isZakatable: input.isZakatable,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    let initialTx: Transaction | undefined;
    const newLines: TransactionLine[] = [];

    if (input.initialBalance && input.initialBalance !== 0) {
      const txId = newId('tx-init');
      initialTx = {
        id: txId,
        userId,
        date: new Date().toISOString().split('T')[0],
        type: 'opening_balance',
        status: 'posted',
        version: 1,
        note: `Opening balance for ${input.name}`,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      newLines.push({
        id: newId('tl'),
        transactionId: txId,
        lineType: 'account',
        accountId: accountId,
        amount: input.initialBalance,
        memo: 'Initial balance',
        createdAt: new Date().toISOString(),
      });

      newLines.push({
        id: newId('tl'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-adj-1',
        amount: -input.initialBalance,
        memo: 'Balancing equity',
        createdAt: new Date().toISOString(),
      });
    }

    setAccounts((prev) => [...prev, newAcc]);
    if (initialTx && newLines.length > 0) {
      setTransactions((prev) => [initialTx!, ...prev]);
      setTransactionLines((prev) => [...prev, ...newLines]);
    }

    return { account: newAcc, transaction: initialTx };
  };

  /**
   * Action: Post Double-Entry Transaction
   */
  const postTransaction = (input: NewTransactionInput) => {
    const validation = validateTransactionLines(input.lines);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    // Business Logic Guard: Block negative balance drawdowns on liquid asset accounts
    if (input.type !== 'opening_balance' && input.type !== 'adjustment') {
      const accountNetDeltas = new Map<string, number>();
      for (const line of input.lines) {
        if (line.lineType === 'account' && line.accountId) {
          const cur = accountNetDeltas.get(line.accountId) || 0;
          accountNetDeltas.set(line.accountId, cur + line.amount);
        }
      }

      for (const [accId, delta] of accountNetDeltas.entries()) {
        if (delta < -0.001) {
          const targetAcc = accounts.find((a) => a.id === accId);
          if (targetAcc && ['cash', 'bank', 'mobile_wallet'].includes(targetAcc.accountType)) {
            const currentBal = getAccountBalance(accId);
            const deficit = round2(currentBal + delta);
            if (deficit < -0.001) {
              const needed = round2(-delta);
              return {
                success: false,
                error: `অপর্যাপ্ত ব্যালেন্স: "${targetAcc.name}" অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBal.toLocaleString()}, লেনদেনের জন্য প্রয়োজন: ৳${needed.toLocaleString()})। লেনদেন সম্পন্ন করতে অনুগ্রহ করে আগে এই অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${targetAcc.name}" (Available: ৳${currentBal.toLocaleString()}, Required: ৳${needed.toLocaleString()}). Please deposit funds into this account first.`,
              };
            }
          }
        }
      }
    }

    const txId = newId('tx');
    const newTx: Transaction = {
      id: txId,
      userId,
      date: input.date,
      type: input.type,
      status: 'posted',
      version: 1,
      note: input.note,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const lines: TransactionLine[] = input.lines.map((l, idx) => ({
      id: newId('tl'),
      transactionId: txId,
      lineType: l.lineType,
      accountId: l.accountId || null,
      categoryId: l.categoryId || null,
      amount: round2(l.amount),
      memo: l.memo,
      createdAt: new Date().toISOString(),
    }));

    setTransactions((prev) => [newTx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);

    return { success: true, transaction: newTx };
  };

  /**
   * Action: Post Batch Transactions (Atomic Multi-Row Import)
   */
  const postTransactionsBatch = (inputs: NewTransactionInput[]) => {
    if (!inputs || inputs.length === 0) {
      return { success: true, count: 0, transactions: [] };
    }

    const newTxs: Transaction[] = [];
    const newLines: TransactionLine[] = [];
    const nowISO = new Date().toISOString();

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const validation = validateTransactionLines(input.lines);
      if (!validation.valid) {
        return { success: false, error: `Row ${i + 1} validation error: ${validation.errors.join('; ')}` };
      }

      const txId = newId('tx');

      const newTx: Transaction = {
        id: txId,
        userId,
        date: input.date,
        type: input.type,
        status: 'posted',
        version: 1,
        note: input.note,
        createdBy: userId,
        createdAt: nowISO,
        updatedAt: nowISO,
      };

      const lines: TransactionLine[] = input.lines.map((l) => ({
        id: newId('tl'),
        transactionId: txId,
        lineType: l.lineType,
        accountId: l.accountId || null,
        categoryId: l.categoryId || null,
        amount: round2(l.amount),
        memo: l.memo,
        createdAt: nowISO,
      }));

      newTxs.push(newTx);
      newLines.push(...lines);
    }

    setTransactions((prev) => [...newTxs, ...prev]);
    setTransactionLines((prev) => [...prev, ...newLines]);

    return { success: true, count: newTxs.length, transactions: newTxs };
  };

  /**
   * Action: Reverse Transaction
   */
  const reverseTransaction = (transactionId: string, reason?: string) => {
    const original = transactions.find((t) => t.id === transactionId);
    if (!original) {
      return { success: false, error: 'Transaction not found.' };
    }
    if (original.status === 'voided') {
      return { success: false, error: 'Transaction has already been reversed.' };
    }

    const originalLines = transactionLines.filter((l) => l.transactionId === transactionId);
    if (originalLines.length === 0) {
      return { success: false, error: 'Original transaction contains no child lines.' };
    }

    const reversalTxId = newId('tx-rev');
    const reversalTx: Transaction = {
      id: reversalTxId,
      userId,
      date: new Date().toISOString().split('T')[0],
      type: 'adjustment',
      status: 'posted',
      version: 1,
      note: `Reversal of #${original.id.slice(0, 10)}: ${reason || 'Correction of entry'}`,
      linkedTransactionId: original.id,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const reversalLines: TransactionLine[] = originalLines.map((l, idx) => ({
      id: newId('tl-rev'),
      transactionId: reversalTxId,
      lineType: l.lineType,
      accountId: l.accountId,
      categoryId: l.categoryId,
      amount: round2(-l.amount),
      memo: `Reversal: ${l.memo || 'Reversing original line'}`,
      createdAt: new Date().toISOString(),
    }));

    setTransactions((prev) =>
      prev.map((t) => (t.id === original.id ? { ...t, status: 'voided' as const, updatedAt: new Date().toISOString() } : t))
    );
    setTransactions((prev) => [reversalTx, ...prev]);
    setTransactionLines((prev) => [...prev, ...reversalLines]);

    return { success: true, reversalTransaction: reversalTx };
  };

  /**
   * Action: Open Fixed Deposit (FD)
   */
  const openFixedDeposit = (input: NewFdInput) => {
    const sourceAcc = accounts.find((a) => a.id === input.sourceAccountId);
    if (!sourceAcc) {
      return { success: false, error: 'Source funding account not found.' };
    }

    const currentBalance = getAccountBalance(sourceAcc.id);
    if (['cash', 'bank', 'mobile_wallet'].includes(sourceAcc.accountType) && currentBalance < input.principalAmount) {
      return {
        success: false,
        error: `অপর্যাপ্ত ব্যালেন্স: "${sourceAcc.name}" অ্যাকাউন্টে ফিক্সড ডিপোজিট (FD) খোলার মতো পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, এফডিআর মূলধন: ৳${input.principalAmount.toLocaleString()})। ফিক্সড ডিপোজিট খোলার পূর্বে অনুগ্রহ করে সোর্স অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${sourceAcc.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${input.principalAmount.toLocaleString()}). Please deposit money into your account first before opening FD.`,
      };
    }

    const fdAccountId = newId('acc-fd');
    const fdId = newId('fd');

    const maturityCalc = calculateFdMaturity(
      input.principalAmount,
      input.interestRate,
      input.tenureMonths,
      input.compoundingFrequency,
      input.taxRate
    );

    const startDateObj = new Date(input.startDate);
    const maturityDateObj = new Date(startDateObj);
    maturityDateObj.setMonth(maturityDateObj.getMonth() + input.tenureMonths);
    const maturityDateStr = maturityDateObj.toISOString().split('T')[0];

    const fdAccount: Account = {
      id: fdAccountId,
      userId,
      name: `FD: ${input.institutionName} (৳${input.principalAmount.toLocaleString()})`,
      accountType: 'fd',
      currency: 'BDT',
      institutionName: input.institutionName,
      accountNumberMask: input.fdNumber || `FD-${Date.now().toString().slice(-6)}`,
      isZakatable: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    const fdRecord: FixedDeposit = {
      id: fdId,
      userId,
      fdAccountId,
      sourceAccountId: input.sourceAccountId,
      institutionName: input.institutionName,
      fdNumber: input.fdNumber || `FD-${Date.now().toString().slice(-6)}`,
      principalAmount: round2(input.principalAmount),
      interestRate: input.interestRate,
      tenureMonths: input.tenureMonths,
      startDate: input.startDate,
      maturityDate: maturityDateStr,
      compoundingFrequency: input.compoundingFrequency,
      expectedMaturityAmount: maturityCalc.netMaturityAmount,
      taxRate: input.taxRate,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const fundingTxId = newId('tx-fd-open');
    const fundingTx: Transaction = {
      id: fundingTxId,
      userId,
      date: input.startDate,
      type: 'fd_open',
      status: 'posted',
      version: 1,
      note: `Opened Fixed Deposit at ${input.institutionName} for ৳${input.principalAmount.toLocaleString()}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const fundingLines: TransactionLine[] = [
      {
        id: newId('tl-fd-1'),
        transactionId: fundingTxId,
        lineType: 'account',
        accountId: input.sourceAccountId,
        amount: -round2(input.principalAmount),
        memo: `FD funding debit for ${input.institutionName}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-fd-2'),
        transactionId: fundingTxId,
        lineType: 'account',
        accountId: fdAccountId,
        amount: round2(input.principalAmount),
        memo: `FD principal creation`,
        createdAt: new Date().toISOString(),
      },
    ];

    setAccounts((prev) => [...prev, fdAccount]);
    setFixedDeposits((prev) => [fdRecord, ...prev]);
    setTransactions((prev) => [fundingTx, ...prev]);
    setTransactionLines((prev) => [...prev, ...fundingLines]);

    return { success: true, fd: fdRecord };
  };

  /**
   * Action: Mature Fixed Deposit
   */
  const matureFixedDeposit = (fdId: string, destinationAccountId: string) => {
    const fd = fixedDeposits.find((f) => f.id === fdId);
    if (!fd) return { success: false, error: 'Fixed Deposit not found.' };
    if (fd.status !== 'active') return { success: false, error: 'FD is not currently active.' };

    const destAcc = accounts.find((a) => a.id === destinationAccountId);
    if (!destAcc) return { success: false, error: 'Destination bank account not found.' };

    const maturityCalc = calculateFdMaturity(
      fd.principalAmount,
      fd.interestRate,
      fd.tenureMonths,
      fd.compoundingFrequency,
      fd.taxRate
    );

    const txId = newId('tx-fd-mat');
    const maturityDate = new Date().toISOString().split('T')[0];

    const lines: TransactionLine[] = [
      {
        id: newId('tl-mat-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: fd.fdAccountId,
        amount: -fd.principalAmount,
        memo: 'FD principal liquidation',
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-mat-2'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-inc-3',
        amount: -maturityCalc.grossInterest,
        memo: `Gross FD interest earned (${fd.interestRate}%)`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-mat-3'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-exp-7',
        amount: maturityCalc.withholdingTax,
        memo: `Withholding tax on interest (${fd.taxRate}%)`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-mat-4'),
        transactionId: txId,
        lineType: 'account',
        accountId: destinationAccountId,
        amount: maturityCalc.netMaturityAmount,
        memo: `FD maturity proceeds deposited`,
        createdAt: new Date().toISOString(),
      },
    ];

    const maturityTx: Transaction = {
      id: txId,
      userId,
      date: maturityDate,
      type: 'fd_maturity',
      status: 'posted',
      version: 1,
      note: `FD Maturity: ${fd.institutionName} principal ৳${fd.principalAmount.toLocaleString()} + net interest ৳${maturityCalc.netInterest.toLocaleString()}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setFixedDeposits((prev) =>
      prev.map((f) => (f.id === fdId ? { ...f, status: 'matured' as const, updatedAt: new Date().toISOString() } : f))
    );
    setAccounts((prev) =>
      prev.map((a) => (a.id === fd.fdAccountId ? { ...a, isArchived: true } : a))
    );
    setTransactions((prev) => [maturityTx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);

    return { success: true };
  };

  /**
   * Action: Break Fixed Deposit
   */
  const breakFixedDeposit = (fdId: string, destinationAccountId: string, penaltyInterestPct: number = 4.0) => {
    const fd = fixedDeposits.find((f) => f.id === fdId);
    if (!fd) return { success: false, error: 'Fixed Deposit not found.' };
    if (fd.status !== 'active') return { success: false, error: 'FD is not active.' };

    const destAcc = accounts.find((a) => a.id === destinationAccountId);
    if (!destAcc) return { success: false, error: 'Destination bank account not found.' };

    const start = new Date(fd.startDate);
    const now = new Date();
    const elapsedMonths = Math.max(1, Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));

    const calc = calculateFdMaturity(
      fd.principalAmount,
      penaltyInterestPct,
      elapsedMonths,
      'annually',
      fd.taxRate
    );

    const txId = newId('tx-fd-brk');
    const txDate = new Date().toISOString().split('T')[0];

    const lines: TransactionLine[] = [
      {
        id: newId('tl-brk-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: fd.fdAccountId,
        amount: -fd.principalAmount,
        memo: 'FD premature principal liquidation',
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-brk-2'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-inc-3',
        amount: -calc.grossInterest,
        memo: `Premature penalty interest earned (${penaltyInterestPct}%)`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-brk-3'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-exp-7',
        amount: calc.withholdingTax,
        memo: `Withholding tax on premature interest`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-brk-4'),
        transactionId: txId,
        lineType: 'account',
        accountId: destinationAccountId,
        amount: calc.netMaturityAmount,
        memo: `FD premature liquidation proceeds credited`,
        createdAt: new Date().toISOString(),
      },
    ];

    const breakTx: Transaction = {
      id: txId,
      userId,
      date: txDate,
      type: 'fd_maturity',
      status: 'posted',
      version: 1,
      note: `Premature FD Break: ${fd.institutionName} with penalty interest ৳${calc.netInterest.toLocaleString()}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setFixedDeposits((prev) =>
      prev.map((f) => (f.id === fdId ? { ...f, status: 'broken' as const, updatedAt: new Date().toISOString() } : f))
    );
    setAccounts((prev) =>
      prev.map((a) => (a.id === fd.fdAccountId ? { ...a, isArchived: true } : a))
    );
    setTransactions((prev) => [breakTx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);

    return { success: true };
  };

  const archiveAccount = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, isArchived: true } : a))
    );
  };

  const unarchiveAccount = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, isArchived: false } : a))
    );
  };

  // ----------------------------------------------------
  // Phase 3 Actions: Budgets
  // ----------------------------------------------------

  const upsertBudget = (input: NewBudgetInput) => {
    setBudgets((prev) => {
      const existing = prev.find(
        (b) => b.categoryId === input.categoryId && b.monthYear === input.monthYear
      );
      if (existing) {
        return prev.map((b) =>
          b.id === existing.id
            ? {
                ...b,
                allocatedAmount: round2(input.allocatedAmount),
                warningThresholdPct: input.warningThresholdPct || b.warningThresholdPct,
                rolloverEnabled: input.rolloverEnabled !== undefined ? input.rolloverEnabled : b.rolloverEnabled,
                rolloverAmount: input.rolloverAmount !== undefined ? round2(input.rolloverAmount) : b.rolloverAmount,
              }
            : b
        );
      }
      const newBudget: Budget = {
        id: newId('bgt'),
        userId,
        categoryId: input.categoryId,
        monthYear: input.monthYear,
        allocatedAmount: round2(input.allocatedAmount),
        warningThresholdPct: input.warningThresholdPct || 90.0,
        rolloverEnabled: input.rolloverEnabled ?? false,
        rolloverAmount: input.rolloverAmount ? round2(input.rolloverAmount) : 0,
        createdAt: new Date().toISOString(),
      };
      return [...prev, newBudget];
    });
  };

  const deleteBudget = (budgetId: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
  };

  const getCategorySpent = (categoryId: string, monthYear: string): number => {
    const postedTxIds = new Set(
      transactions
        .filter((t) => t.status === 'posted' && t.date.startsWith(monthYear))
        .map((t) => t.id)
    );

    let spent = 0;
    for (const line of transactionLines) {
      if (
        line.lineType === 'category' &&
        line.categoryId === categoryId &&
        postedTxIds.has(line.transactionId)
      ) {
        // In double entry, expenses are positive category credits
        if (line.amount > 0) {
          spent += line.amount;
        } else {
          // Refunds reduce expense (Lock 6)
          spent += line.amount;
        }
      }
    }
    return round2(Math.max(0, spent));
  };

  // ----------------------------------------------------
  // Phase 3 Actions: Recurring Transactions
  // ----------------------------------------------------

  const createRecurring = (input: NewRecurringInput): RecurringTransaction => {
    const recId = newId('rec');
    const newRec: RecurringTransaction = {
      id: recId,
      userId,
      name: input.name,
      templateTransaction: input.templateTransaction,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate,
      nextRun: input.startDate,
      isPaused: false,
      autoPost: input.autoPost ?? true,
      createdAt: new Date().toISOString(),
    };
    setRecurringTransactions((prev) => [newRec, ...prev]);
    return newRec;
  };

  const toggleRecurringPause = (id: string) => {
    setRecurringTransactions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isPaused: !r.isPaused } : r))
    );
  };

  const executeRecurringNow = (id: string) => {
    const rec = recurringTransactions.find((r) => r.id === id);
    if (!rec) return { success: false, error: 'Recurring schedule not found.' };

    const todayStr = new Date().toISOString().split('T')[0];
    const txInput: NewTransactionInput = {
      ...rec.templateTransaction,
      date: todayStr,
      note: `${rec.name} (Recurring Schedule #${rec.id.slice(-6)})`,
    };

    const res = postTransaction(txInput);
    if (!res.success) return res;

    // Advance next run date
    const nextDate = advanceRecurringDate(rec.nextRun, rec.frequency);
    setRecurringTransactions((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              lastRun: todayStr,
              nextRun: nextDate,
            }
          : r
      )
    );

    return res;
  };

  const deleteRecurring = (id: string) => {
    setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
  };

  // ----------------------------------------------------
  // Phase 3 Actions: Financial Goals (Lock 3)
  // ----------------------------------------------------

  const createGoal = (input: NewGoalInput): FinancialGoal => {
    const goalId = newId('goal');
    let linkedAccountId: string | undefined = input.linkedAccountId;

    // If Mode is linked_savings_account_goal and no account chosen, create a dedicated account
    if (input.goalMode === 'linked_savings_account_goal' && !linkedAccountId) {
      const created = createAccount({
        name: `Goal: ${input.name}`,
        accountType: 'bank',
        currency: 'BDT',
        institutionName: 'Savings Reserve',
        isZakatable: true,
        initialBalance: input.initialDeposit || 0,
      });
      linkedAccountId = created.account.id;
    }

    const newGoal: FinancialGoal = {
      id: goalId,
      userId,
      name: input.name,
      targetAmount: round2(input.targetAmount),
      targetDate: input.targetDate,
      goalMode: input.goalMode,
      linkedAccountId: linkedAccountId || null,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };

    // If tracking goal and initial deposit specified, record goal contribution (Lock 3: does NOT generate expense)
    if (input.goalMode === 'tracking_goal' && input.initialDeposit && input.initialDeposit > 0) {
      const contrib: GoalContribution = {
        id: newId('gc'),
        goalId,
        amount: round2(input.initialDeposit),
        contributionDate: new Date().toISOString().split('T')[0],
        note: 'Initial tracking goal deposit',
        createdAt: new Date().toISOString(),
      };
      setGoalContributions((prev) => [contrib, ...prev]);
    }

    setFinancialGoals((prev) => [newGoal, ...prev]);
    return newGoal;
  };

  const contributeToGoal = (
    goalId: string,
    amount: number,
    sourceAccountId?: string,
    note?: string
  ) => {
    const goal = financialGoals.find((g) => g.id === goalId);
    if (!goal) return { success: false, error: 'Goal not found.' };

    const parsedAmt = round2(amount);
    if (parsedAmt <= 0) return { success: false, error: 'Contribution must be greater than zero.' };

    const todayStr = new Date().toISOString().split('T')[0];

    if (goal.goalMode === 'tracking_goal') {
      // Lock 3: tracking_goal does NOT post to double-entry ledger or manufacture an expense
      const contrib: GoalContribution = {
        id: newId('gc'),
        goalId,
        amount: parsedAmt,
        contributionDate: todayStr,
        note: note || 'Contribution to tracking goal',
        createdAt: new Date().toISOString(),
      };
      setGoalContributions((prev) => [contrib, ...prev]);
      return { success: true };
    } else {
      // Lock 3: linked_savings_account_goal posts a real double-entry transfer
      if (!sourceAccountId) {
        return { success: false, error: 'Source funding account is required for linked account goals.' };
      }
      if (!goal.linkedAccountId) {
        return { success: false, error: 'Goal does not have a linked savings account.' };
      }

      const txRes = postTransaction({
        date: todayStr,
        type: 'transfer',
        note: `Goal Contribution: ${goal.name}`,
        lines: [
          { lineType: 'account', accountId: sourceAccountId, amount: -parsedAmt, memo: `Transfer to ${goal.name}` },
          { lineType: 'account', accountId: goal.linkedAccountId, amount: parsedAmt, memo: `Goal deposit from ${sourceAccountId}` },
        ],
      });

      return txRes;
    }
  };

  const updateGoalStatus = (goalId: string, status: 'in_progress' | 'achieved' | 'cancelled') => {
    setFinancialGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, status } : g))
    );
  };

  // ----------------------------------------------------
  // Phase 3 Actions: DPS (Deposit Pension Scheme)
  // ----------------------------------------------------

  const openDps = (input: NewDpsInput) => {
    const sourceAcc = accounts.find((a) => a.id === input.sourceAccountId);
    if (!sourceAcc) return { success: false, error: 'Funding source account not found.' };

    const currentBalance = getAccountBalance(sourceAcc.id);
    if (['cash', 'bank', 'mobile_wallet'].includes(sourceAcc.accountType) && currentBalance < input.monthlyInstallment) {
      return {
        success: false,
        error: `অপর্যাপ্ত ব্যালেন্স: "${sourceAcc.name}" অ্যাকাউন্টে ডিপিএস (DPS) ১ম কিস্তির জন্য পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, ১ম কিস্তির পরিমাণ: ৳${input.monthlyInstallment.toLocaleString()})। ডিপিএস খোলার পূর্বে অনুগ্রহ করে সোর্স অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${sourceAcc.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${input.monthlyInstallment.toLocaleString()}). Please deposit money into your account first before opening DPS.`,
      };
    }

    const dpsAccountId = newId('acc-dps');
    const dpsId = newId('dps');

    const maturityCalc = calculateDpsMaturity(
      input.monthlyInstallment,
      input.interestRate,
      input.tenureMonths,
      input.taxRate || 10.0
    );

    const startObj = new Date(input.startDate);
    const maturityObj = new Date(startObj);
    maturityObj.setMonth(maturityObj.getMonth() + input.tenureMonths);
    const maturityDateStr = maturityObj.toISOString().split('T')[0];

    // 1. Create DPS Account in canonical accounts table
    const dpsAccount: Account = {
      id: dpsAccountId,
      userId,
      name: `DPS: ${input.institutionName} (৳${input.monthlyInstallment.toLocaleString()}/mo)`,
      accountType: 'dps',
      currency: 'BDT',
      institutionName: input.institutionName,
      accountNumberMask: input.dpsNumber || `DPS-${Date.now().toString().slice(-6)}`,
      isZakatable: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    // 2. Create DPS Master Record
    const dpsRecord: DpsAccount = {
      id: dpsId,
      userId,
      dpsAccountId,
      sourceAccountId: input.sourceAccountId,
      institutionName: input.institutionName,
      dpsNumber: input.dpsNumber || `DPS-${Date.now().toString().slice(-6)}`,
      monthlyInstallment: round2(input.monthlyInstallment),
      tenureMonths: input.tenureMonths,
      interestRate: input.interestRate,
      interestCalculationMethod: 'compound_monthly',
      taxRate: input.taxRate || 10.0,
      grossInterest: maturityCalc.grossInterest,
      netInterest: maturityCalc.netInterest,
      startDate: input.startDate,
      maturityDate: maturityDateStr,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Generate Installments Schedule
    const newInstallments: DpsInstallment[] = [];
    for (let i = 1; i <= input.tenureMonths; i++) {
      const d = new Date(startObj);
      d.setMonth(d.getMonth() + (i - 1));
      newInstallments.push({
        id: `inst-${dpsId}-${i}`,
        dpsAccountId: dpsId,
        installmentNumber: i,
        dueDate: d.toISOString().split('T')[0],
        expectedAmount: round2(input.monthlyInstallment),
        status: i === 1 ? 'paid' : 'pending',
        paidAmount: i === 1 ? round2(input.monthlyInstallment) : undefined,
        paidDate: i === 1 ? input.startDate : undefined,
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Automatically post double-entry transfer for 1st installment
    // Source Bank: -installment
    // DPS Account: +installment
    // Sum = 0! Net worth unchanged.
    const firstTxId = newId('tx-dps-inst');
    const firstTx: Transaction = {
      id: firstTxId,
      userId,
      date: input.startDate,
      type: 'transfer',
      status: 'posted',
      version: 1,
      note: `1st Installment for DPS: ${input.institutionName}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const firstTxLines: TransactionLine[] = [
      {
        id: newId('tl-dps-1'),
        transactionId: firstTxId,
        lineType: 'account',
        accountId: input.sourceAccountId,
        amount: -round2(input.monthlyInstallment),
        memo: `DPS installment #1 deduction`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-dps-2'),
        transactionId: firstTxId,
        lineType: 'account',
        accountId: dpsAccountId,
        amount: round2(input.monthlyInstallment),
        memo: `DPS installment #1 deposit`,
        createdAt: new Date().toISOString(),
      },
    ];

    newInstallments[0].transactionId = firstTxId;

    setAccounts((prev) => [...prev, dpsAccount]);
    setDpsAccounts((prev) => [dpsRecord, ...prev]);
    setDpsInstallments((prev) => [...prev, ...newInstallments]);
    setTransactions((prev) => [firstTx, ...prev]);
    setTransactionLines((prev) => [...prev, ...firstTxLines]);

    return { success: true, dps: dpsRecord };
  };

  const payDpsInstallment = (dpsAccountId: string, installmentNumber: number, sourceAccountId: string) => {
    const dps = dpsAccounts.find((d) => d.id === dpsAccountId);
    if (!dps) return { success: false, error: 'DPS account not found.' };

    const inst = dpsInstallments.find(
      (i) => i.dpsAccountId === dpsAccountId && i.installmentNumber === installmentNumber
    );
    if (!inst) return { success: false, error: 'Installment not found.' };
    if (inst.status === 'paid') return { success: false, error: 'Installment is already paid.' };

    const sourceAcc = accounts.find((a) => a.id === sourceAccountId);
    if (!sourceAcc) return { success: false, error: 'Payment source account not found.' };

    const currentBalance = getAccountBalance(sourceAccountId);
    if (['cash', 'bank', 'mobile_wallet'].includes(sourceAcc.accountType) && currentBalance < inst.expectedAmount) {
      return {
        success: false,
        error: `অপর্যাপ্ত ব্যালেন্স: "${sourceAcc.name}" অ্যাকাউন্টে ডিপিএস কিস্তি দেওয়ার মতো পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, কিস্তির পরিমাণ: ৳${inst.expectedAmount.toLocaleString()})। কিস্তি পরিশোধের পূর্বে অনুগ্রহ করে এই অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${sourceAcc.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${inst.expectedAmount.toLocaleString()}). Please deposit money into this account first before paying installment.`,
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const txId = newId('tx-dps-pay');

    // Double-entry transfer
    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'transfer',
      status: 'posted',
      version: 1,
      note: `DPS Installment #${installmentNumber} (${dps.institutionName})`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const lines: TransactionLine[] = [
      {
        id: newId('tl-dpsp-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: sourceAccountId,
        amount: -inst.expectedAmount,
        memo: `DPS installment #${installmentNumber} payment`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-dpsp-2'),
        transactionId: txId,
        lineType: 'account',
        accountId: dps.dpsAccountId,
        amount: inst.expectedAmount,
        memo: `DPS deposit received`,
        createdAt: new Date().toISOString(),
      },
    ];

    setDpsInstallments((prev) =>
      prev.map((i) =>
        i.id === inst.id
          ? {
              ...i,
              status: 'paid' as const,
              paidAmount: inst.expectedAmount,
              paidDate: todayStr,
              transactionId: txId,
            }
          : i
      )
    );

    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);

    return { success: true };
  };

  const matureDps = (dpsAccountId: string, destinationAccountId: string) => {
    const dps = dpsAccounts.find((d) => d.id === dpsAccountId);
    if (!dps) return { success: false, error: 'DPS not found.' };
    if (dps.status !== 'active') return { success: false, error: 'DPS is not active.' };

    const balanceView = accountBalances.find((b) => b.accountId === dps.dpsAccountId);
    const accumulatedPrincipal = balanceView ? balanceView.currentBalance : round2(dps.monthlyInstallment * dps.tenureMonths);

    const maturityCalc = calculateDpsMaturity(
      dps.monthlyInstallment,
      dps.interestRate,
      dps.tenureMonths,
      dps.taxRate
    );

    const txId = newId('tx-dps-mat');
    const todayStr = new Date().toISOString().split('T')[0];

    // Double-entry maturity liquidation:
    // 1. DPS Account: -accumulatedPrincipal
    // 2. Gross Interest: -grossInterest (Category line: Bank Interest)
    // 3. Tax Category: +withholdingTax (Category line: Tax & Bank Charges)
    // 4. Target Bank: +(accumulatedPrincipal + netInterest)
    // Sum = 0!
    const totalPayout = round2(accumulatedPrincipal + maturityCalc.netInterest);

    const lines: TransactionLine[] = [
      {
        id: newId('tl-dmat-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: dps.dpsAccountId,
        amount: -accumulatedPrincipal,
        memo: 'DPS principal liquidation',
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-dmat-2'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-inc-3', // Bank Interest
        amount: -maturityCalc.grossInterest,
        memo: `Gross DPS interest earned (${dps.interestRate}%)`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-dmat-3'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-exp-7', // Tax & Charges
        amount: maturityCalc.withholdingTax,
        memo: `Withholding tax on DPS interest (${dps.taxRate}%)`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-dmat-4'),
        transactionId: txId,
        lineType: 'account',
        accountId: destinationAccountId,
        amount: totalPayout,
        memo: 'DPS maturity liquidation deposit',
        createdAt: new Date().toISOString(),
      },
    ];

    const maturityTx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'fd_maturity', // settlement type
      status: 'posted',
      version: 1,
      note: `DPS Maturity Settlement: ${dps.institutionName} proceeds ৳${totalPayout.toLocaleString()}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDpsAccounts((prev) =>
      prev.map((d) => (d.id === dpsAccountId ? { ...d, status: 'matured' as const, updatedAt: new Date().toISOString() } : d))
    );
    setAccounts((prev) =>
      prev.map((a) => (a.id === dps.dpsAccountId ? { ...a, isArchived: true } : a))
    );
    setTransactions((prev) => [maturityTx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);

    return { success: true };
  };

  // ----------------------------------------------------
  // Phase 4 Actions: Debts, Loans, Assets, Net Worth, Zakat
  // ----------------------------------------------------

  /**
   * Action: Create Peer-to-Peer Debt (Lent or Borrowed)
   */
  const createDebt = (input: NewDebtInput) => {
    const debtId = newId('debt');
    const isLent = input.direction === 'lent';
    const todayStr = new Date().toISOString().split('T')[0];

    // Business Logic Guard: When lending money, check source account balance
    if (isLent) {
      const sourceAcc = accounts.find((a) => a.id === input.sourceOrDestAccountId);
      if (!sourceAcc) {
        return { success: false, error: 'Source funding account not found.' };
      }
      if (['cash', 'bank', 'mobile_wallet'].includes(sourceAcc.accountType)) {
        const currentBalance = getAccountBalance(sourceAcc.id);
        if (currentBalance < input.initialAmount) {
          return {
            success: false,
            error: `অপর্যাপ্ত ব্যালেন্স: "${sourceAcc.name}" অ্যাকাউন্টে ঋণ/ধার দেওয়ার মতো পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, ধারের পরিমাণ: ৳${input.initialAmount.toLocaleString()})। টাকা ধার দেওয়ার পূর্বে অনুগ্রহ করে অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${sourceAcc.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${input.initialAmount.toLocaleString()}). Please deposit money into this account first before lending.`,
          };
        }
      }
    }

    const accId = newId(isLent ? 'acc-rec' : 'acc-pay');

    const debtAccount: Account = {
      id: accId,
      userId,
      name: `${isLent ? 'Receivable' : 'Payable'}: ${input.personName}`,
      accountType: isLent ? 'receivable' : 'payable',
      currency: 'BDT',
      institutionName: isLent ? 'Personal Lending' : 'Personal Borrowing',
      isZakatable: isLent,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    const txId = newId('tx-debt');
    const lines: TransactionLine[] = [
      {
        id: newId('tl-d1'),
        transactionId: txId,
        lineType: 'account',
        accountId: input.sourceOrDestAccountId,
        amount: isLent ? -input.initialAmount : input.initialAmount,
        memo: isLent ? `Lent money to ${input.personName}` : `Borrowed money from ${input.personName}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-d2'),
        transactionId: txId,
        lineType: 'account',
        accountId: accId,
        amount: isLent ? input.initialAmount : -input.initialAmount,
        memo: isLent ? `Receivable from ${input.personName}` : `Payable to ${input.personName}`,
        createdAt: new Date().toISOString(),
      },
    ];

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: isLent ? 'person_lend' : 'person_borrow',
      status: 'posted',
      version: 1,
      note: `${isLent ? 'Lent' : 'Borrowed'} ৳${input.initialAmount.toLocaleString()} - ${input.personName}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newDebt: Debt = {
      id: debtId,
      userId,
      linkedAccountId: accId,
      personName: input.personName,
      contactPhone: input.contactPhone,
      direction: input.direction,
      initialAmount: input.initialAmount,
      dueDate: input.dueDate,
      status: 'active',
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev, debtAccount]);
    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);
    setDebts((prev) => [newDebt, ...prev]);

    return { success: true, debt: newDebt };
  };

  /**
   * Action: Settle / Repay Peer-to-Peer Debt
   */
  const settleDebt = (debtId: string, amount: number, settlementAccountId: string, note?: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return { success: false, error: 'Debt record not found' };

    const todayStr = new Date().toISOString().split('T')[0];
    const isLent = debt.direction === 'lent';

    // Business Logic Guard: When repaying borrowed debt, check settlement account balance
    if (!isLent) {
      const settleAcc = accounts.find((a) => a.id === settlementAccountId);
      if (!settleAcc) {
        return { success: false, error: 'Settlement payment account not found.' };
      }
      if (['cash', 'bank', 'mobile_wallet'].includes(settleAcc.accountType)) {
        const currentBalance = getAccountBalance(settlementAccountId);
        if (currentBalance < amount) {
          return {
            success: false,
            error: `অপর্যাপ্ত ব্যালেন্স: "${settleAcc.name}" অ্যাকাউন্টে ঋণ পরিশোধের মতো পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, পরিশোধের পরিমাণ: ৳${amount.toLocaleString()})। ঋণ পরিশোধের পূর্বে অনুগ্রহ করে অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${settleAcc.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${amount.toLocaleString()}). Please deposit money into this account first before repaying debt.`,
          };
        }
      }
    }

    const txId = newId('tx-settle');

    // If lent: Bank/Cash gets +amount, Receivable gets -amount
    // If borrowed: Bank/Cash gets -amount, Payable gets +amount (reduces liability)
    const lines: TransactionLine[] = [
      {
        id: newId('tl-set1'),
        transactionId: txId,
        lineType: 'account',
        accountId: settlementAccountId,
        amount: isLent ? amount : -amount,
        memo: isLent ? `Repayment received from ${debt.personName}` : `Repaid debt to ${debt.personName}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-set2'),
        transactionId: txId,
        lineType: 'account',
        accountId: debt.linkedAccountId,
        amount: isLent ? -amount : amount,
        memo: `Settlement for ${debt.personName}`,
        createdAt: new Date().toISOString(),
      },
    ];

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'debt_settlement',
      status: 'posted',
      version: 1,
      note: note || `Debt settlement: ৳${amount.toLocaleString()} with ${debt.personName}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const currentBalance = accountBalances.find((b) => b.accountId === debt.linkedAccountId)?.currentBalance || 0;
    const newRemaining = isLent ? currentBalance - amount : currentBalance + amount;
    const isFullySettled = isLent ? newRemaining <= 0.01 : newRemaining >= -0.01;

    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);
    if (isFullySettled) {
      setDebts((prev) =>
        prev.map((d) => (d.id === debtId ? { ...d, status: 'settled', updatedAt: new Date().toISOString() } : d))
      );
    }

    return { success: true };
  };

  /**
   * Action: Update Debt Status
   */
  const updateDebtStatus = (debtId: string, status: DebtStatus) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, status, updatedAt: new Date().toISOString() } : d))
    );
  };

  /**
   * Action: Create Bank Loan with Amortization Schedule
   */
  const createLoan = (input: NewLoanInput) => {
    const loanId = newId('loan');
    const loanAccId = newId('acc-loan');
    const todayStr = input.disbursementDate || new Date().toISOString().split('T')[0];

    const { emi } =
      input.interestMethod === 'reducing'
        ? calculateReducingEmi(input.principal, input.annualInterestRate, input.tenureMonths)
        : calculateFlatEmi(input.principal, input.annualInterestRate, input.tenureMonths);

    const loanAccount: Account = {
      id: loanAccId,
      userId,
      name: `${input.institutionName} ${input.loanType.toUpperCase()} Loan`,
      accountType: 'loan',
      currency: 'BDT',
      institutionName: input.institutionName,
      isZakatable: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    // Disbursement transaction: Bank/Cash +principal, Loan account -principal (Liability is negative!)
    const txId = newId('tx-ldisb');
    const lines: TransactionLine[] = [
      {
        id: newId('tl-ldisb-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: input.disbursementAccountId,
        amount: input.principal,
        memo: `Loan proceeds disbursed from ${input.institutionName}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-ldisb-2'),
        transactionId: txId,
        lineType: 'account',
        accountId: loanAccId,
        amount: -input.principal,
        memo: `Initial loan liability recognized`,
        createdAt: new Date().toISOString(),
      },
    ];

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'loan_disbursement',
      status: 'posted',
      version: 1,
      note: `Loan disbursement: ${input.institutionName} ৳${input.principal.toLocaleString()}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const schedule = generateLoanAmortizationSchedule(
      loanId,
      input.principal,
      input.annualInterestRate,
      input.tenureMonths,
      todayStr,
      input.interestMethod,
      1
    );

    const newLoan: Loan = {
      id: loanId,
      userId,
      loanAccountId: loanAccId,
      disbursementAccountId: input.disbursementAccountId,
      institutionName: input.institutionName,
      loanType: input.loanType,
      interestMethod: input.interestMethod,
      rateType: input.rateType,
      principal: input.principal,
      annualInterestRate: input.annualInterestRate,
      tenureMonths: input.tenureMonths,
      emiAmount: emi,
      disbursementDate: todayStr,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev, loanAccount]);
    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);
    setLoans((prev) => [newLoan, ...prev]);
    setLoanSchedules((prev) => [...schedule, ...prev]);

    return { success: true, loan: newLoan };
  };

  /**
   * Action: Pay Loan EMI Installment
   */
  const payLoanEmi = (loanId: string, installmentNumber: number, paymentAccountId: string) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return { success: false, error: 'Loan record not found' };

    const scheduleItem = loanSchedules.find(
      (s) => s.loanId === loanId && s.installmentNumber === installmentNumber
    );
    if (!scheduleItem) return { success: false, error: 'Schedule installment not found' };
    if (scheduleItem.status === 'paid') return { success: false, error: 'Installment already paid' };

    const payAcc = accounts.find((a) => a.id === paymentAccountId);
    if (!payAcc) return { success: false, error: 'Payment account not found' };

    const currentBalance = getAccountBalance(paymentAccountId);
    if (['cash', 'bank', 'mobile_wallet'].includes(payAcc.accountType) && currentBalance < scheduleItem.scheduledEmiAmount) {
      return {
        success: false,
        error: `অপর্যাপ্ত ব্যালেন্স: "${payAcc.name}" অ্যাকাউন্টে ঋণের ইএমআই দেওয়ার মতো পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, ইএমআই: ৳${scheduleItem.scheduledEmiAmount.toLocaleString()})। ইএমআই পরিশোধের পূর্বে অনুগ্রহ করে এই অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${payAcc.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${scheduleItem.scheduledEmiAmount.toLocaleString()}). Please deposit money into this account first before paying EMI.`,
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const txId = newId('tx-emi');

    // Section 9.4:
    // Bank Account: -scheduledEmiAmount
    // Loan Account: +scheduledPrincipal (reduces negative loan liability)
    // Category (Loan Interest Expense): +scheduledInterest
    // Invariant: -EMI + Principal + Interest === 0.00
    const lines: TransactionLine[] = [
      {
        id: newId('tl-emi-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: paymentAccountId,
        amount: -scheduleItem.scheduledEmiAmount,
        memo: `EMI payment #${installmentNumber} to ${loan.institutionName}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-emi-2'),
        transactionId: txId,
        lineType: 'account',
        accountId: loan.loanAccountId,
        amount: scheduleItem.scheduledPrincipal,
        memo: `Principal reduction for EMI #${installmentNumber}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-emi-3'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-exp-9', // Loan Interest Expense
        amount: scheduleItem.scheduledInterest,
        memo: `Interest portion on loan #${loan.institutionName}`,
        createdAt: new Date().toISOString(),
      },
    ];

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'loan_emi',
      status: 'posted',
      version: 1,
      note: `EMI #${installmentNumber} payment for ${loan.institutionName}: ৳${scheduleItem.scheduledEmiAmount.toLocaleString()}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLoanSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleItem.id
          ? { ...s, status: 'paid' as const, paidDate: todayStr, transactionId: txId }
          : s
      )
    );

    if (installmentNumber === loan.tenureMonths || scheduleItem.remainingPrincipalAfter <= 0) {
      setLoans((prev) =>
        prev.map((l) => (l.id === loanId ? { ...l, status: 'paid_off' as const, updatedAt: new Date().toISOString() } : l))
      );
    }

    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);

    return { success: true };
  };

  /**
   * Action: Register Physical Asset (e.g. Real Estate, Vehicle, Gold)
   */
  const createPhysicalAsset = (input: NewPhysicalAssetInput) => {
    // Business Logic Guard: When paying cash or downpayment, check funding account balance
    if (input.fundingAccountId) {
      const fundAcc = accounts.find((a) => a.id === input.fundingAccountId);
      if (fundAcc && ['cash', 'bank', 'mobile_wallet'].includes(fundAcc.accountType)) {
        const requiredCash = input.fundingMethod === 'full_cash'
          ? input.purchasePrice
          : (input.fundingMethod === 'cash_plus_loan' ? (input.cashDownpayment || 0) : 0);

        if (requiredCash > 0) {
          const currentBalance = getAccountBalance(fundAcc.id);
          if (currentBalance < requiredCash) {
            return {
              success: false,
              error: `অপর্যাপ্ত ব্যালেন্স: "${fundAcc.name}" অ্যাকাউন্টে সম্পদ ক্রয়ের জন্য পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, প্রয়োজনীয় ক্যাশ: ৳${requiredCash.toLocaleString()})। সম্পদ ক্রয়ের পূর্বে অনুগ্রহ করে এই অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${fundAcc.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${requiredCash.toLocaleString()}). Please deposit money into this account first before purchasing asset.`,
            };
          }
        }
      }
    }

    const assetId = newId('asset');
    const assetAccId = newId('acc-asset');
    const todayStr = input.purchaseDate || new Date().toISOString().split('T')[0];

    const assetAccount: Account = {
      id: assetAccId,
      userId,
      name: `Asset: ${input.assetName}`,
      accountType: 'asset',
      currency: 'BDT',
      institutionName: input.assetCategory.replace('_', ' ').toUpperCase(),
      isZakatable: input.assetCategory === 'gold_jewelry',
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    const txId = newId('tx-asset');
    const lines: TransactionLine[] = [
      {
        id: newId('tl-ass-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: assetAccId,
        amount: input.purchasePrice,
        memo: `Acquisition of ${input.assetName}`,
        createdAt: new Date().toISOString(),
      },
    ];

    if (input.fundingMethod === 'full_cash' && input.fundingAccountId) {
      lines.push({
        id: newId('tl-ass-2'),
        transactionId: txId,
        lineType: 'account',
        accountId: input.fundingAccountId,
        amount: -input.purchasePrice,
        memo: `Cash/Bank funding for ${input.assetName}`,
        createdAt: new Date().toISOString(),
      });
    } else if (input.fundingMethod === 'cash_plus_loan') {
      if (input.fundingAccountId && input.cashDownpayment) {
        lines.push({
          id: newId('tl-ass-2'),
          transactionId: txId,
          lineType: 'account',
          accountId: input.fundingAccountId,
          amount: -input.cashDownpayment,
          memo: `Downpayment for ${input.assetName}`,
          createdAt: new Date().toISOString(),
        });
      }
      if (input.loanAccountId && input.loanFinancedAmount) {
        lines.push({
          id: newId('tl-ass-3'),
          transactionId: txId,
          lineType: 'account',
          accountId: input.loanAccountId,
          amount: -input.loanFinancedAmount,
          memo: `Loan financing for ${input.assetName}`,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Opening balance equity
      lines.push({
        id: newId('tl-ass-2'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-adj-1',
        amount: -input.purchasePrice,
        memo: `Opening balance equity for existing asset: ${input.assetName}`,
        createdAt: new Date().toISOString(),
      });
    }

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'asset_purchase',
      status: 'posted',
      version: 1,
      note: `Physical Asset Acquisition: ${input.assetName} (৳${input.purchasePrice.toLocaleString()})`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newAsset: PhysicalAsset = {
      id: assetId,
      userId,
      assetAccountId: assetAccId,
      assetName: input.assetName,
      assetCategory: input.assetCategory,
      purchaseDate: todayStr,
      purchasePrice: input.purchasePrice,
      description: input.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev, assetAccount]);
    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);
    setPhysicalAssets((prev) => [newAsset, ...prev]);

    return { success: true, asset: newAsset };
  };

  /**
   * Action: Register Static Personal Liability
   */
  const createStaticLiability = (name: string, type: string, amount: number, sourceAccountId?: string) => {
    const liabId = newId('liab');
    const liabAccId = newId('acc-liab');
    const todayStr = new Date().toISOString().split('T')[0];

    const liabAccount: Account = {
      id: liabAccId,
      userId,
      name: `Liability: ${name}`,
      accountType: 'liability',
      currency: 'BDT',
      institutionName: type,
      isZakatable: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    const txId = newId('tx-liab');
    const lines: TransactionLine[] = [
      {
        id: newId('tl-liab-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: liabAccId,
        amount: -amount,
        memo: `Liability recognized: ${name}`,
        createdAt: new Date().toISOString(),
      },
    ];

    if (sourceAccountId) {
      lines.push({
        id: newId('tl-liab-2'),
        transactionId: txId,
        lineType: 'account',
        accountId: sourceAccountId,
        amount: amount,
        memo: `Funds received from liability obligation: ${name}`,
        createdAt: new Date().toISOString(),
      });
    } else {
      lines.push({
        id: newId('tl-liab-2'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-adj-1',
        amount: amount,
        memo: `Opening equity adjustment for liability: ${name}`,
        createdAt: new Date().toISOString(),
      });
    }

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'adjustment',
      status: 'posted',
      version: 1,
      note: `Liability registered: ${name} (৳${amount.toLocaleString()})`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newLiab: StaticLiability = {
      id: liabId,
      userId,
      liabilityAccountId: liabAccId,
      liabilityName: name,
      liabilityType: type,
      initialAmount: amount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev, liabAccount]);
    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);
    setStaticLiabilities((prev) => [newLiab, ...prev]);

    return { success: true };
  };

  /**
   * Action: Capture Balance Sheet Snapshot
   */
  const saveNetWorthSnapshot = (notes?: string): NetWorthSnapshot => {
    const todayStr = new Date().toISOString().split('T')[0];
    let totalAssets = 0;
    let totalLiabilities = 0;

    accountBalances.forEach((b) => {
      if (b.currentBalance > 0) {
        totalAssets += b.currentBalance;
      } else if (b.currentBalance < 0) {
        totalLiabilities += Math.abs(b.currentBalance);
      }
    });

    const netWorth = round2(totalAssets - totalLiabilities);

    const snapshot: NetWorthSnapshot = {
      id: newId('nw'),
      userId,
      snapshotDate: todayStr,
      totalAssets: round2(totalAssets),
      totalLiabilities: round2(totalLiabilities),
      netWorth,
      notes: notes || 'Manual balance sheet snapshot',
      createdAt: new Date().toISOString(),
    };

    setNetWorthSnapshots((prev) => [snapshot, ...prev]);
    return snapshot;
  };

  /**
   * Action: Update Zakat Settings
   */
  const updateZakatSettings = (updated: Partial<ZakatSettings>) => {
    setZakatSettings((prev) => ({
      ...prev,
      ...updated,
      updatedAt: new Date().toISOString(),
    }));
  };

  /**
   * Action: Disburse Zakat (Posts expense to Zakat category)
   */
  const disburseZakat = (amount: number, sourceAccountId: string, note?: string) => {
    const sourceAcc = accounts.find((a) => a.id === sourceAccountId);
    if (!sourceAcc) return { success: false, error: 'Source account not found' };

    const currentBalance = getAccountBalance(sourceAccountId);
    if (['cash', 'bank', 'mobile_wallet'].includes(sourceAcc.accountType) && currentBalance < amount) {
      return {
        success: false,
        error: `অপর্যাপ্ত ব্যালেন্স: "${sourceAcc.name}" অ্যাকাউন্টে যাকাত দেওয়ার মতো পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, যাকাত: ৳${amount.toLocaleString()})। যাকাত বিতরণের পূর্বে অনুগ্রহ করে অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। / Insufficient funds in "${sourceAcc.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${amount.toLocaleString()}). Please deposit money into this account first before disbursing zakat.`,
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const txId = newId('tx-zakat');

    const lines: TransactionLine[] = [
      {
        id: newId('tl-zk-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: sourceAccountId,
        amount: -amount,
        memo: note || 'Zakat fund distribution payment',
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-zk-2'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-exp-10', // Zakat & Charitable Donations
        amount: amount,
        memo: note || 'Obligatory Zakat disbursement',
        createdAt: new Date().toISOString(),
      },
    ];

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'zakat_payment',
      status: 'posted',
      version: 1,
      note: `Zakat disbursement: ৳${amount.toLocaleString()}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);

    return { success: true };
  };

  /**
   * Phase 5 Action: Create Brokerage Firm
   */
  const createBroker = (input: NewBrokerInput): Broker => {
    const newBroker: Broker = {
      id: newId('broker'),
      userId,
      name: input.name.trim(),
      licenseNumber: input.licenseNumber?.trim(),
      contactNumber: input.contactNumber?.trim(),
      createdAt: new Date().toISOString(),
    };
    setBrokers((prev) => [...prev, newBroker]);
    return newBroker;
  };

  /**
   * Phase 5 Action: Create BO Account
   */
  const createBrokerAccount = (input: NewBrokerAccountInput): BrokerAccount => {
    if (input.isDefault) {
      setBrokerAccounts((prev) => prev.map((ba) => ({ ...ba, isDefault: false })));
    }
    const newAccount: BrokerAccount = {
      id: newId('bo'),
      userId,
      brokerId: input.brokerId,
      boId: input.boId && input.boId.trim() ? input.boId.trim() : `BO-${Math.floor(10000000 + Math.random() * 90000000)}`,
      accountName: input.accountName.trim(),
      isDefault: input.isDefault ?? false,
      createdAt: new Date().toISOString(),
    };
    setBrokerAccounts((prev) => [...prev, newAccount]);
    return newAccount;
  };

  /**
   * Phase 5 Action: Deposit Cash to Broker Account
   * Supports both Bank Transfer and Direct Cash / External Inflow (Fresh Capital).
   */
  const depositBrokerCash = (input: NewBrokerDepositInput): { success: boolean; error?: string } => {
    if (input.amount <= 0) {
      return { success: false, error: 'Deposit amount must be greater than zero.' };
    }

    const todayStr = input.date || new Date().toISOString().split('T')[0];
    const txId = newId('tx-bkdep');
    let boAcc = brokerAccounts.find((b) => b.id === input.brokerAccountId) || brokerAccounts.find((b) => b.isDefault) || brokerAccounts[0];
    
    // Auto-create default BO Account if user has none yet
    if (!boAcc) {
      const defaultBroker = brokers[0] || { id: 'broker-default', name: 'BRAC EPL Stock Brokerage' };
      boAcc = {
        id: newId('bo-auto'),
        userId,
        brokerId: defaultBroker.id,
        boId: `120300${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        accountName: 'Main BO Trading Account',
        isDefault: true,
        createdAt: new Date().toISOString(),
      };
      setBrokerAccounts((prev) => [boAcc, ...prev]);
    }
    const targetBoAccountId = boAcc.id;
    const brokerName = brokers.find((b) => b.id === boAcc?.brokerId)?.name || 'Brokerage';

    const isDirectExternal = !input.sourceBankAccountId || input.sourceBankAccountId === 'direct_deposit' || input.sourceBankAccountId === 'external_cash';
    const sourceAccount = accounts.find((a) => a.id === input.sourceBankAccountId);

    // Business Logic Guard: When transferring from bank/cash account, verify sufficient balance
    if (!isDirectExternal) {
      if (!sourceAccount) {
        return {
          success: false,
          error: 'অনুগ্রহ করে একটি বৈধ সোর্স ব্যাংক বা ক্যাশ অ্যাকাউন্ট নির্বাচন করুন। / Please select a valid source bank account.',
        };
      }
      if (['cash', 'bank', 'mobile_wallet'].includes(sourceAccount.accountType)) {
        const currentBalance = getAccountBalance(sourceAccount.id);
        if (currentBalance < input.amount) {
          return {
            success: false,
            error: `অপর্যাপ্ত ব্যালেন্স: "${sourceAccount.name}" অ্যাকাউন্টে পর্যাপ্ত টাকা নেই (বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}, বিও অ্যাকাউন্টে ট্রান্সফার করতে চাওয়া হয়েছে: ৳${input.amount.toLocaleString()})। বিও অ্যাকাউন্টে ফান্ড পাঠানোর পূর্বে অনুগ্রহ করে আগে এই ব্যাংক অ্যাকাউন্টে টাকা ডিপোজিট/জমা করুন। অথবা 'Direct Cash (Fresh Capital)' নির্বাচন করুন। / Insufficient funds in "${sourceAccount.name}" (Available: ৳${currentBalance.toLocaleString()}, Required: ৳${input.amount.toLocaleString()}). Please deposit money into your bank account first before transferring to BO account, or select Direct Cash (Fresh Capital).`,
          };
        }
      }
    }

    const lines: TransactionLine[] = [];
    if (isDirectExternal || !sourceAccount) {
      // Fresh Capital Inflow (Increases Net Worth & Total Assets directly)
      lines.push({
        id: newId('tl-bkdep-1'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-adj-1', // Balancing / Capital Inflow
        amount: input.amount,
        memo: input.note || `Direct Cash / External Funding to BO: ${boAcc.boId}`,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Transfer from Bank Account to Broker Sub-Ledger
      lines.push(
        {
          id: newId('tl-bkdep-1'),
          transactionId: txId,
          lineType: 'account',
          accountId: sourceAccount.id,
          amount: -input.amount,
          memo: `Transfer to Broker: ${boAcc?.accountName || 'BO Account'} (${brokerName})`,
          createdAt: new Date().toISOString(),
        },
        {
          id: newId('tl-bkdep-2'),
          transactionId: txId,
          lineType: 'category',
          categoryId: 'cat-adj-1', // Balancing/Transfer
          amount: input.amount,
          memo: input.note || `Broker Cash Deposit (BO: ${boAcc?.boId})`,
          createdAt: new Date().toISOString(),
        }
      );
    }

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: isDirectExternal || !sourceAccount ? 'income' : 'transfer',
      status: 'posted',
      version: 1,
      note: `Broker Account Cash Funding: ৳${input.amount.toLocaleString()} to ${boAcc.accountName} (${boAcc.boId})`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Sub-ledger row in broker_cash_transactions
    const cashRow: BrokerCashTransaction = {
      id: newId('bct'),
      userId,
      brokerAccountId: targetBoAccountId,
      transactionDate: todayStr,
      type: 'deposit',
      amountSigned: round2(input.amount),
      note: input.note || (isDirectExternal ? 'Direct external cash funding' : 'Bank transfer funding'),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);
    setBrokerCashTransactions((prev) => [cashRow, ...prev]);

    return { success: true };
  };

  /**
   * Phase 5 Action: Withdraw Cash from Broker Account to Bank
   */
  const withdrawBrokerCash = (input: NewBrokerWithdrawalInput): { success: boolean; error?: string } => {
    if (input.amount <= 0) {
      return { success: false, error: 'Withdrawal amount must be greater than zero.' };
    }

    const boAcc = brokerAccounts.find((b) => b.id === input.brokerAccountId) || brokerAccounts.find((b) => b.isDefault) || brokerAccounts[0];
    const targetBoAccountId = boAcc?.id || input.brokerAccountId;
    if (!targetBoAccountId) {
      return { success: false, error: 'Source BO Account is required.' };
    }

    const boBalance = brokerCashBalances.find((b) => b.brokerAccountId === targetBoAccountId);
    const availableCash = boBalance ? boBalance.cashBalance : 0;

    if (availableCash < input.amount) {
      return {
        success: false,
        error: `Insufficient broker cash balance. Available: ৳${availableCash.toLocaleString()}, Requested: ৳${input.amount.toLocaleString()}`,
      };
    }

    const todayStr = input.date || new Date().toISOString().split('T')[0];
    const txId = newId('tx-bkwdr');
    const brokerName = brokers.find((b) => b.id === boAcc?.brokerId)?.name || 'Brokerage';

    const lines: TransactionLine[] = [
      {
        id: newId('tl-bkwdr-1'),
        transactionId: txId,
        lineType: 'account',
        accountId: input.destinationBankAccountId,
        amount: input.amount,
        memo: `Withdrawal from Broker: ${boAcc?.accountName || 'BO Account'} (${brokerName})`,
        createdAt: new Date().toISOString(),
      },
      {
        id: newId('tl-bkwdr-2'),
        transactionId: txId,
        lineType: 'category',
        categoryId: 'cat-adj-1',
        amount: -input.amount,
        memo: input.note || `Broker Cash Withdrawal (BO: ${boAcc?.boId})`,
        createdAt: new Date().toISOString(),
      },
    ];

    const tx: Transaction = {
      id: txId,
      userId,
      date: todayStr,
      type: 'transfer',
      status: 'posted',
      version: 1,
      note: `Broker Account Cash Withdrawal: ৳${input.amount.toLocaleString()} to Bank`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cashRow: BrokerCashTransaction = {
      id: newId('bct'),
      userId,
      brokerAccountId: targetBoAccountId,
      transactionDate: todayStr,
      type: 'withdrawal',
      amountSigned: -round2(input.amount),
      note: input.note || 'Bank withdrawal payout',
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [tx, ...prev]);
    setTransactionLines((prev) => [...prev, ...lines]);
    setBrokerCashTransactions((prev) => [cashRow, ...prev]);

    return { success: true };
  };

  /**
   * Phase 5 Action: Execute Stock Trade (Buy / Sell)
   * Enforces Lock 4:
   * Buy Cost Basis = Gross + Commission + Tax + Charges
   * Sell Net Proceeds = Gross - Commission - Tax - Charges
   * Detailed rows generated in broker_cash_transactions
   */
  const executeStockTrade = (
    input: NewStockTradeInput
  ): { success: boolean; transaction?: StockTransaction; error?: string } => {
    if (input.quantity <= 0) {
      return { success: false, error: 'Trade quantity must be greater than zero.' };
    }
    if (input.price <= 0) {
      return { success: false, error: 'Trade price must be greater than zero.' };
    }

    const tradeValues = calculateTradeValues({
      transactionType: input.transactionType,
      quantity: input.quantity,
      price: input.price,
      commissionRatePct: input.commissionRatePct,
      commissionAmount: input.commissionAmount,
      taxAmount: input.taxAmount,
      otherCharges: input.otherCharges,
    });

    const boBalance = brokerCashBalances.find((b) => b.brokerAccountId === input.brokerAccountId);
    const availableCash = boBalance ? boBalance.cashBalance : 0;

    // Buy validation: Check sufficient cash in BO account
    if (input.transactionType === 'buy') {
      if (availableCash < tradeValues.netValue) {
        return {
          success: false,
          error: `Insufficient broker cash balance. Required: ৳${tradeValues.netValue.toLocaleString()} (including fees), Available: ৳${availableCash.toLocaleString()}`,
        };
      }
    }

    // Sell validation: Check sufficient holdings in BO account
    if (input.transactionType === 'sell') {
      const currentHolding = stockHoldings.find(
        (h) => h.brokerAccountId === input.brokerAccountId && h.stockId === input.stockId
      );
      const heldShares = currentHolding ? currentHolding.quantity : 0;

      if (heldShares < input.quantity) {
        return {
          success: false,
          error: `Insufficient shares to sell. Available: ${heldShares.toLocaleString()} shares, Requested to sell: ${input.quantity.toLocaleString()} shares. Short selling is prohibited.`,
        };
      }
    }

    const stock = stocks.find((s) => s.id === input.stockId);
    const stockSymbol = stock?.symbol || 'STOCK';
    const tradeId = newId('st-tx');
    const tradeDate = input.tradeDate || new Date().toISOString().split('T')[0];
    const settlementDate = input.settlementDate || tradeDate;

    const newTrade: StockTransaction = {
      id: tradeId,
      userId,
      brokerAccountId: input.brokerAccountId,
      stockId: input.stockId,
      tradeDate,
      settlementDate,
      transactionType: input.transactionType,
      quantity: input.quantity,
      price: input.price,
      grossValue: tradeValues.grossValue,
      commission: tradeValues.commission,
      tax: tradeValues.tax,
      otherCharges: tradeValues.otherCharges,
      netValue: tradeValues.netValue,
      reference: input.reference || `ORD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };

    // Generate detailed component cash sub-ledger rows
    const cashRows: BrokerCashTransaction[] = [];

    if (input.transactionType === 'buy') {
      // 1. Gross value outflow
      cashRows.push({
        id: `bct-${tradeId}-gross`,
        userId,
        brokerAccountId: input.brokerAccountId,
        transactionDate: tradeDate,
        type: 'buy_gross',
        amountSigned: -tradeValues.grossValue,
        linkedStockTransactionId: tradeId,
        note: `Buy ${input.quantity} ${stockSymbol} @ ৳${input.price} gross`,
        createdAt: new Date().toISOString(),
      });

      // 2. Commission outflow
      if (tradeValues.commission > 0) {
        cashRows.push({
          id: `bct-${tradeId}-comm`,
          userId,
          brokerAccountId: input.brokerAccountId,
          transactionDate: tradeDate,
          type: 'commission',
          amountSigned: -tradeValues.commission,
          linkedStockTransactionId: tradeId,
          note: `Brokerage commission on ${stockSymbol} buy`,
          createdAt: new Date().toISOString(),
        });
      }

      // 3. Tax outflow
      if (tradeValues.tax > 0) {
        cashRows.push({
          id: `bct-${tradeId}-tax`,
          userId,
          brokerAccountId: input.brokerAccountId,
          transactionDate: tradeDate,
          type: 'tax',
          amountSigned: -tradeValues.tax,
          linkedStockTransactionId: tradeId,
          note: `Tax on ${stockSymbol} trade`,
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Other charges
      if (tradeValues.otherCharges > 0) {
        cashRows.push({
          id: `bct-${tradeId}-chg`,
          userId,
          brokerAccountId: input.brokerAccountId,
          transactionDate: tradeDate,
          type: 'other_charge',
          amountSigned: -tradeValues.otherCharges,
          linkedStockTransactionId: tradeId,
          note: `Exchange / CDBL charges on ${stockSymbol} trade`,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Sell order
      // 1. Gross value inflow
      cashRows.push({
        id: `bct-${tradeId}-gross`,
        userId,
        brokerAccountId: input.brokerAccountId,
        transactionDate: tradeDate,
        type: 'sell_gross',
        amountSigned: tradeValues.grossValue,
        linkedStockTransactionId: tradeId,
        note: `Sell ${input.quantity} ${stockSymbol} @ ৳${input.price} gross`,
        createdAt: new Date().toISOString(),
      });

      // 2. Commission outflow
      if (tradeValues.commission > 0) {
        cashRows.push({
          id: `bct-${tradeId}-comm`,
          userId,
          brokerAccountId: input.brokerAccountId,
          transactionDate: tradeDate,
          type: 'commission',
          amountSigned: -tradeValues.commission,
          linkedStockTransactionId: tradeId,
          note: `Brokerage commission on ${stockSymbol} sell`,
          createdAt: new Date().toISOString(),
        });
      }

      // 3. AIT Tax outflow
      if (tradeValues.tax > 0) {
        cashRows.push({
          id: `bct-${tradeId}-tax`,
          userId,
          brokerAccountId: input.brokerAccountId,
          transactionDate: tradeDate,
          type: 'tax',
          amountSigned: -tradeValues.tax,
          linkedStockTransactionId: tradeId,
          note: `Advance Income Tax (AIT) on ${stockSymbol} sell`,
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Other charges
      if (tradeValues.otherCharges > 0) {
        cashRows.push({
          id: `bct-${tradeId}-chg`,
          userId,
          brokerAccountId: input.brokerAccountId,
          transactionDate: tradeDate,
          type: 'other_charge',
          amountSigned: -tradeValues.otherCharges,
          linkedStockTransactionId: tradeId,
          note: `CDBL / Hawla charges on ${stockSymbol} sell`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    setStockTransactions((prev) => [newTrade, ...prev]);
    setBrokerCashTransactions((prev) => [...cashRows, ...prev]);

    return { success: true, transaction: newTrade };
  };

  /**
   * Phase 5 & 6 Action: Update Live Stock Market Price & Record to History
   */
  const updateStockPrice = (stockId: string, newPrice: number) => {
    const today = new Date().toISOString().split('T')[0];
    setStocks((prev) =>
      prev.map((s) => (s.id === stockId ? { ...s, currentPrice: round2(newPrice) } : s))
    );

    // Record into stock_price_history
    const newHist: StockPriceHistory = {
      id: newId(`sph-${stockId}-${today}`),
      stockId,
      priceDate: today,
      closePrice: round2(newPrice),
      source: 'MANUAL',
      createdAt: new Date().toISOString(),
    };

    setStockPriceHistory((prev) => {
      const filtered = prev.filter(
        (p) => !(p.stockId === stockId && p.priceDate === today)
      );
      return [newHist, ...filtered];
    });
  };

  /**
   * Phase 5 Action: Add New Security to Master Catalog
   */
  const addCustomStock = (stockInput: Omit<Stock, 'id' | 'createdAt'>): Stock => {
    const newStock: Stock = {
      ...stockInput,
      id: newId(`stock-${stockInput.symbol.toLowerCase()}`),
      symbol: stockInput.symbol.toUpperCase().trim(),
      companyName: stockInput.companyName.trim(),
      createdAt: new Date().toISOString(),
    };
    setStocks((prev) => [...prev, newStock]);
    return newStock;
  };

  /**
   * Phase 5 Action: Delete Security from Watchlist/Catalog
   */
  const deleteStock = (stockId: string): { success: boolean; message: string } => {
    const targetStock = stocks.find((s) => s.id === stockId);
    if (!targetStock) {
      return { success: false, message: 'Stock not found.' };
    }
    const hasTrades = stockTransactions.some((t) => t.stockId === stockId);
    if (hasTrades) {
      return {
        success: false,
        message: `Cannot delete "${targetStock.symbol}" because it has existing transaction records or active holdings.`,
      };
    }
    setStocks((prev) => prev.filter((s) => s.id !== stockId));
    return {
      success: true,
      message: `"${targetStock.symbol}" removed from watchlist.`,
    };
  };

  /**
   * Phase 5 Action: Clear All Unused Stocks (no transactions)
   */
  const clearUnusedStocks = (): number => {
    const activeStockIdsWithTrades = new Set(stockTransactions.map((t) => t.stockId));
    let removedCount = 0;
    setStocks((prev) => {
      const filtered = prev.filter((s) => {
        if (activeStockIdsWithTrades.has(s.id)) return true;
        removedCount++;
        return false;
      });
      return filtered;
    });
    return removedCount;
  };

  // ----------------------------------------------------
  // DSE & StockChartBD Market Data Sync with Manual Resilience
  // ----------------------------------------------------

  const [dseSyncStatus, setDseSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'success' | 'failed';
    message?: string;
    lastSyncedAt?: string;
    source?: string;
    isManualOnly?: boolean;
  }>(() => {
    const cfg = getDseApiConfig();
    return {
      status: cfg.lastSyncStatus === 'rate_limited' ? 'failed' : cfg.lastSyncStatus,
      lastSyncedAt: cfg.lastSyncedAt,
      isManualOnly: cfg.mode === 'manual_only',
    };
  });

  const toggleDseManualMode = (manualOnly: boolean) => {
    saveDseApiConfig({ mode: manualOnly ? 'manual_only' : 'auto' });
    setDseSyncStatus((prev) => ({
      ...prev,
      isManualOnly: manualOnly,
      message: manualOnly ? 'Manual override mode enabled. Automatic API syncing paused.' : 'Automatic API sync enabled.',
    }));
  };

  const syncDsePrices = async (): Promise<{ success: boolean; message: string; updatedCount: number; source: string }> => {
    setDseSyncStatus((prev) => ({ ...prev, status: 'syncing', message: 'Fetching latest prices from StockChartBD & DSE...' }));
    
    try {
      const activeSymbols = stocks.map((s) => s.symbol);
      const { quotes, source, error } = await fetchDseMarketQuotes(activeSymbols);
      const quoteKeys = Object.keys(quotes);

      if (quoteKeys.length === 0) {
        setDseSyncStatus((prev) => ({
          ...prev,
          status: 'failed',
          message: error || 'Failed to retrieve DSE market prices.',
        }));
        return { success: false, message: error || 'No prices fetched', updatedCount: 0, source: 'failed' };
      }

      const today = new Date().toISOString().split('T')[0];
      let updatedCount = 0;
      const newHistories: StockPriceHistory[] = [];

      setStocks((prev) => {
        return prev.map((s) => {
          const sym = s.symbol.toUpperCase();
          const quote = quotes[sym];
          if (quote && quote.ltp > 0) {
            updatedCount++;
            newHistories.push({
              id: newId(`sph-${s.id}-${today}`),
              stockId: s.id,
              priceDate: today,
              closePrice: round2(quote.ltp),
              source: source === 'stockchartbd_api' ? 'STOCKCHARTBD_API' : source.toUpperCase(),
              createdAt: new Date().toISOString(),
            });

            return {
              ...s,
              currentPrice: round2(quote.ltp),
              ycp: quote.ycp ?? s.ycp ?? s.currentPrice,
              highPrice: quote.high ?? s.highPrice,
              lowPrice: quote.low ?? s.lowPrice,
              change: quote.change ?? s.change,
              changePercent: quote.changePct ?? s.changePercent,
              volume: quote.volume ?? s.volume,
              category: quote.category || s.category || 'A',
              priceSource: (source === 'stockchartbd_api' || source === 'fallback_feed') ? 'api' : 'manual',
              lastSyncedAt: new Date().toISOString(),
            };
          }
          return s;
        });
      });

      if (newHistories.length > 0) {
        setStockPriceHistory((prev) => {
          const histStockIds = new Set(newHistories.map((h) => h.stockId));
          const filtered = prev.filter((p) => !(histStockIds.has(p.stockId) && p.priceDate === today));
          return [...newHistories, ...filtered];
        });
      }

      const syncTime = new Date().toISOString();
      saveDseApiConfig({
        lastSyncedAt: syncTime,
        lastSyncStatus: 'success',
      });

      const successMsg = source === 'stockchartbd_api'
        ? `Successfully synced ${updatedCount} DSE securities from StockChartBD API.`
        : source === 'fallback_feed'
        ? `Synced ${updatedCount} securities from DSE backup feed.`
        : `Loaded ${updatedCount} prices from offline cache (API unavailable).`;

      setDseSyncStatus({
        status: 'success',
        lastSyncedAt: syncTime,
        source,
        message: successMsg,
      });

      return {
        success: true,
        message: successMsg,
        updatedCount,
        source,
      };
    } catch (e: any) {
      const errMsg = e?.message || 'Error during DSE price synchronization.';
      setDseSyncStatus((prev) => ({
        ...prev,
        status: 'failed',
        message: errMsg,
      }));
      return { success: false, message: errMsg, updatedCount: 0, source: 'failed' };
    }
  };

  const batchUpdateStockPrices = (updates: Array<{ stockId: string; price: number }>) => {
    const today = new Date().toISOString().split('T')[0];
    const updateMap = new Map<string, number>();
    updates.forEach((u) => {
      if (u.price > 0) updateMap.set(u.stockId, round2(u.price));
    });

    const newHistories: StockPriceHistory[] = [];

    setStocks((prev) =>
      prev.map((s) => {
        const newP = updateMap.get(s.id);
        if (newP !== undefined) {
          newHistories.push({
            id: newId(`sph-${s.id}-${today}`),
            stockId: s.id,
            priceDate: today,
            closePrice: newP,
            source: 'MANUAL_BATCH',
            createdAt: new Date().toISOString(),
          });
          return {
            ...s,
            currentPrice: newP,
            priceSource: 'manual',
            lastSyncedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );

    if (newHistories.length > 0) {
      setStockPriceHistory((prev) => {
        const histStockIds = new Set(newHistories.map((h) => h.stockId));
        const filtered = prev.filter((p) => !(histStockIds.has(p.stockId) && p.priceDate === today));
        return [...newHistories, ...filtered];
      });
    }

    setDseSyncStatus((prev) => ({
      ...prev,
      lastSyncedAt: new Date().toISOString(),
      message: `Manually updated prices for ${updates.length} securities.`,
    }));
  };

  const importDseCsvPrices = (csvText: string): { success: boolean; updatedCount: number; message: string } => {
    try {
      const priceMap = parseDseCsvPriceFile(csvText);
      const symbols = Object.keys(priceMap);

      if (symbols.length === 0) {
        return { success: false, updatedCount: 0, message: 'No valid stock symbols and prices found in CSV file.' };
      }

      const updates: Array<{ stockId: string; price: number }> = [];
      const notFoundSymbols: string[] = [];

      symbols.forEach((sym) => {
        const matchedStock = stocks.find((s) => s.symbol.toUpperCase() === sym);
        if (matchedStock) {
          updates.push({ stockId: matchedStock.id, price: priceMap[sym] });
        } else {
          notFoundSymbols.push(sym);
        }
      });

      if (updates.length > 0) {
        batchUpdateStockPrices(updates);
      }

      const msg = `Imported ${updates.length} price updates successfully.${notFoundSymbols.length > 0 ? ` (${notFoundSymbols.length} unmatched symbols skipped)` : ''}`;
      return { success: true, updatedCount: updates.length, message: msg };
    } catch (err: any) {
      return { success: false, updatedCount: 0, message: err?.message || 'Failed to parse CSV file.' };
    }
  };

  /**
   * Phase 6 Action: Add / Update Stock Price History Record (Table 22)
   */
  const addStockPriceHistoryRecord = (input: NewStockPriceHistoryInput): StockPriceHistory => {
    const newRecord: StockPriceHistory = {
      id: newId(`sph-${input.stockId}-${input.priceDate}`),
      stockId: input.stockId,
      priceDate: input.priceDate,
      closePrice: round2(input.closePrice),
      source: input.source || 'MANUAL',
      createdAt: new Date().toISOString(),
    };
    setStockPriceHistory((prev) => {
      const filtered = prev.filter(
        (p) => !(p.stockId === input.stockId && p.priceDate === input.priceDate)
      );
      return [newRecord, ...filtered];
    });
    // Sync currentPrice if this is latest
    setStocks((prev) =>
      prev.map((s) => (s.id === input.stockId ? { ...s, currentPrice: round2(input.closePrice) } : s))
    );
    return newRecord;
  };

  /**
   * Phase 6 Action: Add / Update Benchmark Price Record (Table 23 - DSEX)
   */
  const addBenchmarkPriceRecord = (input: NewBenchmarkPriceInput): BenchmarkIndexPrice => {
    const symbol = input.indexSymbol || 'DSEX';
    const newRecord: BenchmarkIndexPrice = {
      id: newId(`bench-${symbol.toLowerCase()}-${input.priceDate}`),
      indexSymbol: symbol,
      priceDate: input.priceDate,
      closeValue: round2(input.closeValue),
      createdAt: new Date().toISOString(),
    };
    setBenchmarkIndexPrices((prev) => {
      const filtered = prev.filter(
        (p) => !(p.indexSymbol === symbol && p.priceDate === input.priceDate)
      );
      return [...filtered, newRecord].sort((a, b) => a.priceDate.localeCompare(b.priceDate));
    });
    return newRecord;
  };

  /**
   * Phase 6 Action: Record Live Portfolio Snapshot (Table 24)
   */
  const recordPortfolioSnapshot = (dateStr?: string): PortfolioSnapshot => {
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    const totalInvested = stockHoldings.reduce((sum, h) => sum + (h.totalCostBasis ?? h.investedValue), 0);
    const mv = stockHoldings.reduce((sum, h) => sum + (h.marketValue ?? h.currentMarketValue), 0);
    const cash = brokerCashBalances.reduce((sum, b) => sum + b.cashBalance, 0);
    const unrealized = round2(mv - totalInvested);

    // Calculate TWR change from last snapshot
    const prevSnapshots = [...portfolioSnapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    let cumTwr = 0;
    if (prevSnapshots.length > 0) {
      const lastSnap = prevSnapshots[prevSnapshots.length - 1];
      const prevVal = lastSnap.currentMarketValue + lastSnap.brokerCashBalance;
      const curVal = mv + cash;
      const change = prevVal > 0 ? (curVal - prevVal) / prevVal : 0;
      cumTwr = round2(((1 + (lastSnap.cumulativeTwr ?? 0) / 100) * (1 + change) - 1) * 100);
    }

    const snapshot: PortfolioSnapshot = {
      id: newId(`ps-${todayStr}`),
      userId,
      snapshotDate: todayStr,
      totalInvested: round2(totalInvested),
      currentMarketValue: round2(mv),
      brokerCashBalance: round2(cash),
      unrealizedPl: unrealized,
      dailyTwr: round2(cumTwr),
      cumulativeTwr: round2(cumTwr),
      createdAt: new Date().toISOString(),
    };

    setPortfolioSnapshots((prev) => {
      const filtered = prev.filter((p) => p.snapshotDate !== todayStr);
      return [...filtered, snapshot].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    });

    return snapshot;
  };

  /**
   * Phase 6 Action: Backfill Historical Snapshots
   */
  const backfillHistoricalSnapshots = () => {
    const today = new Date().toISOString().split('T')[0];
    recordPortfolioSnapshot(today);
  };

  /**
   * Phase 7 Action: Record Cash Dividend (Table 20 & Test Case 16)
   * Section 8.2: Detailed rows for gross dividend (+) and AIT withholding tax (-)
   */
  const recordDividend = (
    input: NewDividendInput
  ): { success: boolean; dividend?: Dividend; error?: string } => {
    if (input.shares <= 0 || input.dividendPerShare <= 0) {
      return { success: false, error: 'Shares and dividend per share must be positive numbers.' };
    }

    const { grossDividend, tax, netDividend } = calculateDividendValues(
      input.shares,
      input.dividendPerShare,
      input.taxRate ?? 10.0
    );

    const divId = newId('div');
    const stock = stocks.find((s) => s.id === input.stockId);
    const stockSymbol = stock?.symbol || 'SECURITY';

    const newDividend: Dividend = {
      id: divId,
      userId,
      brokerAccountId: input.brokerAccountId,
      stockId: input.stockId,
      declarationDate: input.declarationDate,
      recordDate: input.recordDate,
      paymentDate: input.paymentDate,
      shares: input.shares,
      dividendPerShare: input.dividendPerShare,
      grossDividend,
      tax,
      netDividend,
      isExternalPayout: !!input.isExternalPayout,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    // If not direct bank external payout, post authoritative rows to broker_cash_transactions
    if (!input.isExternalPayout) {
      const grossCashRow: BrokerCashTransaction = {
        id: `bct-${divId}-gross`,
        userId,
        brokerAccountId: input.brokerAccountId,
        transactionDate: input.paymentDate,
        type: 'dividend',
        amountSigned: grossDividend,
        note: `Cash dividend declared on ${stockSymbol} (${input.shares} shares @ ৳${input.dividendPerShare})`,
        createdAt: new Date().toISOString(),
      };

      const taxCashRow: BrokerCashTransaction = {
        id: `bct-${divId}-tax`,
        userId,
        brokerAccountId: input.brokerAccountId,
        transactionDate: input.paymentDate,
        type: 'tax',
        amountSigned: -tax,
        note: `AIT withholding tax on ${stockSymbol} dividend (${input.taxRate ?? 10}%)`,
        createdAt: new Date().toISOString(),
      };

      setBrokerCashTransactions((prev) => [taxCashRow, grossCashRow, ...prev]);
    }

    setDividends((prev) => [newDividend, ...prev]);
    return { success: true, dividend: newDividend };
  };

  /**
   * Phase 7 Action: Execute Corporate Action (Table 21: Bonus, Split, Rights)
   */
  const executeCorporateAction = (
    input: NewCorporateActionInput
  ): { success: boolean; action?: CorporateAction; error?: string } => {
    const stock = stocks.find((s) => s.id === input.stockId);
    if (!stock) return { success: false, error: 'Security not found in catalog.' };

    const holding = stockHoldings.find((h) => h.stockId === input.stockId);
    const currentWac = holding?.weightedAverageCost || stock.currentPrice;
    const actionId = newId('ca');

    let newQuantity = input.eligibleQuantity;
    let newCostBasis = round2(input.eligibleQuantity * currentWac);
    let newWac = currentWac;
    let additionalShares = input.additionalShares;
    const cashComponent = input.cashComponent || 0;

    if (input.type === 'bonus') {
      const bonusRes = calculateBonusShareDilution(input.eligibleQuantity, currentWac, input.ratio);
      additionalShares = bonusRes.additionalShares;
      newQuantity = bonusRes.newQuantity;
      newCostBasis = bonusRes.newCostBasis;
      newWac = bonusRes.newWac;

      // Add zero-cost synthetic trade to adjust quantity & dilute WAC automatically
      const bonusTrade: StockTransaction = {
        id: `st-ca-${actionId}`,
        userId,
        brokerAccountId: input.brokerAccountId || 'bo-brac-primary',
        stockId: input.stockId,
        tradeDate: input.effectiveDate,
        settlementDate: input.effectiveDate,
        transactionType: 'buy',
        quantity: additionalShares,
        price: 0.0,
        grossValue: 0.0,
        commission: 0.0,
        tax: 0.0,
        otherCharges: 0.0,
        netValue: 0.0,
        reference: `BONUS ISSUE (${input.ratio})`,
        createdAt: new Date().toISOString(),
      };
      setStockTransactions((prev) => [bonusTrade, ...prev]);
    } else if (input.type === 'split') {
      const splitRes = calculateStockSplit(input.eligibleQuantity, currentWac, input.ratio);
      additionalShares = splitRes.additionalShares;
      newQuantity = splitRes.newQuantity;
      newCostBasis = splitRes.newCostBasis;
      newWac = splitRes.newWac;

      const splitTrade: StockTransaction = {
        id: `st-ca-${actionId}`,
        userId,
        brokerAccountId: input.brokerAccountId || 'bo-brac-primary',
        stockId: input.stockId,
        tradeDate: input.effectiveDate,
        settlementDate: input.effectiveDate,
        transactionType: 'buy',
        quantity: additionalShares,
        price: 0.0,
        grossValue: 0.0,
        commission: 0.0,
        tax: 0.0,
        otherCharges: 0.0,
        netValue: 0.0,
        reference: `STOCK SPLIT (${input.ratio})`,
        createdAt: new Date().toISOString(),
      };
      setStockTransactions((prev) => [splitTrade, ...prev]);
    } else if (input.type === 'right') {
      const subscriptionPrice = input.cashComponent || 10.0;
      const rightRes = calculateRightIssue(input.eligibleQuantity, currentWac, input.ratio, subscriptionPrice);
      additionalShares = rightRes.eligibleRights;
      newQuantity = rightRes.newQuantity;
      newCostBasis = rightRes.newCostBasis;
      newWac = rightRes.newWac;

      // Deduct subscription cash from broker cash
      const brokerAccId = input.brokerAccountId || 'bo-brac-primary';
      const rightCashDeduction: BrokerCashTransaction = {
        id: `bct-ca-${actionId}-cash`,
        userId,
        brokerAccountId: brokerAccId,
        transactionDate: input.effectiveDate,
        type: 'buy_gross',
        amountSigned: -rightRes.cashRequired,
        note: `Right share subscription: ${additionalShares} ${stock.symbol} @ ৳${subscriptionPrice}`,
        createdAt: new Date().toISOString(),
      };
      setBrokerCashTransactions((prev) => [rightCashDeduction, ...prev]);

      // Add right shares buy trade
      const rightTrade: StockTransaction = {
        id: `st-ca-${actionId}`,
        userId,
        brokerAccountId: brokerAccId,
        stockId: input.stockId,
        tradeDate: input.effectiveDate,
        settlementDate: input.effectiveDate,
        transactionType: 'buy',
        quantity: additionalShares,
        price: subscriptionPrice,
        grossValue: rightRes.cashRequired,
        commission: 0.0,
        tax: 0.0,
        otherCharges: 0.0,
        netValue: rightRes.cashRequired,
        reference: `RIGHT ISSUE SUBSCRIPTION (${input.ratio})`,
        createdAt: new Date().toISOString(),
      };
      setStockTransactions((prev) => [rightTrade, ...prev]);
    }

    const newAction: CorporateAction = {
      id: actionId,
      userId,
      stockId: input.stockId,
      brokerAccountId: input.brokerAccountId,
      type: input.type,
      announcementDate: input.announcementDate,
      effectiveDate: input.effectiveDate,
      ratio: input.ratio,
      eligibleQuantity: input.eligibleQuantity,
      newQuantity,
      cashComponent,
      newCostBasis,
      newWac,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    setCorporateActions((prev) => [newAction, ...prev]);
    return { success: true, action: newAction };
  };

  /**
   * Phase 7 Action: Apply for Initial Public Offering (IPO)
   */
  const applyIpo = (
    input: NewIpoApplicationInput
  ): { success: boolean; application?: IpoApplication; error?: string } => {
    const totalAmount = round2(input.lotSize * input.offerPrice);
    const balanceObj = brokerCashBalances.find((b) => b.brokerAccountId === input.brokerAccountId);
    const availableCash = balanceObj?.cashBalance || 0;

    if (availableCash < totalAmount) {
      return {
        success: false,
        error: `Insufficient broker cash balance. Available: ৳${availableCash.toLocaleString()}, Required: ৳${totalAmount.toLocaleString()}`,
      };
    }

    const ipoId = newId('ipo');
    const newApp: IpoApplication = {
      id: ipoId,
      userId,
      brokerAccountId: input.brokerAccountId,
      companyName: input.companyName,
      symbol: input.symbol.toUpperCase().trim(),
      applicationDate: input.applicationDate,
      lotSize: input.lotSize,
      offerPrice: input.offerPrice,
      totalAmount,
      status: 'applied',
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    // Block/deduct cash from broker account
    const cashRow: BrokerCashTransaction = {
      id: `bct-${ipoId}-app`,
      userId,
      brokerAccountId: input.brokerAccountId,
      transactionDate: input.applicationDate,
      type: 'other_charge',
      amountSigned: -totalAmount,
      note: `IPO application subscription: ${newApp.symbol} (${input.lotSize} shares @ ৳${input.offerPrice})`,
      createdAt: new Date().toISOString(),
    };

    setBrokerCashTransactions((prev) => [cashRow, ...prev]);
    setIpoApplications((prev) => [newApp, ...prev]);

    return { success: true, application: newApp };
  };

  /**
   * Phase 7 Action: Settle IPO Allotment / Lottery Result
   */
  const settleIpo = (input: SettleIpoInput): { success: boolean; error?: string } => {
    const app = ipoApplications.find((a) => a.id === input.applicationId);
    if (!app) return { success: false, error: 'IPO application not found.' };

    const dateStr = input.allotmentDate || new Date().toISOString().split('T')[0];

    // Ensure stock exists in catalog
    let stock = stocks.find((s) => s.symbol.toUpperCase() === app.symbol.toUpperCase());
    if (!stock && input.allottedShares > 0) {
      stock = addCustomStock({
        symbol: app.symbol.toUpperCase(),
        companyName: app.companyName,
        sector: 'IPO New Listing',
        exchange: 'DSE',
        currentPrice: app.offerPrice,
        isActive: true,
      });
    }

    // Record stock allocation if shares were allotted
    if (input.allottedShares > 0 && stock) {
      const allottedGross = round2(input.allottedShares * app.offerPrice);
      const buyTrade: StockTransaction = {
        id: `st-ipo-${app.id}`,
        userId,
        brokerAccountId: app.brokerAccountId,
        stockId: stock.id,
        tradeDate: dateStr,
        settlementDate: dateStr,
        transactionType: 'buy',
        quantity: input.allottedShares,
        price: app.offerPrice,
        grossValue: allottedGross,
        commission: 0.0,
        tax: 0.0,
        otherCharges: 0.0,
        netValue: allottedGross,
        reference: `IPO ALLOTMENT (${app.symbol})`,
        createdAt: new Date().toISOString(),
      };
      setStockTransactions((prev) => [buyTrade, ...prev]);
    }

    // Credit refund if lottery was unsuccessful or partial
    const cashRefund = input.status === 'refunded' ? app.totalAmount : (input.refundAmount || 0);
    if (cashRefund > 0) {
      const refundRow: BrokerCashTransaction = {
        id: `bct-ipo-${app.id}-refund`,
        userId,
        brokerAccountId: app.brokerAccountId,
        transactionDate: dateStr,
        type: 'deposit',
        amountSigned: cashRefund,
        note: `IPO lottery refund: ${app.symbol} (৳${cashRefund.toLocaleString()})`,
        createdAt: new Date().toISOString(),
      };
      setBrokerCashTransactions((prev) => [refundRow, ...prev]);
    }

    // Update IPO application status
    setIpoApplications((prev) =>
      prev.map((a) =>
        a.id === input.applicationId
          ? {
              ...a,
              status: input.status,
              allottedShares: input.allottedShares,
              refundAmount: cashRefund,
              allotmentDate: dateStr,
            }
          : a
      )
    );

    return { success: true };
  };

  // Phase 9: Audit Trail Logger
  const logAuditEvent = (
    action: AuditActionType,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    summary: string,
    details: Record<string, any> = {}
  ) => {
    setAuditLogs((prev) => {
      const lastHash = prev.length > 0 ? prev[prev.length - 1].hash : '0x00000000000000';
      const entry = createAuditEntry(userId, action, entityType, entityId, summary, details, lastHash);
      return [...prev, entry];
    });
  };

  // Phase 9: Dismiss single alert
  const dismissAlert = (alertId: string) => {
    setDismissedAlertIds((prev) => (prev.includes(alertId) ? prev : [...prev, alertId]));
  };

  // Phase 9: Real-time System Alerts Evaluation
  const rawAlerts = useMemo(() => {
    return evaluateSystemAlerts({
      accounts,
      accountBalances,
      dpsAccounts,
      dpsInstallments,
      loans,
      fixedDeposits,
      recurringTransactions,
      budgets,
      getCategorySpent,
      financialGoals,
      zakatSettings,
      netWorth: 0,
    });
  }, [
    accounts,
    accountBalances,
    dpsAccounts,
    dpsInstallments,
    loans,
    fixedDeposits,
    recurringTransactions,
    budgets,
    getCategorySpent,
    financialGoals,
    zakatSettings,
  ]);

  const systemAlerts = useMemo(() => {
    return rawAlerts.filter((a) => !dismissedAlertIds.includes(a.id));
  }, [rawAlerts, dismissedAlertIds]);

  // Phase 9: Export Full JSON Backup Bundle
  const exportFullBackup = (options?: { incrementRevision?: boolean }): BackupBundle => {
    const exportedAt = new Date().toISOString();

    if (options?.incrementRevision) {
      localRevisionRef.current += 1;
      try {
        localStorage.setItem(`pfos_${userId}_local_revision`, String(localRevisionRef.current));
      } catch {}
    }

    const dataPayload = {
      accounts,
      categories,
      transactions,
      transactionLines,
      fixedDeposits,
      budgets,
      recurringTransactions,
      financialGoals,
      goalContributions,
      dpsAccounts,
      dpsInstallments,
      debts,
      loans,
      loanSchedules,
      physicalAssets,
      staticLiabilities,
      netWorthSnapshots,
      zakatSettings,
      brokers,
      brokerAccounts,
      brokerCashTransactions,
      stocks,
      stockTransactions,
      stockPriceHistory,
      benchmarkIndexPrices,
      dividends,
      corporateActions,
      ipoApplications,
      auditLogs,
    };

    const checksum = computeContentHash(dataPayload);

    const bundle: BackupBundle = {
      metadata: {
        schemaVersion: '5.0-phase9',
        exportedAt,
        userId,
        userFullName: user.fullName,
        userEmail: user.email,
        recordCounts: {
          accounts: accounts.length,
          categories: categories.length,
          transactions: transactions.length,
          transactionLines: transactionLines.length,
          fixedDeposits: fixedDeposits.length,
          budgets: budgets.length,
          recurringTransactions: recurringTransactions.length,
          financialGoals: financialGoals.length,
          goalContributions: goalContributions.length,
          dpsAccounts: dpsAccounts.length,
          dpsInstallments: dpsInstallments.length,
          debts: debts.length,
          loans: loans.length,
          loanSchedules: loanSchedules.length,
          physicalAssets: physicalAssets.length,
          staticLiabilities: staticLiabilities.length,
          netWorthSnapshots: netWorthSnapshots.length,
          brokers: brokers.length,
          brokerAccounts: brokerAccounts.length,
          brokerCashTransactions: brokerCashTransactions.length,
          stocks: stocks.length,
          stockTransactions: stockTransactions.length,
          stockPriceHistory: stockPriceHistory.length,
          benchmarkIndexPrices: benchmarkIndexPrices.length,
          dividends: dividends.length,
          corporateActions: corporateActions.length,
          ipoApplications: ipoApplications.length,
          auditLogs: auditLogs.length,
        },
        checksum,
        revision: localRevisionRef.current,
      },
      data: dataPayload,
    };

    logAuditEvent(
      'BACKUP_EXPORTED',
      'backup',
      newId('backup'),
      `Complete tenant JSON backup bundle generated (${Object.values(bundle.metadata.recordCounts).reduce((a, b) => a + b, 0)} total records)`,
      {
        schemaVersion: bundle.metadata.schemaVersion,
        counts: bundle.metadata.recordCounts,
      }
    );

    return bundle;
  };

  // Phase 9: Restore Tenant Ledger from Backup Bundle
  const restoreFromBackup = (bundle: BackupBundle): { success: boolean; error?: string } => {
    try {
      if (!bundle || !bundle.data || !bundle.metadata) {
        return { success: false, error: 'Invalid backup format: Missing metadata or data payload.' };
      }

      // Monotonic revision update from restored bundle
      if (typeof bundle.metadata?.revision === 'number') {
        localRevisionRef.current = Math.max(localRevisionRef.current, bundle.metadata.revision);
        try {
          localStorage.setItem(`pfos_${userId}_local_revision`, String(localRevisionRef.current));
        } catch {}
      }
      const { data } = bundle;
      if (Array.isArray(data.accounts)) setAccounts(data.accounts);
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.transactionLines)) setTransactionLines(data.transactionLines);
      if (Array.isArray(data.fixedDeposits)) setFixedDeposits(data.fixedDeposits);
      if (Array.isArray(data.budgets)) setBudgets(data.budgets);
      if (Array.isArray(data.recurringTransactions)) setRecurringTransactions(data.recurringTransactions);
      if (Array.isArray(data.financialGoals)) setFinancialGoals(data.financialGoals);
      if (Array.isArray(data.goalContributions)) setGoalContributions(data.goalContributions);
      if (Array.isArray(data.dpsAccounts)) setDpsAccounts(data.dpsAccounts);
      if (Array.isArray(data.dpsInstallments)) setDpsInstallments(data.dpsInstallments);
      if (Array.isArray(data.debts)) setDebts(data.debts);
      if (Array.isArray(data.loans)) setLoans(data.loans);
      if (Array.isArray(data.loanSchedules)) setLoanSchedules(data.loanSchedules);
      if (Array.isArray(data.physicalAssets)) setPhysicalAssets(data.physicalAssets);
      if (Array.isArray(data.staticLiabilities)) setStaticLiabilities(data.staticLiabilities);
      if (Array.isArray(data.netWorthSnapshots)) setNetWorthSnapshots(data.netWorthSnapshots);
      if (data.zakatSettings) setZakatSettings(data.zakatSettings);
      if (Array.isArray(data.brokers)) setBrokers(data.brokers);
      if (Array.isArray(data.brokerAccounts)) setBrokerAccounts(data.brokerAccounts);
      if (Array.isArray(data.brokerCashTransactions)) setBrokerCashTransactions(data.brokerCashTransactions);
      if (Array.isArray(data.stocks)) setStocks(data.stocks);
      if (Array.isArray(data.stockTransactions)) setStockTransactions(data.stockTransactions);
      if (Array.isArray(data.stockPriceHistory)) setStockPriceHistory(data.stockPriceHistory);
      if (Array.isArray(data.benchmarkIndexPrices)) setBenchmarkIndexPrices(data.benchmarkIndexPrices);
      if (Array.isArray(data.dividends)) setDividends(data.dividends);
      if (Array.isArray(data.corporateActions)) setCorporateActions(data.corporateActions);
      if (Array.isArray(data.ipoApplications)) setIpoApplications(data.ipoApplications);
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);

      logAuditEvent(
        'BACKUP_RESTORED',
        'backup',
        newId('restore'),
        `Tenant ledger state successfully restored from backup file (Schema ${bundle.metadata.schemaVersion})`,
        {
          exportedAt: bundle.metadata.exportedAt,
          counts: bundle.metadata.recordCounts,
        }
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to parse backup bundle.' };
    }
  };

  // Phase 9: Hard Reset Ledger State for Active Tenant
  const resetTenantLedger = () => {
    localStorage.removeItem(ACCOUNTS_KEY);
    localStorage.removeItem(CATEGORIES_KEY);
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(LINES_KEY);
    localStorage.removeItem(FD_KEY);
    localStorage.removeItem(BUDGETS_KEY);
    localStorage.removeItem(RECURRING_KEY);
    localStorage.removeItem(GOALS_KEY);
    localStorage.removeItem(GOAL_CONTRIBS_KEY);
    localStorage.removeItem(DPS_KEY);
    localStorage.removeItem(DPS_INSTALLMENTS_KEY);
    localStorage.removeItem(DEBTS_KEY);
    localStorage.removeItem(LOANS_KEY);
    localStorage.removeItem(LOAN_SCHEDULES_KEY);
    localStorage.removeItem(PHYSICAL_ASSETS_KEY);
    localStorage.removeItem(STATIC_LIABILITIES_KEY);
    localStorage.removeItem(NET_WORTH_SNAPSHOTS_KEY);
    localStorage.removeItem(ZAKAT_SETTINGS_KEY);
    localStorage.removeItem(BROKERS_KEY);
    localStorage.removeItem(BROKER_ACCOUNTS_KEY);
    localStorage.removeItem(BROKER_CASH_TRANSACTIONS_KEY);
    localStorage.removeItem(STOCKS_KEY);
    localStorage.removeItem(STOCK_TRANSACTIONS_KEY);
    localStorage.removeItem(STOCK_PRICE_HISTORY_KEY);
    localStorage.removeItem(BENCHMARK_PRICES_KEY);
    localStorage.removeItem(PORTFOLIO_SNAPSHOTS_KEY);
    localStorage.removeItem(DIVIDENDS_KEY);
    localStorage.removeItem(CORPORATE_ACTIONS_KEY);
    localStorage.removeItem(IPO_APPLICATIONS_KEY);
    localStorage.removeItem(AUDIT_LOGS_KEY);
    localStorage.removeItem(DISMISSED_ALERTS_KEY);
    window.location.reload();
  };

  // Load local storage for target user
  const loadLocalTenantData = useCallback((targetUserId: string) => {
    try {
      const storedAcc = localStorage.getItem(`pfos_${targetUserId}_accounts`);
      if (storedAcc) setAccounts(JSON.parse(storedAcc));
      else setAccounts([]);

      const storedCat = localStorage.getItem(`pfos_${targetUserId}_categories`);
      if (storedCat) setCategories(JSON.parse(storedCat));
      else setCategories(DEFAULT_CATEGORIES);

      const storedTx = localStorage.getItem(`pfos_${targetUserId}_transactions`);
      if (storedTx) setTransactions(JSON.parse(storedTx));
      else setTransactions([]);

      const storedLines = localStorage.getItem(`pfos_${targetUserId}_lines`);
      if (storedLines) setTransactionLines(JSON.parse(storedLines));
      else setTransactionLines([]);

      const storedFd = localStorage.getItem(`pfos_${targetUserId}_fds`);
      if (storedFd) setFixedDeposits(JSON.parse(storedFd));
      else setFixedDeposits([]);

      const storedBudgets = localStorage.getItem(`pfos_${targetUserId}_budgets`);
      if (storedBudgets) setBudgets(JSON.parse(storedBudgets));
      else setBudgets([]);

      const storedRecurring = localStorage.getItem(`pfos_${targetUserId}_recurring`);
      if (storedRecurring) setRecurringTransactions(JSON.parse(storedRecurring));
      else setRecurringTransactions([]);

      const storedGoals = localStorage.getItem(`pfos_${targetUserId}_goals`);
      if (storedGoals) setFinancialGoals(JSON.parse(storedGoals));
      else setFinancialGoals([]);

      const storedGoalContribs = localStorage.getItem(`pfos_${targetUserId}_goal_contribs`);
      if (storedGoalContribs) setGoalContributions(JSON.parse(storedGoalContribs));
      else setGoalContributions([]);

      const storedDps = localStorage.getItem(`pfos_${targetUserId}_dps`);
      if (storedDps) setDpsAccounts(JSON.parse(storedDps));
      else setDpsAccounts([]);

      const storedDpsInst = localStorage.getItem(`pfos_${targetUserId}_dps_installments`);
      if (storedDpsInst) setDpsInstallments(JSON.parse(storedDpsInst));
      else setDpsInstallments([]);

      const storedDebts = localStorage.getItem(`pfos_${targetUserId}_debts`);
      if (storedDebts) setDebts(JSON.parse(storedDebts));
      else setDebts([]);

      const storedLoans = localStorage.getItem(`pfos_${targetUserId}_loans`);
      if (storedLoans) setLoans(JSON.parse(storedLoans));
      else setLoans([]);

      const storedSchedules = localStorage.getItem(`pfos_${targetUserId}_loan_schedules`);
      if (storedSchedules) setLoanSchedules(JSON.parse(storedSchedules));
      else setLoanSchedules([]);

      const storedAssets = localStorage.getItem(`pfos_${targetUserId}_assets`);
      if (storedAssets) setPhysicalAssets(JSON.parse(storedAssets));
      else setPhysicalAssets([]);

      const storedLiab = localStorage.getItem(`pfos_${targetUserId}_liabilities`);
      if (storedLiab) setStaticLiabilities(JSON.parse(storedLiab));
      else setStaticLiabilities([]);

      const storedNw = localStorage.getItem(`pfos_${targetUserId}_net_worth_snapshots`);
      if (storedNw) setNetWorthSnapshots(JSON.parse(storedNw));
      else setNetWorthSnapshots([]);

      const storedZakat = localStorage.getItem(`pfos_${targetUserId}_zakat_settings`);
      if (storedZakat) setZakatSettings(JSON.parse(storedZakat));

      const storedBrokers = localStorage.getItem(`pfos_${targetUserId}_brokers`);
      if (storedBrokers) setBrokers(JSON.parse(storedBrokers));

      const storedBo = localStorage.getItem(`pfos_${targetUserId}_broker_accounts`);
      if (storedBo) setBrokerAccounts(JSON.parse(storedBo));
      else setBrokerAccounts([]);

      const storedCashTx = localStorage.getItem(`pfos_${targetUserId}_broker_cash_txs`);
      if (storedCashTx) setBrokerCashTransactions(JSON.parse(storedCashTx));
      else setBrokerCashTransactions([]);

      const storedStocks = localStorage.getItem(`pfos_${targetUserId}_stocks`);
      if (storedStocks) setStocks(JSON.parse(storedStocks));

      const storedStockTx = localStorage.getItem(`pfos_${targetUserId}_stock_txs`);
      if (storedStockTx) setStockTransactions(JSON.parse(storedStockTx));
      else setStockTransactions([]);

      const storedStockHist = localStorage.getItem(`pfos_${targetUserId}_stock_price_hist`);
      if (storedStockHist) setStockPriceHistory(JSON.parse(storedStockHist));
      else setStockPriceHistory([]);

      const storedDividends = localStorage.getItem(`pfos_${targetUserId}_dividends`);
      if (storedDividends) setDividends(JSON.parse(storedDividends));
      else setDividends([]);

      const storedCorp = localStorage.getItem(`pfos_${targetUserId}_corporate_actions`);
      if (storedCorp) setCorporateActions(JSON.parse(storedCorp));
      else setCorporateActions([]);

      const storedIpo = localStorage.getItem(`pfos_${targetUserId}_ipo_applications`);
      if (storedIpo) setIpoApplications(JSON.parse(storedIpo));
      else setIpoApplications([]);

      const storedAudit = localStorage.getItem(`pfos_${targetUserId}_audit_logs`);
      if (storedAudit) setAuditLogs(JSON.parse(storedAudit));
      else setAuditLogs([]);
    } catch (e) {
      console.warn('Error loading local tenant data:', e);
    }
  }, []);

  // Hydrate local data whenever active user profile changes
  useEffect(() => {
    if (currentLoadedUserIdRef.current !== userId) {
      currentLoadedUserIdRef.current = userId;
      loadLocalTenantData(userId);
    }
  }, [userId, loadLocalTenantData]);

  // Firestore Cloud Check & Automatic Multi-Device Hydration on Login
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    let isCancelled = false;

    const checkAndSyncCloud = async () => {
      setCloudSyncStatus('syncing');
      try {
        const cloudResult = await fetchLedgerFromFirestore(firebaseUser.uid);
        if (isCancelled) return;

        if (cloudResult.success && cloudResult.bundle) {
          const cloudBundle = cloudResult.bundle;
          const cloudRecordCount = Object.values(cloudBundle.metadata?.recordCounts || {}).reduce((a, b) => a + b, 0);

          // Local record count
          const localCount = accounts.length + transactions.length;

          // If local has 0 accounts (e.g. freshly signed-in browser), restore from Cloud!
          if (accounts.length === 0) {
            console.log('Multi-device sync: Hydrating empty browser session with Cloud Ledger data...');
            isApplyingRemoteRef.current = true;
            restoreFromBackup(cloudBundle);
            setCloudSyncStatus('synced');
            setLastCloudSyncAt(cloudResult.syncedAt || cloudBundle.metadata.exportedAt);
            lastSyncedChecksumRef.current = cloudBundle.metadata.checksum || '';
            try {
              localStorage.setItem(`pfos_${userId}_last_cloud_sync`, cloudResult.syncedAt || cloudBundle.metadata.exportedAt);
            } catch {}
            return;
          }

          // Check if local content hash is identical to cloud checksum: nothing to do!
          const localBundle = exportFullBackup();
          if (cloudBundle.metadata.checksum && cloudBundle.metadata.checksum === localBundle.metadata.checksum) {
            console.log('Multi-device sync: Cloud and local data are already identical.');
            setCloudSyncStatus('synced');
            setLastCloudSyncAt(cloudResult.syncedAt || cloudBundle.metadata.exportedAt);
            lastSyncedChecksumRef.current = cloudBundle.metadata.checksum;
            return;
          }

          // Check monotonic revision
          const cloudRev = cloudBundle.metadata?.revision;
          const localRev = localRevisionRef.current;
          if (typeof cloudRev === 'number' && cloudRev > localRev) {
            console.log(`Multi-device sync: Cloud has newer revision (${cloudRev} > ${localRev}), updating browser state...`);
            isApplyingRemoteRef.current = true;
            restoreFromBackup(cloudBundle);
            setCloudSyncStatus('synced');
            setLastCloudSyncAt(cloudResult.syncedAt || cloudBundle.metadata.exportedAt);
            lastSyncedChecksumRef.current = cloudBundle.metadata.checksum || '';
          } else if (typeof cloudRev === 'number' && cloudRev < localRev) {
            console.log(`Multi-device sync: Local has newer revision (${localRev} > ${cloudRev}), pushing to cloud...`);
            const saveBundle = exportFullBackup({ incrementRevision: true });
            lastSyncedChecksumRef.current = saveBundle.metadata.checksum || '';
            await saveLedgerToFirestore(firebaseUser.uid, saveBundle);
            setCloudSyncStatus('synced');
            setLastCloudSyncAt(saveBundle.metadata.exportedAt);
          } else {
            // Revisions equal or not present: fallback to timestamp & counts
            const cloudTime = new Date(cloudBundle.metadata.exportedAt).getTime();
            const localSavedTime = lastCloudSyncAt ? new Date(lastCloudSyncAt).getTime() : 0;

            if (cloudTime > localSavedTime && cloudRecordCount >= localCount) {
              console.log('Multi-device sync: Cloud has newer timestamp/data, updating browser state...');
              isApplyingRemoteRef.current = true;
              restoreFromBackup(cloudBundle);
              setCloudSyncStatus('synced');
              setLastCloudSyncAt(cloudResult.syncedAt || cloudBundle.metadata.exportedAt);
              lastSyncedChecksumRef.current = cloudBundle.metadata.checksum || '';
            } else {
              const saveBundle = exportFullBackup({ incrementRevision: true });
              lastSyncedChecksumRef.current = saveBundle.metadata.checksum || '';
              await saveLedgerToFirestore(firebaseUser.uid, saveBundle);
              setCloudSyncStatus('synced');
              setLastCloudSyncAt(saveBundle.metadata.exportedAt);
            }
          }
        } else {
          // Cloud has no ledger yet, push local if local has data
          if (accounts.length > 0 || transactions.length > 0) {
            const localBundle = exportFullBackup({ incrementRevision: true });
            lastSyncedChecksumRef.current = localBundle.metadata.checksum || '';
            const saveRes = await saveLedgerToFirestore(firebaseUser.uid, localBundle);
            if (saveRes.success) {
              setCloudSyncStatus('synced');
              setLastCloudSyncAt(saveRes.syncedAt || localBundle.metadata.exportedAt);
            }
          } else {
            setCloudSyncStatus('idle');
          }
        }
      } catch (err: any) {
        console.warn('Initial cloud sync check error:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Cloud check failed');
      }
    };

    checkAndSyncCloud();

    return () => {
      isCancelled = true;
    };
  }, [firebaseUser?.uid]);

  // Real-Time Cloud Subscription for Instant Multi-Device Sync (Phone <-> Browser)
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const unsubscribe = subscribeToCloudLedger(
      firebaseUser.uid,
      (remoteBundle, syncedAt) => {
        if (!remoteBundle?.metadata) return;

        // 1. Echo suppression: Skip our own recent outgoing save
        if (remoteBundle.metadata.checksum && remoteBundle.metadata.checksum === lastSyncedChecksumRef.current) {
          return;
        }

        // 2. Content-hash check: Skip if remote checksum matches current local data
        const localBundle = exportFullBackup();
        if (remoteBundle.metadata.checksum && remoteBundle.metadata.checksum === localBundle.metadata.checksum) {
          lastSyncedChecksumRef.current = remoteBundle.metadata.checksum;
          return;
        }

        // 3. Monotonic revision check: Skip if remote revision <= local revision
        const remoteRev = remoteBundle.metadata.revision;
        if (typeof remoteRev === 'number' && remoteRev <= localRevisionRef.current) {
          console.log(`Multi-device sync: Ignoring older/equal remote revision (${remoteRev} <= ${localRevisionRef.current})`);
          return;
        }

        console.log('Real-time remote cloud update received, syncing local ledger...');
        isApplyingRemoteRef.current = true;
        lastSyncedChecksumRef.current = remoteBundle.metadata.checksum || '';
        restoreFromBackup(remoteBundle);
        setCloudSyncStatus('synced');
        setLastCloudSyncAt(syncedAt);
        try {
          localStorage.setItem(`pfos_${userId}_last_cloud_sync`, syncedAt);
        } catch {}
      },
      (err) => {
        console.warn('Real-time cloud sync subscription warning:', err);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseUser?.uid, userId]);

  // Debounced Auto-Sync to Cloud on Local Changes
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Skip auto-sync if we just applied remote cloud data
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }

    if (!firebaseUser?.uid) return;

    const timer = setTimeout(async () => {
      try {
        const bundle = exportFullBackup({ incrementRevision: true });
        // Double-guard: If content checksum matches what was already synced, skip!
        if (bundle.metadata.checksum && bundle.metadata.checksum === lastSyncedChecksumRef.current) {
          setCloudSyncStatus('synced');
          return;
        }

        setCloudSyncStatus('syncing');
        lastSyncedChecksumRef.current = bundle.metadata.checksum || '';
        const res = await saveLedgerToFirestore(firebaseUser.uid, bundle);
        if (res.success) {
          setCloudSyncStatus('synced');
          setLastCloudSyncAt(res.syncedAt || bundle.metadata.exportedAt);
          setCloudSyncError(null);
          try {
            localStorage.setItem(`pfos_${userId}_last_cloud_sync`, res.syncedAt || bundle.metadata.exportedAt);
          } catch {}
        } else {
          setCloudSyncStatus('error');
          setCloudSyncError(res.error || 'Failed to sync with cloud');
        }
      } catch (err: any) {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Auto sync error');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [
    accounts,
    transactions,
    transactionLines,
    fixedDeposits,
    budgets,
    recurringTransactions,
    financialGoals,
    goalContributions,
    dpsAccounts,
    dpsInstallments,
    debts,
    loans,
    loanSchedules,
    physicalAssets,
    staticLiabilities,
    netWorthSnapshots,
    zakatSettings,
    brokers,
    brokerAccounts,
    brokerCashTransactions,
    stocks,
    stockTransactions,
    stockPriceHistory,
    benchmarkIndexPrices,
    dividends,
    corporateActions,
    ipoApplications,
  ]);

  // Explicit Manual Cloud Sync function
  const syncWithCloud = async (): Promise<{ success: boolean; error?: string }> => {
    if (!firebaseUser?.uid) {
      return { success: false, error: 'Sign in with Google to sync with cloud.' };
    }
    setCloudSyncStatus('syncing');
    setCloudSyncError(null);
    try {
      const bundle = exportFullBackup({ incrementRevision: true });
      lastSyncedChecksumRef.current = bundle.metadata.checksum || '';
      const res = await saveLedgerToFirestore(firebaseUser.uid, bundle);
      if (res.success) {
        setCloudSyncStatus('synced');
        setLastCloudSyncAt(res.syncedAt || bundle.metadata.exportedAt);
        try {
          localStorage.setItem(`pfos_${userId}_last_cloud_sync`, res.syncedAt || bundle.metadata.exportedAt);
        } catch {}
        return { success: true };
      }
      setCloudSyncStatus('error');
      setCloudSyncError(res.error || 'Failed to sync with cloud');
      return { success: false, error: res.error };
    } catch (err: any) {
      setCloudSyncStatus('error');
      setCloudSyncError(err?.message || 'Failed to sync with cloud');
      return { success: false, error: err?.message };
    }
  };

  // Explicit Manual Cloud Restore function
  const restoreFromCloud = async (): Promise<{ success: boolean; error?: string }> => {
    if (!firebaseUser?.uid) {
      return { success: false, error: 'Sign in with Google to load cloud backup.' };
    }
    setCloudSyncStatus('syncing');
    try {
      const res = await fetchLedgerFromFirestore(firebaseUser.uid);
      if (res.success && res.bundle) {
        isApplyingRemoteRef.current = true;
        lastSyncedChecksumRef.current = res.bundle.metadata.checksum || '';
        restoreFromBackup(res.bundle);
        setCloudSyncStatus('synced');
        setLastCloudSyncAt(res.syncedAt || res.bundle.metadata.exportedAt);
        try {
          localStorage.setItem(`pfos_${userId}_last_cloud_sync`, res.syncedAt || res.bundle.metadata.exportedAt);
        } catch {}
        return { success: true };
      }
      setCloudSyncStatus('error');
      setCloudSyncError(res.error || 'No cloud backup found');
      return { success: false, error: res.error || 'No cloud backup found' };
    } catch (err: any) {
      setCloudSyncStatus('error');
      setCloudSyncError(err?.message || 'Failed to restore from cloud');
      return { success: false, error: err?.message };
    }
  };

  return (
    <LedgerContext.Provider
      value={{
        accounts,
        categories,
        transactions,
        transactionLines,
        fixedDeposits,
        budgets,
        recurringTransactions,
        financialGoals,
        goalContributions,
        dpsAccounts,
        dpsInstallments,
        debts,
        loans,
        loanSchedules,
        physicalAssets,
        staticLiabilities,
        netWorthSnapshots,
        zakatSettings,
        accountBalances,
        getAccountBalance,
        isLoading,
        createAccount,
        postTransaction,
        postTransactionsBatch,
        reverseTransaction,
        openFixedDeposit,
        matureFixedDeposit,
        breakFixedDeposit,
        archiveAccount,
        unarchiveAccount,
        createCategory,
        deleteCategory,

        // Phase 3
        upsertBudget,
        deleteBudget,
        getCategorySpent,
        createRecurring,
        toggleRecurringPause,
        executeRecurringNow,
        deleteRecurring,
        createGoal,
        contributeToGoal,
        updateGoalStatus,
        openDps,
        payDpsInstallment,
        matureDps,

        // Phase 4
        createDebt,
        settleDebt,
        updateDebtStatus,
        createLoan,
        payLoanEmi,
        createPhysicalAsset,
        createStaticLiability,
        saveNetWorthSnapshot,
        updateZakatSettings,
        disburseZakat,

        // Phase 5
        brokers,
        brokerAccounts,
        brokerCashTransactions,
        stocks,
        stockTransactions,
        stockHoldings,
        brokerCashBalances,
        createBroker,
        createBrokerAccount,
        depositBrokerCash,
        withdrawBrokerCash,
        executeStockTrade,
        updateStockPrice,
        addCustomStock,
        deleteStock,
        clearUnusedStocks,
        dseSyncStatus,
        syncDsePrices,
        batchUpdateStockPrices,
        importDseCsvPrices,
        toggleDseManualMode,

        // Phase 6
        stockPriceHistory,
        benchmarkIndexPrices,
        portfolioSnapshots,
        portfolioCashFlows,
        twrSubPeriods,
        benchmarkComparisonData,
        portfolioPerformanceMetrics,
        addStockPriceHistoryRecord,
        addBenchmarkPriceRecord,
        recordPortfolioSnapshot,
        backfillHistoricalSnapshots,

        // Phase 7: Dividends, Corporate Actions & IPO Applications
        dividends,
        corporateActions,
        ipoApplications,
        recordDividend,
        executeCorporateAction,
        applyIpo,
        settleIpo,

        // Phase 9: Audit Trail, Alerts & Backup
        auditLogs,
        systemAlerts,
        dismissAlert,
        logAuditEvent,
        exportFullBackup,
        restoreFromBackup,
        resetTenantLedger,

        // Real-Time Cloud Sync
        cloudSyncStatus,
        lastCloudSyncAt,
        cloudSyncError,
        syncWithCloud,
        restoreFromCloud,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
};
