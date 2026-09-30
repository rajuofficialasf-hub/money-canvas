/**
/**
 * Money Canvas — Device Reminder & Local Notification Service (FEAT-5)
 *
 * Implements automated scheduling for:
 * 1. Recurring bills & subscriptions due dates
 * 2. DPS monthly installment dues
 * 3. Fixed Deposit (FD) and Sanchayapatra bond maturity dates
 * 4. Loan EMI repayment due dates
 *
 * Timing:
 * - 7 days before the due date (Advance Warning)
 * - On the due date at 09:00 AM local time (Day-of Reminder)
 *
 * Platform:
 * - Android & iOS native via @capacitor/local-notifications
 * - Desktop & Mobile Web fallback via browser Notification API
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Channel } from '@capacitor/local-notifications';
import {
  RecurringTransaction,
  DpsAccount,
  DpsInstallment,
  FixedDeposit,
  Loan,
  LoanPaymentScheduleItem,
} from '../types/accounting';

export interface ReminderItem {
  id: string; // alphanumeric identifier e.g. "rec-123-7d"
  numericId: number; // 32-bit positive integer for Capacitor LocalNotifications
  title: string;
  body: string;
  scheduledAt: Date;
  category: 'recurring' | 'dps' | 'fd' | 'loan';
  daysInAdvance: 7 | 0;
  referenceId: string;
}

export interface NotificationStatus {
  isSupported: boolean;
  isNative: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
  scheduledCount: number;
  lastSyncedAt?: string;
}

const NOTIFICATION_CHANNEL_ID = 'money_canvas_reminders';
const NOTIFICATION_SYNC_KEY = 'mc_notification_last_sync';
const NOTIFICATION_ENABLED_KEY = 'mc_notifications_enabled';

/**
 * Deterministic 32-bit positive integer hash for notification IDs
 */
export function hashStringToNotificationId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2147483647; // Ensure positive within 32-bit integer range
}

/**
 * Creates the high-importance notification channel on Android
 */
export async function setupNotificationChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const channel: Channel = {
      id: NOTIFICATION_CHANNEL_ID,
      name: 'বিল ও ম্যাচিউরিটি রিমাইন্ডার (Bill & Maturity)',
      description: 'আসন্ন রিকারিং বিল, ডিপিএস কিস্তি, লোন ইএমআই ও এফডিআর ম্যাচিউরিটি নোটিফিকেশন',
      importance: 4, // IMPORTANCE_HIGH
      visibility: 1, // VISIBILITY_PUBLIC
      sound: 'beep.wav',
      vibration: true,
      lights: true,
      lightColor: '#10b981',
    };

    await LocalNotifications.createChannel(channel);
  } catch (err) {
    console.warn('Failed to create notification channel:', err);
  }
}

/**
 * Check current notification permission status
 */
export async function checkNotificationPermission(): Promise<NotificationStatus['permission']> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unknown';
    }
  }

  // Web Browser environment
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  return 'denied';
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await setupNotificationChannel();
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch (err) {
      console.warn('Error requesting native notification permission:', err);
      return false;
    }
  }

  // Web Browser environment
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch (err) {
      console.warn('Error requesting web notification permission:', err);
      return false;
    }
  }

  return false;
}

/**
 * Generates the reminder timestamp for a target ISO date string (YYYY-MM-DD)
 * @param dateStr ISO date 'YYYY-MM-DD'
 * @param daysInAdvance 7 for 7 days before, 0 for on the day
 * @param targetHour default 9 AM
 */
export function buildReminderDate(dateStr: string, daysInAdvance: 7 | 0, targetHour = 9): Date | null {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month, day, targetHour, 0, 0, 0);
    if (isNaN(d.getTime())) return null;

    if (daysInAdvance > 0) {
      d.setDate(d.getDate() - daysInAdvance);
    }

    return d;
  } catch {
    return null;
  }
}

/**
 * Collects all eligible reminder items from active ledger state
 */
