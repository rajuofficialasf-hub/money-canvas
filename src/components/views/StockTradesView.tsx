import React, { useState, useMemo } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { StockTransaction, StockTransactionType, Stock } from '../../types/accounting';
import { calculateTradeValues } from '../../lib/accounting-engine';
import { fetchDseSingleQuote } from '../../lib/dse-market-service';
import {
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  Plus,
  Coins,
  Building2,
  Calendar,
  Percent,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Loader2,
  Sparkles,
  Search,
  ChevronDown,
} from 'lucide-react';

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
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tradeReference, setTradeReference] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Selected Stock & BO Details
  const activeStock = stocks.find((s) => s.id === selectedStockId);
  const activeBo = brokerAccounts.find((b) => b.id === selectedBoAccountId);
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

  const filteredStocksForTrade = useMemo(() => {
    const term = tickerSearchInput.trim().toUpperCase();
    if (!term) return stocks;
    return stocks.filter(
      (s) =>
        s.symbol.toUpperCase().includes(term) ||
        s.companyName.toUpperCase().includes(term)
    );
  }, [stocks, tickerSearchInput]);

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

  // Automatically adjust default AIT tax when toggling between buy/sell
  const handleTradeTypeToggle = (type: StockTransactionType) => {
    setTradeType(type);
    if (type === 'sell') {
      // DSE Advance Income Tax is typically 0.05% of gross trade value
      const gross = numQty * numPrice;
      const defaultTax = Math.round(gross * 0.003 * 100) / 100; // approximate DSE AIT / Hawla
      setTaxAmount(defaultTax);
    } else {
      setTaxAmount(0);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Stock Trade Execution</h1>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
              Automated Charges & Tax
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Execute Buy and Sell trades on Dhaka Stock Exchange (DSE). All commissions, taxes, and fees are capitalized into Buy Cost Basis or deducted from Sell Net Proceeds.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onNavigateToPortfolio}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Coins className="h-3.5 w-3.5 text-emerald-400" />
            <span>Portfolio & WAC</span>
          </button>
          <button
            onClick={onNavigateToBrokerage}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5 text-sky-400" />
            <span>Broker Cash Ledger</span>
          </button>
          <button
            onClick={() => {
              setFormError('');
              setIsTradeModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-950 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Trade Order</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Trade Principles Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buy Invariant Card */}
        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase">
            <ArrowDownRight className="h-4 w-4" />
            <span>Buy Trade Cost Basis</span>
          </div>
          <div className="mt-2 font-mono text-sm text-white font-semibold">
            Cost Basis = Gross Value + Commission + Tax + Fees
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            All acquisition expenses are capitalized. Broker cash balance decreases by the total Cost Basis. Increases WAC pool proportionally.
          </p>
        </div>

        {/* Sell Invariant Card */}
        <div className="bg-slate-900/60 border border-sky-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-mono font-bold uppercase">
            <ArrowUpRight className="h-4 w-4" />
            <span>Sell Trade Net Proceeds</span>
          </div>
          <div className="mt-2 font-mono text-sm text-white font-semibold">
            Net Proceeds = Gross Value - Commission - Tax - Fees
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Charges reduce realized cash proceeds. Broker cash balance increases by Net Proceeds only. WAC per share of remaining holdings remains unchanged.
          </p>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Historical Stock Trades (stock_transactions)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authoritative transaction log for executed DSE equity trades.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
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
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="buy">Buy Only</option>
              <option value="sell">Sell Only</option>
            </select>
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-7 w-7 text-slate-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-300">No stock trades recorded</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click &quot;New Trade Order&quot; above to execute a trade.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] font-mono uppercase">
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
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredTrades.map((tx) => {
                  const stock = stocks.find((s) => s.id === tx.stockId);
                  const boAcc = brokerAccounts.find((b) => b.id === tx.brokerAccountId);
                  const isBuy = tx.transactionType === 'buy';
                  const totalCharges = tx.commission + tx.tax + tx.otherCharges;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Date & Ref */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-slate-200 font-medium">{tx.tradeDate}</div>
                        <div className="text-[10px] text-slate-500">{tx.reference || tx.id}</div>
                      </td>

                      {/* BO Account */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        <div>{boAcc?.accountName || 'Primary BO'}</div>
                        <div className="text-[10px] text-slate-500">BO: {boAcc?.boId}</div>
                      </td>

                      {/* Symbol */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">{stock?.symbol || 'STOCK'}</div>
                        <div className="text-[10px] text-slate-400">{stock?.companyName}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isBuy ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            BUY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                            SELL
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                        {tx.quantity.toLocaleString()}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right font-mono text-slate-200">
                        ৳{tx.price.toFixed(2)}
                      </td>

                      {/* Gross Value */}
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ৳{tx.grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Commission & Fees */}
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        <div>৳{totalCharges.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">
                          Comm: ৳{tx.commission} | Tax: ৳{tx.tax}
                        </div>
                      </td>

                      {/* Net Settlement Value */}
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={isBuy ? 'text-amber-400' : 'text-emerald-400'}>
                          ৳{tx.netValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <div className="text-[10px] font-normal text-slate-500">
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
      {isTradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Execute Stock Trade</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                    Tax & Fee Engine
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Dhaka Stock Exchange (DSE) Order Gateway</p>
              </div>
              <button
                onClick={() => setIsTradeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleExecuteTrade} className="space-y-4">
              {/* Buy / Sell Toggle Buttons */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Order Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTradeTypeToggle('buy')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
                      tradeType === 'buy'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
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
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
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
                  <label className="text-xs font-medium text-slate-300">
                    Beneficiary Owner (BO) Account *
                  </label>
                  <span className="text-[11px] font-mono text-sky-400">
                    Avail Cash: ৳{availableCash.toLocaleString()}
                  </span>
                </div>
                <select
                  value={selectedBoAccountId}
                  onChange={(e) => setSelectedBoAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {brokerAccounts.map((bo) => {
                    const bal = brokerCashBalances.find((b) => b.brokerAccountId === bo.id);
                    return (
                      <option key={bo.id} value={bo.id}>
                        {bo.accountName} (BO: {bo.boId}) — Cash: ৳{(bal?.cashBalance || 0).toLocaleString()}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Security / Stock Selector - Searchable input that opens virtual keyboard on click */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Security / Ticker *
                  </label>
                  {tradeType === 'sell' && (
                    <span className="text-[11px] font-mono text-amber-400">
                      Shares Held in BO: {availableSharesToSell.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="Type ticker symbol e.g. GP, BATBC, BEXIMCO..."
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
                    className="w-full pl-3 pr-16 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-emerald-500"
                  />

                  <div className="absolute right-1.5 flex items-center gap-1">
                    {tickerSearchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setTickerSearchInput('');
                          setIsTickerDropdownOpen(true);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-300 rounded"
                        title="Clear ticker search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsTickerDropdownOpen(!isTickerDropdownOpen)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Toggle securities list"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dropdown Options */}
                {isTickerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 divide-y divide-slate-800/60">
                    {filteredStocksForTrade.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No matched security found for &quot;{tickerSearchInput}&quot;
                      </div>
                    ) : (
                      filteredStocksForTrade.map((s) => {
                        const isSelected = s.id === selectedStockId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => selectStockByObj(s)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors hover:bg-slate-800/80 ${
                              isSelected ? 'bg-emerald-500/10 text-emerald-300 font-medium' : 'text-slate-300'
                            }`}
                          >
                            <div>
                              <span className="font-mono font-bold text-white mr-2">{s.symbol}</span>
                              <span className="text-[11px] text-slate-400 truncate">{s.companyName}</span>
                            </div>
                            <span className="font-mono text-emerald-400 text-[11px] shrink-0 ml-2">
                              LTP: ৳{s.currentPrice}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Quantity & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Quantity (Shares) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      Price per Share (BDT) *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleFetchLiveTradePrice()}
                      disabled={isRefreshingLivePrice}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition-colors disabled:opacity-50"
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
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Fee Structure */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center justify-between">
                  <span>Transaction Charges & Regulatory Taxes</span>
                  <span className="text-emerald-400 font-normal">DSE Regulatory</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Commission (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={commissionRatePct}
                      onChange={(e) =>
                        setCommissionRatePct(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      AIT Tax (BDT)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={taxAmount}
                      onChange={(e) =>
                        setTaxAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      CDBL/Other (BDT)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={otherCharges}
                      onChange={(e) =>
                        setOtherCharges(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Real-time Calculation Breakdown */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross Value ({numQty} × ৳{numPrice}):</span>
                    <span className="font-mono text-white">৳{liveValues.grossValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Brokerage Commission:</span>
                    <span className="font-mono text-slate-300">
                      {tradeType === 'buy' ? '+' : '-'}৳{liveValues.commission.toFixed(2)}
                    </span>
                  </div>
                  {liveValues.tax > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Advance Income Tax (AIT):</span>
                      <span className="font-mono text-slate-300">
                        {tradeType === 'buy' ? '+' : '-'}৳{liveValues.tax.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {liveValues.otherCharges > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Exchange / CDBL Fees:</span>
                      <span className="font-mono text-slate-300">
                        {tradeType === 'buy' ? '+' : '-'}৳{liveValues.otherCharges.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-sm">
                    <span className="text-white">
                      {tradeType === 'buy' ? 'Total Cost Basis (Cash Outflow):' : 'Net Proceeds (Cash Inflow):'}
                    </span>
                    <span
                      className={`font-mono ${
                        tradeType === 'buy' ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      ৳{liveValues.netValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation Warning Safeguards */}
              {tradeType === 'buy' && availableCash < liveValues.netValue && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Insufficient cash balance. Available: ৳{availableCash.toLocaleString()}, Required: ৳{liveValues.netValue.toLocaleString()}. Please deposit cash before submitting.
                  </span>
                </div>
              )}

              {tradeType === 'sell' && availableSharesToSell < numQty && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Insufficient shares held. Available in this BO: {availableSharesToSell.toLocaleString()} shares, Requested: {numQty.toLocaleString()} shares. Short selling is prohibited.
                  </span>
                </div>
              )}

              {/* Trade Date & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Trade Date
                  </label>
                  <input
                    type="date"
                    required
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Order Reference / Broker Slip
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BRAC-EPL-ORD-004"
                    value={tradeReference}
                    onChange={(e) => setTradeReference(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTradeModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    (tradeType === 'buy' && availableCash < liveValues.netValue) ||
                    (tradeType === 'sell' && availableSharesToSell < numQty)
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    tradeType === 'buy'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {tradeType === 'buy' ? 'Confirm Buy Order' : 'Confirm Sell Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
