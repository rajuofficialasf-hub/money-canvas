/**
 * Family Budget & Shared Ledger Engine
 * Handles household budget allocations, limited member permission enforcement,
 * joint accounts balance updates, and reimbursement calculations.
 */

import {
  FamilyCategoryDefinition,
  FamilyMember,
  FamilyBudgetItem,
  FamilyExpense,
  JointAccount,
  JointFundContribution,
  MemberFinancialSummary,
  FamilyLedgerState,
} from '../types/family-ledger';

export const FAMILY_CATEGORIES: FamilyCategoryDefinition[] = [
  {
    key: 'groceries_bazaar',
    nameEn: 'Groceries & Daily Bazaar',
    nameBn: 'মুদি ও দৈনন্দিন কাঁচাবাজার',
    icon: 'ShoppingCart',
    color: '#10B981', // emerald
    defaultMonthlyLimit: 25000,
    descriptionBn: 'চাল, ডাল, মাছ, মাংস, শাকসবজি ও নিত্যপ্রয়োজনীয় মুদি পণ্য',
  },
  {
    key: 'utilities_bills',
    nameEn: 'Utilities, Gas & Internet',
    nameBn: 'ইউটিলিটি, বিদ্যুৎ ও গ্যাস বিল',
    icon: 'Zap',
    color: '#F59E0B', // amber
    defaultMonthlyLimit: 7500,
    descriptionBn: 'ডিপিডিসি/ডেসকো বিদ্যুৎ বিল, তিতাস গ্যাস, পানির বিল ও ওয়াইফাই বিল',
  },
  {
    key: 'house_rent',
    nameEn: 'House Rent & Service Charge',
    nameBn: 'বাসা ভাড়া ও সার্ভিস চার্জ',
    icon: 'Home',
    color: '#3B82F6', // blue
    defaultMonthlyLimit: 32000,
    descriptionBn: 'মাসিক ফ্ল্যাট ভাড়া, দারোয়ান ও লিফট মেইনটেন্যান্স সার্ভিস চার্জ',
  },
  {
    key: 'children_education',
    nameEn: 'Children & Education',
    nameBn: 'সন্তান ও পড়াশোনা খরচ',
    icon: 'GraduationCap',
    color: '#8B5CF6', // purple
    defaultMonthlyLimit: 14000,
    descriptionBn: 'স্কুল ফি, কোচিং, খাতা-কলম ও পাঠ্যবই',
  },
  {
    key: 'healthcare_medicine',
    nameEn: 'Healthcare & Medicine',
    nameBn: 'পারিবারিক চিকিৎসা ও ওষুধ',
    icon: 'HeartPulse',
    color: '#EF4444', // red
    defaultMonthlyLimit: 6000,
    descriptionBn: 'নিয়মিত প্রেসক্রিপশনের ওষুধ, ডক্টর ভিজিট ও স্বাস্থ্য পরীক্ষা',
  },
  {
    key: 'domestic_help',
    nameEn: 'Maid & Domestic Salary',
    nameBn: 'গৃহকর্মী ও কাজের সহায়িকা বেতন',
    icon: 'Users',
    color: '#06B6D4', // cyan
    defaultMonthlyLimit: 6500,
    descriptionBn: 'গৃহকর্মী, রান্নার আপা বা ড্রাইভারের মাসিক বেতন',
  },
  {
    key: 'family_dining',
    nameEn: 'Family Dining & Outing',
    nameBn: 'পারিবারিক আপ্যায়ন ও খাওয়া',
    icon: 'Utensils',
    color: '#EC4899', // pink
    defaultMonthlyLimit: 5000,
    descriptionBn: 'ছুটির দিনে রেস্তোরাঁ ও পারিবারিক চা-নাস্তা',
  },
  {
    key: 'emergency_fund',
    nameEn: 'Family Emergency Fund',
    nameBn: 'যৌথ ইমার্জেন্সি ফান্ড',
    icon: 'ShieldAlert',
    color: '#14B8A6', // teal
    defaultMonthlyLimit: 10000,
    descriptionBn: 'যেকোনো আকস্মিক পারিবারিক আর্থিক সুরক্ষার যৌথ সঞ্চয়',
  },
];

