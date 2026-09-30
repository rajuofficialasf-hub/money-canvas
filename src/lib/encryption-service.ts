/**
 * Money Canvas — Military-Grade Encrypted Backup Service (FEAT-2)
 *
 * Implements Web Crypto API AES-GCM (256-bit) authenticated encryption
 * with PBKDF2 (SHA-256, 100,000 iterations) passphrase-derived keys.
 * 
 * Features:
 * - Zero-Knowledge Architecture: Passphrase is never stored or transmitted.
 * - Authenticated Encryption (AEAD): Any tampering with ciphertext or salt will fail tag validation.
 * - Cross-Platform: Works in Chrome/Safari/Firefox, Android Capacitor WebViews, and Node/Vitest environments.
 */

import { BackupBundle } from '../types/accounting';

export interface EncryptedBackupBundle {
  version: '1.0';
  isEncrypted: true;
  cipher: 'AES-GCM-256';
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  salt: string; // Base64 16 bytes
  iv: string;   // Base64 12 bytes
  iterations: number; // 100,000
  ciphertext: string; // Base64 AES-GCM ciphertext + 16-byte tag
  exportedAt: string; // ISO 8601
  userFullName?: string;
  recordCountsSummary?: {
    accounts: number;
    transactions: number;
    stocks: number;
  };
  hint?: string; // Optional user password hint (never the password itself)
}

const ITERATIONS_COUNT = 100_000;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;

function getCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is not supported in this runtime environment.');
}

/**
 * Converts a Uint8Array into a standard Base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string back into a Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Type-guard to check whether an unknown object is an EncryptedBackupBundle
 */
export function isEncryptedBackup(obj: unknown): obj is EncryptedBackupBundle {
  if (!obj || typeof obj !== 'object') return false;
  const bundle = obj as Record<string, any>;
  return (
    bundle.isEncrypted === true &&
    bundle.cipher === 'AES-GCM-256' &&
    typeof bundle.ciphertext === 'string' &&
    typeof bundle.salt === 'string' &&
    typeof bundle.iv === 'string'
  );
}

/**
 * Validates user-chosen passphrase length and strength
 */
export function validatePassphrase(passphrase: string): { isValid: boolean; error?: string; strength: 'weak' | 'medium' | 'strong' } {
  if (!passphrase || passphrase.length < 8) {
    return {
      isValid: false,
      error: 'পাসফ্রেজ কমপক্ষে ৮ অক্ষরের হতে হবে (Passphrase must be at least 8 characters).',
      strength: 'weak',
    };
  }

  let score = 0;
  if (passphrase.length >= 10) score += 1;
  if (passphrase.length >= 14) score += 1;
  if (/[A-Z]/.test(passphrase) && /[a-z]/.test(passphrase)) score += 1;
  if (/[0-9]/.test(passphrase)) score += 1;
  if (/[^A-Za-z0-9]/.test(passphrase)) score += 1;

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) {
    strength = 'strong';
  } else if (score >= 2) {
    strength = 'medium';
  }

  return { isValid: true, strength };
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a passphrase and salt using PBKDF2
 */
async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a full BackupBundle into an EncryptedBackupBundle using AES-GCM-256
 */
export async function encryptBackupBundle(
  bundle: BackupBundle,
  passphrase: string,
  hint?: string
): Promise<EncryptedBackupBundle> {
  const validation = validatePassphrase(passphrase);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));

  const key = await deriveAesKey(passphrase, salt, ITERATIONS_COUNT);

  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(bundle);
  const dataBytes = encoder.encode(jsonString);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    dataBytes as any
  );

  const ciphertextBytes = new Uint8Array(encryptedBuffer);

  const accountsCount = bundle.data?.accounts?.length || 0;
  const transactionsCount = bundle.data?.transactions?.length || 0;
  const stocksCount = bundle.data?.stocks?.length || 0;

  return {
    version: '1.0',
    isEncrypted: true,
    cipher: 'AES-GCM-256',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    iterations: ITERATIONS_COUNT,
    ciphertext: bytesToBase64(ciphertextBytes),
    exportedAt: new Date().toISOString(),
    userFullName: bundle.metadata?.userFullName,
    recordCountsSummary: {
      accounts: accountsCount,
      transactions: transactionsCount,
      stocks: stocksCount,
    },
    hint: hint?.trim() ? hint.trim() : undefined,
  };
}

/**
 * Decrypts an EncryptedBackupBundle using the supplied passphrase
 */
export async function decryptBackupBundle(
  encrypted: EncryptedBackupBundle,
  passphrase: string
): Promise<BackupBundle> {
  if (!isEncryptedBackup(encrypted)) {
    throw new Error('অবৈধ এনক্রিপ্টেড ব্যাকআপ ফরম্যাট (Invalid encrypted backup format).');
  }

  if (!passphrase) {
    throw new Error('অনুগ্রহ করে পাসফ্রেজ প্রদান করুন (Passphrase is required).');
  }

  let salt: Uint8Array;
  let iv: Uint8Array;
  let ciphertext: Uint8Array;

  try {
    salt = base64ToBytes(encrypted.salt);
    iv = base64ToBytes(encrypted.iv);
    ciphertext = base64ToBytes(encrypted.ciphertext);
  } catch {
    throw new Error('এনক্রিপ্টেড ফাইলের ফরম্যাট বিকৃত বা ক্ষতিগ্রস্ত (Corrupted base64 payload).');
  }

  const iterations = encrypted.iterations || ITERATIONS_COUNT;
  const key = await deriveAesKey(passphrase, salt, iterations);

  let decryptedBuffer: ArrayBuffer;
  try {
    const crypto = getCrypto();
    decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as any,
      },
      key,
      ciphertext as any
    );
  } catch (err: any) {
    throw new Error('ভুল পাসফ্রেজ! ব্যাকআপ ফাইলটি আনলক করা যায়নি (Incorrect passphrase. Authentication failed).');
  }

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('ডিক্রিপ্ট করা ডেটা বৈধ JSON নয় (Decrypted payload is not valid JSON).');
  }

  if (!parsed || !parsed.metadata || !parsed.data) {
    throw new Error('অবৈধ লেজার ফাইল: metadata অথবা data অংশ পাওয়া যায়নি (Invalid ledger schema).');
  }

  return parsed as BackupBundle;
}
