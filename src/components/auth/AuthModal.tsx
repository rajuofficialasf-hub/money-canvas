import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../lib/auth-context';
import { useBiometrics } from '../../lib/biometric-context';
import { GoogleIcon } from '../icons/GoogleIcon';
import {
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'signin',
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { isAvailable, isBiometricEnabled, setPromptEnableModal } = useBiometrics();

  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSuccessRedirect = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      onClose();
      // If biometric is available on device and not yet enabled, offer biometric setup
      if (isAvailable && !isBiometricEnabled) {
        setTimeout(() => {
          setPromptEnableModal(true);
        }, 600);
      }
    }, 800);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        handleSuccessRedirect('গুগল দিয়ে সফলভাবে প্রবেশ করেছেন!');
      } else {
        setErrorMessage(res.error || 'গুগল সাইন-ইন সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'গুগল সাইন-ইনে ত্রুটি হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('অনুগ্রহ করে আপনার ইমেইল ঠিকানা দিন।');
      return;
    }
    if (!password) {
      setErrorMessage('অনুগ্রহ করে আপনার পাসওয়ার্ড দিন।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signInWithEmail(trimmedEmail, password);
      if (res.success) {
        handleSuccessRedirect('সফলভাবে সাইন ইন হয়েছে! স্বাগতম।');
      } else {
        setErrorMessage(res.error || 'ভুল ইমেইল বা পাসওয়ার্ড।');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'সাইন ইন করা সম্ভব হয়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('অনুগ্রহ করে আপনার ইমেইল ঠিকানা দিন।');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('পাসওয়ার্ড দুটি মেলেনি। একই পাসওয়ার্ড পুনরায় লিখুন।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUpWithEmail(trimmedEmail, password, fullName.trim());
      if (res.success) {
        handleSuccessRedirect('আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!');
      } else {
        setErrorMessage(res.error || 'অ্যাকাউন্ট তৈরি করা যায়নি।');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'সাইন আপে ত্রুটি হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md my-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center space-y-2 pt-1 text-center">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {mode === 'signin' ? 'সাইন ইন করুন (Sign In)' : 'নতুন অ্যাকাউন্ট তৈরি (Sign Up)'}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5 leading-relaxed">
              {mode === 'signin'
                ? 'আপনার মানি ক্যানভাস অ্যাকাউন্টে লগইন করে ক্লাউড ভল্ট ও সিঙ্ক চালু রাখুন।'
                : 'সুরক্ষিত আর্থিক খাতা ও ব্যাকআপের জন্য নতুন অ্যাকাউন্ট তৈরি করুন।'}
            </p>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'signin'
                ? 'bg-emerald-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>সাইন ইন (Login)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'signup'
                ? 'bg-emerald-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>নতুন অ্যাকাউন্ট</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 text-left animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2 animate-in fade-in font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'signin' ? handleEmailSignIn : handleEmailSignUp} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                পুরো নাম (Full Name)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Raju Ahmed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              ইমেইল ঠিকানা (Email) *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              পাসওয়ার্ড (Password) *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="কমপক্ষে ৬ অক্ষর"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                পাসওয়ার্ড নিশ্চিত করুন (Confirm Password) *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>যাচাই করা হচ্ছে...</span>
              </>
            ) : mode === 'signin' ? (
              <>
                <LogIn className="h-4 w-4" />
                <span>সাইন ইন করুন</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>অ্যাকাউন্ট তৈরি করুন</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-950 px-2 text-[11px] text-slate-500 uppercase tracking-wider font-mono">
            অথবা (Or)
          </span>
        </div>

        {/* Google Sign In Action */}
        <div>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-slate-700" />
                <span>সংযোগ স্থাপন হচ্ছে...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="h-4 w-4 shrink-0" />
                <span>
                  {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2 text-left">
          <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-2">
            <Lock className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 leading-tight">
              <span className="font-semibold text-slate-300 block mb-0.5">নিরাপদ ভল্ট</span>
              আপনার ডেটা সম্পূর্ণ ব্যক্তিগত ও এনক্রিপ্টেড।
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-2">
            <HardDrive className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 leading-tight">
              <span className="font-semibold text-slate-300 block mb-0.5">ড্রাইভ ব্যাকআপ</span>
              স্বয়ংক্রিয় ক্লাউড সিঙ্ক ও ড্রাইভে ব্যাকআপ।
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
