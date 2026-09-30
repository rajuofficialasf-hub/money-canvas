/**
 * BAJUS Gold & Foreign Exchange (FX) Engine
 * Bangladesh Jewellers Association (BAJUS) standard gold rates & Bangladesh Bank / Remittance currency exchange
 */

import {
  GoldKarat,
  BajusRatesSnapshot,
  CurrencyFxRate,
  RemittanceCalculationResult,
  GoldJewelryCalculationResult,
} from '../types/gold-fx';

// Weight conversion constants in Bangladesh
export const GRAMS_PER_BHORI = 11.664;
export const ANNA_PER_BHORI = 16;
export const RATTI_PER_ANNA = 6;
export const RATTI_PER_BHORI = 96;
export const GRAMS_PER_ANNA = GRAMS_PER_BHORI / ANNA_PER_BHORI; // 0.729
export const GRAMS_PER_RATTI = GRAMS_PER_BHORI / RATTI_PER_BHORI; // 0.1215

// Standard Bangladesh Government VAT on jewelry sales
export const GOVT_JEWELRY_VAT_PERCENT = 5.0;

// Standard Bangladesh Government Cash Incentive on Remittance
export const GOVT_REMITTANCE_INCENTIVE_PERCENT = 2.5;

// BAJUS Official Benchmark Rates (Updated benchmark according to latest BAJUS notifications)
export const DEFAULT_BAJUS_RATES: BajusRatesSnapshot = {
  source: 'Bangladesh Jewellers Association (BAJUS)',
  announcementDate: '2026-09-20',
  effectiveDate: '2026-09-22',
  pressReleaseNo: 'BAJUS/GS-2026/09',
  lastUpdated: new Date().toISOString(),
  goldRates: {
    '22k': {
      karat: '22k',
      nameBn: '২২ ক্যারেট হলমার্কযুক্ত সোনা',
      nameEn: '22 Karat Hallmarked Gold',
      purity: '91.6% Pure Gold',
      pricePerBhori: 143526,
      pricePerGram: Math.round(143526 / GRAMS_PER_BHORI), // ~12305
      pricePerAnna: Math.round(143526 / ANNA_PER_BHORI), // ~8970
      pricePerRatti: Math.round(143526 / RATTI_PER_BHORI), // ~1495
      changeFromPrevious: 1983,
      effectiveDate: '2026-09-22',
      isHallmarked: true,
    },
    '21k': {
      karat: '21k',
      nameBn: '২১ ক্যারেট হলমার্কযুক্ত সোনা',
      nameEn: '21 Karat Hallmarked Gold',
      purity: '87.5% Pure Gold',
      pricePerBhori: 137005,
      pricePerGram: Math.round(137005 / GRAMS_PER_BHORI), // ~11746
      pricePerAnna: Math.round(137005 / ANNA_PER_BHORI),
      pricePerRatti: Math.round(137005 / RATTI_PER_BHORI),
      changeFromPrevious: 1866,
      effectiveDate: '2026-09-22',
      isHallmarked: true,
    },
    '18k': {
      karat: '18k',
      nameBn: '১৮ ক্যারেট হলমার্কযুক্ত সোনা',
      nameEn: '18 Karat Hallmarked Gold',
      purity: '75.0% Pure Gold',
      pricePerBhori: 117433,
      pricePerGram: Math.round(117433 / GRAMS_PER_BHORI), // ~10068
      pricePerAnna: Math.round(117433 / ANNA_PER_BHORI),
      pricePerRatti: Math.round(117433 / RATTI_PER_BHORI),
      changeFromPrevious: 1610,
      effectiveDate: '2026-09-22',
      isHallmarked: true,
    },
    traditional: {
      karat: 'traditional',
      nameBn: 'সনাতন পদ্ধতির সোনা',
      nameEn: 'Traditional (Sanatan) Gold',
      purity: 'Traditional Standard',
      pricePerBhori: 96286,
      pricePerGram: Math.round(96286 / GRAMS_PER_BHORI), // ~8255
      pricePerAnna: Math.round(96286 / ANNA_PER_BHORI),
      pricePerRatti: Math.round(96286 / RATTI_PER_BHORI),
      changeFromPrevious: 1283,
      effectiveDate: '2026-09-22',
      isHallmarked: false,
    },
  },
  silverRates: {
    '22k': {
      karat: '22k',
      nameBn: '২২ ক্যারেট ক্যাডমিয়াম রূপা',
      nameEn: '22 Karat Hallmarked Silver',
      pricePerBhori: 2741,
      pricePerGram: Math.round(2741 / GRAMS_PER_BHORI), // ~235
      effectiveDate: '2026-09-22',
    },
    '21k': {
      karat: '21k',
      nameBn: '২১ ক্যারেট রূপা',
      nameEn: '21 Karat Silver',
      pricePerBhori: 2624,
      pricePerGram: Math.round(2624 / GRAMS_PER_BHORI), // ~225
      effectiveDate: '2026-09-22',
    },
    '18k': {
      karat: '18k',
      nameBn: '১৮ ক্যারেট রূপা',
      nameEn: '18 Karat Silver',
      pricePerBhori: 2251,
      pricePerGram: Math.round(2251 / GRAMS_PER_BHORI), // ~193
      effectiveDate: '2026-09-22',
    },
    traditional: {
      karat: 'traditional',
      nameBn: 'সনাতন পদ্ধতির রূপা',
      nameEn: 'Traditional Silver',
      pricePerBhori: 1691,
      pricePerGram: Math.round(1691 / GRAMS_PER_BHORI), // ~145
      effectiveDate: '2026-09-22',
    },
  },
};

