import React from 'react';
import { Shield, Globe, Phone, Mail } from 'lucide-react';

type Language = 'en' | 'ar';

interface DSARPortalHeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

const translations = {
  privacyPortal: { en: 'Privacy Portal', ar: 'بوابة الخصوصية' },
  manageDataRights: { en: 'Manage Your Data Rights', ar: 'إدارة حقوق البيانات الخاصة بك' },
  language: { en: 'Language', ar: 'اللغة' },
  english: { en: 'English', ar: 'الإنجليزية' },
  arabic: { en: 'العربية', ar: 'العربية' },
  phone: { en: '+1-800-PRIVACY', ar: '+1-800-PRIVACY' },
  email: { en: 'privacy@company.com', ar: 'privacy@company.com' }
};

const DSARPortalHeader: React.FC<DSARPortalHeaderProps> = ({ language, onLanguageChange }) => {
  const t = (key: string): string => {
    return translations[key as keyof typeof translations]?.[language] || key;
  };

  const isRTL = language === 'ar';

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between h-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('privacyPortal')}</h1>
              <p className="text-xs text-gray-500">{t('manageDataRights')}</p>
            </div>
          </div>
          
          <div className={`flex items-center space-x-6 ${isRTL ? 'space-x-reverse' : ''}`}>
            <div className={`flex items-center space-x-4 text-sm text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
              <div className={`flex items-center space-x-1 ${isRTL ? 'space-x-reverse' : ''}`}>
                <Globe className="h-4 w-4" />
                <select 
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as Language)}
                  className="border-none bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="en">{t('english')}</option>
                  <option value="ar">{t('arabic')}</option>
                </select>
              </div>
              <div className={`flex items-center space-x-1 ${isRTL ? 'space-x-reverse' : ''}`}>
                <Phone className="h-4 w-4" />
                <span>{t('phone')}</span>
              </div>
              <div className={`flex items-center space-x-1 ${isRTL ? 'space-x-reverse' : ''}`}>
                <Mail className="h-4 w-4" />
                <span>{t('email')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DSARPortalHeader;