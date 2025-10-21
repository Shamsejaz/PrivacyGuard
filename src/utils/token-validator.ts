import type { 
  TokenValidator, 
  TokenValidationResult, 
  DetailedValidationResult,
  CSSCustomProperty 
} from '../types/design-tokens';
import { getCSSCustomProperty } from './design-tokens';

/**
 * Comprehensive design token validator
 */
export class DesignTokenValidator implements TokenValidator {
  private static instance: DesignTokenValidator;

  public static getInstance(): DesignTokenValidator {
    if (!DesignTokenValidator.instance) {
      DesignTokenValidator.instance = new DesignTokenValidator();
    }
    return DesignTokenValidator.instance;
  }

  /**
   * Validate color token format
   */
  validateColor(value: string): boolean {
    if (!value) return false;
    
    // Remove whitespace
    const trimmedValue = value.trim();
    
    // Check for various CSS color formats
    const patterns = [
      /^#[0-9a-fA-F]{3}$/,           // #rgb
      /^#[0-9a-fA-F]{6}$/,           // #rrggbb
      /^#[0-9a-fA-F]{8}$/,           // #rrggbbaa
      /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,  // rgb(r,g,b)
      /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/, // rgba(r,g,b,a)
      /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/, // hsl(h,s,l)
      /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/, // hsla(h,s,l,a)
      /^var\(--[\w-]+\)$/,           // CSS custom property
      /^transparent$/,               // transparent keyword
      /^currentColor$/i,             // currentColor keyword
    ];

    return patterns.some(pattern => pattern.test(trimmedValue));
  }

  /**
   * Validate spacing token format
   */
  validateSpacing(value: string): boolean {
    if (!value) return false;
    
    const trimmedValue = value.trim();
    
    // Check for valid spacing formats
    const patterns = [
      /^0$/,                         // Zero
      /^[\d.]+px$/,                  // Pixels
      /^[\d.]+rem$/,                 // Rem units
      /^[\d.]+em$/,                  // Em units
      /^[\d.]+%$/,                   // Percentage
      /^[\d.]+vh$/,                  // Viewport height
      /^[\d.]+vw$/,                  // Viewport width
      /^var\(--[\w-]+\)$/,           // CSS custom property
    ];

    return patterns.some(pattern => pattern.test(trimmedValue));
  }

  /**
   * Validate font size token format
   */
  validateFontSize(value: string): boolean {
    if (!value) return false;
    
    const trimmedValue = value.trim();
    
    const patterns = [
      /^[\d.]+px$/,                  // Pixels
      /^[\d.]+rem$/,                 // Rem units
      /^[\d.]+em$/,                  // Em units
      /^[\d.]+%$/,                   // Percentage
      /^var\(--[\w-]+\)$/,           // CSS custom property
    ];

    return patterns.some(pattern => pattern.test(trimmedValue));
  }

