/**
 * Centralized Application Configuration Constants
 * STEP-5: Hardcoded email strings are moved here for maintainability.
 * NOTE: These are for display / contact purposes ONLY.
 * Admin access MUST be verified via Firebase custom claims (getIdTokenResult),
 * NEVER by comparing user email against these strings.
 */
export const APP_CONFIG = {
  /** Developer / owner contact email (for display in legal pages, mailto links) */
  OWNER_EMAIL: 'raju.official.asf@gmail.com',

  /** Official GitHub repository */
  REPO_URL: 'https://github.com/rajuofficialasf-hub/money-canvas',

  /** App display name */
  APP_NAME: 'Money Canvas',

  /** Support contact (same as owner for now) */
  SUPPORT_EMAIL: 'raju.official.asf@gmail.com',
} as const;
