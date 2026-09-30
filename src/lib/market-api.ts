import { todayLocalISO } from './date-utils';
/**
 * Dhaka Stock Exchange (DSE) Market Data Service Layer
 * Target API: stockchartbd.com (v1 Developer Feed)
 * 
 * Official Endpoints:
 * - Quote:      https://stockchartbd.com/api/v1.php?endpoint=quote&symbol={SYMBOL}
 * - History:    https://stockchartbd.com/api/v1.php?endpoint=history&symbol={SYMBOL}&limit={LIMIT}
 * - Financials: https://stockchartbd.com/api/v1.php?endpoint=financials&symbol={SYMBOL}
 * - Companies:  https://stockchartbd.com/api/v1.php?endpoint=companies
 * 
 * Features:
 * 1. 120 req/hr rate limit tracker & client-side caching to avoid throttling.
 * 2. Multi-tier failover: Live StockChartBD API -> CORS/Public Mirror -> Local Cache -> Manual Fallback.
 * 3. Fallback functions for manual single-entry, batch table edits, and CSV price sheet imports.
 * 4. Full DSE Intelligence / dsebd.org attribution compliance.
 */

import { Stock } from '../types/accounting';

export interface MarketQuote {
  symbol: string;
  companyName?: string;
  sector?: string;
  ltp: number; // Last Traded Price
  ycp?: number; // Yesterday Closing Price
  high?: number;
  low?: number;
  open?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  tradeCount?: number;
  valueMn?: number;
  category?: string;
  source: 'stockchartbd_api' | 'fallback_mirror' | 'cache' | 'manual_entry';
  updatedAt: string;
}

export interface HistoricalPriceRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount?: number;
}

export interface CompanyFinancials {
  symbol: string;
  eps?: number;
  nav?: number;
  pe?: number;
  dividendYield?: number;
  paidUpCapital?: number;
  authorizedCapital?: number;
  marketCap?: number;
  lastAuditedDate?: string;
}

export interface FetchMarketDataResponse {
  success: boolean;
  data: Record<string, MarketQuote>;
  source: 'stockchartbd_api' | 'fallback_mirror' | 'cache' | 'manual_fallback';
  timestamp: string;
  rateLimitStatus: RateLimitInfo;
  error?: string;
  fallbackAvailable: boolean;
}

export interface ManualStockPriceEntry {
  symbol: string;
  price: number;
  ycp?: number;
  high?: number;
  low?: number;
  companyName?: string;
  sector?: string;
  category?: string;
  note?: string;
}

export interface RateLimitInfo {
  maxRequestsPerHour: number;
  requestsUsedInCurrentWindow: number;
  requestsRemaining: number;
  resetAt: string;
}

export const DSE_API_ATTRIBUTION = {
  provider: 'StockChartBD',
  credits: 'DSE Intelligence & dsebd.org',
  documentationUrl: 'https://stockchartbd.com/developers.php',
  licenseNotice: 'Free for any use, including commercial. No API key or account required.',
  rateLimit: '120 requests/hour per IP',
};

const DSE_CACHE_STORAGE_KEY = 'weathfolio_dse_quotes_cache';
const DSE_MANUAL_OVERRIDES_KEY = 'weathfolio_dse_manual_overrides';
const DSE_RATE_LIMIT_KEY = 'weathfolio_dse_rate_limit_tracker';
const DSE_BASE_URL = 'https://stockchartbd.com/api/v1.php';

// Rate Limiter Helper (120 req/hour window tracker)
export function getRateLimitInfo(): RateLimitInfo {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  try {
    const raw = localStorage.getItem(DSE_RATE_LIMIT_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (now - data.windowStart < oneHour) {
        return {
          maxRequestsPerHour: 120,
          requestsUsedInCurrentWindow: data.count || 0,
          requestsRemaining: Math.max(0, 120 - (data.count || 0)),
          resetAt: new Date(data.windowStart + oneHour).toISOString(),
        };
      }
    }
  } catch (e) {
    console.warn('Error reading rate limit tracker', e);
  }

  // New window
  const newTracker = { windowStart: now, count: 0 };
  try {
    localStorage.setItem(DSE_RATE_LIMIT_KEY, JSON.stringify(newTracker));
  } catch (e) {}

  return {
    maxRequestsPerHour: 120,
    requestsUsedInCurrentWindow: 0,
    requestsRemaining: 120,
    resetAt: new Date(now + oneHour).toISOString(),
  };
}

