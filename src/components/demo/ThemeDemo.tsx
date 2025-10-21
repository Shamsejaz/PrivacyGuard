import React from 'react';
import { useTheme, useIsDarkMode } from '../../contexts/ThemeContext';
import ThemeToggle from '../ui/ThemeToggle';
import Button from '../ui/Button';
import Card from '../ui/Card';

const ThemeDemo: React.FC = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const isDarkMode = useIsDarkMode();

  return (
    <div className="p-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Theme System Demo</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-text-secondary">Current Theme:</span>
            <span className="font-medium text-text-primary capitalize">{theme}</span>
            <span className="text-text-tertiary">
              ({isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'})
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-text-secondary">Theme Controls:</span>
            <ThemeToggle variant="button" showLabel />
            <ThemeToggle variant="icon" />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleTheme}
            >
              Toggle Theme
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-text-secondary">Set Theme:</span>
            <Button 
              variant={theme === 'light' ? 'primary' : 'outline'} 
              size="sm" 
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button 
              variant={theme === 'dark' ? 'primary' : 'outline'} 
              size="sm" 
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Design System Colors</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-text-secondary">Backgrounds</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-background border border-border rounded"></div>
                <span className="text-sm text-text-tertiary">Background</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-background-secondary border border-border rounded"></div>
                <span className="text-sm text-text-tertiary">Background Secondary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-surface border border-border rounded"></div>
                <span className="text-sm text-text-tertiary">Surface</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-surface-secondary border border-border rounded"></div>
                <span className="text-sm text-text-tertiary">Surface Secondary</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-text-secondary">Text Colors</h4>
            <div className="space-y-1">
              <div className="text-text-primary text-sm">Primary Text</div>
              <div className="text-text-secondary text-sm">Secondary Text</div>
              <div className="text-text-tertiary text-sm">Tertiary Text</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-text-secondary">Borders</h4>
            <div className="space-y-1">
              <div className="w-full h-px bg-border"></div>
              <div className="w-full h-px bg-border-secondary"></div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Component Examples</h3>
        
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Button</Button>
          </div>

          <div className="p-4 bg-surface-secondary rounded-lg border border-border">
            <p className="text-text-primary">
              This is a sample content area that demonstrates how the theme system 
              automatically adapts colors based on the current theme selection.
            </p>
            <p className="text-text-secondary mt-2">
              Secondary text maintains proper contrast ratios in both light and dark modes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ThemeDemo;