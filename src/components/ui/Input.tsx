import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import type { InputVariant, InputSize } from '../../types/design-tokens';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  required = false,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  const actualVariant = hasError ? 'error' : variant;

  const baseStyles = [
    'block border rounded-[var(--radius-lg)]',
    'transition-all var(--transition-base)',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'focus:ring-offset-[var(--color-surface)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'placeholder:text-[var(--color-text-tertiary)]'
  ].join(' ');

  const variants = {
    default: [
      'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]',
      'hover:border-[var(--color-border-secondary)]',
      'focus:border-[var(--color-primary-500)] focus:ring-[var(--color-focus-ring)]'
    ].join(' '),
    error: [
      'border-[var(--color-danger-300)] bg-[var(--color-surface)] text-[var(--color-text-primary)]',
      'hover:border-[var(--color-danger-400)]',
      'focus:border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]'
    ].join(' '),
    success: [
      'border-[var(--color-success-300)] bg-[var(--color-surface)] text-[var(--color-text-primary)]',
      'hover:border-[var(--color-success-400)]',
      'focus:border-[var(--color-success-500)] focus:ring-[var(--color-success-500)]'
    ].join(' ')
  };

  const sizes = {
    sm: 'px-[var(--spacing-3)] py-[var(--spacing-1-5)] text-[var(--font-size-sm)] min-h-[2rem]',
    md: 'px-[var(--spacing-3)] py-[var(--spacing-2)] text-[var(--font-size-sm)] min-h-[2.5rem]',
    lg: 'px-[var(--spacing-4)] py-[var(--spacing-3)] text-[var(--font-size-base)] min-h-[3rem]'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const containerStyles = fullWidth ? 'w-full' : '';

  return (
    <div className={containerStyles}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-[var(--font-size-sm)] font-medium text-[var(--color-text-primary)] mb-[var(--spacing-1)]"
        >
          {label}
          {required && (
            <span className="text-[var(--color-danger-500)] ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-[var(--spacing-3)] flex items-center pointer-events-none">
            <span className={cn('text-[var(--color-text-tertiary)]', iconSizes[size])}>
              {leftIcon}
            </span>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={cn(
            baseStyles,
            variants[actualVariant],
            sizes[size],
            leftIcon ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            fullWidth ? 'w-full' : '',
            className
          )}
          aria-invalid={hasError}
          aria-required={required}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : 
            undefined
          }
          required={required}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-[var(--spacing-3)] flex items-center pointer-events-none">
            <span className={cn('text-[var(--color-text-tertiary)]', iconSizes[size])}>
              {rightIcon}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p 
          id={`${inputId}-error`}
          className="mt-[var(--spacing-1)] text-[var(--font-size-sm)] text-[var(--color-danger-600)] dark:text-[var(--color-danger-400)]"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={`${inputId}-helper`}
          className="mt-[var(--spacing-1)] text-[var(--font-size-sm)] text-[var(--color-text-secondary)]"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
export { Input };