// Benchmark Foreign Exchange Rates (Currencies against BDT)
export const DEFAULT_FX_RATES: CurrencyFxRate[] = [
  {
    code: 'USD',
    nameBn: 'ইউএস ডলার',
    nameEn: 'US Dollar',
    flag: '🇺🇸',
    symbol: '$',
    interbankRate: 121.80,
    remittanceRate: 123.50,
    cashKerbRate: 125.80,
    change24h: 0.15,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'EUR',
    nameBn: 'ইউরো',
    nameEn: 'Euro',
    flag: '🇪🇺',
    symbol: '€',
    interbankRate: 133.50,
    remittanceRate: 135.20,
    cashKerbRate: 137.90,
    change24h: -0.22,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'GBP',
    nameBn: 'ব্রিটিশ পাউন্ড',
    nameEn: 'British Pound',
    flag: '🇬🇧',
    symbol: '£',
    interbankRate: 158.40,
    remittanceRate: 160.75,
    cashKerbRate: 163.80,
    change24h: 0.35,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'SAR',
    nameBn: 'সৌদি রিয়াল',
    nameEn: 'Saudi Riyal',
    flag: '🇸🇦',
    symbol: '﷼',
    interbankRate: 32.48,
    remittanceRate: 32.90,
    cashKerbRate: 33.70,
    change24h: 0.05,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'AED',
    nameBn: 'ইউএই দিরহাম',
    nameEn: 'UAE Dirham',
    flag: '🇦🇪',
    symbol: 'د.إ',
    interbankRate: 33.15,
    remittanceRate: 33.60,
    cashKerbRate: 34.30,
    change24h: 0.02,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'KWD',
    nameBn: 'কুয়েতি দিনার',
    nameEn: 'Kuwaiti Dinar',
    flag: '🇰🇼',
    symbol: 'KD',
    interbankRate: 396.50,
    remittanceRate: 402.00,
    cashKerbRate: 409.00,
    change24h: 0.40,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'QAR',
    nameBn: 'কাতারি রিয়াল',
    nameEn: 'Qatari Riyal',
    flag: '🇶🇦',
    symbol: 'QR',
    interbankRate: 33.45,
    remittanceRate: 33.90,
    cashKerbRate: 34.60,
    change24h: 0.04,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'MYR',
    nameBn: 'মালয়েশিয়ান রিঙ্গিত',
    nameEn: 'Malaysian Ringgit',
    flag: '🇲🇾',
    symbol: 'RM',
    interbankRate: 27.90,
    remittanceRate: 28.40,
    cashKerbRate: 29.20,
    change24h: -0.10,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'SGD',
    nameBn: 'সিঙ্গাপুর ডলার',
    nameEn: 'Singapore Dollar',
    flag: '🇸🇬',
    symbol: 'S$',
    interbankRate: 93.80,
    remittanceRate: 95.20,
    cashKerbRate: 97.40,
    change24h: 0.18,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'CAD',
    nameBn: 'কানাডিয়ান ডলার',
    nameEn: 'Canadian Dollar',
    flag: '🇨🇦',
    symbol: 'C$',
    interbankRate: 88.20,
    remittanceRate: 89.80,
    cashKerbRate: 92.10,
    change24h: -0.05,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'AUD',
    nameBn: 'অস্ট্রেলিয়ান ডলার',
    nameEn: 'Australian Dollar',
    flag: '🇦🇺',
    symbol: 'A$',
    interbankRate: 80.60,
    remittanceRate: 82.20,
    cashKerbRate: 84.50,
    change24h: 0.28,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'JPY',
    nameBn: 'জাপানি ইয়েন',
    nameEn: 'Japanese Yen',
    flag: '🇯🇵',
    symbol: '¥',
    interbankRate: 0.83,
    remittanceRate: 0.85,
    cashKerbRate: 0.87,
    change24h: -0.01,
    updatedAt: new Date().toISOString(),
  },
  {
    code: 'INR',
    nameBn: 'ভারতীয় রুপি',
    nameEn: 'Indian Rupee',
    flag: '🇮🇳',
    symbol: '₹',
    interbankRate: 1.43,
    remittanceRate: 1.46,
    cashKerbRate: 1.51,
    change24h: 0.01,
    updatedAt: new Date().toISOString(),
  },
];

