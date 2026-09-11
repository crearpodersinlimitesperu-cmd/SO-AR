import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 'auto' | 'light' | 'dark' | 'zen'
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
    return 'dark';
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
      
      // Modo Auto: Cálculo por horario solar (6:00 a 18:30 Día, resto Noche)
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const isDayTime = currentHour >= 6.0 && currentHour < 18.5;

      return isDayTime ? 'light' : 'dark';
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

    const interval = setInterval(() => {
      if (themeMode === 'auto') applyTheme();
    }, 60000);

    return () => clearInterval(interval);
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
