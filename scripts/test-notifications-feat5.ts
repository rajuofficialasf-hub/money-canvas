import {
  hashStringToNotificationId,
  buildReminderDate,
  collectReminderItems,
} from '../src/lib/notification-service';
import {
  RecurringTransaction,
  DpsAccount,
  DpsInstallment,
  FixedDeposit,
  Loan,
  LoanPaymentScheduleItem,
} from '../src/types/accounting';

function runTests() {
  console.log('--- STARTING FEAT-5 REMINDER NOTIFICATIONS TESTS ---');

  // Test 1: Deterministic Notification IDs
  console.log('Test 1: Deterministic 32-bit notification IDs...');
  const id1 = hashStringToNotificationId('rec-123-7d');
  const id2 = hashStringToNotificationId('rec-123-7d');
  const id3 = hashStringToNotificationId('rec-123-0d');
  if (id1 !== id2) throw new Error('Expected same hash for identical input');
  if (id1 === id3) throw new Error('Expected different hash for different input');
  if (id1 < 0 || id1 > 2147483647) throw new Error('Hash out of 32-bit positive integer range');
  console.log('✓ Deterministic notification ID generator passed');

  // Test 2: Reminder Date Builder
  console.log('Test 2: Reminder date builder (7 days before and on the day)...');
  const date7d = buildReminderDate('2026-10-15', 7, 9);
  if (!date7d) throw new Error('Failed to build 7d reminder date');
  if (date7d.getFullYear() !== 2026 || date7d.getMonth() !== 9 || date7d.getDate() !== 8) {
    throw new Error(`Expected 2026-10-08, got ${date7d.toISOString()}`);
  }
  if (date7d.getHours() !== 9) throw new Error('Expected hour 9 AM');

  const date0d = buildReminderDate('2026-10-15', 0, 9);
  if (!date0d) throw new Error('Failed to build 0d reminder date');
  if (date0d.getDate() !== 15) throw new Error('Expected day 15');
  console.log('✓ Reminder date calculation passed');

  // Test 3: Collect Reminder Items
  console.log('Test 3: Collecting reminder items across all 4 categories...');
  const mockNow = new Date('2026-10-01T08:00:00.000Z');

  // Mock recurring
  const mockRecurring: RecurringTransaction[] = [
    {
      id: 'rec-1',
      userId: 'u1',
      name: 'Internet Bill (Link3)',
      frequency: 'monthly',
      startDate: '2026-09-01',
      nextRun: '2026-10-10', // 7 days prior = Oct 3, Same day = Oct 10
      isPaused: false,
      autoPost: false,
      createdAt: '2026-09-01T00:00:00Z',
      templateTransaction: {
        date: '2026-10-10',
        type: 'expense',
        lines: [{ lineType: 'account', amount: -1500 }],
      },
    },
    {
      id: 'rec-paused',
      userId: 'u1',
      name: 'Paused Gym Sub',
      frequency: 'monthly',
      startDate: '2026-09-01',
      nextRun: '2026-10-05',
      isPaused: true, // Should be ignored
      autoPost: false,
      createdAt: '2026-09-01T00:00:00Z',
      templateTransaction: {
        date: '2026-10-05',
        type: 'expense',
        lines: [],
      },
    },
  ];

  // Mock DPS
  const mockDps: DpsAccount[] = [
    {
      id: 'dps-1',
      userId: 'u1',
      dpsAccountId: 'acc-dps-1',
      sourceAccountId: 'acc-bank-1',
      institutionName: 'BRAC Bank',
      monthlyInstallment: 5000,
      tenureMonths: 36,
      interestRate: 8.5,
      interestCalculationMethod: 'compound_monthly',
      taxRate: 10,
      grossInterest: 20000,
      netInterest: 18000,
      startDate: '2026-01-15',
      maturityDate: '2029-01-15',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];
  const mockDpsInstallments: DpsInstallment[] = [
    {
      id: 'inst-1',
      dpsAccountId: 'dps-1',
      installmentNumber: 10,
      dueDate: '2026-10-15',
      expectedAmount: 5000,
      status: 'pending',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  // Mock FD
  const mockFd: FixedDeposit[] = [
    {
      id: 'fd-1',
      userId: 'u1',
      fdAccountId: 'acc-fd-1',
      sourceAccountId: 'acc-bank-1',
      institutionName: 'City Bank',
      principalAmount: 200000,
      interestRate: 9.0,
      tenureMonths: 12,
      startDate: '2025-10-20',
      maturityDate: '2026-10-20', // Oct 20
      compoundingFrequency: 'monthly',
      expectedMaturityAmount: 218000,
      taxRate: 10,
      status: 'active',
      createdAt: '2025-10-20T00:00:00Z',
      updatedAt: '2025-10-20T00:00:00Z',
    },
  ];

  // Mock Loan
  const mockLoans: Loan[] = [
    {
      id: 'loan-1',
      userId: 'u1',
      loanAccountId: 'acc-loan-1',
      disbursementAccountId: 'acc-bank-1',
      institutionName: 'DBBL Home Loan',
      loanType: 'home',
      interestMethod: 'reducing',
      rateType: 'fixed',
      principal: 2500000,
      annualInterestRate: 9.5,
      tenureMonths: 120,
      emiAmount: 32000,
      disbursementDate: '2025-01-01',
      status: 'active',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
  ];
  const mockLoanSchedules: LoanPaymentScheduleItem[] = [
    {
      id: 'sch-1',
      loanId: 'loan-1',
      version: 1,
      installmentNumber: 22,
      dueDate: '2026-10-25',
      scheduledPrincipal: 15000,
      scheduledInterest: 17000,
      scheduledEmiAmount: 32000,
      remainingPrincipalAfter: 2385000,
      status: 'pending',
      createdAt: '2025-01-01T00:00:00Z',
    },
  ];

  const items = collectReminderItems({
    recurringTransactions: mockRecurring,
    dpsAccounts: mockDps,
    dpsInstallments: mockDpsInstallments,
    fixedDeposits: mockFd,
    loans: mockLoans,
    loanSchedules: mockLoanSchedules,
    now: mockNow,
  });

  // Expected:
  // 1. Recurring: 2 reminders (Oct 3 for 7d, Oct 10 for 0d)
  // 2. DPS: 2 reminders (Oct 8 for 7d, Oct 15 for 0d)
  // 3. FD: 2 reminders (Oct 13 for 7d, Oct 20 for 0d)
  // 4. Loan: 2 reminders (Oct 18 for 7d, Oct 25 for 0d)
  // Total = 8 reminders
  if (items.length !== 8) {
    throw new Error(`Expected 8 reminders, got ${items.length}: ${JSON.stringify(items.map((i) => i.id))}`);
  }

  const rec7d = items.find((i) => i.id === 'rec-rec-1-7d');
  if (!rec7d || !rec7d.title.includes('রিকারিং')) throw new Error('Recurring 7d reminder missing');

  const dps0d = items.find((i) => i.category === 'dps' && i.daysInAdvance === 0);
  if (!dps0d || !dps0d.body.includes('BRAC Bank')) throw new Error('DPS 0d reminder missing');

  const fd7d = items.find((i) => i.category === 'fd' && i.daysInAdvance === 7);
  if (!fd7d || !fd7d.body.includes('City Bank')) throw new Error('FD 7d reminder missing');

  const loan0d = items.find((i) => i.category === 'loan' && i.daysInAdvance === 0);
  if (!loan0d || !loan0d.body.includes('DBBL')) throw new Error('Loan 0d reminder missing');

  console.log('✓ All 8 reminders properly generated and categorized');
  console.log('🎉 ALL FEAT-5 REMINDER NOTIFICATIONS TESTS PASSED PERFECTLY!');
}

runTests();
