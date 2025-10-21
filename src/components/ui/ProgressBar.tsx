import React from 'react';
import { cn } from '../../utils/cn';
import type { ProgressBarVariant } from '../../types/design-tokens';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  variant?: ProgressBarVariant;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  animated?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max = 100, 
  className, 
  showLabel = false,
  variant = 'default',
  size = 'md',
  label,
  animated = false,
  ariaLabel,
  ariaDescribedBy
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const variants = {
    default: [
      'bg-[var(--color-primary-600)]',
      'dark:bg-[var(--color-primary-500)]'
    ].join(' '),
    success: [
      'bg-[var(--color-success-600)]',
      'dark:bg-[var(--color-success-500)]'
    ].join(' '),
    warning: [
      'bg-[var(--color-warning-600)]',
      'dark:bg-[var(--color-warning-500)]'
    ].join(' '),
    danger: [
      'bg-[var(--color-danger-600)]',
      'dark:bg-[var(--color-danger-500)]'
    ].join(' ')
  };

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const backgroundStyles = [
    'w-full bg-[var(--color-neutral-200)] rounded-[var(--radius-full)] overflow-hidden',
    'dark:bg-[var(--color-neutral-700)]'
  ].join(' ');

  const barStyles = [
    'rounded-[var(--radius-full)]',
    'transition-all var(--transition-slow)',
    variants[variant],
    sizes[size],
    animated ? 'animate-pulse' : ''
  ].join(' ');

  return (
    <div 
      className={cn('w-full', className)} 
      role="progressbar" 
      aria-valuenow={value} 
      aria-valuemin={0} 
      aria-valuemax={max}
      aria-label={ariaLabel || `Progress: ${percentage.toFixed(0)}% complete`}
      aria-describedby={ariaDescribedBy}
    >
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-[var(--spacing-2)]">
          {label && (
            <span className="text-[var(--font-size-sm)] font-medium text-[var(--color-text-primary)]">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-[var(--font-size-sm)] font-medium text-[var(--color-text-secondary)]">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={cn(backgroundStyles, sizes[size])}>
        <div 
          className={barStyles}
          style={{ width: `${percentage}%` }}
          role="presentation"
        />
      </div>
    </div>
  );
};

export default ProgressBar;
export { ProgressBar };