export function collectReminderItems(options: {
  recurringTransactions: RecurringTransaction[];
  dpsAccounts: DpsAccount[];
  dpsInstallments: DpsInstallment[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
  loanSchedules: LoanPaymentScheduleItem[];
  now?: Date;
}): ReminderItem[] {
  const now = options.now || new Date();
  const reminders: ReminderItem[] = [];

  // 1. Recurring Transactions (Bills / Subscriptions)
  for (const rec of options.recurringTransactions) {
    if (rec.isPaused || !rec.nextRun) continue;

    const amount = Math.abs(rec.templateTransaction?.lines?.[0]?.amount || 0);
    const amtFmt = amount > 0 ? ` (৳${amount.toLocaleString()})` : '';

    // 7 days before
    const date7d = buildReminderDate(rec.nextRun, 7);
    if (date7d && date7d.getTime() > now.getTime()) {
      reminders.push({
        id: `rec-${rec.id}-7d`,
        numericId: hashStringToNotificationId(`rec-${rec.id}-7d`),
        title: 'আসন্ন রিকারিং বিল রিমাইন্ডার 🔔',
        body: `"${rec.name}"${amtFmt} আগামী ৭ দিন পর (${rec.nextRun}) পরিশোধযোগ্য।`,
        scheduledAt: date7d,
        category: 'recurring',
        daysInAdvance: 7,
        referenceId: rec.id,
      });
    }

    // On the day
    const date0d = buildReminderDate(rec.nextRun, 0);
    if (date0d && date0d.getTime() > now.getTime()) {
      reminders.push({
        id: `rec-${rec.id}-0d`,
        numericId: hashStringToNotificationId(`rec-${rec.id}-0d`),
        title: 'আজকে রিকারিং বিলের দিন ⏰',
        body: `"${rec.name}"${amtFmt} আজকে পরিশোধ করার কথা। লেজারে চেক করুন।`,
        scheduledAt: date0d,
        category: 'recurring',
        daysInAdvance: 0,
        referenceId: rec.id,
      });
    }
  }

  // 2. DPS Installments
  for (const dps of options.dpsAccounts) {
    if (dps.status !== 'active') continue;

    // Find the earliest upcoming unpaid installment
    const upcoming = options.dpsInstallments
      .filter((i) => i.dpsAccountId === dps.id && i.status === 'pending')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    const targetDate = upcoming?.dueDate || dps.startDate;
    const instAmt = dps.monthlyInstallment || upcoming?.expectedAmount || 0;
    const instFmt = instAmt > 0 ? ` (৳${instAmt.toLocaleString()})` : '';

    // 7 days before
    const date7d = buildReminderDate(targetDate, 7);
    if (date7d && date7d.getTime() > now.getTime()) {
      reminders.push({
        id: `dps-${dps.id}-${targetDate}-7d`,
        numericId: hashStringToNotificationId(`dps-${dps.id}-${targetDate}-7d`),
        title: 'আসন্ন ডিপিএস কিস্তি 🏦',
        body: `${dps.institutionName} ডিপিএস কিস্তি${instFmt} আগামী ৭ দিন পর (${targetDate}) জমা দিতে হবে।`,
        scheduledAt: date7d,
        category: 'dps',
        daysInAdvance: 7,
        referenceId: dps.id,
      });
    }

    // On the day
    const date0d = buildReminderDate(targetDate, 0);
    if (date0d && date0d.getTime() > now.getTime()) {
      reminders.push({
        id: `dps-${dps.id}-${targetDate}-0d`,
        numericId: hashStringToNotificationId(`dps-${dps.id}-${targetDate}-0d`),
        title: 'আজকে ডিপিএস কিস্তি জমার দিন ⏰',
        body: `${dps.institutionName} ডিপিএস কিস্তি${instFmt} আজকে জমা দিন।`,
        scheduledAt: date0d,
        category: 'dps',
        daysInAdvance: 0,
        referenceId: dps.id,
      });
    }
  }

  // 3. Fixed Deposit & Sanchayapatra Bonds Maturity
  for (const fd of options.fixedDeposits) {
    if (fd.status !== 'active' || !fd.maturityDate) continue;

    const principalFmt = fd.principalAmount > 0 ? ` (৳${fd.principalAmount.toLocaleString()})` : '';
    const matureFmt = fd.expectedMaturityAmount > 0 ? ` (সম্ভাব্য প্রাপ্তি: ৳${fd.expectedMaturityAmount.toLocaleString()})` : '';

    // 7 days before
    const date7d = buildReminderDate(fd.maturityDate, 7);
    if (date7d && date7d.getTime() > now.getTime()) {
      reminders.push({
        id: `fd-${fd.id}-7d`,
        numericId: hashStringToNotificationId(`fd-${fd.id}-7d`),
        title: 'আসন্ন এফডি/সঞ্চয়পত্র মেয়াদপূর্তি 💎',
        body: `${fd.institutionName} ফিক্সড ডিপোজিট${principalFmt} আগামী ৭ দিন পর (${fd.maturityDate}) ম্যাচিউর হবে।`,
        scheduledAt: date7d,
        category: 'fd',
        daysInAdvance: 7,
        referenceId: fd.id,
      });
    }

    // On the day
    const date0d = buildReminderDate(fd.maturityDate, 0);
    if (date0d && date0d.getTime() > now.getTime()) {
      reminders.push({
        id: `fd-${fd.id}-0d`,
        numericId: hashStringToNotificationId(`fd-${fd.id}-0d`),
        title: 'আজকে এফডি/সঞ্চয়পত্র ম্যাচিউরিটির দিন 🎉',
        body: `${fd.institutionName} ফিক্সড ডিপোজিট${matureFmt} আজকে ম্যাচিউর হয়েছে। ব্যাংক বা ফান্ড সমন্বয় করুন।`,
        scheduledAt: date0d,
        category: 'fd',
        daysInAdvance: 0,
        referenceId: fd.id,
      });
    }
  }

  // 4. Loan EMI Repayments
  for (const loan of options.loans) {
    if (loan.status !== 'active') continue;

    // Find next unpaid EMI installment
    const upcomingEmi = options.loanSchedules
      .filter((s) => s.loanId === loan.id && s.status === 'pending')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    if (!upcomingEmi) continue;

    const emiAmt = upcomingEmi.scheduledEmiAmount || loan.emiAmount || 0;
    const emiFmt = emiAmt > 0 ? ` (৳${emiAmt.toLocaleString()})` : '';

    // 7 days before
    const date7d = buildReminderDate(upcomingEmi.dueDate, 7);
    if (date7d && date7d.getTime() > now.getTime()) {
      reminders.push({
        id: `loan-${loan.id}-${upcomingEmi.id}-7d`,
        numericId: hashStringToNotificationId(`loan-${loan.id}-${upcomingEmi.id}-7d`),
        title: 'আসন্ন লোন ইএমআই কিস্তি ⚠️',
        body: `${loan.institutionName} লোন কিস্তি${emiFmt} আগামী ৭ দিন পর (${upcomingEmi.dueDate}) পরিশোধযোগ্য।`,
        scheduledAt: date7d,
        category: 'loan',
        daysInAdvance: 7,
        referenceId: loan.id,
      });
    }

    // On the day
    const date0d = buildReminderDate(upcomingEmi.dueDate, 0);
    if (date0d && date0d.getTime() > now.getTime()) {
      reminders.push({
        id: `loan-${loan.id}-${upcomingEmi.id}-0d`,
        numericId: hashStringToNotificationId(`loan-${loan.id}-${upcomingEmi.id}-0d`),
        title: 'আজকে লোন ইএমআই পরিশোধের দিন 🏦',
        body: `${loan.institutionName} লোন কিস্তি${emiFmt} আজকে পরিশোধ নিশ্চিত করুন।`,
        scheduledAt: date0d,
        category: 'loan',
        daysInAdvance: 0,
        referenceId: loan.id,
      });
    }
  }

  return reminders;
}

/**
 * Schedule all collected reminder items into the device local notification engine
 */
export async function syncAndScheduleReminders(options: {
  recurringTransactions: RecurringTransaction[];
  dpsAccounts: DpsAccount[];
  dpsInstallments: DpsInstallment[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
  loanSchedules: LoanPaymentScheduleItem[];
}): Promise<{ success: boolean; scheduledCount: number; error?: string }> {
  try {
    const isGranted = await requestNotificationPermission();
    if (!isGranted) {
      return {
        success: false,
        scheduledCount: 0,
        error: 'নোটিফিকেশন পারমিশন দেওয়া হয়নি (Permission not granted)।',
      };
    }

    const items = collectReminderItems(options);

    if (Capacitor.isNativePlatform()) {
      // 1. Cancel previous pending notifications
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      } catch (err) {
        console.warn('Error clearing pending notifications:', err);
      }

      // 2. Schedule up to 64 items (Android system limitation safe bound)
      const toSchedule = items.slice(0, 64).map((item) => ({
        id: item.numericId,
        title: item.title,
        body: item.body,
        schedule: { at: item.scheduledAt },
        channelId: NOTIFICATION_CHANNEL_ID,
        sound: 'beep.wav',
        extra: {
          referenceId: item.referenceId,
          category: item.category,
        },
      }));

      if (toSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: toSchedule });
      }
    }

    // Save sync metrics to localStorage
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(NOTIFICATION_SYNC_KEY, nowIso);
      localStorage.setItem('mc_reminders_count', String(items.length));
      localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
    } catch {}

    return {
      success: true,
      scheduledCount: items.length,
    };
  } catch (err: any) {
    console.error('Failed to schedule reminders:', err);
    return {
      success: false,
      scheduledCount: 0,
      error: err?.message || 'রিমাইন্ডার শিডিউল ব্যর্থ হয়েছে।',
    };
  }
}

