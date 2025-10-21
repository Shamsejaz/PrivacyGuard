import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Search, User, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';
import { TenantSwitcher } from '../tenant/TenantSwitcher';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-surface border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search compliance data..."
              className="pl-10 pr-4 py-2 w-96 border border-border rounded-lg bg-surface text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-text-tertiary hover:text-text-secondary transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-danger-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </button>
          
          <TenantSwitcher />
          
          <ThemeToggle variant="icon" size="md" />
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary">{user?.name}</p>
              <p className="text-xs text-text-tertiary">{user?.department}</p>
            </div>
            <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-primary-600" />
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-text-tertiary hover:text-text-secondary"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;