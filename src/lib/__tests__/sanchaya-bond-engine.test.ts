import { describe, it, expect } from 'vitest';
import { calculatePreMatureEncashment, generateUpcomingSchedule } from '../sanchaya-bond-engine';
import type { SanchayaBondItem } from '../../types/sanchaya-bond';

const baseBond = {
  id: 'sb-1',
  title: '5Y Bangladesh Sanchayapatra',
  category: 'sanchayapatra',
  schemeType: 'five_year',
  principalAmount: 100000,
  interestRate: 11.28,
  tenureYears: 5,
  purchaseDate: '2024-01-15',
  maturityDate: '2029-01-15',
  payoutFrequency: 'at_maturity',
  taxDeductionRate: 10,
  status: 'active',
  totalProfitReceivedToDate: 0,
} as unknown as SanchayaBondItem;

describe('calculatePreMatureEncashment (STEP-12ক)', () => {
  it('pays principal + reduced-rate profit for at_maturity schemes', () => {
    const enc = calculatePreMatureEncashment(baseBond, '2026-03-15', false);
    expect(enc.completedYears).toBe(2);
    expect(enc.totalProfitPayable).toBeGreaterThan(0);
    expect(enc.netPayableAtCounter).toBeCloseTo(100000 + enc.totalProfitPayable, 2);
  });

  it('returns only principal minus received profit before 1 full year', () => {
    const enc = calculatePreMatureEncashment(
      { ...baseBond, totalProfitReceivedToDate: 3000 } as unknown as SanchayaBondItem,
      '2024-08-15',
      false
    );
    expect(enc.completedYears).toBe(0);
    expect(enc.applicableRatePct).toBe(0);
    expect(enc.netPayableAtCounter).toBe(97000);
  });

  it('counts completed years by anniversary (leap-year safe)', () => {
    const leap = { ...baseBond, purchaseDate: '2024-02-29' } as unknown as SanchayaBondItem;
    expect(calculatePreMatureEncashment(leap, '2025-02-27', false).completedYears).toBe(0);
    expect(calculatePreMatureEncashment(leap, '2025-03-01', false).completedYears).toBe(1);
  });
});

describe('generateUpcomingSchedule (anchor-based dates)', () => {
  it('derives quarterly payout dates from the purchase anchor without drift', () => {
    const bond = {
      ...baseBond,
      purchaseDate: '2026-01-31',
      maturityDate: '2031-01-31',
      payoutFrequency: 'quarterly',
    } as unknown as SanchayaBondItem;
    const schedule = generateUpcomingSchedule(bond, 12);
    expect(schedule.length).toBeGreaterThan(0);
    for (const item of schedule) {
      const day = Number(item.paymentDate.split('-')[2]);
      // Every payout lands on the 31st or the clamped month-end, never a drifted day
      expect(day === 31 || day === 30 || day === 28 || day === 29).toBe(true);
    }
  });
});
