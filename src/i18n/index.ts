/**
 * STEP-26: typed i18n dictionary. Every domain module contributes keys; the
 * merged MESSAGES map gives t() a compile-time-checked TranslationKey union —
 * a typo in a key is a TypeScript error, not a silent fallback.
 */
import { COMMON } from './common';
import { FIRE } from './fire';
import { DASHBOARD } from './dashboard';

export type { TranslationEntry } from './types';

export const MESSAGES = {
  ...COMMON,
  ...FIRE,
  ...DASHBOARD,
};

export type TranslationKey = keyof typeof MESSAGES;
