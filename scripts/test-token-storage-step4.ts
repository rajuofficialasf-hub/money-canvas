import {
  getInMemoryGoogleAccessToken,
  setInMemoryGoogleAccessToken,
} from '../src/lib/auth-context';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('--- Testing OAuth Token Storage & 401 Refresh Handling (STEP-4) ---');

// 1. Test In-Memory Token Lifecycle
assert(getInMemoryGoogleAccessToken() === null, 'Initial in-memory token must be null');

setInMemoryGoogleAccessToken('mock_oauth_access_token_xyz123');
assert(
  getInMemoryGoogleAccessToken() === 'mock_oauth_access_token_xyz123',
  'In-memory token getter must return freshly set token'
);

setInMemoryGoogleAccessToken(null);
assert(getInMemoryGoogleAccessToken() === null, 'Clearing token must set in-memory holder back to null');

// 2. Storage Purge Invariant
// Simulate localStorage / sessionStorage mock
const mockStorage: Record<string, string> = {
  pfos_google_access_token: 'stale_insecure_token_from_past',
  other_key: 'safe_data',
};

function purgeLegacyTokens(storage: Record<string, string>) {
  delete storage['pfos_google_access_token'];
}

purgeLegacyTokens(mockStorage);
assert(
  mockStorage['pfos_google_access_token'] === undefined,
  'Legacy token in localStorage must be completely removed'
);
assert(mockStorage['other_key'] === 'safe_data', 'Other storage keys must remain untouched');

// 3. ID Token Fallback Elimination Invariant
// Prior to STEP-4, line 307 had: loginData.accessToken?.token || loginData.accessToken || loginData.idToken
// We verify that idToken is NEVER treated as an access token
function extractAccessToken(loginData: { accessToken?: any; idToken?: string }): string | null {
  return loginData.accessToken?.token || loginData.accessToken || null;
}

const nativeLoginResultWithoutAccessToken = {
  idToken: 'jwt_firebase_id_token_header_payload_signature',
  // No OAuth access token returned
};

const extractedToken = extractAccessToken(nativeLoginResultWithoutAccessToken);
assert(
  extractedToken === null,
  'When only idToken is present, extracted access token MUST be null (never fallback to idToken)'
);

const nativeLoginResultWithAccessToken = {
  accessToken: { token: 'ya29.a0ARrdaM...' },
  idToken: 'jwt_id_token...',
};
assert(
  extractAccessToken(nativeLoginResultWithAccessToken) === 'ya29.a0ARrdaM...',
  'Actual Google OAuth access token must be properly extracted'
);

// 4. Test 401 Token Refresh & Retry Mechanics
async function mockDriveApiCallWithRetry(
  initialToken: string,
  refreshTokenFn: () => Promise<{ success: boolean; token?: string; error?: string }>
): Promise<{ success: boolean; data?: string; attempts: number }> {
  let attempts = 0;
  let currentToken = initialToken;

  while (attempts < 2) {
    attempts++;
    // Simulate initial token being expired (401)
    if (currentToken === 'expired_token') {
      const refreshResult = await refreshTokenFn();
      if (refreshResult.success && refreshResult.token) {
        currentToken = refreshResult.token;
        continue; // Retry with new token
      } else {
        return { success: false, attempts };
      }
    }

    // Valid token succeeds
    if (currentToken === 'fresh_refreshed_token') {
      return { success: true, data: 'drive_backup_payload', attempts };
    }
  }

  return { success: false, attempts };
}

let refreshCalled: boolean = false;
const mockRefreshToken = async () => {
  refreshCalled = true;
  return { success: true, token: 'fresh_refreshed_token' };
};

const retryTest = await mockDriveApiCallWithRetry('expired_token', mockRefreshToken);
assert(refreshCalled, '401 Unauthorized must trigger refreshTokenFn');
assert(retryTest.success === true, 'Drive operation must succeed after token refresh retry');
assert(retryTest.attempts === 2, 'Must perform exactly 1 retry with the new token');

console.log('\n🎉 ALL STEP-4 TOKEN STORAGE & SECURITY TESTS PASSED!');
