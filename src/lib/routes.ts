/**
 * Money Canvas Application Route & Deep-Link Mappings
 * Maps canonical view identifiers to URL routes for hash-based navigation and deep-linking.
 */

export const ROUTE_MAP: Record<string, string> = {
  dashboard: '/dashboard',
  accounts: '/accounts',
  ledger: '/ledger',
  sms_parser: '/sms-parser',
  fixed_deposits: '/fixed-deposits',
  dps: '/dps',
  sanchaya_bonds: '/sanchaya-bonds',
  gold_fx: '/gold-fx',
  fire: '/fire',
  budgets: '/budgets',
  family_budget: '/family-budget',
  recurring: '/recurring',
  goals: '/goals',
  debts: '/debts',
  loans: '/loans',
  assets: '/assets',
  zakat: '/zakat',
  stocks: '/stocks',
  brokerage: '/brokerage',
  trades: '/trades',
  performance: '/performance',
  dividends: '/dividends',
  reports: '/reports',
  tax: '/tax',
  notifications: '/notifications',
  audit_logs: '/audit-logs',
  admin_users: '/admin-users',
  backup_restore: '/backup-restore',
  rls: '/rls',
  settings: '/settings',
  playstore_kit: '/playstore-kit',
  user_guide: '/user-guide',
  privacy: '/privacy',
  terms: '/terms',
  landing: '/landing',
};

// Inverse map for O(1) route lookup
const PATH_TO_VIEW_MAP: Record<string, string> = {};

Object.entries(ROUTE_MAP).forEach(([view, path]) => {
  PATH_TO_VIEW_MAP[path.toLowerCase()] = view;
  // Also support snake_case directly in URL (e.g. #/fixed_deposits)
  PATH_TO_VIEW_MAP[`/${view}`.toLowerCase()] = view;
});

// Additional alias routes
PATH_TO_VIEW_MAP['/'] = 'dashboard';
PATH_TO_VIEW_MAP['/privacy-policy'] = 'privacy';
PATH_TO_VIEW_MAP['/terms-of-service'] = 'terms';

/**
 * Resolve a URL path to its canonical view identifier. Defaults to 'dashboard'.
 */
export function getViewFromPath(pathname: string): string {
  if (!pathname) return 'dashboard';
  const cleanPath = pathname.trim().toLowerCase().replace(/\/$/, '') || '/';
  return PATH_TO_VIEW_MAP[cleanPath] || 'dashboard';
}

/**
 * Resolve a view identifier to its canonical URL path.
 */
export function getPathFromView(view: string): string {
  return ROUTE_MAP[view] || `/${view.replace(/_/g, '-')}`;
}
