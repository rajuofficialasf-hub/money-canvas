import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './auth-context';
import {
  FamilyExpense,
  FamilyMember,
  FamilyBudgetItem,
  JointAccount,
  JointFundContribution,
  FamilyLedgerState,
  MemberFinancialSummary,
} from '../types/family-ledger';
import {
  FAMILY_CATEGORIES,
  DEFAULT_MEMBERS,
  DEFAULT_JOINT_ACCOUNTS,
  generateDefaultBudgets,
  generateInitialSampleExpenses,
  generateInitialContributions,
  checkMemberPermission,
  calculateMemberFinancialSummaries,
  calculateCategorySpending,
  loadInitialFamilyLedgerState,
  saveFamilyLedgerState,
} from './family-ledger-engine';

interface FamilyContextType {
  state: FamilyLedgerState;
  activeMember: FamilyMember;
  isHead: boolean;
  canAddExpenses: boolean;
  canEditMasterBudget: boolean;
  canApproveExpenses: boolean;
  canManageMembers: boolean;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  // Financial summaries
  memberSummaries: MemberFinancialSummary[];
  categorySpending: Record<string, { totalSpent: number; approvedCount: number; pendingCount: number }>;
  totalJointBalance: number;
  totalMonthlyAllocated: number;
  totalMonthlySpent: number;
  totalPendingReimbursements: number;
  pendingApprovalsCount: number;
  // Actions
  switchActiveMember: (memberId: string) => void;
  addFamilyExpense: (
    expenseInput: Omit<FamilyExpense, 'id' | 'createdAt' | 'status' | 'isReimbursed' | 'monthYear'>
  ) => { success: boolean; requiresApproval?: boolean; error?: string };
  approveExpense: (expenseId: string) => { success: boolean; error?: string };
  rejectExpense: (expenseId: string, reason?: string) => { success: boolean; error?: string };
  deleteExpense: (expenseId: string) => { success: boolean; error?: string };
  reimburseExpense: (expenseId: string, sourceJointAccountId: string) => { success: boolean; error?: string };
  addJointContribution: (
    contributionInput: Omit<JointFundContribution, 'id' | 'createdAt'>
  ) => { success: boolean; error?: string };
  upsertFamilyBudget: (
    categoryKey: string,
    allocatedAmount: number,
    warningThresholdPct?: number,
    assignedMemberId?: string
  ) => void;
  createFamilyMember: (memberInput: Omit<FamilyMember, 'id' | 'joinedAt'>) => void;
  updateFamilyMember: (memberId: string, updates: Partial<FamilyMember>) => void;
  deleteFamilyMember: (memberId: string) => { success: boolean; error?: string };
  createJointAccount: (accountInput: Omit<JointAccount, 'id' | 'createdAt'>) => void;
  updateJointAccount: (accountId: string, updates: Partial<JointAccount>) => void;
  resetFamilyLedgerData: () => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentMonthInitial = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthInitial);

  const [state, setState] = useState<FamilyLedgerState>(() => {
    return loadInitialFamilyLedgerState(user?.id || 'default-user', currentMonthInitial);
  });

  // Ensure state has budgets for selected month
  useEffect(() => {
    setState((prev) => {
      const hasBudgets = prev.budgets.some((b) => b.monthYear === selectedMonth);
      if (!hasBudgets) {
        const newBudgets = generateDefaultBudgets(selectedMonth);
        return {
          ...prev,
          budgets: [...prev.budgets, ...newBudgets],
        };
      }
      return prev;
    });
  }, [selectedMonth]);

  // Persist state to localStorage on changes
  useEffect(() => {
    saveFamilyLedgerState(user?.id || 'default-user', state);
  }, [state, user?.id]);

  // Active simulated member
  const activeMember = useMemo(() => {
    return (
      state.members.find((m) => m.id === state.activeSimulationMemberId) ||
      state.members[0] ||
      DEFAULT_MEMBERS[0]
    );
  }, [state.members, state.activeSimulationMemberId]);

  const isHead = activeMember.role === 'family_head';
  const canAddExpenses = activeMember.permissions.canAddExpenses && activeMember.role !== 'viewer';
  const canEditMasterBudget = activeMember.permissions.canEditMasterBudget && isHead;
  const canApproveExpenses = activeMember.permissions.canApproveExpenses || isHead;
  const canManageMembers = activeMember.permissions.canManageMembers || isHead;

  // Summaries
  const memberSummaries = useMemo(() => {
    return calculateMemberFinancialSummaries(state.members, state.expenses, state.contributions);
  }, [state.members, state.expenses, state.contributions]);

  const categorySpending = useMemo(() => {
    return calculateCategorySpending(state.expenses, selectedMonth);
  }, [state.expenses, selectedMonth]);

  const totalJointBalance = useMemo(() => {
    return state.jointAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [state.jointAccounts]);

  const totalMonthlyAllocated = useMemo(() => {
    return state.budgets
      .filter((b) => b.monthYear === selectedMonth)
      .reduce((sum, b) => sum + b.allocatedAmount, 0);
  }, [state.budgets, selectedMonth]);

  const totalMonthlySpent = useMemo(() => {
    return state.expenses
      .filter((e) => e.monthYear === selectedMonth && e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [state.expenses, selectedMonth]);

  const totalPendingReimbursements = useMemo(() => {
    return state.expenses
      .filter((e) => e.paidFromPersonalPocket && !e.isReimbursed && e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [state.expenses]);

  const pendingApprovalsCount = useMemo(() => {
    return state.expenses.filter((e) => e.status === 'pending_approval').length;
  }, [state.expenses]);

  // Switch Active Simulation Member
  const switchActiveMember = useCallback((memberId: string) => {
    setState((prev) => ({
      ...prev,
      activeSimulationMemberId: memberId,
    }));
  }, []);

  // Add Family Expense with permission checks
  const addFamilyExpense = useCallback(
    (expenseInput: Omit<FamilyExpense, 'id' | 'createdAt' | 'status' | 'isReimbursed' | 'monthYear'>) => {
      // Permission check against the paying member or active member
      const payingMember = state.members.find((m) => m.id === expenseInput.paidByMemberId) || activeMember;
      const permCheck = checkMemberPermission(payingMember, expenseInput.categoryKey, expenseInput.amount);

      if (!permCheck.allowed) {
        return { success: false, error: permCheck.reason || 'Permission denied.' };
      }

      const status = permCheck.requiresApproval ? 'pending_approval' : 'approved';
      const expenseMonthYear = expenseInput.date.slice(0, 7);
      const newExpenseId = `famexp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newExpense: FamilyExpense = {
        ...expenseInput,
        id: newExpenseId,
        monthYear: expenseMonthYear,
        status,
        isReimbursed: !expenseInput.paidFromPersonalPocket,
        approvedByMemberId: status === 'approved' ? activeMember.id : undefined,
        approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => {
        // If paid from a joint account and immediately approved, deduct from joint account balance
        let updatedAccounts = prev.jointAccounts;
        if (status === 'approved' && expenseInput.paidFromJointAccountId && !expenseInput.paidFromPersonalPocket) {
          updatedAccounts = prev.jointAccounts.map((acc) => {
            if (acc.id === expenseInput.paidFromJointAccountId) {
              return { ...acc, balance: Math.max(0, acc.balance - expenseInput.amount) };
            }
            return acc;
          });
        }

        return {
          ...prev,
          jointAccounts: updatedAccounts,
          expenses: [newExpense, ...prev.expenses],
        };
      });

      return {
        success: true,
        requiresApproval: permCheck.requiresApproval,
      };
    },
    [activeMember, state.members]
  );

  // Approve a pending expense
  const approveExpense = useCallback(
    (expenseId: string) => {
      if (!canApproveExpenses) {
        return { success: false, error: 'শুধুমাত্র পরিবারের প্রধান বা অনুমোদিত সদস্য খরচ অনুমোদন করতে পারেন।' };
      }

      const targetExpense = state.expenses.find((e) => e.id === expenseId);
      if (!targetExpense) return { success: false, error: 'Expense not found.' };

      setState((prev) => {
        let updatedAccounts = prev.jointAccounts;
        // If paid from joint account, now deduct
        if (targetExpense.paidFromJointAccountId && !targetExpense.paidFromPersonalPocket) {
          updatedAccounts = prev.jointAccounts.map((acc) => {
            if (acc.id === targetExpense.paidFromJointAccountId) {
              return { ...acc, balance: Math.max(0, acc.balance - targetExpense.amount) };
            }
            return acc;
          });
        }

        const updatedExpenses = prev.expenses.map((e) => {
          if (e.id === expenseId) {
            return {
              ...e,
              status: 'approved' as const,
              approvedByMemberId: activeMember.id,
              approvedAt: new Date().toISOString(),
            };
          }
          return e;
        });

        return {
          ...prev,
          jointAccounts: updatedAccounts,
          expenses: updatedExpenses,
        };
      });

      return { success: true };
    },
    [activeMember.id, canApproveExpenses, state.expenses]
  );

  // Reject a pending expense
  const rejectExpense = useCallback(
    (expenseId: string, reason?: string) => {
      if (!canApproveExpenses) {
        return { success: false, error: 'অনুমোদন প্রত্যাখ্যানের অনুমতি নেই।' };
      }

      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => {
          if (e.id === expenseId) {
            return {
              ...e,
              status: 'rejected' as const,
              rejectionReason: reason || 'পরিবারের প্রধান কর্তৃক বাতিল করা হয়েছে',
            };
          }
          return e;
        }),
      }));

      return { success: true };
    },
    [canApproveExpenses]
  );

  // Delete an expense
  const deleteExpense = useCallback(
    (expenseId: string) => {
      if (!isHead && !canApproveExpenses) {
        return { success: false, error: 'খরচ রেকর্ড মুছে ফেলার অনুমতি নেই।' };
      }

      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== expenseId),
      }));

      return { success: true };
    },
    [canApproveExpenses, isHead]
  );

  // Reimburse an out-of-pocket expense from a joint account
  const reimburseExpense = useCallback(
    (expenseId: string, sourceJointAccountId: string) => {
      if (!isHead && !canApproveExpenses) {
        return { success: false, error: 'রিইমবার্সমেন্ট অনুমোদনের অনুমতি নেই।' };
      }

      const targetExpense = state.expenses.find((e) => e.id === expenseId);
      if (!targetExpense) return { success: false, error: 'Expense not found' };

      const sourceAccount = state.jointAccounts.find((a) => a.id === sourceJointAccountId);
      if (!sourceAccount) return { success: false, error: 'Joint account not found' };

      if (sourceAccount.balance < targetExpense.amount) {
        return {
          success: false,
          error: `যৌথ তহবিলে পর্যাপ্ত ব্যালেন্স নেই (বর্তমান ব্যালেন্স: ৳${sourceAccount.balance.toLocaleString()}, প্রয়োজনীয়: ৳${targetExpense.amount.toLocaleString()})`,
        };
      }

      setState((prev) => {
        const updatedAccounts = prev.jointAccounts.map((acc) => {
          if (acc.id === sourceJointAccountId) {
            return { ...acc, balance: acc.balance - targetExpense.amount };
          }
          return acc;
        });

        const updatedExpenses = prev.expenses.map((e) => {
          if (e.id === expenseId) {
            return {
              ...e,
              isReimbursed: true,
              reimbursedAt: new Date().toISOString(),
              paidFromJointAccountId: sourceJointAccountId,
            };
          }
          return e;
        });

        return {
          ...prev,
          jointAccounts: updatedAccounts,
          expenses: updatedExpenses,
        };
      });

      return { success: true };
    },
    [canApproveExpenses, isHead, state.expenses, state.jointAccounts]
  );

  // Add contribution to joint account
  const addJointContribution = useCallback(
    (contributionInput: Omit<JointFundContribution, 'id' | 'createdAt'>) => {
      const newContribution: JointFundContribution = {
        ...contributionInput,
        id: `famcnt-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => {
        const updatedAccounts = prev.jointAccounts.map((acc) => {
          if (acc.id === contributionInput.jointAccountId) {
            return { ...acc, balance: acc.balance + contributionInput.amount };
          }
          return acc;
        });

        return {
          ...prev,
          jointAccounts: updatedAccounts,
          contributions: [newContribution, ...prev.contributions],
        };
      });

      return { success: true };
    },
    []
  );

  // Upsert family budget limit
  const upsertFamilyBudget = useCallback(
    (categoryKey: string, allocatedAmount: number, warningThresholdPct = 85, assignedMemberId?: string) => {
      setState((prev) => {
        const existingIdx = prev.budgets.findIndex(
          (b) => b.monthYear === selectedMonth && b.categoryKey === categoryKey
        );

        if (existingIdx >= 0) {
          const updated = [...prev.budgets];
          updated[existingIdx] = {
            ...updated[existingIdx],
            allocatedAmount,
            warningThresholdPct,
            assignedMemberId,
            updatedAt: new Date().toISOString(),
          };
          return { ...prev, budgets: updated };
        } else {
          const newBudget: FamilyBudgetItem = {
            id: `fambud-${selectedMonth}-${categoryKey}`,
            monthYear: selectedMonth,
            categoryKey,
            allocatedAmount,
            warningThresholdPct,
            assignedMemberId,
            updatedAt: new Date().toISOString(),
          };
          return { ...prev, budgets: [...prev.budgets, newBudget] };
        }
      });
    },
    [selectedMonth]
  );

  // Manage Family Members
  const createFamilyMember = useCallback((memberInput: Omit<FamilyMember, 'id' | 'joinedAt'>) => {
    const newMember: FamilyMember = {
      ...memberInput,
      id: `fam-mbr-${Date.now()}`,
      joinedAt: new Date().toISOString().slice(0, 10),
    };

    setState((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
  }, []);

  const updateFamilyMember = useCallback((memberId: string, updates: Partial<FamilyMember>) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === memberId ? { ...m, ...updates } : m)),
    }));
  }, []);

  const deleteFamilyMember = useCallback(
    (memberId: string) => {
      if (memberId === 'fam-mbr-head') {
        return { success: false, error: 'পরিবারের প্রধানকে মোছা যাবে না।' };
      }

      setState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
        activeSimulationMemberId:
          prev.activeSimulationMemberId === memberId ? 'fam-mbr-head' : prev.activeSimulationMemberId,
      }));

      return { success: true };
    },
    []
  );

  // Manage Joint Accounts
  const createJointAccount = useCallback((accountInput: Omit<JointAccount, 'id' | 'createdAt'>) => {
    const newAcc: JointAccount = {
      ...accountInput,
      id: `joint-acc-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setState((prev) => ({
      ...prev,
      jointAccounts: [...prev.jointAccounts, newAcc],
    }));
  }, []);

  const updateJointAccount = useCallback((accountId: string, updates: Partial<JointAccount>) => {
    setState((prev) => ({
      ...prev,
      jointAccounts: prev.jointAccounts.map((a) => (a.id === accountId ? { ...a, ...updates } : a)),
    }));
  }, []);

  // Reset to default sample family state
  const resetFamilyLedgerData = useCallback(() => {
    const initial = {
      familyName: 'The Rahman Family Household',
      familyNameBn: 'রহমান পরিবার — যৌথ সংসার তহবিল',
      currency: 'BDT' as const,
      members: DEFAULT_MEMBERS,
      jointAccounts: DEFAULT_JOINT_ACCOUNTS,
      budgets: generateDefaultBudgets(currentMonthInitial),
      expenses: generateInitialSampleExpenses(currentMonthInitial),
      contributions: generateInitialContributions(currentMonthInitial),
      activeSimulationMemberId: DEFAULT_MEMBERS[0].id,
    };
    setState(initial);
  }, [currentMonthInitial]);

  return (
    <FamilyContext.Provider
      value={{
        state,
        activeMember,
        isHead,
        canAddExpenses,
        canEditMasterBudget,
        canApproveExpenses,
        canManageMembers,
        selectedMonth,
        setSelectedMonth,
        memberSummaries,
        categorySpending,
        totalJointBalance,
        totalMonthlyAllocated,
        totalMonthlySpent,
        totalPendingReimbursements,
        pendingApprovalsCount,
        switchActiveMember,
        addFamilyExpense,
        approveExpense,
        rejectExpense,
        deleteExpense,
        reimburseExpense,
        addJointContribution,
        upsertFamilyBudget,
        createFamilyMember,
        updateFamilyMember,
        deleteFamilyMember,
        createJointAccount,
        updateJointAccount,
        resetFamilyLedgerData,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamilyLedger = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamilyLedger must be used within a FamilyProvider');
  }
  return context;
};
