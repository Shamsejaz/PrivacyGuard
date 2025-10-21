import React, { useState } from 'react';
import { Search, Palette, Code } from 'lucide-react';
import { 
  Button, 
  Card, 
  Badge, 
  ProgressBar, 
  Input, 
  Select, 
  ThemeToggle 
} from '../ui';
import { useTheme } from '../../contexts/ThemeContext';
import { tokens } from '../../utils/design-tokens';
import { getColorToken, getSpacingToken, getFontSizeToken } from '../../utils/token-helpers';

const DesignSystemDemo: React.FC = () => {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">
              Design System Demo
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
              Current theme: <Badge variant="info">{theme}</Badge>
            </p>
          </div>
          <ThemeToggle variant="button" showLabel />
        </div>

        {/* Buttons */}
        <Card>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
            Buttons
          </h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" loading>Loading</Button>
              <Button variant="outline" disabled>Disabled</Button>
            </div>
          </div>
        </Card>

        {/* Cards */}
        <Card>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
            Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="default" padding="sm">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Default Card</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                Small padding
              </p>
            </Card>
            <Card variant="elevated" padding="md">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Elevated Card</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                Medium padding
              </p>
            </Card>
            <Card variant="outlined" padding="lg" interactive>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Interactive Card</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                Large padding, clickable
              </p>
            </Card>
          </div>
        </Card>

        {/* Badges */}
        <Card>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
            Badges
          </h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" dot>With Dot</Badge>
              <Badge variant="warning" size="sm">Small</Badge>
              <Badge variant="info" size="md">Medium</Badge>
            </div>
          </div>
        </Card>

        {/* Progress Bars */}
        <Card>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
            Progress Bars
          </h2>
          <div className="space-y-4">
            <ProgressBar value={25} variant="default" showLabel label="Default Progress" />
            <ProgressBar value={50} variant="success" showLabel label="Success Progress" />
            <ProgressBar value={75} variant="warning" showLabel label="Warning Progress" />
            <ProgressBar value={90} variant="danger" showLabel label="Danger Progress" />
            <ProgressBar value={60} variant="default" size="lg" animated label="Large Animated" />
          </div>
        </Card>

        {/* Form Elements */}
        <Card>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
            Form Elements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Default Input"
                placeholder="Enter text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="This is helper text"
                fullWidth
              />
              <Input
                label="Input with Icon"
                placeholder="Search..."
                leftIcon={<Search />}
                fullWidth
              />
              <Input
                label="Error State"
                placeholder="Invalid input"
                error="This field is required"
                variant="error"
                fullWidth
              />
            </div>
            <div className="space-y-4">
              <Select
                label="Default Select"
                options={selectOptions}
                placeholder="Choose an option"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                helperText="Select one option"
                fullWidth
              />
              <Select
                label="Success State"
                options={selectOptions}
                variant="success"
                value="option1"
                fullWidth
              />
              <Select
                label="Error State"
                options={selectOptions}
                variant="error"
                error="Please select a valid option"
                fullWidth
              />
            </div>
          </div>
        </Card>

        {/* Design Tokens Showcase */}
        <Card>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4 flex items-center gap-2">
            <Palette className="w-6 h-6" />
            Design Tokens
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Color Tokens */}
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-3">
                Color Palette
              </h3>
              <div className="space-y-2">
                {(['primary', 'secondary', 'success', 'warning', 'danger'] as const).map((color) => (
                  <div key={color} className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded border border-neutral-200 dark:border-neutral-700"
                      style={{ backgroundColor: getColorToken(color, 500) }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 capitalize">
                        {color}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        {getColorToken(color, 500)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spacing Tokens */}
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-3">
                Spacing Scale
              </h3>
              <div className="space-y-2">
                {([1, 2, 4, 8, 16] as const).map((space) => (
                  <div key={space} className="flex items-center gap-3">
                    <div 
                      className="bg-primary-500 rounded"
                      style={{ 
                        width: getSpacingToken(space),
                        height: getSpacingToken(2)
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        Spacing {space}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        {getSpacingToken(space)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography Tokens */}
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-3">
                Typography Scale
              </h3>
              <div className="space-y-2">
                {(['xs', 'sm', 'base', 'lg', 'xl'] as const).map((size) => (
                  <div key={size} className="flex items-center gap-3">
                    <div 
                      className="text-neutral-900 dark:text-neutral-50 font-medium"
                      style={{ fontSize: getFontSizeToken(size) }}
                    >
                      Aa
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 capitalize">
                        {size}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        {getFontSizeToken(size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Token Usage Example */}
          <div className="mt-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2 flex items-center gap-2">
              <Code className="w-4 h-4" />
              Usage Example
            </h4>
            <pre className="text-xs text-neutral-600 dark:text-neutral-400 font-mono overflow-x-auto">
{`// Type-safe token access
import { getColorToken, getSpacingToken } from '@/utils/token-helpers';

const buttonStyle = {
  backgroundColor: getColorToken('primary', 500),
  padding: getSpacingToken(4),
  borderRadius: 'var(--radius-base)',
};

// Direct CSS custom property usage
.my-component {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  margin: var(--spacing-4);
}`}
            </pre>
          </div>
        </Card>

        {/* Theme Toggle Variants */}
        <Card>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
            Theme Toggles
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
            <ThemeToggle variant="icon" size="sm" />
            <ThemeToggle variant="icon" size="md" />
            <ThemeToggle variant="icon" size="lg" />
            <ThemeToggle variant="button" showLabel />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DesignSystemDemo;