import { todayLocalISO } from '../../lib/date-utils';
import React, { useState, useEffect, useRef } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { Stock } from '../../types/accounting';
import {
  generateDsePriceCsv,
  fetchDseCompanyList,
  fetchDseSingleQuote,
  getCachedDseCompanies,
  DseCompanyItem,
} from '../../lib/dse-market-service';
import {
  TrendingUp,
  Building2,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertCircle,
  Coins,
  ArrowUpRight,
  Sliders,
  CheckCircle2,
  Activity,
  FileSpreadsheet,
  Download,
  Upload,
  Globe,
  Edit3,
  SlidersHorizontal,
  Check,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Modal, Field, Input, Select, Button, StatCard, ErrorBanner } from '../ui';

const TakaPrefix: React.FC<{ className?: string }> = () => (
  <span className="font-mono text-xs">৳</span>
);

interface StockPortfolioViewProps {
  onNavigateToTrades?: (stockId?: string) => void;
  onNavigateToBrokerage?: () => void;
  onNavigateToPerformance?: () => void;
  onNavigateToDividends?: () => void;
  onNavigateToReports?: () => void;
}

export const StockPortfolioView: React.FC<StockPortfolioViewProps> = ({
  onNavigateToTrades,
  onNavigateToBrokerage,
  onNavigateToPerformance,
  onNavigateToDividends,
  onNavigateToReports,
}) => {
  const {
    stocks,
    stockHoldings,
    brokerAccounts,
    brokerCashBalances,
    updateStockPrice,
    addCustomStock,
    deleteStock,
    clearUnusedStocks,
    dseSyncStatus,
    syncDsePrices,
    batchUpdateStockPrices,
    importDseCsvPrices,
    toggleDseManualMode,
  } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  
  // Modals
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isBatchPriceModalOpen, setIsBatchPriceModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  
  const [selectedStockForPrice, setSelectedStockForPrice] = useState<Stock | null>(null);
  const [newSimulatedPrice, setNewSimulatedPrice] = useState<number | ''>('');
  const [, setSingleStockYcp] = useState<number | ''>('');

  // Catalog feedback toast
  const [catalogToast, setCatalogToast] = useState<{ text: string; isError?: boolean } | null>(null);

  // Batch Editor state
  const [batchDraft, setBatchDraft] = useState<Record<string, number>>({});
  const [batchSearch, setBatchSearch] = useState('');

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [csvFeedback, setCsvFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Sync notice state
  const [syncNotice, setSyncNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);

  // Add stock form state
  const [symbol, setSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('Telecommunication');
  const [exchange, setExchange] = useState<'DSE' | 'CSE'>('DSE');
  const [initialPrice, setInitialPrice] = useState<number | ''>(100);
  const [category, setCategory] = useState('A');
  const [formError, setFormError] = useState('');
  const [allCompanies, setAllCompanies] = useState<DseCompanyItem[]>(() => getCachedDseCompanies());
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [apiSyncBadge, setApiSyncBadge] = useState<{ text: string; isLive: boolean } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  // Load companies list on component mount
  useEffect(() => {
    fetchDseCompanyList().then((list) => {
      if (list && list.length > 0) {
        setAllCompanies(list);
      }
    });
  }, []);

  // Fetch quote live when symbol is typed or selected
  const fetchAndApplyLiveStock = async (ticker: string) => {
    const sym = ticker.toUpperCase().trim();
    if (!sym || sym.length < 2) return;

    setIsFetchingQuote(true);
    setApiSyncBadge({ text: `Fetching live data for ${sym} from StockChartBD...`, isLive: false });

    try {
      const quote = await fetchDseSingleQuote(sym);
      if (quote) {
        setCompanyName(quote.companyName || sym);
        if (quote.sector) setSector(quote.sector);
        if (quote.category) setCategory(quote.category);
        if (quote.ltp > 0) setInitialPrice(quote.ltp);
        setApiSyncBadge({
          text: `Live DSE Price: Tk ${quote.ltp.toFixed(2)} · YCP: Tk ${(quote.ycp ?? quote.ltp).toFixed(2)} (${quote.changePct ? (quote.changePct >= 0 ? '+' : '') + quote.changePct.toFixed(2) + '%' : '0.00%'})`,
          isLive: true,
        });
      } else {
        setApiSyncBadge({ text: `No live quote found for ${sym}. You can enter details manually.`, isLive: false });
      }
    } catch (err) {
      setApiSyncBadge({ text: `Could not reach live API. Entered details manually.`, isLive: false });
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const handleSymbolInput = (val: string) => {
    const sym = val.toUpperCase().trim();
    setSymbol(sym);
    setShowSuggestions(true);

    // Auto-match company details immediately if in cache
    const matched = allCompanies.find((c) => c.symbol === sym);
    if (matched) {
      setCompanyName(matched.name);
      if (matched.sector) setSector(matched.sector);
      if (matched.category) setCategory(matched.category);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (sym.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchAndApplyLiveStock(sym);
      }, 450);
    } else {
      setApiSyncBadge(null);
    }
  };

  const handleSelectCompany = (comp: DseCompanyItem) => {
    setSymbol(comp.symbol);
    setCompanyName(comp.name);
    if (comp.sector) setSector(comp.sector);
    if (comp.category) setCategory(comp.category);
    setShowSuggestions(false);
    fetchAndApplyLiveStock(comp.symbol);
  };

  // Portfolio metrics
  const totalMarketValue = stockHoldings.reduce((sum, h) => sum + (h.marketValue ?? h.currentMarketValue), 0);
  const totalCostBasis = stockHoldings.reduce((sum, h) => sum + (h.totalCostBasis ?? h.investedValue), 0);
  const totalUnrealizedGain = totalMarketValue - totalCostBasis;
  const totalUnrealizedGainPct =
    totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0;

  const totalBrokerCash = brokerCashBalances.reduce((sum, b) => sum + b.cashBalance, 0);
  const totalEquityAndCash = totalMarketValue + totalBrokerCash;

  // Sectors list
  const sectors = ['all', ...Array.from(new Set(stocks.map((s) => s.sector)))];

  // Filtered holdings
  const filteredHoldings = stockHoldings.filter((h) => {
    const stock = stocks.find((s) => s.id === h.stockId);
    if (!stock) return false;
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === 'all' || stock.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const handleOpenPriceModal = (stock: Stock) => {
    setSelectedStockForPrice(stock);
    setNewSimulatedPrice(stock.currentPrice);
    setSingleStockYcp(stock.ycp ?? stock.currentPrice);
    setIsPriceModalOpen(true);
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForPrice) return;
    const priceNum = typeof newSimulatedPrice === 'number' ? newSimulatedPrice : 0;
    if (priceNum <= 0) return;
    updateStockPrice(selectedStockForPrice.id, priceNum);
    setIsPriceModalOpen(false);
    setSyncNotice({
      type: 'success',
      text: `Price for ${selectedStockForPrice.symbol} updated to ৳${priceNum.toFixed(2)} (Manual override saved).`,
    });
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const handleTriggerSync = async () => {
    setIsSyncingLocal(true);
    setSyncNotice({ type: 'info', text: 'Connecting to StockChartBD & DSE market feeds...' });
    const res = await syncDsePrices();
    setIsSyncingLocal(false);
    setSyncNotice({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    setTimeout(() => setSyncNotice(null), 5000);
  };

  const handleOpenBatchModal = () => {
    const draft: Record<string, number> = {};
    stocks.forEach((s) => {
      draft[s.id] = s.currentPrice;
    });
    setBatchDraft(draft);
    setIsBatchPriceModalOpen(true);
  };

  const handleSaveBatchPrices = () => {
    const updates: Array<{ stockId: string; price: number }> = [];
    Object.entries(batchDraft).forEach(([stockId, price]) => {
      if (typeof price === 'number' && price > 0) {
        updates.push({ stockId, price });
      }
    });

    if (updates.length > 0) {
      batchUpdateStockPrices(updates);
      setSyncNotice({
        type: 'success',
        text: `Bulk updated ${updates.length} stock prices. Valuations recalculated.`,
      });
      setTimeout(() => setSyncNotice(null), 4000);
    }
    setIsBatchPriceModalOpen(false);
  };

  const handleImportCsv = () => {
    if (!csvText.trim()) {
      setCsvFeedback({ success: false, message: 'Please paste or load CSV content first.' });
      return;
    }
    const res = importDseCsvPrices(csvText);
    setCsvFeedback(res);
    if (res.success) {
      setTimeout(() => {
        setIsCsvModalOpen(false);
        setCsvText('');
        setCsvFeedback(null);
      }, 1800);
    }
  };

  const handleDownloadPriceSheet = () => {
    const csvData = generateDsePriceCsv(stocks);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dse_market_prices_${todayLocalISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!symbol.trim() || !companyName.trim()) {
      setFormError('Please enter both symbol and company name.');
      return;
    }
    const cleanSym = symbol.trim().toUpperCase();
    if (stocks.some((s) => s.symbol.toUpperCase() === cleanSym)) {
      setFormError(`Stock symbol "${cleanSym}" already exists in the catalog.`);
      return;
    }
    const priceNum = typeof initialPrice === 'number' ? initialPrice : 0;
    if (priceNum <= 0) {
      setFormError('Price must be greater than zero.');
      return;
    }

    addCustomStock({
      symbol: cleanSym,
      companyName: companyName.trim(),
      sector,
      exchange,
      currentPrice: priceNum,
      ycp: priceNum,
      category,
      priceSource: 'manual',
      isActive: true,
    });

    setSymbol('');
    setCompanyName('');
    setInitialPrice(100);
    setIsAddStockModalOpen(false);
  };

  const handleDeleteStock = (stk: Stock) => {
    const res = deleteStock(stk.id);
    if (res.success) {
      setCatalogToast({ text: res.message, isError: false });
    } else {
      setCatalogToast({ text: res.message, isError: true });
    }
    setTimeout(() => setCatalogToast(null), 4000);
  };

  const handleClearUnused = () => {
    const removed = clearUnusedStocks();
    if (removed > 0) {
      setCatalogToast({ text: `${removed} unused stock(s) removed. Watchlist is now clean.`, isError: false });
    } else {
      setCatalogToast({ text: `No unused stocks found to remove.`, isError: false });
    }
    setTimeout(() => setCatalogToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">Stock Portfolio & WAC Holdings</h1>
            <span className="text-[10px] bg-accent/10 text-accent-strong font-mono px-2 py-0.5 rounded border border-accent/20">
              DSE Live & Offline Resilient
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Real-time DSE equity holdings calculated using Weighted Average Cost (WAC) with Lock 4 cost basis and authoritative broker cash views.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddStockModalOpen(true)}
            className="px-3 py-2 bg-surface border border-edge hover:border-slate-700 text-ink-soft rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-accent-strong" />
            <span>Add Security</span>
          </button>
          <button
            onClick={onNavigateToBrokerage}
            className="px-3 py-2 bg-surface border border-edge hover:border-slate-700 text-ink-soft rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
            <span>Brokerage Accounts</span>
          </button>
          {onNavigateToPerformance && (
            <button
              onClick={onNavigateToPerformance}
              className="px-3 py-2 bg-indigo-950/60 border border-indigo-700/60 hover:border-indigo-500 text-indigo-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              <span>XIRR & TWR</span>
            </button>
          )}
          {onNavigateToDividends && (
            <button
              onClick={onNavigateToDividends}
              className="px-3 py-2 bg-amber-950/60 border border-amber-700/60 hover:border-warning text-amber-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Coins className="h-3.5 w-3.5 text-warning" />
              <span>Dividends</span>
            </button>
          )}
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="px-3 py-2 bg-surface border border-edge hover:border-slate-700 text-ink-soft rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-accent-strong" />
              <span>Reports</span>
            </button>
          )}
          <Button
            onClick={() => onNavigateToTrades && onNavigateToTrades()}
            variant="primary"
            icon={ArrowUpRight}
          >
            Execute Trade
          </Button>
        </div>
      </div>

      {/* DSE Live Market Feed & Multi-tier Synchronization Bar */}
      <div className="bg-surface/80 border border-edge rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${dseSyncStatus.isManualOnly ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-accent/10 text-accent-strong border border-accent/20'}`}>
                {dseSyncStatus.isManualOnly ? <SlidersHorizontal className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">
                    {dseSyncStatus.isManualOnly ? 'Manual Price Mode' : 'StockChartBD & DSE Market Feed'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    dseSyncStatus.isManualOnly
                      ? 'bg-amber-950 text-warning border border-amber-800'
                      : dseSyncStatus.status === 'syncing' || isSyncingLocal
                      ? 'bg-sky-950 text-sky-300 border border-sky-800 animate-pulse'
                      : dseSyncStatus.status === 'success'
                      ? 'bg-emerald-950 text-accent-strong border border-emerald-800'
                      : 'bg-raised text-ink-muted'
                  }`}>
                    {dseSyncStatus.isManualOnly
                      ? 'MANUAL ACTIVE'
                      : isSyncingLocal
                      ? 'SYNCING...'
                      : dseSyncStatus.source === 'stockchartbd_api'
                      ? 'API CONNECTED'
                      : dseSyncStatus.source === 'fallback_feed'
                      ? 'BACKUP FEED'
                      : 'OFFLINE / CACHED'}
                  </span>
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1.5">
                  <span>
                    {dseSyncStatus.lastSyncedAt
                      ? `Last updated: ${new Date(dseSyncStatus.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                      : 'Not synced yet'}
                  </span>
                  <span>•</span>
                  <span className="text-ink-faint">{stocks.length} tracked tickers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sync & Manual Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Manual / Auto */}
            <button
              onClick={() => toggleDseManualMode(!dseSyncStatus.isManualOnly)}
              title="Switch between automatic API sync and pure manual price management"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                dseSyncStatus.isManualOnly
                  ? 'bg-amber-950/40 border-amber-700/60 text-amber-200 hover:bg-amber-900/50'
                  : 'bg-canvas border-edge text-ink-soft hover:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-warning" />
              <span>{dseSyncStatus.isManualOnly ? 'Switch to Auto API' : 'Manual Override'}</span>
            </button>

            {/* Sync Now Button */}
            {!dseSyncStatus.isManualOnly && (
              <button
                onClick={handleTriggerSync}
                disabled={isSyncingLocal}
                className="px-3 py-1.5 bg-accent-deep/20 hover:bg-accent-deep/30 border border-accent/30 text-accent-strong rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingLocal ? 'animate-spin' : ''}`} />
                <span>{isSyncingLocal ? 'Syncing...' : 'Sync Live Prices'}</span>
              </button>
            )}

            {/* Bulk Price Editor */}
            <button
              onClick={handleOpenBatchModal}
              className="px-3 py-1.5 bg-canvas border border-edge hover:border-slate-700 text-ink-soft rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-sky-400" />
              <span>Bulk Price Editor</span>
            </button>

            {/* CSV Import/Export */}
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="px-3 py-1.5 bg-canvas border border-edge hover:border-slate-700 text-ink-soft rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-accent-strong" />
              <span>CSV Sheet</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Notification */}
        {syncNotice && (
          <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
            syncNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-accent-strong'
              : syncNotice.type === 'error'
              ? 'bg-rose-950/40 border-rose-800/60 text-negative'
              : 'bg-sky-950/40 border-sky-800/60 text-sky-300'
          }`}>
            {syncNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-strong" />
            ) : syncNotice.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-negative" />
            ) : (
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-sky-400" />
            )}
            <span>{syncNotice.text}</span>
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Market Value */}
        <StatCard
          title="Portfolio Market Value"
          value={`৳${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`Invested Cost: ৳${totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Coins}
          variant="default"
        />

        {/* Unrealized Gain / Loss */}
        <StatCard
          title="Unrealized Gain / Loss"
          value={`${totalUnrealizedGain >= 0 ? '+' : ''}৳${totalUnrealizedGain.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={TrendingUp}
          variant={totalUnrealizedGain >= 0 ? 'emerald' : 'rose'}
          trend={{
            value: `${totalUnrealizedGain >= 0 ? '+' : ''}${totalUnrealizedGainPct.toFixed(2)}% ROI`,
            isPositive: totalUnrealizedGain >= 0,
          }}
        />

        {/* Broker Cash Reserves */}
        <StatCard
          title="Available Broker Cash"
          value={`৳${totalBrokerCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-accent-strong" />
              <span>v_broker_cash_balance sub-ledger</span>
            </span>
          }
          icon={Building2}
          variant="sky"
        />

        {/* Total Equity & Cash */}
        <StatCard
          title="Total Capital Committed"
          value={`৳${totalEquityAndCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${stockHoldings.length} Active Positions · ${brokerAccounts.length} BO Accounts`}
          icon={DollarSign}
          variant="default"
        />
      </div>

      {/* Lock 4 & WAC Invariant Explanation Box */}
      <div className="p-3.5 bg-surface/80 border border-accent/20 rounded-xl flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-accent-strong shrink-0 mt-0.5" />
        <div className="text-xs text-ink-soft leading-relaxed">
          <span className="font-semibold text-ink">Resilient Price Architecture:</span> Stock prices can be synced in real-time from StockChartBD or manually adjusted anytime. In all cases, buy trade charges are capitalized into WAC cost basis (<code className="text-accent-strong font-mono text-[11px]">Cost Basis = Gross + Charges</code>) and realized gains follow strict weighted cost standards.
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface/40 p-3 rounded-xl border border-edge">
        <div className="flex-1 max-w-md">
          <Input
            icon={Search}
            type="text"
            placeholder="Search stock by symbol or company name (e.g. GP, SQURPHARMA, BATBC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-muted">Sector:</label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-canvas border border-edge rounded-lg px-2.5 py-1.5 text-xs text-ink-soft focus:outline-none focus:border-accent"
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'all' ? 'All Sectors' : sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-surface/60 border border-edge rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
          <div className="text-xs font-semibold text-ink flex items-center gap-2">
            <span>Authoritative Equity Holdings (v_stock_holdings)</span>
            <span className="text-[10px] font-mono text-ink-muted">({filteredHoldings.length} securities)</span>
          </div>
          <div className="text-[11px] text-ink-muted flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent"></span>
            <span>Real-time WAC valuation</span>
          </div>
        </div>

        {filteredHoldings.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-ink-soft">No active stock positions found</div>
            <p className="text-xs text-ink-faint max-w-sm mx-auto mt-1">
              Either all shares have been closed out, or no matching trade has been executed yet.
            </p>
            <Button
              onClick={() => onNavigateToTrades && onNavigateToTrades()}
              variant="primary"
              size="sm"
              icon={Plus}
              className="mt-4"
            >
              Execute Buy Order
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas/60 text-ink-muted border-b border-edge text-[11px] font-mono uppercase">
                <tr>
                  <th className="py-3 px-4">Symbol / Company</th>
                  <th className="py-3 px-4">BO Account</th>
                  <th className="py-3 px-4 text-right">Shares Held</th>
                  <th className="py-3 px-4 text-right">WAC Cost / Sh</th>
                  <th className="py-3 px-4 text-right">Market Price</th>
                  <th className="py-3 px-4 text-right">Cost Basis</th>
                  <th className="py-3 px-4 text-right">Market Value</th>
                  <th className="py-3 px-4 text-right">Unrealized P/L</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60 text-ink-soft">
                {filteredHoldings.map((h) => {
                  const stock = stocks.find((s) => s.id === h.stockId);
                  const boAcc = brokerAccounts.find((b) => b.id === h.brokerAccountId);
                  const isGain = (h.unrealizedGain ?? h.unrealizedPL) >= 0;
                  const curPrice = h.currentPrice ?? h.currentMarketPrice;
                  const costBasis = h.totalCostBasis ?? h.investedValue;
                  const mktVal = h.marketValue ?? h.currentMarketValue;
                  const unrlGain = h.unrealizedGain ?? h.unrealizedPL;
                  const unrlGainPct = h.unrealizedGainPct ?? h.unrealizedPLPct;

                  return (
                    <tr key={`${h.brokerAccountId}-${h.stockId}`} className="hover:bg-raised/40 transition-colors">
                      {/* Symbol & Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-ink text-sm">{h.symbol}</div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-raised text-ink-muted font-mono">
                            {stock?.category ? `Cat ${stock.category}` : stock?.exchange || 'DSE'}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5 truncate max-w-[180px]">
                          {h.companyName}
                        </div>
                        <div className="text-[10px] text-ink-faint font-mono mt-0.5">{stock?.sector}</div>
                      </td>

                      {/* BO Account */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-ink-soft">
                        <div>{boAcc?.accountName || 'Primary BO'}</div>
                        <div className="text-ink-faint text-[10px]">BO: {boAcc?.boId}</div>
                      </td>

                      {/* Shares */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-ink">
                        {h.quantity.toLocaleString()}
                      </td>

                      {/* WAC Cost / Share */}
                      <td className="py-3.5 px-4 text-right font-mono text-ink-soft">
                        ৳{h.weightedAverageCost.toFixed(2)}
                      </td>

                      {/* Market Price & Manual Trigger */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold text-ink">৳{curPrice.toFixed(2)}</span>
                          {stock && (
                            <button
                              onClick={() => handleOpenPriceModal(stock)}
                              title="Update market price (Manual or API)"
                              className="p-1 text-ink-faint hover:text-accent-strong hover:bg-raised rounded transition-colors"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {stock?.priceSource && (
                          <div className="text-[9px] text-ink-faint uppercase tracking-wider mt-0.5">
                            {stock.priceSource === 'api' ? 'StockChartBD' : 'Manual'}
                          </div>
                        )}
                      </td>

                      {/* Cost Basis */}
                      <td className="py-3.5 px-4 text-right font-mono text-ink-soft">
                        ৳{costBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Market Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-ink">
                        ৳{mktVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Unrealized P/L */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className={`font-semibold ${isGain ? 'text-positive' : 'text-negative'}`}>
                          {isGain ? '+' : ''}৳
                          {unrlGain.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className={`text-[10px] ${isGain ? 'text-positive' : 'text-negative'}`}>
                          {isGain ? '+' : ''}
                          {unrlGainPct.toFixed(2)}%
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onNavigateToTrades && onNavigateToTrades(h.stockId)}
                            className="px-2.5 py-1 bg-raised hover:bg-slate-700 text-ink-soft rounded text-[11px] font-medium transition-colors"
                          >
                            Trade
                          </button>
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

      {/* DSE Master Securities Catalog Section */}
      <div className="bg-surface/60 border border-edge rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Securities Watchlist & Master Catalog
            </h2>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Custom stock watchlist for Dhaka Stock Exchange (DSE). User created & customizable.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stocks.length > 0 && (
              <button
                onClick={handleClearUnused}
                title="Remove all stocks that have no trade history"
                className="text-xs text-negative hover:text-negative font-medium flex items-center gap-1 px-2.5 py-1 bg-canvas border border-edge rounded-lg transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear Unused</span>
              </button>
            )}
            <button
              onClick={handleOpenBatchModal}
              disabled={stocks.length === 0}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 px-2.5 py-1 bg-canvas border border-edge rounded-lg disabled:opacity-40"
            >
              <Edit3 className="h-3 w-3" />
              <span>Bulk Edit</span>
            </button>
            <button
              onClick={() => setIsAddStockModalOpen(true)}
              className="text-xs text-accent-strong hover:text-accent-strong font-medium flex items-center gap-1 px-2.5 py-1 bg-canvas border border-edge rounded-lg shadow-sm"
            >
              <Plus className="h-3 w-3" />
              <span>Add Stock</span>
            </button>
          </div>
        </div>

        {/* Action Toast Feedback */}
        {catalogToast && (
          <div
            className={`mb-3 p-2.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
              catalogToast.isError
                ? 'bg-rose-950/40 border-rose-800/60 text-negative'
                : 'bg-emerald-950/40 border-emerald-800/60 text-accent-strong'
            }`}
          >
            {catalogToast.isError ? (
              <AlertCircle className="h-4 w-4 text-negative shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-accent-strong shrink-0" />
            )}
            <span>{catalogToast.text}</span>
          </div>
        )}

        {stocks.length === 0 ? (
          <div className="text-center py-10 px-4 bg-canvas/40 rounded-xl border border-dashed border-edge/80">
            <Sparkles className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-ink-soft">Watchlist is completely clean</div>
            <p className="text-[11px] text-ink-faint max-w-sm mx-auto mt-1 mb-3">
              No preloaded stocks. You can search and add any Dhaka Stock Exchange (DSE) company by clicking "+ Add Stock".
            </p>
            <Button
              onClick={() => setIsAddStockModalOpen(true)}
              variant="primary"
              size="sm"
              icon={Plus}
            >
              Add Your First Stock
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {stocks.map((stock) => {
              const hasPosition = stockHoldings.some((h) => h.stockId === stock.id);
              const changeVal = stock.change ?? ((stock.ycp && stock.ycp > 0) ? stock.currentPrice - stock.ycp : 0);
              const changePct = stock.changePercent ?? ((stock.ycp && stock.ycp > 0) ? (changeVal / stock.ycp) * 100 : 0);
              const isUp = changeVal >= 0;

              return (
                <div
                  key={stock.id}
                  className="p-3 bg-canvas/80 border border-edge/80 rounded-lg hover:border-slate-700 transition-colors flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="font-bold text-ink text-xs flex items-center gap-1.5">
                        <span>{stock.symbol}</span>
                        {stock.category && (
                          <span className="text-[9px] px-1 py-0.2 bg-raised text-ink-muted rounded font-mono">
                            {stock.category}
                          </span>
                        )}
                        {hasPosition && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-strong" title="Held in portfolio"></span>
                        )}
                      </div>
                      <div className="text-[10px] text-ink-muted truncate max-w-[110px]" title={stock.companyName}>
                        {stock.companyName}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleOpenPriceModal(stock)}
                        title="Edit Market Price"
                        className="p-1 text-ink-faint hover:text-ink rounded transition-colors"
                      >
                        <Sliders className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteStock(stock)}
                        title="Remove from watchlist"
                        className="p-1 text-ink-faint hover:text-negative rounded transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-edge/60 flex items-end justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-ink">৳{stock.currentPrice.toFixed(1)}</div>
                      {stock.ycp !== undefined && stock.ycp > 0 && (
                        <div className={`text-[10px] font-mono flex items-center gap-0.5 ${isUp ? 'text-positive' : 'text-negative'}`}>
                          {isUp ? '+' : ''}{changePct.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onNavigateToTrades && onNavigateToTrades(stock.id)}
                      className="text-[10px] text-accent-strong hover:text-accent-strong font-semibold px-2 py-0.5 bg-surface rounded border border-edge hover:border-slate-700"
                    >
                      Trade
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attribution and API Documentation Badge */}
      <div className="bg-canvas/60 border border-edge rounded-xl p-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-ink-muted">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent-strong shrink-0" />
          <span>
            Market data powered by <strong className="text-ink-soft">StockChartBD API</strong>. Attributed to <span className="text-ink-soft">DSE Intelligence</span> & <span className="text-ink-soft">dsebd.org</span>.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-ink-faint">Free & Commercial Permitted</span>
          <span className="text-ink-faint">•</span>
          <span className="text-accent-strong/90">Rate Limit: 120 req/hr</span>
        </div>
      </div>

      {/* Modal: Single Stock Price Override */}
      {selectedStockForPrice && (
        <Modal
          isOpen={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          title="Update Market Price"
          description={`${selectedStockForPrice.symbol} — ${selectedStockForPrice.companyName}`}
          maxWidth="sm"
        >
          <form onSubmit={handleSavePrice} className="space-y-4">
            <div>
              <Field label="Current Market Price / LTP (BDT)">
                <Input
                  type="number"
                  step="any"
                  min="0.05"
                  required
                  icon={TakaPrefix}
                  value={newSimulatedPrice}
                  onChange={(e) =>
                    setNewSimulatedPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="font-mono text-sm"
                />
              </Field>
              <div className="flex items-center justify-between text-[11px] text-ink-muted mt-2 bg-canvas/60 p-2 rounded border border-edge">
                <span>Yesterday Close (YCP):</span>
                <span className="font-mono text-ink-soft">৳{(selectedStockForPrice.ycp ?? selectedStockForPrice.currentPrice).toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-ink-faint mt-1.5">
                Saving will record this rate to the historical price ledger and recalculate all portfolio P/L immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsPriceModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Override
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Batch Price Editor (Table Grid) */}
      <Modal
        isOpen={isBatchPriceModalOpen}
        onClose={() => setIsBatchPriceModalOpen(false)}
        title="Bulk Stock Price Editor"
        description="Quickly adjust or update market prices for multiple DSE securities"
        maxWidth="2xl"
      >
        <div className="flex flex-col max-h-[65vh]">
            <div className="mb-3">
              <Input
                type="text"
                placeholder="Filter securities in table..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
              />
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 border border-edge rounded-xl bg-canvas/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-muted border-b border-edge sticky top-0 text-[11px] font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Company Name</th>
                    <th className="py-2.5 px-3">Sector</th>
                    <th className="py-2.5 px-3 text-right">Current Rate (BDT)</th>
                    <th className="py-2.5 px-3 text-right">New Price (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/60">
                  {stocks
                    .filter((s) =>
                      s.symbol.toLowerCase().includes(batchSearch.toLowerCase()) ||
                      s.companyName.toLowerCase().includes(batchSearch.toLowerCase())
                    )
                    .map((s) => {
                      const curVal = batchDraft[s.id] ?? s.currentPrice;
                      const hasChanged = curVal !== s.currentPrice;

                      return (
                        <tr key={s.id} className="hover:bg-raised/30">
                          <td className="py-2 px-3 font-bold text-ink">{s.symbol}</td>
                          <td className="py-2 px-3 text-ink-muted truncate max-w-[160px]">{s.companyName}</td>
                          <td className="py-2 px-3 text-ink-faint text-[11px]">{s.sector}</td>
                          <td className="py-2 px-3 text-right font-mono text-ink-muted">৳{s.currentPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="any"
                              min="0.1"
                              value={curVal}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setBatchDraft((prev) => ({
                                  ...prev,
                                  [s.id]: isNaN(val) ? 0 : val,
                                }));
                              }}
                              className={`w-24 px-2 py-1 bg-surface border rounded text-xs font-mono text-right focus:outline-none ${
                                hasChanged
                                  ? 'border-accent text-accent-strong bg-emerald-950/20'
                                  : 'border-slate-700 text-ink'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-edge mt-3">
              <div className="text-xs text-ink-muted">
                {Object.keys(batchDraft).filter((k) => {
                  const s = stocks.find((st) => st.id === k);
                  return s && batchDraft[k] !== s.currentPrice;
                }).length}{' '}
                prices modified
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsBatchPriceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={Check}
                  onClick={handleSaveBatchPrices}
                >
                  Save All Changes
                </Button>
              </div>
            </div>
        </div>
      </Modal>

      {/* Modal: CSV Sheet Importer / Exporter */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="DSE Price Sheet CSV Management"
        description="Import or export daily market rate sheets"
        maxWidth="lg"
      >
        <div className="space-y-4">
            {csvFeedback && (
              <ErrorBanner
                variant={csvFeedback.success ? 'success' : 'error'}
                message={csvFeedback.message}
              />
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-ink-soft">Paste CSV or Market Sheet Content</label>
                <span className="text-[10px] text-ink-faint font-mono">Format: Symbol, Price</span>
              </div>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`GP, 280.5\nBATBC, 392.2\nSQURPHARMA, 224.8\nBRACBANK, 56.4`}
                className="w-full p-3 bg-canvas border border-edge rounded-lg text-xs font-mono text-ink placeholder-slate-600 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-edge">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPriceSheet}
              >
                <Download className="h-3.5 w-3.5 text-sky-400" />
                <span>Download Current Rates</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCsvModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={Upload}
                  onClick={handleImportCsv}
                >
                  Import Rates
                </Button>
              </div>
            </div>
        </div>
      </Modal>

      {/* Modal: Add New Security to Master Catalog */}
      <Modal
        isOpen={isAddStockModalOpen}
        onClose={() => setIsAddStockModalOpen(false)}
        title="Add Security to Catalog"
        description="List an equity instrument traded on DSE or CSE"
        maxWidth="md"
      >
            {formError && (
              <ErrorBanner variant="error" message={formError} className="mb-4" />
            )}

            <form onSubmit={handleAddStock} className="space-y-3.5">
              {/* Live DSE Stock Auto-Discovery Banner */}
              {apiSyncBadge && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in duration-150 ${
                    apiSyncBadge.isLive
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-accent-strong'
                      : 'bg-canvas/60 border-edge text-ink-soft'
                  }`}
                >
                  {isFetchingQuote ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent-strong shrink-0" />
                  ) : apiSyncBadge.isLive ? (
                    <Sparkles className="h-4 w-4 text-accent-strong shrink-0" />
                  ) : (
                    <Activity className="h-4 w-4 text-sky-400 shrink-0" />
                  )}
                  <span className="leading-tight">{apiSyncBadge.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Field label="Symbol / Ticker" required>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. GP, CITYBANK, BATBC"
                      value={symbol}
                      onChange={(e) => handleSymbolInput(e.target.value)}
                      onFocus={() => {
                        if (symbol.length >= 1) setShowSuggestions(true);
                      }}
                      className="font-mono uppercase"
                      rightElement={
                        isFetchingQuote ? (
                          <Loader2 className="h-3.5 w-3.5 text-accent-strong animate-spin" />
                        ) : undefined
                      }
                    />
                  </Field>

                  {/* 409+ DSE Companies Autocomplete Dropdown */}
                  {showSuggestions && symbol.length >= 1 && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-surface border border-slate-700 rounded-xl shadow-2xl z-50 divide-y divide-edge/60">
                      {allCompanies
                        .filter(
                          (c) =>
                            c.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
                            c.name.toLowerCase().includes(symbol.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((c) => (
                          <button
                            key={c.symbol}
                            type="button"
                            onClick={() => handleSelectCompany(c)}
                            className="w-full text-left p-2 hover:bg-raised/80 transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <div className="text-xs font-bold text-accent-strong font-mono group-hover:text-accent-strong">
                                {c.symbol}
                              </div>
                              <div className="text-[11px] text-ink-muted truncate max-w-[190px]">
                                {c.name}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-raised text-ink-soft font-medium border border-slate-700">
                                {c.category || 'A'}
                              </span>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <Field label="Exchange">
                  <Select
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value as 'DSE' | 'CSE')}
                  >
                    <option value="DSE">Dhaka Stock Exchange (DSE)</option>
                    <option value="CSE">Chittagong Stock Exchange (CSE)</option>
                  </Select>
                </Field>
              </div>

              <Field label="Company / Issuer Name" required>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Grameenphone Ltd."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Sector" className="col-span-2">
                  <Input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="e.g. Telecommunication"
                  />
                </Field>
                <Field label="Category">
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="A">Cat A</option>
                    <option value="B">Cat B</option>
                    <option value="N">Cat N</option>
                    <option value="Z">Cat Z</option>
                  </Select>
                </Field>
              </div>

              <Field label="Current Market Price / LTP (BDT)" required>
                <Input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={initialPrice}
                  onChange={(e) =>
                    setInitialPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="font-mono"
                  rightElement={
                    <span className="text-[10px] text-accent-strong font-semibold font-mono">
                      BDT
                    </span>
                  }
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsAddStockModalOpen(false);
                    setShowSuggestions(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Add to Catalog
                </Button>
              </div>
            </form>
      </Modal>
    </div>
  );
};
