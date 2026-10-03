import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * UX-3: Multi-theme color system. Themes are CSS-variable palettes applied via
 * `<html data-theme="...">`; the choice persists per device in localStorage
 * (a presentation preference, intentionally not cloud-synced).
 */
export type ThemeId = 'emerald-dark' | 'ocean-dark' | 'royal-dark' | 'soft-light';

export interface ThemeOption {
  id: ThemeId;
  nameBn: string;
  nameEn: string;
  /** Swatch preview colors: [canvas, surface, accent] */
  preview: [string, string, string];
  /** Browser/OS chrome color (PWA theme-color meta) */
  chromeColor: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'emerald-dark',
    nameBn: 'এমারেল্ড ডার্ক (ডিফল্ট)',
    nameEn: 'Emerald Dark',
    preview: ['#020617', '#0f172a', '#10b981'],
    chromeColor: '#020617',
  },
  {
    id: 'ocean-dark',
    nameBn: 'ওশান ব্লু',
    nameEn: 'Ocean Blue',
    preview: ['#030b17', '#0a1a2f', '#22d3ee'],
    chromeColor: '#030b17',
  },
  {
    id: 'royal-dark',
    nameBn: 'রয়্যাল ভায়োলেট',
    nameEn: 'Royal Violet',
    preview: ['#0c0613', '#171026', '#c084fc'],
    chromeColor: '#0c0613',
  },
  {
    id: 'soft-light',
    nameBn: 'সফট লাইট',
    nameEn: 'Soft Light',
    preview: ['#eef2f7', '#ffffff', '#059669'],
    chromeColor: '#eef2f7',
  },
];

const THEME_STORAGE_KEY = 'pfos_theme';

export function getStoredTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) return saved as ThemeId;
  } catch {
    // storage unavailable (private mode) — fall through to default
  }
  return 'emerald-dark';
}

export function applyThemeToDocument(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
  const opt = THEME_OPTIONS.find((t) => t.id === theme);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta && opt) meta.content = opt.chromeColor;
}

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  options: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(getStoredTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // non-fatal: theme simply won't persist
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, options: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
