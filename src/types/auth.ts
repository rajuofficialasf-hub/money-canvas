/**
 * Personal Finance & Investment Manager — Identity & Auth Types
 * Reflects PostgreSQL auth.users and public.profiles schemas
 */

export type UserRole = 'owner' | 'manager' | 'auditor' | 'admin';

export interface UserProfile {
  id: string; // UUID or Firebase UID
  email: string;
  fullName: string;
  baseCurrency: 'BDT'; // Locked base accounting currency
  timezone: string; // e.g. 'Asia/Dhaka'
  avatarUrl?: string;
  role: UserRole;
  bio?: string;
  phoneMask?: string;
  createdAt: string;
  updatedAt: string;
  isDemoUser?: boolean;
  googleUid?: string;
  driveBackupStatus?: 'synced' | 'pending' | 'none' | 'error';
  lastDriveBackupAt?: string;
}

export interface FirebaseAppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLoginAt: string;
  driveBackupStatus?: 'synced' | 'pending' | 'none' | 'error';
  lastDriveBackupAt?: string;
}

export interface TenantProfile {
  id: string;
  name: string;
  type: 'personal' | 'business' | 'trust' | 'family';
  description: string;
  accountCount: number;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

export interface ProfileUpdateInput {
  fullName?: string;
  timezone?: string;
  bio?: string;
  phoneMask?: string;
}
