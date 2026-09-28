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
  {
    id: 'fam-mbr-spouse',
    name: 'Spouse (Co-Manager)',
    nameBn: 'স্ত্রী / সহ-ব্যবস্থাপক',
    relation: 'spouse',
    role: 'contributor',
    email: 'spouse@family.local',
    phone: '+8801700000002',
    avatarColor: 'bg-purple-600 text-white',
    monthlyAllowance: 12000,
    permissions: {
      canAddExpenses: true,
      canEditMasterBudget: false, // limited permission: cannot alter master ceilings
      canApproveExpenses: false,
      canManageMembers: false,
      canDepositJointAccount: true,
      canWithdrawJointAccount: true,
      canViewReports: true,
      maxSingleExpenseLimit: 20000,
      requireApprovalAboveLimit: false,
      allowedCategories: [], // can spend on all household categories
    },
    status: 'active',
    joinedAt: '2026-01-01',
  },
  {
    id: 'fam-mbr-child',
    name: 'Child (Student)',
    nameBn: 'সন্তান (পড়াশোনা ও হাতখরচ)',
    relation: 'child',
    role: 'dependent',
    email: 'child@family.local',
    avatarColor: 'bg-sky-600 text-white',
    monthlyAllowance: 4500, // Monthly pocket money
    permissions: {
      canAddExpenses: true,
      canEditMasterBudget: false,
      canApproveExpenses: false,
      canManageMembers: false,
      canDepositJointAccount: false,
      canWithdrawJointAccount: false,
      canViewReports: false,
      maxSingleExpenseLimit: 2000,
      requireApprovalAboveLimit: true, // Needs head approval if over 2000 BDT
      allowedCategories: ['children_education', 'family_dining'], // strictly limited
    },
    status: 'active',
    joinedAt: '2026-01-15',
  },
  {
    id: 'fam-mbr-manager',
    name: 'House Manager / Caretaker',
    nameBn: 'কেয়ারটেকার / বাজার সহকারী',
    relation: 'house_manager',
    role: 'contributor',
    phone: '+8801800000004',
    avatarColor: 'bg-amber-600 text-white',
    permissions: {
      canAddExpenses: true,
      canEditMasterBudget: false,
      canApproveExpenses: false,
      canManageMembers: false,
      canDepositJointAccount: false,
      canWithdrawJointAccount: false,
      canViewReports: false,
      maxSingleExpenseLimit: 5000,
      requireApprovalAboveLimit: true, // Auto requires head verification
      allowedCategories: ['groceries_bazaar', 'utilities_bills'], // limited strictly to groceries & utility
    },
    status: 'active',
    joinedAt: '2026-02-01',
  },
];

export const DEFAULT_JOINT_ACCOUNTS: JointAccount[] = [
  {
    id: 'joint-acc-cashbox',
    name: 'Household Cash Box',
    nameBn: 'সংসার ক্যাশ বাক্স (নগদ টাকা)',
    type: 'cash_box',
    balance: 14500,
    currency: 'BDT',
    notes: 'ঘরে রাখা নগদ ক্যাশ যা প্রতিদিনের কাঁচাবাজার ও ছোটখাটো খরচে ব্যবহার হয়',
    isDefaultPaymentSource: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'joint-acc-bank',
    name: 'City Bank Joint Account',
    nameBn: 'সিটি ব্যাংক যৌথ হিসাব',
    type: 'joint_bank',
    institutionName: 'City Bank PLC',
    accountNumberMask: '•••• 7821',
    balance: 58000,
    currency: 'BDT',
    notes: 'বাড়ি ভাড়া ও মাসিক বড় বিল পরিশোধের জন্য যৌথ ব্যাংক একাউন্ট',
    isDefaultPaymentSource: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'joint-acc-mfs',
    name: 'Shared Family bKash',
    nameBn: 'গৃহস্থালী যৌথ বিকাশ ওয়ালেট',
    type: 'shared_mfs',
    institutionName: 'bKash',
    accountNumberMask: '017•••••88',
    balance: 8200,
    currency: 'BDT',
    notes: 'অনলাইন অর্ডার, বিদ্যুৎ প্রিপেইড রিচার্জ ও ফার্মেসির পেমেন্ট',
    isDefaultPaymentSource: false,
    createdAt: '2026-01-01',
  },
];

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