/**
 * Cancel all scheduled reminders
 */
export async function cancelAllReminders(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (err) {
      console.warn('Cancel reminders error:', err);
    }
  }

  try {
    localStorage.removeItem(NOTIFICATION_SYNC_KEY);
    localStorage.setItem('mc_reminders_count', '0');
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'false');
  } catch {}
}

/**
 * Send an immediate test notification to verify device sound/vibration/display
 */
export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const isGranted = await requestNotificationPermission();
    if (!isGranted) {
      return { success: false, error: 'নোটিফিকেশন পারমিশন দেওয়া হয়নি।' };
    }

    const title = 'Money Canvas রিমাইন্ডার টেস্ট 🎉';
    const body = 'আপনার ডিভাইসের নোটিফিকেশন সিস্টেম চমৎকারভাবে কাজ করছে! আসন্ন বিল ও ম্যাচিউরিটিতে সময়মতো সতর্কবার্তা পাবেন।';

    if (Capacitor.isNativePlatform()) {
      await setupNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: hashStringToNotificationId('test-notification-' + Date.now()),
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second later
            channelId: NOTIFICATION_CHANNEL_ID,
            sound: 'beep.wav',
          },
        ],
      });
      return { success: true };
    }

    // Web Browser environment
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'টেস্ট নোটিফিকেশন পাঠানো সম্ভব হয়নি।' };
  }
}