// Helper: Convert traditional units (Bhori, Anna, Ratti) to Grams
export function toGrams(bhori = 0, anna = 0, ratti = 0): number {
  return (
    Number(bhori || 0) * GRAMS_PER_BHORI +
    Number(anna || 0) * GRAMS_PER_ANNA +
    Number(ratti || 0) * GRAMS_PER_RATTI
  );
}

// Helper: Convert Grams to traditional breakdown { bhori, anna, ratti, leftoverGrams }
export function fromGrams(totalGrams: number): {
  bhori: number;
  anna: number;
  ratti: number;
  fractionalBhori: number;
} {
  const g = Math.max(0, Number(totalGrams) || 0);
  const fractionalBhori = g / GRAMS_PER_BHORI;
  const bhori = Math.floor(fractionalBhori);
  const remainingAfterBhori = g - bhori * GRAMS_PER_BHORI;

  const anna = Math.floor(remainingAfterBhori / GRAMS_PER_ANNA);
  const remainingAfterAnna = remainingAfterBhori - anna * GRAMS_PER_ANNA;

  const ratti = Math.round((remainingAfterAnna / GRAMS_PER_RATTI) * 10) / 10;

  return {
    bhori,
    anna,
    ratti,
    fractionalBhori: Math.round(fractionalBhori * 1000) / 1000,
  };
}

// Calculate Gold Jewelry Price according to BAJUS retail rules
export function calculateGoldJewelryPrice(
  karat: GoldKarat,
  grams: number,
  makingChargePerGram = 600,
  includeVat = true,
  customGoldRatePerGram?: number
): GoldJewelryCalculationResult {
  const snapshot = getSavedBajusRates();
  const rateItem = snapshot.goldRates[karat];
  const pricePerGram = customGoldRatePerGram || rateItem.pricePerGram;

  const weightGrams = Math.max(0, grams);
  const { anna, ratti } = fromGrams(weightGrams);
  const weightBhori = weightGrams / GRAMS_PER_BHORI;

  const goldBasePrice = Math.round(weightGrams * pricePerGram);
  const makingChargeTotal = Math.round(weightGrams * makingChargePerGram);
  const subtotal = goldBasePrice + makingChargeTotal;

  const vatRatePercent = includeVat ? GOVT_JEWELRY_VAT_PERCENT : 0;
  const vatAmount = includeVat ? Math.round((subtotal * GOVT_JEWELRY_VAT_PERCENT) / 100) : 0;
  const totalPrice = subtotal + vatAmount;

  return {
    karat,
    weightGrams: Math.round(weightGrams * 1000) / 1000,
    weightBhori: Math.round(weightBhori * 1000) / 1000,
    weightAnna: anna,
    weightRatti: ratti,
    goldBasePrice,
    makingChargeRate: makingChargePerGram,
    makingChargeTotal,
    subtotal,
    vatRatePercent,
    vatAmount,
    totalPrice,
  };
}