export const generateInitialSampleExpenses = (monthYear: string): FamilyExpense[] => {
  return [
    {
      id: 'famexp-1',
      monthYear,
      date: `${monthYear}-02`,
      description: 'মাসিক সুপারমার্কেট মুদি সামগ্রী (চাল, সয়াবিন তেল, চিনি ও মসলা)',
      amount: 11200,
      categoryKey: 'groceries_bazaar',
      categoryName: 'Groceries & Daily Bazaar',
      categoryNameBn: 'মুদি ও দৈনন্দিন কাঁচাবাজার',
      paidByMemberId: 'fam-mbr-spouse',
      paidByName: 'স্ত্রী / সহ-ব্যবস্থাপক',
      paidFromJointAccountId: 'joint-acc-cashbox',
      paidFromPersonalPocket: false,
      isReimbursed: true,
      benefitTarget: 'household',
      status: 'approved',
      approvedByMemberId: 'fam-mbr-head',
      receiptNumber: 'SWAPNO-98124',
      memo: 'স্বপ্ন আউটলেট থেকে মাসিক বড় বাজার সম্পন্ন',
      createdAt: `${monthYear}-02T10:00:00Z`,
    },
    {
      id: 'famexp-2',
      monthYear,
      date: `${monthYear}-04`,
      description: 'কারওয়ান বাজার থেকে কাঁচা মাছ ও মাংস কেনাকাটা',
      amount: 4350,
      categoryKey: 'groceries_bazaar',
      categoryName: 'Groceries & Daily Bazaar',
      categoryNameBn: 'মুদি ও দৈনন্দিন কাঁচাবাজার',
      paidByMemberId: 'fam-mbr-manager',
      paidByName: 'কেয়ারটেকার / বাজার সহকারী',
      paidFromJointAccountId: 'joint-acc-cashbox',
      paidFromPersonalPocket: false,
      isReimbursed: true,
      benefitTarget: 'household',
      status: 'approved',
      approvedByMemberId: 'fam-mbr-head',
      memo: 'রুই মাছ ৩ কেজি ও দেশি মুরগি ৪টি',
      createdAt: `${monthYear}-04T12:00:00Z`,
    },
    {
      id: 'famexp-3',
      monthYear,
      date: `${monthYear}-05`,
      description: 'মাসিক ফ্ল্যাট ভাড়া ও ভবন সার্ভিস চার্জ পরিশোধ',
      amount: 32000,
      categoryKey: 'house_rent',
      categoryName: 'House Rent & Service Charge',
      categoryNameBn: 'বাসা ভাড়া ও সার্ভিস চার্জ',
      paidByMemberId: 'fam-mbr-head',
      paidByName: 'পরিবারের প্রধান (অ্যাডমিন)',
      paidFromJointAccountId: 'joint-acc-bank',
      paidFromPersonalPocket: false,
      isReimbursed: true,
      benefitTarget: 'household',
      status: 'approved',
      receiptNumber: 'RENT-REC-05',
      memo: 'মালিকের একাউন্টে আরটিজিএস ট্রান্সফার',
      createdAt: `${monthYear}-05T09:30:00Z`,
    },
    {
      id: 'famexp-4',
      monthYear,
      date: `${monthYear}-07`,
      description: 'ডিপিডিসি প্রিপেইড বিদ্যুৎ রিচার্জ ও ওয়াইফাই বিল',
      amount: 3250,
      categoryKey: 'utilities_bills',
      categoryName: 'Utilities, Gas & Internet',
      categoryNameBn: 'ইউটিলিটি, বিদ্যুৎ ও গ্যাস বিল',
      paidByMemberId: 'fam-mbr-spouse',
      paidByName: 'স্ত্রী / সহ-ব্যবস্থাপক',
      paidFromJointAccountId: 'joint-acc-mfs',
      paidFromPersonalPocket: false,
      isReimbursed: true,
      benefitTarget: 'household',
      status: 'approved',
      approvedByMemberId: 'fam-mbr-head',
      createdAt: `${monthYear}-07T14:15:00Z`,
    },
    {
      id: 'famexp-5',
      monthYear,
      date: `${monthYear}-10`,
      description: 'স্কুলের দ্বিতীয় সাময়িক পরীক্ষার টেস্ট পেপার ও গাইড বই',
      amount: 1850,
      categoryKey: 'children_education',
      categoryName: 'Children & Education',
      categoryNameBn: 'সন্তান ও পড়াশোনা খরচ',
      paidByMemberId: 'fam-mbr-child',
      paidByName: 'সন্তান (পড়াশোনা ও হাতখরচ)',
      paidFromPersonalPocket: true, // child paid out of own pocket -> eligible for reimbursement!
      isReimbursed: false,
      benefitTarget: 'children',
      status: 'approved',
      approvedByMemberId: 'fam-mbr-head',
      memo: 'নীলক্ষেত বুক মার্কেট থেকে কেনা',
      createdAt: `${monthYear}-10T16:20:00Z`,
    },
    {
      id: 'famexp-6',
      monthYear,
      date: `${monthYear}-12`,
      description: 'ফার্মেসি থেকে প্রেশার ও ডায়াবেটিস এর এক মাসের ওষুধ',
      amount: 2800,
      categoryKey: 'healthcare_medicine',
      categoryName: 'Healthcare & Medicine',
      categoryNameBn: 'পারিবারিক চিকিৎসা ও ওষুধ',
      paidByMemberId: 'fam-mbr-spouse',
      paidByName: 'স্ত্রী / সহ-ব্যবস্থাপক',
      paidFromPersonalPocket: true, // paid out of personal card, needs reimbursement
      isReimbursed: false,
      benefitTarget: 'parents',
      status: 'approved',
      approvedByMemberId: 'fam-mbr-head',
      receiptNumber: 'LAZZ-PHARMA-77',
      createdAt: `${monthYear}-12T11:00:00Z`,
    },
    {
      id: 'famexp-7',
      monthYear,
      date: `${monthYear}-15`,
      description: 'বাজার থেকে অতিরিক্ত ফলমূল ও মসলা (অনুমোদনের অপেক্ষায়)',
      amount: 3400,
      categoryKey: 'groceries_bazaar',
      categoryName: 'Groceries & Daily Bazaar',
      categoryNameBn: 'মুদি ও দৈনন্দিন কাঁচাবাজার',
      paidByMemberId: 'fam-mbr-manager',
      paidByName: 'কেয়ারটেকার / বাজার সহকারী',
      paidFromPersonalPocket: true,
      isReimbursed: false,
      benefitTarget: 'household',
      status: 'pending_approval', // requires head approval
      memo: 'আপেল, মালটা, বাদাম ও গুঁড়া মসলা',
      createdAt: `${monthYear}-15T18:45:00Z`,
    },
  ];
};

