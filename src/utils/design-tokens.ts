import type { DesignTokens, TokenValidationResult, DetailedValidationResult } from '../types/design-tokens';
import { tokenValidator } from './token-validator';

/**
 * Get CSS custom property value
 */
export function getCSSCustomProperty(property: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
}

/**
 * Set CSS custom property value
 */
export function setCSSCustomProperty(property: string, value: string): void {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(property, value);
}

/**
 * Design token accessor with type safety
 */
export const tokens: DesignTokens = {
  colors: {
    primary: {
      50: 'var(--color-primary-50)',
      100: 'var(--color-primary-100)',
      200: 'var(--color-primary-200)',
      300: 'var(--color-primary-300)',
      400: 'var(--color-primary-400)',
      500: 'var(--color-primary-500)',
      600: 'var(--color-primary-600)',
      700: 'var(--color-primary-700)',
      800: 'var(--color-primary-800)',
      900: 'var(--color-primary-900)',
      950: 'var(--color-primary-950)',
    },
    secondary: {
      50: 'var(--color-secondary-50)',
      100: 'var(--color-secondary-100)',
      200: 'var(--color-secondary-200)',
      300: 'var(--color-secondary-300)',
      400: 'var(--color-secondary-400)',
      500: 'var(--color-secondary-500)',
      600: 'var(--color-secondary-600)',
      700: 'var(--color-secondary-700)',
      800: 'var(--color-secondary-800)',
      900: 'var(--color-secondary-900)',
      950: 'var(--color-secondary-950)',
    },
    neutral: {
      50: 'var(--color-neutral-50)',
      100: 'var(--color-neutral-100)',
      200: 'var(--color-neutral-200)',
      300: 'var(--color-neutral-300)',
      400: 'var(--color-neutral-400)',
      500: 'var(--color-neutral-500)',
      600: 'var(--color-neutral-600)',
      700: 'var(--color-neutral-700)',
      800: 'var(--color-neutral-800)',
      900: 'var(--color-neutral-900)',
      950: 'var(--color-neutral-950)',
    },
    success: {
      50: 'var(--color-success-50)',
      100: 'var(--color-success-100)',
      200: 'var(--color-success-200)',
      300: 'var(--color-success-300)',
      400: 'var(--color-success-400)',
      500: 'var(--color-success-500)',
      600: 'var(--color-success-600)',
      700: 'var(--color-success-700)',
      800: 'var(--color-success-800)',
      900: 'var(--color-success-900)',
      950: 'var(--color-success-950)',
    },
    warning: {
      50: 'var(--color-warning-50)',
      100: 'var(--color-warning-100)',
      200: 'var(--color-warning-200)',
      300: 'var(--color-warning-300)',
      400: 'var(--color-warning-400)',
      500: 'var(--color-warning-500)',
      600: 'var(--color-warning-600)',
      700: 'var(--color-warning-700)',
      800: 'var(--color-warning-800)',
      900: 'var(--color-warning-900)',
      950: 'var(--color-warning-950)',
    },
    danger: {
      50: 'var(--color-danger-50)',
      100: 'var(--color-danger-100)',
      200: 'var(--color-danger-200)',
      300: 'var(--color-danger-300)',
      400: 'var(--color-danger-400)',
      500: 'var(--color-danger-500)',
      600: 'var(--color-danger-600)',
      700: 'var(--color-danger-700)',
      800: 'var(--color-danger-800)',
      900: 'var(--color-danger-900)',
      950: 'var(--color-danger-950)',
    },
    info: {
      50: 'var(--color-info-50)',
      100: 'var(--color-info-100)',
      200: 'var(--color-info-200)',
      300: 'var(--color-info-300)',
      400: 'var(--color-info-400)',
      500: 'var(--color-info-500)',
      600: 'var(--color-info-600)',
      700: 'var(--color-info-700)',
      800: 'var(--color-info-800)',
      900: 'var(--color-info-900)',
      950: 'var(--color-info-950)',
    },
  },
  semanticColors: {
    background: 'var(--color-background)',
    backgroundSecondary: 'var(--color-background-secondary)',
    surface: 'var(--color-surface)',
    surfaceSecondary: 'var(--color-surface-secondary)',
    border: 'var(--color-border)',
    borderSecondary: 'var(--color-border-secondary)',
    textPrimary: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    textTertiary: 'var(--color-text-tertiary)',
    textInverse: 'var(--color-text-inverse)',
    focusRing: 'var(--color-focus-ring)',
  },
  fontSizes: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    base: 'var(--font-size-base)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
    '3xl': 'var(--font-size-3xl)',
    '4xl': 'var(--font-size-4xl)',
    '5xl': 'var(--font-size-5xl)',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  spacing: {
    0: 'var(--spacing-0)',
    px: 'var(--spacing-px)',
    0.5: 'var(--spacing-0-5)',
    1: 'var(--spacing-1)',
    1.5: 'var(--spacing-1-5)',
    2: 'var(--spacing-2)',
    2.5: 'var(--spacing-2-5)',
    3: 'var(--spacing-3)',
    3.5: 'var(--spacing-3-5)',
    4: 'var(--spacing-4)',
    5: 'var(--spacing-5)',
    6: 'var(--spacing-6)',
    7: 'var(--spacing-7)',
    8: 'var(--spacing-8)',
    9: 'var(--spacing-9)',
    10: 'var(--spacing-10)',
    11: 'var(--spacing-11)',
    12: 'var(--spacing-12)',
    14: 'var(--spacing-14)',
    16: 'var(--spacing-16)',
    20: 'var(--spacing-20)',
    24: 'var(--spacing-24)',
    28: 'var(--spacing-28)',
    32: 'var(--spacing-32)',
  },
  borderRadius: {
    none: 'var(--radius-none)',
    sm: 'var(--radius-sm)',
    base: 'var(--radius-base)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    '3xl': 'var(--radius-3xl)',
    full: 'var(--radius-full)',
  },
  shadows: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    base: 'var(--shadow-base)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    '2xl': 'var(--shadow-2xl)',
    inner: 'var(--shadow-inner)',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },
  transitions: {
    fast: 'var(--transition-fast)',
    base: 'var(--transition-base)',
    slow: 'var(--transition-slow)',
  },
};

