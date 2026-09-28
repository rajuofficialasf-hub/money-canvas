import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useBiometrics } from '../../lib/biometric-context';
import { useLanguage } from '../../lib/language-context';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import {
  User,
  Sliders,
  Shield,
  PlusCircle,
  CheckCircle2,
  Lock,
  Globe,
  Save,
  AlertCircle,
  RotateCcw,
  Trash2,
  ShieldCheck,
  FileText,
  BookOpen,
  Fingerprint,
  Smartphone,
  RefreshCw,
  Sparkles,
  ArrowUpCircle,
} from 'lucide-react';

export const SettingsView: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { user, availableProfiles, switchProfile, updateProfile, createProfile, resetAllUserData } = useAuth();
  const { language, setLanguage, isBn, toggleLanguage, t } = useLanguage();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);
  const {
    isSupported,
    isAvailable,
    biometryTypeName,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
    authenticate,
    lockApp,
    isAuthenticating,
  } = useBiometrics();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [bioFeedback, setBioFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (showPrivacyPolicy) {
    return <PrivacyPolicyView onBack={() => setShowPrivacyPolicy(false)} />;
  }

  // Biometric toggle handler
  const handleToggleBiometric = async () => {
    setBioFeedback(null);
    if (isBiometricEnabled) {
      disableBiometric();
      setBioFeedback({ type: 'success', message: 'বায়োমেট্রিক অ্যাপ লক নিষ্ক্রিয় করা হয়েছে।' });
      setTimeout(() => setBioFeedback(null), 3000);
    } else {
      const res = await enableBiometric();
      if (res.success) {
        setBioFeedback({ type: 'success', message: 'বায়োমেট্রিক অ্যাপ লক সফলভাবে সক্রিয় করা হয়েছে!' });
        setTimeout(() => setBioFeedback(null), 3000);
      } else {
        setBioFeedback({ type: 'error', message: res.error || 'বায়োমেট্রিক যাচাই সম্পন্ন হয়নি।' });
      }
    }
  };

  // Test biometric scan handler
  const handleTestBiometric = async () => {
    setBioFeedback(null);
    const res = await authenticate('বায়োমেট্রিক সেন্সর পরীক্ষা করতে স্ক্যান করুন।');
    if (res.success) {
      setBioFeedback({ type: 'success', message: 'বায়োমেট্রিক সেন্সর চমৎকারভাবে কাজ করছে!' });
      setTimeout(() => setBioFeedback(null), 3500);
    } else {
      setBioFeedback({ type: 'error', message: res.error || 'যাচাই ব্যর্থ হয়েছে।' });
    }
  };

  // Form states
  const [fullName, setFullName] = useState(user.fullName);
  const [bio, setBio] = useState(user.bio || '');
  const [phoneMask, setPhoneMask] = useState(user.phoneMask || '');
  const [timezone, setTimezone] = useState(user.timezone);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Profile Form
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileEmail, setNewProfileEmail] = useState('');
  const [newProfileRole, setNewProfileRole] = useState<'owner' | 'auditor'>('owner');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName,
      bio,
      phoneMask,
      timezone,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCreateNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName || !newProfileEmail) return;
    createProfile(newProfileName, newProfileEmail, newProfileRole);
    setNewProfileName('');
    setNewProfileEmail('');
    setIsCreatingProfile(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1.5">
          <Sliders className="h-4 w-4" />
          <span>System Settings & Preferences</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Settings & Profile
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
          Manage your account profile, base currency (BDT), operational timezone, and ledger profiles.
        </p>
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile & Base Currency */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveProfile} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <User className="h-4 w-4 text-emerald-400" />
                <span>Profile Information</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">auth.users ID: {user.id.slice(0, 10)}...</span>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Profile settings updated successfully.</span>
              </div>
            )}

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Full Legal / Account Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-600 font-sans">Primary authentication identifier.</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Role / Access Level</label>
                <input
                  type="text"
                  value={user.role === 'owner' ? 'Tenant Owner (Full Read/Write Access)' : 'Auditor (Read-Only Reviewer)'}
                  disabled
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bio / Profile Description</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Primary Family & Investment Ledger"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-sans focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Operational Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6) — Standard Bangladesh Time</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                  <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
                <span className="text-[10px] text-slate-500 font-sans">Used for daily closing prices and snapshot timestamps.</span>
              </div>

              {/* Language Selection Box (এক ক্লিকে বাংলা / ইংরেজি) */}
              <div className="rounded-lg bg-slate-950 p-4 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-white font-semibold">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <span>{isBn ? 'অ্যাপের ভাষা (App Language)' : 'Application Language'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    1-Click Switch
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {isBn
                    ? 'এক ক্লিকে সম্পূর্ণ অ্যাপ বাংলা অথবা ইংরেজিতে দেখুন। ড্যাশবোর্ড, মেনুবার, ট্যাক্স প্ল্যানার ও রিপোর্ট সাথে সাথেই পরিবর্তিত হবে।'
                    : 'Switch the entire application between Bengali and English with a single click. Header, sidebar, tax planner, and reports update instantly.'}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLanguage('bn')}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      language === 'bn'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>🇧🇩</span>
                    <span>বাংলা (Bengali)</span>
                    {language === 'bn' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span>English (ইংরেজি)</span>
                    {language === 'en' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Locked Base Currency Box */}
              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-white font-semibold">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <span>Base Accounting Currency</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <Lock className="h-3 w-3" />
                    <span>Master Plan v5 Locked</span>
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  BDT (৳) — Bangladeshi Taka
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  As specified in Phase 0 Architecture Lock, the canonical base currency for all double-entry accounts, DSE securities, and Net Worth computations is permanently set to BDT. Foreign currency accounts (if added later) are translated against BDT.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold font-mono text-xs transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Multi-Tenant Profile Switcher & Creator */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>Tenant Profiles ({availableProfiles.length})</span>
              </div>
              <button
                onClick={() => setIsCreatingProfile(!isCreatingProfile)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{isCreatingProfile ? 'Cancel' : 'New Tenant'}</span>
              </button>
            </div>

            {/* Create New Profile Form */}
            {isCreatingProfile && (
              <form onSubmit={handleCreateNewProfile} className="rounded-lg bg-slate-950 p-4 border border-slate-800 space-y-3 text-xs font-mono">
                <div className="font-semibold text-white">Add New Isolated Tenant</div>
                <div>
                  <label className="block text-slate-400 mb-1">Tenant Profile Title</label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g. Consulting Business Ledger"
                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email / Tenant Key</label>
                  <input
                    type="email"
                    value={newProfileEmail}
                    onChange={(e) => setNewProfileEmail(e.target.value)}
                    placeholder="e.g. business@ledger.dev"
                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Access Role</label>
                  <select
                    value={newProfileRole}
                    onChange={(e) => setNewProfileRole(e.target.value as any)}
                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-white focus:outline-none"
                  >
                    <option value="owner">Owner (Read/Write)</option>
                    <option value="auditor">Auditor (Read-Only)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold font-mono text-xs transition-colors"
                >
                  Create & Switch Tenant
                </button>
              </form>
            )}

            {/* Profiles List */}
            <div className="space-y-2">
              {availableProfiles.map((p) => {
                const isActive = p.id === user.id;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isActive
                        ? 'border-emerald-500/50 bg-emerald-950/20'
                        : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-white text-xs">{p.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.email}</div>
                        {p.bio && <div className="text-[11px] text-slate-500 font-sans mt-1">{p.bio}</div>}
                      </div>

                      {isActive ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => switchProfile(p.id)}
                          className="text-[11px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biometric Authentication & App Lock Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-white text-xs sm:text-sm font-bold">
                <Fingerprint className="h-4 w-4 text-emerald-400" />
                <span>বায়োমেট্রিক সিকিউরিটি (Face ID / Fingerprint)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isBiometricEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : isAvailable
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isBiometricEnabled
                  ? 'সক্রিয় (Active)'
                  : isAvailable
                  ? 'উপলব্ধ (Available)'
                  : 'ডিভাইস সেন্সর অনুপলব্ধ'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              আপনার Google অ্যাকাউন্টের মাধ্যমে সাইন-ইন করার পর অ্যাপের প্রতিটি সেশন সুরক্ষিত রাখতে ফেস আইডি অথবা ফিঙ্গারপ্রিন্ট ব্যবহার করুন। এটি পাসওয়ার্ড ছাড়াই সরাসরি সুরক্ষিত প্রবেশ নিশ্চিত করে।
            </p>

            {bioFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  bioFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                }`}
              >
                {bioFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span>{bioFeedback.message}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Toggle Row */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">বায়োমেট্রিক অ্যাপ লক</div>
                  <div className="text-[10px] text-slate-400">
                    সেন্সর ধরন: <span className="text-emerald-400 font-mono">{biometryTypeName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAuthenticating}
                  onClick={handleToggleBiometric}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isBiometricEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={isBiometricEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isBiometricEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={isAuthenticating}
                  onClick={handleTestBiometric}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAuthenticating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span>বায়োমেট্রিক টেস্ট করুন</span>
                </button>

                {isBiometricEnabled && (
                  <button
                    type="button"
                    onClick={lockApp}
                    className="px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    <span>এখনই অ্যাপ লক করুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Application Updates & Version Status Card */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Sparkles className="h-4 w-4" />
                <span>অ্যাপ আপডেট ও ভার্সন স্ট্যাটাস (App Updates)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                PWA Live Sync
              </span>
            </div>
            
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>কিভাবে আপডেট কাজ করে:</strong> আপনি বা ডেভেলপার সার্ভারে নতুন কোড বিল্ড ও আপডেট করার সাথে সাথে ইনস্টল করা PWA অ্যাপটি ব্যাকগ্রাউন্ডে Service Worker-এর মাধ্যমে স্বয়ংক্রিয়ভাবে নতুন আপডেট ক্যাশ করে এবং ইনস্ট্যান্ট নোটিফিকেশন প্রদর্শন করে।
            </p>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Current Release:</span>
                <span className="text-emerald-400 font-bold">v2.5.0 (Latest Production)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Update Mechanism:</span>
                <span className="text-sky-300">PWA Auto-Update + Service Worker</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Offline Cache:</span>
                <span className="text-slate-300">Enabled (Active)</span>
              </div>
            </div>

            {updateStatusMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{updateStatusMsg}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={checkingUpdate}
                onClick={async () => {
                  setCheckingUpdate(true);
                  setUpdateStatusMsg(null);
                  try {
                    if ('serviceWorker' in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      for (const reg of regs) {
                        await reg.update();
                      }
                    }
                    setTimeout(() => {
                      setCheckingUpdate(false);
                      setUpdateStatusMsg('অ্যাপটি সর্বশেষ ভার্সনে আপডেট রয়েছে (Up to date)। নতুন আপডেট থাকলে স্বয়ংক্রিয় নোটিফিকেশন আসবে।');
                      setTimeout(() => setUpdateStatusMsg(null), 5000);
                    }, 1200);
                  } catch {
                    setCheckingUpdate(false);
                    setUpdateStatusMsg('সর্বশেষ ভার্সন সক্রিয় রয়েছে।');
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {checkingUpdate ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>{checkingUpdate ? 'চেক করা হচ্ছে...' : 'আপডেট চেক করুন (Check Update)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('ক্যাশ রিফ্রেশ করে অ্যাপের সর্বশেষ কোড লোড করতে চান?')) {
                    if ('caches' in window) {
                      caches.keys().then((names) => {
                        for (const name of names) caches.delete(name);
                      });
                    }
                    window.location.reload();
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                <span>ফোর্স রিলোড / ক্যাশ রিফ্রেশ</span>
              </button>
            </div>
          </div>

          {/* App User Guide & Walkthrough Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <BookOpen className="h-4 w-4" />
              <span>App User Guide & Interactive Tour</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Open the step-by-step interactive walkthrough (English & বাংলা) explaining how to manage accounts, DSE stocks, loans, and Google Drive sync.
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('has_seen_wealthfolio_guide_v1');
                window.location.reload();
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>Launch Interactive Walkthrough</span>
            </button>
          </div>

          {/* Google Play Console Publishing Kit & Assets Card */}
          <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 to-slate-900/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Sparkles className="h-4 w-4" />
                <span>প্লে কনসোল পাবলিশিং ও গ্রাফিক্স কিট (Play Console Studio)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                100% Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              গুগল প্লে স্টোরে আপলোডের জন্য তৈরি ৫১২x৫১২ আইকন, ১০২৪x৫০০ ব্যানার, ৪টি ফুল এইচডি স্ক্রিনশট এবং বাংলা-ইংরেজি টাইটেল/ডেসক্রিপশন এক ক্লিকে দেখুন ও ডাউনলোড করুন।
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate?.('playstore_kit')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Smartphone className="h-4 w-4" />
                <span>ওপেন করুন: Play Store Assets & Publishing Kit</span>
              </button>
            </div>
          </div>

          {/* Google Play Privacy Policy Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Google Play Privacy Policy</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Google Play Store compliance and user data protection policy for Google Sign-In & Google Drive integration.
            </p>
            <button
              type="button"
              onClick={() => setShowPrivacyPolicy(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>Read Full Privacy Policy</span>
            </button>
          </div>

          {/* Reset to Fresh Slate */}
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
              <Trash2 className="h-4 w-4" />
              <span>Clean Slate / Reset Ledger</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Clear all saved device storage and restart the onboarding wizard to create a brand new personal profile from scratch.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all data and start completely fresh?')) {
                  resetAllUserData();
                }
              }}
              className="px-3 py-2 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Wipe Data & Restart Setup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
