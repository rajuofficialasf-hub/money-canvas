import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { calculateZakat } from '../../lib/accounting-engine';
import {
  Coins,
  ShieldCheck,
  Scale,
  DollarSign,
  TrendingUp,
  Camera,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Plus,
  Info,
  Clock,
  Sliders,
  Wallet,
} from 'lucide-react';

export const ZakatView: React.FC = () => {
  const {
    accounts,
    accountBalances,
    netWorthSnapshots,
    zakatSettings,
    physicalAssets,
    debts,
    saveNetWorthSnapshot,
    updateZakatSettings,
    disburseZakat,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<'zakat' | 'net_worth'>('zakat');
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Disburse Form State
  const [disburseAmount, setDisburseAmount] = useState<number | ''>('');
  const [disburseAccountId, setDisburseAccountId] = useState('');
  const [disburseNote, setDisburseNote] = useState('Annual Zakat distribution to eligible recipients');
  const [disburseError, setDisburseError] = useState('');

  // Settings Form State
  const [goldRate, setGoldRate] = useState<number>(zakatSettings.goldPricePerGram);
  const [silverRate, setSilverRate] = useState<number>(zakatSettings.silverPricePerGram);
  const [nisabBasis, setNisabBasis] = useState<'gold' | 'silver'>(zakatSettings.nisabBasis);

  // Snapshot note
  const [snapshotNote, setSnapshotNote] = useState('');

  // Eligible accounts for disbursement
  const liquidAccounts = accounts.filter(
    (a) => !a.isArchived && (a.accountType === 'bank' || a.accountType === 'cash' || a.accountType === 'mobile_wallet')
  );

  // -----------------------------------------------------------
  // Authoritative Balance Sheet Calculation (Lock 1)
  // -----------------------------------------------------------
  let totalAssets = 0;
  let totalLiabilities = 0;

  accountBalances.forEach((b) => {
    if (b.currentBalance > 0) {
      totalAssets += b.currentBalance;
    } else if (b.currentBalance < 0) {
      totalLiabilities += Math.abs(b.currentBalance);
    }
  });

  const netWorth = totalAssets - totalLiabilities;

  // -----------------------------------------------------------
  // Islamic Zakat Engine Breakdown (Islamic Accounting Standard)
  // -----------------------------------------------------------
  // 1. Zakatable liquid cash & bank
  const cashAndBankZakatable = accountBalances
    .filter((b) => {
      const a = accounts.find((acc) => acc.id === b.accountId);
      return a && (a.accountType === 'cash' || a.accountType === 'bank' || a.accountType === 'mobile_wallet');
    })
    .reduce((sum, b) => sum + Math.max(0, b.currentBalance), 0);

  // 2. Fixed Deposits & DPS (Zakatable)
  const investmentsZakatable = accountBalances
    .filter((b) => {
      const a = accounts.find((acc) => acc.id === b.accountId);
      return a && (a.accountType === 'fd' || a.accountType === 'dps');
    })
    .reduce((sum, b) => sum + Math.max(0, b.currentBalance), 0);

  // 3. Gold & precious bullion (Zakatable)
  const goldBullionZakatable = accountBalances
    .filter((b) => {
      const a = accounts.find((acc) => acc.id === b.accountId);
      return a && a.accountType === 'asset' && a.isZakatable;
    })
    .reduce((sum, b) => sum + Math.max(0, b.currentBalance), 0);

  // 4. Peer Receivables (Lent money recoverable)
  const receivablesZakatable = debts
    .filter((d) => d.direction === 'lent' && d.status === 'active')
    .reduce((sum, d) => {
      const bal = accountBalances.find((b) => b.accountId === d.linkedAccountId);
      return sum + (bal ? Math.max(0, bal.currentBalance) : 0);
    }, 0);

  const totalZakatableAssets =
    cashAndBankZakatable + investmentsZakatable + goldBullionZakatable + receivablesZakatable;

  // Deductible immediate liabilities (Credit Card + Immediate payables)
  const deductibleLiabilities = totalLiabilities;

  const zakatCalc = calculateZakat({
    nisabBasis: zakatSettings.nisabBasis,
    goldPricePerGram: zakatSettings.goldPricePerGram,
    silverPricePerGram: zakatSettings.silverPricePerGram,
    zakatableCashAndBank: cashAndBankZakatable,
    zakatableGoldSilver: goldBullionZakatable,
    zakatableTermDeposits: investmentsZakatable,
    zakatableReceivables: receivablesZakatable,
    zakatableStocks: 0,
    deductibleLiabilities,
  });

  const handleDisburseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDisburseError('');

    const amt = typeof disburseAmount === 'number' ? disburseAmount : parseFloat(disburseAmount);
    if (isNaN(amt) || amt <= 0) {
      setDisburseError('Please enter a valid disbursement amount.');
      return;
    }
    if (!disburseAccountId) {
      setDisburseError('Please select a funding account.');
      return;
    }

    const res = disburseZakat(amt, disburseAccountId, disburseNote);
    if (res.success) {
      setIsDisburseModalOpen(false);
      setDisburseAmount('');
    } else {
      setDisburseError(res.error || 'Failed to record zakat disbursement.');
    }
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateZakatSettings({
      goldPricePerGram: goldRate,
      silverPricePerGram: silverRate,
      nisabBasis,
    });
    setIsSettingsModalOpen(false);
  };

  const handleCaptureSnapshot = () => {
    saveNetWorthSnapshot(snapshotNote.trim() || undefined);
    setSnapshotNote('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Scale className="h-4 w-4" />
            <span>Islamic Wealth & Zakat</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Net Worth & Zakat Engine
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Balance sheet consolidation and Shariah-compliant Zakat calculation with Gold and Silver Nisab thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <span>Nisab Rates</span>
          </button>

          <button
            onClick={() => {
              setDisburseAmount(zakatCalc.zakatDue > 0 ? zakatCalc.zakatDue : '');
              if (liquidAccounts.length > 0) setDisburseAccountId(liquidAccounts[0].id);
              setDisburseError('');
              setIsDisburseModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            <DollarSign className="h-4 w-4" />
            <span>Disburse Zakat</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Authoritative Net Worth</span>
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ৳{netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Lock 1: Assets minus Liabilities
          </div>
        </div>

        {/* Zakatable Net Pool */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Net Zakatable Pool</span>
            <div className="h-6 w-6 rounded bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Coins className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-sky-400 font-mono">
            ৳{zakatCalc.netZakatablePool.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Zakatable Assets - Deductions
          </div>
        </div>

        {/* Active Nisab Threshold */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Nisab ({zakatSettings.nisabBasis.toUpperCase()})</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${zakatCalc.isNisabMet ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
              {zakatCalc.isNisabMet ? 'Met' : 'Below'}
            </span>
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            ৳{zakatCalc.effectiveNisabThreshold.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {zakatSettings.nisabBasis === 'silver' ? '52.5 tolas / 612.36g' : '7.5 tolas / 87.48g'}
          </div>
        </div>

        {/* Total Zakat Due (2.5%) */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Annual Zakat Due (2.5%)</span>
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            ৳{zakatCalc.zakatDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {zakatCalc.isNisabMet ? 'Obligatory Hawl fulfilled' : 'Wealth below Nisab'}
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('zakat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'zakat'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Islamic Zakat Assessment
          </button>
          <button
            onClick={() => setActiveTab('net_worth')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'net_worth'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Balance Sheet Snapshots ({netWorthSnapshots.length})
          </button>
        </div>
      </div>

      {activeTab === 'zakat' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Asset Breakdown */}
          <div className="lg:col-span-7 space-y-4">
            <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Zakatable Balance Sheet Breakdown
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/80 overflow-hidden font-mono text-xs">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">1. Liquid Cash & Bank Deposits</div>
                  <div className="text-[10px] text-slate-500">Savings accounts, cash on hand, bKash</div>
                </div>
                <div className="text-right text-emerald-400 font-bold">
                  +৳{cashAndBankZakatable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">2. Investment Schemes (FD & DPS)</div>
                  <div className="text-[10px] text-slate-500">Fixed deposits and accrued DPS capital</div>
                </div>
                <div className="text-right text-emerald-400 font-bold">
                  +৳{investmentsZakatable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">3. Gold Bullion & Liquid Jewelry</div>
                  <div className="text-[10px] text-slate-500">22K hallmarked ornaments and gold bullion</div>
                </div>
                <div className="text-right text-emerald-400 font-bold">
                  +৳{goldBullionZakatable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">4. Recoverable Peer Receivables</div>
                  <div className="text-[10px] text-slate-500">Money lent to others expected to be recovered</div>
                </div>
                <div className="text-right text-emerald-400 font-bold">
                  +৳{receivablesZakatable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-slate-950/50">
                <div className="text-white font-bold uppercase text-[11px]">
                  Gross Zakatable Assets
                </div>
                <div className="text-right text-white font-bold text-sm">
                  ৳{totalZakatableAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between text-rose-400">
                <div>
                  <div className="font-semibold">Deductible Liabilities</div>
                  <div className="text-[10px] text-slate-500">Short-term borrowings, bank loan principal, credit cards</div>
                </div>
                <div className="text-right font-bold">
                  -৳{deductibleLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-emerald-950/20 border-t border-emerald-500/30">
                <div>
                  <div className="text-white font-bold uppercase text-[11px]">
                    Net Zakatable Wealth
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    Nisab Threshold: ৳{zakatCalc.effectiveNisabThreshold.toLocaleString()} ({zakatSettings.nisabBasis})
                  </div>
                </div>
                <div className="text-right text-emerald-400 font-bold text-base">
                  ৳{zakatCalc.netZakatablePool.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Nisab Benchmarking & Hawl Rules */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Nisab Standards & Hawl Criteria
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 text-xs font-sans">
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-400">Silver Nisab Standard:</span>
                  <span className="text-white font-semibold">
                    ৳{(612.36 * zakatSettings.silverPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-400">Gold Nisab Standard:</span>
                  <span className="text-white font-semibold">
                    ৳{(87.48 * zakatSettings.goldPricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Nisab Basis Guidance</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Classical scholars (Hanafi, Maliki, Hanbali) advise using the <strong className="text-white">Silver Nisab</strong> for currency, bank balances, and mixed portfolios because it establishes an equitable threshold that benefits more recipients in society.
                </p>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Exempt Personal Assets</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Your primary residence, daily use vehicles (e.g. Toyota Premio), and essential home furnishings are completely exempt from Zakat.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setDisburseAmount(zakatCalc.zakatDue > 0 ? zakatCalc.zakatDue : '');
                    if (liquidAccounts.length > 0) setDisburseAccountId(liquidAccounts[0].id);
                    setIsDisburseModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-colors"
                >
                  Pay Zakat Obligation (৳{zakatCalc.zakatDue.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Net Worth Snapshots History */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-xs text-slate-300">
              Capture an immutable balance sheet snapshot to track your wealth trajectory over time.
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Optional snapshot note..."
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={handleCaptureSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shrink-0"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Capture Snapshot</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Total Assets</th>
                  <th className="py-2.5 px-4">Total Liabilities</th>
                  <th className="py-2.5 px-4">Consolidated Net Worth</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                {netWorthSnapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {snap.snapshotDate}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      ৳{snap.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-rose-400 font-semibold">
                      ৳{snap.totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-white font-bold text-sm">
                      ৳{snap.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans italic text-[11px]">
                      {snap.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Disburse Zakat */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <span>Disburse Zakat Payment</span>
              </div>
              <button
                onClick={() => setIsDisburseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {disburseError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{disburseError}</span>
              </div>
            )}

            <form onSubmit={handleDisburseSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Disbursement Amount (৳ BDT) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Funding Account (Bank / Cash) *
                </label>
                <select
                  value={disburseAccountId}
                  onChange={(e) => setDisburseAccountId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {liquidAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Memo / Note
                </label>
                <input
                  type="text"
                  value={disburseNote}
                  onChange={(e) => setDisburseNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Posting will debit Bank/Cash and credit the canonical 'Zakat & Charitable Donations' category. Full audit log recorded.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  Confirm & Disburse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Nisab Settings */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <Sliders className="h-5 w-5 text-emerald-400" />
                <span>Nisab Market Valuation Settings</span>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nisab Benchmark Standard
                </label>
                <select
                  value={nisabBasis}
                  onChange={(e) => setNisabBasis(e.target.value as 'gold' | 'silver')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="silver">Silver Standard (612.36g) — Recommended for Currency</option>
                  <option value="gold">Gold Standard (87.48g)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Silver Price per Gram (৳ BDT)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={silverRate}
                  onChange={(e) => setSilverRate(parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Computed Nisab: ৳{(612.36 * silverRate).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Gold Price per Gram (৳ BDT)
                </label>
                <input
                  type="number"
                  step="50"
                  required
                  value={goldRate}
                  onChange={(e) => setGoldRate(parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Computed Nisab: ৳{(87.48 * goldRate).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
