import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GetSettings, UpdateSettings } from '../../../wailsjs/go/main/App';

const ThemeContext = createContext(undefined);
const THEME_STORAGE_KEY = 'cutlogic-theme';

function normalizeTheme(theme) {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }

  return 'system';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch (error) {
      return 'system';
    }
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await GetSettings();
        const normalized = normalizeTheme(settings?.theme);
        setThemeState(normalized);
        window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
      } catch (error) {
        // Keep current theme when settings cannot be loaded.
      } finally {
        setIsReady(true);
      }
    };

    void loadTheme();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (nextTheme) => {
      root.classList.remove('light', 'dark');
      if (nextTheme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(isDark ? 'dark' : 'light');
      } else {
        root.classList.add(nextTheme);
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    return undefined;
  }, [theme]);

  const setTheme = async (nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    setThemeState(normalized);
    window.localStorage.setItem(THEME_STORAGE_KEY, normalized);

    try {
      await UpdateSettings({ theme: normalized });
    } catch (error) {
      // Keep UI responsive even if persistence fails.
    }
  };

  const value = useMemo(() => ({ theme, setTheme, isReady }), [theme, isReady]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
