/**
 * STEP-11 verification: lakh-grouped amounts, fee cap removal, provider fixes.
 * Run: npx tsx scripts/test-sms-lakh-step11.ts
 */
import { parseSingleSms } from '../src/lib/sms-parser-engine';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

const lakh = parseSingleSms('Your A/C has been credited BDT 1,00,000.00 on 15/01/26. TrxID ABC12345.');
assert(lakh !== null && lakh.amount === 100000, `lakh grouping: BDT 1,00,000.00 -> ${lakh?.amount}`);

const bigLakh = parseSingleSms('Tk 12,50,000 debited from your account on 15/01/26. TrxID XYZ99999.');
assert(bigLakh !== null && bigLakh.amount === 1250000, `lakh grouping: Tk 12,50,000 -> ${bigLakh?.amount}`);

const western = parseSingleSms('BDT 5,000.50 debited from A/C ...1234 on 15/01/26.');
assert(western !== null && western.amount === 5000.5, `western grouping: BDT 5,000.50 -> ${western?.amount}`);

const millions = parseSingleSms('BDT 1,000,000 credited to your account. TrxID DEF55555.');
assert(millions !== null && millions.amount === 1000000, `western grouping: BDT 1,000,000 -> ${millions?.amount}`);

const feeTest = parseSingleSms('Cash Out Tk 2,00,000.00 successful. Fee Tk 36,600.00. Balance Tk 5,000.00. TrxID GHI77777.');
assert(feeTest !== null && feeTest.fee === 36600, `fee over 4 digits + lakh grouping -> ${feeTest?.fee}`);

const scbFalse = parseSingleSms('Payment of Tk 500 paid via Describe Card successful. TrxID JKL11111.');
assert(scbFalse !== null && scbFalse.sourceProvider !== 'Standard Chartered', `no scb substring false-match -> ${scbFalse?.sourceProvider}`);

const scbTrue = parseSingleSms('SCB Alert: BDT 4,500.00 debited from your card. TrxID MNO22222.');
assert(scbTrue !== null && scbTrue.sourceProvider === 'Standard Chartered', `scb word-boundary match -> ${scbTrue?.sourceProvider}`);

const ucb = parseSingleSms('UCB Bank: BDT 3,000 debited from A/C. TrxID PQR33333.');
assert(ucb !== null && ucb.sourceProvider === 'UCB', `ucb branch reachable -> ${ucb?.sourceProvider}`);

const suspect = parseSingleSms('Received Tk 9,99,999 in your wallet. Balance Tk 50.00. TrxID STU44444.');
assert(suspect !== null && suspect.confidence === 'medium', `income far above balance downgrades confidence -> ${suspect?.confidence}`);

console.log('\n🎉 ALL STEP-11 SMS PARSER TESTS PASSED!');
