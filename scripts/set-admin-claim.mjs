#!/usr/bin/env node
/**
 * scripts/set-admin-claim.mjs
 *
 * Sets Firebase Auth custom claim { admin: true } on a target user UID.
 *
 * ============================================================================
 * নির্দেশাবলী / Instructions:
 * ============================================================================
 * ১. Firebase Console থেকে Service Account Key ডাউনলোড করুন:
 *    Firebase Console -> Project Settings -> Service accounts -> "Generate new private key"
 * ২. ফাইলটি প্রজেক্ট রুটে বা নিরাপদ কোথাও রাখুন (যেমন: service-account.json)।
 *    সাবধান: এই কী ফাইলটি কখনো git-এ commit করবেন না!
 * ৩. এনভায়রনমেন্ট ভেরিয়েবল সেট করুন:
 *    export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
 * ৪. firebase-admin ইনস্টল করুন (যদি না থাকে):
 *    npm install -D firebase-admin
 * ৫. স্ক্রিপ্টটি চালান:
 *    node scripts/set-admin-claim.mjs <TARGET_UID>
 *
 * অ্যাডমিন ক্ষমতা বাতিল করতে চাইলে:
 *    node scripts/set-admin-claim.mjs <TARGET_UID> false
 * ============================================================================
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function main() {
  const targetUid = process.argv[2];
  const claimValue = process.argv[3] !== 'false';

  if (!targetUid) {
    console.error('Error: Target UID is required.');
    console.error('Usage: node scripts/set-admin-claim.mjs <TARGET_UID> [true|false]');
    process.exit(1);
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch (err) {
    console.error('Error: "firebase-admin" package is not installed.');
    console.error('Please install it by running: npm install -D firebase-admin');
    process.exit(1);
  }

  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath && existsSync(resolve(credPath))) {
      const serviceAccount = JSON.parse(readFileSync(resolve(credPath), 'utf-8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      } catch (e) {
        console.error('Error: Failed to initialize Firebase Admin SDK.');
        console.error('Please provide service account credentials via GOOGLE_APPLICATION_CREDENTIALS environment variable:');
        console.error('  export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"');
        process.exit(1);
      }
    }
  }

  const auth = admin.auth();

  try {
    const user = await auth.getUser(targetUid);
    console.log(`Found user: ${user.displayName || 'No name'} (${user.email || 'No email'}) [UID: ${user.uid}]`);

    const currentClaims = user.customClaims || {};
    const newClaims = {
      ...currentClaims,
      admin: claimValue,
    };

    if (!claimValue) {
      delete newClaims.admin;
    }

    await auth.setCustomUserClaims(targetUid, newClaims);
    console.log(`✅ Successfully updated custom claims for UID: ${targetUid}`);
    console.log(`Current claims:`, newClaims);
    console.log(`\nNote: The user must sign out and sign in again (or force token refresh via getIdToken(true)) for changes to take effect.`);
  } catch (error) {
    console.error(`Failed to set custom claim on user ${targetUid}:`, error.message || error);
    process.exit(1);
  }
}

main();
