import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import generalJson from '../data/general.json';

export type Theme = typeof generalJson;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const defaultTheme: Theme = generalJson as Theme;

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function applyCssVars(theme: Theme) {
  const root = document.documentElement;
  const colors = (theme as any)?.colors || {};
  const spacing = (theme as any)?.spacing || {};
  const typography = (theme as any)?.typography || {};

  // Color variables
  Object.entries(colors).forEach(([k, v]) => {
    if (typeof v === 'string') {
      root.style.setProperty(`--color-${k}`, v);
    } else if (v && typeof v === 'object' && (v as any).base) {
      root.style.setProperty(`--color-${k}`, (v as any).base);
    }
  });

  // Spacing variables
  Object.entries(spacing).forEach(([k, v]) => {
    root.style.setProperty(`--space-${k}`, String(v));
  });

  // Typography variables
  const ff = typography?.fontFamily || {};
  Object.entries(ff).forEach(([k, v]) => {
    root.style.setProperty(`--ff-${k}`, String(v));
  });
  const fs = typography?.fontSize || {};
  Object.entries(fs).forEach(([k, v]) => {
    root.style.setProperty(`--fs-${k}`, String(v));
  });
  const lh = typography?.lineHeight || {};
  Object.entries(lh).forEach(([k, v]) => {
    root.style.setProperty(`--lh-${k}`, String(v));
  });
  const fw = typography?.fontWeight || {} as Record<string, number>;
  Object.entries(fw).forEach(([k, v]) => {
    root.style.setProperty(`--fw-${k}`, String(v));
  });
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // Initial apply
  useEffect(() => {
    applyCssVars(theme);
  }, [theme]);

  // HMR for general.json
  useEffect(() => {
    // @ts-ignore
    if (import.meta && (import.meta as any).hot) {
      // @ts-ignore
      (import.meta as any).hot.accept('../data/general.json', (mod: any) => {
        if (mod?.default) setTheme(mod.default as Theme);
      });
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {/* Set base theme styles via CSS variables and Tailwind arbitrary values */}
      <div className="min-h-screen text-[var(--color-text)] bg-[var(--color-background)]" style={{ fontFamily: 'var(--ff-primary, inherit)' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