export const DEFAULT_MEMBERS: FamilyMember[] = [
  {
    id: 'fam-mbr-head',
    name: 'Self (Householder)',
    nameBn: 'পরিবারের প্রধান (অ্যাডমিন)',
    relation: 'self',
    role: 'family_head',
    email: 'head@family.local',
    phone: '+8801700000001',
    avatarColor: 'bg-emerald-600 text-white',
    permissions: {
      canAddExpenses: true,
      canEditMasterBudget: true,
      canApproveExpenses: true,
      canManageMembers: true,
      canDepositJointAccount: true,
      canWithdrawJointAccount: true,
      canViewReports: true,
      maxSingleExpenseLimit: 0, // unlimited
      requireApprovalAboveLimit: false,
      allowedCategories: [], // all
    },
    status: 'active',
    joinedAt: '2026-01-01',
  },
];

export const DEFAULT_JOINT_ACCOUNTS: JointAccount[] = [];

export const generateDefaultBudgets = (monthYear: string): FamilyBudgetItem[] => {
  return FAMILY_CATEGORIES.map((cat) => ({
    id: `fambud-${monthYear}-${cat.key}`,
    monthYear,
    categoryKey: cat.key,
    allocatedAmount: cat.defaultMonthlyLimit,
    warningThresholdPct: 85,
    updatedAt: new Date().toISOString(),
  }));
};

export const generateInitialSampleExpenses = (_monthYear: string): FamilyExpense[] => {
  return [];
};

export const generateInitialContributions = (_monthYear: string): JointFundContribution[] => [];


/**
 * Validates whether a member has permission to log an expense in a category
 */
export const checkMemberPermission = (
  member: FamilyMember,
  categoryKey: string,
  amount: number
): { allowed: boolean; requiresApproval: boolean; reason?: string } => {
  if (member.role === 'family_head') {
    return { allowed: true, requiresApproval: false };
  }

  if (member.role === 'viewer') {
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'দর্শক (Viewer) রোলে খরচ যোগ করার পারমিশন নেই। শুধুমাত্র দেখা সম্ভব।',
    };
  }

  // Check category restrictions
  if (
    member.permissions.allowedCategories.length > 0 &&
    !member.permissions.allowedCategories.includes(categoryKey)
  ) {
    const cat = FAMILY_CATEGORIES.find((c) => c.key === categoryKey);
    return {
      allowed: false,
      requiresApproval: false,
      reason: `এই সদস্যের '${cat?.nameBn || categoryKey}' খাতে খরচ যোগ করার অনুমতি নেই।`,
    };
  }

  // Check single expense limit & approval requirement
  if (
    member.permissions.maxSingleExpenseLimit > 0 &&
    amount > member.permissions.maxSingleExpenseLimit
  ) {
    if (member.permissions.requireApprovalAboveLimit) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: `খরচের পরিমাণ (৳${amount.toLocaleString()}) সদস্যের সর্বোচ্চ অনুমোদিত সীমা (৳${member.permissions.maxSingleExpenseLimit.toLocaleString()}) অতিক্রম করেছে। এটি পরিবারের প্রধানের অনুমোদনের জন্য অপেক্ষমাণ থাকবে।`,
      };
    } else {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `সর্বোচ্চ একক খরচ সীমা ৳${member.permissions.maxSingleExpenseLimit.toLocaleString()} অতিক্রম করেছে।`,
      };
    }
  }

  // Check general approval requirement
  if (member.permissions.requireApprovalAboveLimit) {
    return { allowed: true, requiresApproval: true };
  }

  return { allowed: true, requiresApproval: false };
};

/**
 * Calculate per-member financial balance (who contributed, who paid personal, who needs reimbursement)
 */
