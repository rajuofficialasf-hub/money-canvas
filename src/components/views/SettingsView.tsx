import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useLedger } from '../../lib/ledger-context';
import { useTheme } from '../../lib/theme-context';
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
  ExternalLink,
  Download,
  X,
  ShieldAlert,
  KeyRound,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  CURRENT_APP_VERSION_NAME,
  GITHUB_RELEASES_URL,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME,
} from '../../lib/app-version';
import { useAppUpdate } from '../../lib/update-context';

export const SettingsView: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { user, firebaseUser, availableProfiles, switchProfile, updateProfile, createProfile, resetAllUserData, deleteAccountAndData } = useAuth();
  const { language, setLanguage, isBn } = useLanguage();
  const { wipeCloudLedger } = useLedger();
  const { theme, setTheme, options: themeOptions } = useTheme();
  const { checkForUpdate, downloadApp, isChecking: checkingUpdate } = useAppUpdate();
  const {
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
  const [phoneMask] = useState(user.phoneMask || '');
  const [timezone, setTimezone] = useState(user.timezone);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Profile Form
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileEmail, setNewProfileEmail] = useState('');

  // Account Deletion State (Google Play Store compliance)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError(isBn ? 'নিশ্চিত করতে "DELETE" টাইপ করুন।' : 'Please type "DELETE" to confirm.');
      return;
    }

    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      const res = await deleteAccountAndData(deletePassword);
      if (res.success) {
        alert(isBn ? 'আপনার অ্যাকাউন্ট ও সকল ডেটা সফলভাবে মুছে ফেলা হয়েছে।' : 'Your account and all associated data have been permanently deleted.');
        window.location.href = '#/landing';
        window.location.reload();
      } else {
        setDeleteError(res.error || (isBn ? 'অ্যাকাউন্ট ডিলিট করা যায়নি।' : 'Failed to delete account.'));
      }
    } catch (err: any) {
      setDeleteError(err?.message || (isBn ? 'অপ্রত্যাশিত ত্রুটি ঘটেছে।' : 'An unexpected error occurred.'));
    } finally {
      setIsDeletingAccount(false);
    }
  };
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

  if (showPrivacyPolicy) {
    return <PrivacyPolicyView onBack={() => setShowPrivacyPolicy(false)} />;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="border-b border-edge pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1.5">
          <Sliders className="h-4 w-4" />
          <span>System Settings & Preferences</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
          Settings & Profile
        </h1>
        <p className="text-ink-muted text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
          Manage your account profile, base currency (BDT), operational timezone, and ledger profiles.
        </p>
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile & Base Currency */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveProfile} className="rounded-xl border border-edge bg-surface/60 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-edge/80 pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <User className="h-4 w-4 text-accent-strong" />
                <span>Profile Information</span>
              </div>
              <span className="text-[10px] font-mono text-ink-faint">auth.users ID: {user.id.slice(0, 10)}...</span>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-accent/40 text-accent-strong text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-strong" />
                <span>Profile settings updated successfully.</span>
              </div>
            )}

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-ink-muted mb-1">Full Legal / Account Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink font-sans focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1">Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full rounded-lg border border-edge bg-canvas/50 px-3 py-2 text-ink-faint cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-600 font-sans">Primary authentication identifier.</span>
              </div>

              <div>
                <label className="block text-ink-muted mb-1">Role / Access Level</label>
                <input
                  type="text"
                  value={user.role === 'owner' ? 'Tenant Owner (Full Read/Write Access)' : 'Auditor (Read-Only Reviewer)'}
                  disabled
                  className="w-full rounded-lg border border-edge bg-canvas/50 px-3 py-2 text-ink-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1">Bio / Profile Description</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Primary Family & Investment Ledger"
                  className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink font-sans focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-ink-muted mb-1">Operational Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                >
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6) — Standard Bangladesh Time</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                  <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
                <span className="text-[10px] text-ink-faint font-sans">Used for daily closing prices and snapshot timestamps.</span>
              </div>

              {/* Language Selection Box (এক ক্লিকে বাংলা / ইংরেজি) */}
              <div className="rounded-lg bg-canvas p-4 border border-accent/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
                    <Globe className="h-4 w-4 text-accent-strong" />
                    <span>{isBn ? 'অ্যাপের ভাষা (App Language)' : 'Application Language'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-accent-strong font-bold bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                    1-Click Switch
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted font-sans leading-relaxed">
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
                        ? 'bg-accent/20 border-accent text-accent-strong shadow-sm'
                        : 'bg-surface border-edge text-ink-muted hover:text-ink hover:border-slate-700'
                    }`}
                  >
                    <span>🇧🇩</span>
                    <span>বাংলা (Bengali)</span>
                    {language === 'bn' && <CheckCircle2 className="h-3.5 w-3.5 text-accent-strong shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-accent/20 border-accent text-accent-strong shadow-sm'
                        : 'bg-surface border-edge text-ink-muted hover:text-ink hover:border-slate-700'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span>English (ইংরেজি)</span>
                    {language === 'en' && <CheckCircle2 className="h-3.5 w-3.5 text-accent-strong shrink-0" />}
                  </button>
                </div>
              </div>

              {/* UX-3: Color Theme Picker */}
              <div className="rounded-lg bg-canvas p-4 border border-edge space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
                    <Sparkles className="h-4 w-4 text-accent-strong" />
                    <span>{isBn ? 'কালার থিম (Color Theme)' : 'Color Theme'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-ink-faint">{themeOptions.length} themes</span>
                </div>
                <p className="text-[11px] text-ink-muted font-sans leading-relaxed">
                  {isBn
                    ? 'পুরো অ্যাপের রঙের আবহ বদলান — পছন্দটি এই ডিভাইসে মনে রাখা হবে।'
                    : 'Change the color mood of the entire app — your choice is remembered on this device.'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {themeOptions.map((opt) => {
                    const isActive = theme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTheme(opt.id)}
                        aria-pressed={isActive}
                        className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                          isActive
                            ? 'border-accent ring-1 ring-accent/40 bg-surface'
                            : 'border-edge bg-surface/60 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className="h-10 rounded-lg border border-black/20 overflow-hidden flex"
                          style={{ backgroundColor: opt.preview[0] }}
                        >
                          <div className="w-1/3 h-full" style={{ backgroundColor: opt.preview[1] }} />
                          <div className="flex-1 flex items-center justify-center">
                            <span
                              className="inline-block h-3.5 w-3.5 rounded-full"
                              style={{ backgroundColor: opt.preview[2] }}
                            />
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-ink-soft leading-tight">
                            {isBn ? opt.nameBn : opt.nameEn}
                          </span>
                          {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-accent-strong shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locked Base Currency Box */}
              <div className="rounded-lg bg-canvas p-4 border border-edge space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
                    <Globe className="h-4 w-4 text-accent-strong" />
                    <span>Base Accounting Currency</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-accent-strong">
                    <Lock className="h-3 w-3" />
                    <span>Master Plan v5 Locked</span>
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-accent-strong">
                  BDT (৳) — Bangladeshi Taka
                </div>
                <p className="text-[11px] text-ink-muted font-sans leading-relaxed">
                  As specified in Phase 0 Architecture Lock, the canonical base currency for all double-entry accounts, DSE securities, and Net Worth computations is permanently set to BDT. Foreign currency accounts (if added later) are translated against BDT.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold font-mono text-xs transition-colors flex items-center gap-2 shadow-sm"
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
          <div className="rounded-xl border border-edge bg-surface/60 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-edge/80 pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Shield className="h-4 w-4 text-accent-strong" />
                <span>Tenant Profiles ({availableProfiles.length})</span>
              </div>
              <button
                onClick={() => setIsCreatingProfile(!isCreatingProfile)}
                className="text-xs text-accent-strong hover:text-accent-strong font-mono flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{isCreatingProfile ? 'Cancel' : 'New Tenant'}</span>
              </button>
            </div>

            {/* Create New Profile Form */}
            {isCreatingProfile && (
              <form onSubmit={handleCreateNewProfile} className="rounded-lg bg-canvas p-4 border border-edge space-y-3 text-xs font-mono">
                <div className="font-semibold text-ink">Add New Isolated Tenant</div>
                <div>
                  <label className="block text-ink-muted mb-1">Tenant Profile Title</label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g. Consulting Business Ledger"
                    className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-ink focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1">Email / Tenant Key</label>
                  <input
                    type="email"
                    value={newProfileEmail}
                    onChange={(e) => setNewProfileEmail(e.target.value)}
                    placeholder="e.g. business@ledger.dev"
                    className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-ink focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1">Access Role</label>
                  <select
                    value={newProfileRole}
                    onChange={(e) => setNewProfileRole(e.target.value as any)}
                    className="w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-ink focus:outline-none"
                  >
                    <option value="owner">Owner (Read/Write)</option>
                    <option value="auditor">Auditor (Read-Only)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-md bg-accent hover:bg-accent-strong text-accent-ink font-semibold font-mono text-xs transition-colors"
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
                        ? 'border-accent/50 bg-emerald-950/20'
                        : 'border-edge/80 bg-canvas/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-ink text-xs">{p.fullName}</div>
                        <div className="text-[11px] text-ink-muted font-mono mt-0.5">{p.email}</div>
                        {p.bio && <div className="text-[11px] text-ink-faint font-sans mt-1">{p.bio}</div>}
                      </div>

                      {isActive ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent-strong border border-accent/40">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => switchProfile(p.id)}
                          className="text-[11px] font-mono text-ink-muted hover:text-ink px-2 py-1 rounded bg-surface border border-edge hover:border-slate-700 transition-colors"
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
          <div className="rounded-xl border border-edge bg-surface/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-edge/80 pb-3">
              <div className="flex items-center gap-2 text-ink text-xs sm:text-sm font-bold">
                <Fingerprint className="h-4 w-4 text-accent-strong" />
                <span>বায়োমেট্রিক সিকিউরিটি (Face ID / Fingerprint)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isBiometricEnabled
                    ? 'bg-accent/10 text-accent-strong border-accent/30'
                    : isAvailable
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-raised text-ink-muted border-slate-700'
                }`}
              >
                {isBiometricEnabled
                  ? 'সক্রিয় (Active)'
                  : isAvailable
                  ? 'উপলব্ধ (Available)'
                  : 'ডিভাইস সেন্সর অনুপলব্ধ'}
              </span>
            </div>

            <p className="text-[11px] text-ink-muted leading-relaxed">
              আপনার Google অ্যাকাউন্টের মাধ্যমে সাইন-ইন করার পর অ্যাপের প্রতিটি সেশন সুরক্ষিত রাখতে ফেস আইডি অথবা ফিঙ্গারপ্রিন্ট ব্যবহার করুন। এটি পাসওয়ার্ড ছাড়াই সরাসরি সুরক্ষিত প্রবেশ নিশ্চিত করে।
            </p>

            {bioFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  bioFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border border-accent/40 text-accent-strong'
                    : 'bg-rose-950/40 border border-negative/40 text-negative'
                }`}
              >
                {bioFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-accent-strong shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-negative shrink-0" />
                )}
                <span>{bioFeedback.message}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Toggle Row */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-canvas/50 border border-edge/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-ink">বায়োমেট্রিক অ্যাপ লক</div>
                  <div className="text-[10px] text-ink-muted">
                    সেন্সর ধরন: <span className="text-accent-strong font-mono">{biometryTypeName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAuthenticating}
                  onClick={handleToggleBiometric}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isBiometricEnabled ? 'bg-accent' : 'bg-slate-700'
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
                  className="px-3.5 py-2 rounded-lg bg-raised hover:bg-slate-700 border border-slate-700 text-ink-soft text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAuthenticating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent-strong" />
                  ) : (
                    <Fingerprint className="h-3.5 w-3.5 text-accent-strong" />
                  )}
                  <span>বায়োমেট্রিক টেস্ট করুন</span>
                </button>

                {isBiometricEnabled && (
                  <button
                    type="button"
                    onClick={lockApp}
                    className="px-3.5 py-2 rounded-lg bg-warning/10 hover:bg-warning/20 border border-warning/30 text-warning text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5 text-warning" />
                    <span>এখনই অ্যাপ লক করুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Application Updates & Version Status Card */}
          <div className="rounded-xl border border-accent/40 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-950 p-5 space-y-4 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-strong text-xs font-bold">
                <Sparkles className="h-4 w-4" />
                <span>অ্যাপ আপডেট ও সংস্করণ সেন্টার (App Updates & Releases)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent-strong font-bold border border-accent/30">
                GitHub Live Release
              </span>
            </div>
            
            <p className="text-[11px] text-ink-soft leading-relaxed">
              <strong>১০০% স্বয়ংক্রিয় আপডেট:</strong> যখনই আপনি বা টিম GitHub-এ নতুন APK রিলিজ প্রকাশ করবেন, ইনস্টল করা অ্যাপটি সরাসরি আপডেট শনাক্ত করবে এবং ব্যবহারকারীকে ১-ক্লিকে নতুন সংস্করণ ইনস্টল করার সুযোগ দেবে।
            </p>

            <div className="bg-canvas/70 p-3.5 rounded-lg border border-edge text-[11px] font-mono space-y-1.5">
              <div className="flex justify-between items-center text-ink-muted">
                <span>বর্তমান সংস্করণ (Installed):</span>
                <span className="text-accent-strong font-bold bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                  {CURRENT_APP_VERSION_NAME}
                </span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>আপডেট ইঞ্জিন:</span>
                <span className="text-sky-300">GitHub Releases API + In-App Updater</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>রিপোজিটরি:</span>
                <span className="text-ink-soft">{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {!Capacitor.isNativePlatform() && (
                <button
                  type="button"
                  disabled={checkingUpdate}
                  onClick={() => downloadApp()}
                  className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/35 hover:to-teal-500/35 border border-accent/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-950/20"
                  title="অ্যান্ড্রয়েড ফোন বা ট্যাবলেটের জন্য APK ডাউনলোড করুন"
                >
                  {checkingUpdate ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent-strong" />
                  ) : (
                    <Smartphone className="h-3.5 w-3.5 text-accent-strong" />
                  )}
                  <span>Download Android App (APK)</span>
                  <Download className="h-3 w-3 text-accent-strong" />
                </button>
              )}

              <button
                type="button"
                disabled={checkingUpdate}
                onClick={() => checkForUpdate(true)}
                className="px-3.5 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent-strong text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {checkingUpdate ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent-strong" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5 text-accent-strong" />
                )}
                <span>{checkingUpdate ? 'চেক করা হচ্ছে...' : 'আপডেট চেক করুন (Check Update)'}</span>
              </button>

              <a
                href={GITHUB_RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-lg bg-raised hover:bg-slate-700 border border-slate-700 text-ink-soft text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-ink-muted" />
                <span>GitHub রিলিজ পেজ</span>
              </a>

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
                className="px-3.5 py-2 rounded-lg bg-raised/80 hover:bg-raised border border-edge text-ink-muted hover:text-ink-soft text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-ink-faint" />
                <span>ক্যাশ রিফ্রেশ</span>
              </button>
            </div>
          </div>

          {/* App User Guide & Walkthrough Card */}
          <div className="rounded-xl border border-edge bg-surface/60 p-5 space-y-3">
            <div className="flex items-center gap-2 text-warning text-xs font-bold">
              <BookOpen className="h-4 w-4" />
              <span>App User Guide & Interactive Tour</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Open the step-by-step interactive walkthrough (English & বাংলা) explaining how to manage accounts, DSE stocks, loans, and Google Drive sync.
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('has_seen_wealthfolio_guide_v1');
                window.location.reload();
              }}
              className="px-3.5 py-2 rounded-lg bg-raised hover:bg-slate-700 border border-slate-700 text-ink-soft text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-warning" />
              <span>Launch Interactive Walkthrough</span>
            </button>
          </div>

          {/* Google Play Console Publishing Kit & Assets Card */}
          <div className="rounded-xl border border-accent/40 bg-gradient-to-br from-emerald-950/30 to-slate-900/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-strong text-xs font-bold">
                <Sparkles className="h-4 w-4" />
                <span>প্লে কনসোল পাবলিশিং ও গ্রাফিক্স কিট (Play Console Studio)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent-strong font-bold border border-accent/30">
                100% Ready
              </span>
            </div>
            <p className="text-[11px] text-ink-soft leading-relaxed">
              গুগল প্লে স্টোরে আপলোডের জন্য তৈরি ৫১২x৫১২ আইকন, ১০২৪x৫০০ ব্যানার, ৪টি ফুল এইচডি স্ক্রিনশট এবং বাংলা-ইংরেজি টাইটেল/ডেসক্রিপশন এক ক্লিকে দেখুন ও ডাউনলোড করুন।
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate?.('playstore_kit')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Smartphone className="h-4 w-4" />
                <span>ওপেন করুন: Play Store Assets & Publishing Kit</span>
              </button>
            </div>
          </div>

          {/* Google Play Compliance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Google Play Privacy Policy Card */}
            <div className="rounded-xl border border-edge bg-surface/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-accent-strong text-xs font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>Google Play Privacy Policy</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Google Play Store compliance and user data protection policy for Google Sign-In & Google Drive integration.
              </p>
              <button
                type="button"
                onClick={() => setShowPrivacyPolicy(true)}
                className="px-3.5 py-2 rounded-lg bg-raised hover:bg-slate-700 border border-slate-700 text-ink-soft text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-accent-strong" />
                <span>Read Full Privacy Policy</span>
              </button>
            </div>

            {/* Play Store Account & Data Deletion Portal Link */}
            <div className="rounded-xl border border-edge bg-surface/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-negative text-xs font-bold">
                <ShieldAlert className="h-4 w-4" />
                <span>Play Store Data Deletion URL</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Google Play policy requires a dedicated public webpage where users can request account and data deletion.
              </p>
              <button
                type="button"
                onClick={() => onNavigate?.('data_deletion')}
                className="px-3.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/50 text-negative text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-negative" />
                <span>Open Deletion Request Portal</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Local Reset & Account Deletion */}
          <div className="rounded-2xl border border-rose-900/40 bg-rose-950/10 p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-negative text-sm font-bold">
                <AlertTriangle className="h-5 w-5" />
                <span>বিপজ্জনক এলাকা (Danger Zone)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-negative border border-rose-800/40">
                Irreversible
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Reset to Fresh Slate (Local) */}
              <div className="rounded-xl border border-rose-900/30 bg-canvas/60 p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-warning text-xs font-bold mb-1.5">
                    <RotateCcw className="h-4 w-4" />
                    <span>Clean Slate / স্থানীয় ডেটা রিসেট</span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    সব অ্যাকাউন্ট, লেনদেন, পোর্টফোলিও ও সেটিংস মুছে একদম নতুন করে শুরু করে (অনবোর্ডিং উইজার্ডসহ)। Google অ্যাকাউন্টটি থেকে যায়।
                  </p>
                  <p className="text-[10px] text-warning/90 leading-relaxed">
                    ⚠️ এটি এই ডিভাইসের সব ডেটা এবং ক্লাউডে (Firestore) সিঙ্ক হওয়া লেজার ও এনক্রিপ্টেড ভল্ট — সবকিছু স্থায়ীভাবে মুছে দেবে।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        'এই ডিভাইস এবং ক্লাউড — সব ডেটা স্থায়ীভাবে মুছে যাবে। আপনি কি নিশ্চিত?\nThis permanently wipes ALL data on this device AND in the cloud. Continue?'
                      )
                    ) {
                      return;
                    }
                    const res = await wipeCloudLedger({ includeVault: true });
                    if (!res.success) {
                      alert(
                        `ক্লাউডের ডেটা মুছতে ব্যর্থ — রিসেট বাতিল করা হলো। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন। (${res.error || ''})`
                      );
                      return;
                    }
                    resetAllUserData();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 border border-amber-700/50 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Wipe ALL Data (Device + Cloud)</span>
                </button>
              </div>

              {/* Permanent Account Deletion (Google Play Compliance) */}
              <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-negative text-xs font-bold mb-1.5">
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Account & All Data (স্থায়ী ডিলিট)</span>
                  </div>
                  <p className="text-[11px] text-negative/80 leading-relaxed">
                    Firestore ক্লাউড ভল্ট, গুগল অথেনটিকেশন ও ডিভাইসের সকল তথ্য স্থায়ীভাবে ধ্বংস করে।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setDeletePassword('');
                    setDeleteError(null);
                    setShowDeleteAccountModal(true);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-rose-600 hover:bg-negative text-ink text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-rose-950/60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete My Account & Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Permanent Account Deletion */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-rose-900/80 shadow-2xl p-6 sm:p-7 space-y-5 text-ink">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-negative/20 text-negative border border-negative/30">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-ink">
                    Permanently Delete Account
                  </h3>
                  <p className="text-xs text-negative font-mono">
                    {firebaseUser?.email || user.email || 'Local User Profile'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-raised transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning Details */}
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/50 space-y-2 text-xs text-rose-200/90 leading-relaxed">
              <p className="font-semibold text-negative">
                ⚠️ এই অ্যাকশন সম্পূর্ণ অপরিবর্তনীয়! নিশ্চিত করলে সাথে সাথে:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-200">
                <li>Firestore ক্লাউড ব্যাকআপ ও AES-256 এনক্রিপ্টেড ভল্ট মুছে যাবে।</li>
                <li>Firebase একাউন্ট ও গুগল লগইন পারমিশন বাতিল হবে।</li>
                <li>লোকাল ডিভাইসের সব একাউন্ট, লেনদেন ও বায়োমেট্রিক ডেটা মুছে যাবে।</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-950 border border-negative/50 text-negative text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-negative" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Password input if email/password auth */}
            {firebaseUser?.providerData.some((p) => p.providerId === 'password') && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-ink-muted" />
                  <span>বর্তমান পাসওয়ার্ড লিখুন (Enter Current Password):</span>
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-slate-700 text-ink text-xs placeholder:text-slate-600 focus:outline-none focus:border-negative"
                />
              </div>
            )}

            {/* Google provider notice */}
            {firebaseUser?.providerData.some((p) => p.providerId === 'google.com') && (
              <div className="p-3 rounded-xl bg-canvas/80 border border-edge text-[11px] text-ink-muted flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-400 shrink-0" />
                <span>ডিলিট বাটনে ক্লিক করলে আপনার গুগল একাউন্ট রি-অথেনটিকেশন পপআপ প্রদর্শিত হবে।</span>
              </div>
            )}

            {/* Confirmation string input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-soft">
                নিশ্চিত করতে নিচে <strong className="text-negative font-mono tracking-wider">DELETE</strong> টাইপ করুন:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-slate-700 text-ink text-xs font-mono uppercase placeholder:text-slate-600 focus:outline-none focus:border-negative"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-raised hover:bg-slate-700 text-xs font-semibold text-ink-soft transition-colors"
              >
                Cancel / বাতিল
              </button>
              <button
                type="button"
                disabled={isDeletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-negative disabled:bg-rose-950 disabled:text-slate-600 disabled:cursor-not-allowed text-ink text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {isDeletingAccount ? (
                  <span>Deleting Account & Data...</span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Permanently Delete Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
