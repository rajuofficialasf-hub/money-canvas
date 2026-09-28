/**
 * Sanchayapatra, Bangladesh Treasury Bonds & Islamic Sukuk Types
 * Comprehensive data models for National Savings Directorate (জাতীয় সঞ্চয় অধিদপ্তর)
 * and Bangladesh Bank Treasury & Sukuk Securities.
 */

export type BondCategory = 'sanchayapatra' | 'treasury_bond' | 'islamic_sukuk';

export type SanchayaSchemeType =
  | 'poribar' // পরিবার সঞ্চয়পত্র (৫ বছর, মাসিক)
  | 'three_month' // ৩-মাস অন্তর মুনাফাভিত্তিক (৩ বছর, ত্রৈমাসিক)
  | 'pensioner' // পেনশনার সঞ্চয়পত্র (৫ বছর, ত্রৈমাসিক)
  | 'bangladesh_5yr' // ৫-বছর মেয়াদী বাংলাদেশ সঞ্চয়পত্র (মেয়াদান্তে)
  | 'post_office_fixed' // ডাকঘর সঞ্চয় ব্যাংক - মেয়াদী (১/২/৩ বছর)
  | 'wage_earners' // ওয়েজ আর্নার্স ডেভেলপমেন্ট বন্ড (৫ বছর, ৬-মাস অন্তর)
  | 'treasury_bond_2y' // বিজিটিবি ২ বছর
  | 'treasury_bond_5y' // বিজিটিবি ৫ বছর
  | 'treasury_bond_10y' // বিজিটিবি ১০ বছর
  | 'treasury_bond_15y' // বিজিটিবি ১৫ বছর
  | 'treasury_bond_20y' // বিজিটিবি ২০ বছর
  | 'govt_ijarah_sukuk' // বাংলাদেশ গভর্নমেন্ট ইজারা সুকুক (শরীয়াহ ভিত্তিক)
  | 'custom_bond'; // অন্যান্য কাস্টম বন্ড

export type PayoutFrequency =
  | 'monthly' // মাসিক (প্রতি মাসে)
  | 'quarterly' // ত্রৈমাসিক (প্রতি ৩ মাসে)
  | 'semi_annually' // ষান্মাসিক (প্রতি ৬ মাসে)
  | 'annually' // বাৎসরিক
  | 'at_maturity'; // মেয়াদান্তে এককালীন

export type InvestmentStatus = 'active' | 'matured' | 'encashed';

export interface SanchayaBondItem {
  id: string;
  userId: string;
  category: BondCategory;
  schemeType: SanchayaSchemeType;
  title: string;
  certificateNumber: string; // e.g. "PS-948291", "BGTB-2034-10Y"
  issuer: string; // e.g. "Sonali Bank PLC", "Bangladesh Bank", "National Savings Directorate", "Post Office"
  issueOfficeBranch?: string; // e.g. "Motijheel Corporate Branch, Dhaka"
  purchaseDate: string; // YYYY-MM-DD
  tenureYears: number; // e.g. 3, 5, 10
  maturityDate: string; // YYYY-MM-DD
  principalAmount: number; // মূলধন (e.g. 10,00,000)
  interestRate: number; // বাৎসরিক মুনাফা/কুপন হার (e.g. 11.52)
  payoutFrequency: PayoutFrequency;
  taxDeductionRate: number; // ৫% বা ১০% উৎসে কর (AIT)
  linkedBankAccountId?: string; // যে ব্যাংক অ্যাকাউন্টে ইএফটি মারফত মুনাফা আসে
  isTaxRebateEligible: boolean; // কর রেয়াতযোগ্য (ষষ্ঠ তফসিল)
  nomineeName?: string;
  nomineeRelation?: string;
  notes?: string;
  status: InvestmentStatus;
  encashedDate?: string;
  encashedAmount?: number;
  totalProfitReceivedToDate?: number;
  createdAt: string;
}

export interface UpcomingPaymentSchedule {
  id: string;
  investmentId: string;
  schemeTitle: string;
  category: BondCategory;
  paymentDate: string; // YYYY-MM-DD
  grossProfit: number;
  taxDeducted: number; // AIT
  netProfit: number;
  isPaid: boolean;
  linkedBankAccountId?: string;
}

export interface EncashmentRuleSlab {
  completedYears: number;
  applicableRatePct: number;
  penaltyDescription: string;
}
