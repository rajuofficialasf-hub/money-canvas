import React, { useState } from 'react';
import { ShieldCheck, Lock, Database, CheckCircle2, ArrowLeft } from 'lucide-react';

export const PrivacyPolicyView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="max-w-4xl mx-auto space-y-8 bg-slate-900/60 p-6 sm:p-10 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-2xl">
        {/* Top Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {lang === 'en' ? 'Privacy Policy' : 'প্রাইভেসি পলিসি'}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Money Canvas — Personal Wealth & Investment Operating System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  lang === 'en'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('bn')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  lang === 'bn'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
            </div>

            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{lang === 'en' ? 'Back' : 'ফিরে যান'}</span>
              </button>
            ) : (
              <a
                href="/"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Home</span>
              </a>
            )}
          </div>
        </div>

        {/* Highlights Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-semibold text-xs sm:text-sm">
                {lang === 'en' ? '100% Private Ledger' : '১০০% ব্যক্তিগত খাতা'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'en'
                  ? 'Your accounting transactions are encrypted and only accessible by your account.'
                  : 'আপনার সকল লেনদেন এনক্রিপ্ট করা এবং শুধু আপনার অ্যাকাউন্টে এক্সেসযোগ্য।'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Database className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-semibold text-xs sm:text-sm">
                {lang === 'en' ? 'Secure Cloud Sync' : 'নিরাপদ ক্লাউড সিঙ্ক'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'en'
                  ? 'Firestore database security rules enforce strict per-user data segregation.'
                  : 'ফায়ারবেস ডাটাবেজে আপনার হিসাব সম্পূর্ণ সুরক্ষিত ও আলাদা থাকে।'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Lock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-semibold text-xs sm:text-sm">
                {lang === 'en' ? 'Zero Data Sharing' : 'কোনো তথ্য বিক্রি বা শেয়ার নয়'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'en'
                  ? 'We do not sell, monetize, or transmit your financial information to any third parties.'
                  : 'আপনার কোনো ব্যক্তিগত আর্থিক তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করা হয় না।'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Privacy Policy Sections */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          {lang === 'en' ? (
            <>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs">
                Last updated: September 2026 • Official Google Play & User Data Protection Policy for <strong>Money Canvas</strong>.
              </div>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  1. Introduction & Overview
                </h2>
                <p>
                  <strong>Money Canvas</strong> is a comprehensive personal wealth and double-entry accounting operating system designed to help individuals track assets, bank accounts, stocks, fixed deposits, loans, and expenses with complete privacy. We are committed to protecting your privacy and being transparent about our data practices.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  2. Information We Collect
                </h2>
                <p>
                  We only collect data that is strictly necessary to authenticate your identity and provide the app's financial tracking features:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs sm:text-sm">
                  <li>
                    <strong className="text-white">Google Account Data:</strong> When you choose to sign in with Google, we access basic, non-sensitive profile information: your name, email address, and profile picture avatar provided by Google Identity Services (<code className="text-emerald-400 font-mono text-[11px]">email</code>, <code className="text-emerald-400 font-mono text-[11px]">profile</code>, <code className="text-emerald-400 font-mono text-[11px]">openid</code>).
                  </li>
                  <li>
                    <strong className="text-white">Financial & Ledger Data:</strong> Accounts, transactions, asset valuations, investments, and budgets created by you within the app.
                  </li>
                  <li>
                    <strong className="text-white">Device Information:</strong> Device model and biometric authentication capability (if you opt into fingerprint / biometric app lock; biometric data never leaves your device's secure enclave).
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  3. How We Use Your Information
                </h2>
                <p>The collected information is used exclusively to:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs sm:text-sm">
                  <li>Authenticate your identity and provide secure access to your private financial ledger.</li>
                  <li>Sync your financial records across your verified devices using encrypted Firestore database partitions.</li>
                  <li>Calculate portfolio net worth, investment performance, and budget analytics for your personal viewing.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  4. Data Security & Storage
                </h2>
                <p>
                  All data is encrypted in transit using industry-standard TLS/SSL protocols. Server-side database records are protected by strict Firebase Security Rules (<code className="text-emerald-400 font-mono text-[11px]">firestore.rules</code>) ensuring that only your authenticated Google User ID can read or write your personal financial records.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  5. Third-Party Sharing
                </h2>
                <p>
                  <strong>We do NOT sell, lease, trade, or share your personal or financial data with any advertisers, brokers, lenders, or marketing affiliates.</strong>
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  6. User Data Retention & Deletion (Google Play Compliance)
                </h2>
                <p>
                  You have full control over your data. In compliance with Google Play Store policies:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                  <li>
                    <strong>In-App Immediate Deletion:</strong> You can permanently delete your Firebase user account, cloud-synced ledgers, encrypted vaults, and local device records at any time from <strong>Settings &gt; Danger Zone &gt; Delete My Account &amp; Data</strong>.
                  </li>
                  <li>
                    <strong>Web-Based Deletion Portal:</strong> If you have uninstalled the app or lost device access, you can submit an account &amp; data deletion request via our public web portal:{' '}
                    <a href="#/data-deletion" className="text-rose-400 hover:text-rose-300 underline font-semibold">
                      Online Account &amp; Data Deletion Request Portal
                    </a>.
                  </li>
                  <li>
                    <strong>Zero Data Retained:</strong> Upon deletion, no financial transactions, profiles, or encryption keys are retained on our servers.
                  </li>
                </ul>
              </section>

              <section className="space-y-2 border-t border-slate-800 pt-4">
                <h2 className="text-lg font-bold text-white">7. Contact the Developer</h2>
                <p className="text-xs text-slate-400">
                  If you have questions, feedback, or concerns regarding your privacy or this policy, please reach out directly:
                  <br />
                  <span className="font-mono text-emerald-400 font-semibold text-sm">raju.official.asf@gmail.com</span>
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs">
                সর্বশেষ আপডেট: সেপ্টেম্বর ২০২৬ • <strong>Money Canvas</strong> ব্যবহারকারীদের তথ্য সুরক্ষা নীতিমালা।
              </div>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  ১. ভূমিকা
                </h2>
                <p>
                  <strong>Money Canvas</strong> একটি আধুনিক ও নিরাপদ ব্যক্তিগত আর্থিক হিসাব ও সম্পদ ব্যবস্থাপনা অ্যাপ্লিকেশন। আমরা আপনার তথ্যের গোপনীয়তা ও সুরক্ষাকে সর্বোচ্চ অগ্রাধিকার দিই।
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  ২. আমরা কী তথ্য সংগ্রহ করি
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs sm:text-sm">
                  <li><strong className="text-white">গুগল অ্যাকাউন্ট তথ্য:</strong> আপনি যখন গুগল দিয়ে সাইন-ইন করেন, আমরা আপনার নাম, ইমেইল ঠিকানা ও প্রোফাইল ছবি সংগ্রহ করি।</li>
                  <li><strong className="text-white">আর্থিক তথ্য:</strong> আপনার ব্যাংক অ্যাকাউন্ট, আয়-ব্যয়, ডিপিএস, এফডিআর, শেয়ার পোর্টফোলিও ও লোনের হিসাব।</li>
                  <li><strong className="text-white">বায়োমেট্রিক তথ্য:</strong> আপনি চাইলে ফিঙ্গারপ্রিন্ট লক ব্যবহার করতে পারেন; বায়োমেট্রিক ডাটা কখনোই আপনার ফোন থেকে বাইরে যায় না।</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  ৩. তথ্যের ব্যবহার ও নিরাপত্তা
                </h2>
                <p>
                  আমরা কখনোই আপনার কোনো আর্থিক বা ব্যক্তিগত তথ্য বিজ্ঞাপনদাতা বা তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করি না। আপনার সকল তথ্য শক্তিশালী এনক্রিপশন ও ফায়ারবেস সিকিউরিটি রুলস দ্বারা সুরক্ষিত।
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">
                  ৪. অ্যাকাউন্ট ও ডাটা সম্পূর্ণ মুছে ফেলা (Google Play Compliance)
                </h2>
                <p>
                  গুগল প্লে স্টোর নীতি অনুযায়ী ব্যবহারকারী যেকোনো সময় তার অ্যাকাউন্ট ও তথ্য সম্পূর্ণ অপসারণ করতে পারেন:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                  <li>
                    <strong>অ্যাপ থেকে সরাসরি:</strong> সেটিংসের বিপদজনক এলাকা থেকে <strong>&quot;Delete Account &amp; All Data&quot;</strong> চেপে তাৎক্ষণিকভাবে ফায়ারবেস অথেনটিকেশন, ক্লাউড সিঙ্ক এবং ডিভাইসের সব তথ্য স্থায়ীভাবে মুছে ফেলা যায়।
                  </li>
                  <li>
                    <strong>অনলাইন ওয়েব পোর্টাল:</strong> অ্যাপ আনইনস্টল করে থাকলে আমাদের ডেডিকেটেড ওয়েব লিঙ্ক:{' '}
                    <a href="#/data-deletion" className="text-rose-400 hover:text-rose-300 underline font-semibold">
                      অনলাইন অ্যাকাউন্ট ও ডেটা অপসারণ অনুরোধ পোর্টাল
                    </a>-এ গিয়ে ইমেইল জমা দিয়ে ২৪-৪৮ ঘণ্টার মধ্যে ডেটা মুছে ফেলার অনুরোধ করা যায়।
                  </li>
                </ul>
              </section>

              <section className="space-y-2 border-t border-slate-800 pt-4">
                <h2 className="text-lg font-bold text-white">৫. যোগাযোগ</h2>
                <p className="text-xs text-slate-400">
                  প্রাইভেসি পলিসি সম্পর্কে যেকোনো তথ্যের জন্য সরাসরি যোগাযোগ করুন:
                  <br />
                  <span className="font-mono text-emerald-400 font-semibold text-sm">raju.official.asf@gmail.com</span>
                </p>
              </section>
            </>
          )}
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <div>© {new Date().getFullYear()} Money Canvas. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="/terms" className="text-slate-400 hover:text-emerald-400">Terms of Service</a>
            <a href="/" className="text-slate-400 hover:text-emerald-400">Home</a>
          </div>
        </div>
      </div>
    </div>
  );
};
