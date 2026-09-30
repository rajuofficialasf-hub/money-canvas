import { describe, it, expect } from 'vitest';
import { parseSingleSms } from '../sms-parser-engine';

describe('extractAmount grouping formats (STEP-11)', () => {
  it('parses lakh-grouped BDT 1,00,000.00', () => {
    const p = parseSingleSms('Your A/C has been credited BDT 1,00,000.00 on 15/01/26. TrxID ABC12345.');
    expect(p?.amount).toBe(100000);
  });

  it('parses lakh-grouped Tk 12,50,000', () => {
    const p = parseSingleSms('Tk 12,50,000 debited from your account on 15/01/26. TrxID XYZ99999.');
    expect(p?.amount).toBe(1250000);
  });

  it('parses western-grouped BDT 5,000.50', () => {
    const p = parseSingleSms('BDT 5,000.50 debited from A/C ...1234 on 15/01/26.');
    expect(p?.amount).toBe(5000.5);
  });

  it('parses western-grouped BDT 1,000,000', () => {
    const p = parseSingleSms('BDT 1,000,000 credited to your account. TrxID DEF55555.');
    expect(p?.amount).toBe(1000000);
  });

  it('parses fees above 4 digits with lakh grouping', () => {
    const p = parseSingleSms(
      'Cash Out Tk 2,00,000.00 successful. Fee Tk 36,600.00. Balance Tk 5,000.00. TrxID GHI77777.'
    );
    expect(p?.fee).toBe(36600);
  });
});

describe('provider detection', () => {
  it('detects bKash', () => {
    const p = parseSingleSms('bKash: Cash In Tk 500.00 from 01712345678. TrxID AAA11111. Balance Tk 700.');
    expect(p?.sourceProvider).toBe('bKash');
  });

  it('detects Nagad', () => {
    const p = parseSingleSms('Nagad: Payment Tk 1,200.00 to Daraz successful. TxnID BBB22222.');
    expect(p?.sourceProvider).toBe('Nagad');
  });

  it('does not false-match "scb" as a substring', () => {
    const p = parseSingleSms('Payment of Tk 500 paid via Describe Card successful. TrxID JKL11111.');
    expect(p?.sourceProvider).not.toBe('Standard Chartered');
  });

  it('matches SCB on a word boundary', () => {
    const p = parseSingleSms('SCB Alert: BDT 4,500.00 debited from your card. TrxID MNO22222.');
    expect(p?.sourceProvider).toBe('Standard Chartered');
  });

  it('reaches the UCB branch (no duplicate upay short-circuit)', () => {
    const p = parseSingleSms('UCB Bank: BDT 3,000 debited from A/C. TrxID PQR33333.');
    expect(p?.sourceProvider).toBe('UCB');
  });
});

describe('balance sanity check', () => {
  it('downgrades confidence when a credited amount dwarfs the resulting balance', () => {
    const p = parseSingleSms('Received Tk 9,99,999 in your wallet. Balance Tk 50.00. TrxID STU44444.');
    expect(p?.confidence).toBe('medium');
  });
});
