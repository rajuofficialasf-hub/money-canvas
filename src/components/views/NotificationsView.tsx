import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  TrendingUp,
  Landmark,
  PiggyBank,
  PieChart,
  ArrowRight,
  CheckCheck,
  Filter,
  Clock,
  Send,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { SystemAlert } from '../../types/accounting';
import {
  syncAndScheduleReminders,
  checkNotificationPermission,
  sendTestNotification,
  cancelAllReminders,
  collectReminderItems,
} from '../../lib/notification-service';

interface NotificationsViewProps {
  onNavigate: (view: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const {
    systemAlerts,
    dismissAlert,
    recurringTransactions,
    dpsAccounts,
    dpsInstallments,
    fixedDeposits,
    loans,
    loanSchedules,
  } = useLedger();

  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'dues' | 'budgets' | 'goals'>('all');
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [isScheduling, setIsScheduling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check notification permission on mount
  React.useEffect(() => {
    checkNotificationPermission().then(setPermissionStatus);
  }, []);

  const pendingReminders = React.useMemo(() => {
    return collectReminderItems({
      recurringTransactions,
      dpsAccounts,
      dpsInstallments,
      fixedDeposits,
      loans,
      loanSchedules,
    });
  }, [recurringTransactions, dpsAccounts, dpsInstallments, fixedDeposits, loans, loanSchedules]);

  const handleSyncReminders = async () => {
    setIsScheduling(true);
    setFeedback(null);
    try {
      const res = await syncAndScheduleReminders({
        recurringTransactions,
        dpsAccounts,
        dpsInstallments,
        fixedDeposits,
        loans,
        loanSchedules,
      });

      if (res.success) {
        setPermissionStatus('granted');
        setFeedback({
          type: 'success',
          message: `মোট ${res.scheduledCount}টি রিমাইন্ডার সফলভাবে ডিভাইসে শিডিউল করা হয়েছে (৭ দিন আগে ও সকাল ৯:০০ টায়)।`,
        });
      } else {
        setFeedback({ type: 'error', message: res.error || 'রিমাইন্ডার শিডিউল ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'ত্রুটি ঘটেছে।' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSendTest = async () => {
    setFeedback(null);
    const res = await sendTestNotification();
    if (res.success) {
      setPermissionStatus('granted');
      setFeedback({ type: 'success', message: 'টেস্ট নোটিফিকেশন আপনার ডিভাইসে পাঠানো হয়েছে!' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'টেস্ট নোটিফিকেশন পাঠানো যায়নি।' });
    }
  };

  const handleCancelAll = async () => {
    if (window.confirm('আপনি কি নিশ্চিত যে সকল শিডিউল করা নোটিফিকেশন বাতিল করতে চান?')) {
      await cancelAllReminders();
      setFeedback({ type: 'success', message: 'সকল শিডিউল করা রিমাইন্ডার বাতিল করা হয়েছে।' });
    }
  };

  const filteredAlerts = systemAlerts.filter((alert) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'critical') return alert.severity === 'critical';
    if (activeFilter === 'dues') return alert.category === 'dps_due' || alert.category === 'loan_emi' || alert.category === 'recurring_due' || alert.category === 'fd_maturity';
    if (activeFilter === 'budgets') return alert.category === 'budget_warning' || alert.category === 'budget_exceeded' || alert.category === 'low_balance';
    if (activeFilter === 'goals') return alert.category === 'goal_deadline';
    return true;
  });

  const criticalCount = systemAlerts.filter((a) => a.severity === 'critical').length;
  const duesCount = systemAlerts.filter((a) => a.category === 'dps_due' || a.category === 'loan_emi' || a.category === 'recurring_due').length;
  const budgetWarningsCount = systemAlerts.filter((a) => a.category === 'budget_warning' || a.category === 'budget_exceeded').length;

  const handleAction = (alert: SystemAlert) => {
    if (alert.targetView) {
      onNavigate(alert.targetView);
    }
  };

  const getSeverityBadge = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-negative/10 px-2 py-0.5 text-[11px] font-mono font-medium text-negative border border-negative/20">
            <AlertCircle className="h-3 w-3" /> Critical Due / Violation
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-[11px] font-mono font-medium text-warning border border-warning/20">
            <AlertTriangle className="h-3 w-3" /> Warning / Action Needed
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-mono font-medium text-accent-strong border border-accent/20">
            <CheckCircle2 className="h-3 w-3" /> Matured / Ready
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-sky-400 border border-sky-500/20">
            <Info className="h-3 w-3" /> Notice
          </span>
        );
    }
  };

  const getCategoryIcon = (category: SystemAlert['category']) => {
    switch (category) {
      case 'dps_due':
        return <Calendar className="h-5 w-5 text-accent-strong" />;
      case 'loan_emi':
        return <Landmark className="h-5 w-5 text-warning" />;
      case 'fd_maturity':
        return <PiggyBank className="h-5 w-5 text-sky-400" />;
      case 'budget_exceeded':
      case 'budget_warning':
        return <PieChart className="h-5 w-5 text-negative" />;
      case 'goal_deadline':
        return <TrendingUp className="h-5 w-5 text-indigo-400" />;
      default:
        return <Bell className="h-5 w-5 text-ink-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1">
            <Bell className="h-4 w-4" />
            <span>Financial Alerts & Reminders</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Notifications & Due Reminders
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Proactive monitoring for upcoming DPS installments, loan EMIs, budget limits, and cash flow thresholds.
          </p>
        </div>

        {systemAlerts.length > 0 && (
          <button
            onClick={() => {
              systemAlerts.forEach((a) => dismissAlert(a.id));
            }}
            className="self-start sm:self-auto px-3.5 py-2 rounded-lg border border-edge bg-surface hover:bg-raised text-xs font-mono text-ink-soft hover:text-ink flex items-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCheck className="h-4 w-4 text-accent-strong" />
            <span>Dismiss All Alerts</span>
          </button>
        )}
      </div>

      {/* UX-12: Status hero — permission state + total scheduled reminders at a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-edge bg-surface/60 p-5 flex items-center gap-4 shadow-lg">
          <div
            className={`p-3 rounded-xl border shrink-0 ${
              permissionStatus === 'granted'
                ? 'bg-accent/10 text-accent-strong border-accent/30'
                : 'bg-warning/10 text-warning border-warning/30'
            }`}
          >
            {permissionStatus === 'granted' ? <ShieldCheck className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted uppercase font-mono">নোটিফিকেশন পারমিশন (Permission)</p>
            <p
              className={`text-lg sm:text-xl font-bold mt-0.5 ${
                permissionStatus === 'granted' ? 'text-accent-strong' : 'text-warning'
              }`}
            >
              {permissionStatus === 'granted'
                ? 'সক্রিয় (Granted)'
                : permissionStatus === 'denied'
                ? 'ব্লকড (Denied)'
                : 'পারমিশন প্রয়োজন (Needed)'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-edge bg-surface/60 p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 rounded-xl bg-accent/10 text-accent-strong border border-accent/20 shrink-0">
            <Bell className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted uppercase font-mono">মোট শিডিউলড রিমাইন্ডার (Scheduled Reminders)</p>
            <p className="text-3xl font-bold text-ink font-mono mt-0.5">{pendingReminders.length}</p>
          </div>
        </div>
      </div>

      {/* FEAT-5: Device Reminder & Push Notification Scheduler Center */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/20 via-surface/90 to-canvas p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  ডিভাইস রিমাইন্ডার শিডিউলার (Device Push & Local Reminders)
                </h3>
                {permissionStatus === 'granted' ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent-strong border border-accent/30 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Permission Needed
                  </span>
                )}
              </div>
              <p
                className="text-[11px] sm:text-xs text-ink-muted mt-0.5 truncate max-w-md"
                title="Reminders are sent to this device 7 days before and at 9:00 AM on the due date — recurring bills, DPS installments, loan EMIs, and FD/Sanchayapatra maturities."
              >
                রিকারিং বিল, ডিপিএস কিস্তি, লোন ইএমআই ও এফডি/সঞ্চয়পত্র ম্যাচিউরিটির <strong>৭ দিন আগে</strong> এবং <strong>নির্ধারিত দিনে সকাল ৯:০০ টায়</strong> ডিভাইসে নোটিফিকেশন পাঠায়।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleSendTest}
              className="px-3 py-1.5 rounded-xl bg-raised hover:bg-raised-2 text-xs font-semibold text-ink-soft border border-edge-strong flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-sky-400" />
              <span>টেস্ট নোটিফিকেশন</span>
            </button>

            <button
              type="button"
              disabled={isScheduling}
              onClick={handleSyncReminders}
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-sky-950 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-sky-950/40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScheduling ? 'animate-spin' : ''}`} />
              <span>{isScheduling ? 'শিডিউল হচ্ছে...' : 'রিমাইন্ডার সিঙ্ক করুন'}</span>
            </button>

            <button
              type="button"
              onClick={handleCancelAll}
              className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-rose-950/40 text-ink-muted hover:text-negative border border-edge text-xs font-semibold transition-colors cursor-pointer"
              title="সকল শিডিউল বাতিল করুন"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border border-accent/40 text-accent-strong'
                : 'bg-rose-950/40 border border-negative/40 text-negative'
            }`}
          >
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-canvas/60 border border-edge/80">
            <span className="text-ink-muted text-[11px]">আসন্ন রিমাইন্ডার কিউ:</span>
            <div className="text-lg font-bold text-ink font-mono mt-0.5">
              {pendingReminders.length} টি
            </div>
          </div>
          <div className="p-3 rounded-xl bg-canvas/60 border border-edge/80">
            <span className="text-ink-muted text-[11px]">রিকারিং বিল:</span>
            <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
              {pendingReminders.filter((r) => r.category === 'recurring').length} টি
            </div>
          </div>
          <div className="p-3 rounded-xl bg-canvas/60 border border-edge/80">
            <span className="text-ink-muted text-[11px]">ডিপিএস ও লোন:</span>
            <div className="text-lg font-bold text-warning font-mono mt-0.5">
              {pendingReminders.filter((r) => r.category === 'dps' || r.category === 'loan').length} টি
            </div>
          </div>
          <div className="p-3 rounded-xl bg-canvas/60 border border-edge/80">
            <span className="text-ink-muted text-[11px]">এফডি/সঞ্চয়পত্র ম্যাচিউরিটি:</span>
            <div className="text-lg font-bold text-accent-strong font-mono mt-0.5">
              {pendingReminders.filter((r) => r.category === 'fd').length} টি
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-edge bg-surface/40 p-4">
          <div className="flex items-center justify-between text-ink-muted text-xs font-mono">
            <span>Total Active Alerts</span>
            <Bell className="h-4 w-4 text-ink-muted" />
          </div>
          <div className="text-2xl font-bold text-ink font-mono mt-2">
            {systemAlerts.length}
          </div>
          <div className="text-[11px] text-ink-faint mt-1">Live background evaluations</div>
        </div>

