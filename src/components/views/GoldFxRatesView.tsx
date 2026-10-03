import { todayLocalISO } from '../../lib/date-utils';
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../lib/language-context';
import { useLedger } from '../../lib/ledger-context';
import {
  GoldKarat,
  BajusRatesSnapshot,
  CurrencyFxRate,
} from '../../types/gold-fx';
import {
  DEFAULT_BAJUS_RATES,
  GRAMS_PER_BHORI,
  ANNA_PER_BHORI,
  RATTI_PER_BHORI,
  toGrams,
  calculateGoldJewelryPrice,
  calculateRemittance,
  getSavedBajusRates,
  saveBajusRates,
  getSavedFxRates,
  refreshLiveFxRates,
} from '../../lib/gold-fx-engine';
import {
  Coins,
  Scale,
  RefreshCw,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  ShieldCheck,
  PlusCircle,
  Percent,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Field, Input, Select, Button } from '../ui';

interface GoldFxRatesViewProps {
  onNavigate?: (view: string) => void;
}

export const GoldFxRatesView: React.FC<GoldFxRatesViewProps> = ({ onNavigate }) => {
  const { isBn } = useLanguage();
  const { updateZakatSettings, createPhysicalAsset } = useLedger();

  const [activeTab, setActiveTab] = useState<'gold' | 'fx' | 'units'>('gold');

  // BAJUS Rates State
  const [bajusRates, setBajusRates] = useState<BajusRatesSnapshot>(() => getSavedBajusRates());
  const [isEditingGoldRates, setIsEditingGoldRates] = useState(false);
  const [edit22kRate, setEdit22kRate] = useState(bajusRates.goldRates['22k'].pricePerBhori);
  const [edit21kRate, setEdit21kRate] = useState(bajusRates.goldRates['21k'].pricePerBhori);
  const [edit18kRate, setEdit18kRate] = useState(bajusRates.goldRates['18k'].pricePerBhori);
  const [editTraditionalRate, setEditTraditionalRate] = useState(bajusRates.goldRates.traditional.pricePerBhori);
  const [editSilver22kRate, setEditSilver22kRate] = useState(bajusRates.silverRates['22k'].pricePerBhori);

  // FX Rates State
  const [fxRates, setFxRates] = useState<CurrencyFxRate[]>(() => getSavedFxRates());
  const [isRefreshingFx, setIsRefreshingFx] = useState(false);
  const [fxToast, setFxToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Zakat Sync Toast
  const [zakatSyncSuccess, setZakatSyncSuccess] = useState(false);
  const [assetCreateSuccess, setAssetCreateSuccess] = useState<string | null>(null);

  // Gold Calculator State
  const [calcKarat, setCalcKarat] = useState<GoldKarat>('22k');
  const [weightMode, setWeightMode] = useState<'bhori' | 'grams'>('bhori');
  const [inputBhori, setInputBhori] = useState<number | ''>(1);
  const [inputAnna, setInputAnna] = useState<number | ''>(0);
  const [inputRatti, setInputRatti] = useState<number | ''>(0);
  const [inputGrams, setInputGrams] = useState<number | ''>(11.664);
  const [makingChargePerGram, setMakingChargePerGram] = useState<number>(600);
  const [includeVat, setIncludeVat] = useState<boolean>(true);

  // Remittance Converter State
  const [remitCurrency, setRemitCurrency] = useState<string>('USD');
  const [remitAmount, setRemitAmount] = useState<number | ''>(1000);
  const [remitRateType, setRemitRateType] = useState<'remittanceRate' | 'cashKerbRate' | 'interbankRate'>('remittanceRate');

  // Reverse FX (BDT to Foreign)
  const [reverseBdtAmount, setReverseBdtAmount] = useState<number | ''>(100000);
  const [reverseCurrency, setReverseCurrency] = useState<string>('USD');

  // Unit Converter State
  const [unitBhori, setUnitBhori] = useState<number | ''>(1);
  const [unitGrams, setUnitGrams] = useState<number | ''>(11.664);
  const [unitAnna, setUnitAnna] = useState<number | ''>(16);
  const [unitRatti, setUnitRatti] = useState<number | ''>(96);

  // Effective Grams calculated for Gold Calculator
  const calculatedGrams = useMemo(() => {
    if (weightMode === 'grams') {
      return Number(inputGrams) || 0;
    }
    return toGrams(Number(inputBhori) || 0, Number(inputAnna) || 0, Number(inputRatti) || 0);
  }, [weightMode, inputGrams, inputBhori, inputAnna, inputRatti]);

  // Jewelry Price Breakdown
  const jewelryCalc = useMemo(() => {
    return calculateGoldJewelryPrice(
      calcKarat,
      calculatedGrams,
      makingChargePerGram,
      includeVat,
      bajusRates.goldRates[calcKarat].pricePerGram
    );
  }, [calcKarat, calculatedGrams, makingChargePerGram, includeVat, bajusRates]);

  // Remittance Breakdown
  const remittanceCalc = useMemo(() => {
    return calculateRemittance(Number(remitAmount) || 0, remitCurrency, undefined, remitRateType);
  }, [remitAmount, remitCurrency, remitRateType, fxRates]);

  // Reverse FX calculation
  const reverseFxCalc = useMemo(() => {
    const cur = fxRates.find((f) => f.code === reverseCurrency) || fxRates[0];
    const bdt = Number(reverseBdtAmount) || 0;
    const rate = cur.cashKerbRate; // usually buy at kerb or bank selling
    const foreign = rate > 0 ? bdt / rate : 0;
    return {
      bdt,
      currency: cur,
      rate,
      foreignResult: Math.round(foreign * 100) / 100,
    };
  }, [reverseBdtAmount, reverseCurrency, fxRates]);

  // Handle Sync to Zakat
  const handleSyncToZakat = () => {
    const gold22kPerGram = bajusRates.goldRates['22k'].pricePerGram;
    const silver22kPerGram = bajusRates.silverRates['22k'].pricePerGram;
    updateZakatSettings({
      goldPricePerGram: gold22kPerGram,
      silverPricePerGram: silver22kPerGram,
    });
    setZakatSyncSuccess(true);
    setTimeout(() => setZakatSyncSuccess(false), 4000);
  };

  // Handle Add to Physical Assets
  const handleAddToPhysicalAssets = () => {
    if (calculatedGrams <= 0) return;
    const karatTitle = bajusRates.goldRates[calcKarat].nameEn;
    const bhoriWeight = Math.round((calculatedGrams / GRAMS_PER_BHORI) * 1000) / 1000;
    const name = `${karatTitle} Jewelry (${bhoriWeight} Bhori / ${calculatedGrams}g)`;
    const res = createPhysicalAsset({
      assetName: name,
      assetCategory: 'gold_jewelry',
      purchasePrice: jewelryCalc.totalPrice,
      purchaseDate: todayLocalISO(),
      fundingMethod: 'opening_balance',
      description: `Gold jewelry valued according to BAJUS ${calcKarat.toUpperCase()} benchmark. Weight: ${calculatedGrams}g, Making charge: ৳${jewelryCalc.makingChargeTotal}.`,
    });
    if (res.success) {
      setAssetCreateSuccess(`"${name}" স্থাবর সম্পদ হিসেবে লেজারে যোগ হয়েছে!`);
      setTimeout(() => setAssetCreateSuccess(null), 4000);
    }
  };

  // Live Refresh FX
  const handleRefreshFx = async () => {
    setIsRefreshingFx(true);
    setFxToast(null);
    try {
      const res = await refreshLiveFxRates();
      setFxRates(res.rates);
      setFxToast({ type: 'success', message: res.message });
      setTimeout(() => setFxToast(null), 4000);
    } catch {
      setFxToast({ type: 'error', message: 'লাইভ রেট ফেচ করতে সমস্যা হয়েছে। স্ট্যান্ডার্ড রেট সক্রিয়।' });
      setTimeout(() => setFxToast(null), 4000);
    } finally {
      setIsRefreshingFx(false);
    }
  };

  // Save Custom BAJUS Gold Rates
  const handleSaveCustomGoldRates = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BajusRatesSnapshot = {
      ...bajusRates,
      lastUpdated: new Date().toISOString(),
      goldRates: {
        '22k': {
          ...bajusRates.goldRates['22k'],
          pricePerBhori: edit22kRate,
          pricePerGram: Math.round(edit22kRate / GRAMS_PER_BHORI),
          pricePerAnna: Math.round(edit22kRate / ANNA_PER_BHORI),
          pricePerRatti: Math.round(edit22kRate / RATTI_PER_BHORI),
        },
        '21k': {
          ...bajusRates.goldRates['21k'],
          pricePerBhori: edit21kRate,
          pricePerGram: Math.round(edit21kRate / GRAMS_PER_BHORI),
          pricePerAnna: Math.round(edit21kRate / ANNA_PER_BHORI),
          pricePerRatti: Math.round(edit21kRate / RATTI_PER_BHORI),
        },
        '18k': {
          ...bajusRates.goldRates['18k'],
          pricePerBhori: edit18kRate,
          pricePerGram: Math.round(edit18kRate / GRAMS_PER_BHORI),
          pricePerAnna: Math.round(edit18kRate / ANNA_PER_BHORI),
          pricePerRatti: Math.round(edit18kRate / RATTI_PER_BHORI),
        },
        traditional: {
          ...bajusRates.goldRates.traditional,
          pricePerBhori: editTraditionalRate,
          pricePerGram: Math.round(editTraditionalRate / GRAMS_PER_BHORI),
          pricePerAnna: Math.round(editTraditionalRate / ANNA_PER_BHORI),
          pricePerRatti: Math.round(editTraditionalRate / RATTI_PER_BHORI),
        },
      },
      silverRates: {
        ...bajusRates.silverRates,
        '22k': {
          ...bajusRates.silverRates['22k'],
          pricePerBhori: editSilver22kRate,
          pricePerGram: Math.round(editSilver22kRate / GRAMS_PER_BHORI),
        },
      },
    };

    setBajusRates(updated);
    saveBajusRates(updated);
    setIsEditingGoldRates(false);
  };

  // Reset to BAJUS Default
  const handleResetToDefaultBajus = () => {
    setBajusRates(DEFAULT_BAJUS_RATES);
    saveBajusRates(DEFAULT_BAJUS_RATES);
    setEdit22kRate(DEFAULT_BAJUS_RATES.goldRates['22k'].pricePerBhori);
    setEdit21kRate(DEFAULT_BAJUS_RATES.goldRates['21k'].pricePerBhori);
    setEdit18kRate(DEFAULT_BAJUS_RATES.goldRates['18k'].pricePerBhori);
    setEditTraditionalRate(DEFAULT_BAJUS_RATES.goldRates.traditional.pricePerBhori);
    setEditSilver22kRate(DEFAULT_BAJUS_RATES.silverRates['22k'].pricePerBhori);
    setIsEditingGoldRates(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Coins className="h-4 w-4" />
            <span>{isBn ? 'স্বর্ণ ও বৈদেশিক মুদ্রা বাজার' : 'Gold & Foreign Exchange Markets'}</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
              BAJUS & BB
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {isBn ? 'বাজুস স্বর্ণের দর ও কারেন্সি এক্সচেঞ্জ' : 'BAJUS Gold & FX Exchange Rates'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
            {isBn
              ? 'বাংলাদেশ জুয়েলার্স অ্যাসোসিয়েশন (BAJUS) নির্ধারিত হলমার্কযুক্ত ২২, ২১, ১৮ ক্যারেট সোনা-রূপার দর, গহনা মেকিং চার্জ এবং বাংলাদেশ ব্যাংক ও খোলা বাজার বৈদেশিক মুদ্রা বিনিময়।'
              : 'Official BAJUS hallmarked gold & silver benchmark rates, jewelry making charges, and Bangladesh Bank / Kerb market foreign currency exchange.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncToZakat}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Update Zakat Nisab threshold using live 22K gold rate"
          >
            <Scale className="h-3.5 w-3.5" />
            <span>{isBn ? 'যাকাত নিসাবে সিঙ্ক' : 'Sync to Zakat Nisab'}</span>
          </button>

          <Button
            variant="secondary"
            onClick={handleRefreshFx}
            disabled={isRefreshingFx}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isRefreshingFx ? 'animate-spin' : ''}`} />
            <span>{isRefreshingFx ? (isBn ? 'রিফ্রেশ হচ্ছে...' : 'Refreshing...') : (isBn ? 'লাইভ রিফ্রেশ' : 'Refresh Rates')}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsEditingGoldRates(!isEditingGoldRates)}
          >
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <span>{isBn ? 'দর কাস্টমাইজ' : 'Edit Rates'}</span>
          </Button>
        </div>
      </div>

      {/* Toast Feedbacks */}
      {zakatSyncSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              {isBn
                ? `যাকাত নিসাব সফলভাবে ২২ ক্যারেট স্বর্ণের লাইভ দর (৳${bajusRates.goldRates['22k'].pricePerGram.toLocaleString()}/গ্রাম) দিয়ে আপডেট করা হয়েছে!`
                : `Zakat Nisab successfully updated with live 22K gold rate (৳${bajusRates.goldRates['22k'].pricePerGram.toLocaleString()}/g)!`}
            </span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('zakat')}
              className="text-[11px] text-emerald-300 hover:underline font-bold font-mono"
            >
              {isBn ? 'যাকাত দেখুন →' : 'View Zakat →'}
            </button>
          )}
        </div>
      )}

      {assetCreateSuccess && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{assetCreateSuccess}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('assets')}
              className="text-[11px] text-amber-300 hover:underline font-bold font-mono"
            >
              {isBn ? 'সম্পদ দেখুন →' : 'View Assets →'}
            </button>
          )}
        </div>
      )}

      {fxToast && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in ${
            fxToast.type === 'success'
              ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
          }`}
        >
          {fxToast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{fxToast.message}</span>
        </div>
      )}

      {/* Top Benchmark KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 22K Gold */}
        <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-900/60 shadow-lg shadow-amber-950/20">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
            <span>{isBn ? '২২ ক্যারেট সোনা' : '22K Gold (916)'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-amber-300">
              হলমার্ক
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
            ৳{bajusRates.goldRates['22k'].pricePerBhori.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1">
            <span>প্রতি গ্রাম: ৳{bajusRates.goldRates['22k'].pricePerGram.toLocaleString()}</span>
            <span className="text-emerald-400">+{bajusRates.goldRates['22k'].changeFromPrevious}</span>
          </div>
        </div>

        {/* 21K Gold */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
            <span>{isBn ? '২১ ক্যারেট সোনা' : '21K Gold (875)'}</span>
            <span className="text-[10px] text-slate-400 font-mono">1 ভরি</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            ৳{bajusRates.goldRates['21k'].pricePerBhori.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            প্রতি গ্রাম: ৳{bajusRates.goldRates['21k'].pricePerGram.toLocaleString()}
          </div>
        </div>

        {/* 18K Gold */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
            <span>{isBn ? '১৮ ক্যারেট সোনা' : '18K Gold (750)'}</span>
            <span className="text-[10px] text-slate-400 font-mono">1 ভরি</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            ৳{bajusRates.goldRates['18k'].pricePerBhori.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            প্রতি গ্রাম: ৳{bajusRates.goldRates['18k'].pricePerGram.toLocaleString()}
          </div>
        </div>

        {/* Silver 22K */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
            <span>{isBn ? '২২ ক্যারেট রূপা' : '22K Silver'}</span>
            <span className="text-[10px] text-slate-400 font-mono">ক্যাডমিয়াম</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            ৳{bajusRates.silverRates['22k'].pricePerBhori.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            প্রতি গ্রাম: ৳{bajusRates.silverRates['22k'].pricePerGram.toLocaleString()}
          </div>
        </div>

        {/* USD Remittance Rate */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
            <span>{isBn ? 'ইউএস ডলার (USD)' : 'US Dollar (USD)'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 font-mono text-emerald-300">
              +2.5% বোনাস
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            ৳{fxRates.find((f) => f.code === 'USD')?.remittanceRate.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            প্রণোদনা সহ: ৳{((fxRates.find((f) => f.code === 'USD')?.remittanceRate || 123.5) * 1.025).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Edit Rates Modal / Collapsible */}
      {isEditingGoldRates && (
        <form onSubmit={handleSaveCustomGoldRates} className="p-5 rounded-xl border border-amber-500/30 bg-slate-900/90 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sliders className="h-4 w-4 text-amber-400" />
              <span>{isBn ? 'স্বর্ণ ও রূপার দর কাস্টমাইজ করুন' : 'Customize Gold & Silver Rates (Per Bhori)'}</span>
            </div>
            <button
              type="button"
              onClick={handleResetToDefaultBajus}
              className="text-xs text-slate-400 hover:text-amber-400 font-mono underline"
            >
              {isBn ? 'ডিফল্ট বাজুস রেটে রিসেট' : 'Reset to Official BAJUS'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-xs font-mono">
            <Field label="২২ ক্যারেট সোনা (ভরি)">
              <Input
                type="number"
                value={edit22kRate}
                onChange={(e) => setEdit22kRate(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="২১ ক্যারেট সোনা (ভরি)">
              <Input
                type="number"
                value={edit21kRate}
                onChange={(e) => setEdit21kRate(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="১৮ ক্যারেট সোনা (ভরি)">
              <Input
                type="number"
                value={edit18kRate}
                onChange={(e) => setEdit18kRate(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="সনাতন সোনা (ভরি)">
              <Input
                type="number"
                value={editTraditionalRate}
                onChange={(e) => setEditTraditionalRate(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="২২ ক্যারেট রূপা (ভরি)">
              <Input
                type="number"
                value={editSilver22kRate}
                onChange={(e) => setEditSilver22kRate(Number(e.target.value) || 0)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditingGoldRates(false)}
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold"
            >
              {isBn ? 'সংরক্ষণ করুন' : 'Save Rates'}
            </button>
          </div>
        </form>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-3 text-xs font-medium">
        <button
          onClick={() => setActiveTab('gold')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'gold'
              ? 'border-amber-400 text-amber-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>{isBn ? '১. বাজুস স্বর্ণ ও রূপার দর' : '1. BAJUS Gold & Silver Rates'}</span>
        </button>

        <button
          onClick={() => setActiveTab('fx')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'fx'
              ? 'border-emerald-400 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>{isBn ? '২. মুদ্রা বিনিময় ও রেমিট্যান্স' : '2. Currency Exchange & Remittance'}</span>
        </button>

        <button
          onClick={() => setActiveTab('units')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'units'
              ? 'border-sky-400 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>{isBn ? '৩. স্বর্ণ পরিমাপ ও একক কনভার্টার' : '3. Unit Converter & Guide'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BAJUS GOLD & SILVER RATES */}
      {/* ========================================================================= */}
      {activeTab === 'gold' && (
        <div className="space-y-6">
          {/* Official Rates Breakdown Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  {isBn ? 'বাজুস নির্ধারিত বর্তমান খুচরা মূল্যতালিকা' : 'BAJUS Retail Pricing Schedule'}
                </span>
                <span className="text-slate-500 font-mono">
                  (কার্যকর তারিখ: {bajusRates.effectiveDate})
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                <span>বিজ্ঞপ্তি: {bajusRates.pressReleaseNo || 'BAJUS-2026'}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ক্যারেট / মান (Karat)</th>
                    <th className="py-3 px-4 font-semibold">বিশুদ্ধতা (Purity)</th>
                    <th className="py-3 px-4 font-semibold text-right">প্রতি ভরি (11.664g)</th>
                    <th className="py-3 px-4 font-semibold text-right">প্রতি গ্রাম (Per Gram)</th>
                    <th className="py-3 px-4 font-semibold text-right">প্রতি আনা (1/16 ভরি)</th>
                    <th className="py-3 px-4 font-semibold text-right">প্রতি রতি (1/96 ভরি)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(['22k', '21k', '18k', 'traditional'] as GoldKarat[]).map((k) => {
                    const item = bajusRates.goldRates[k];
                    return (
                      <tr key={k} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="font-sans font-bold">{isBn ? item.nameBn : item.nameEn}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{item.purity}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-amber-300">
                          ৳{item.pricePerBhori.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-200">
                          ৳{item.pricePerGram.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300">
                          ৳{item.pricePerAnna.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          ৳{item.pricePerRatti.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Silver 22K Cadmium */}
                  <tr className="bg-slate-950/40 hover:bg-slate-900/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-200 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                      <span className="font-sans font-bold">
                        {isBn ? bajusRates.silverRates['22k'].nameBn : bajusRates.silverRates['22k'].nameEn}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">রূপা (Silver Cadmium)</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                      ৳{bajusRates.silverRates['22k'].pricePerBhori.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      ৳{bajusRates.silverRates['22k'].pricePerGram.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">
                      ৳{Math.round(bajusRates.silverRates['22k'].pricePerBhori / 16).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500">
                      ৳{Math.round(bajusRates.silverRates['22k'].pricePerBhori / 96).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-950/40 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4">
              <span>* বাজুস নিয়ম অনুযায়ী ক্যাডমিয়াম হলমার্কযুক্ত স্বর্ণে সর্বনিম্ন মজুরি প্রতি গ্রাম ৳৪৯০ নির্ধারিত।</span>
              <span className="text-amber-400 font-mono">১ ভরি = ১৬ আনা = ৯৬ রতি = ১১.৬৬৪ গ্রাম</span>
            </div>
          </div>

          {/* Interactive Gold Value & Jewelry Making Charge Calculator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Input Form */}
            <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Scale className="h-4 w-4 text-amber-400" />
                  <span>{isBn ? 'স্বর্ণের মূল্য ও গহনা মেকিং চার্জ ক্যালকুলেটর' : 'Gold Value & Jewelry Making Calculator'}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  BAJUS Retail
                </span>
              </div>

              {/* Karat Selector */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  {isBn ? 'স্বর্ণের ক্যারেট নির্বাচন করুন' : 'Select Karat'}
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  {(['22k', '21k', '18k', 'traditional'] as GoldKarat[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCalcKarat(k)}
                      className={`p-2 rounded-lg border text-center font-bold transition-all cursor-pointer ${
                        calcKarat === k
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {k.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight Input Mode Toggle */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="font-medium">{isBn ? 'ওজন পরিমাপের একক' : 'Weight Measurement Unit'}</span>
                  <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setWeightMode('bhori')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        weightMode === 'bhori' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isBn ? 'ভরি-আনা-রতি' : 'Bhori / Anna'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightMode('grams')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        weightMode === 'grams' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isBn ? 'গ্রাম (Grams)' : 'Grams'}
                    </button>
                  </div>
                </div>

                {weightMode === 'bhori' ? (
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <Field label={isBn ? 'ভরি (Bhori)' : 'Bhori'}>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={inputBhori}
                        onChange={(e) => setInputBhori(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      />
                    </Field>
                    <Field label={isBn ? 'আনা (Anna)' : 'Anna (0-15)'}>
                      <Input
                        type="number"
                        min="0"
                        max="15"
                        step="any"
                        value={inputAnna}
                        onChange={(e) => setInputAnna(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      />
                    </Field>
                    <Field label={isBn ? 'রতি (Ratti)' : 'Ratti (0-5)'}>
                      <Input
                        type="number"
                        min="0"
                        max="5.9"
                        step="any"
                        value={inputRatti}
                        onChange={(e) => setInputRatti(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      />
                    </Field>
                  </div>
                ) : (
                  <Field label={isBn ? 'মোট গ্রাম (Total Grams)' : 'Weight in Grams'}>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={inputGrams}
                      onChange={(e) => setInputGrams(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    />
                  </Field>
                )}
              </div>

              {/* Making Charge & VAT Settings */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                <Field
                  label={isBn ? 'মেকিং চার্জ প্রতি গ্রাম (৳)' : 'Making Charge/g (৳)'}
                  hint="বাজুস সর্বনিম্ন ৳৪৯০/গ্রাম"
                >
                  <Input
                    type="number"
                    min="0"
                    value={makingChargePerGram}
                    onChange={(e) => setMakingChargePerGram(parseFloat(e.target.value) || 0)}
                  />
                </Field>

                <Field
                  label={isBn ? 'সরকারি ভ্যাট (৫%)' : 'Government VAT (5%)'}
                  hint="এনবিআর নির্ধারিত ৫% ভ্যাট"
                >
                  <button
                    type="button"
                    onClick={() => setIncludeVat(!includeVat)}
                    className={`w-full py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                      includeVat
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {includeVat ? (isBn ? '৫% ভ্যাট অন্তর্ভুক্ত' : '5% VAT Included') : (isBn ? 'ভ্যাট ছাড়া' : 'No VAT')}
                  </button>
                </Field>
              </div>
            </div>

            {/* Right: Bill Breakdown & One-Click Actions */}
            <div className="lg:col-span-6 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>{isBn ? 'আনুমানিক গহনা মেমো / বিল সামারি' : 'Jewelry Memo / Pricing Summary'}</span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    {jewelryCalc.weightBhori.toFixed(3)} ভরি ({jewelryCalc.weightGrams}g)
                  </span>
                </div>

                <div className="divide-y divide-slate-800/70 text-xs font-mono mt-3 space-y-2">
                  <div className="flex justify-between text-slate-400 pt-2">
                    <span>{isBn ? 'স্বর্ণের বিশুদ্ধ মূল্য (Gold Net Cost):' : 'Pure Gold Value:'}</span>
                    <span className="text-white font-bold">৳{jewelryCalc.goldBasePrice.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-400 pt-2">
                    <span>{isBn ? `মজুরি (${makingChargePerGram}৳ × ${jewelryCalc.weightGrams}g):` : `Making Charge (৳${makingChargePerGram}/g):`}</span>
                    <span className="text-amber-300 font-bold">+৳{jewelryCalc.makingChargeTotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-400 pt-2">
                    <span>{isBn ? 'উপ-মোট (Subtotal):' : 'Subtotal:'}</span>
                    <span className="text-slate-200">৳{jewelryCalc.subtotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-400 pt-2">
                    <span>{isBn ? 'সরকারি ভ্যাট (Government VAT 5%):' : 'Govt VAT (5%):'}</span>
                    <span className="text-emerald-400 font-bold">+৳{jewelryCalc.vatAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold pt-3 text-white border-t-2 border-amber-500/40">
                    <span className="text-amber-400">{isBn ? 'সর্বমোট ক্রয়মূল্য (Total Retail):' : 'Total Retail Price:'}</span>
                    <span className="text-xl text-amber-300 font-mono">
                      ৳{jewelryCalc.totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleAddToPhysicalAssets}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{isBn ? 'স্থাবর সম্পদে যোগ করুন' : 'Add to Physical Assets'}</span>
                </button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSyncToZakat}
                >
                  <Scale className="h-4 w-4 text-emerald-400" />
                  <span>{isBn ? 'যাকাত নিসাব আপডেট' : 'Sync to Zakat'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FOREIGN EXCHANGE & REMITTANCE */}
      {/* ========================================================================= */}
      {activeTab === 'fx' && (
        <div className="space-y-6">
          {/* Remittance Calculator Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span>{isBn ? 'প্রবাসী রেমিট্যান্স ও সরকারি ২.৫% নগদ প্রণোদনা ক্যালকুলেটর' : 'Remittance & Govt 2.5% Cash Incentive Calculator'}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  বৈধ ব্যাংকিং চ্যানেলে রেমিট্যান্স পাঠালে বাংলাদেশ সরকারের সরাসরি ২.৫% ক্যাশ ইনসেন্টিভ সহ সর্বমোট প্রাপ্য টাকার হিসাব।
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30 self-start md:self-center">
                +2.5% নগদ প্রণোদনা
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Foreign Amount & Currency */}
              <Field className="md:col-span-4" label={isBn ? 'বৈদেশিক মুদ্রার পরিমাণ' : 'Foreign Amount'}>
                <div className="flex gap-2">
                  <select
                    value={remitCurrency}
                    onChange={(e) => setRemitCurrency(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  >
                    {fxRates.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.flag} {f.code}
                      </option>
                    ))}
                  </select>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1"
                      value={remitAmount}
                      onChange={(e) => setRemitAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 1000"
                    />
                  </div>
                </div>
              </Field>

              {/* Rate Type Channel */}
              <Field className="md:col-span-3" label={isBn ? 'বিনিময় চ্যানেল' : 'Exchange Channel'}>
                <Select
                  value={remitRateType}
                  onChange={(e) => setRemitRateType(e.target.value as any)}
                >
                  <option value="remittanceRate">ব্যাংক রেমিট্যান্স দর (Bank Remittance)</option>
                  <option value="cashKerbRate">খোলা বাজার / ক্যাশ নোট (Kerb Market)</option>
                  <option value="interbankRate">আন্তঃব্যাংক অফিশিয়াল (BB Interbank)</option>
                </Select>
              </Field>

              {/* Live Converted Output */}
              <div className="md:col-span-5 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>এক্সচেঞ্জ রেট:</span>
                  <span className="text-white font-bold">1 {remitCurrency} = ৳{remittanceCalc.exchangeRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>মূল টাকা (Base):</span>
                  <span>৳{remittanceCalc.baseAmountBdt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>+২.৫% সরকারি প্রণোদনা:</span>
                  <span>+৳{remittanceCalc.govtIncentiveAmountBdt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-white pt-1 border-t border-slate-800">
                  <span className="text-emerald-300">সর্বমোট পাবেন:</span>
                  <span className="text-base text-emerald-400 font-bold">
                    ৳{remittanceCalc.totalReceivableBdt.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Currency Rates Table (13 Major Currencies) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  {isBn ? 'বৈদেশিক মুদ্রা লাইভ এক্সচেঞ্জ রেট (বাংলাদেশ টাকা / BDT)' : 'Foreign Currency Exchange Rates (vs BDT)'}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  13 Currencies
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {isBn ? 'সর্বশেষ আপডেট:' : 'Last Updated:'} {new Date().toLocaleTimeString()}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">{isBn ? 'মুদ্রা (Currency)' : 'Currency'}</th>
                    <th className="py-3 px-4 font-semibold text-right">{isBn ? 'আন্তঃব্যাংক দর (Interbank)' : 'Interbank Rate'}</th>
                    <th className="py-3 px-4 font-semibold text-right">{isBn ? 'রেমিট্যান্স দর (Remittance)' : 'Remittance Rate'}</th>
                    <th className="py-3 px-4 font-semibold text-right">{isBn ? '২.৫% প্রণোদনা সহ' : 'With 2.5% Incentive'}</th>
                    <th className="py-3 px-4 font-semibold text-right">{isBn ? 'খোলা বাজার / ক্যাশ (Kerb)' : 'Cash / Kerb'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {fxRates.map((f) => {
                    const withIncentive = f.remittanceRate * 1.025;
                    return (
                      <tr key={f.code} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                          <span className="text-lg">{f.flag}</span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1">
                              <span>{f.code}</span>
                              <span className="text-slate-500 text-[10px]">({f.symbol})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {isBn ? f.nameBn : f.nameEn}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300">
                          ৳{f.interbankRate.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                          ৳{f.remittanceRate.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-sky-300">
                          ৳{withIncentive.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-amber-300">
                          ৳{f.cashKerbRate.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-950/40 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4">
              <span>* ব্যাংক ভেদে এবং লেনদেনের পরিমাণের ওপর ভিত্তি করে রেট সামান্য পরিবর্তন হতে পারে।</span>
              <span className="text-emerald-400 font-mono">উৎস: বাংলাদেশ ব্যাংক ও আন্তর্জাতিক বাজার সূচক</span>
            </div>
          </div>

          {/* Reverse Converter: BDT to Foreign Currency (Travel / Study / Medical Abroad) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ArrowLeftRight className="h-4 w-4 text-sky-400" />
                <span>{isBn ? 'টাকা থেকে বৈদেশিক মুদ্রা কনভার্টার (ভ্রমণ, চিকিৎসা ও উচ্চশিক্ষা কোটা)' : 'BDT to Foreign Currency Converter (Travel & Medical Quota)'}</span>
              </div>
              <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                Outward Remittance
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <Field className="md:col-span-5" label={isBn ? 'বাংলাদেশি টাকার পরিমাণ (BDT)' : 'Amount in BDT'}>
                <Input
                  type="number"
                  min="1000"
                  step="any"
                  value={reverseBdtAmount}
                  onChange={(e) => setReverseBdtAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 100000"
                />
              </Field>

              <Field className="md:col-span-3" label={isBn ? 'কাঙ্ক্ষিত মুদ্রা' : 'Target Currency'}>
                <Select
                  value={reverseCurrency}
                  onChange={(e) => setReverseCurrency(e.target.value)}
                >
                  {fxRates.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.flag} {f.code} — {f.nameEn}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="md:col-span-4 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-slate-400 text-[11px]">
                  বিক্রয় দর: 1 {reverseCurrency} = ৳{reverseFxCalc.rate.toFixed(2)}
                </div>
                <div className="text-sm font-bold text-sky-400">
                  = {reverseFxCalc.currency.symbol} {reverseFxCalc.foreignResult.toLocaleString()} {reverseCurrency}
                </div>
                <div className="text-[10px] text-slate-500">
                  ভ্রমণ কোটা: প্রাপ্তবয়স্ক ব্যক্তি প্রতি বছর সর্বোচ্চ ১২,০০০ ডলার এনডোর্স করতে পারেন।
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: UNIT CONVERTER & BAJUS BUYING GUIDE */}
      {/* ========================================================================= */}
      {activeTab === 'units' && (
        <div className="space-y-6">
          {/* Interactive Weight Converter */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Scale className="h-4 w-4 text-sky-400" />
                <span>{isBn ? 'স্বর্ণের একক রূপান্তর কনভার্টার (ভরি, গ্রাম, আনা, রতি)' : 'Gold Weight Unit Converter'}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Bangladeshi Standards</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <label className="block text-slate-400 text-[11px] font-bold">ভরি / তোলা (Bhori / Tola)</label>
                <input
                  type="number"
                  step="any"
                  value={unitBhori}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setUnitBhori(val);
                    if (typeof val === 'number') {
                      setUnitGrams(Math.round(val * GRAMS_PER_BHORI * 1000) / 1000);
                      setUnitAnna(Math.round(val * ANNA_PER_BHORI * 10) / 10);
                      setUnitRatti(Math.round(val * RATTI_PER_BHORI * 10) / 10);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white font-bold text-sm focus:border-sky-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">= ১ ভরি = ১৬ আনা</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <label className="block text-slate-400 text-[11px] font-bold">গ্রাম (Grams)</label>
                <input
                  type="number"
                  step="any"
                  value={unitGrams}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setUnitGrams(val);
                    if (typeof val === 'number') {
                      setUnitBhori(Math.round((val / GRAMS_PER_BHORI) * 1000) / 1000);
                      setUnitAnna(Math.round((val / (GRAMS_PER_BHORI / 16)) * 10) / 10);
                      setUnitRatti(Math.round((val / (GRAMS_PER_BHORI / 96)) * 10) / 10);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-emerald-400 font-bold text-sm focus:border-sky-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">= ১১.৬৬৪ গ্রাম = ১ ভরি</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <label className="block text-slate-400 text-[11px] font-bold">আনা (Anna)</label>
                <input
                  type="number"
                  step="any"
                  value={unitAnna}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setUnitAnna(val);
                    if (typeof val === 'number') {
                      setUnitBhori(Math.round((val / 16) * 1000) / 1000);
                      setUnitGrams(Math.round((val * (GRAMS_PER_BHORI / 16)) * 1000) / 1000);
                      setUnitRatti(Math.round(val * 6 * 10) / 10);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white font-bold text-sm focus:border-sky-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">১ আনা = ০.৭২৯ গ্রাম</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <label className="block text-slate-400 text-[11px] font-bold">রতি (Ratti)</label>
                <input
                  type="number"
                  step="any"
                  value={unitRatti}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setUnitRatti(val);
                    if (typeof val === 'number') {
                      setUnitBhori(Math.round((val / 96) * 1000) / 1000);
                      setUnitGrams(Math.round((val * (GRAMS_PER_BHORI / 96)) * 1000) / 1000);
                      setUnitAnna(Math.round((val / 6) * 10) / 10);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white font-bold text-sm focus:border-sky-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">১ রতি = ০.১২১৫ গ্রাম</span>
              </div>
            </div>
          </div>

          {/* Educational Cheat Sheet: Gold Buying & Selling Rules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hallmark Identification */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <ShieldCheck className="h-4 w-4" />
                <span>হলমার্কের কোড চেনার উপায়</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                <li><strong className="text-white font-mono">22K / 916:</strong> ৯১.৬% বিশুদ্ধ স্বর্ণ (সবচেয়ে জনপ্রিয় গহনা)।</li>
                <li><strong className="text-white font-mono">21K / 875:</strong> ৮৭.৫% বিশুদ্ধ স্বর্ণ।</li>
                <li><strong className="text-white font-mono">18K / 750:</strong> ৭৫% বিশুদ্ধ স্বর্ণ (হালকা ও ডায়মন্ড গহনায় ব্যবহৃত)।</li>
                <li><strong className="text-white font-mono">Traditional:</strong> সনাতন পদ্ধতির স্বর্ণ (হলমার্ক ছাড়া)।</li>
              </ul>
            </div>

            {/* BAJUS Buyback / Return Policy */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Percent className="h-4 w-4" />
                <span>স্বর্ণ বিক্রি ও বদলানোর বাজুস নিয়ম</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                <li><strong className="text-white">গহনা বদল (Exchange):</strong> বর্তমান বাজার দর থেকে ১০% কর্তন করা হয়।</li>
                <li><strong className="text-white">ক্যাশ ফেরত (Cash Return):</strong> বর্তমান বাজার দর থেকে ২০% কর্তন করা হয়।</li>
                <li>মেকিং চার্জ ও ভ্যাটের টাকা ফেরত পাওয়া যায় না।</li>
                <li>অবশ্যই ক্যাডমিয়াম হলমার্ক ও বাজুস মান্য রসিদ সংরক্ষণ করতে হবে।</li>
              </ul>
            </div>

            {/* Zakat & Tax Implications */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <Scale className="h-4 w-4" />
                <span>যাকাত ও এনবিআর রিটার্ন সংযোগ</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                <li><strong className="text-white">যাকাত নিসাব:</strong> ৭.৫ ভরি (৮৭.৪৮ গ্রাম) স্বর্ণের মালিক হলে ২.৫% যাকাত প্রযোজ্য।</li>
                <li><strong className="text-white">NBR IT-10B:</strong> আয়কর রিটার্নে আপনার ক্রয়কৃত স্বর্ণের পরিমাণ ও ক্রয়মূল্য প্রদর্শন বাধ্যতামূলক।</li>
                <li>মানি ক্যানভাসে ১-ক্লিকেই যাকাত ও ট্যাক্স শিটে স্বর্ণের দর আপডেট হয়ে যায়।</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
