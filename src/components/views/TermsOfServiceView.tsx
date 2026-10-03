import React, { useState } from 'react';
import { Scale, ArrowLeft } from 'lucide-react';

export const TermsOfServiceView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  return (
    <div className="min-h-screen bg-canvas text-ink-soft py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-accent/20 selection:text-accent-strong">
      <div className="max-w-4xl mx-auto space-y-8 bg-surface/60 p-6 sm:p-10 rounded-2xl border border-edge backdrop-blur-xl shadow-2xl">
        {/* Top Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-edge pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent/10 text-accent-strong rounded-xl border border-accent/20">
              <Scale className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                {lang === 'en' ? 'Terms of Service' : 'ব্যবহারের শর্তাবলী'}
              </h1>
              <p className="text-ink-muted text-xs sm:text-sm mt-1">
                Money Canvas — Personal Wealth & Investment Operating System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-canvas border border-edge rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  lang === 'en'
                    ? 'bg-accent text-accent-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('bn')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  lang === 'bn'
                    ? 'bg-accent text-accent-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                বাংলা
              </button>
            </div>

            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 bg-raised hover:bg-slate-700 text-ink-soft text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{lang === 'en' ? 'Back' : 'ফিরে যান'}</span>
              </button>
            ) : (
              <a
                href="/"
                className="px-4 py-2 bg-raised hover:bg-slate-700 text-ink-soft text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Home</span>
              </a>
            )}
          </div>
        </div>

        {/* Content */}
        {lang === 'en' ? (
          <div className="space-y-6 text-sm text-ink-soft leading-relaxed">
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-accent-strong text-xs">
              Last updated: September 2026 • Effective immediately for all users of Money Canvas.
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                1. Acceptance of Terms
              </h2>
              <p>
                By downloading, accessing, or using the <strong>Money Canvas</strong> application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                2. Description of Service
              </h2>
              <p>
                Money Canvas is a personal finance management tool providing users with double-entry accounting ledgers, multi-asset tracking (stocks, bank accounts, fixed deposits, DPS, gold, properties), cash flow budgeting, and financial reporting.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                3. User Accounts and Authentication
              </h2>
              <p>
                When you sign in with your Google Account, we use your authenticated identity (Google user ID, display name, and email address) to provide access to your private database partition. You are responsible for maintaining the confidentiality of your device and login credentials.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                4. Data Ownership & Privacy
              </h2>
              <p>
                You retain complete ownership of all financial transactions, account details, and ledger data entered into Money Canvas. We do not sell, rent, or monetize your personal financial data. For more details, review our <a href="/privacy" className="text-accent-strong hover:underline">Privacy Policy</a>.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                5. Disclaimer of Financial Advice
              </h2>
              <p>
                Money Canvas is a bookkeeping and asset management utility. It does not provide certified financial, legal, investment, or tax advice. All investment tracking (such as stock portfolio calculations) is based on data provided by you or publicly available market information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                6. Contact Information
              </h2>
              <p className="text-xs text-ink-muted">
                For questions regarding these Terms of Service, contact the developer at:
                <br />
                <span className="font-mono text-accent-strong font-semibold">raju.official.asf@gmail.com</span>
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-6 text-sm text-ink-soft leading-relaxed">
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-accent-strong text-xs">
              সর্বশেষ আপডেট: সেপ্টেম্বর ২০২৬ • Money Canvas ব্যবহারকারীদের জন্য প্রযোজ্য।
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                ১. শর্তাবলীর সম্মতি
              </h2>
              <p>
                <strong>Money Canvas</strong> অ্যাপ্লিকেশনটি ডাউনলোড, অ্যাক্সেস বা ব্যবহার করার মাধ্যমে আপনি এই ব্যবহারের শর্তাবলীর সাথে একমত পোষণ করছেন। আপনি যদি এই শর্তাবলীর সাথে সম্মত না হন, তবে অনুগ্রহ করে অ্যাপ্লিকেশনটি ব্যবহার থেকে বিরত থাকুন।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                ২. সেবার বিবরণ
              </h2>
              <p>
                Money Canvas একটি আধুনিক ব্যক্তিগত আর্থিক ব্যবস্থাপনা টুল। এটি ব্যবহারকারীদের ডাবল-এন্ট্রি হিসাব খাতা, সম্পদ ট্র্যাকিং (ব্যাংক অ্যাকাউন্ট, ডিপিএস, এফডিআর, শেয়ার পোর্টফোলিও), বাজেট ও আর্থিক বিশ্লেষণ তৈরি করতে সহায়তা করে।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                ৩. ইউজার অ্যাকাউন্ট এবং নিরাপত্তা
              </h2>
              <p>
                আপনি যখন গুগল দিয়ে সাইন-ইন করেন, আমরা আপনার গুগল আইডি, নাম ও ইমেইল দিয়ে আপনার ব্যক্তিগত ডাটাবেজ সুরক্ষিত রাখি। আপনার ডিভাইসের নিরাপত্তা বজায় রাখা ব্যবহারকারীর দায়িত্ব।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                ৪. ডাটার মালিকানা
              </h2>
              <p>
                Money Canvas-এ আপনার দেওয়া সকল হিসাব ও তথ্যের পূর্ণ মালিক আপনি। আমরা কোনো অবস্থাতেই আপনার আর্থিক তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করি না।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-ink border-b border-edge pb-2">
                ৫. যোগাযোগ
              </h2>
              <p className="text-xs text-ink-muted">
                ব্যবহারের শর্তাবলী সম্পর্কিত যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন:
                <br />
                <span className="font-mono text-accent-strong font-semibold">raju.official.asf@gmail.com</span>
              </p>
            </section>
          </div>
        )}

        <div className="pt-6 border-t border-edge flex justify-between items-center text-xs text-ink-faint">
          <div>© {new Date().getFullYear()} Money Canvas. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="/privacy" className="text-ink-muted hover:text-accent-strong">Privacy Policy</a>
            <a href="/" className="text-ink-muted hover:text-accent-strong">Home</a>
          </div>
        </div>
      </div>
    </div>
  );
};
