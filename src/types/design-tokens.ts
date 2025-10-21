// Design Token Type Definitions

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

export type ColorPalette = {
  primary: ColorScale;
  secondary: ColorScale;
  neutral: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  danger: ColorScale;
  info: ColorScale;
};

export type SemanticColors = {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  borderSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  focusRing: string;
};

export type FontSizes = {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
};

export type FontWeights = {
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
};

export type LineHeights = {
  tight: number;
  snug: number;
  normal: number;
  relaxed: number;
  loose: number;
};

export type Spacing = {
  0: string;
  px: string;
  0.5: string;
  1: string;
  1.5: string;
  2: string;
  2.5: string;
  3: string;
  3.5: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
};

export type BorderRadius = {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
};

export type Shadows = {
  xs: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
};

export type ZIndex = {
  dropdown: number;
  sticky: number;
  fixed: number;
  modalBackdrop: number;
  modal: number;
  popover: number;
  tooltip: number;
  toast: number;
};

export type Transitions = {
  fast: string;
  base: string;
  slow: string;
};

export type DesignTokens = {
  colors: ColorPalette;
  semanticColors: SemanticColors;
  fontSizes: FontSizes;
  fontWeights: FontWeights;
  lineHeights: LineHeights;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
  zIndex: ZIndex;
  transitions: Transitions;
};

// Component variant types
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type CardVariant = 'default' | 'elevated' | 'outlined';
export type CardPadding = 'sm' | 'md' | 'lg';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'danger';

export type InputVariant = 'default' | 'error' | 'success';
export type InputSize = 'sm' | 'md' | 'lg';

export type SelectVariant = 'default' | 'error' | 'success';
export type SelectSize = 'sm' | 'md' | 'lg';

// Theme types
export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Token validation types
export interface TokenValidationResult {
  isValid: boolean;
  missingTokens: string[];
}

export interface DetailedValidationResult {
  isValid: boolean;
  results: {
    colors: { valid: boolean; errors: string[] };
    spacing: { valid: boolean; errors: string[] };
    typography: { valid: boolean; errors: string[] };
    shadows: { valid: boolean; errors: string[] };
  };
}

// CSS Custom Property types
export type CSSCustomProperty = `--${string}`;

export type TokenAccessor<T> = {
  readonly [K in keyof T]: T[K] extends Record<string, any> ? TokenAccessor<T[K]> : string;
};

// Design token categories
export type ColorTokenCategory = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type SemanticTokenCategory = 'background' | 'surface' | 'text' | 'border';
export type TypographyTokenCategory = 'fontSize' | 'fontWeight' | 'lineHeight' | 'fontFamily';
export type SpacingTokenCategory = 'spacing' | 'borderRadius';
export type EffectTokenCategory = 'shadow' | 'transition';

// Token scale types
export type ColorScaleStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export type SpacingScaleStep = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 16 | 20 | 24 | 28 | 32;
export type FontSizeScaleStep = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
export type ShadowScaleStep = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';

// Utility types for token access
export type GetColorToken<Category extends ColorTokenCategory, Step extends ColorScaleStep> = 
  `var(--color-${Category}-${Step})`;

export type GetSemanticToken<Category extends SemanticTokenCategory> = 
  `var(--color-${Category})`;

export type GetSpacingToken<Step extends SpacingScaleStep> = 
  `var(--spacing-${Step})`;

export type GetFontSizeToken<Step extends FontSizeScaleStep> = 
  `var(--font-size-${Step})`;

export type GetShadowToken<Step extends ShadowScaleStep> = 
  `var(--shadow-${Step})`;

// Runtime token validation
export interface TokenValidator {
  validateColor(value: string): boolean;
  validateSpacing(value: string): boolean;
  validateFontSize(value: string): boolean;
  validateShadow(value: string): boolean;
}