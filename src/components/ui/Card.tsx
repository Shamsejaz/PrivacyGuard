import React from 'react';
import { cn } from '../../utils/cn';
import type { CardVariant, CardPadding } from '../../types/design-tokens';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  variant = 'default',
  padding = 'md',
  interactive = false,
  onClick,
  ariaLabel,
  ariaDescribedBy,
  role
}) => {
  const baseStyles = [
    'rounded-[var(--radius-xl)]',
    'transition-all var(--transition-base)',
    interactive || onClick ? 'cursor-pointer' : ''
  ].join(' ');

  const variants = {
    default: [
      'bg-[var(--color-surface)] border border-[var(--color-border)]',
      'shadow-[var(--shadow-sm)]',
      interactive || onClick ? 'hover:shadow-[var(--shadow-md)]' : '',
      interactive || onClick ? 'active:shadow-[var(--shadow-sm)]' : ''
    ].join(' '),
    elevated: [
      'bg-[var(--color-surface)]',
      'shadow-[var(--shadow-md)]',
      interactive || onClick ? 'hover:shadow-[var(--shadow-lg)]' : '',
      interactive || onClick ? 'active:shadow-[var(--shadow-md)]' : ''
    ].join(' '),
    outlined: [
      'bg-[var(--color-surface)] border-2 border-[var(--color-border-secondary)]',
      interactive || onClick ? 'hover:border-[var(--color-primary-300)]' : '',
      interactive || onClick ? 'active:border-[var(--color-primary-400)]' : ''
    ].join(' ')
  };

  const paddingClasses = {
    sm: 'p-[var(--spacing-4)]',
    md: 'p-[var(--spacing-6)]',
    lg: 'p-[var(--spacing-8)]'
  };

  const interactiveStyles = interactive || onClick ? [
    'hover:scale-[1.02] active:scale-[0.98]',
    'focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]',
    'focus:ring-offset-2 focus:ring-offset-[var(--color-surface)]'
  ].join(' ') : '';

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        baseStyles,
        variants[variant],
        paddingClasses[padding],
        interactiveStyles,
        className
      )}
      onClick={onClick}
      role={role || (onClick ? 'button' : undefined)}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </Component>
  );
};

export default Card;
export { Card };