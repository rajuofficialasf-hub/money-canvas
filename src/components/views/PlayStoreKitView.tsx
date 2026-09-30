import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { APP_CONFIG } from '../../lib/app-config';
import { useLanguage } from '../../lib/language-context';
import {
  Download,
  Copy,
  CheckCircle2,
  Image,
  FileText,
  ShieldCheck,
  Sparkles,
  CheckSquare,
  Square,
  Award,
  Lock,
} from 'lucide-react';

interface AssetCardProps {
  titleEn: string;
  titleBn: string;
  dimension: string;
  format: string;
  sizeDesc: string;
  svgUrl: string;
  pngUrl: string;
  aspectRatio: string;
  descriptionEn: string;
  descriptionBn: string;
}

export const PlayStoreKitView: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { openAuthModal, isAdmin } = useAuth();
  const { isBn } = useLanguage();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>('/play-store/feature_graphic_1024x500.png');
  const [activeTab, setActiveTab] = useState<'assets' | 'metadata' | 'datasafety' | 'checklist'>('assets');

  // Checklist state saved in local storage
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('playstore_publish_checklist_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem('playstore_publish_checklist_v1', JSON.stringify(updated));
      return updated;
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Owner Access Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Google Play Store Kit and publishing assets are private developer resources restricted exclusively to the app owner (<span className="text-emerald-400 font-mono">{APP_CONFIG.OWNER_EMAIL}</span>).
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={openAuthModal}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Sign In with Owner Account</span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const assets: AssetCardProps[] = [
    {
      titleEn: 'High-Res App Icon',
      titleBn: 'হাই-রেজ্যুলিউশন অ্যাপ আইকন',
      dimension: '512 x 512 px',
      format: 'PNG (32-bit color, no transparency)',
      sizeDesc: 'Max 1 MB',
      svgUrl: '/play-store/app_icon_512x512.svg',
      pngUrl: '/play-store/app_icon_512x512.png',
      aspectRatio: 'aspect-square',
      descriptionEn: 'Official Money Canvas emblem with emerald/gold gradient, taka mark, and full-bleed dark background.',
      descriptionBn: 'গুগল প্লে স্টোর স্পেসিফিকেশন মেনে তৈরি সম্পূর্ণ ব্যাকগ্রাউন্ডসহ গোল্ডেন টাকা ও এমারেল্ড গ্রোথ আইকন।',
    },
    {
      titleEn: 'Feature Graphic Banner',
      titleBn: 'ফিচার গ্রাফিক ব্যানার',
      dimension: '1024 x 500 px',
      format: 'PNG (No transparency)',
      sizeDesc: 'Max 1 MB',
      svgUrl: '/play-store/feature_graphic_1024x500.svg',
      pngUrl: '/play-store/feature_graphic_1024x500.png',
      aspectRatio: 'aspect-[1024/500]',
      descriptionEn: 'High-impact banner showcased at the top of the Google Play Store listing with localized headlines and feature highlights.',
      descriptionBn: 'প্লে স্টোরে অ্যাপের শীর্ষে প্রদর্শিত মূল ব্যানার — বাংলা ও ইংরেজি হেডলাইন ও ফিচার হাইলাইটস।',
    },
    {
      titleEn: 'Screenshot 1: Dashboard & Cash Flow',
      titleBn: 'স্ক্রিনশট ১: ড্যাশবোর্ড ও ক্যাশ ফ্লো',
      dimension: '1080 x 1920 px (9:16)',
      format: 'PNG',
      sizeDesc: 'High Definition',
      svgUrl: '/play-store/screenshot_1_dashboard.svg',
      pngUrl: '/play-store/screenshot_1_dashboard_1080x1920.png',
      aspectRatio: 'aspect-[9/16]',
      descriptionEn: 'Complete financial overview, net worth breakdown, multi-account balances & monthly cash flow.',
      descriptionBn: 'নেট ওয়ার্থ, মাসিক আয়-ব্যয় ও একাধিক ব্যাংক/মোবাইল ব্যাংকিং অ্যাকাউন্টের লাইভ ওভারভিউ।',
    },
    {
      titleEn: 'Screenshot 2: Ledger & SMS Parser',
      titleBn: 'স্ক্রিনশট ২: লেজার ও SMS পার্সিং',
      dimension: '1080 x 1920 px (9:16)',
      format: 'PNG',
      sizeDesc: 'High Definition',
      svgUrl: '/play-store/screenshot_2_ledger.svg',
      pngUrl: '/play-store/screenshot_2_ledger_1080x1920.png',
      aspectRatio: 'aspect-[9/16]',
      descriptionEn: 'Automated bKash, Nagad & Bank SMS parsing into strict double-entry accounting transactions.',
      descriptionBn: 'বিকাশ, নগদ ও ব্যাংক SMS থেকে স্বয়ংক্রিয় হিসাব এবং নিখুঁত ডাবল-এন্ট্রি ব্যালেন্সিং।',
    },
    {
      titleEn: 'Screenshot 3: Stocks, Sanchayapatra & DPS',
      titleBn: 'স্ক্রিনশট ৩: ডিএসই স্টক ও সঞ্চয়পত্র',
      dimension: '1080 x 1920 px (9:16)',
      format: 'PNG',
      sizeDesc: 'High Definition',
      svgUrl: '/play-store/screenshot_3_investments.svg',
      pngUrl: '/play-store/screenshot_3_investments_1080x1920.png',
      aspectRatio: 'aspect-[9/16]',
      descriptionEn: 'Live DSE stock market portfolio tracking, national sanchayapatra maturity & monthly DPS analytics.',
      descriptionBn: 'ঢাকা স্টক এক্সচেঞ্জ (DSE) পোর্টফোলিও, জাতীয় সঞ্চয়পত্র ও মাসিক ডিপিএস ট্র্যাকিং।',
    },
    {
      titleEn: 'Screenshot 4: Budgets, Zakat & Privacy',
      titleBn: 'স্ক্রিনশট ৪: বাজেট, যাকাত ও গোপনীয়তা',
      dimension: '1080 x 1920 px (9:16)',
      format: 'PNG',
      sizeDesc: 'High Definition',
      svgUrl: '/play-store/screenshot_4_budgets_zakat.svg',
      pngUrl: '/play-store/screenshot_4_budgets_zakat_1080x1920.png',
      aspectRatio: 'aspect-[9/16]',
      descriptionEn: 'Zero-based envelope budgets, Nisab-verified Islamic Zakat calculator, and 100% offline security.',
      descriptionBn: 'স্মার্ট ক্যাটাগরি বাজেট, নেসাব-ভেরিফাইড যাকাত ক্যালকুলেটর ও সম্পূর্ণ অফলাইন সিকিউরিটি।',
    },
  ];

  const handleDownloadAll = () => {
    assets.forEach((asset, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = asset.pngUrl;
        link.download = asset.pngUrl.split('/').pop() || `play-store-asset-${idx + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 400);
    });
  };

  // Google Play Listing Metadata
  const appTitleBn = 'Money Canvas: টাকা ও সম্পদ হিসাব';
  const appTitleEn = 'Money Canvas: Smart Finance OS';

  const shortDescBn = 'স্মার্ট ডাবল-এন্ট্রি হিসাব, DSE স্টক, bKash SMS পার্সিং ও যাকাত ক্যালকুলেটর।';
  const shortDescEn = 'Smart double-entry ledger, DSE stocks, bKash SMS parser & 100% offline finance OS.';

  const fullDescBn = `Money Canvas (মানি ক্যানভাস) হলো বাংলাদেশের প্রেক্ষাপটে তৈরি একটি সর্বাধুনিক পার্সোনাল ফাইন্যান্স, ডাবল-এন্ট্রি অ্যাকাউন্টিং এবং বিনিয়োগ ট্র্যাকিং অ্যাপ্লিকেশন। এটি ১০০% অফলাইন ও ব্যক্তিগত গোপনীয়তা নিশ্চিত করে কাজ করে।

🌟 মূল সুবিধাসমূহ:

১. অটোমেটেড SMS ট্রানজ্যাকশন পার্সিং:
• bKash, Nagad, Rocket, City Bank, BRAC Bank, EBL সহ যেকোনো ব্যাংকিং SMS কপি বা পেস্ট করে এক ক্লিকে নিখুঁত লেজারে রূপান্তর করুন।
• ট্রানজ্যাকশন ফি ও ভ্যাট স্বয়ংক্রিয়ভাবে ব্যালেন্স শিটে এন্ট্রি হয়।

২. পূর্ণাঙ্গ ডাবল-এন্ট্রি লেজার ও ব্যালেন্স শিট:
• আন্তর্জাতিক অ্যাকাউন্টিং স্ট্যান্ডার্ড অনুযায়ী ডেবিট ও ক্রেডিট সমতা নিশ্চিত করে।
• নগদ টাকা, সেভিংস, ক্রেডিট কার্ড ও লোন আলাদা লেজারে নিখুঁতভাবে পরিচালনা করুন।

৩. ঢাকা স্টক এক্সচেঞ্জ (DSE) ও ইনভেস্টমেন্ট ট্র্যাকার:
• আপনার সব শেয়ার, কেনা দাম, বর্তমান বাজারমূল্য ও লাভ/ক্ষতি (Realized & Unrealized P&L) ট্র্যাক করুন।
• জাতীয় সঞ্চয়পত্র (Family, 3-Monthly, Pensioner), ফিক্সড ডিপোজিট (FDR) ও মাসিক DPS কিস্তি ক্যালকুলেটর।

৪. ইসলামিক যাকাত ও ট্যাক্স ক্যালকুলেটর:
• বাংলাদেশ স্বর্ণ ও রৌপ্যের বাজারদর অনুযায়ী বর্তমান নেসাব (Nisab) হিসাব করে নিখুঁত যাকাত নিরূপণ।
• জাতীয় রাজস্ব বোর্ড (NBR) বিধি অনুযায়ী সহজ ইনকাম ট্যাক্স ও কর রেয়াত হিসাব।

৫. ১০০% নিরাপদ, নো-অ্যাড ও অফলাইন ফার্স্ট:
• কোনো বিরক্তিকর বিজ্ঞাপন নেই এবং কোনো থার্ড-পার্টি ট্র্যাকার নেই।
• সম্পূর্ণ ডেটা আপনার নিজস্ব ডিভাইসে সংরক্ষিত থাকে। প্রয়োজনে আপনার নিজস্ব Google Drive-এ এনক্রিপ্টেড ব্যাকআপ নিতে পারেন।
• ফেস আইডি ও বায়োমেট্রিক ফিঙ্গারপ্রিন্ট অ্যাপ লক সাপোর্ট।

Money Canvas — আপনার ব্যক্তিগত ও পারিবারিক আর্থিক স্বাধীনতার বিশ্বস্ত ডিজিটাল সঙ্গী।`;

  const fullDescEn = `Money Canvas is an all-in-one personal wealth, double-entry accounting, and multi-asset investment operating system tailored for professionals, investors, and families. Built with a strict offline-first and privacy-centric architecture.

🌟 KEY FEATURES:

1. Intelligent SMS Transaction Parser:
• Automatically parse transaction SMS from bKash, Nagad, Rocket, City Bank, BRAC Bank, Eastern Bank, and more into balanced ledger entries with one click.
• Seamlessly isolates VAT, transaction charges, and merchant metadata.

2. Professional Double-Entry Accounting:
• Strictly maintains the fundamental accounting equation: Assets = Liabilities + Equity.
• Zero unclassified spending, accurate multi-currency support (BDT canonical), and real-time trial balance.

3. DSE Stock Market & Investment Hub:
• Track Dhaka Stock Exchange (DSE) equities with weighted average buy price, current market valuation, dividend tracking, and capital gains reports.
• Comprehensive trackers for National Sanchayapatra (Savings Certificates), Bank Fixed Deposits (FDR), and monthly DPS maturity curves.

4. Islamic Zakat & Income Tax Estimator:
• Real-time Gold & Silver Nisab threshold calculator for accurate 2.5% Zakat on wealth.
• Bangladesh NBR progressive income tax bracket estimator with investment tax rebate simulations.

5. 100% Private, Ad-Free & Offline-First:
• No tracking, zero third-party telemetry, and absolutely no ads.
• All financial records reside securely on your device's local database.
• Optional encrypted backup directly to your own Google Drive.
• Protected by Biometric Lock (Face ID / Fingerprint).

Master your wealth and take control of your financial destiny with Money Canvas!`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1.5">
            <Sparkles className="h-4 w-4" />
            <span>Google Play Console Release & Publishing Studio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Play Store Assets & Listing Kit</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              100% Ready
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
            {isBn
              ? 'গুগল প্লে কনসোলে অ্যাপ সাবমিট করার জন্য প্রয়োজনীয় সকল হাই-রেজ্যুলিউশন আইকন, ফিচার ব্যানার, ফোন স্ক্রিনশট এবং বাংলা-ইংরেজি স্টোর মেটাডেটা এক ক্লিকে ডাউনলোড ও কপি করুন।'
              : 'Official high-resolution icon (512x512), feature graphic (1024x500), HD device screenshots (1080x1920), and bilingual store metadata formatted to Google Play Console specifications.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleDownloadAll}
            className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{isBn ? 'সবগুলো অ্যাসেট ডাউনলোড করুন' : 'Download All Assets (Batch)'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'assets'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Image className="h-4 w-4 text-emerald-400" />
          <span>{isBn ? 'গ্রাফিক্স ও স্ক্রিনশটস (Visual Assets)' : 'Graphics & Screenshots (6 Assets)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('metadata')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'metadata'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <FileText className="h-4 w-4 text-sky-400" />
          <span>{isBn ? 'স্টোর লিস্টিং টেক্সট (Store Metadata)' : 'Store Listing Metadata'}</span>
        </button>

        <button
          onClick={() => setActiveTab('datasafety')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'datasafety'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          <span>{isBn ? 'ডাটা সেফটি ও পলিসি (Data Safety)' : 'Data Safety & Compliance'}</span>
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'checklist'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <CheckSquare className="h-4 w-4 text-purple-400" />
          <span>{isBn ? 'পাবলিশিং চেকলিস্ট ২০২৬ (Publish Checklist)' : '2026 Publishing Checklist'}</span>
        </button>
      </div>

      {/* TAB 1: VISUAL ASSETS */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Quick Summary Card */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isBn ? 'গুগল প্লে কনসোল স্ট্যান্ডার্ড অনুযায়ী প্রস্তুত' : 'Fully Compliant with Google Play Store Requirements'}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {isBn
                    ? '১টি ৫১২x৫১২ আইকন, ১টি ১০২৪x৫০০ ফিচার ব্যানার এবং ৪টি ১০৮০x১৯২০ স্ক্রিনশট তৈরি করা হয়েছে। সবগুলো ফাইল PNG ও SVG উভয় ফরম্যাটে উপলব্ধ।'
                    : 'Generated 1x 512x512 Icon, 1x 1024x500 Feature Graphic, and 4x 1080x1920 HD Device Screenshots. Available in both PNG and SVG.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={handleDownloadAll}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>{isBn ? 'সব ডাউনলোড করুন' : 'Download All PNGs'}</span>
              </button>
            </div>
          </div>

          {/* Grid of 6 Assets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col justify-between hover:border-slate-700 transition-all group"
              >
                <div>
                  {/* Title & Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-white truncate">
                      {isBn ? asset.titleBn : asset.titleEn}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700 shrink-0">
                      {asset.dimension}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                    {isBn ? asset.descriptionBn : asset.descriptionEn}
                  </p>

                  {/* Image Preview Container */}
                  <div
                    onClick={() => setSelectedPreview(asset.pngUrl)}
                    className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer group-hover:border-emerald-500/50 transition-colors flex items-center justify-center p-2 mb-4 bg-gradient-to-b from-slate-900 to-slate-950"
                  >
                    <img
                      src={asset.pngUrl}
                      alt={asset.titleEn}
                      className="max-h-56 w-auto object-contain rounded drop-shadow-md transition-transform group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-white">
                        Click to Zoom
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{asset.format}</span>
                    <span>{asset.sizeDesc}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={asset.pngUrl}
                      download={asset.pngUrl.split('/').pop()}
                      className="px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold font-mono text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>PNG</span>
                    </a>

                    <a
                      href={asset.svgUrl}
                      download={asset.svgUrl.split('/').pop()}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold font-mono text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>SVG Vector</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Large Preview Modal */}
          {selectedPreview && (
            <div
              className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedPreview(null)}
            >
              <div
                className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl border border-slate-700 p-4 flex flex-col items-center gap-3 overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono text-slate-300 truncate">{selectedPreview}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={selectedPreview}
                      download={selectedPreview.split('/').pop()}
                      className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold font-mono text-xs flex items-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => setSelectedPreview(null)}
                      className="text-slate-400 hover:text-white px-2 py-1 text-xs font-bold font-mono bg-slate-800 rounded"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
                <div className="overflow-auto max-h-[75vh] flex items-center justify-center">
                  <img
                    src={selectedPreview}
                    alt="Play store asset zoom"
                    className="max-h-[75vh] w-auto object-contain rounded shadow-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STORE LISTING METADATA */}
      {activeTab === 'metadata' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Google Play Store Copywriting (Bengali & English)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-formatted text matching Google Play character limits (Title ≤ 30, Short Desc ≤ 80, Full Desc ≤ 4000).
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Play Console Optimized
              </span>
            </div>

            {/* App Title */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <span>App Name / Title</span>
                  <span className="text-[10px] font-mono text-slate-500">(Max 30 characters)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bengali */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold mb-0.5">বাংলা লিস্টিং (Bengali)</div>
                    <div className="text-sm font-semibold text-white font-sans">{appTitleBn}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">{appTitleBn.length} / 30 chars</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(appTitleBn, 'title_bn')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copiedKey === 'title_bn' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === 'title_bn' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* English */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-sky-400 font-bold mb-0.5">ইংরেজি লিস্টিং (English)</div>
                    <div className="text-sm font-semibold text-white font-sans">{appTitleEn}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">{appTitleEn.length} / 30 chars</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(appTitleEn, 'title_en')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copiedKey === 'title_en' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === 'title_en' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Short Description */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <span>Short Description</span>
                <span className="text-[10px] font-mono text-slate-500">(Max 80 characters)</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bengali */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold mb-0.5">বাংলা (Bengali)</div>
                    <div className="text-xs text-slate-200 font-sans leading-relaxed">{shortDescBn}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">{shortDescBn.length} / 80 chars</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(shortDescBn, 'short_bn')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copiedKey === 'short_bn' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === 'short_bn' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* English */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-sky-400 font-bold mb-0.5">English</div>
                    <div className="text-xs text-slate-200 font-sans leading-relaxed">{shortDescEn}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">{shortDescEn.length} / 80 chars</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(shortDescEn, 'short_en')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copiedKey === 'short_en' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === 'short_en' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Full Description */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <span>Full Description (সম্পূর্ণ বিবরণ)</span>
                <span className="text-[10px] font-mono text-slate-500">(Max 4000 characters)</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bengali Full */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">বাংলা ফুল ডেসক্রিপশন</span>
                      <button
                        onClick={() => copyToClipboard(fullDescBn, 'full_bn')}
                        className="px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        {copiedKey === 'full_bn' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'full_bn' ? 'Copied' : 'Copy Text'}</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap max-h-72 overflow-y-auto pr-2 leading-relaxed bg-slate-900/50 p-3 rounded border border-slate-800/80">
                      {fullDescBn}
                    </pre>
                  </div>
                </div>

                {/* English Full */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-sky-400 font-bold">English Full Description</span>
                      <button
                        onClick={() => copyToClipboard(fullDescEn, 'full_en')}
                        className="px-3 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        {copiedKey === 'full_en' ? <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'full_en' ? 'Copied' : 'Copy Text'}</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap max-h-72 overflow-y-auto pr-2 leading-relaxed bg-slate-900/50 p-3 rounded border border-slate-800/80">
                      {fullDescEn}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Categorization & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Application Category</div>
                <div className="text-xs font-bold text-white mt-1">Finance / Accounting</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Content Rating</div>
                <div className="text-xs font-bold text-emerald-400 mt-1">Everyone (PEGI 3 / 3+)</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Store Tags</div>
                <div className="text-xs font-bold text-slate-200 mt-1">Finance, Personal Finance, DSE, Zakat</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA SAFETY & PRIVACY */}
      {activeTab === 'datasafety' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Google Play Data Safety Form Answers</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exact answers to select in the Google Play Console Data Safety questionnaire.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Data Collection & Sharing</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Does your app collect or share any of the required user data types?</strong>
                  <br />
                  <span className="text-emerald-400 font-mono">No</span> — Money Canvas does not share user data with any 3rd party. All financial data is processed locally on device (IndexedDB/Local Vault).
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Data Transfer & Encryption</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Is data encrypted in transit?</strong>
                  <br />
                  <span className="text-emerald-400 font-mono">Yes</span> — All HTTPS connections (Google Drive API / Firebase Auth) use standard TLS 1.3 encryption.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>User Account Deletion & Data Wipe</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Can users request data deletion?</strong>
                  <br />
                  <span className="text-emerald-400 font-mono">Yes</span> — Users can wipe 100% of their data immediately via the built-in "Clean Slate / Reset Ledger" in Settings.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Ads & Financial Policy</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Contains Ads:</strong> <span className="text-emerald-400 font-mono">No</span>
                  <br />
                  <strong>Target Audience:</strong> <span className="text-emerald-400 font-mono">18 and over</span>
                  <br />
                  <strong>Financial App Declaration:</strong> Personal finance management & accounting (Non-banking, non-lending).
                </p>
              </div>
            </div>

            {/* Privacy Policy URL Card */}
            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">Live Privacy Policy URL for Play Console</div>
                <div className="text-xs font-mono text-emerald-400 mt-0.5 truncate max-w-xl">
                  {typeof window !== 'undefined' ? `${window.location.origin}/privacy` : 'https://moneycanvas.app/privacy'}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/privacy` : 'https://moneycanvas.app/privacy', 'priv_url')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                {copiedKey === 'priv_url' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'priv_url' ? 'Copied URL' : 'Copy Privacy URL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PUBLISHING CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isBn ? 'গুগল প্লে কনসোল পাবলিশিং চেকলিস্ট (২০২৬ আপডেট)' : 'Google Play Console 2026 Production Rollout Checklist'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBn ? 'প্রতিটি ধাপ সম্পন্ন করে টিক দিন এবং সহজে ট্র্যাকিং রাখুন।' : 'Track your readiness step-by-step for submission and review.'}
                </p>
              </div>
              <div className="text-xs font-mono text-emerald-400">
                {Object.values(checklist).filter(Boolean).length} / 8 Completed
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'dev_account',
                  titleBn: '১. গুগল প্লে ডেভেলপার অ্যাকাউন্ট তৈরি ও ভেরিফিকেশন',
                  titleEn: '1. Google Play Developer Account & ID Verification',
                  descBn: 'play.google.com/console এ $25 ফি দিয়ে ডেভেলপার অ্যাকাউন্ট ভেরিফাই করুন (D-U-N-S নাম্বার যদি অর্গানাইজেশন হয়)।',
                  descEn: 'Register on play.google.com/console ($25 one-time fee) and complete identity verification.',
                },
                {
                  id: 'create_app',
                  titleBn: '২. কনসোলে নতুন অ্যাপ এন্ট্রি তৈরি (Money Canvas)',
                  titleEn: '2. Create App entry in Play Console',
                  descBn: 'অ্যাপ নাম দিন: "Money Canvas", ভাষা: Bengali/English, ক্যাটাগরি: Finance, Free App হিসেবে সিলেক্ট করুন।',
                  descEn: 'Set App Name "Money Canvas", Default Language English/Bengali, Category Finance, Free.',
                },
                {
                  id: 'upload_assets',
                  titleBn: '৩. আইকন, ফিচার ব্যানার ও ৪টি স্ক্রিনশট আপলোড',
                  titleEn: '3. Upload Graphics & Screenshots',
                  descBn: 'আমাদের তৈরি করা ৫১২x৫১২ আইকন, ১০২৪x৫০০ ব্যানার ও ৪টি ১০৮০x১৯২০ ফোন স্ক্রিনশট আপলোড করুন।',
                  descEn: 'Upload the 512x512 PNG icon, 1024x500 Feature Banner, and 4x Phone Screenshots from the Graphics tab.',
                },
                {
                  id: 'meta_copy',
                  titleBn: '৪. স্টোর লিস্টিং টেক্সট ও বিবরণ কপি-পেস্ট',
                  titleEn: '4. Copy & Paste Store Metadata',
                  descBn: 'শর্ট ডেসক্রিপশন ও ফুল ডেসক্রিপশন কপি করে বাংলা ও ইংরেজি লোকাল সেকশনে পেস্ট করুন।',
                  descEn: 'Fill in Short Description (80 chars) and Full Description (Bengali & English) from Metadata tab.',
                },
                {
                  id: 'privacy_policy',
                  titleBn: '৫. প্রাইভেসি পলিসি লিঙ্ক যুক্ত করা',
                  titleEn: '5. Add Privacy Policy URL',
                  descBn: 'কনসোলের App Content > Privacy Policy-তে অ্যাপের প্রাইভেসি পলিসি লিংক পেস্ট করুন।',
                  descEn: 'Paste the live Privacy Policy URL into App Content > Privacy Policy.',
                },
                {
                  id: 'data_safety',
                  titleBn: '৬. ডাটা সেফটি ফরম ও ফাইন্যান্সিয়াল ডিক্লারেশন পূরণ',
                  titleEn: '6. Complete Data Safety Form & Financial Declarations',
                  descBn: 'ডাটা সেফটি ট্যাবের উত্তরগুলো দেখে ফর্মটি পূরণ করুন (No third party data sharing, offline encryption)।',
                  descEn: 'Complete the questionnaire matching our Data Safety guide (Local storage, zero tracking).',
                },
                {
                  id: 'closed_testing',
                  titleBn: '৭. ক্লোজড টেস্টিং (Closed Testing - ২০ জন টেস্টার, ১৪ দিন)',
                  titleEn: '7. Closed Testing Track (20 Testers, 14 Days)',
                  descBn: 'ব্যক্তিগত অ্যাকাউন্টের ক্ষেত্রে গুগল প্লে রুল অনুযায়ী ২০ জন বন্ধু/পরিবারের ইমেইল অ্যাড করে ১৪ দিন টেস্টিং রান করুন।',
                  descEn: 'For personal developer accounts, invite 20 testers for 14 continuous days before production.',
                },
                {
                  id: 'release_aab',
                  titleBn: '৮. প্রোডাকশন রিলিজ (.AAB / Android App Bundle) আপলোড ও পাবলিশ',
                  titleEn: '8. Upload Signed .AAB Bundle & Submit for Production Review',
                  descBn: 'ক্যাপাসিটর / অ্যান্ড্রয়েড স্টুডিও থেকে সাইনড রিলিজ বান্ডেল তৈরি করে আপলোড ও সাবমিট করুন।',
                  descEn: 'Build signed release bundle via Android Studio (`Build > Generate Signed App Bundle`) and submit.',
                },
              ].map((item) => {
                const isChecked = Boolean(checklist[item.id]);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isChecked
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className={`text-xs font-bold ${isChecked ? 'text-white line-through opacity-80' : 'text-white'}`}>
                        {isBn ? item.titleBn : item.titleEn}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        {isBn ? item.descBn : item.descEn}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
