/**
 * Timezone-safe date helpers (STEP-9).
 *
 * `new Date().toISOString().split('T')[0]` returns the UTC date, which in
 * Bangladesh (UTC+6) is the *previous* day between midnight and 6am local
 * time. All "today" / date-string derivations go through these helpers,
 * pinned to Asia/Dhaka. Historical timestamps (createdAt ISO strings) are
 * unaffected.
 */
const DHAKA_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Format any Date as YYYY-MM-DD in Asia/Dhaka local time. */
export function toLocalISO(date: Date): string {
  return DHAKA_DATE_FORMAT.format(date);
}

/** Today's date (YYYY-MM-DD) in Asia/Dhaka local time. */
export function todayLocalISO(): string {
  return toLocalISO(new Date());
}

/**
 * Add `months` calendar months to an ISO date, clamping the day-of-month
 * (STEP-10): 2026-01-31 + 1 month = 2026-02-28, never a March overflow.
 * Always computes from the original anchor, so schedules do not drift.
 */
export function addMonthsClamped(anchorISO: string, months: number, dayOfMonth?: number): string {
  const [y, m, dRaw] = anchorISO.split('-').map(Number);
  const d = dayOfMonth ?? dRaw;
  const targetMonthIndex = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(d, daysInTarget);
  const mm = String(targetMonth + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

/** Add whole days to an ISO date (YYYY-MM-DD), calendar-safe via UTC math. */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}
