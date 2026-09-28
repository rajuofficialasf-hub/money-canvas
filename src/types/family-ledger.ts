/**
 * Family Budget & Shared Ledger Types
 * Multi-user household expense tracking with granular member permissions,
 * joint accounts, allowance limits, and reimbursement settlements.
 */

export type FamilyMemberRole = 
  | 'family_head'     // Full master access (Head of household / Admin)
  | 'contributor'     // Limited permission (Record grocery, bills, bazaar expenses)
  | 'viewer'          // Read-only (Inspect household budget & reports)
  | 'dependent';      // Pocket money / allowance recipient

export type FamilyRelation = 
  | 'self' 
  | 'spouse' 
  | 'parent' 
  | 'child' 
  | 'sibling' 
  | 'roommate' 
  | 'house_manager';

export interface FamilyMemberPermissions {
  canAddExpenses: boolean;
  canEditMasterBudget: boolean;
  canApproveExpenses: boolean;
  canManageMembers: boolean;
  canDepositJointAccount: boolean;
  canWithdrawJointAccount: boolean;
  canViewReports: boolean;
  maxSingleExpenseLimit: number; // 0 means unlimited; e.g. 5000 BDT requires approval
  requireApprovalAboveLimit: boolean;
  allowedCategories: string[]; // empty means all categories allowed
}

export interface FamilyMember {
  id: string;
  name: string;
  nameBn: string;
  relation: FamilyRelation;
  role: FamilyMemberRole;
  email?: string;
  phone?: string;
  avatarColor: string;
  monthlyAllowance?: number; // Optional pocket money
  permissions: FamilyMemberPermissions;
  status: 'active' | 'inactive';
  joinedAt: string;
}

export type JointAccountType = 'cash_box' | 'joint_bank' | 'shared_mfs';

export interface JointAccount {
  id: string;
  name: string;
  nameBn: string;
  type: JointAccountType;
  institutionName?: string;
  accountNumberMask?: string;
  balance: number;
  currency: 'BDT';
  notes?: string;
  isDefaultPaymentSource?: boolean;
  createdAt: string;
}

export interface FamilyCategoryDefinition {
  key: string;
  nameEn: string;
  nameBn: string;
  icon: string;
  color: string;
  defaultMonthlyLimit: number;
  descriptionBn: string;
}

export interface FamilyBudgetItem {
  id: string;
  monthYear: string; // 'YYYY-MM'
  categoryKey: string;
  allocatedAmount: number;
  assignedMemberId?: string; // Optional assigned manager for this category (e.g. Spouse handles groceries)
  warningThresholdPct: number; // default 85%
  updatedAt: string;
}

export type ExpenseBenefitTarget = 'household' | 'children' | 'parents' | 'individual' | 'emergency';
export type ExpenseApprovalStatus = 'approved' | 'pending_approval' | 'rejected';

export interface FamilyExpense {
  id: string;
  monthYear: string;
  date: string; // 'YYYY-MM-DD'
  description: string;
  amount: number;
  categoryKey: string;
  categoryName: string;
  categoryNameBn: string;
  paidByMemberId: string;
  paidByName: string;
  // Payment Source
  paidFromJointAccountId?: string; // if paid from shared cash/bank
  paidFromPersonalPocket: boolean;  // if true, member is owed reimbursement from the joint fund!
  isReimbursed: boolean;
  reimbursedAt?: string;
  // Beneficiary & Status
  benefitTarget: ExpenseBenefitTarget;
  targetMemberId?: string;
  status: ExpenseApprovalStatus;
  approvedByMemberId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  // Metadata
  memo?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface JointFundContribution {
  id: string;
  date: string;
  memberId: string;
  memberName: string;
  jointAccountId: string;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface MemberFinancialSummary {
  memberId: string;
  memberName: string;
  memberNameBn: string;
  role: FamilyMemberRole;
  relation: FamilyRelation;
  totalContributed: number;     // Total deposited into joint accounts
  totalDirectPaid: number;      // Total paid out of personal pocket for family
  totalReimbursed: number;      // Already reimbursed to member
  pendingReimbursement: number; // Still owed to member
  allowanceAssigned: number;    // Monthly allowance assigned
  allowanceSpent: number;       // Spent out of allowance
  allowanceRemaining: number;
  expenseCount: number;
}

export interface FamilyLedgerState {
  familyName: string;
  familyNameBn: string;
  currency: 'BDT';
  members: FamilyMember[];
  jointAccounts: JointAccount[];
  budgets: FamilyBudgetItem[];
  expenses: FamilyExpense[];
  contributions: JointFundContribution[];
  activeSimulationMemberId: string; // Current simulated view (to test limited permissions)
}
