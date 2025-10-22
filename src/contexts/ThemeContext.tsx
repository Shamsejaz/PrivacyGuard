import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Theme, ThemeContextType } from '../types/design-tokens';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'light',
  storageKey = 'privacycomply-theme'
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return defaultTheme;
    }

    // Try to get theme from localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && (stored === 'light' || stored === 'dark')) {
        return stored as Theme;
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return defaultTheme;
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Update localStorage
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }

    // Update document attribute
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no theme is stored (user hasn't made a choice)
      try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) {
          setThemeState(e.matches ? 'dark' : 'light');
        }
      } catch (error) {
        // If localStorage fails, still update based on system preference
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    // Use modern addEventListener method
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storageKey]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

// Hook to get current theme without the full context (useful for components that only need to read)
export function useCurrentTheme(): Theme {
  const { theme } = useTheme();
  return theme;
}

// Hook to check if dark mode is active
export function useIsDarkMode(): boolean {
  const { theme } = useTheme();
  return theme === 'dark';
}