  /**
   * Validate shadow token format
   */
  validateShadow(value: string): boolean {
    if (!value) return false;
    
    const trimmedValue = value.trim();
    
    // Basic shadow validation - should contain shadow properties
    const patterns = [
      /^none$/,                      // No shadow
      /^\d+px\s+\d+px/,             // Basic shadow format like "0 4px 6px"
      /^inset/,                      // Inset shadow
      /^var\(--[\w-]+\)$/,           // CSS custom property
      /^\d+\s+\d+px\s+\d+px/,       // Format like "0 4px 6px"
      /rgba?\(/,                     // Contains rgba or rgb
    ];

    return patterns.some(pattern => pattern.test(trimmedValue));
  }

  /**
   * Validate all design tokens with detailed results
   */
  validateAllTokens(): DetailedValidationResult {
    const results = {
      colors: { valid: true, errors: [] as string[] },
      spacing: { valid: true, errors: [] as string[] },
      typography: { valid: true, errors: [] as string[] },
      shadows: { valid: true, errors: [] as string[] },
    };

    // Define token categories to validate
    const tokenCategories = {
      colors: [
        '--color-primary-500',
        '--color-secondary-500',
        '--color-neutral-500',
        '--color-success-500',
        '--color-warning-500',
        '--color-danger-500',
        '--color-info-500',
        '--color-background',
        '--color-surface',
        '--color-text-primary',
        '--color-border',
      ],
      spacing: [
        '--spacing-0',
        '--spacing-1',
        '--spacing-2',
        '--spacing-4',
        '--spacing-8',
        '--spacing-16',
      ],
      typography: [
        '--font-size-xs',
        '--font-size-sm',
        '--font-size-base',
        '--font-size-lg',
        '--font-size-xl',
      ],
      shadows: [
        '--shadow-xs',
        '--shadow-sm',
        '--shadow-base',
        '--shadow-md',
        '--shadow-lg',
      ],
    };

    // Validate color tokens
    tokenCategories.colors.forEach(token => {
      const value = getCSSCustomProperty(token);
      if (!this.validateColor(value)) {
        results.colors.valid = false;
        results.colors.errors.push(`Invalid color token: ${token} = "${value}"`);
      }
    });

    // Validate spacing tokens
    tokenCategories.spacing.forEach(token => {
      const value = getCSSCustomProperty(token);
      if (!this.validateSpacing(value)) {
        results.spacing.valid = false;
        results.spacing.errors.push(`Invalid spacing token: ${token} = "${value}"`);
      }
    });

    // Validate typography tokens
    tokenCategories.typography.forEach(token => {
      const value = getCSSCustomProperty(token);
      if (!this.validateFontSize(value)) {
        results.typography.valid = false;
        results.typography.errors.push(`Invalid typography token: ${token} = "${value}"`);
      }
    });

    // Validate shadow tokens
    tokenCategories.shadows.forEach(token => {
      const value = getCSSCustomProperty(token);
      if (!this.validateShadow(value)) {
        results.shadows.valid = false;
        results.shadows.errors.push(`Invalid shadow token: ${token} = "${value}"`);
      }
    });

    const isValid = results.colors.valid && 
                    results.spacing.valid && 
                    results.typography.valid && 
                    results.shadows.valid;

    return { isValid, results };
  }

  /**
   * Validate required tokens exist
   */
  validateRequiredTokens(): TokenValidationResult {
    const requiredTokens: CSSCustomProperty[] = [
      '--color-primary-500',
      '--color-secondary-500',
      '--color-neutral-500',
      '--color-background',
      '--color-surface',
      '--color-text-primary',
      '--font-size-base',
      '--font-family-sans',
      '--spacing-4',
      '--radius-base',
      '--shadow-base',
      '--transition-base',
    ];

    const missingTokens: string[] = [];
    
    requiredTokens.forEach(token => {
      const value = getCSSCustomProperty(token);
      if (!value) {
        missingTokens.push(token);
      }
    });

    return {
      isValid: missingTokens.length === 0,
      missingTokens
    };
  }

  /**
   * Get validation report for debugging
   */
  getValidationReport(): {
    required: TokenValidationResult;
    detailed: DetailedValidationResult;
    summary: {
      totalTokens: number;
      validTokens: number;
      invalidTokens: number;
      missingTokens: number;
    };
  } {
    const required = this.validateRequiredTokens();
    const detailed = this.validateAllTokens();
    
    const totalErrors = Object.values(detailed.results).reduce(
      (sum, category) => sum + category.errors.length, 
      0
    );

    return {
      required,
      detailed,
      summary: {
        totalTokens: 50, // Approximate count of design tokens
        validTokens: 50 - totalErrors - required.missingTokens.length,
        invalidTokens: totalErrors,
        missingTokens: required.missingTokens.length,
      }
    };
  }
}

// Export singleton instance
export const tokenValidator = DesignTokenValidator.getInstance();

// Export convenience functions
export const validateDesignTokens = () => tokenValidator.validateAllTokens();
export const validateRequiredTokens = () => tokenValidator.validateRequiredTokens();
export const getTokenValidationReport = () => tokenValidator.getValidationReport();