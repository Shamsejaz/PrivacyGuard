import type { 
  ColorTokenCategory, 
  ColorScaleStep, 
  SemanticTokenCategory,
  SpacingScaleStep,
  FontSizeScaleStep,
  ShadowScaleStep,
  GetColorToken,
  GetSemanticToken,
  GetSpacingToken,
  GetFontSizeToken,
  GetShadowToken
} from '../types/design-tokens';

/**
 * Type-safe color token accessor
 */
export function getColorToken<
  Category extends ColorTokenCategory,
  Step extends ColorScaleStep
>(category: Category, step: Step): GetColorToken<Category, Step> {
  return `var(--color-${category}-${step})` as GetColorToken<Category, Step>;
}

/**
 * Type-safe semantic color token accessor
 */
export function getSemanticToken<Category extends SemanticTokenCategory>(
  category: Category
): GetSemanticToken<Category> {
  return `var(--color-${category})` as GetSemanticToken<Category>;
}

/**
 * Type-safe spacing token accessor
 */
export function getSpacingToken<Step extends SpacingScaleStep>(
  step: Step
): GetSpacingToken<Step> {
  return `var(--spacing-${step})` as GetSpacingToken<Step>;
}

/**
 * Type-safe font size token accessor
 */
export function getFontSizeToken<Step extends FontSizeScaleStep>(
  step: Step
): GetFontSizeToken<Step> {
  return `var(--font-size-${step})` as GetFontSizeToken<Step>;
}

/**
 * Type-safe shadow token accessor
 */
export function getShadowToken<Step extends ShadowScaleStep>(
  step: Step
): GetShadowToken<Step> {
  return `var(--shadow-${step})` as GetShadowToken<Step>;
}

/**
 * Get border radius token
 */
export function getBorderRadiusToken(
  size: 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
): string {
  return `var(--radius-${size})`;
}

/**
 * Get transition token
 */
export function getTransitionToken(
  speed: 'fast' | 'base' | 'slow'
): string {
  return `var(--transition-${speed})`;
}

/**
 * Get z-index token
 */
export function getZIndexToken(
  layer: 'dropdown' | 'sticky' | 'fixed' | 'modal-backdrop' | 'modal' | 'popover' | 'tooltip' | 'toast'
): string {
  const zIndexMap = {
    'dropdown': 1000,
    'sticky': 1020,
    'fixed': 1030,
    'modal-backdrop': 1040,
    'modal': 1050,
    'popover': 1060,
    'tooltip': 1070,
    'toast': 1080,
  };
  
  return zIndexMap[layer].toString();
}

/**
 * Utility for creating component-specific token sets
 */
export function createComponentTokens<T extends Record<string, string>>(
  _componentName: string,
  tokens: T
): T {
  // This could be extended to validate component tokens
  // or create component-specific CSS custom properties
  return tokens;
}

/**
 * Generate CSS custom property name
 */
export function createTokenName(category: string, name: string, variant?: string): string {
  const parts = [category, name];
  if (variant) {
    parts.push(variant);
  }
  return `--${parts.join('-')}`;
}

/**
 * Batch token operations
 */
export class TokenBatch {
  private operations: Array<{ property: string; value: string }> = [];

  add(property: string, value: string): this {
    this.operations.push({ property, value });
    return this;
  }

  addColorToken<Category extends ColorTokenCategory, Step extends ColorScaleStep>(
    category: Category, 
    step: Step, 
    value: string
  ): this {
    return this.add(`--color-${category}-${step}`, value);
  }

  addSpacingToken<Step extends SpacingScaleStep>(step: Step, value: string): this {
    return this.add(`--spacing-${step}`, value);
  }

  apply(): void {
    if (typeof window === 'undefined') return;
    
    this.operations.forEach(({ property, value }) => {
      document.documentElement.style.setProperty(property, value);
    });
  }

  clear(): void {
    this.operations = [];
  }

  getOperations(): Array<{ property: string; value: string }> {
    return [...this.operations];
  }
}

/**
 * Create a new token batch for bulk operations
 */
export function createTokenBatch(): TokenBatch {
  return new TokenBatch();
}

// Export commonly used token combinations
export const commonTokens = {
  // Primary button tokens
  primaryButton: {
    background: getColorToken('primary', 500),
    backgroundHover: getColorToken('primary', 600),
    backgroundActive: getColorToken('primary', 700),
    text: getSemanticToken('text'),
    border: getColorToken('primary', 500),
    borderRadius: getBorderRadiusToken('base'),
    shadow: getShadowToken('sm'),
    transition: getTransitionToken('base'),
  },
  
  // Card tokens
  card: {
    background: getSemanticToken('surface'),
    border: getSemanticToken('border'),
    borderRadius: getBorderRadiusToken('lg'),
    shadow: getShadowToken('base'),
    padding: getSpacingToken(6),
  },
  
  // Input tokens
  input: {
    background: getSemanticToken('surface'),
    border: getSemanticToken('border'),
    borderFocus: getColorToken('primary', 500),
    borderRadius: getBorderRadiusToken('base'),
    padding: getSpacingToken(3),
    fontSize: getFontSizeToken('base'),
    transition: getTransitionToken('fast'),
  },
} as const;