        <div className="rounded-xl border border-negative/20 bg-rose-950/10 p-4">
          <div className="flex items-center justify-between text-negative text-xs font-mono">
            <span>Critical / Overdue</span>
            <AlertCircle className="h-4 w-4 text-negative" />
          </div>
          <div className="text-2xl font-bold text-negative font-mono mt-2">
            {criticalCount}
          </div>
          <div className="text-[11px] text-negative/80 mt-1">Immediate action recommended</div>
        </div>

        <div className="rounded-xl border border-warning/20 bg-amber-950/10 p-4">
          <div className="flex items-center justify-between text-warning text-xs font-mono">
            <span>Upcoming Dues (7 Days)</span>
            <Calendar className="h-4 w-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-warning font-mono mt-2">
            {duesCount}
          </div>
          <div className="text-[11px] text-warning/80 mt-1">DPS, EMIs & Standing Orders</div>
        </div>

        <div className="rounded-xl border border-edge bg-surface/40 p-4">
          <div className="flex items-center justify-between text-ink-muted text-xs font-mono">
            <span>Budget Warnings</span>
            <PieChart className="h-4 w-4 text-ink-muted" />
          </div>
          <div className="text-2xl font-bold text-ink-soft font-mono mt-2">
            {budgetWarningsCount}
          </div>
          <div className="text-[11px] text-ink-faint mt-1">&gt;80% threshold or exceeded</div>
        </div>
      </div>

