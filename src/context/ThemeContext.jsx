import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 'auto' | 'light' | 'dark' | 'zen'
  const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem('cpsl_theme_mode') || 'dark';
  });

  const [zenMode, setZenModeState] = useState(() => {
    const savedZen = localStorage.getItem('cpsl_zen_mode');
    const savedMode = localStorage.getItem('cpsl_theme_mode');
    return savedZen === 'true' || savedMode === 'zen';
  });

  const [activeTheme, setActiveTheme] = useState(() => {
    const savedMode = localStorage.getItem('cpsl_theme_mode') || 'dark';
    if (savedMode === 'zen') return 'zen';
    if (savedMode === 'light') return 'light';
    if (savedMode === 'dark') return 'dark';
    return getSystemTheme();
  });

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    localStorage.setItem('cpsl_theme_mode', mode);
    if (mode === 'zen') {
      setZenModeState(true);
      localStorage.setItem('cpsl_zen_mode', 'true');
    } else if (mode === 'light' || mode === 'dark') {
      setZenModeState(false);
      localStorage.setItem('cpsl_zen_mode', 'false');
    }
  };

  const setZenMode = (isZen) => {
    setZenModeState(isZen);
    localStorage.setItem('cpsl_zen_mode', isZen ? 'true' : 'false');
    if (isZen) {
      setThemeModeState('zen');
      localStorage.setItem('cpsl_theme_mode', 'zen');
    } else {
      setThemeModeState('dark');
      localStorage.setItem('cpsl_theme_mode', 'dark');
    }
  };

  useEffect(() => {
    const calculateTheme = () => {
      if (themeMode === 'zen') return 'zen';
      if (themeMode === 'light') return 'light';
      if (themeMode === 'dark') return 'dark';
      
      return getSystemTheme();
    };

    const applyTheme = () => {
      const resolved = calculateTheme();
      setActiveTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      document.body.setAttribute('data-theme', resolved);
      
      document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-zen');
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-zen');
      
      document.documentElement.classList.add(`theme-${resolved}`);
      document.body.classList.add(`theme-${resolved}`);
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    if (themeMode === 'auto') mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ 
      themeMode, 
      setThemeMode, 
      activeTheme, 
      zenMode: zenMode || themeMode === 'zen', 
      setZenMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
