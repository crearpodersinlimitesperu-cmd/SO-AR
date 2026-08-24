import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 'auto' | 'light' | 'dark'
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem('cpsl_theme_mode') || 'dark';
  });

  const [activeTheme, setActiveTheme] = useState('dark');

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    localStorage.setItem('cpsl_theme_mode', mode);
  };

  useEffect(() => {
    const calculateTheme = () => {
      if (themeMode === 'light') {
        return 'light';
      }
      if (themeMode === 'dark') {
        return 'dark';
      }
      
      // MODO AUTOMÁTICO: Basado en el momento del día y reloj solar
      // Horario Día: 06:00 AM a 18:30 PM (6.0 a 18.5)
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
      if (resolved === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
      }
    };

    applyTheme();

    // Actualizar automáticamente cada minuto si está en modo auto
    const interval = setInterval(() => {
      if (themeMode === 'auto') {
        applyTheme();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, activeTheme }}>
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