// Calculate Remittance with Government 2.5% Cash Incentive
export function calculateRemittance(
  foreignAmount: number,
  currencyCode: string,
  customRate?: number,
  rateType: 'remittanceRate' | 'cashKerbRate' | 'interbankRate' = 'remittanceRate'
): RemittanceCalculationResult {
  const fxList = getSavedFxRates();
  const fx = fxList.find((f) => f.code === currencyCode) || DEFAULT_FX_RATES[0];
  const rate = customRate || fx[rateType] || fx.remittanceRate;

  const amount = Math.max(0, foreignAmount);
  const baseAmountBdt = Math.round(amount * rate);
  const govtIncentivePercent = GOVT_REMITTANCE_INCENTIVE_PERCENT;
  const govtIncentiveAmountBdt = Math.round((baseAmountBdt * govtIncentivePercent) / 100);
  const totalReceivableBdt = baseAmountBdt + govtIncentiveAmountBdt;

  return {
    foreignAmount: amount,
    currencyCode,
    currencyName: fx.nameEn,
    exchangeRate: rate,
    baseAmountBdt,
    govtIncentivePercent,
    govtIncentiveAmountBdt,
    totalReceivableBdt,
  };
}

// Storage helpers
const GOLD_STORAGE_KEY = 'wealthfolio_bajus_gold_rates_v1';
const FX_STORAGE_KEY = 'wealthfolio_fx_rates_v1';

export function getSavedBajusRates(): BajusRatesSnapshot {
  if (typeof window === 'undefined') return DEFAULT_BAJUS_RATES;
  try {
    const raw = localStorage.getItem(GOLD_STORAGE_KEY);
    if (!raw) return DEFAULT_BAJUS_RATES;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.goldRates && parsed.goldRates['22k']) {
      return parsed;
    }
  } catch (e) {
    console.error('Error reading saved BAJUS rates', e);
  }
  return DEFAULT_BAJUS_RATES;
}

export function saveBajusRates(rates: BajusRatesSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GOLD_STORAGE_KEY, JSON.stringify(rates));
  } catch (e) {
    console.error('Error saving BAJUS rates', e);
  }
}

export function getSavedFxRates(): CurrencyFxRate[] {
  if (typeof window === 'undefined') return DEFAULT_FX_RATES;
  try {
    const raw = localStorage.getItem(FX_STORAGE_KEY);
    if (!raw) return DEFAULT_FX_RATES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error reading saved FX rates', e);
  }
  return DEFAULT_FX_RATES;
}

export function saveFxRates(rates: CurrencyFxRate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(rates));
  } catch (e) {
    console.error('Error saving FX rates', e);
  }
}

// Live fetch attempt with fallback to standard Bangladesh Bank rates
export async function refreshLiveFxRates(): Promise<{
  success: boolean;
  rates: CurrencyFxRate[];
  source: 'live_api' | 'fallback_cache';
  message: string;
}> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('API response not ok');
    const data = await response.json();
    if (data && data.rates && data.rates.BDT) {
      const usdBdt = Number(data.rates.BDT);
      // Derive rates against BDT
      const updatedList = DEFAULT_FX_RATES.map((item) => {
        if (item.code === 'USD') {
          return {
            ...item,
            interbankRate: Math.round(usdBdt * 100) / 100,
            remittanceRate: Math.round((usdBdt + 1.5) * 100) / 100,
            cashKerbRate: Math.round((usdBdt + 3.8) * 100) / 100,
            updatedAt: new Date().toISOString(),
          };
        }
        const foreignRatePerUsd = Number(data.rates[item.code]);
        if (foreignRatePerUsd && foreignRatePerUsd > 0) {
          const directBdt = usdBdt / foreignRatePerUsd;
          return {
            ...item,
            interbankRate: Math.round(directBdt * 100) / 100,
            remittanceRate: Math.round((directBdt * 1.012) * 100) / 100,
            cashKerbRate: Math.round((directBdt * 1.03) * 100) / 100,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });

      saveFxRates(updatedList);
      return {
        success: true,
        rates: updatedList,
        source: 'live_api',
        message: 'বৈদেশিক মুদ্রার লাইভ রেট সফলভাবে আপডেট করা হয়েছে।',
      };
    }
  } catch (err) {
    console.warn('Live FX fetch failed, using benchmark Bangladesh Bank data', err);
  }

  const current = getSavedFxRates();
  return {
    success: true,
    rates: current,
    source: 'fallback_cache',
    message: 'বাংলাদেশ ব্যাংকের স্ট্যান্ডার্ড বেঞ্চমার্ক রেট সক্রিয় রয়েছে।',
  };
}