      {/* Filter Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge pb-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-ink-faint mr-2">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>
        {[
          { key: 'all', label: `All Alerts (${systemAlerts.length})` },
          { key: 'critical', label: `Critical (${criticalCount})` },
          { key: 'dues', label: `Payment Dues (${duesCount})` },
          { key: 'budgets', label: `Budgets & Cash (${budgetWarningsCount})` },
          { key: 'goals', label: 'Goal Deadlines' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeFilter === tab.key
                ? 'bg-accent/20 text-accent-strong font-medium border border-accent/30'
                : 'text-ink-muted hover:text-ink-soft hover:bg-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts Feed List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-xl border border-edge/80 bg-surface/30 p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-strong">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-ink">All Clear! No Pending Alerts</div>
            <p className="text-xs text-ink-muted max-w-md mx-auto">
              Your accounts are healthy, all upcoming installments are up to date, and no budget limits have been breached.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                alert.severity === 'critical'
                  ? 'border-negative/40 bg-rose-950/20'
                  : alert.severity === 'warning'
                  ? 'border-warning/40 bg-amber-950/20'
                  : alert.severity === 'success'
                  ? 'border-accent/40 bg-emerald-950/20'
                  : 'border-edge bg-surface/50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-canvas/60 border border-edge shrink-0 mt-0.5">
                  {getCategoryIcon(alert.category)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(alert.severity)}
                    {alert.dueDate && (
                      <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Due: {alert.dueDate}
                      </span>
                    )}
                    {alert.amount !== undefined && (
                      <span className="text-[11px] font-mono text-accent-strong font-semibold flex items-center gap-0.5">
                        ৳{alert.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-ink tracking-tight">
                    {alert.title}
                  </h3>
                  <p className="text-xs text-ink-soft leading-relaxed max-w-3xl">
                    {alert.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono text-ink-muted hover:text-ink-soft hover:bg-raised/80 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleAction(alert)}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>{alert.actionLabel || 'Take Action'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
