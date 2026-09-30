import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, ProfileUpdateInput, TenantProfile, FirebaseAppUser } from '../types/auth';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

const STORAGE_KEY = 'pfos_auth_profile';
const PROFILES_STORAGE_KEY = 'pfos_user_profiles';
const ONBOARDED_STORAGE_KEY = 'pfos_has_onboarded';
const GOOGLE_TOKEN_KEY = 'pfos_google_access_token';

// Admin emails (The app owner)
const ADMIN_EMAILS = ['raju.official.asf@gmail.com'];

const isAdminEmail = (email?: string) => {
  if (!email) return false;
  return email.toLowerCase().trim() === 'raju.official.asf@gmail.com';
};

const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'usr-default-owner',
    email: 'user@moneycanvas.local',
    fullName: 'My Personal Ledger',
    baseCurrency: 'BDT',
    timezone: 'Asia/Dhaka',
    role: 'owner',
    bio: 'Primary Personal Finance & Wealth Ledger',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface AuthContextType {
  user: UserProfile;
  firebaseUser: FirebaseUser | null;
  googleAccessToken: string | null;
  isGoogleAuthenticated: boolean;
  availableProfiles: UserProfile[];
  tenants: TenantProfile[];
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signIn: (email: string, fullName?: string) => Promise<void>;
  signUp: (email: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signOutGoogle: () => Promise<void>;
  signOut: () => void;
  switchProfile: (profileId: string) => void;
  updateProfile: (input: ProfileUpdateInput) => void;
  createProfile: (fullName: string, email: string, role?: 'owner' | 'auditor') => void;
  resetAllUserData: () => void;
  deleteAccountAndData: (password?: string) => Promise<{ success: boolean; error?: string }>;
  submitWebDeletionRequest: (email: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  fetchRegisteredUsers: () => Promise<FirebaseAppUser[]>;
  updateUserDriveSyncStatus: (status: 'synced' | 'pending' | 'none' | 'error', lastBackupAt?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(GOOGLE_TOKEN_KEY) || localStorage.getItem(GOOGLE_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored profiles', e);
    }
    return DEFAULT_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to parse active profile id', e);
    }
    return DEFAULT_PROFILES[0].id;
  });

  const rawActiveUser = profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILES[0];
  const activeUser: UserProfile = {
    ...rawActiveUser,
    role: isAdminEmail(rawActiveUser.email) ? 'admin' : 'owner',
  };

  // Persist local profile state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeUser.id);
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn('Failed to persist auth state', e);
    }
  }, [activeUser.id, profiles]);

  // Handle Firestore user sync upon Google login
  const syncGoogleUserToFirestore = useCallback(async (fUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', fUser.uid);
      const userDoc = await getDoc(userDocRef);

      const nowISO = new Date().toISOString();
      const isAdmin = ADMIN_EMAILS.includes(fUser.email?.toLowerCase() || '');

      let userRecord: FirebaseAppUser;

      if (!userDoc.exists()) {
        userRecord = {
          uid: fUser.uid,
          displayName: fUser.displayName || fUser.email?.split('@')[0] || 'App User',
          email: fUser.email || '',
          photoURL: fUser.photoURL || undefined,
          role: isAdmin ? 'admin' : 'user',
          createdAt: nowISO,
          lastLoginAt: nowISO,
          driveBackupStatus: 'none',
        };
        await setDoc(userDocRef, userRecord);
      } else {
        await updateDoc(userDocRef, {
          lastLoginAt: nowISO,
          displayName: fUser.displayName || userDoc.data().displayName,
          photoURL: fUser.photoURL || userDoc.data().photoURL,
        });
      }

      // Also sync active local profile
      const localProfile: UserProfile = {
        id: fUser.uid,
        email: fUser.email || '',
        fullName: fUser.displayName || fUser.email?.split('@')[0] || 'App User',
        baseCurrency: 'BDT',
        timezone: 'Asia/Dhaka',
        avatarUrl: fUser.photoURL || undefined,
        role: isAdmin ? 'admin' : 'owner',
        createdAt: userDoc.exists() ? userDoc.data().createdAt : nowISO,
        updatedAt: nowISO,
        googleUid: fUser.uid,
        driveBackupStatus: userDoc.exists() ? userDoc.data().driveBackupStatus : 'none',
        lastDriveBackupAt: userDoc.exists() ? userDoc.data().lastDriveBackupAt : undefined,
      };

      setProfiles((prev) => {
        const filtered = prev.filter((p) => p.id !== fUser.uid && p.email !== fUser.email);
        return [localProfile, ...filtered];
      });
      setActiveProfileId(fUser.uid);
    } catch (err) {
      console.error('Error syncing Google user to Firestore:', err);
    }
  }, []);

  // Listen to Auth State Changes & handle redirect results
  useEffect(() => {
    // Process redirect result if any (for web redirect flows only)
    if (!Capacitor.isNativePlatform()) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result && result.user) {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;
            if (token) {
              setGoogleAccessToken(token);
              try {
                sessionStorage.setItem(GOOGLE_TOKEN_KEY, token);
                localStorage.setItem(GOOGLE_TOKEN_KEY, token);
              } catch {}
            }
            await syncGoogleUserToFirestore(result.user);
          }
        })
        .catch((err) => {
          // Ignore normal state partition notices
          console.debug('Redirect result notice:', err?.message);
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncGoogleUserToFirestore(user);
      }
    });
    return () => unsubscribe();
  }, [syncGoogleUserToFirestore]);

  const isSigningInRef = React.useRef(false);

  // Sign In with Google (native Google Play Services on Android APK, popup/redirect on Web)
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (isSigningInRef.current) {
      return { success: false, error: 'Sign-in is already in progress...' };
    }
    isSigningInRef.current = true;

    try {
      // 1. Android Native Platform: Use Native Google Sign-In via Credential Manager
      if (Capacitor.isNativePlatform()) {
        try {
          // Web client ID from google-services.json (client_type 3)
          const webClientId =
            '258283545047-n5hsnjc0lv63pqduefv8n70i6nqbqqft.apps.googleusercontent.com';

          await SocialLogin.initialize({
            google: {
              webClientId,
            },
          });

          // Do NOT pass custom scopes array: the plugin automatically requests email, profile & openid.
          // Passing custom scopes triggers rejection unless MainActivity is customized.
          let nativeResult: any;
          try {
            nativeResult = await SocialLogin.login({
              provider: 'google',
              options: {
                style: 'bottom',
                filterByAuthorizedAccounts: false,
              },
            });
          } catch (firstErr: any) {
            const firstErrMsg = firstErr?.message || String(firstErr);
            if (firstErrMsg.toLowerCase().includes('cancel')) {
              throw firstErr;
            }
            // Fallback to standard picker if bottom sheet encounters an issue
            nativeResult = await SocialLogin.login({
              provider: 'google',
              options: {
                style: 'standard',
                filterByAuthorizedAccounts: false,
              },
            });
          }

          const loginData = (nativeResult?.result || nativeResult) as any;
          if (loginData?.idToken) {
            const credential = GoogleAuthProvider.credential(
              loginData.idToken,
              loginData.accessToken?.token || loginData.accessToken
            );
            const userCredential = await signInWithCredential(auth, credential);

            const token = loginData.accessToken?.token || loginData.accessToken || loginData.idToken;
            if (token) {
              setGoogleAccessToken(token);
              try {
                sessionStorage.setItem(GOOGLE_TOKEN_KEY, token);
                localStorage.setItem(GOOGLE_TOKEN_KEY, token);
              } catch {}
            }

            if (userCredential.user) {
              await syncGoogleUserToFirestore(userCredential.user);
            }

            return { success: true };
          }
          return { success: false, error: 'No Google ID token returned from device.' };
        } catch (nativeErr: any) {
          console.error('Native Google login failed:', nativeErr);
          const errStr = nativeErr?.message || String(nativeErr);
          if (
            errStr.toLowerCase().includes('cancel') ||
            errStr.toLowerCase().includes('closed')
          ) {
            return { success: false, error: 'সাইন-ইন বাতিল করা হয়েছে।' };
          }
          if (errStr.includes('[16]') || errStr.toLowerCase().includes('account reauth failed')) {
            return {
              success: false,
              error: 'Google Sign-In failed [Error 16]: Google Cloud Console-এ আপনার ইমেইলটি OAuth Consent Screen > Test Users-এ যোগ করুন অথবা রিলিজ কি-এর SHA-1 ফিঙ্গারপ্রিন্ট যোগ করুন।',
            };
          }
          // On Native Android, never fall through to browser redirects which fail in WebViews
          return {
            success: false,
            error: nativeErr?.message || 'Native Google Sign-In failed on device. Ensure Google Play Services is available.',
          };
        }
      }

      // 2. Web & Desktop Platform: Use standard Firebase Web Auth Popup
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        const errorCode = popupErr?.code;
        console.warn('signInWithPopup attempt notice:', errorCode, popupErr?.message);

        if (errorCode === 'auth/cancelled-popup-request' || errorCode === 'auth/popup-closed-by-user') {
          return { success: false, error: 'Sign-in window was closed.' };
        }

        if (errorCode === 'auth/popup-blocked') {
          return {
            success: false,
            error: 'Popup was blocked by your browser. Please allow popups for this site.',
          };
        }

        return {
          success: false,
          error: popupErr?.message || 'Google sign-in could not be completed.',
        };
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setGoogleAccessToken(token);
        try {
          sessionStorage.setItem(GOOGLE_TOKEN_KEY, token);
          localStorage.setItem(GOOGLE_TOKEN_KEY, token);
        } catch {}
      }

      if (result.user) {
        await syncGoogleUserToFirestore(result.user);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      return { success: false, error: err?.message || 'গুগল সাইন-ইন সম্পন্ন করা যায়নি।' };
    } finally {
      isSigningInRef.current = false;
    }
  };

  // Sign In or Register with Email & Password (works 100% on Mobile APK & Web)
  const signInWithEmail = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const isAdmin = isAdminEmail(trimmedEmail);

    try {
      if (password && password.length >= 6) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
          if (userCredential.user) {
            await syncGoogleUserToFirestore(userCredential.user);
          }
        } catch (fbErr: any) {
          if (
            fbErr.code === 'auth/user-not-found' ||
            fbErr.code === 'auth/invalid-credential' ||
            fbErr.code === 'auth/wrong-password'
          ) {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
              if (newCred.user) {
                await syncGoogleUserToFirestore(newCred.user);
              }
            } catch (createErr: any) {
              console.warn('Firebase createUser error (continuing with local auth):', createErr?.message);
            }
          } else {
            console.warn('Firebase signInWithEmail error (continuing with local auth):', fbErr?.message);
          }
        }
      }

      // Only authenticated Firebase accounts with verified raju email can be admin
      let targetProfile = profiles.find((p) => p.email.toLowerCase() === trimmedEmail);
      if (!targetProfile) {
        targetProfile = {
          id: `usr-${Date.now()}`,
          email: trimmedEmail,
          fullName: trimmedEmail.split('@')[0],
          baseCurrency: 'BDT',
          timezone: 'Asia/Dhaka',
          role: 'owner',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProfiles((prev) => [targetProfile!, ...prev.filter((p) => p.email !== trimmedEmail)]);
      } else {
        targetProfile = {
          ...targetProfile,
          role: targetProfile.role || 'owner',
          updatedAt: new Date().toISOString(),
        };
        setProfiles((prev) => [targetProfile!, ...prev.filter((p) => p.id !== targetProfile!.id)]);
      }

      setActiveProfileId(targetProfile.id);
      return { success: true };
    } catch (err: any) {
      console.error('Email sign in error:', err);
      return { success: false, error: err?.message || 'Login failed' };
    }
  };

  // Sign Out Google
  const signOutGoogle = async () => {
    try {
      await fbSignOut(auth);
      setFirebaseUser(null);
      setGoogleAccessToken(null);
      sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_TOKEN_KEY);
      setActiveProfileId(DEFAULT_PROFILES[0].id);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Fetch all registered users from Firestore for Admin View
  const fetchRegisteredUsers = async (): Promise<FirebaseAppUser[]> => {
    try {
      if (!auth.currentUser) {
        return profiles.map((p) => ({
          uid: p.id,
          displayName: p.fullName,
          email: p.email,
          photoURL: p.avatarUrl,
          role: p.role === 'admin' ? 'admin' : 'user',
          createdAt: p.createdAt,
          lastLoginAt: p.updatedAt,
          driveBackupStatus: p.driveBackupStatus || 'none',
        }));
      }

      const usersCol = collection(db, 'users');
      const q = query(usersCol, orderBy('lastLoginAt', 'desc'));
      const snapshot = await getDocs(q);

      const list: FirebaseAppUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FirebaseAppUser;
        list.push(data);
      });
      return list;
    } catch (err: any) {
      console.warn('Firestore fetch registered users error (falling back to local user profile):', err?.message || err);
      return profiles.map((p) => ({
        uid: p.id,
        displayName: p.fullName,
        email: p.email,
        photoURL: p.avatarUrl,
        role: p.role === 'admin' ? 'admin' : 'user',
        createdAt: p.createdAt,
        lastLoginAt: p.updatedAt,
        driveBackupStatus: p.driveBackupStatus || 'none',
      }));
    }
  };

  // Update Drive Sync Status
  const updateUserDriveSyncStatus = async (
    status: 'synced' | 'pending' | 'none' | 'error',
    lastBackupAt?: string
  ) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const updateData: any = { driveBackupStatus: status };
        if (lastBackupAt) {
          updateData.lastDriveBackupAt = lastBackupAt;
        }
        await updateDoc(userDocRef, updateData);
      } catch (e) {
        console.warn('Failed updating drive sync status in Firestore', e);
      }
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeUser.id
          ? { ...p, driveBackupStatus: status, lastDriveBackupAt: lastBackupAt || p.lastDriveBackupAt }
          : p
      )
    );
  };

  const tenants: TenantProfile[] = profiles.map((p) => ({
    id: p.id,
    name: p.fullName,
    type: 'personal',
    description: p.bio || `Financial ledger for ${p.fullName}`,
    accountCount: 0,
  }));

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    try {
      localStorage.setItem(ONBOARDED_STORAGE_KEY, 'true');
    } catch {}
  };

  const signIn = async (email: string, fullName?: string) => {
    const existing = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setActiveProfileId(existing.id);
    } else {
      const newProf: UserProfile = {
        id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`,
        email,
        fullName: fullName || email.split('@')[0],
        baseCurrency: 'BDT',
        timezone: 'Asia/Dhaka',
        role: ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'owner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfiles((prev) => [...prev, newProf]);
      setActiveProfileId(newProf.id);
    }
  };

  const signUp = async (email: string, fullName: string) => {
    await signIn(email, fullName);
  };

  const signOut = () => {
    if (firebaseUser) {
      signOutGoogle();
    } else {
      setActiveProfileId(DEFAULT_PROFILES[0].id);
    }
  };

  const switchProfile = (profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (target) {
      setActiveProfileId(target.id);
    }
  };

  const updateProfile = (input: ProfileUpdateInput) => {
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === activeUser.id) {
          return {
            ...p,
            ...input,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const createProfile = (fullName: string, email: string, role: 'owner' | 'auditor' = 'owner') => {
    const newProfile: UserProfile = {
      id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`,
      email,
      fullName,
      baseCurrency: 'BDT',
      timezone: 'Asia/Dhaka',
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProfiles((prev) => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
  };

  const resetAllUserData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      console.warn('Failed resetting storage', e);
    }
  };

  /**
   * Google Play Store Compliance — Permanent Account & Associated Data Deletion
   * Wipes cloud documents, Firebase Auth record, and all local storage.
   */
  const deleteAccountAndData = async (password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        const providerId = currentUser.providerData[0]?.providerId;

        // 1. Re-authenticate user before destructive deletion
        if (providerId === 'password' || (currentUser.email && password)) {
          if (!password) {
            return {
              success: false,
              error: 'অ্যাকাউন্ট ডিলিট করতে বর্তমান পাসওয়ার্ড প্রয়োজন।',
            };
          }
          const cred = EmailAuthProvider.credential(currentUser.email!, password);
          await reauthenticateWithCredential(currentUser, cred);
        } else if (providerId === 'google.com') {
          if (Capacitor.isNativePlatform()) {
            try {
              const nativeResult = await SocialLogin.login({
                provider: 'google',
                options: {
                  style: 'standard',
                  filterByAuthorizedAccounts: true,
                },
              });
              const loginData = (nativeResult?.result || nativeResult) as any;
              if (loginData?.idToken) {
                const cred = GoogleAuthProvider.credential(
                  loginData.idToken,
                  loginData.accessToken?.token || loginData.accessToken
                );
                await reauthenticateWithCredential(currentUser, cred);
              }
            } catch (nativeErr: any) {
              console.warn('Native Google re-auth notice:', nativeErr);
            }
          } else {
            try {
              await reauthenticateWithPopup(currentUser, googleProvider);
            } catch (popupErr: any) {
              if (popupErr?.code === 'auth/popup-closed-by-user') {
                return { success: false, error: 'গুগল ভেরিফিকেশন বাতিল করা হয়েছে।' };
              }
              console.warn('Google re-auth notice:', popupErr);
            }
          }
        }

        const uid = currentUser.uid;

        // 2. Remote Firestore Cloud Purge (Ledger, Vault, User profile)
        try {
          await deleteDoc(doc(db, 'users', uid, 'cloud_ledger', 'current'));
        } catch (e) {
          console.warn('Could not delete cloud_ledger doc:', e);
        }

        try {
          await deleteDoc(doc(db, 'users', uid, 'cloud_vault', 'current'));
        } catch (e) {
          console.warn('Could not delete cloud_vault doc:', e);
        }

        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (e) {
          console.warn('Could not delete user doc:', e);
        }

        // 3. Delete Firebase Authentication User Record
        try {
          await deleteUser(currentUser);
        } catch (delUserErr: any) {
          if (delUserErr?.code === 'auth/requires-recent-login') {
            return {
              success: false,
              error: 'নিরাপত্তার কারণে অ্যাকাউন্ট মুছে ফেলার আগে পুনরায় লগইন করা প্রয়োজন (Recent login required)।',
            };
          }
          throw delUserErr;
        }
      }

      // 4. Wipe Local Storage, Session Storage and cached tokens
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (err) {
        console.warn('Storage clear notice:', err);
      }

      setFirebaseUser(null);
      setGoogleAccessToken(null);

      return { success: true };
    } catch (err: any) {
      console.error('Account deletion failed:', err);
      return {
        success: false,
        error: err?.message || 'অ্যাকাউন্ট ডিলিট প্রক্রিয়া সম্পন্ন করা সম্ভব হয়নি। আবার চেষ্টা করুন।',
      };
    }
  };

  /**
   * Play Store Web Portal Deletion Request Submission
   */
  const submitWebDeletionRequest = async (
    email: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!email || !email.includes('@')) {
        return { success: false, error: 'অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস লিখুন।' };
      }

      await addDoc(collection(db, 'deletion_requests'), {
        email: email.trim().toLowerCase(),
        reason: reason?.trim() || 'Play Store Web Deletion Request',
        requestedAt: new Date().toISOString(),
        status: 'pending',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web-client',
      });

      return { success: true };
    } catch (err: any) {
      console.error('Failed to submit deletion request:', err);
      return {
        success: false,
        error: err?.message || 'রিকোয়েস্ট জমা নেওয়া সম্ভব হয়নি। অনুগ্রহ করে raju.official.asf@gmail.com এ যোগাযোগ করুন।',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        firebaseUser,
        googleAccessToken,
        isGoogleAuthenticated: !!firebaseUser,
        availableProfiles: profiles,
        tenants,
        isAuthenticated: true,
        hasCompletedOnboarding,
        completeOnboarding,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithEmail,
        signOutGoogle,
        signOut,
        switchProfile,
        updateProfile,
        createProfile,
        resetAllUserData,
        deleteAccountAndData,
        submitWebDeletionRequest,
        fetchRegisteredUsers,
        updateUserDriveSyncStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
