/**
 * BAJUS Gold & Foreign Exchange (FX) Rates Types
 * Data models for Bangladesh Jewellers Association (BAJUS) & Bangladesh Bank / Remittance FX
 */

export type GoldKarat = '22k' | '21k' | '18k' | 'traditional';
export type SilverKarat = '22k' | '21k' | '18k' | 'traditional';

export interface BajusGoldRateItem {
  karat: GoldKarat;
  nameBn: string;
  nameEn: string;
  purity: string;
  pricePerBhori: number; // 1 Bhori = 11.664 Grams
  pricePerGram: number;
  pricePerAnna: number; // 1 Bhori = 16 Anna
  pricePerRatti: number; // 1 Anna = 6 Ratti (1 Bhori = 96 Ratti)
  changeFromPrevious: number; // BDT change per bhori
  effectiveDate: string;
  isHallmarked: boolean;
}

export interface BajusSilverRateItem {
  karat: SilverKarat;
  nameBn: string;
  nameEn: string;
  pricePerBhori: number;
  pricePerGram: number;
  effectiveDate: string;
}

export interface BajusRatesSnapshot {
  source: string;
  announcementDate: string;
  effectiveDate: string;
  pressReleaseNo?: string;
  goldRates: Record<GoldKarat, BajusGoldRateItem>;
  silverRates: Record<SilverKarat, BajusSilverRateItem>;
  lastUpdated: string;
}

export interface CurrencyFxRate {
  code: string;
  nameBn: string;
  nameEn: string;
  flag: string;
  symbol: string;
  interbankRate: number; // Official BB / Interbank rate
  remittanceRate: number; // Remittance rate through official banking channel
  cashKerbRate: number; // Cash / Money Changer market rate
  change24h: number; // percentage change or amount
  updatedAt: string;
}

export interface RemittanceCalculationResult {
  foreignAmount: number;
  currencyCode: string;
  currencyName: string;
  exchangeRate: number;
  baseAmountBdt: number;
  govtIncentivePercent: number; // standard 2.5%
  govtIncentiveAmountBdt: number;
  totalReceivableBdt: number;
}

export interface GoldJewelryCalculationResult {
  karat: GoldKarat;
  weightGrams: number;
  weightBhori: number;
  weightAnna: number;
  weightRatti: number;
  goldBasePrice: number;
  makingChargeRate: number;
  makingChargeTotal: number;
  subtotal: number;
  vatRatePercent: number; // 5% Govt VAT
  vatAmount: number;
  totalPrice: number;
}
