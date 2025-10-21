import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Search, Mail, AlertCircle, CheckCircle } from 'lucide-react';

const EnhancedComponentsDemo: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleButtonClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Simple validation demo
    if (value.length > 0 && value.length < 3) {
      setInputError('Must be at least 3 characters');
    } else {
      setInputError('');
    }
  };

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
    { value: 'option4', label: 'Option 4' },
  ];

  return (
    <div className="p-8 space-y-8 bg-[var(--color-background)] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-8">
          Enhanced UI Components Demo
        </h1>

        {/* Button Variants */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Enhanced Buttons with Design Tokens & Accessibility
          </h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="primary" 
                onClick={handleButtonClick}
                loading={loading}
                ariaLabel="Primary action button"
              >
                Primary Button
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
            </div>
          </div>
        </Card>

        {/* Card Variants */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="default" interactive ariaLabel="Default interactive card">
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">Default Card</h3>
            <p className="text-[var(--color-text-secondary)]">
              Interactive card with hover effects and accessibility support.
            </p>
          </Card>
          
          <Card variant="elevated" padding="lg">
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">Elevated Card</h3>
            <p className="text-[var(--color-text-secondary)]">
              Card with elevated shadow using design tokens.
            </p>
          </Card>
          
          <Card 
            variant="outlined" 
            onClick={() => alert('Card clicked!')}
            ariaLabel="Clickable outlined card"
          >
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">Outlined Card</h3>
            <p className="text-[var(--color-text-secondary)]">
              Clickable card with keyboard navigation support.
            </p>
          </Card>
        </div>

        {/* Badge Variants */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Enhanced Badges with Theme Support
          </h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Badge variant="default" ariaLabel="Default status badge">Default</Badge>
              <Badge variant="success" ariaLabel="Success status badge">Success</Badge>
              <Badge variant="warning" ariaLabel="Warning status badge">Warning</Badge>
              <Badge variant="danger" ariaLabel="Error status badge">Error</Badge>
              <Badge variant="info" ariaLabel="Information badge">Info</Badge>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Badge variant="success" dot ariaLabel="Success with indicator">With Dot</Badge>
              <Badge variant="warning" size="sm" ariaLabel="Small warning badge">Small</Badge>
              <Badge variant="danger" size="md" ariaLabel="Medium error badge">Medium</Badge>
            </div>
          </div>
        </Card>

        {/* Progress Bar Variants */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Enhanced Progress Bars with Accessibility
          </h2>
          <div className="space-y-6">
            <ProgressBar 
              value={75} 
              variant="default" 
              showLabel 
              label="Overall Progress"
              ariaLabel="Overall completion progress"
            />
            <ProgressBar 
              value={60} 
              variant="success" 
              showLabel 
              label="Success Progress"
              size="lg"
            />
            <ProgressBar 
              value={40} 
              variant="warning" 
              showLabel 
              label="Warning Progress"
            />
            <ProgressBar 
              value={25} 
              variant="danger" 
              showLabel 
              label="Error Progress"
              animated
            />
          </div>
        </Card>

        {/* Form Components */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Enhanced Form Components with Validation States
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                leftIcon={<Mail />}
                value={inputValue}
                onChange={handleInputChange}
                error={inputError}
                helperText={!inputError ? "We'll never share your email" : undefined}
                required
                fullWidth
              />
              
              <Input
                label="Search"
                type="text"
                placeholder="Search..."
                leftIcon={<Search />}
                variant="default"
                size="md"
                fullWidth
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Success State"
                type="text"
                placeholder="Valid input"
                rightIcon={<CheckCircle />}
                variant="success"
                helperText="This field is valid"
                fullWidth
              />
              
              <Input
                label="Error State"
                type="text"
                placeholder="Invalid input"
                rightIcon={<AlertCircle />}
                variant="error"
                error="This field has an error"
                fullWidth
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select
                label="Select Option"
                options={selectOptions}
                placeholder="Choose an option"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                required
                fullWidth
              />
              
              <Select
                label="Success Select"
                options={selectOptions}
                variant="success"
                helperText="Valid selection"
                fullWidth
              />
              
              <Select
                label="Error Select"
                options={selectOptions}
                variant="error"
                error="Please select a valid option"
                fullWidth
              />
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Input size="sm" placeholder="Small input" />
              <Input size="md" placeholder="Medium input" />
              <Input size="lg" placeholder="Large input" />
            </div>
          </div>
        </Card>

        {/* Accessibility Features Demo */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Accessibility Features
          </h2>
          <div className="space-y-4">
            <p className="text-[var(--color-text-secondary)]">
              All components now include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[var(--color-text-secondary)]">
              <li>Proper ARIA labels and roles</li>
              <li>Keyboard navigation support</li>
              <li>Focus management and indicators</li>
              <li>Screen reader announcements</li>
              <li>Required field indicators</li>
              <li>Error state announcements</li>
              <li>Design token integration for consistent theming</li>
            </ul>
            
            <div className="mt-6 p-4 bg-[var(--color-background-secondary)] rounded-lg">
              <p className="text-sm text-[var(--color-text-secondary)]">
                <strong>Try this:</strong> Use Tab to navigate through interactive elements, 
                Enter/Space to activate buttons and cards, and notice the focus indicators 
                and screen reader announcements.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedComponentsDemo;