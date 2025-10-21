import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getCSSCustomProperty, 
  setCSSCustomProperty, 
  validateTokens,
  validateAllTokens,
  initializeDesignTokens,
  tokens 
} from '../design-tokens';
import { tokenValidator } from '../token-validator';
import { 
  getColorToken, 
  getSemanticToken, 
  getSpacingToken,
  getFontSizeToken,
  getShadowToken,
  createTokenBatch,
  commonTokens
} from '../token-helpers';

// Mock DOM methods
const mockGetComputedStyle = vi.fn();
const mockSetProperty = vi.fn();

Object.defineProperty(window, 'getComputedStyle', {
  value: mockGetComputedStyle,
});

Object.defineProperty(document, 'documentElement', {
  value: {
    style: {
      setProperty: mockSetProperty,
    },
  },
});

describe('Design Token System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock CSS custom property values
    mockGetComputedStyle.mockReturnValue({
      getPropertyValue: (property: string) => {
        const mockValues: Record<string, string> = {
          '--color-primary-500': '#3b82f6',
          '--color-secondary-500': '#14b8a6',
          '--color-neutral-500': '#6b7280',
          '--color-success-500': '#22c55e',
          '--color-warning-500': '#f59e0b',
          '--color-danger-500': '#ef4444',
          '--color-info-500': '#3b82f6',
          '--color-background': '#f9fafb',
          '--color-surface': '#ffffff',
          '--color-text-primary': '#111827',
          '--color-border': '#e5e7eb',
          '--font-size-xs': '0.75rem',
          '--font-size-sm': '0.875rem',
          '--font-size-base': '1rem',
          '--font-size-lg': '1.125rem',
          '--font-size-xl': '1.25rem',
          '--font-family-sans': 'ui-sans-serif, system-ui, sans-serif',
          '--spacing-0': '0',
          '--spacing-1': '0.25rem',
          '--spacing-2': '0.5rem',
          '--spacing-4': '1rem',
          '--spacing-8': '2rem',
          '--spacing-16': '4rem',
          '--radius-base': '0.25rem',
          '--shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          '--shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          '--shadow-base': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          '--shadow-md': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          '--shadow-lg': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          '--transition-base': '200ms ease-in-out',
        };
        return mockValues[property] || '';
      },
    });
  });

  describe('CSS Custom Property Utilities', () => {
    it('should get CSS custom property values', () => {
      const value = getCSSCustomProperty('--color-primary-500');
      expect(value).toBe('#3b82f6');
      expect(mockGetComputedStyle).toHaveBeenCalled();
    });

    it('should set CSS custom property values', () => {
      setCSSCustomProperty('--test-property', 'test-value');
      expect(mockSetProperty).toHaveBeenCalledWith('--test-property', 'test-value');
    });

    it('should handle undefined window gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const value = getCSSCustomProperty('--test');
      expect(value).toBe('');
      
      setCSSCustomProperty('--test', 'value');
      // Should not throw
      
      global.window = originalWindow;
    });
  });

  describe('Token Validation', () => {
    it('should validate required tokens', () => {
      const result = validateTokens();
      expect(result.isValid).toBe(true);
      expect(result.missingTokens).toHaveLength(0);
    });

    it('should detect missing tokens', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => '', // All tokens missing
      });

      const result = validateTokens();
      expect(result.isValid).toBe(false);
      expect(result.missingTokens.length).toBeGreaterThan(0);
    });

    it('should validate all token categories', () => {
      const result = validateAllTokens();
      expect(result.isValid).toBe(true);
      expect(result.results.colors.valid).toBe(true);
      expect(result.results.spacing.valid).toBe(true);
      expect(result.results.typography.valid).toBe(true);
      expect(result.results.shadows.valid).toBe(true);
    });
  });

  describe('Token Validator Class', () => {
    it('should validate color tokens', () => {
      expect(tokenValidator.validateColor('#3b82f6')).toBe(true);
      expect(tokenValidator.validateColor('rgb(59, 130, 246)')).toBe(true);
      expect(tokenValidator.validateColor('var(--color-primary-500)')).toBe(true);
      expect(tokenValidator.validateColor('invalid-color')).toBe(false);
    });

    it('should validate spacing tokens', () => {
      expect(tokenValidator.validateSpacing('1rem')).toBe(true);
      expect(tokenValidator.validateSpacing('16px')).toBe(true);
      expect(tokenValidator.validateSpacing('0')).toBe(true);
      expect(tokenValidator.validateSpacing('var(--spacing-4)')).toBe(true);
      expect(tokenValidator.validateSpacing('invalid-spacing')).toBe(false);
    });

    it('should validate font size tokens', () => {
      expect(tokenValidator.validateFontSize('1rem')).toBe(true);
      expect(tokenValidator.validateFontSize('16px')).toBe(true);
      expect(tokenValidator.validateFontSize('var(--font-size-base)')).toBe(true);
      expect(tokenValidator.validateFontSize('invalid-size')).toBe(false);
    });

    it('should validate shadow tokens', () => {
      expect(tokenValidator.validateShadow('0 4px 6px rgba(0,0,0,0.1)')).toBe(true);
      expect(tokenValidator.validateShadow('none')).toBe(true);
      expect(tokenValidator.validateShadow('var(--shadow-base)')).toBe(true);
      expect(tokenValidator.validateShadow('invalid-shadow')).toBe(false);
    });
  });

  describe('Type-Safe Token Helpers', () => {
    it('should generate correct color token references', () => {
      expect(getColorToken('primary', 500)).toBe('var(--color-primary-500)');
      expect(getColorToken('secondary', 600)).toBe('var(--color-secondary-600)');
    });

    it('should generate correct semantic token references', () => {
      expect(getSemanticToken('background')).toBe('var(--color-background)');
      expect(getSemanticToken('surface')).toBe('var(--color-surface)');
    });

    it('should generate correct spacing token references', () => {
      expect(getSpacingToken(4)).toBe('var(--spacing-4)');
      expect(getSpacingToken(8)).toBe('var(--spacing-8)');
    });

    it('should generate correct font size token references', () => {
      expect(getFontSizeToken('base')).toBe('var(--font-size-base)');
      expect(getFontSizeToken('lg')).toBe('var(--font-size-lg)');
    });

    it('should generate correct shadow token references', () => {
      expect(getShadowToken('base')).toBe('var(--shadow-base)');
      expect(getShadowToken('md')).toBe('var(--shadow-md)');
    });
  });

  describe('Token Batch Operations', () => {
    it('should create and execute token batches', () => {
      const batch = createTokenBatch();
      batch.add('--test-property', 'test-value');
      batch.addColorToken('primary', 500, '#3b82f6');
      batch.addSpacingToken(4, '1rem');

      const operations = batch.getOperations();
      expect(operations).toHaveLength(3);
      expect(operations[0]).toEqual({ property: '--test-property', value: 'test-value' });
      expect(operations[1]).toEqual({ property: '--color-primary-500', value: '#3b82f6' });
      expect(operations[2]).toEqual({ property: '--spacing-4', value: '1rem' });

      batch.apply();
      expect(mockSetProperty).toHaveBeenCalledTimes(3);
    });

    it('should clear batch operations', () => {
      const batch = createTokenBatch();
      batch.add('--test', 'value');
      expect(batch.getOperations()).toHaveLength(1);
      
      batch.clear();
      expect(batch.getOperations()).toHaveLength(0);
    });
  });

  describe('Common Token Presets', () => {
    it('should provide common token combinations', () => {
      expect(commonTokens.primaryButton.background).toBe('var(--color-primary-500)');
      expect(commonTokens.card.background).toBe('var(--color-surface)');
      expect(commonTokens.input.fontSize).toBe('var(--font-size-base)');
    });
  });

  describe('Token Accessor Object', () => {
    it('should provide structured token access', () => {
      expect(tokens.colors.primary[500]).toBe('var(--color-primary-500)');
      expect(tokens.semanticColors.background).toBe('var(--color-background)');
      expect(tokens.fontSizes.base).toBe('var(--font-size-base)');
      expect(tokens.spacing[4]).toBe('var(--spacing-4)');
      expect(tokens.shadows.base).toBe('var(--shadow-base)');
    });
  });

  describe('Token Initialization', () => {
    it('should initialize and validate tokens', async () => {
      // Mock document ready state
      Object.defineProperty(document, 'readyState', {
        value: 'complete',
        configurable: true,
      });

      const result = await initializeDesignTokens();
      expect(result).toBe(true);
    });

    it('should handle loading state', async () => {
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        configurable: true,
      });

      const mockAddEventListener = vi.fn();
      document.addEventListener = mockAddEventListener;

      const initPromise = initializeDesignTokens();
      
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'DOMContentLoaded',
        expect.any(Function)
      );

      // Simulate DOMContentLoaded
      const callback = mockAddEventListener.mock.calls[0][1];
      callback();

      const result = await initPromise;
      expect(result).toBe(true);
    });
  });
});