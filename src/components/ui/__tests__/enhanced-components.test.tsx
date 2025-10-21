import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from '../Button';
import Card from '../Card';
import Badge from '../Badge';
import ProgressBar from '../ProgressBar';
import Input from '../Input';
import Select from '../Select';

// Mock the cn utility
vi.mock('../../utils/cn', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' ')
}));

describe('Enhanced UI Components', () => {
  describe('Button', () => {
    it('renders with design tokens and accessibility attributes', () => {
      render(
        <Button ariaLabel="Test button" variant="primary">
          Click me
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Test button');
      expect(button).toHaveAttribute('role', 'button');
    });

    it('shows loading state with proper accessibility', () => {
      render(
        <Button loading>
          Loading
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-label', 'Loading...');
    });
  });

  describe('Card', () => {
    it('renders with accessibility attributes when interactive', () => {
      const handleClick = vi.fn();
      render(
        <Card interactive onClick={handleClick} ariaLabel="Interactive card">
          Card content
        </Card>
      );
      
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label', 'Interactive card');
    });
  });

  describe('Badge', () => {
    it('renders with proper role and aria-label', () => {
      render(
        <Badge variant="success" ariaLabel="Success status">
          Success
        </Badge>
      );
      
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', 'Success status');
    });
  });

  describe('ProgressBar', () => {
    it('renders with proper progressbar role and attributes', () => {
      render(
        <ProgressBar 
          value={75} 
          ariaLabel="Loading progress"
          showLabel
        />
      );
      
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      expect(progressbar).toHaveAttribute('aria-label', 'Loading progress');
    });
  });

  describe('Input', () => {
    it('renders with proper accessibility attributes', () => {
      render(
        <Input 
          label="Email"
          required
          error="Invalid email"
        />
      );
      
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Email');
      const errorMessage = screen.getByRole('alert');
      
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(label).toBeInTheDocument();
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Select', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ];

    it('renders with proper accessibility attributes', () => {
      render(
        <Select 
          label="Choose option"
          options={options}
          required
        />
      );
      
      const select = screen.getByRole('combobox');
      const label = screen.getByText('Choose option');
      
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('aria-required', 'true');
      expect(label).toBeInTheDocument();
    });
  });
});