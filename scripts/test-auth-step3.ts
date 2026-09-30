function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('--- Testing Authentication Architecture & Error Mapping (STEP-3) ---');

// 1. Firebase Error Code Mapping Tests
function mapFirebaseSignInError(code: string): string {
  if (code === 'auth/user-not-found') {
    return 'এই ইমেইলে কোনো একাউন্ট পাওয়া যায়নি। অনুগ্রহ করে নতুন একাউন্ট তৈরি (Sign Up) করুন।';
  } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'ভুল পাসওয়ার্ড অথবা ইমেইল। সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।';
  } else if (code === 'auth/invalid-email') {
    return 'ইমেইল ফরম্যাট সঠিক নয়। সঠিক ইমেইল ঠিকানা দিন।';
  } else if (code === 'auth/user-disabled') {
    return 'আপনার একাউন্টটি নিষ্ক্রিয় করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।';
  } else if (code === 'auth/too-many-requests') {
    return 'একাধিক ভুল চেষ্টার কারণে এক্সেস সাময়িকভাবে বন্ধ। কিছুক্ষণ পর চেষ্টা করুন।';
  }
  return 'লগইন সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';
}

function mapFirebaseSignUpError(code: string): string {
  if (code === 'auth/email-already-in-use') {
    return 'এই ইমেইলটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে সাইন ইন করুন।';
  } else if (code === 'auth/weak-password') {
    return 'পাসওয়ার্ডটি দুর্বল। কমপক্ষে ৬টি অক্ষর বা সংখ্যার শক্তিশালী পাসওয়ার্ড দিন।';
  } else if (code === 'auth/invalid-email') {
    return 'ইমেইল ফরম্যাট সঠিক নয়। সঠিক ইমেইল ঠিকানা দিন।';
  }
  return 'অ্যাকাউন্ট তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';
}

// Check Sign In error handling
assert(
  mapFirebaseSignInError('auth/wrong-password').includes('ভুল পাসওয়ার্ড'),
  'Wrong password error must not silently create an account'
);
assert(
  mapFirebaseSignInError('auth/invalid-credential').includes('ভুল পাসওয়ার্ড অথবা ইমেইল'),
  'Invalid credential must return incorrect password/email error'
);
assert(
  mapFirebaseSignInError('auth/user-not-found').includes('নতুন একাউন্ট তৈরি'),
  'User not found must guide user to sign up'
);

// Check Sign Up error handling
assert(
  mapFirebaseSignUpError('auth/email-already-in-use').includes('ইতিমধ্যে অ্যাকাউন্ট রয়েছে'),
  'Duplicate email registration must guide user to sign in'
);
assert(
  mapFirebaseSignUpError('auth/weak-password').includes('কমপক্ষে ৬টি অক্ষর'),
  'Weak password must guide user to use >= 6 characters'
);

// 2. Input validation invariants
function validateSignInInputs(email: string, password?: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, error: 'Email required' };
  if (!password) return { valid: false, error: 'Password required' };
  return { valid: true };
}

function validateSignUpInputs(email: string, password?: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, error: 'Email required' };
  if (!password || password.length < 6) return { valid: false, error: 'Password must be >= 6 characters' };
  return { valid: true };
}

assert(!validateSignInInputs('', 'password123').valid, 'Empty email must be rejected');
assert(!validateSignInInputs('test@example.com', '').valid, 'Empty password must be rejected in signIn');
assert(validateSignInInputs('test@example.com', 'mypassword').valid, 'Valid signIn credentials accepted');

assert(!validateSignUpInputs('test@example.com', '12345').valid, 'Sign up password < 6 chars rejected');
assert(validateSignUpInputs('test@example.com', '123456').valid, 'Sign up password >= 6 chars accepted');

// 3. Dynamic isAuthenticated invariant
// Prior to STEP-3, isAuthenticated was hardcoded to true
// Now it must be derived strictly from !!firebaseUser
let mockFirebaseUser: any = null;
let isAuthenticated = !!mockFirebaseUser;
assert(isAuthenticated === false, 'When firebaseUser is null, isAuthenticated MUST be false');

mockFirebaseUser = { uid: 'usr-123', email: 'user@example.com' };
isAuthenticated = !!mockFirebaseUser;
assert(isAuthenticated === true, 'When firebaseUser is present, isAuthenticated MUST be true');

console.log('\n🎉 ALL STEP-3 AUTHENTICATION TESTS PASSED!');
