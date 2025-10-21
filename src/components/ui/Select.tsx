import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { SelectVariant, SelectSize } from '../../types/design-tokens';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: SelectVariant;
  size?: SelectSize;
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  required?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  variant = 'default',
  size = 'md',
  label,
  error,
  helperText,
  options,
  placeholder,
  fullWidth = false,
  required = false,
  className,
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  const actualVariant = hasError ? 'error' : variant;

  const baseStyles = [
    'block border rounded-[var(--radius-lg)] appearance-none',
    'transition-all var(--transition-base)',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'focus:ring-offset-[var(--color-surface)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'bg-[var(--color-surface)]'
  ].join(' ');

  const variants = {
    default: [
      'border-[var(--color-border)] text-[var(--color-text-primary)]',
      'hover:border-[var(--color-border-secondary)]',
      'focus:border-[var(--color-primary-500)] focus:ring-[var(--color-focus-ring)]'
    ].join(' '),
    error: [
      'border-[var(--color-danger-300)] text-[var(--color-text-primary)]',
      'hover:border-[var(--color-danger-400)]',
      'focus:border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]'
    ].join(' '),
    success: [
      'border-[var(--color-success-300)] text-[var(--color-text-primary)]',
      'hover:border-[var(--color-success-400)]',
      'focus:border-[var(--color-success-500)] focus:ring-[var(--color-success-500)]'
    ].join(' ')
  };

  const sizes = {
    sm: 'px-[var(--spacing-3)] py-[var(--spacing-1-5)] pr-8 text-[var(--font-size-sm)] min-h-[2rem]',
    md: 'px-[var(--spacing-3)] py-[var(--spacing-2)] pr-10 text-[var(--font-size-sm)] min-h-[2.5rem]',
    lg: 'px-[var(--spacing-4)] py-[var(--spacing-3)] pr-12 text-[var(--font-size-base)] min-h-[3rem]'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const iconPositions = {
    sm: 'right-2',
    md: 'right-3',
    lg: 'right-4'
  };

  const containerStyles = fullWidth ? 'w-full' : '';

  return (
    <div className={containerStyles}>
      {label && (
        <label 
          htmlFor={selectId}
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
        <select
          ref={ref}
          id={selectId}
          className={cn(
            baseStyles,
            variants[actualVariant],
            sizes[size],
            fullWidth ? 'w-full' : '',
            className
          )}
          aria-invalid={hasError}
          aria-required={required}
          aria-describedby={
            error ? `${selectId}-error` : 
            helperText ? `${selectId}-helper` : 
            undefined
          }
          required={required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <div className={cn(
          'absolute inset-y-0 flex items-center pointer-events-none',
          iconPositions[size]
        )}>
          <ChevronDown className={cn(
            'text-[var(--color-text-tertiary)]',
            iconSizes[size]
          )} />
        </div>
      </div>
      
      {error && (
        <p 
          id={`${selectId}-error`}
          className="mt-[var(--spacing-1)] text-[var(--font-size-sm)] text-[var(--color-danger-600)] dark:text-[var(--color-danger-400)]"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={`${selectId}-helper`}
          className="mt-[var(--spacing-1)] text-[var(--font-size-sm)] text-[var(--color-text-secondary)]"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;