import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Always start with system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('[Theme] Initial load - system preference:', systemDark ? 'dark' : 'light');
    return systemDark;
  });

  // Apply theme to document whenever isDarkMode changes
  useEffect(() => {
    console.log('[Theme] Applying theme:', isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Listen for system preference changes - ALWAYS follow system
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      console.log('[Theme] System preference changed to:', e.matches ? 'dark' : 'light');
      setIsDarkMode(e.matches);
    };

    console.log('[Theme] Listening for system preference changes...');

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Toggle theme manually (temporary override until system changes or page reload)
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      console.log('[Theme] Manually toggled to:', newValue ? 'dark' : 'light');
      return newValue;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
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
