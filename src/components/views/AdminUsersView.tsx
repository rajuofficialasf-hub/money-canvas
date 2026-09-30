import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { APP_CONFIG } from '../../lib/app-config';
import { FirebaseAppUser } from '../../types/auth';
import { GoogleIcon } from '../icons/GoogleIcon';
import {
  Users,
  Search,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  UserCheck,
  Calendar,
  Clock,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

export const AdminUsersView: React.FC = () => {
  const { fetchRegisteredUsers, user: currentUser, isGoogleAuthenticated, isAdmin, openAuthModal, signInWithGoogle } = useAuth();
  const [usersList, setUsersList] = useState<FirebaseAppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchRegisteredUsers();
      setUsersList(data);
    } catch (err) {
      console.warn('Failed to load registered users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-2xl space-y-4">
        <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl w-16 h-16 mx-auto border border-purple-500/20 flex items-center justify-center">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted (Admin Only)</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          এই অ্যাডমিন প্যানেলটি শুধুমাত্র সিস্টেম অ্যাডমিন (<strong className="text-white font-mono">{APP_CONFIG.OWNER_EMAIL}</strong>)-এর জন্য সংরক্ষিত। অনুগ্রহ করে আপনার আসল Google অ্যাকাউন্ট দিয়ে সাইন-ইন করুন।
        </p>
        <div className="pt-2">
          <button
            onClick={openAuthModal}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <GoogleIcon className="h-4 w-4 bg-white p-0.5 rounded-full shrink-0" />
            <span>Sign In with Google</span>
          </button>
        </div>
        <div className="text-[11px] text-slate-500 font-mono pt-2">
          বর্তমান প্রোফাইল: {currentUser.role} ({currentUser.email || 'Unauthenticated'})
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalUsers = usersList.length;
  const adminUsersCount = usersList.filter((u) => u.role === 'admin').length;
  const driveSyncedUsersCount = usersList.filter((u) => u.driveBackupStatus === 'synced').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1 tracking-wider uppercase">
              <ShieldCheck className="h-4 w-4" />
              <span>Admin & Analytics Panel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              অ্যাপ ব্যবহারকারীদের তালিকা (Registered Users)
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              যারা আপনার অ্যাপে গুগল দিয়ে সাইন-ইন করেছেন, তাদের তালিকা, নাম, ইমেইল, ছবি এবং ব্যাকআপ স্ট্যাটাস।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>রিফ্রেশ করুন</span>
            </button>

            {!isGoogleAuthenticated && (
              <button
                onClick={signInWithGoogle}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 shadow-lg transition-all"
              >
                <GoogleIcon className="h-4 w-4 bg-white p-0.5 rounded-full shrink-0" />
                <span>Sign In with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">মোট নিবন্ধিত ব্যবহারকারী</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{totalUsers} জন</h3>
            <p className="text-[10px] text-emerald-400 mt-0.5">ফায়ারবেস ক্লাউডে সংরক্ষিত</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">গুগল ড্রাইভ ব্যাকআপ সিঙ্কড</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{driveSyncedUsersCount} জন</h3>
            <p className="text-[10px] text-blue-400 mt-0.5">স্বয়ংক্রিয় ব্যাকআপ সক্রিয়</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">অ্যাডমিন অ্যাকাউন্টস</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{adminUsersCount} জন</h3>
            <p className="text-[10px] text-purple-400 mt-0.5">সিস্টেম ম্যানেজমেন্ট অ্যাক্সেস</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 shrink-0">ফিল্টার:</span>
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              roleFilter === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            সবাই ({totalUsers})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              roleFilter === 'admin'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            অ্যাডমিন ({adminUsersCount})
          </button>
          <button
            onClick={() => setRoleFilter('user')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              roleFilter === 'user'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            সাধারণ ব্যবহারকারী ({totalUsers - adminUsersCount})
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">ফায়ারবেস ডাটাবেজ থেকে ব্যবহারকারীদের লোড করা হচ্ছে...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">কোনো নিবন্ধিত ব্যবহারকারী পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm ? 'অনুসন্ধানের সাথে মিল রেখে কোনো ইউজার পাওয়া যায়নি।' : 'এখনও কেউ গুগল দিয়ে সাইন-ইন করেননি।'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">ব্যবহারকারী (User)</th>
                  <th className="py-3.5 px-4 font-semibold">ইমেইল অ্যাড্রেস</th>
                  <th className="py-3.5 px-4 font-semibold">রোল (Role)</th>
                  <th className="py-3.5 px-4 font-semibold">নিবন্ধনের তারিখ</th>
                  <th className="py-3.5 px-4 font-semibold">সর্বশেষ ব্যবহার</th>
                  <th className="py-3.5 px-4 font-semibold text-right">ড্রাইভ ব্যাকআপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.displayName}
                            className="h-9 w-9 rounded-full object-cover border border-slate-700 shadow-sm"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                            {u.displayName}
                            {u.role === 'admin' && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono">
                                ADMIN
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">UID: {u.uid.substring(0, 12)}...</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <ShieldCheck className="h-3 w-3" />
                          অ্যাডমিন
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <UserCheck className="h-3 w-3" />
                          ব্যবহারকারী
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>{new Date(u.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>
                          {new Date(u.lastLoginAt).toLocaleTimeString('bn-BD', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          , {new Date(u.lastLoginAt).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {u.driveBackupStatus === 'synced' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          ড্রাইভ ব্যাকআপ সিঙ্কড
                        </span>
                      ) : u.driveBackupStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          প্রসেসিং
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          <HardDrive className="h-3 w-3" />
                          লোকাল ড্রাইভ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
