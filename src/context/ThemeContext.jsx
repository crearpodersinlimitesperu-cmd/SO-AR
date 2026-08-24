import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 'auto' | 'light' | 'dark'
  const [themeMode, setThemeModeState] = useState('dark');
  const [activeTheme, setActiveTheme] = useState('dark');

  const setThemeMode = (mode) => {
    // Strict dark mode enforced for all users
    console.log("Strict dark mode enforced. Ignored request to change theme to:", mode);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('theme-dark');
    document.documentElement.classList.remove('theme-light');
  }, []);

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
