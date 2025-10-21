import React from 'react';
import { cn } from '../../utils/cn';
import type { BadgeVariant, BadgeSize } from '../../types/design-tokens';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
  ariaLabel?: string;
}

const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className,
  dot = false,
  ariaLabel
}) => {
  const baseStyles = [
    'inline-flex items-center font-medium',
    'rounded-[var(--radius-full)]',
    'transition-colors var(--transition-base)'
  ].join(' ');
  
  const variants = {
    default: [
      'bg-[var(--color-neutral-100)] text-[var(--color-neutral-800)]',
      'dark:bg-[var(--color-neutral-800)] dark:text-[var(--color-neutral-200)]'
    ].join(' '),
    success: [
      'bg-[var(--color-success-100)] text-[var(--color-success-800)]',
      'dark:bg-[var(--color-success-900)]/30 dark:text-[var(--color-success-400)]'
    ].join(' '),
    warning: [
      'bg-[var(--color-warning-100)] text-[var(--color-warning-800)]',
      'dark:bg-[var(--color-warning-900)]/30 dark:text-[var(--color-warning-400)]'
    ].join(' '),
    danger: [
      'bg-[var(--color-danger-100)] text-[var(--color-danger-800)]',
      'dark:bg-[var(--color-danger-900)]/30 dark:text-[var(--color-danger-400)]'
    ].join(' '),
    info: [
      'bg-[var(--color-info-100)] text-[var(--color-info-800)]',
      'dark:bg-[var(--color-info-900)]/30 dark:text-[var(--color-info-400)]'
    ].join(' ')
  };

  const sizes = {
    sm: 'px-[var(--spacing-2)] py-[var(--spacing-0-5)] text-[var(--font-size-xs)] min-h-[1.25rem]',
    md: 'px-[var(--spacing-2-5)] py-[var(--spacing-1)] text-[var(--font-size-sm)] min-h-[1.5rem]'
  };

  const dotColors = {
    default: 'bg-[var(--color-neutral-400)] dark:bg-[var(--color-neutral-500)]',
    success: 'bg-[var(--color-success-500)]',
    warning: 'bg-[var(--color-warning-500)]',
    danger: 'bg-[var(--color-danger-500)]',
    info: 'bg-[var(--color-info-500)]'
  };

  return (
    <span 
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      role="status"
      aria-label={ariaLabel || `${variant} badge: ${children}`}
    >
      {dot && (
        <span 
          className={cn(
            'w-1.5 h-1.5 rounded-[var(--radius-full)] mr-1.5',
            dotColors[variant]
          )}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
export { Badge };