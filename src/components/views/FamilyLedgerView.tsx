import React, { useState, useMemo } from 'react';
import { useFamilyLedger } from '../../lib/family-context';
import { useLanguage } from '../../lib/language-context';
import { FAMILY_CATEGORIES } from '../../lib/family-ledger-engine';
import {
  FamilyMember,
  FamilyMemberRole,
  FamilyRelation,
  ExpenseBenefitTarget,
} from '../../types/family-ledger';
import {
  Users,
  Home,
  Wallet,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  X,
  Building2,
  DollarSign,
  PieChart,
  TrendingDown,
  Filter,
  Receipt,
  UserCheck,
  HeartHandshake,
  Sparkles,
  Lock,
  Sliders,
  Calendar,
} from 'lucide-react';
import { Modal, Field, Input, Select, Button, ErrorBanner } from '../ui';

export const FamilyLedgerView: React.FC = () => {
  const { isBn } = useLanguage();
  const {
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
  } = useFamilyLedger();

  // Active Tab
  type TabKey = 'overview' | 'expenses' | 'accounts' | 'members' | 'reimbursements';
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Modals state
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isBudgetEditModalOpen, setIsBudgetEditModalOpen] = useState(false);
  const [editingBudgetCatKey, setEditingBudgetCatKey] = useState<string>('');
  const [budgetEditAmount, setBudgetEditAmount] = useState<string>('');

  // Expense Filter state
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Add Expense Form state
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState(FAMILY_CATEGORIES[0].key);
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expPaidBy, setExpPaidBy] = useState(activeMember.id);
  const [expPaymentSourceType, setExpPaymentSourceType] = useState<'joint' | 'personal'>('joint');
  const [expJointAccountId, setExpJointAccountId] = useState(state.jointAccounts[0]?.id || '');
  const [expBenefitTarget] = useState<ExpenseBenefitTarget>('household');
  const [expReceipt, setExpReceipt] = useState('');
  const [expMemo, setExpMemo] = useState('');
  const [expFormError, setExpFormError] = useState('');
  const [, setExpFormNotice] = useState('');

  // Contribution Form state
  const [cntMemberId, setCntMemberId] = useState(activeMember.id);
  const [cntAccountId, setCntAccountId] = useState(state.jointAccounts[0]?.id || '');
  const [cntAmount, setCntAmount] = useState('');
  const [cntNote, setCntNote] = useState('');
  const [cntError, setCntError] = useState('');

  // Member Form state
  const [mbrName, setMbrName] = useState('');
  const [mbrNameBn, setMbrNameBn] = useState('');
  const [mbrRelation, setMbrRelation] = useState<FamilyRelation>('spouse');
  const [mbrRole, setMbrRole] = useState<FamilyMemberRole>('contributor');
  const [mbrPhone, setMbrPhone] = useState('');
  const [mbrAllowance, setMbrAllowance] = useState('');
  const [mbrMaxLimit, setMbrMaxLimit] = useState('5000');
  const [mbrReqApproval, setMbrReqApproval] = useState(true);
  const [mbrCanAddExp, setMbrCanAddExp] = useState(true);
  const [mbrCanEditBud, setMbrCanEditBud] = useState(false);
  const [mbrCanApprove, setMbrCanApprove] = useState(false);
  const [mbrAllowedCats, setMbrAllowedCats] = useState<string[]>([]);
  const [mbrError, setMbrError] = useState('');

  // Check form live permission warnings
  const selectedPayingMember = useMemo(() => {
    return state.members.find((m) => m.id === expPaidBy) || activeMember;
  }, [state.members, expPaidBy, activeMember]);

  const livePermissionWarning = useMemo(() => {
    if (!expAmount || isNaN(parseFloat(expAmount))) return null;
    const num = parseFloat(expAmount);
    if (selectedPayingMember.role === 'family_head') return null;

    if (
      selectedPayingMember.permissions.allowedCategories.length > 0 &&
      !selectedPayingMember.permissions.allowedCategories.includes(expCategory)
    ) {
      return isBn
        ? `⚠️ এই সদস্যের এই ক্যাটাগরিতে খরচ যোগ করার পারমিশন নেই!`
        : `⚠️ This member is not allowed to spend on this category!`;
    }

    if (
      selectedPayingMember.permissions.maxSingleExpenseLimit > 0 &&
      num > selectedPayingMember.permissions.maxSingleExpenseLimit
    ) {
      return isBn
        ? `ℹ️ খরচের পরিমাণ (৳${num.toLocaleString()}) এই সদস্যের সর্বোচ্চ সীমা (৳${selectedPayingMember.permissions.maxSingleExpenseLimit.toLocaleString()}) অতিক্রম করেছে। এটি স্বয়ংক্রিয়ভাবে প্রধানের অনুমোদনের অপেক্ষায় জমা হবে।`
        : `ℹ️ Amount (৳${num.toLocaleString()}) exceeds member ceiling (৳${selectedPayingMember.permissions.maxSingleExpenseLimit.toLocaleString()}). Will be logged as Pending Approval.`;
    }
    return null;
  }, [expAmount, selectedPayingMember, expCategory, isBn]);

  // Overall Month Budget %
  const budgetProgressPct = totalMonthlyAllocated > 0 ? (totalMonthlySpent / totalMonthlyAllocated) * 100 : 0;
  const budgetRemaining = Math.max(0, totalMonthlyAllocated - totalMonthlySpent);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return state.expenses.filter((e) => {
      if (e.monthYear !== selectedMonth) return false;
      if (filterCategory !== 'all' && e.categoryKey !== filterCategory) return false;
      if (filterMember !== 'all' && e.paidByMemberId !== filterMember) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      return true;
    });
  }, [state.expenses, selectedMonth, filterCategory, filterMember, filterStatus]);

  // Handle Save Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpFormError('');
    setExpFormNotice('');

    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) {
      setExpFormError(isBn ? 'দয়া করে সঠিক খরচের পরিমাণ লিখুন।' : 'Please enter a valid expense amount.');
      return;
    }
    if (!expDescription.trim()) {
      setExpFormError(isBn ? 'খরচের বিবরণ লিখুন।' : 'Please enter an expense description.');
      return;
    }

    const catDef = FAMILY_CATEGORIES.find((c) => c.key === expCategory);
    const payingMember = state.members.find((m) => m.id === expPaidBy) || activeMember;

    const result = addFamilyExpense({
      date: expDate,
      description: expDescription.trim(),
      amount: amt,
      categoryKey: expCategory,
      categoryName: catDef?.nameEn || expCategory,
      categoryNameBn: catDef?.nameBn || expCategory,
      paidByMemberId: payingMember.id,
      paidByName: isBn ? payingMember.nameBn : payingMember.name,
      paidFromJointAccountId: expPaymentSourceType === 'joint' ? expJointAccountId : undefined,
      paidFromPersonalPocket: expPaymentSourceType === 'personal',
      benefitTarget: expBenefitTarget,
      receiptNumber: expReceipt.trim() || undefined,
      memo: expMemo.trim() || undefined,
    });

    if (!result.success) {
      setExpFormError(result.error || 'Failed to record expense.');
      return;
    }

    setIsAddExpenseModalOpen(false);
    setExpDescription('');
    setExpAmount('');
    setExpReceipt('');
    setExpMemo('');
    setExpFormError('');
  };

  // Handle Contribution
  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    setCntError('');
    const amt = parseFloat(cntAmount);
    if (isNaN(amt) || amt <= 0) {
      setCntError(isBn ? 'সঠিক টাকার পরিমাণ লিখুন।' : 'Please enter a valid contribution amount.');
      return;
    }

    const member = state.members.find((m) => m.id === cntMemberId) || activeMember;
    addJointContribution({
      date: new Date().toISOString().slice(0, 10),
      memberId: member.id,
      memberName: isBn ? member.nameBn : member.name,
      jointAccountId: cntAccountId,
      amount: amt,
      note: cntNote.trim() || undefined,
    });

    setIsContributeModalOpen(false);
    setCntAmount('');
    setCntNote('');
    setCntError('');
  };

  // Open Member Modal for Add or Edit
  const openMemberModal = (member?: FamilyMember) => {
    if (member) {
      setEditingMember(member);
      setMbrName(member.name);
      setMbrNameBn(member.nameBn);
      setMbrRelation(member.relation);
      setMbrRole(member.role);
      setMbrPhone(member.phone || '');
      setMbrAllowance(member.monthlyAllowance ? String(member.monthlyAllowance) : '');
      setMbrMaxLimit(String(member.permissions.maxSingleExpenseLimit || 0));
      setMbrReqApproval(member.permissions.requireApprovalAboveLimit);
      setMbrCanAddExp(member.permissions.canAddExpenses);
      setMbrCanEditBud(member.permissions.canEditMasterBudget);
      setMbrCanApprove(member.permissions.canApproveExpenses);
      setMbrAllowedCats(member.permissions.allowedCategories);
    } else {
      setEditingMember(null);
      setMbrName('');
      setMbrNameBn('');
      setMbrRelation('spouse');
      setMbrRole('contributor');
      setMbrPhone('');
      setMbrAllowance('');
      setMbrMaxLimit('5000');
      setMbrReqApproval(true);
      setMbrCanAddExp(true);
      setMbrCanEditBud(false);
      setMbrCanApprove(false);
      setMbrAllowedCats([]);
    }
    setMbrError('');
    setIsMemberModalOpen(true);
  };

  // Save Member
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMbrError('');
    if (!mbrName.trim()) {
      setMbrError(isBn ? 'সদস্যের নাম লিখুন।' : 'Please enter member name.');
      return;
    }

    const allowanceNum = mbrAllowance ? parseFloat(mbrAllowance) : undefined;
    const maxLimitNum = parseFloat(mbrMaxLimit) || 0;

    const permissions = {
      canAddExpenses: mbrCanAddExp,
      canEditMasterBudget: mbrCanEditBud && mbrRole === 'family_head',
      canApproveExpenses: mbrCanApprove || mbrRole === 'family_head',
      canManageMembers: mbrRole === 'family_head',
      canDepositJointAccount: mbrRole !== 'viewer',
      canWithdrawJointAccount: mbrRole === 'family_head' || mbrRole === 'contributor',
      canViewReports: true,
      maxSingleExpenseLimit: maxLimitNum,
      requireApprovalAboveLimit: mbrReqApproval,
      allowedCategories: mbrAllowedCats,
    };

    if (editingMember) {
      updateFamilyMember(editingMember.id, {
        name: mbrName.trim(),
        nameBn: mbrNameBn.trim() || mbrName.trim(),
        relation: mbrRelation,
        role: mbrRole,
        phone: mbrPhone.trim() || undefined,
        monthlyAllowance: allowanceNum,
        permissions,
      });
    } else {
      const colors = ['bg-accent-deep', 'bg-purple-600', 'bg-sky-600', 'bg-amber-600', 'bg-pink-600', 'bg-indigo-600'];
      const chosenColor = `${colors[state.members.length % colors.length]} text-ink`;

      createFamilyMember({
        name: mbrName.trim(),
        nameBn: mbrNameBn.trim() || mbrName.trim(),
        relation: mbrRelation,
        role: mbrRole,
        phone: mbrPhone.trim() || undefined,
        avatarColor: chosenColor,
        monthlyAllowance: allowanceNum,
        permissions,
        status: 'active',
      });
    }

    setIsMemberModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Simulation Member Switcher Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-surface via-surface to-emerald-950/40 border border-accent/30 p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${activeMember.avatarColor}`}>
              {activeMember.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono tracking-wider text-accent-strong font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  {isBn ? 'সদস্য পারমিশন সিমুলেটর (Active View)' : 'Active Simulation Member'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent/20 text-accent-strong border border-accent/30">
                  {activeMember.role === 'family_head'
                    ? isBn ? 'পরিবারের প্রধান (অ্যাডমিন)' : 'Family Head (Admin)'
                    : activeMember.role === 'contributor'
                    ? isBn ? 'সহযোগী (সীমিত পারমিশন)' : 'Contributor (Limited)'
                    : activeMember.role === 'dependent'
                    ? isBn ? 'হাতখরচ প্রাপক (পকেট মানি)' : 'Dependent (Allowance)'
                    : isBn ? 'পরিদর্শক (Viewer)' : 'Viewer'}
                </span>
              </div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <span>{isBn ? activeMember.nameBn : activeMember.name}</span>
                <span className="text-xs text-ink-muted font-normal">
                  ({isBn ? `সম্পর্ক: ${activeMember.relation}` : `Relation: ${activeMember.relation}`})
                </span>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {activeMember.role === 'family_head'
                  ? isBn
                    ? 'সর্বোচ্চ অ্যাক্সেস: বাজেট তৈরি, সদস্য পরিচালনা, অনুমোদন ও যৌথ তহবিল নিয়ন্ত্রণ।'
                    : 'Full Access: Manage budgets, approve member expenses, manage joint accounts.'
                  : isBn
                  ? `সীমিত পারমিশন: একক খরচ সীমা ৳${activeMember.permissions.maxSingleExpenseLimit.toLocaleString()} · ${activeMember.permissions.requireApprovalAboveLimit ? 'উর্ধ্বতন অনুমোদন সাপেক্ষ' : 'স্বয়ংক্রিয় অনুমোদন'} · ব্যক্তিগত আর্থিক তথ্য লকড।`
                  : `Limited Permission: Max single limit ৳${activeMember.permissions.maxSingleExpenseLimit.toLocaleString()} · ${activeMember.permissions.requireApprovalAboveLimit ? 'Approval required above limit' : 'Direct'} · Private finances protected.`}
              </p>
            </div>
          </div>

          {/* Quick Switch Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono text-ink-muted">{isBn ? 'অন্যান্য সদস্য হিসেবে ভিউ করুন:' : 'Switch simulated view:'}</span>
            <div className="flex items-center gap-1.5 bg-canvas p-1 rounded-xl border border-edge">
              {state.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => switchActiveMember(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeMember.id === m.id
                      ? 'bg-accent text-accent-ink font-bold shadow'
                      : 'text-ink-soft hover:text-ink hover:bg-surface'
                  }`}
                  title={`${m.name} (${m.role})`}
                >
                  {isBn ? m.nameBn.split(' ')[0] : m.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1">
            <HeartHandshake className="h-4 w-4" />
            <span>{isBn ? 'যৌথ সংসার খরচ ও ফ্যামিলি বাজেট' : 'Shared Household & Family Ledger'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span>{isBn ? state.familyNameBn : state.familyName}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-raised text-ink-soft border border-slate-700">
              BDT ৳
            </span>
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-0.5">
            {isBn
              ? 'পরিবারের সদস্যদের নির্দিষ্ট পারমিশন দিয়ে সংসার খরচ ট্র্যাকিং, যৌথ ক্যাশ বাক্স ও রিইমবার্সমেন্ট হিসাব।'
              : 'Multi-member household expense tracking with role-based limited permissions, joint cash pool, and reimbursements.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 border border-edge bg-surface/60 rounded-xl px-3 py-2 text-xs font-mono text-ink-soft">
            <Calendar className="h-3.5 w-3.5 text-accent-strong" />
            <span>{isBn ? 'মাস:' : 'Month:'}</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-ink border-0 focus:outline-none focus:ring-0 cursor-pointer font-bold"
            />
          </div>

          {/* Action: Fund Joint Account */}
          {activeMember.role !== 'viewer' && (
            <button
              onClick={() => {
                setCntMemberId(activeMember.id);
                setIsContributeModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-medium transition-all"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isBn ? 'যৌথ তহবিলে জমা' : 'Deposit to Pool'}</span>
            </button>
          )}

          {/* Action: Log Expense */}
          {canAddExpenses ? (
            <Button
              onClick={() => {
                setExpPaidBy(activeMember.id);
                setIsAddExpenseModalOpen(true);
              }}
              variant="primary"
              size="md"
              icon={Plus}
            >
              {isBn ? 'সংসার খরচ যোগ করুন' : 'Record Expense'}
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-edge text-ink-muted text-xs font-medium cursor-not-allowed">
              <Lock className="w-3.5 h-3.5 text-ink-faint" />
              <span>{isBn ? 'খরচ এন্ট্রি পারমিশন নেই' : 'Entry Restricted'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Joint Pool Balance */}
        <div className="p-4 rounded-2xl bg-surface/60 border border-edge hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
            <span className="font-medium">{isBn ? 'যৌথ তহবিল মোট ব্যালেন্স' : 'Joint Cash Pool Balance'}</span>
            <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-strong">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-ink">
            ৳{totalJointBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-ink-muted mt-1 flex items-center gap-1">
            <span>{state.jointAccounts.length} {isBn ? 'টি যৌথ অ্যাকাউন্ট (ক্যাশ ও ব্যাংক)' : 'joint accounts active'}</span>
          </div>
        </div>

        {/* Monthly Household Budget */}
        <div className="p-4 rounded-2xl bg-surface/60 border border-edge hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
            <span className="font-medium">{isBn ? 'মাসিক সংসার বাজেট' : 'Monthly Household Budget'}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-ink">
            ৳{totalMonthlyAllocated.toLocaleString()}
          </div>
          <div className="text-[11px] text-purple-300/80 mt-1 flex items-center gap-1">
            <span>{isBn ? `${FAMILY_CATEGORIES.length}টি প্রধান পারিবারিক খাত` : `${FAMILY_CATEGORIES.length} household categories`}</span>
          </div>
        </div>

        {/* Monthly Spent & Progress */}
        <div className="p-4 rounded-2xl bg-surface/60 border border-edge hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
            <span className="font-medium">{isBn ? 'চলতি মাসে মোট ব্যয়' : 'Total Spent This Month'}</span>
            <div className="w-8 h-8 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-ink">
            ৳{totalMonthlySpent.toLocaleString()}
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className={budgetProgressPct > 90 ? 'text-negative font-bold' : 'text-ink-muted'}>
                {budgetProgressPct.toFixed(1)}% {isBn ? 'ব্যয়িত' : 'used'}
              </span>
              <span className="text-accent-strong">
                {isBn ? 'অবশিষ্ট' : 'Left'}: ৳{budgetRemaining.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-raised h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetProgressPct > 100
                    ? 'bg-negative'
                    : budgetProgressPct > 85
                    ? 'bg-warning'
                    : 'bg-accent'
                }`}
                style={{ width: `${Math.min(100, budgetProgressPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reimbursement & Pending Approvals */}
        <div className="p-4 rounded-2xl bg-surface/60 border border-edge hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
            <span className="font-medium">{isBn ? 'রিইমবার্সমেন্ট ও অনুমোদন' : 'Reimbursements & Approval'}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">
            ৳{totalPendingReimbursements.toLocaleString()}
          </div>
          <div className="text-[11px] mt-1 flex items-center justify-between">
            <span className="text-ink-muted">{isBn ? 'সদস্যদের পাওনা' : 'Owed to members'}</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning font-bold text-[10px] border border-warning/30">
                {pendingApprovalsCount} {isBn ? 'অপেক্ষমাণ' : 'Pending'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-edge gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-t-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-surface text-accent-strong border-b-2 border-accent-strong'
              : 'text-ink-muted hover:text-ink-soft'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>{isBn ? 'বাজেট ও ক্যাটাগরি' : 'Budgets & Categories'}</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-t-xl transition-all relative ${
            activeTab === 'expenses'
              ? 'bg-surface text-accent-strong border-b-2 border-accent-strong'
              : 'text-ink-muted hover:text-ink-soft'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{isBn ? 'দৈনন্দিন খরচ খাতা' : 'Household Expenses Log'}</span>
          {pendingApprovalsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-t-xl transition-all ${
            activeTab === 'accounts'
              ? 'bg-surface text-accent-strong border-b-2 border-accent-strong'
              : 'text-ink-muted hover:text-ink-soft'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isBn ? 'যৌথ অ্যাকাউন্ট ও তহবিল' : 'Joint Accounts & Pool'}</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-t-xl transition-all ${
            activeTab === 'members'
              ? 'bg-surface text-accent-strong border-b-2 border-accent-strong'
              : 'text-ink-muted hover:text-ink-soft'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isBn ? 'সদস্য ও পারমিশন কন্ট্রোল' : 'Members & Permissions'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-raised text-ink-soft font-mono">
            {state.members.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reimbursements')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-t-xl transition-all ${
            activeTab === 'reimbursements'
              ? 'bg-surface text-accent-strong border-b-2 border-accent-strong'
              : 'text-ink-muted hover:text-ink-soft'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>{isBn ? 'রিইমবার্সমেন্ট ও হিসাব-নিকাশ' : 'Reimbursements'}</span>
          {totalPendingReimbursements > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-mono font-bold">
              ৳{Math.round(totalPendingReimbursements / 1000)}k
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CATEGORY BUDGETS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Category Budget Progress Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <span>{isBn ? 'পারিবারিক খরচের খাত ও মাসিক লিমিট' : 'Household Category Budgets & Spending'}</span>
                  <span className="text-xs font-mono font-normal text-ink-muted">({selectedMonth})</span>
                </h3>
                <p className="text-xs text-ink-muted">
                  {isBn
                    ? 'প্রতিটি খাতের নির্ধারিত বাজেট সীমা, রিয়েল-টাইম খরচ এবং প্রগ্রেস বার।'
                    : 'Category allocation limits, actual spend, and warning threshold indicators.'}
                </p>
              </div>

              {canEditMasterBudget && (
                <span className="text-xs text-accent-strong font-mono flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isBn ? 'বাজেট লিমিট এডিট করতে কার্ডে ক্লিক করুন' : 'Click limit to edit budget ceiling'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FAMILY_CATEGORIES.map((cat) => {
                const budgetItem = state.budgets.find(
                  (b) => b.monthYear === selectedMonth && b.categoryKey === cat.key
                );
                const limit = budgetItem?.allocatedAmount || cat.defaultMonthlyLimit;
                const spendData = categorySpending[cat.key] || { totalSpent: 0, approvedCount: 0, pendingCount: 0 };
                const spent = spendData.totalSpent;
                const pct = limit > 0 ? (spent / limit) * 100 : 0;
                const isOver = spent > limit;
                const isWarning = pct >= (budgetItem?.warningThresholdPct || 85) && !isOver;

                return (
                  <div
                    key={cat.key}
                    className={`rounded-2xl p-4 border transition-all ${
                      isOver
                        ? 'bg-rose-950/20 border-negative/40'
                        : isWarning
                        ? 'bg-amber-950/20 border-warning/40'
                        : 'bg-surface/60 border-edge hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-ink shadow-md"
                          style={{ backgroundColor: cat.color }}
                        >
                          <Home className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-ink leading-tight">
                            {isBn ? cat.nameBn : cat.nameEn}
                          </div>
                          <div className="text-[10px] text-ink-muted line-clamp-1">
                            {cat.descriptionBn}
                          </div>
                        </div>
                      </div>

                      {/* Quick Add Expense for this category */}
                      {canAddExpenses && (
                        <button
                          onClick={() => {
                            setExpCategory(cat.key);
                            setExpPaidBy(activeMember.id);
                            setIsAddExpenseModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-raised hover:bg-accent/20 hover:text-accent-strong text-ink-muted text-xs transition-all"
                          title={isBn ? 'এই খাতে খরচ যোগ করুন' : 'Add expense to this category'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Spend vs Limit */}
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div>
                        <span className="text-lg font-bold font-mono text-ink">৳{spent.toLocaleString()}</span>
                        <span className="text-xs text-ink-muted font-mono ml-1">/ ৳{limit.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isOver ? 'text-negative' : isWarning ? 'text-warning' : 'text-accent-strong'
                          }`}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-raised h-2 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-negative' : isWarning ? 'bg-warning' : 'bg-accent'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1 border-t border-edge/80">
                      <span>
                        {spendData.approvedCount} {isBn ? 'টি খরচ এন্ট্রি' : 'transactions'}
                        {spendData.pendingCount > 0 && (
                          <span className="text-warning ml-1">
                            ({spendData.pendingCount} {isBn ? 'অপেক্ষমাণ' : 'pending'})
                          </span>
                        )}
                      </span>

                      {canEditMasterBudget ? (
                        <button
                          onClick={() => {
                            setEditingBudgetCatKey(cat.key);
                            setBudgetEditAmount(String(limit));
                            setIsBudgetEditModalOpen(true);
                          }}
                          className="text-xs text-accent-strong hover:underline flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{isBn ? 'লিমিট পরিবর্তন' : 'Edit Limit'}</span>
                        </button>
                      ) : (
                        <span className="text-ink-faint text-[10px]">
                          {isBn ? 'সীমা লকড' : 'Limit locked'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member Contribution Scoreboard */}
          <div className="rounded-2xl bg-surface/60 border border-edge p-5">
            <h3 className="text-base font-bold text-ink mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-accent-strong" />
              <span>{isBn ? 'পারিবারিক তহবিল অবদান ও খরচ ট্র্যাকিং' : 'Member Contributions & Spending Breakdown'}</span>
            </h3>
            <p className="text-xs text-ink-muted mb-4">
              {isBn
                ? 'পরিবারের কোন সদস্য যৌথ তহবিলে কত টাকা দিয়েছেন এবং ব্যক্তিগত পকেট থেকে সংসারের জন্য কত টাকা খরচ করেছেন।'
                : 'Breakdown of who funded the joint pool and who paid out-of-pocket for family needs.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {memberSummaries.map((m) => (
                <div key={m.memberId} className="p-3.5 rounded-xl bg-canvas/70 border border-edge space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">
                      {isBn ? m.memberNameBn : m.memberName}
                    </span>
                    <span className="text-[10px] font-mono text-accent-strong px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                      {m.role}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-ink-muted">
                      <span>{isBn ? 'যৌথ তহবিলে জমা:' : 'Contributed to Pool:'}</span>
                      <span className="font-mono text-accent-strong font-semibold">৳{m.totalContributed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-ink-muted">
                      <span>{isBn ? 'ব্যক্তিগত পকেট থেকে ব্যয়:' : 'Direct Pocket Spend:'}</span>
                      <span className="font-mono text-ink">৳{m.totalDirectPaid.toLocaleString()}</span>
                    </div>
                    {m.pendingReimbursement > 0 && (
                      <div className="flex justify-between text-sky-400 font-semibold">
                        <span>{isBn ? 'পাওনা রিইমবার্সমেন্ট:' : 'Owed Reimbursement:'}</span>
                        <span className="font-mono">৳{m.pendingReimbursement.toLocaleString()}</span>
                      </div>
                    )}
                    {m.allowanceAssigned > 0 && (
                      <div className="flex justify-between text-purple-300">
                        <span>{isBn ? 'হাতখরচ অবশিষ্ট:' : 'Pocket Money Left:'}</span>
                        <span className="font-mono font-bold">৳{m.allowanceRemaining.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES LOG */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3 rounded-2xl bg-surface/60 border border-edge flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Filter className="w-3.5 h-3.5 text-accent-strong" />
                <span>{isBn ? 'ফিল্টার:' : 'Filter:'}</span>
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-canvas border border-edge rounded-lg px-2.5 py-1 text-xs text-ink-soft focus:outline-none focus:border-accent"
              >
                <option value="all">{isBn ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
                {FAMILY_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {isBn ? c.nameBn : c.nameEn}
                  </option>
                ))}
              </select>

              {/* Member Filter */}
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="bg-canvas border border-edge rounded-lg px-2.5 py-1 text-xs text-ink-soft focus:outline-none focus:border-accent"
              >
                <option value="all">{isBn ? 'সকল সদস্য' : 'All Members'}</option>
                {state.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {isBn ? m.nameBn : m.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-canvas border border-edge rounded-lg px-2.5 py-1 text-xs text-ink-soft focus:outline-none focus:border-accent"
              >
                <option value="all">{isBn ? 'সকল অবস্থা' : 'All Statuses'}</option>
                <option value="approved">{isBn ? 'অনুমোদিত' : 'Approved'}</option>
                <option value="pending_approval">{isBn ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approval'}</option>
                <option value="rejected">{isBn ? 'প্রত্যাখ্যাত' : 'Rejected'}</option>
              </select>
            </div>

            <div className="text-xs text-ink-muted font-mono">
              <span>{filteredExpenses.length} {isBn ? 'টি রেকর্ড পাওয়া গেছে' : 'records found'}</span>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="rounded-2xl bg-surface/60 border border-edge overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas/80 border-b border-edge text-ink-muted font-mono text-[11px] uppercase">
                  <tr>
                    <th className="py-3 px-4">{isBn ? 'তারিখ' : 'Date'}</th>
                    <th className="py-3 px-4">{isBn ? 'বিবরণ ও মেমো' : 'Description & Memo'}</th>
                    <th className="py-3 px-4">{isBn ? 'খাত (Category)' : 'Category'}</th>
                    <th className="py-3 px-4">{isBn ? 'পরিশোধকারী সদস্য' : 'Paid By'}</th>
                    <th className="py-3 px-4">{isBn ? 'পেমেন্ট উৎস' : 'Payment Source'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'পরিমাণ (BDT)' : 'Amount'}</th>
                    <th className="py-3 px-4">{isBn ? 'অবস্থা' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/60">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-ink-faint">
                        {isBn ? 'এই মাসে কোনো খরচ রেকর্ড পাওয়া যায়নি।' : 'No expense entries found for this month.'}
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-raised/30 transition-all">
                        <td className="py-3 px-4 font-mono text-ink-soft whitespace-nowrap">
                          {exp.date}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-ink leading-tight">{exp.description}</div>
                          {exp.memo && <div className="text-[11px] text-ink-muted mt-0.5">{exp.memo}</div>}
                          {exp.receiptNumber && (
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-raised text-[10px] font-mono text-ink-muted">
                              #{exp.receiptNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-lg bg-raised text-ink-soft font-medium">
                            {isBn ? exp.categoryNameBn : exp.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-ink-soft">
                          {exp.paidByName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {exp.paidFromPersonalPocket ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              {exp.isReimbursed ? (isBn ? 'পকেট থেকে (রিইমবার্সড)' : 'Personal (Reimbursed)') : (isBn ? 'পকেট থেকে (পাওনা)' : 'Personal (Owed)')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent/10 text-accent-strong border border-accent/20">
                              {isBn ? 'যৌথ তহবিল' : 'Joint Account'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-right text-ink whitespace-nowrap">
                          ৳{exp.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {exp.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-strong">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isBn ? 'অনুমোদিত' : 'Approved'}</span>
                            </span>
                          ) : exp.status === 'pending_approval' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warning">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isBn ? 'অনুমোদন প্রয়োজন' : 'Needs Approval'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-negative">
                              <X className="w-3.5 h-3.5" />
                              <span>{isBn ? 'বাতিল' : 'Rejected'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Head/Approver can approve/reject */}
                            {exp.status === 'pending_approval' && canApproveExpenses && (
                              <>
                                <button
                                  onClick={() => approveExpense(exp.id)}
                                  className="p-1 rounded bg-accent/20 text-accent-strong hover:bg-accent/40 text-[10px] font-bold"
                                  title={isBn ? 'অনুমোদন করুন' : 'Approve'}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => rejectExpense(exp.id)}
                                  className="p-1 rounded bg-negative/20 text-negative hover:bg-negative/40 text-[10px] font-bold"
                                  title={isBn ? 'বাতিল করুন' : 'Reject'}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* Head can delete */}
                            {isHead && (
                              <button
                                onClick={() => deleteExpense(exp.id)}
                                className="p-1 rounded hover:bg-negative/20 text-ink-faint hover:text-negative"
                                title={isBn ? 'মুছুন' : 'Delete'}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: JOINT ACCOUNTS & POOL */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent-strong" />
                <span>{isBn ? 'যৌথ তহবিল ও গৃহস্থালী অ্যাকাউন্ট' : 'Joint Household Accounts & Cash Box'}</span>
              </h3>
              <p className="text-xs text-ink-muted">
                {isBn
                  ? 'ঘরের নগদ ক্যাশ বাক্স, যৌথ ব্যাংক অ্যাকাউন্ট ও শেয়ার্ড বিকাশ ওয়ালেটের রিয়েল-টাইম ব্যালেন্স।'
                  : 'Manage physical household cash box, joint bank accounts, and mobile wallets.'}
              </p>
            </div>

            <Button
              onClick={() => setIsContributeModalOpen(true)}
              variant="primary"
              size="sm"
              icon={Plus}
            >
              {isBn ? 'তহবিলে টাকা জমা' : 'Fund Account'}
            </Button>
          </div>

          {/* Accounts Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.jointAccounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-2xl p-5 bg-surface/60 border border-edge hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent-strong border border-accent/20">
                      {acc.type === 'cash_box'
                        ? isBn ? 'নগদ ক্যাশ বাক্স' : 'Physical Cash'
                        : acc.type === 'joint_bank'
                        ? isBn ? 'যৌথ ব্যাংক হিসাব' : 'Joint Bank'
                        : isBn ? 'শেয়ার্ড বিকাশ' : 'Mobile Wallet'}
                    </span>
                    {acc.isDefaultPaymentSource && (
                      <span className="text-[10px] text-ink-muted font-mono">Default</span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-ink mb-1">
                    {isBn ? acc.nameBn : acc.name}
                  </h4>
                  {acc.institutionName && (
                    <div className="text-xs text-ink-muted flex items-center gap-1 mb-2">
                      <span>{acc.institutionName}</span>
                      {acc.accountNumberMask && <span className="font-mono">{acc.accountNumberMask}</span>}
                    </div>
                  )}

                  <div className="text-2xl font-bold font-mono text-accent-strong my-3">
                    ৳{acc.balance.toLocaleString()}
                  </div>

                  {acc.notes && <p className="text-xs text-ink-muted mb-4">{acc.notes}</p>}
                </div>

                <div className="pt-3 border-t border-edge flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setCntAccountId(acc.id);
                      setIsContributeModalOpen(true);
                    }}
                    className="text-accent-strong hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isBn ? 'টাকা যোগ করুন' : 'Add Cash'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Contributions History */}
          <div className="rounded-2xl bg-surface/60 border border-edge p-5">
            <h4 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-strong" />
              <span>{isBn ? 'সাম্প্রতিক তহবিল অবদান হিস্ট্রি (Contributions History)' : 'Recent Fund Contributions'}</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-edge text-ink-muted font-mono text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">{isBn ? 'তারিখ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isBn ? 'অবদানকারী সদস্য' : 'Contributed By'}</th>
                    <th className="py-2.5 px-3">{isBn ? 'অ্যাকাউন্টে জমা' : 'Target Account'}</th>
                    <th className="py-2.5 px-3">{isBn ? 'নোট' : 'Note'}</th>
                    <th className="py-2.5 px-3 text-right">{isBn ? 'পরিমাণ' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/60 font-mono">
                  {state.contributions.map((cnt) => {
                    const acc = state.jointAccounts.find((a) => a.id === cnt.jointAccountId);
                    return (
                      <tr key={cnt.id} className="hover:bg-raised/30">
                        <td className="py-2.5 px-3 text-ink-soft">{cnt.date}</td>
                        <td className="py-2.5 px-3 font-sans font-medium text-ink">{cnt.memberName}</td>
                        <td className="py-2.5 px-3 font-sans text-ink-soft">{acc ? (isBn ? acc.nameBn : acc.name) : 'Joint Pool'}</td>
                        <td className="py-2.5 px-3 font-sans text-ink-muted">{cnt.note || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-accent-strong">
                          +৳{cnt.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MEMBERS & PERMISSIONS */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-strong" />
                <span>{isBn ? 'পারিবারিক সদস্য ও সীমিত পারমিশন নিয়ন্ত্রণ' : 'Family Members & Role-Based Permissions'}</span>
              </h3>
              <p className="text-xs text-ink-muted">
                {isBn
                  ? 'পরিবারের প্রতিটি সদস্যের জন্য একক খরচ সীমা, অনুমোদন নীতিমালা এবং অনুমোদিত ক্যাটাগরি কনফিগার করুন।'
                  : 'Configure spending limits, approval requirements, and category whitelists per family member.'}
              </p>
            </div>

            {canManageMembers && (
              <Button
                onClick={() => openMemberModal()}
                variant="primary"
                size="md"
                icon={Plus}
              >
                {isBn ? 'নতুন সদস্য যোগ করুন' : 'Add Family Member'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.members.map((member) => (
              <div
                key={member.id}
                className={`rounded-2xl p-5 border transition-all ${
                  member.id === activeMember.id
                    ? 'bg-surface border-accent/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-surface/60 border-edge'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow ${member.avatarColor}`}>
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-ink">
                          {isBn ? member.nameBn : member.name}
                        </h4>
                        {member.id === activeMember.id && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent/20 text-accent-strong font-bold border border-accent/30">
                            Current View
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {isBn ? `সম্পর্ক: ${member.relation}` : `Relation: ${member.relation}`}
                        {member.phone && ` · ${member.phone}`}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-raised text-ink-soft border border-slate-700">
                    {member.role}
                  </span>
                </div>

                {/* Permissions Badges */}
                <div className="space-y-2 mb-4 p-3 rounded-xl bg-canvas/60 border border-edge/80 text-xs">
                  <div className="text-[11px] font-semibold text-ink-soft flex items-center justify-between">
                    <span>{isBn ? 'অনুমোদিত পারমিশনসমূহ:' : 'Assigned Permissions:'}</span>
                    <span className="font-mono text-accent-strong">
                      {isBn ? 'একক লিমিট: ' : 'Max Limit: '}
                      {member.permissions.maxSingleExpenseLimit > 0
                        ? `৳${member.permissions.maxSingleExpenseLimit.toLocaleString()}`
                        : isBn ? 'আনলিমিটেড' : 'Unlimited'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-ink-muted">
                    <div className="flex items-center gap-1.5">
                      {member.permissions.canAddExpenses ? (
                        <Check className="w-3.5 h-3.5 text-accent-strong shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span>{isBn ? 'খরচ এন্ট্রি' : 'Add Expenses'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {member.permissions.canEditMasterBudget ? (
                        <Check className="w-3.5 h-3.5 text-accent-strong shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span>{isBn ? 'বাজেট পরিবর্তন' : 'Edit Budgets'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {member.permissions.canApproveExpenses ? (
                        <Check className="w-3.5 h-3.5 text-accent-strong shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span>{isBn ? 'খরচ অনুমোদন' : 'Approve Bills'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {member.permissions.requireApprovalAboveLimit ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-accent-strong shrink-0" />
                      )}
                      <span>{isBn ? 'উর্ধ্বতন অনুমোদন' : 'Approval Check'}</span>
                    </div>
                  </div>

                  {member.monthlyAllowance && (
                    <div className="pt-1.5 mt-1 border-t border-edge flex justify-between text-purple-300">
                      <span>{isBn ? 'মাসিক হাতখরচ (পকেট মানি):' : 'Monthly Allowance:'}</span>
                      <span className="font-mono font-bold">৳{member.monthlyAllowance.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    onClick={() => switchActiveMember(member.id)}
                    className="text-xs text-accent-strong hover:underline font-medium flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isBn ? 'এই সদস্য হিসেবে সুইচ করুন' : 'Simulate This Member'}</span>
                  </button>

                  {canManageMembers && member.id !== 'fam-mbr-head' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openMemberModal(member)}
                        className="text-ink-muted hover:text-ink"
                      >
                        {isBn ? 'এডিট' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteFamilyMember(member.id)}
                        className="text-ink-faint hover:text-negative"
                      >
                        {isBn ? 'মুছুন' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: REIMBURSEMENTS & SETTLEMENTS */}
      {activeTab === 'reimbursements' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-accent-strong" />
              <span>{isBn ? 'পারিবারিক রিইমবার্সমেন্ট ও হিসাব-নিকাশ' : 'Family Reimbursements & Settlements'}</span>
            </h3>
            <p className="text-xs text-ink-muted">
              {isBn
                ? 'পরিবারের কোনো সদস্য ব্যক্তিগত কার্ড বা পকেট থেকে সংসারের জরুরি বাজার বা বিল দিলে, যৌথ তহবিল থেকে তার পাওনা রিইমবার্স করুন।'
                : 'Settle out-of-pocket expenses paid by family members for household groceries, bills, or medical needs.'}
            </p>
          </div>

          {/* Pending Reimbursements List */}
          <div className="rounded-2xl bg-surface/60 border border-edge p-5 space-y-4">
            <h4 className="text-sm font-bold text-ink flex items-center justify-between">
              <span>{isBn ? 'অপেক্ষমাণ রিইমবার্সমেন্ট তালিকা' : 'Pending Reimbursements'}</span>
              <span className="font-mono text-xs text-sky-400">
                {isBn ? 'মোট পাওনা:' : 'Total Owed:'} ৳{totalPendingReimbursements.toLocaleString()}
              </span>
            </h4>

            {state.expenses.filter((e) => e.paidFromPersonalPocket && !e.isReimbursed && e.status === 'approved').length === 0 ? (
              <div className="py-10 text-center text-ink-faint text-xs">
                <CheckCircle2 className="w-8 h-8 text-accent/40 mx-auto mb-2" />
                <span>{isBn ? 'কোনো অপেক্ষমাণ রিইমবার্সমেন্ট নেই! সকল হিসাব পরিশোধিত।' : 'All member personal expenses have been reimbursed!'}</span>
              </div>
            ) : (
              <div className="divide-y divide-edge">
                {state.expenses
                  .filter((e) => e.paidFromPersonalPocket && !e.isReimbursed && e.status === 'approved')
                  .map((exp) => (
                    <div key={exp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink text-xs">{exp.description}</span>
                          <span className="text-[10px] font-mono text-ink-muted">({exp.date})</span>
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">
                          {isBn ? 'পরিশোধ করেছেন:' : 'Paid by:'} <strong className="text-ink-soft">{exp.paidByName}</strong> · {isBn ? exp.categoryNameBn : exp.categoryName}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-base font-bold font-mono text-sky-400">
                          ৳{exp.amount.toLocaleString()}
                        </div>

                        {canApproveExpenses ? (
                          <button
                            onClick={() => {
                              const cashAcc = state.jointAccounts[0];
                              if (cashAcc) {
                                reimburseExpense(exp.id, cashAcc.id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-accent-ink text-xs font-bold transition-all shadow"
                          >
                            {isBn ? 'তহবিল থেকে পরিশোধ' : 'Reimburse Now'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-ink-faint font-mono">
                            {isBn ? 'হেড অনুমোদন দরকার' : 'Head only'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD FAMILY EXPENSE */}
      <Modal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-accent-strong" />
            <span>{isBn ? 'পারিবারিক সংসার খরচ যোগ করুন' : 'Record Household Expense'}</span>
          </span>
        }
        maxWidth="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">

            {expFormError && <ErrorBanner variant="error" message={expFormError} />}

            {livePermissionWarning && (
            <ErrorBanner variant="warning" message={livePermissionWarning} />
          )}

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              {/* Category */}
              <Field label={isBn ? 'খরচের খাত (Category)' : 'Household Category'}>
                <Select value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                  {FAMILY_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {isBn ? cat.nameBn : cat.nameEn}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={isBn ? 'পরিমাণ (৳ BDT)' : 'Amount (৳ BDT)'}>
                  <Input
                    type="number"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="e.g. 3500"
                    min="1"
                    step="any"
                    required
                  />
                </Field>

                <Field label={isBn ? 'তারিখ' : 'Date'}>
                  <Input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                  />
                </Field>
              </div>

              {/* Description */}
              <Field label={isBn ? 'খরচের বিবরণ' : 'Description'}>
                <Input
                  type="text"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder={isBn ? 'যেমন: চাল-ডাল ও মাছ কেনাকাটা, বিদ্যুৎ রিচার্জ' : 'e.g. Weekly bazaar, grocery, DPDC bill'}
                  required
                />
              </Field>

              {/* Paid By Member */}
              <Field label={isBn ? 'কে পরিশোধ করেছেন? (Paid By Member)' : 'Paid By Member'}>
                <Select value={expPaidBy} onChange={(e) => setExpPaidBy(e.target.value)}>
                  {state.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {isBn ? m.nameBn : m.name} ({m.role})
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Payment Source: Joint Account vs Personal Pocket */}
              <Field label={isBn ? 'টাকা কোন উৎস থেকে দেওয়া হয়েছে?' : 'Paid From Where?'}>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExpPaymentSourceType('joint')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      expPaymentSourceType === 'joint'
                        ? 'bg-accent/10 border-accent text-accent-strong'
                        : 'bg-canvas border-edge text-ink-muted hover:text-ink'
                    }`}
                  >
                    <div className="font-bold text-xs">{isBn ? 'যৌথ অ্যাকাউন্ট' : 'Joint Account'}</div>
                    <div className="text-[10px] text-ink-muted mt-0.5">{isBn ? 'সংসার ক্যাশ বা ব্যাংক' : 'Direct from pool'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpPaymentSourceType('personal')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      expPaymentSourceType === 'personal'
                        ? 'bg-sky-500/10 border-sky-500 text-sky-300'
                        : 'bg-canvas border-edge text-ink-muted hover:text-ink'
                    }`}
                  >
                    <div className="font-bold text-xs">{isBn ? 'নিজস্ব পকেট থেকে' : 'Personal Pocket'}</div>
                    <div className="text-[10px] text-ink-muted mt-0.5">{isBn ? 'রিইমবার্সমেন্ট পাওনা হবে' : 'Eligible for reimbursement'}</div>
                  </button>
                </div>
              </Field>

              {/* Joint Account Select (if joint) */}
              {expPaymentSourceType === 'joint' && (
                <Field label={isBn ? 'নির্দিষ্ট যৌথ অ্যাকাউন্ট' : 'Select Joint Account'}>
                  <Select value={expJointAccountId} onChange={(e) => setExpJointAccountId(e.target.value)}>
                    {state.jointAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {isBn ? acc.nameBn : acc.name} (৳{acc.balance.toLocaleString()})
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {/* Memo & Receipt */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={isBn ? 'রসিদ / মেমো নম্বর' : 'Receipt / Voucher #'}>
                  <Input
                    type="text"
                    value={expReceipt}
                    onChange={(e) => setExpReceipt(e.target.value)}
                    placeholder="e.g. REC-891"
                  />
                </Field>

                <Field label={isBn ? 'অতিরিক্ত নোট' : 'Note / Memo'}>
                  <Input
                    type="text"
                    value={expMemo}
                    onChange={(e) => setExpMemo(e.target.value)}
                    placeholder="e.g. স্বপ্ন আউটলেট"
                  />
                </Field>
              </div>

              <div className="pt-3 border-t border-edge flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAddExpenseModalOpen(false)}>
                    {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary">
                    {isBn ? 'খরচ সংরক্ষণ করুন' : 'Save Expense'}
                </Button>
              </div>
            </form>
        </div>
      </Modal>

      {/* MODAL 2: FUND JOINT ACCOUNT */}
      <Modal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent-strong" />
            <span>{isBn ? 'যৌথ তহবিলে টাকা জমা দিন' : 'Fund Joint Account Pool'}</span>
          </span>
        }
        maxWidth="md"
      >
        <div className="space-y-4">

            {cntError && <ErrorBanner variant="error" message={cntError} />}

            <form onSubmit={handleSaveContribution} className="space-y-4 text-xs">
              <Field label={isBn ? 'কোন সদস্য টাকা দিচ্ছেন?' : 'Contributing Member'}>
                <Select value={cntMemberId} onChange={(e) => setCntMemberId(e.target.value)}>
                  {state.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {isBn ? m.nameBn : m.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={isBn ? 'কোন যৌথ অ্যাকাউন্টে জমা হবে?' : 'Target Joint Account'}>
                <Select value={cntAccountId} onChange={(e) => setCntAccountId(e.target.value)}>
                  {state.jointAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {isBn ? a.nameBn : a.name} (বর্তমান ব্যালেন্স: ৳{a.balance.toLocaleString()})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={isBn ? 'টাকার পরিমাণ (৳ BDT)' : 'Amount (৳ BDT)'}>
                <Input
                  type="number"
                  value={cntAmount}
                  onChange={(e) => setCntAmount(e.target.value)}
                  placeholder="e.g. 20000"
                  min="1"
                  required
                />
              </Field>

              <Field label={isBn ? 'মন্তব্য বা উৎস' : 'Note / Memo'}>
                <Input
                  type="text"
                  value={cntNote}
                  onChange={(e) => setCntNote(e.target.value)}
                  placeholder={isBn ? 'যেমন: মাসিক বেতনের অংশ থেকে জমা' : 'e.g. Monthly salary contribution'}
                />
              </Field>

              <div className="pt-3 border-t border-edge flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsContributeModalOpen(false)}>
                    {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary">
                    {isBn ? 'জমা সম্পন্ন করুন' : 'Confirm Deposit'}
                </Button>
              </div>
            </form>
        </div>
      </Modal>

      {/* MODAL 3: ADD / EDIT MEMBER & GRANULAR PERMISSIONS */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-strong" />
            <span>{editingMember
                    ? isBn ? 'সদস্য ও পারমিশন সম্পাদনা' : 'Edit Member & Permissions'
                    : isBn ? 'নতুন পারিবারিক সদস্য যোগ করুন' : 'Add New Family Member'}</span>
          </span>
        }
        maxWidth="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">

            {mbrError && <ErrorBanner variant="error" message={mbrError} />}

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Field label={isBn ? 'নাম (English)' : 'Name (English)'}>
                  <Input
                    type="text"
                    value={mbrName}
                    onChange={(e) => setMbrName(e.target.value)}
                    placeholder="e.g. Spouse / Rahim"
                    required
                  />
                </Field>
                <Field label={isBn ? 'নাম (বাংলায়)' : 'Name (Bengali)'}>
                  <Input
                    type="text"
                    value={mbrNameBn}
                    onChange={(e) => setMbrNameBn(e.target.value)}
                    placeholder="যেমন: স্ত্রী / রহিম"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={isBn ? 'পারিবারিক সম্পর্ক' : 'Relation'}>
                  <Select value={mbrRelation} onChange={(e) => setMbrRelation(e.target.value as FamilyRelation)}>
                    <option value="spouse">{isBn ? 'স্ত্রী / স্বামী (Spouse)' : 'Spouse'}</option>
                    <option value="child">{isBn ? 'সন্তান (Child)' : 'Child'}</option>
                    <option value="parent">{isBn ? 'পিতা / মাতা (Parent)' : 'Parent'}</option>
                    <option value="sibling">{isBn ? 'ভাই / বোন (Sibling)' : 'Sibling'}</option>
                    <option value="house_manager">{isBn ? 'কেয়ারটেকার / বাজার সহকারী' : 'House Manager / Caretaker'}</option>
                    <option value="roommate">{isBn ? 'রুমমেট / মেস মেম্বার' : 'Roommate / Flatmate'}</option>
                  </Select>
                </Field>

                <Field label={isBn ? 'অ্যাক্সেস রোল' : 'Access Role'}>
                  <Select value={mbrRole} onChange={(e) => setMbrRole(e.target.value as FamilyMemberRole)}>
                    <option value="contributor">{isBn ? 'সহযোগী (সীমিত পারমিশন)' : 'Contributor (Limited)'}</option>
                    <option value="dependent">{isBn ? 'হাতখরচ প্রাপক (পকেট মানি)' : 'Dependent (Allowance)'}</option>
                    <option value="viewer">{isBn ? 'দর্শক (Viewer Only)' : 'Viewer Only'}</option>
                    <option value="family_head">{isBn ? 'পরিবারের প্রধান (পূর্ণ ক্ষমতা)' : 'Family Head (Full Admin)'}</option>
                  </Select>
                </Field>
              </div>

              {/* Granular Permission Toggles */}
              <div className="p-3 rounded-xl bg-canvas border border-edge space-y-2.5">
                <span className="font-semibold text-ink-soft block text-xs">
                  {isBn ? 'সীমিত পারমিশন কনফিগারেশন' : 'Fine-Grained Permission Rules'}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mbrCanAddExp}
                      onChange={(e) => setMbrCanAddExp(e.target.checked)}
                      className="rounded bg-surface border-slate-700 text-accent focus:ring-0"
                    />
                    <span className="text-ink-soft">{isBn ? 'খরচ এন্ট্রি করতে পারবে' : 'Can Add Expenses'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mbrReqApproval}
                      onChange={(e) => setMbrReqApproval(e.target.checked)}
                      className="rounded bg-surface border-slate-700 text-accent focus:ring-0"
                    />
                    <span className="text-ink-soft">{isBn ? 'সীমা অতিক্রম করলে অনুমোদন লাগবে' : 'Require Approval Above Limit'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-edge/80">
                  <div>
                    <label className="block text-ink-muted text-[11px] mb-1">
                      {isBn ? 'একক খরচের সর্বোচ্চ সীমা (৳)' : 'Max Single Expense Limit (৳)'}
                    </label>
                    <input
                      type="number"
                      value={mbrMaxLimit}
                      onChange={(e) => setMbrMaxLimit(e.target.value)}
                      placeholder="e.g. 5000"
                      min="0"
                      className="w-full bg-surface border border-edge rounded-lg px-2.5 py-1.5 text-ink font-mono text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-ink-muted text-[11px] mb-1">
                      {isBn ? 'মাসিক হাতখরচ / পকেট মানি (৳)' : 'Monthly Allowance / Pocket (৳)'}
                    </label>
                    <input
                      type="number"
                      value={mbrAllowance}
                      onChange={(e) => setMbrAllowance(e.target.value)}
                      placeholder="e.g. 4000"
                      min="0"
                      className="w-full bg-surface border border-edge rounded-lg px-2.5 py-1.5 text-ink font-mono text-xs focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-edge flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsMemberModalOpen(false)}>
                    {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary">
                    {isBn ? 'সংরক্ষণ করুন' : 'Save Member'}
                </Button>
              </div>
            </form>
        </div>
      </Modal>

      {/* MODAL 4: EDIT CATEGORY BUDGET CEILING */}
      <Modal
        isOpen={isBudgetEditModalOpen}
        onClose={() => setIsBudgetEditModalOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-accent-strong" />
            <span>{isBn ? 'খাত বাজেট সীমা পরিবর্তন' : 'Edit Category Ceiling'}</span>
          </span>
        }
        maxWidth="sm"
      >

            <div className="space-y-3 text-xs">
              <Field label={isBn ? 'মাসিক বরাদ্দ (৳ BDT)' : 'Monthly Allocation (৳ BDT)'}>
                <Input
                  type="number"
                  value={budgetEditAmount}
                  onChange={(e) => setBudgetEditAmount(e.target.value)}
                  min="0"
                  required
                />
              </Field>

              <div className="pt-3 border-t border-edge flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBudgetEditModalOpen(false)}
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const amt = parseFloat(budgetEditAmount);
                    if (!isNaN(amt) && amt >= 0) {
                      upsertFamilyBudget(editingBudgetCatKey, amt);
                    }
                    setIsBudgetEditModalOpen(false);
                  }}
                >
                  {isBn ? 'সংরক্ষণ' : 'Save Limit'}
                </Button>
              </div>
            </div>
      </Modal>
    </div>
  );
};