export const generateInitialContributions = (monthYear: string): JointFundContribution[] => {
  return [
    {
      id: 'famcnt-1',
      date: `${monthYear}-01`,
      memberId: 'fam-mbr-head',
      memberName: 'পরিবারের প্রধান (অ্যাডমিন)',
      jointAccountId: 'joint-acc-bank',
      amount: 50000,
      note: 'মাসিক বেতনের অংশ থেকে পারিবারিক যৌথ ব্যাংক হিসাবে জমা',
      createdAt: `${monthYear}-01T08:00:00Z`,
    },
    {
      id: 'famcnt-2',
      date: `${monthYear}-01`,
      memberId: 'fam-mbr-head',
      memberName: 'পরিবারের প্রধান (অ্যাডমিন)',
      jointAccountId: 'joint-acc-cashbox',
      amount: 20000,
      note: 'দৈনন্দিন সংসারের ক্যাশ বাক্সে নগদ ক্যাশ স্থানান্তর',
      createdAt: `${monthYear}-01T08:30:00Z`,
    },
    {
      id: 'famcnt-3',
      date: `${monthYear}-03`,
      memberId: 'fam-mbr-spouse',
      memberName: 'স্ত্রী / সহ-ব্যবস্থাপক',
      jointAccountId: 'joint-acc-mfs',
      amount: 10000,
      note: 'গৃহস্থালী বিকাশ ওয়ালেটে নিজস্ব সঞ্চয় থেকে অবদান',
      createdAt: `${monthYear}-03T11:00:00Z`,
    },
  ];
};

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
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed loading family ledger state from storage', e);
    }
  }

  // Default seed
  return {
    familyName: 'The Rahman Family Household',
    familyNameBn: 'রহমান পরিবার — যৌথ সংসার তহবিল',
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