function incrementRateLimitCount(calls: number = 1): RateLimitInfo {
  const current = getRateLimitInfo();
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  try {
    const raw = localStorage.getItem(DSE_RATE_LIMIT_KEY);
    let windowStart = now;
    let count = 0;

    if (raw) {
      const data = JSON.parse(raw);
      if (now - data.windowStart < oneHour) {
        windowStart = data.windowStart;
        count = (data.count || 0) + calls;
      } else {
        count = calls;
      }
    } else {
      count = calls;
    }

    localStorage.setItem(DSE_RATE_LIMIT_KEY, JSON.stringify({ windowStart, count }));

    return {
      maxRequestsPerHour: 120,
      requestsUsedInCurrentWindow: count,
      requestsRemaining: Math.max(0, 120 - count),
      resetAt: new Date(windowStart + oneHour).toISOString(),
    };
  } catch (e) {
    return current;
  }
}

/**
 * 1. Fetch Single Stock Quote from StockChartBD
 * Endpoint: https://stockchartbd.com/api/v1.php?endpoint=quote&symbol={SYMBOL}
 */
export async function fetchStockQuote(symbol: string, timeoutMs: number = 6000): Promise<{
  success: boolean;
  quote?: MarketQuote;
  source: 'stockchartbd_api' | 'cache' | 'manual_entry';
  error?: string;
}> {
  const sym = symbol.trim().toUpperCase();
  const rateLimit = getRateLimitInfo();

  // If rate limit reached, return cached or manual fallback immediately
  if (rateLimit.requestsRemaining <= 0) {
    const cached = getCachedQuotes()[sym];
    return {
      success: !!cached,
      quote: cached,
      source: 'cache',
      error: `Rate limit reached (120 req/hr). Resets at ${new Date(rateLimit.resetAt).toLocaleTimeString()}. Using cached price.`,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${DSE_BASE_URL}?endpoint=quote&symbol=${encodeURIComponent(sym)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);
    incrementRateLimitCount(1);

    if (response && response.ok) {
      const json = await response.json();
      const quote = parseSingleQuote(json, sym);
      if (quote) {
        // Save to cache
        const all = getCachedQuotes();
        all[sym] = quote;
        persistQuotesToCache(all);

        return { success: true, quote, source: 'stockchartbd_api' };
      }
    }
  } catch (err: any) {
    console.warn(`StockChartBD quote fetch failed for ${sym}:`, err?.message || err);
  }

  // Fallback to local cache or manual override
  const cached = getCachedQuotes()[sym];
  if (cached) {
    return {
      success: true,
      quote: cached,
      source: cached.source === 'manual_entry' ? 'manual_entry' : 'cache',
      error: 'API unavailable. Served from validated offline cache.',
    };
  }

  return {
    success: false,
    source: 'cache',
    error: `Could not fetch quote for ${sym} and no cached rate found. Please use manual price entry.`,
  };
}

/**
 * 2. Fetch All Companies / Master List from StockChartBD
 * Endpoint: https://stockchartbd.com/api/v1.php?endpoint=companies
 */
export async function fetchAllCompanies(timeoutMs: number = 8000): Promise<{
  success: boolean;
  companies: Array<{ symbol: string; companyName: string; sector: string; category?: string }>;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${DSE_BASE_URL}?endpoint=companies`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);
    incrementRateLimitCount(1);

    if (response && response.ok) {
      const json = await response.json();
      const list = Array.isArray(json) ? json : json?.data || [];
      const formatted = list.map((item: any) => ({
        symbol: (item.symbol || item.ticker || item.code || '').toUpperCase().trim(),
        companyName: item.name || item.company_name || item.companyName || item.symbol,
        sector: item.sector || 'General',
        category: item.category || 'A',
      })).filter((c: any) => !!c.symbol);

      if (formatted.length > 0) {
        return { success: true, companies: formatted };
      }
    }
  } catch (e: any) {
    console.warn('Companies list fetch error:', e?.message || e);
  }

  return { success: false, companies: [], error: 'Failed to fetch companies list from StockChartBD.' };
}

/**
 * 3. Fetch Historical Stock Price Data from StockChartBD
 * Endpoint: https://stockchartbd.com/api/v1.php?endpoint=history&symbol={SYMBOL}&limit={LIMIT}
 */
export async function fetchStockHistory(
  symbol: string,
  limit: number = 100,
  timeoutMs: number = 7000
): Promise<{
  success: boolean;
  history: HistoricalPriceRecord[];
  error?: string;
}> {
  const sym = symbol.trim().toUpperCase();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${DSE_BASE_URL}?endpoint=history&symbol=${encodeURIComponent(sym)}&limit=${limit}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);
    incrementRateLimitCount(1);

    if (response && response.ok) {
      const json = await response.json();
      const list = Array.isArray(json) ? json : json?.data || json?.history || [];
      const records: HistoricalPriceRecord[] = list.map((r: any) => ({
        date: r.date || r.trade_date || r.time?.split('T')[0] || todayLocalISO(),
        open: Number(r.open || r.open_price || r.close || 0),
        high: Number(r.high || r.day_high || r.close || 0),
        low: Number(r.low || r.day_low || r.close || 0),
        close: Number(r.close || r.ltp || r.price || 0),
        volume: Number(r.volume || r.total_volume || 0),
        tradeCount: Number(r.trades || r.trade_count || 0),
      })).filter((r: any) => r.close > 0);

      if (records.length > 0) {
        return { success: true, history: records };
      }
    }
  } catch (err: any) {
    console.warn(`Historical data fetch failed for ${sym}:`, err?.message || err);
  }

  return { success: false, history: [], error: `No historical data available for ${sym}.` };
}

/**
 * 4. Primary Batch / Portfolio Fetcher
 * Optimized to fetch portfolio holdings quotes with rate-limiting & fallback safeguards
 */
export async function fetchDseDataFromStockChartBd(
  specificSymbols?: string[],
  timeoutMs: number = 8000
): Promise<FetchMarketDataResponse> {
  const timestamp = new Date().toISOString();
  const rateLimitStatus = getRateLimitInfo();

  // If rate limit exhausted, use local cache
  if (rateLimitStatus.requestsRemaining <= 0) {
    const cached = getCachedQuotes();
    return {
      success: Object.keys(cached).length > 0,
      data: cached,
      source: 'cache',
      timestamp,
      rateLimitStatus,
      error: `StockChartBD 120 req/hr limit reached. Serving from offline cache until ${new Date(rateLimitStatus.resetAt).toLocaleTimeString()}.`,
      fallbackAvailable: true,
    };
  }

  // Attempt Primary Batch / Latest feed from StockChartBD
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Try batch endpoint or multi-symbol request
    const response = await fetch(`${DSE_BASE_URL}?endpoint=latest_prices`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      incrementRateLimitCount(1);
      const payload = await response.json();
      const parsedQuotes = parseStockChartBdPayload(payload);

      if (Object.keys(parsedQuotes).length > 0) {
        const mergedQuotes = mergeWithManualOverrides(parsedQuotes);
        persistQuotesToCache(mergedQuotes);

        return {
          success: true,
          data: mergedQuotes,
          source: 'stockchartbd_api',
          timestamp,
          rateLimitStatus: getRateLimitInfo(),
          fallbackAvailable: true,
        };
      }
    }
  } catch (err: any) {
    console.warn('StockChartBD batch feed failed, trying fallback mirror...', err?.message || err);
  }

  // Attempt Fallback Mirror (DSE Open API Mirror)
  try {
    const mirrorResponse = await fetch(
      'https://raw.githubusercontent.com/faysal515/bd-stock-api/main/data/latest.json',
      { method: 'GET', headers: { Accept: 'application/json' } }
    ).catch(() => null);

    if (mirrorResponse && mirrorResponse.ok) {
      const mirrorData = await mirrorResponse.json();
      const parsedMirror = parseGenericDsePayload(mirrorData);

      if (Object.keys(parsedMirror).length > 0) {
        const merged = mergeWithManualOverrides(parsedMirror);
        persistQuotesToCache(merged);

        return {
          success: true,
          data: merged,
          source: 'fallback_mirror',
          timestamp,
          rateLimitStatus: getRateLimitInfo(),
          fallbackAvailable: true,
        };
      }
    }
  } catch (mirrorErr: any) {
    console.warn('Secondary DSE feed error:', mirrorErr?.message || mirrorErr);
  }

  // If online sources fail, serve cached quotes or provide manual fallback
  const cachedData = getCachedQuotes();
  if (Object.keys(cachedData).length > 0) {
    return {
      success: false,
      data: cachedData,
      source: 'cache',
      timestamp,
      rateLimitStatus: getRateLimitInfo(),
      error: 'StockChartBD API unreachable. Using validated local cache.',
      fallbackAvailable: true,
    };
  }

  return {
    success: false,
    data: {},
    source: 'manual_fallback',
    timestamp,
    rateLimitStatus: getRateLimitInfo(),
    error: 'API unavailable. Please use the manual price editor or CSV importer below.',
    fallbackAvailable: true,
  };
}

/**
 * 5. Fallback Function: Single Manual Data Entry
 */
export function manualStockPriceEntryFallback(entry: ManualStockPriceEntry): {
  success: boolean;
  quote: MarketQuote;
  allQuotes: Record<string, MarketQuote>;
} {
  const sym = entry.symbol.trim().toUpperCase();
  const currentQuotes = getCachedQuotes();
  const manualOverrides = getManualOverrides();

  const existingQuote = currentQuotes[sym];
  const newQuote: MarketQuote = {
    symbol: sym,
    companyName: entry.companyName || existingQuote?.companyName || sym,
    sector: entry.sector || existingQuote?.sector || 'General',
    ltp: entry.price,
    ycp: entry.ycp ?? existingQuote?.ycp ?? entry.price,
    high: entry.high ?? Math.max(existingQuote?.high || entry.price, entry.price),
    low: entry.low ?? Math.min(existingQuote?.low || entry.price, entry.price),
    change: entry.ycp ? entry.price - entry.ycp : existingQuote?.change ?? 0,
    changePercent: entry.ycp && entry.ycp > 0 ? ((entry.price - entry.ycp) / entry.ycp) * 100 : existingQuote?.changePercent ?? 0,
    category: entry.category || existingQuote?.category || 'A',
    source: 'manual_entry',
    updatedAt: new Date().toISOString(),
  };

  currentQuotes[sym] = newQuote;
  manualOverrides[sym] = newQuote;

  persistQuotesToCache(currentQuotes);
  persistManualOverrides(manualOverrides);

  return {
    success: true,
    quote: newQuote,
    allQuotes: currentQuotes,
  };
}

/**
 * 6. Fallback Function: Batch Manual Data Entry
 */
export function batchManualStockPriceEntryFallback(entries: ManualStockPriceEntry[]): {
  success: boolean;
  updatedCount: number;
  allQuotes: Record<string, MarketQuote>;
} {
  const currentQuotes = getCachedQuotes();
  const manualOverrides = getManualOverrides();
  let updatedCount = 0;

  for (const entry of entries) {
    if (!entry.symbol || typeof entry.price !== 'number' || entry.price <= 0) continue;
    const sym = entry.symbol.trim().toUpperCase();
    const existing = currentQuotes[sym];

    const quote: MarketQuote = {
      symbol: sym,
      companyName: entry.companyName || existing?.companyName || sym,
      sector: entry.sector || existing?.sector || 'General',
      ltp: entry.price,
      ycp: entry.ycp ?? existing?.ycp ?? entry.price,
      high: entry.high ?? existing?.high ?? entry.price,
      low: entry.low ?? existing?.low ?? entry.price,
      change: entry.ycp ? entry.price - entry.ycp : existing?.change ?? 0,
      changePercent: entry.ycp && entry.ycp > 0 ? ((entry.price - entry.ycp) / entry.ycp) * 100 : existing?.changePercent ?? 0,
      category: entry.category || existing?.category || 'A',
      source: 'manual_entry',
      updatedAt: new Date().toISOString(),
    };

    currentQuotes[sym] = quote;
    manualOverrides[sym] = quote;
    updatedCount++;
  }

  persistQuotesToCache(currentQuotes);
  persistManualOverrides(manualOverrides);

  return {
    success: true,
    updatedCount,
    allQuotes: currentQuotes,
  };
}

/**
 * 7. Fallback Function: CSV Price Sheet Importer
 */
export function importCsvPriceSheetFallback(csvContent: string): {
  success: boolean;
  updatedCount: number;
  errors: string[];
  allQuotes: Record<string, MarketQuote>;
} {
  const lines = csvContent.split(/\r?\n/);
  const entries: ManualStockPriceEntry[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || (i === 0 && line.toLowerCase().includes('symbol'))) continue;

    const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    const symbol = parts[0].toUpperCase();
    const priceStr = parts[1].replace(/,/g, '');
    const price = parseFloat(priceStr);

    if (!symbol || isNaN(price) || price <= 0) {
      errors.push(`Row ${i + 1}: Invalid symbol or price "${line}"`);
      continue;
    }

    const ycp = parts[2] ? parseFloat(parts[2].replace(/,/g, '')) : undefined;
    const high = parts[3] ? parseFloat(parts[3].replace(/,/g, '')) : undefined;
    const low = parts[4] ? parseFloat(parts[4].replace(/,/g, '')) : undefined;

    entries.push({
      symbol,
      price,
      ycp: !isNaN(ycp!) ? ycp : undefined,
      high: !isNaN(high!) ? high : undefined,
      low: !isNaN(low!) ? low : undefined,
    });
  }

  if (entries.length === 0) {
    return {
      success: false,
      updatedCount: 0,
      errors: errors.length > 0 ? errors : ['No valid stock entries found in CSV.'],
      allQuotes: getCachedQuotes(),
    };
  }

  const res = batchManualStockPriceEntryFallback(entries);

  return {
    success: true,
    updatedCount: res.updatedCount,
    errors,
    allQuotes: res.allQuotes,
  };
}

/**
 * 8. Export Current Stock Prices as CSV
 */
export function exportPriceSheetCsv(stocks: Stock[]): string {
  const headers = ['Symbol', 'Company Name', 'Sector', 'Current Price (BDT)', 'YCP (BDT)', 'Category', 'Source', 'Last Updated'];
  const rows = stocks.map((s) => [
    `"${s.symbol}"`,
    `"${(s.companyName || '').replace(/"/g, '""')}"`,
    `"${s.sector || 'General'}"`,
    s.currentPrice.toFixed(2),
    (s.ycp ?? s.currentPrice).toFixed(2),
    `"${s.category || 'A'}"`,
    `"${s.priceSource || 'api'}"`,
    `"${s.lastSyncedAt || new Date().toISOString()}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * 9. Storage Helpers
 */
export function getCachedQuotes(): Record<string, MarketQuote> {
  try {
    const raw = localStorage.getItem(DSE_CACHE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse cached quotes', e);
  }
  return {};
}

export function getManualOverrides(): Record<string, MarketQuote> {
  try {
    const raw = localStorage.getItem(DSE_MANUAL_OVERRIDES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse manual overrides', e);
  }
  return {};
}

export function clearManualPriceOverrides(): void {
  try {
    localStorage.removeItem(DSE_MANUAL_OVERRIDES_KEY);
  } catch (e) {
    console.warn('Failed to clear manual overrides', e);
  }
}

function persistQuotesToCache(quotes: Record<string, MarketQuote>): void {
  try {
    localStorage.setItem(DSE_CACHE_STORAGE_KEY, JSON.stringify(quotes));
  } catch (e) {
    console.warn('Failed to persist quotes cache', e);
  }
}

function persistManualOverrides(overrides: Record<string, MarketQuote>): void {
  try {
    localStorage.setItem(DSE_MANUAL_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to persist manual overrides', e);
  }
}

function mergeWithManualOverrides(quotes: Record<string, MarketQuote>): Record<string, MarketQuote> {
  const overrides = getManualOverrides();
  const merged = { ...quotes };
  for (const [sym, override] of Object.entries(overrides)) {
    merged[sym] = {
      ...merged[sym],
      ...override,
      source: 'manual_entry',
    };
  }
  return merged;
}

function parseSingleQuote(data: any, symbol: string): MarketQuote | null {
  const item = data?.data || data?.quote || data;
  if (!item) return null;

  const ltp = Number(item.ltp || item.price || item.close || item.current_price || 0);
  const ycp = Number(item.ycp || item.prev_close || item.yesterday_close || ltp);

  if (ltp <= 0) return null;

  return {
    symbol: symbol.toUpperCase(),
    companyName: item.company_name || item.name || symbol,
    sector: item.sector || 'General',
    ltp,
    ycp,
    high: Number(item.high || item.day_high || ltp),
    low: Number(item.low || item.day_low || ltp),
    open: Number(item.open || ltp),
    change: Number(item.change || (ltp - ycp)),
    changePercent: Number(item.change_percent || item.change_pct || (ycp > 0 ? ((ltp - ycp) / ycp) * 100 : 0)),
    volume: Number(item.volume || item.total_volume || 0),
    tradeCount: Number(item.trades || item.trade_count || 0),
    valueMn: Number(item.value || item.total_value || 0),
    category: item.category || 'A',
    source: 'stockchartbd_api',
    updatedAt: new Date().toISOString(),
  };
}

function parseStockChartBdPayload(data: any): Record<string, MarketQuote> {
  const result: Record<string, MarketQuote> = {};
  const list = Array.isArray(data) ? data : data?.data || data?.stocks || [];

  for (const item of list) {
    const symbol = (item.symbol || item.trading_code || item.ticker || '').toUpperCase().trim();
    if (!symbol) continue;

    const ltp = Number(item.ltp || item.close || item.price || item.current_price || 0);
    const ycp = Number(item.ycp || item.prev_close || item.yesterday_close || ltp);
    const high = Number(item.high || item.day_high || ltp);
    const low = Number(item.low || item.day_low || ltp);
    const change = Number(item.change || (ltp - ycp));
    const changePercent = Number(item.change_percent || item.change_pct || (ycp > 0 ? (change / ycp) * 100 : 0));
    const volume = Number(item.volume || item.total_volume || 0);

    if (ltp > 0) {
      result[symbol] = {
        symbol,
        companyName: item.company_name || item.name,
        sector: item.sector,
        ltp,
        ycp,
        high,
        low,
        change,
        changePercent,
        volume,
        category: item.category || 'A',
        source: 'stockchartbd_api',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return result;
}

function parseGenericDsePayload(data: any): Record<string, MarketQuote> {
  const result: Record<string, MarketQuote> = {};
  const list = Array.isArray(data) ? data : Object.values(data || {});

  for (const item of list as any[]) {
    const symbol = (item.code || item.symbol || item.tradingCode || '').toUpperCase().trim();
    if (!symbol) continue;

    const ltp = Number(item.ltp || item.close || item.lastPrice || 0);
    const ycp = Number(item.ycp || item.prevClose || ltp);

    if (ltp > 0) {
      result[symbol] = {
        symbol,
        companyName: item.companyName || item.name,
        sector: item.sector,
        ltp,
        ycp,
        high: Number(item.high || ltp),
        low: Number(item.low || ltp),
        change: Number(item.change || (ltp - ycp)),
        changePercent: Number(item.changePercent || (ycp > 0 ? ((ltp - ycp) / ycp) * 100 : 0)),
        volume: Number(item.volume || 0),
        category: item.category || 'A',
        source: 'fallback_mirror',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return result;
}