export const calculateMemberFinancialSummaries = (
  members: FamilyMember[],
  expenses: FamilyExpense[],
  contributions: JointFundContribution[]
): MemberFinancialSummary[] => {
  return members.map((member) => {
    // Total contributed to joint accounts
    const totalContributed = contributions
      .filter((c) => c.memberId === member.id)
      .reduce((sum, c) => sum + c.amount, 0);

    // Expenses paid out of personal pocket
    const personalExpenses = expenses.filter(
      (e) => e.paidByMemberId === member.id && e.paidFromPersonalPocket && e.status === 'approved'
    );
    const totalDirectPaid = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalReimbursed = personalExpenses
      .filter((e) => e.isReimbursed)
      .reduce((sum, e) => sum + e.amount, 0);
    const pendingReimbursement = personalExpenses
      .filter((e) => !e.isReimbursed)
      .reduce((sum, e) => sum + e.amount, 0);

    // Allowance tracking
    const allowanceAssigned = member.monthlyAllowance || 0;
    const memberTotalExpenses = expenses.filter(
      (e) => e.paidByMemberId === member.id && e.status === 'approved'
    );
    const allowanceSpent = memberTotalExpenses.reduce((sum, e) => sum + e.amount, 0);
    const allowanceRemaining = Math.max(0, allowanceAssigned - allowanceSpent);

    return {
      memberId: member.id,
      memberName: member.name,
      memberNameBn: member.nameBn,
      role: member.role,
      relation: member.relation,
      totalContributed,
      totalDirectPaid,
      totalReimbursed,
      pendingReimbursement,
      allowanceAssigned,
      allowanceSpent,
      allowanceRemaining,
      expenseCount: memberTotalExpenses.length,
    };
  });
};

/**
 * Calculate total spent by category for the given month
 */
export const calculateCategorySpending = (
  expenses: FamilyExpense[],
  monthYear: string
): Record<string, { totalSpent: number; approvedCount: number; pendingCount: number }> => {
  const result: Record<string, { totalSpent: number; approvedCount: number; pendingCount: number }> = {};

  FAMILY_CATEGORIES.forEach((cat) => {
    result[cat.key] = { totalSpent: 0, approvedCount: 0, pendingCount: 0 };
  });

  expenses
    .filter((e) => e.monthYear === monthYear)
    .forEach((e) => {
      if (!result[e.categoryKey]) {
        result[e.categoryKey] = { totalSpent: 0, approvedCount: 0, pendingCount: 0 };
      }
      if (e.status === 'approved') {
        result[e.categoryKey].totalSpent += e.amount;
        result[e.categoryKey].approvedCount += 1;
      } else if (e.status === 'pending_approval') {
        result[e.categoryKey].pendingCount += 1;
      }
    });

  return result;
};

/**
 * Initializes or loads state from localStorage
 */
export const loadInitialFamilyLedgerState = (userId: string, currentMonth: string): FamilyLedgerState => {
  const STORAGE_KEY = `pfos_${userId}_family_ledger_v1`;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
          // Purge legacy mock data if present
          const cleanedAccounts = (parsed.jointAccounts || []).filter(
            (a: JointAccount) => !['joint-acc-cashbox', 'joint-acc-bank', 'joint-acc-mfs'].includes(a.id)
          );
          const cleanedExpenses = (parsed.expenses || []).filter(
            (e: FamilyExpense) => !e.id.startsWith('famexp-')
          );
          const cleanedContributions = (parsed.contributions || []).filter(
            (c: JointFundContribution) => !c.id.startsWith('famcnt-')
          );
          const cleanedMembers = (parsed.members || []).filter(
            (m: FamilyMember) => m.id === 'fam-mbr-head' || (!m.id.startsWith('fam-mbr-spouse') && !m.id.startsWith('fam-mbr-child') && !m.id.startsWith('fam-mbr-manager'))
          );
          return {
            ...parsed,
            members: cleanedMembers.length > 0 ? cleanedMembers : DEFAULT_MEMBERS,
            jointAccounts: cleanedAccounts,
            expenses: cleanedExpenses,
            contributions: cleanedContributions,
            activeSimulationMemberId: 'fam-mbr-head',
          };
        }
      }
    } catch (e) {
      console.warn('Failed loading family ledger state from storage', e);
    }
  }

  // Default seed
  return {
    familyName: 'My Family Household',
    familyNameBn: 'আমার পরিবার — যৌথ সংসার তহবিল',
    currency: 'BDT',
    members: DEFAULT_MEMBERS,
    jointAccounts: DEFAULT_JOINT_ACCOUNTS,
    budgets: generateDefaultBudgets(currentMonth),
    expenses: generateInitialSampleExpenses(currentMonth),
    contributions: generateInitialContributions(currentMonth),
    activeSimulationMemberId: DEFAULT_MEMBERS[0].id, // start as family head
  };
};

export const saveFamilyLedgerState = (userId: string, state: FamilyLedgerState) => {
  if (typeof window !== 'undefined') {
    const STORAGE_KEY = `pfos_${userId}_family_ledger_v1`;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed persisting family ledger state', e);
    }
  }
};