/**
 * Validate design token values (legacy function - use tokenValidator for new code)
 */
export function validateTokens(): TokenValidationResult {
  return tokenValidator.validateRequiredTokens();
}

/**
 * Get all available CSS custom properties
 */
export function getAllCSSCustomProperties(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const styles = getComputedStyle(document.documentElement);
  const properties: Record<string, string> = {};
  
  for (let i = 0; i < styles.length; i++) {
    const property = styles[i];
    if (property.startsWith('--')) {
      properties[property] = styles.getPropertyValue(property).trim();
    }
  }
  
  return properties;
}

/**
 * Validate color token format (hex, rgb, hsl, etc.)
 */
export function validateColorToken(value: string): boolean {
  if (!value) return false;
  
  // Check for CSS color formats
  const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|var\(--)/;
  return colorRegex.test(value.trim());
}

/**
 * Validate spacing token format (rem, px, em, etc.)
 */
export function validateSpacingToken(value: string): boolean {
  if (!value) return false;
  
  const spacingRegex = /^(0|[\d.]+(?:px|rem|em|%|vh|vw)|var\(--)/;
  return spacingRegex.test(value.trim());
}

/**
 * Validate font size token format
 */
export function validateFontSizeToken(value: string): boolean {
  if (!value) return false;
  
  const fontSizeRegex = /^([\d.]+(?:px|rem|em|%)|var\(--)/;
  return fontSizeRegex.test(value.trim());
}

/**
 * Comprehensive token validation with detailed results
 */
export function validateAllTokens(): DetailedValidationResult {
  return tokenValidator.validateAllTokens();
}

/**
 * Initialize and validate design tokens on app startup
 */
export function initializeDesignTokens(): Promise<boolean> {
  return new Promise((resolve) => {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const validation = tokenValidator.getValidationReport();
        
        if (!validation.required.isValid || !validation.detailed.isValid) {
          console.warn('Design token validation failed:', {
            missing: validation.required.missingTokens,
            invalid: validation.detailed.results,
            summary: validation.summary
          });
        } else {
          console.log('Design tokens validated successfully:', validation.summary);
        }
        
        resolve(validation.required.isValid && validation.detailed.isValid);
      });
    } else {
      const validation = tokenValidator.getValidationReport();
      
      if (!validation.required.isValid || !validation.detailed.isValid) {
        console.warn('Design token validation failed:', {
          missing: validation.required.missingTokens,
          invalid: validation.detailed.results,
          summary: validation.summary
        });
      } else {
        console.log('Design tokens validated successfully:', validation.summary);
      }
      
      resolve(validation.required.isValid && validation.detailed.isValid);
    }
  });
}