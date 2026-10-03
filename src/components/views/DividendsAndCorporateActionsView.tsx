import { todayLocalISO } from '../../lib/date-utils';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Coins,
  Gift,
  Split,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Percent,
  ShieldCheck,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Modal, Field, Input, Select, Button, ErrorBanner } from '../ui';
import { useLedger } from '../../lib/ledger-context';
import {
  CorporateActionType,
  IpoApplication,
} from '../../types/accounting';
import {
  calculateDividendValues,
  calculateBonusShareDilution,
  calculateStockSplit,
  calculateRightIssue,
  round2,
} from '../../lib/accounting-engine';

export const DividendsAndCorporateActionsView: React.FC = () => {
  const {
    dividends,
    corporateActions,
    ipoApplications,
    stocks,
    brokerAccounts,
    stockHoldings,
    brokerCashBalances,
    recordDividend,
    executeCorporateAction,
    applyIpo,
    settleIpo,
  } = useLedger();

  // Active Tab: 'dividends' | 'corporate_actions' | 'ipo'
  const [activeTab, setActiveTab] = useState<'dividends' | 'corporate_actions' | 'ipo'>('dividends');

  // Modals state
  const [showDividendModal, setShowDividendModal] = useState(false);
  const [showCorporateActionModal, setShowCorporateActionModal] = useState(false);
  const [showIpoModal, setShowIpoModal] = useState(false);
  const [settlingIpo, setSettlingIpo] = useState<IpoApplication | null>(null);

  // Filter state
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');

  // ----------------------------------------------------
  // Summary Statistics
  // ----------------------------------------------------
  const stats = useMemo(() => {
    const totalGrossDividends = dividends.reduce((sum, d) => sum + d.grossDividend, 0);
    const totalDividendTax = dividends.reduce((sum, d) => sum + d.tax, 0);
    const totalNetDividends = dividends.reduce((sum, d) => sum + d.netDividend, 0);

    const totalPortfolioMarketValue = stockHoldings.reduce(
      (sum, h) => sum + (h.marketValue ?? h.currentMarketValue),
      0
    );

    const dividendYieldPct =
      totalPortfolioMarketValue > 0
        ? round2((totalGrossDividends / totalPortfolioMarketValue) * 100)
        : 0;

    const activeIposCount = ipoApplications.filter((i) => i.status === 'applied').length;
    const activeIposValue = ipoApplications
      .filter((i) => i.status === 'applied')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    return {
      totalGrossDividends: round2(totalGrossDividends),
      totalDividendTax: round2(totalDividendTax),
      totalNetDividends: round2(totalNetDividends),
      dividendYieldPct,
      corporateActionsCount: corporateActions.length,
      activeIposCount,
      activeIposValue: round2(activeIposValue),
    };
  }, [dividends, corporateActions, ipoApplications, stockHoldings]);

  // ----------------------------------------------------
  // Dividend Modal Form State
  // ----------------------------------------------------
  const [divBrokerAcc, setDivBrokerAcc] = useState<string>(brokerAccounts[0]?.id || '');
  const [divStockId, setDivStockId] = useState<string>(stocks[0]?.id || '');
  const [divShares, setDivShares] = useState<number>(() => {
    const h = stockHoldings.find((s) => s.stockId === (stocks[0]?.id || ''));
    return h ? h.quantity : 50;
  });
  const [divPerShare, setDivPerShare] = useState<number>(10.0);
  const [divTaxRate, setDivTaxRate] = useState<number>(10.0);
  const [divRecordDate, setDivRecordDate] = useState<string>(
    todayLocalISO()
  );
  const [divPaymentDate, setDivPaymentDate] = useState<string>(
    todayLocalISO()
  );
  const [divIsExternal, setDivIsExternal] = useState<boolean>(false);
  const [divNotes, setDivNotes] = useState<string>('');
  const [divError, setDivError] = useState<string | null>(null);

  // Auto-calculated dividend live preview
  const liveDivPreview = useMemo(() => {
    return calculateDividendValues(divShares || 0, divPerShare || 0, divTaxRate || 10);
  }, [divShares, divPerShare, divTaxRate]);

  // Handle stock selection change in dividend modal
  const handleDivStockChange = (stockId: string) => {
    setDivStockId(stockId);
    const holding = stockHoldings.find((h) => h.stockId === stockId);
    if (holding && holding.quantity > 0) {
      setDivShares(holding.quantity);
    }
  };

  const handleRecordDividendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDivError(null);
    const res = recordDividend({
      brokerAccountId: divBrokerAcc,
      stockId: divStockId,
      recordDate: divRecordDate,
      paymentDate: divPaymentDate,
      shares: Number(divShares),
      dividendPerShare: Number(divPerShare),
      taxRate: Number(divTaxRate),
      isExternalPayout: divIsExternal,
      notes: divNotes || undefined,
    });

    if (!res.success) {
      setDivError(res.error || 'Failed to record dividend');
      return;
    }
    setShowDividendModal(false);
    setDivNotes('');
  };

  // ----------------------------------------------------
  // Corporate Action Modal Form State
  // ----------------------------------------------------
  const [caType, setCaType] = useState<CorporateActionType>('bonus');
  const [caStockId, setCaStockId] = useState<string>(stocks[0]?.id || '');
  const [caBrokerAcc] = useState<string>(brokerAccounts[0]?.id || '');
  const [caRatio, setCaRatio] = useState<string>('10:1');
  const [caAnnounceDate, setCaAnnounceDate] = useState<string>(
    todayLocalISO()
  );
  const [caEffectiveDate, setCaEffectiveDate] = useState<string>(
    todayLocalISO()
  );
  const [caCashComponent, setCaCashComponent] = useState<number>(10.0);
  const [caNotes, setCaNotes] = useState<string>('');
  const [caError, setCaError] = useState<string | null>(null);

  const selectedCaHolding = useMemo(() => {
    return stockHoldings.find((h) => h.stockId === caStockId);
  }, [stockHoldings, caStockId]);

  const eligibleCaShares = selectedCaHolding?.quantity || 100;
  const currentCaWac = selectedCaHolding?.weightedAverageCost || 100;

  // Live preview for corporate action
  const liveCaPreview = useMemo(() => {
    if (caType === 'bonus') {
      return calculateBonusShareDilution(eligibleCaShares, currentCaWac, caRatio);
    } else if (caType === 'split') {
      return calculateStockSplit(eligibleCaShares, currentCaWac, caRatio);
    } else {
      return calculateRightIssue(eligibleCaShares, currentCaWac, caRatio, caCashComponent || 10);
    }
  }, [caType, eligibleCaShares, currentCaWac, caRatio, caCashComponent]);

  const handleExecuteCaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCaError(null);

    const res = executeCorporateAction({
      stockId: caStockId,
      brokerAccountId: caBrokerAcc,
      type: caType,
      announcementDate: caAnnounceDate,
      effectiveDate: caEffectiveDate,
      ratio: caRatio,
      eligibleQuantity: eligibleCaShares,
      additionalShares:
        'additionalShares' in liveCaPreview
          ? liveCaPreview.additionalShares
          : (liveCaPreview as { eligibleRights: number }).eligibleRights,
      cashComponent: caType === 'right' ? caCashComponent : 0,
      notes: caNotes || undefined,
    });

    if (!res.success) {
      setCaError(res.error || 'Failed to execute corporate action');
      return;
    }
    setShowCorporateActionModal(false);
    setCaNotes('');
  };

  // ----------------------------------------------------
  // IPO Modal Form State
  // ----------------------------------------------------
  const [ipoBrokerAcc, setIpoBrokerAcc] = useState<string>(brokerAccounts[0]?.id || '');
  const [ipoCompany, setIpoCompany] = useState<string>('');
  const [ipoSymbol, setIpoSymbol] = useState<string>('');
  const [ipoLotSize, setIpoLotSize] = useState<number>(500);
  const [ipoOfferPrice, setIpoOfferPrice] = useState<number>(10.0);
  const [ipoAppDate, setIpoAppDate] = useState<string>(
    todayLocalISO()
  );
  const [ipoNotes, setIpoNotes] = useState<string>('');
  const [ipoError, setIpoError] = useState<string | null>(null);

  // Synchronize IPO broker account when brokerAccounts loads
  useEffect(() => {
    if (!ipoBrokerAcc && brokerAccounts.length > 0) {
      setIpoBrokerAcc(brokerAccounts[0].id);
    }
  }, [brokerAccounts, ipoBrokerAcc]);

  const ipoTotalAmount = useMemo(() => {
    return round2((ipoLotSize || 0) * (ipoOfferPrice || 0));
  }, [ipoLotSize, ipoOfferPrice]);

  const availableBrokerCash = useMemo(() => {
    const b = brokerCashBalances.find((bc) => bc.brokerAccountId === ipoBrokerAcc);
    return b ? b.cashBalance : 0;
  }, [brokerCashBalances, ipoBrokerAcc]);

  const handleApplyIpoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIpoError(null);
    if (!ipoCompany.trim() || !ipoSymbol.trim()) {
      setIpoError('Company name and symbol are required.');
      return;
    }

    const res = applyIpo({
      brokerAccountId: ipoBrokerAcc,
      companyName: ipoCompany.trim(),
      symbol: ipoSymbol.toUpperCase().trim(),
      applicationDate: ipoAppDate,
      lotSize: Number(ipoLotSize),
      offerPrice: Number(ipoOfferPrice),
      notes: ipoNotes || undefined,
    });

    if (!res.success) {
      setIpoError(res.error || 'Failed to apply for IPO');
      return;
    }
    setShowIpoModal(false);
    setIpoCompany('');
    setIpoSymbol('');
    setIpoNotes('');
  };

  // ----------------------------------------------------
  // Settle IPO Modal Form State
  // ----------------------------------------------------
  const [settleStatus, setSettleStatus] = useState<'allotted' | 'refunded' | 'partially_allotted'>('allotted');
  const [settleShares, setSettleShares] = useState<number>(0);
  const [settleRefund, setSettleRefund] = useState<number>(0);
  const [settleDate, setSettleDate] = useState<string>(todayLocalISO());
  const [settleError, setSettleError] = useState<string | null>(null);

  const openSettleModal = (app: IpoApplication) => {
    setSettlingIpo(app);
    setSettleStatus('allotted');
    setSettleShares(app.lotSize);
    setSettleRefund(0);
    setSettleDate(todayLocalISO());
    setSettleError(null);
  };

  const handleSettleStatusChange = (status: 'allotted' | 'refunded' | 'partially_allotted') => {
    setSettleStatus(status);
    if (!settlingIpo) return;
    if (status === 'allotted') {
      setSettleShares(settlingIpo.lotSize);
      setSettleRefund(0);
    } else if (status === 'refunded') {
      setSettleShares(0);
      setSettleRefund(settlingIpo.totalAmount);
    } else {
      const halfShares = Math.floor(settlingIpo.lotSize / 2);
      setSettleShares(halfShares);
      setSettleRefund(round2(halfShares * settlingIpo.offerPrice));
    }
  };

  const handleSettleIpoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingIpo) return;
    setSettleError(null);

    const res = settleIpo({
      applicationId: settlingIpo.id,
      status: settleStatus,
      allottedShares: Number(settleShares),
      refundAmount: Number(settleRefund),
      allotmentDate: settleDate,
    });

    if (!res.success) {
      setSettleError(res.error || 'Failed to settle IPO');
      return;
    }
    setSettlingIpo(null);
  };

  // Filtered lists
  const filteredDividends = useMemo(() => {
    if (selectedStockFilter === 'all') return dividends;
    return dividends.filter((d) => d.stockId === selectedStockFilter);
  }, [dividends, selectedStockFilter]);

  const filteredCorporateActions = useMemo(() => {
    if (selectedStockFilter === 'all') return corporateActions;
    return corporateActions.filter((ca) => ca.stockId === selectedStockFilter);
  }, [corporateActions, selectedStockFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Tax Compliant
            </span>
            <span className="text-xs text-gray-500">DSE / CSE Regulatory Sub-Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2.5">
            <Coins className="w-6 h-6 sm:w-7 h-7 text-emerald-600 shrink-0" />
            Dividends & Corporate Actions
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Deterministic gross cash dividend tracking, 10% AIT tax withholding, bonus dilution, stock splits, and IPO subscriptions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Button
            onClick={() => {
              setDivError(null);
              setShowDividendModal(true);
            }}
            variant="primary"
            icon={Coins}
            className="flex-1 sm:flex-none"
          >
            Record Dividend
          </Button>
          <button
            onClick={() => {
              setCaError(null);
              setShowCorporateActionModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <Split className="w-4 h-4" />
            Corporate Action
          </button>
          <button
            onClick={() => {
              setIpoError(null);
              setShowIpoModal(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Apply IPO
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Gross Dividends */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gross Dividends
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              ৳{stats.totalGrossDividends.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span>{dividends.length} declared payouts</span>
              <span>•</span>
              <span className="text-emerald-600 font-medium">{stats.dividendYieldPct}% yield</span>
            </div>
          </div>
        </div>

        {/* Tax Withheld (AIT) */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tax Withheld (AIT)
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-rose-600">
              ৳{stats.totalDividendTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span>10% standard TIN withholding</span>
              <span>•</span>
              <span>NBR credited</span>
            </div>
          </div>
        </div>

        {/* Net Cash Received */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Net Cash Received
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-blue-700">
              ৳{stats.totalNetDividends.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span>Deposited to BO cash ledger</span>
            </div>
          </div>
        </div>

        {/* Corporate Actions & IPOs */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions & IPOs
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-purple-700">
              {stats.corporateActionsCount} Actions / {stats.activeIposCount} IPO
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span>৳{stats.activeIposValue.toLocaleString()} blocked in IPO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters bar - Mobile Scrollable */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="overflow-x-auto scrollbar-none flex items-center gap-2 min-w-max pb-1">
          <button
            onClick={() => setActiveTab('dividends')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dividends'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Cash Dividends ({dividends.length})
          </button>
          <button
            onClick={() => setActiveTab('corporate_actions')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'corporate_actions'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Corporate Actions ({corporateActions.length})
          </button>
          <button
            onClick={() => setActiveTab('ipo')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'ipo'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            IPO Applications ({ipoApplications.length})
          </button>
        </div>

        {/* Stock Filter */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-gray-500 font-medium whitespace-nowrap">Filter Security:</span>
          <select
            value={selectedStockFilter}
            onChange={(e) => setSelectedStockFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
          >
            <option value="all">All Securities</option>
            {stocks.map((s) => (
              <option key={s.id} value={s.id}>
                {s.symbol} - {s.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ====================================================
          TAB 1: CASH DIVIDENDS
          ==================================================== */}
      {activeTab === 'dividends' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Cash Dividends Ledger</h2>
            </div>
            <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Gross Dividend & Withholding Tax Sub-Ledger</span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-4">Payment / Record Date</th>
                  <th className="py-3 px-3 sm:px-4">Security</th>
                  <th className="py-3 px-3 sm:px-4">Broker Account</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Shares Held</th>
                  <th className="py-3 px-3 sm:px-4 text-right">DPS (৳)</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Gross Dividend</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Tax Withheld (AIT)</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Net Received</th>
                  <th className="py-3 px-3 sm:px-4">Payout Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDividends.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No cash dividends recorded yet. Click "Record Dividend" above to add one.
                    </td>
                  </tr>
                ) : (
                  filteredDividends.map((div) => {
                    const stock = stocks.find((s) => s.id === div.stockId);
                    const brokerAcc = brokerAccounts.find((b) => b.id === div.brokerAccountId);

                    return (
                      <tr key={div.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 sm:px-4 font-mono text-xs whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{div.paymentDate}</div>
                          <div className="text-gray-400">Rec: {div.recordDate}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="font-bold text-gray-900">{stock?.symbol || 'UNKNOWN'}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[160px]">
                            {stock?.companyName}
                          </div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-xs text-gray-600">
                          {brokerAcc?.accountName || brokerAcc?.boId || div.brokerAccountId}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-medium text-gray-900 font-mono">
                          {div.shares.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono text-gray-700">
                          ৳{div.dividendPerShare.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono font-semibold text-gray-900">
                          ৳{div.grossDividend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono text-rose-600">
                          -৳{div.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-emerald-600">
                          +৳{div.netDividend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          {div.isExternalPayout ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Bank Transfer
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                              BO Cash Sub-Ledger
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 2: CORPORATE ACTIONS (Bonus, Split, Rights)
          ==================================================== */}
      {activeTab === 'corporate_actions' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Split className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Corporate Actions Ledger</h2>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Bonus Shares (Stock Dividends) • Stock Splits • Rights Issues
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-4">Effective Date</th>
                  <th className="py-3 px-3 sm:px-4">Security</th>
                  <th className="py-3 px-3 sm:px-4">Action Type</th>
                  <th className="py-3 px-3 sm:px-4">Ratio</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Eligible Shares</th>
                  <th className="py-3 px-3 sm:px-4 text-right">New Quantity</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Diluted WAC</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Cash Outflow</th>
                  <th className="py-3 px-3 sm:px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCorporateActions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No corporate actions recorded yet. Click "Corporate Action" to apply a bonus share or split.
                    </td>
                  </tr>
                ) : (
                  filteredCorporateActions.map((ca) => {
                    const stock = stocks.find((s) => s.id === ca.stockId);

                    return (
                      <tr key={ca.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 sm:px-4 font-mono text-xs text-gray-900 whitespace-nowrap">
                          {ca.effectiveDate}
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="font-bold text-gray-900">{stock?.symbol || 'UNKNOWN'}</div>
                          <div className="text-xs text-gray-500">{stock?.companyName}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          {ca.type === 'bonus' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <Gift className="w-3 h-3 mr-1" /> Bonus Issue
                            </span>
                          )}
                          {ca.type === 'split' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Split className="w-3 h-3 mr-1" /> Stock Split
                            </span>
                          )}
                          {ca.type === 'right' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <ArrowUpRight className="w-3 h-3 mr-1" /> Right Share
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 sm:px-4 font-mono font-bold text-gray-800 whitespace-nowrap">
                          {ca.ratio}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right text-gray-600 font-mono">
                          {ca.eligibleQuantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-semibold text-gray-900 font-mono">
                          {ca.newQuantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-emerald-700">
                          ৳{ca.newWac.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono text-gray-700">
                          {ca.cashComponent > 0 ? `৳${ca.cashComponent.toLocaleString()}` : '৳0.00'}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-xs text-gray-500 max-w-xs truncate">
                          {ca.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 3: IPO APPLICATIONS & SETTLEMENT
          ==================================================== */}
      {activeTab === 'ipo' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Initial Public Offering (IPO) Portfolio</h2>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Primary market quota subscription, cash blocking, and lottery settlement
            </div>
          </div>

          {/* Mobile Card List (visible on screens < 640px) */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {ipoApplications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs p-4">
                No IPO applications found. Click &quot;Apply IPO&quot; above to submit a new subscription.
              </div>
            ) : (
              ipoApplications.map((ipo) => {
                const brokerAcc = brokerAccounts.find((b) => b.id === ipo.brokerAccountId);

                return (
                  <div key={ipo.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-gray-900 font-mono text-sm">{ipo.symbol}</div>
                        <div className="text-xs text-gray-600">{ipo.companyName}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          BO: {brokerAcc?.accountName || ipo.brokerAccountId} · {ipo.applicationDate}
                        </div>
                      </div>
                      <div>
                        {ipo.status === 'applied' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </span>
                        )}
                        {ipo.status === 'allotted' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Allotted
                          </span>
                        )}
                        {ipo.status === 'partially_allotted' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800">
                            Partial
                          </span>
                        )}
                        {ipo.status === 'refunded' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800">
                            Refunded
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-gray-50 rounded-lg text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">Lot Size</div>
                        <div className="font-semibold text-gray-900">{ipo.lotSize} sh</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">Offer Price</div>
                        <div className="font-semibold text-gray-900">৳{ipo.offerPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">Total Blocked</div>
                        <div className="font-bold text-indigo-700">৳{ipo.totalAmount.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Outcome display */}
                    {ipo.status !== 'applied' && (
                      <div className="text-xs p-2 bg-emerald-50/60 border border-emerald-200/60 rounded-lg flex items-center justify-between">
                        <span className="text-gray-600">Allotment Outcome:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {ipo.allottedShares ? `${ipo.allottedShares} shares` : '0 shares'}
                          {ipo.refundAmount ? ` (৳${ipo.refundAmount.toLocaleString()} refunded)` : ''}
                        </span>
                      </div>
                    )}

                    {ipo.status === 'applied' && (
                      <button
                        onClick={() => openSettleModal(ipo)}
                        className="w-full py-2 px-3 text-xs font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-center transition-colors"
                      >
                        Settle Outcome (লটারি রেজাল্ট / অ্যালটমেন্ট)
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (hidden on mobile, visible on sm+) */}
          <div className="hidden sm:block overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-4">Application Date</th>
                  <th className="py-3 px-3 sm:px-4">Company & Symbol</th>
                  <th className="py-3 px-3 sm:px-4">Broker Account</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Lot Size</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Offer Price</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Total Applied</th>
                  <th className="py-3 px-3 sm:px-4">Status</th>
                  <th className="py-3 px-3 sm:px-4">Outcome</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ipoApplications.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No IPO applications found. Click &quot;Apply IPO&quot; to submit a new subscription.
                    </td>
                  </tr>
                ) : (
                  ipoApplications.map((ipo) => {
                    const brokerAcc = brokerAccounts.find((b) => b.id === ipo.brokerAccountId);

                    return (
                      <tr key={ipo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 sm:px-4 font-mono text-xs text-gray-900 whitespace-nowrap">
                          {ipo.applicationDate}
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="font-bold text-gray-900">{ipo.symbol}</div>
                          <div className="text-xs text-gray-500">{ipo.companyName}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-xs text-gray-600">
                          {brokerAcc?.accountName || brokerAcc?.boId || ipo.brokerAccountId}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-medium text-gray-900 font-mono">
                          {ipo.lotSize.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono text-gray-700">
                          ৳{ipo.offerPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-gray-900">
                          ৳{ipo.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          {ipo.status === 'applied' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 mr-1" /> Pending Lottery
                            </span>
                          )}
                          {ipo.status === 'allotted' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Allotted
                            </span>
                          )}
                          {ipo.status === 'partially_allotted' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Partial Allotment
                            </span>
                          )}
                          {ipo.status === 'refunded' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              Refunded
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-xs whitespace-nowrap">
                          {ipo.status === 'applied' ? (
                            <span className="text-gray-400">Cash blocked in BO</span>
                          ) : (
                            <div>
                              <div className="font-semibold text-gray-900">
                                {ipo.allottedShares ? `${ipo.allottedShares} shares` : '0 shares'}
                              </div>
                              {ipo.refundAmount ? (
                                <div className="text-emerald-600 font-mono">
                                  ৳{ipo.refundAmount.toLocaleString()} refunded
                                </div>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                          {ipo.status === 'applied' ? (
                            <button
                              onClick={() => openSettleModal(ipo)}
                              className="px-2.5 py-1 text-xs font-medium rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                            >
                              Settle Outcome
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 1: RECORD CASH DIVIDEND
          ==================================================== */}
      <Modal
        isOpen={showDividendModal}
        onClose={() => setShowDividendModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            Record Cash Dividend
          </span>
        }
        maxWidth="lg"
      >
        <form onSubmit={handleRecordDividendSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          {divError && <ErrorBanner message={divError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Broker Account">
              <Select
                value={divBrokerAcc}
                onChange={(e) => setDivBrokerAcc(e.target.value)}
                required
              >
                {brokerAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.accountName} ({b.boId})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Security / Stock">
              <Select
                value={divStockId}
                onChange={(e) => handleDivStockChange(e.target.value)}
                required
              >
                {stocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.symbol} - {s.companyName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Shares Held">
              <Input
                type="number"
                min="1"
                step="1"
                value={divShares}
                onChange={(e) => setDivShares(Number(e.target.value))}
                className="font-mono"
                required
              />
            </Field>

            <Field label="DPS (৳/Share)">
              <Input
                type="number"
                min="0.01"
                step="any"
                value={divPerShare}
                onChange={(e) => setDivPerShare(Number(e.target.value))}
                className="font-mono"
                required
              />
            </Field>

            <Field label="AIT Tax Rate (%)">
              <Select
                value={divTaxRate}
                onChange={(e) => setDivTaxRate(Number(e.target.value))}
              >
                <option value={10}>10% (With TIN)</option>
                <option value={15}>15% (Without TIN)</option>
                <option value={0}>0% (Exempt)</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Record Date">
              <Input
                type="date"
                value={divRecordDate}
                onChange={(e) => setDivRecordDate(e.target.value)}
                className="font-mono"
                required
              />
            </Field>

            <Field label="Payment Date">
              <Input
                type="date"
                value={divPaymentDate}
                onChange={(e) => setDivPaymentDate(e.target.value)}
                className="font-mono"
                required
              />
            </Field>
          </div>

          {/* Live Preview Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-emerald-400 flex items-center justify-between">
              <span>Sub-Ledger Impact Preview:</span>
              <span className="font-mono text-slate-400">Real-time Calculation</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">Gross Dividend (+)</span>
                <span className="font-mono font-bold text-white text-sm">
                  ৳{liveDivPreview.grossDividend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">AIT Tax Withheld (-)</span>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  -৳{liveDivPreview.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Net BO Cash Impact</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  +৳{liveDivPreview.netDividend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <Field label="Notes & Reference">
            <Input
              type="text"
              placeholder="e.g. FY26 Final Cash Dividend declaration"
              value={divNotes}
              onChange={(e) => setDivNotes(e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="externalPayoutCheckbox"
              checked={divIsExternal}
              onChange={(e) => setDivIsExternal(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-800 bg-slate-950"
            />
            <label htmlFor="externalPayoutCheckbox" className="text-xs text-slate-400">
              External Direct Bank Payout (bypass BO cash sub-ledger)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setShowDividendModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Dividend
            </Button>
          </div>
        </form>
      </Modal>

      {/* ====================================================
          MODAL 2: EXECUTE CORPORATE ACTION (Bonus, Split, Rights)
          ==================================================== */}
      <Modal
        isOpen={showCorporateActionModal}
        onClose={() => setShowCorporateActionModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Split className="w-5 h-5 text-indigo-400" />
            Execute Corporate Action
          </span>
        }
        maxWidth="lg"
      >
        <form onSubmit={handleExecuteCaSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          {caError && <ErrorBanner message={caError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Action Type">
              <Select
                value={caType}
                onChange={(e) => setCaType(e.target.value as CorporateActionType)}
              >
                <option value="bonus">Bonus Issue (Stock Dividend)</option>
                <option value="split">Stock Split</option>
                <option value="right">Right Share Issue</option>
              </Select>
            </Field>

            <Field label="Target Security">
              <Select
                value={caStockId}
                onChange={(e) => setCaStockId(e.target.value)}
              >
                {stocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.symbol} - {s.companyName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field
              label="Ratio (e.g. 10:1 or 1:2)"
              hint={
                caType === 'bonus'
                  ? '10:1 means 1 bonus for every 10 held (10%)'
                  : caType === 'split'
                  ? '1:2 means 1 share splits into 2 shares'
                  : '1:5 means 1 right for every 5 held'
              }
            >
              <Input
                type="text"
                value={caRatio}
                onChange={(e) => setCaRatio(e.target.value)}
                placeholder={caType === 'bonus' ? '10:1' : caType === 'split' ? '1:2' : '1:5'}
                className="font-mono"
                required
              />
            </Field>

            {caType === 'right' ? (
              <Field label="Subscription Price (৳)">
                <Input
                  type="number"
                  step="any"
                  min="1"
                  value={caCashComponent}
                  onChange={(e) => setCaCashComponent(Number(e.target.value))}
                  className="font-mono"
                  required
                />
              </Field>
            ) : (
              <Field label="Eligible Quantity Held">
                <div className="px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-medium">
                  {eligibleCaShares} shares (Current WAC: ৳{currentCaWac.toFixed(2)})
                </div>
              </Field>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Announcement Date">
              <Input
                type="date"
                value={caAnnounceDate}
                onChange={(e) => setCaAnnounceDate(e.target.value)}
                className="font-mono"
                required
              />
            </Field>

            <Field label="Effective / Record Date">
              <Input
                type="date"
                value={caEffectiveDate}
                onChange={(e) => setCaEffectiveDate(e.target.value)}
                className="font-mono"
                required
              />
            </Field>
          </div>

          {/* Live Preview Box for Dilution */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-indigo-400 flex items-center justify-between">
              <span>Mathematical Holding Adjustment & Dilution:</span>
              <span className="font-mono text-slate-400">WAC Invariant</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">New Quantity</span>
                <span className="font-mono font-bold text-white text-sm">
                  {liveCaPreview.newQuantity} shares
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Diluted WAC</span>
                <span className="font-mono font-bold text-indigo-400 text-sm">
                  ৳{liveCaPreview.newWac.toFixed(2)}/sh
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Cost Basis</span>
                <span className="font-mono font-bold text-white text-sm">
                  ৳{liveCaPreview.newCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <Field label="Notes & Reference">
            <Input
              type="text"
              placeholder="e.g. Board meeting approved 10% stock dividend"
              value={caNotes}
              onChange={(e) => setCaNotes(e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setShowCorporateActionModal(false)}>
              Cancel
            </Button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              Apply Corporate Action
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================
          MODAL 3: APPLY FOR IPO
          ==================================================== */}
      <Modal
        isOpen={showIpoModal}
        onClose={() => setShowIpoModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Apply for IPO (Primary Market)
          </span>
        }
        maxWidth="lg"
      >
        <form onSubmit={handleApplyIpoSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          {ipoError && <ErrorBanner message={ipoError} />}

          <Field
            label={
              <span className="flex items-center justify-between">
                <span>Beneficiary Owner (BO) Account *</span>
                <span className="text-[11px] font-mono text-indigo-400">
                  Avail Cash: ৳{availableBrokerCash.toLocaleString()}
                </span>
              </span>
            }
          >
            <Select
              value={ipoBrokerAcc}
              onChange={(e) => setIpoBrokerAcc(e.target.value)}
              className="font-mono"
              required
            >
              {brokerAccounts.map((b) => {
                const cash = brokerCashBalances.find((bc) => bc.brokerAccountId === b.id)?.cashBalance || 0;
                return (
                  <option key={b.id} value={b.id}>
                    {b.accountName} (BO: {b.boId}) — Cash: ৳{cash.toLocaleString()}
                  </option>
                );
              })}
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Company Name" required>
              <Input
                type="text"
                placeholder="e.g. Techno Drugs Ltd"
                value={ipoCompany}
                onChange={(e) => setIpoCompany(e.target.value)}
                required
              />
            </Field>

            <Field label="DSE Symbol / Ticker" required>
              <Input
                type="text"
                placeholder="e.g. TECHNODRUG"
                value={ipoSymbol}
                onChange={(e) => setIpoSymbol(e.target.value.toUpperCase())}
                className="font-mono uppercase"
                required
              />
            </Field>
          </div>

          {/* Quick Lot Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-mono">Quick Preset:</span>
            <button
              type="button"
              onClick={() => { setIpoLotSize(500); setIpoOfferPrice(10); }}
              className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-indigo-300 font-mono"
            >
              500 sh @ ৳10 (৳5,000)
            </button>
            <button
              type="button"
              onClick={() => { setIpoLotSize(1000); setIpoOfferPrice(10); }}
              className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-indigo-300 font-mono"
            >
              1,000 sh @ ৳10 (৳10,000)
            </button>
            <button
              type="button"
              onClick={() => { setIpoLotSize(2000); setIpoOfferPrice(10); }}
              className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-indigo-300 font-mono"
            >
              2,000 sh @ ৳10 (৳20,000)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Lot Size (Shares)" required>
              <Input
                type="number"
                min="1"
                step="1"
                value={ipoLotSize}
                onChange={(e) => setIpoLotSize(Number(e.target.value))}
                className="font-mono"
                required
              />
            </Field>

            <Field label="Offer Price (৳)" required>
              <Input
                type="number"
                min="1"
                step="any"
                value={ipoOfferPrice}
                onChange={(e) => setIpoOfferPrice(Number(e.target.value))}
                className="font-mono"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Application Date" required>
              <Input
                type="date"
                value={ipoAppDate}
                onChange={(e) => setIpoAppDate(e.target.value)}
                className="font-mono"
                required
              />
            </Field>

            <Field label="Total Required Subscription">
              <div className="px-3 py-2 text-base sm:text-sm font-mono font-bold bg-slate-950 border border-slate-800 rounded-lg text-indigo-400">
                ৳{ipoTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </Field>
          </div>

          {/* Insufficient Cash Warning */}
          {availableBrokerCash < ipoTotalAmount && (
            <ErrorBanner
              variant="warning"
              message={
                <>
BENGALI_LINE                </>
              }
            />
          )}

          <Field label="Notes">
            <Input
              type="text"
              placeholder="e.g. General public quota application"
              value={ipoNotes}
              onChange={(e) => setIpoNotes(e.target.value)}
            />
          </Field>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowIpoModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={availableBrokerCash < ipoTotalAmount}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              Apply &amp; Block Funds (৳{ipoTotalAmount.toLocaleString()})
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================
          MODAL 4: SETTLE IPO ALLOTMENT / LOTTERY
          ==================================================== */}
      {settlingIpo && (
        <Modal
          isOpen={!!settlingIpo}
          onClose={() => setSettlingIpo(null)}
          title={`Settle IPO: ${settlingIpo.symbol}`}
          description={settlingIpo.companyName}
          maxWidth="md"
        >
          <form onSubmit={handleSettleIpoSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
            {settleError && <ErrorBanner message={settleError} />}

            <Field label="Lottery / Pro-Rata Outcome">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSettleStatusChange('allotted')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    settleStatus === 'allotted'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  100% Allotted
                </button>
                <button
                  type="button"
                  onClick={() => handleSettleStatusChange('partially_allotted')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    settleStatus === 'partially_allotted'
                      ? 'border-sky-500 bg-sky-500/20 text-sky-300 font-bold'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Partial Allotment
                </button>
                <button
                  type="button"
                  onClick={() => handleSettleStatusChange('refunded')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    settleStatus === 'refunded'
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-bold'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Not Allotted
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Field label="Allotted Shares">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={settleShares}
                  onChange={(e) => setSettleShares(Number(e.target.value))}
                  className="font-mono"
                  required
                />
              </Field>

              <Field label="Refund Amount (৳)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={settleRefund}
                  onChange={(e) => setSettleRefund(Number(e.target.value))}
                  className="font-mono"
                  required
                />
              </Field>
            </div>

            <Field label="Settlement Date">
              <Input
                type="date"
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
                className="font-mono"
                required
              />
            </Field>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSettlingIpo(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors text-center"
              >
                Confirm Settlement
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
