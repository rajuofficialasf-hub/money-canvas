import { isTrustedGitHubUrl } from '../src/lib/github-updater';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('--- Testing GitHub Updater Security & URL Domain Validation (STEP-2) ---');

// Trusted URLs
assert(
  isTrustedGitHubUrl('https://github.com/rajuofficialasf-hub/money-canvas/releases/download/v1.0.4/app-release.apk'),
  'Standard github.com release APK download must be trusted'
);
assert(
  isTrustedGitHubUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/12345/app.apk'),
  'GitHub AWS CDN (objects.githubusercontent.com) must be trusted'
);
assert(
  isTrustedGitHubUrl('https://github.com/rajuofficialasf-hub/money-canvas/releases'),
  'GitHub releases web page must be trusted'
);

// Untrusted URLs & Malicious Vectors
assert(!isTrustedGitHubUrl('http://github.com/insecure.apk'), 'HTTP protocol must be rejected (only HTTPS allowed)');
assert(!isTrustedGitHubUrl('https://evil-hacker.com/malicious.apk'), 'External non-github domain must be rejected');
assert(!isTrustedGitHubUrl('https://github.com.evil.com/app.apk'), 'Subdomain spoofing must be rejected');
assert(!isTrustedGitHubUrl('javascript:alert(1)'), 'Dangerous URL schemes must be rejected');
assert(!isTrustedGitHubUrl(''), 'Empty string must be rejected');
assert(!isTrustedGitHubUrl(null as any), 'Null or undefined must be rejected');

console.log('\n🎉 ALL UPDATER SECURITY VALIDATION TESTS PASSED!');
