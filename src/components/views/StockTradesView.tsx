import { todayLocalISO } from '../../lib/date-utils';
import React, { useState, useMemo, useEffect } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { StockTransactionType, Stock } from '../../types/accounting';
import { calculateTradeValues } from '../../lib/accounting-engine';
import { fetchDseSingleQuote, fetchDseCompanyList, DseCompanyItem } from '../../lib/dse-market-service';
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Plus,
  Coins,
  Building2,
  X,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Modal, Field, Input, Select, Button, ErrorBanner } from '../ui';

interface StockTradesViewProps {
  initialStockId?: string;
  onNavigateToPortfolio?: () => void;
  onNavigateToBrokerage?: () => void;
}

export const StockTradesView: React.FC<StockTradesViewProps> = ({
  initialStockId,
  onNavigateToPortfolio,
  onNavigateToBrokerage,
}) => {
  const {
    stocks,
    brokerAccounts,
    brokerCashBalances,
    stockHoldings,
    stockTransactions,
    executeStockTrade,
    addCustomStock,
  } = useLedger();

  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');


  // Trade Form State
  const [tradeType, setTradeType] = useState<StockTransactionType>('buy');
  const [selectedStockId, setSelectedStockId] = useState<string>(
    initialStockId || stocks[0]?.id || ''
  );
  const [tickerSearchInput, setTickerSearchInput] = useState<string>(() => {
    const s = stocks.find((st) => st.id === (initialStockId || stocks[0]?.id));
    return s ? s.symbol : '';
  });
  const [isTickerDropdownOpen, setIsTickerDropdownOpen] = useState(false);
  const [selectedBoAccountId, setSelectedBoAccountId] = useState<string>(
    brokerAccounts[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number | ''>(100);
  const [price, setPrice] = useState<number | ''>(
    stocks.find((s) => s.id === (initialStockId || stocks[0]?.id))?.currentPrice || 100
  );
  const [commissionRatePct, setCommissionRatePct] = useState<number | ''>(0.4); // Standard DSE 0.4%
  const [taxAmount, setTaxAmount] = useState<number | ''>(0); // 0.05% AIT for sell
  const [otherCharges, setOtherCharges] = useState<number | ''>(0);
  const [tradeDate, setTradeDate] = useState(() => todayLocalISO());
  const [tradeReference, setTradeReference] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Held stocks in selected BO account
  const holdingsInSelectedBo = useMemo(() => {
    return stockHoldings.filter(
      (h) => h.brokerAccountId === selectedBoAccountId && h.quantity > 0
    );
  }, [stockHoldings, selectedBoAccountId]);

  // Synchronize selectedStockId and tickerSearchInput when initialStockId or stocks change
  useEffect(() => {
    if (initialStockId) {
      const st = stocks.find((s) => s.id === initialStockId);
      if (st) {
        setSelectedStockId(st.id);
        setTickerSearchInput(st.symbol);
        setPrice(st.currentPrice);
        setIsTradeModalOpen(true);
      }
    } else if (!selectedStockId && stocks.length > 0) {
      setSelectedStockId(stocks[0].id);
      setTickerSearchInput(stocks[0].symbol);
      setPrice(stocks[0].currentPrice);
    }
  }, [initialStockId, stocks, selectedStockId]);

  // Synchronize BO account if empty
  useEffect(() => {
    if (!selectedBoAccountId && brokerAccounts.length > 0) {
      setSelectedBoAccountId(brokerAccounts[0].id);
    }
  }, [brokerAccounts, selectedBoAccountId]);

  // Selected Stock & BO Details
  const activeStock = stocks.find((s) => s.id === selectedStockId);
  const boCashObj = brokerCashBalances.find((b) => b.brokerAccountId === selectedBoAccountId);
  const availableCash = boCashObj ? boCashObj.cashBalance : 0;

  // Existing held shares for this stock in selected BO
  const existingHolding = stockHoldings.find(
    (h) => h.brokerAccountId === selectedBoAccountId && h.stockId === selectedStockId
  );
  const availableSharesToSell = existingHolding ? existingHolding.quantity : 0;

  // Real-time Lock 4 calculation
  const numQty = typeof quantity === 'number' ? quantity : 0;
  const numPrice = typeof price === 'number' ? price : 0;
  const numCommPct = typeof commissionRatePct === 'number' ? commissionRatePct : 0;
  const numTax = typeof taxAmount === 'number' ? taxAmount : 0;
  const numOther = typeof otherCharges === 'number' ? otherCharges : 0;

  const liveValues = calculateTradeValues({
    transactionType: tradeType,
    quantity: numQty,
    price: numPrice,
    commissionRatePct: numCommPct,
    taxAmount: numTax,
    otherCharges: numOther,
  });

  // UX-2: balance context — what this order does to the BO cash position
  const cashAfterTrade =
    tradeType === 'buy' ? availableCash - liveValues.netValue : availableCash + liveValues.netValue;
  const sharesAfterTrade =
    tradeType === 'sell' ? Math.max(0, availableSharesToSell - numQty) : availableSharesToSell + numQty;
  const hasInsufficientCash = tradeType === 'buy' && numQty > 0 && availableCash < liveValues.netValue;
  const hasInsufficientShares = tradeType === 'sell' && numQty > 0 && availableSharesToSell < numQty;
  const hasBlockingIssue = hasInsufficientCash || hasInsufficientShares;

  const [isRefreshingLivePrice, setIsRefreshingLivePrice] = useState(false);
  const [livePriceFeedback, setLivePriceFeedback] = useState<string | null>(null);

  // Automatically update suggested price when user changes stock
  const handleStockChange = (stockId: string) => {
    setSelectedStockId(stockId);
    const st = stocks.find((s) => s.id === stockId);
    if (st) {
      setTickerSearchInput(st.symbol);
      setPrice(st.currentPrice);
      handleFetchLiveTradePrice(st.symbol);
    }
  };

  // Full DSE securities universe for the buy flow: the local catalog is only a
  // subset, so the search also spans the live DSE company list (cached). A
  // security picked from the market list is auto-added to the catalog.
  const [dseCompanies, setDseCompanies] = useState<DseCompanyItem[]>([]);
  useEffect(() => {
    fetchDseCompanyList()
      .then(setDseCompanies)
      .catch(() => {});
  }, []);

  interface TradeSecurityOption {
    stockId: string | null;
    symbol: string;
    companyName: string;
    sector: string;
    category?: string;
    currentPrice: number | null;
  }

  const allTradeOptions = useMemo<TradeSecurityOption[]>(() => {
    const catalogSymbols = new Set(stocks.map((st) => st.symbol.toUpperCase()));
    const catalog: TradeSecurityOption[] = stocks.map((st) => ({
      stockId: st.id,
      symbol: st.symbol,
      companyName: st.companyName,
      sector: st.sector,
      category: st.category,
      currentPrice: st.currentPrice,
    }));
    const market: TradeSecurityOption[] = dseCompanies
      .filter((c) => c.symbol && !catalogSymbols.has(c.symbol.toUpperCase()))
      .map((c) => ({
        stockId: null,
        symbol: c.symbol,
        companyName: c.name,
        sector: c.sector || 'General',
        category: c.category || 'A',
        currentPrice: null,
      }));
    return [...catalog, ...market];
  }, [stocks, dseCompanies]);

  const filteredStocksForTrade = useMemo(() => {
    const term = tickerSearchInput.trim().toUpperCase();
    if (!term) return allTradeOptions;
    return allTradeOptions.filter(
      (o) =>
        o.symbol.toUpperCase().includes(term) ||
        o.companyName.toUpperCase().includes(term)
    );
  }, [allTradeOptions, tickerSearchInput]);

  const selectTradeOption = (o: TradeSecurityOption) => {
    if (o.stockId) {
      const st = stocks.find((x) => x.id === o.stockId);
      if (st) selectStockByObj(st);
      return;
    }
    // Market-only security: register it in the catalog, then select it. The
    // live price is fetched immediately by selectStockByObj.
    const created = addCustomStock({
      symbol: o.symbol,
      companyName: o.companyName,
      sector: o.sector,
      exchange: 'DSE',
      currentPrice: 0,
      ycp: 0,
      category: o.category,
      isActive: true,
    });
    selectStockByObj(created);
  };

  const selectStockByObj = (s: Stock) => {
    setSelectedStockId(s.id);
    setTickerSearchInput(s.symbol);
    setPrice(s.currentPrice);
    setIsTickerDropdownOpen(false);
    handleFetchLiveTradePrice(s.symbol);
  };

  const handleFetchLiveTradePrice = async (tickerSymbol?: string) => {
    const targetStock = stocks.find((s) => s.id === selectedStockId);
    const symbolToFetch = tickerSymbol || targetStock?.symbol;
    if (!symbolToFetch) return;

    setIsRefreshingLivePrice(true);
    setLivePriceFeedback(`Fetching ${symbolToFetch} from StockChartBD...`);

    try {
      const q = await fetchDseSingleQuote(symbolToFetch);
      if (q && q.ltp > 0) {
        setPrice(q.ltp);
        setLivePriceFeedback(`Live Tk ${q.ltp.toFixed(2)} (${q.changePct ? (q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2) + '%' : '0%'})`);
      } else {
        setLivePriceFeedback(null);
      }
    } catch {
      setLivePriceFeedback(null);
    } finally {
      setIsRefreshingLivePrice(false);
      setTimeout(() => setLivePriceFeedback(null), 4000);
    }
  };

  // Automatically adjust default AIT tax and stock selection when toggling between buy/sell
  const handleTradeTypeToggle = (type: StockTransactionType) => {
    setTradeType(type);
    if (type === 'sell') {
      const gross = numQty * numPrice;
      const defaultTax = Math.round(gross * 0.003 * 100) / 100;
      setTaxAmount(defaultTax);

      // Auto-select first held stock if current stock is not held in this BO
      const isCurrentlyHeld = holdingsInSelectedBo.some((h) => h.stockId === selectedStockId);
      if (!isCurrentlyHeld && holdingsInSelectedBo.length > 0) {
        const firstHeld = holdingsInSelectedBo[0];
        setSelectedStockId(firstHeld.stockId);
        const s = stocks.find((st) => st.id === firstHeld.stockId);
        if (s) {
          setTickerSearchInput(s.symbol);
          setPrice(s.currentPrice);
        }
        setQuantity(firstHeld.quantity);
      }
    } else {
      setTaxAmount(0);
      if ((!selectedStockId || !stocks.some(s => s.id === selectedStockId)) && stocks.length > 0) {
        setSelectedStockId(stocks[0].id);
        setTickerSearchInput(stocks[0].symbol);
        setPrice(stocks[0].currentPrice);
      }
    }
  };

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (numQty <= 0) {
      setFormError('Please enter a valid quantity of shares greater than 0.');
      return;
    }
    if (numPrice <= 0) {
      setFormError('Please enter a valid share price greater than 0.');
      return;
    }

    const res = executeStockTrade({
      brokerAccountId: selectedBoAccountId,
      stockId: selectedStockId,
      transactionType: tradeType,
      quantity: numQty,
      price: numPrice,
      commissionRatePct: numCommPct,
      taxAmount: numTax,
      otherCharges: numOther,
      tradeDate,
      reference: tradeReference.trim() || undefined,
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to execute trade.');
      return;
    }

    setSuccessMessage(
      `Successfully executed ${tradeType.toUpperCase()} order for ${numQty.toLocaleString()} shares of ${
        activeStock?.symbol
      } at ৳${numPrice}. Total ${
        tradeType === 'buy' ? 'cost basis' : 'net proceeds'
      }: ৳${liveValues.netValue.toLocaleString()}.`
    );

    setIsTradeModalOpen(false);
  };

  // Filtered transactions
  const filteredTrades = stockTransactions.filter((tx) => {
    const matchStock = selectedStockFilter === 'all' || tx.stockId === selectedStockFilter;
    const matchType = selectedTypeFilter === 'all' || tx.transactionType === selectedTypeFilter;
    return matchStock && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">Stock Trade Execution</h1>
            <span className="text-[10px] bg-accent/10 text-accent-strong font-mono px-2 py-0.5 rounded border border-accent/20">
              Automated Charges & Tax
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Execute Buy and Sell trades on Dhaka Stock Exchange (DSE). All commissions, taxes, and fees are capitalized into Buy Cost Basis or deducted from Sell Net Proceeds.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button onClick={onNavigateToPortfolio} variant="outline" size="md">
            <Coins className="h-3.5 w-3.5 text-accent-strong" />
            <span>Portfolio & WAC</span>
          </Button>
          <Button onClick={onNavigateToBrokerage} variant="outline" size="md">
            <Building2 className="h-3.5 w-3.5 text-sky-400" />
            <span>Broker Cash Ledger</span>
          </Button>
          <Button
            onClick={() => {
              setFormError('');
              setIsTradeModalOpen(true);
            }}
            variant="primary"
            size="md"
            icon={Plus}
          >
            New Trade Order
          </Button>
        </div>
      </div>

      {successMessage && <ErrorBanner variant="success" message={successMessage} />}

      {/* Trade Principles Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buy Invariant Card */}
        <div className="bg-surface/60 border border-accent/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-accent-strong text-xs font-mono font-bold uppercase">
            <ArrowDownRight className="h-4 w-4" />
            <span>Buy Trade Cost Basis</span>
          </div>
          <div className="mt-2 font-mono text-sm text-ink font-semibold">
            Cost Basis = Gross Value + Commission + Tax + Fees
          </div>
          <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
            All acquisition expenses are capitalized. Broker cash balance decreases by the total Cost Basis. Increases WAC pool proportionally.
          </p>
        </div>

        {/* Sell Invariant Card */}
        <div className="bg-surface/60 border border-sky-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-mono font-bold uppercase">
            <ArrowUpRight className="h-4 w-4" />
            <span>Sell Trade Net Proceeds</span>
          </div>
          <div className="mt-2 font-mono text-sm text-ink font-semibold">
            Net Proceeds = Gross Value - Commission - Tax - Fees
          </div>
          <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
            Charges reduce realized cash proceeds. Broker cash balance increases by Net Proceeds only. WAC per share of remaining holdings remains unchanged.
          </p>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="bg-surface/60 border border-edge rounded-xl overflow-hidden">
        <div className="p-4 border-b border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-accent-strong" />
              <span>Historical Stock Trades (stock_transactions)</span>
            </div>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Authoritative transaction log for executed DSE equity trades.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value)}
              className="bg-canvas border border-edge rounded-lg px-2.5 py-1.5 text-xs text-ink-soft focus:outline-none focus:border-accent"
            >
              <option value="all">All Tickers</option>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.symbol}
                </option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-canvas border border-edge rounded-lg px-2.5 py-1.5 text-xs text-ink-soft focus:outline-none focus:border-accent"
            >
              <option value="all">All Types</option>
              <option value="buy">Buy Only</option>
              <option value="sell">Sell Only</option>
            </select>
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-7 w-7 text-ink-faint mx-auto mb-2" />
            <div className="text-xs font-semibold text-ink-soft">No stock trades recorded</div>
            <p className="text-[11px] text-ink-faint mt-0.5">
              Click &quot;New Trade Order&quot; above to execute a trade.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas/60 text-ink-muted border-b border-edge text-[11px] font-mono uppercase">
                <tr>
                  <th className="py-3 px-4">Date / Ref</th>
                  <th className="py-3 px-4">BO Account</th>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Gross Value</th>
                  <th className="py-3 px-4 text-right">Comm & Fees</th>
                  <th className="py-3 px-4 text-right">Net Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60 text-ink-soft">
                {filteredTrades.map((tx) => {
                  const stock = stocks.find((s) => s.id === tx.stockId);
                  const boAcc = brokerAccounts.find((b) => b.id === tx.brokerAccountId);
                  const isBuy = tx.transactionType === 'buy';
                  const totalCharges = tx.commission + tx.tax + tx.otherCharges;

                  return (
                    <tr key={tx.id} className="hover:bg-raised/40 transition-colors">
                      {/* Date & Ref */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-ink-soft font-medium">{tx.tradeDate}</div>
                        <div className="text-[10px] text-ink-faint">{tx.reference || tx.id}</div>
                      </td>

                      {/* BO Account */}
                      <td className="py-3 px-4 font-mono text-[11px] text-ink-soft">
                        <div>{boAcc?.accountName || 'Primary BO'}</div>
                        <div className="text-[10px] text-ink-faint">BO: {boAcc?.boId}</div>
                      </td>

                      {/* Symbol */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-ink text-xs">{stock?.symbol || 'STOCK'}</div>
                        <div className="text-[10px] text-ink-muted">{stock?.companyName}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isBuy ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-positive/10 text-positive border border-positive/20 font-bold">
                            BUY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-negative/10 text-negative border border-negative/20 font-bold">
                            SELL
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-ink">
                        {tx.quantity.toLocaleString()}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right font-mono text-ink-soft">
                        ৳{tx.price.toFixed(2)}
                      </td>

                      {/* Gross Value */}
                      <td className="py-3 px-4 text-right font-mono text-ink-muted">
                        ৳{tx.grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Commission & Fees */}
                      <td className="py-3 px-4 text-right font-mono text-ink-muted">
                        <div>৳{totalCharges.toFixed(2)}</div>
                        <div className="text-[10px] text-ink-faint">
                          Comm: ৳{tx.commission} | Tax: ৳{tx.tax}
                        </div>
                      </td>

                      {/* Net Settlement Value */}
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={isBuy ? 'text-warning' : 'text-positive'}>
                          ৳{tx.netValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <div className="text-[10px] font-normal text-ink-faint">
                          {isBuy ? 'Cost Basis' : 'Net Proceeds'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Trade Order */}
      <Modal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        title={
          <span className="flex items-center gap-1.5">
            <span>Execute Stock Trade</span>
            <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 bg-accent/10 text-accent-strong border border-accent/20 rounded">
              Tax & Fee Engine
            </span>
          </span>
        }
        description="Dhaka Stock Exchange (DSE) Order Gateway"
        maxWidth="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        {formError && <ErrorBanner message={formError} className="mb-4" />}

        <form onSubmit={handleExecuteTrade} className="space-y-4">
              {/* Buy / Sell Toggle Buttons */}
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Order Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTradeTypeToggle('buy')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
                      tradeType === 'buy'
                        ? 'bg-accent-deep text-white border-accent shadow-md shadow-emerald-950'
                        : 'bg-canvas text-ink-muted border-edge hover:text-ink-soft'
                    }`}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    <span>BUY ORDER</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTradeTypeToggle('sell')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
                      tradeType === 'sell'
                        ? 'bg-rose-600 text-white border-negative shadow-md shadow-rose-950'
                        : 'bg-canvas text-ink-muted border-edge hover:text-ink-soft'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>SELL ORDER</span>
                  </button>
                </div>
              </div>

              {/* BO Account Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-ink-soft">
                    Beneficiary Owner (BO) Account *
                  </label>
                  <span className="text-[11px] font-mono text-sky-400">
                    Avail Cash: ৳{availableCash.toLocaleString()}
                  </span>
                </div>
                <Select
                  value={selectedBoAccountId}
                  onChange={(e) => setSelectedBoAccountId(e.target.value)}
                  className="font-mono"
                >
                  {brokerAccounts.map((bo) => {
                    const bal = brokerCashBalances.find((b) => b.brokerAccountId === bo.id);
                    return (
                      <option key={bo.id} value={bo.id}>
                        {bo.accountName} (BO: {bo.boId}) — Cash: ৳{(bal?.cashBalance || 0).toLocaleString()}
                      </option>
                    );
                  })}
                </Select>
              </div>

              {/* UX-2: Balance Context Panel — always-visible cash position */}
              <div
                className={`rounded-xl border p-3 transition-colors ${
                  hasBlockingIssue
                    ? 'bg-rose-950/40 border-negative/50'
                    : 'bg-canvas border-edge'
                }`}
              >
                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-edge/80">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-ink-faint">
                      ক্যাশ আছে (Now)
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-sky-300 mt-0.5">
                      ৳{availableCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-ink-faint">
                      {tradeType === 'buy' ? 'এই অর্ডারের খরচ' : 'নেট পাবেন'}
                    </div>
                    <div
                      className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${
                        tradeType === 'buy' ? 'text-warning' : 'text-positive'
                      }`}
                    >
                      {tradeType === 'buy' ? '−' : '+'}৳
                      {liveValues.netValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    {tradeType === 'sell' && (
                      <div className="text-[10px] font-mono text-ink-faint mt-0.5">
                        বিক্রির পর শেয়ার: {sharesAfterTrade.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-ink-faint">
                      অর্ডারের পর থাকবে
                    </div>
                    <div
                      className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${
                        cashAfterTrade < 0 ? 'text-negative' : 'text-ink'
                      }`}
                    >
                      ৳{cashAfterTrade.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                {hasInsufficientCash && (
                  <p className="mt-2 pt-2 border-t border-negative/30 text-[11px] text-negative leading-relaxed" role="alert">
                    ⚠️ পর্যাপ্ত ক্যাশ নেই — আছে ৳{availableCash.toLocaleString()}, দরকার ৳
                    {liveValues.netValue.toLocaleString()}। আগে এই BO-তে ক্যাশ ডিপোজিট করুন।
                  </p>
                )}
                {hasInsufficientShares && (
                  <p className="mt-2 pt-2 border-t border-negative/30 text-[11px] text-negative leading-relaxed" role="alert">
                    ⚠️ পর্যাপ্ত শেয়ার নেই — এই BO-তে আছে {availableSharesToSell.toLocaleString()}টি, বিক্রি করতে চাইছেন{' '}
                    {numQty.toLocaleString()}টি। শর্ট-সেলিং অনুমোদিত নয়।
                  </p>
                )}
              </div>

              {/* Security / Stock Selector */}
              {tradeType === 'sell' ? (
                /* SELL ORDER: HOLDINGS SELECTOR */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink-soft">
                      Select Stock to Sell (হোল্ডিংস থেকে নির্বাচন করুন) *
                    </label>
                    <span className="text-[11px] font-mono text-warning font-semibold">
                      Shares Held: {availableSharesToSell.toLocaleString()}
                    </span>
                  </div>

                  {holdingsInSelectedBo.length === 0 ? (
                    <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                        <span>এই বিও অ্যাকাউন্টে কোনো শেয়ার হোল্ডিং নেই</span>
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        শেয়ার বিক্রয় করার জন্য নির্বাচিত বিও অ্যাকাউন্টে শেয়ার থাকতে হবে। আপনি প্রথমে &apos;BUY ORDER&apos; দিয়ে শেয়ার কিনতে পারেন।
                      </p>
                      <button
                        type="button"
                        onClick={() => handleTradeTypeToggle('buy')}
                        className="mt-1 text-xs text-positive font-semibold underline hover:text-positive"
                      >
                        → Switch to Buy Order (বাই অর্ডারে যান)
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Held Stocks Quick-Pick Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {holdingsInSelectedBo.map((h) => {
                          const st = stocks.find((s) => s.id === h.stockId);
                          const isSel = h.stockId === selectedStockId;
                          return (
                            <button
                              key={h.stockId}
                              type="button"
                              onClick={() => {
                                setSelectedStockId(h.stockId);
                                if (st) {
                                  setTickerSearchInput(st.symbol);
                                  setPrice(st.currentPrice);
                                  handleFetchLiveTradePrice(st.symbol);
                                }
                                setQuantity(h.quantity);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                                isSel
                                  ? 'bg-negative/20 border-negative text-negative shadow-sm'
                                  : 'bg-canvas border-edge text-ink-soft hover:border-edge-strong'
                              }`}
                            >
                              <span className="font-bold text-ink">{st?.symbol || 'STOCK'}</span>
                              <span className="text-[10px] text-ink-muted">({h.quantity} sh)</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dropdown for held stocks */}
                      <Select
                        value={selectedStockId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedStockId(val);
                          const st = stocks.find((s) => s.id === val);
                          if (st) {
                            setTickerSearchInput(st.symbol);
                            setPrice(st.currentPrice);
                            handleFetchLiveTradePrice(st.symbol);
                          }
                          const h = holdingsInSelectedBo.find((hld) => hld.stockId === val);
                          if (h) setQuantity(h.quantity);
                        }}
                        className="font-mono"
                      >
                        {holdingsInSelectedBo.map((h) => {
                          const st = stocks.find((s) => s.id === h.stockId);
                          return (
                            <option key={h.stockId} value={h.stockId}>
                              {st?.symbol} — {st?.companyName} ({h.quantity} shares · WAC: ৳{h.weightedAverageCost.toFixed(2)})
                            </option>
                          );
                        })}
                      </Select>
                    </>
                  )}
                </div>
              ) : (
                /* BUY ORDER: SEARCHABLE INPUT + QUICK CHIPS + SELECT */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink-soft">
                      Security / Ticker Symbol *
                    </label>
                    {activeStock && (
                      <span className="text-[11px] font-mono text-accent-strong font-semibold">
                        LTP: ৳{activeStock.currentPrice}
                      </span>
                    )}
                  </div>

                  {/* Searchable input */}
                  <div className="relative">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        placeholder="Type ticker symbol e.g. GP, BATBC, SQURPHARMA..."
                        autoCapitalize="characters"
                        autoComplete="off"
                        value={tickerSearchInput}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setTickerSearchInput(val);
                          setIsTickerDropdownOpen(true);
                          const exact = stocks.find((s) => s.symbol.toUpperCase() === val.trim());
                          if (exact) {
                            setSelectedStockId(exact.id);
                            setPrice(exact.currentPrice);
                          }
                        }}
                        onFocus={() => setIsTickerDropdownOpen(true)}
                        className="w-full pl-3 pr-16 py-2 bg-canvas border border-edge rounded-lg text-xs text-ink font-mono uppercase tracking-wider focus:outline-none focus:border-accent"
                      />

                      <div className="absolute right-1.5 flex items-center gap-1">
                        {tickerSearchInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setTickerSearchInput('');
                              setIsTickerDropdownOpen(true);
                            }}
                            className="p-1 text-ink-faint hover:text-ink-soft rounded"
                            title="Clear ticker search"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsTickerDropdownOpen(!isTickerDropdownOpen)}
                          className="p-1 text-ink-muted hover:text-ink rounded"
                          title="Toggle securities list"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dropdown Options */}
                    {isTickerDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-surface border border-edge rounded-xl shadow-2xl z-50 divide-y divide-edge/60">
                        {filteredStocksForTrade.length === 0 ? (
                          <div className="p-3 text-center text-xs text-ink-muted">
                            No matched security found for &quot;{tickerSearchInput}&quot;
                          </div>
                        ) : (
                          filteredStocksForTrade.map((o) => {
                            const isSelected = o.stockId !== null && o.stockId === selectedStockId;
                            return (
                              <button
                                key={o.stockId || `mkt-${o.symbol}`}
                                type="button"
                                onClick={() => selectTradeOption(o)}
                                className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors hover:bg-raised/80 ${
                                  isSelected ? 'bg-accent/10 text-accent-strong font-medium' : 'text-ink-soft'
                                }`}
                              >
                                <div>
                                  <span className="font-mono font-bold text-ink mr-2">{o.symbol}</span>
                                  <span className="text-[11px] text-ink-muted truncate">{o.companyName}</span>
                                </div>
                                {o.currentPrice !== null ? (
                                  <span className="font-mono text-accent-strong text-[11px] shrink-0 ml-2">
                                    LTP: ৳{o.currentPrice}
                                  </span>
                                ) : (
                                  <span className="font-mono text-sky-400/80 text-[10px] shrink-0 ml-2 border border-sky-500/30 rounded px-1">
                                    DSE
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Native dropdown selector (Mobile Friendly Fallback) */}
                  <Field label="Or select from DSE Securities list:">
                    <Select
                      value={selectedStockId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('mkt:')) {
                          const sym = val.slice(4);
                          const opt = allTradeOptions.find((o) => o.stockId === null && o.symbol === sym);
                          if (opt) selectTradeOption(opt);
                        } else {
                          handleStockChange(val);
                        }
                      }}
                      className="font-mono"
                    >
                      {allTradeOptions.map((o) => (
                        <option key={o.stockId || `mkt-${o.symbol}`} value={o.stockId || `mkt:${o.symbol}`}>
                          {o.symbol} — {o.companyName}{o.currentPrice !== null ? ` (৳${o.currentPrice})` : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}

              {/* Active Stock Information Card */}
              {activeStock && (
                <div className="p-2.5 bg-canvas/80 border border-edge/80 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-ink font-mono flex items-center gap-1.5">
                      <span>{activeStock.symbol}</span>
                      <span className="text-[10px] text-ink-muted font-normal truncate max-w-[150px] sm:max-w-xs">
                        {activeStock.companyName}
                      </span>
                    </div>
                    <div className="text-[10px] text-ink-faint">
                      Sector: {activeStock.sector} · Cat: {activeStock.category || 'A'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-accent-strong font-bold">
                      LTP: ৳{activeStock.currentPrice}
                    </div>
                    {livePriceFeedback && (
                      <div className="text-[10px] text-sky-400 animate-pulse">{livePriceFeedback}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Quantity & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-ink-soft">
                      Quantity (Shares) *
                    </label>
                    {tradeType === 'sell' && availableSharesToSell > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQuantity(availableSharesToSell)}
                          className="text-[10px] text-negative hover:text-negative font-mono underline"
                        >
                          All ({availableSharesToSell})
                        </button>
                        <span className="text-ink-faint">·</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.floor(availableSharesToSell / 2))}
                          className="text-[10px] text-negative hover:text-negative font-mono underline"
                        >
                          50%
                        </button>
                      </div>
                    ) : tradeType === 'buy' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQuantity(100)}
                          className="text-[10px] text-positive hover:text-positive font-mono underline"
                        >
                          100
                        </button>
                        <span className="text-ink-faint">·</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(500)}
                          className="text-[10px] text-positive hover:text-positive font-mono underline"
                        >
                          500
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-ink-soft">
                      Price per Share (BDT) *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleFetchLiveTradePrice()}
                      disabled={isRefreshingLivePrice}
                      className="text-[10px] text-accent-strong hover:text-accent-strong flex items-center gap-1 font-mono transition-colors disabled:opacity-50"
                      title="Fetch live LTP from StockChartBD"
                    >
                      {isRefreshingLivePrice ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      <span>{livePriceFeedback || 'Live Sync'}</span>
                    </button>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Fee Structure */}
              <div className="p-3 bg-canvas/70 border border-edge rounded-xl space-y-3">
                <div className="text-[11px] font-mono uppercase text-ink-muted font-semibold flex items-center justify-between">
                  <span>Transaction Charges & Regulatory Taxes</span>
                  <span className="text-accent-strong font-normal">DSE Regulatory</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Field label="Commission (%)">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={commissionRatePct}
                      onChange={(e) =>
                        setCommissionRatePct(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="font-mono"
                    />
                  </Field>
                  <Field label="AIT Tax (BDT)">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={taxAmount}
                      onChange={(e) =>
                        setTaxAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="font-mono"
                    />
                  </Field>
                  <Field label="CDBL/Other (BDT)">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={otherCharges}
                      onChange={(e) =>
                        setOtherCharges(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="font-mono"
                    />
                  </Field>
                </div>

                {/* Real-time Calculation Breakdown */}
                <div className="pt-2 border-t border-edge/80 space-y-1 text-xs">
                  <div className="flex justify-between text-ink-muted">
                    <span>Gross Value ({numQty} × ৳{numPrice}):</span>
                    <span className="font-mono text-ink">৳{liveValues.grossValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Brokerage Commission:</span>
                    <span className="font-mono text-ink-soft">
                      {tradeType === 'buy' ? '+' : '-'}৳{liveValues.commission.toFixed(2)}
                    </span>
                  </div>
                  {liveValues.tax > 0 && (
                    <div className="flex justify-between text-ink-muted">
                      <span>Advance Income Tax (AIT):</span>
                      <span className="font-mono text-ink-soft">
                        {tradeType === 'buy' ? '+' : '-'}৳{liveValues.tax.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {liveValues.otherCharges > 0 && (
                    <div className="flex justify-between text-ink-muted">
                      <span>Exchange / CDBL Fees:</span>
                      <span className="font-mono text-ink-soft">
                        {tradeType === 'buy' ? '+' : '-'}৳{liveValues.otherCharges.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-edge flex justify-between font-bold text-sm">
                    <span className="text-ink">
                      {tradeType === 'buy' ? 'Total Cost Basis (Cash Outflow):' : 'Net Proceeds (Cash Inflow):'}
                    </span>
                    <span
                      className={`font-mono ${
                        tradeType === 'buy' ? 'text-warning' : 'text-positive'
                      }`}
                    >
                      ৳{liveValues.netValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trade Date & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Trade Date">
                  <Input
                    type="date"
                    required
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="font-mono"
                  />
                </Field>
                <Field label="Order Reference / Broker Slip">
                  <Input
                    type="text"
                    placeholder="e.g. BRAC-EPL-ORD-004"
                    value={tradeReference}
                    onChange={(e) => setTradeReference(e.target.value)}
                  />
                </Field>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-edge">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTradeModalOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={
                    (tradeType === 'buy' && (availableCash < liveValues.netValue || !selectedStockId)) ||
                    (tradeType === 'sell' && (availableSharesToSell < numQty || availableSharesToSell <= 0 || !selectedStockId))
                  }
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-center ${
                    tradeType === 'buy'
                      ? 'bg-accent-deep hover:bg-accent text-white'
                      : 'bg-rose-600 hover:bg-negative text-white'
                  }`}
                >
                  {tradeType === 'buy' ? 'Confirm Buy Order' : 'Confirm Sell Order'}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
};
