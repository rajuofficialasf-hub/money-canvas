import { describe, it, expect } from 'vitest';
import { addMonthsClamped, addDaysISO, toLocalISO } from '../date-utils';

describe('addMonthsClamped', () => {
  it('clamps month-end anchors', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsClamped('2026-01-31', 3)).toBe('2026-04-30');
  });

  it('handles leap years', () => {
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('rolls over years', () => {
    expect(addMonthsClamped('2026-11-15', 14)).toBe('2028-01-15');
  });

  it('restores the anchor day when given explicitly', () => {
    expect(addMonthsClamped('2026-02-28', 1, 31)).toBe('2026-03-31');
  });
});

describe('addDaysISO', () => {
  it('rolls over months and years', () => {
    expect(addDaysISO('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('toLocalISO', () => {
  it('formats UTC-midnight dates as the same calendar date in Dhaka (UTC+6)', () => {
    expect(toLocalISO(new Date('2026-05-10T00:00:00Z'))).toBe('2026-05-10');
  });

  it('maps late-evening UTC to the next Dhaka day', () => {
    expect(toLocalISO(new Date('2026-05-10T20:00:00Z'))).toBe('2026-05-11');
  });
});
