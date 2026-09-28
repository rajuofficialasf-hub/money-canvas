/**
 * Money Canvas - Application Version Configuration
 */

export const CURRENT_APP_VERSION = '1.0.4';
export const CURRENT_APP_VERSION_NAME = `v${CURRENT_APP_VERSION}`;
export const GITHUB_REPO_OWNER = 'rajuofficialasf-hub';
export const GITHUB_REPO_NAME = 'money-canvas';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;
export const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

/**
 * Compare two semver strings (e.g. "1.0.1" vs "1.0.0", "v1.2.0" vs "v1.1.9").
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v1 is older)
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) =>
    v.replace(/^[vV]/, '').trim().split('.').map((p) => {
      const num = parseInt(p, 10);
      return isNaN(num) ? 0 : num;
    });

  const p1 = clean(v1);
  const p2 = clean(v2);

  const len = Math.max(p1.length, p2.length, 3);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}
