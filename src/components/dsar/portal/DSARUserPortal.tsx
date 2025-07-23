import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, FileText, Search, Shield, Users, Globe } from 'lucide-react';
import DSARPortalHeader from './DSARPortalHeader';
import RequestTypeSelector from './RequestTypeSelector';
import RequestForm from './RequestForm';
import RequestTracker from './RequestTracker';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

type PortalStep = 'home' | 'new-request' | 'request-form' | 'confirmation' | 'track-requests';
type Language = 'en' | 'ar';

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const translations: Translations = {
  // Header
  privacyPortal: { en: 'Privacy Portal', ar: 'بوابة الخصوصية' },
  manageDataRights: { en: 'Manage Your Data Rights', ar: 'إدارة حقوق البيانات الخاصة بك' },
  
  // Hero Section
  yourPrivacyRights: { en: 'Your Privacy Rights Portal', ar: 'بوابة حقوق الخصوصية الخاصة بك' },
  heroDescription: { 
    en: 'Exercise your data protection rights with ease. Submit requests, track progress, and manage your personal information in compliance with GDPR, CCPA, and other privacy regulations.',
    ar: 'مارس حقوق حماية البيانات الخاصة بك بسهولة. قدم الطلبات، وتتبع التقدم، وأدر معلوماتك الشخصية وفقاً للائحة العامة لحماية البيانات (GDPR) وقانون خصوصية المستهلك في كاليفورنيا (CCPA) ولوائح الخصوصية الأخرى.'
  },
  submitNewRequest: { en: 'Submit New Request', ar: 'تقديم طلب جديد' },
  trackExistingRequests: { en: 'Track Existing Requests', ar: 'تتبع الطلبات الموجودة' },
  
  // Quick Actions
  submitRequest: { en: 'Submit Request', ar: 'تقديم طلب' },
  submitRequestDesc: { en: 'Access, delete, correct, or download your personal data', ar: 'الوصول إلى بياناتك الشخصية أو حذفها أو تصحيحها أو تنزيلها' },
  trackProgress: { en: 'Track Progress', ar: 'تتبع التقدم' },
  trackProgressDesc: { en: 'Monitor the status of your submitted requests', ar: 'راقب حالة الطلبات المقدمة' },
  getSupport: { en: 'Get Support', ar: 'الحصول على الدعم' },
  getSupportDesc: { en: 'Contact our privacy team for assistance', ar: 'اتصل بفريق الخصوصية للحصول على المساعدة' },
  
  // Your Rights Section
  yourRights: { en: 'Your Rights', ar: 'حقوقك' },
  rightToAccess: { en: 'Right to Access', ar: 'الحق في الوصول' },
  rightToAccessDesc: { en: 'Get a copy of your personal data', ar: 'احصل على نسخة من بياناتك الشخصية' },
  rightToDeletion: { en: 'Right to Deletion', ar: 'الحق في الحذف' },
  rightToDeletionDesc: { en: 'Request removal of your data', ar: 'طلب إزالة بياناتك' },
  rightToPortability: { en: 'Right to Portability', ar: 'الحق في النقل' },
  rightToPortabilityDesc: { en: 'Download your data in a portable format', ar: 'تنزيل بياناتك بتنسيق قابل للنقل' },
  rightToRectification: { en: 'Right to Rectification', ar: 'الحق في التصحيح' },
  rightToRectificationDesc: { en: 'Correct inaccurate information', ar: 'تصحيح المعلومات غير الدقيقة' },
  
  // How It Works
  howItWorks: { en: 'How It Works', ar: 'كيف يعمل' },
  chooseRequestType: { en: 'Choose Request Type', ar: 'اختر نوع الطلب' },
  chooseRequestTypeDesc: { en: 'Select what you\'d like to do with your data', ar: 'اختر ما تريد فعله ببياناتك' },
  verifyIdentity: { en: 'Verify Identity', ar: 'التحقق من الهوية' },
  verifyIdentityDesc: { en: 'We\'ll verify your identity for security', ar: 'سنتحقق من هويتك للأمان' },
  processRequest: { en: 'Process Request', ar: 'معالجة الطلب' },
  processRequestDesc: { en: 'We\'ll process your request within 30 days', ar: 'سنعالج طلبك خلال 30 يوماً' },
  receiveResponse: { en: 'Receive Response', ar: 'تلقي الرد' },
  receiveResponseDesc: { en: 'Get your data or confirmation of action', ar: 'احصل على بياناتك أو تأكيد الإجراء' },
  
  // Navigation
  backToHome: { en: 'Back to Home', ar: 'العودة إلى الرئيسية' },
  
  // Footer
  privacyResources: { en: 'Privacy Resources', ar: 'موارد الخصوصية' },
  privacyPolicy: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
  cookiePolicy: { en: 'Cookie Policy', ar: 'سياسة ملفات تعريف الارتباط' },
  termsOfService: { en: 'Terms of Service', ar: 'شروط الخدمة' },
  dataProcessingAgreement: { en: 'Data Processing Agreement', ar: 'اتفاقية معالجة البيانات' },
  support: { en: 'Support', ar: 'الدعم' },
  helpCenter: { en: 'Help Center', ar: 'مركز المساعدة' },
  contactPrivacyTeam: { en: 'Contact Privacy Team', ar: 'اتصل بفريق الخصوصية' },
  requestStatus: { en: 'Request Status', ar: 'حالة الطلب' },
  faq: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
  legal: { en: 'Legal', ar: 'قانوني' },
  gdprCompliance: { en: 'GDPR Compliance', ar: 'الامتثال للائحة العامة لحماية البيانات' },
  ccpaRights: { en: 'CCPA Rights', ar: 'حقوق قانون خصوصية المستهلك في كاليفورنيا' },
  hipaaInformation: { en: 'HIPAA Information', ar: 'معلومات قانون نقل التأمين الصحي والمساءلة' },
  regulatoryUpdates: { en: 'Regulatory Updates', ar: 'التحديثات التنظيمية' },
  copyright: { 
    en: '© 2024 PrivacyGuard AI. All rights reserved. | Powered by enterprise privacy compliance technology.',
    ar: '© 2024 PrivacyGuard AI. جميع الحقوق محفوظة. | مدعوم بتقنية الامتثال للخصوصية المؤسسية.'
  },
  
  // Language
  language: { en: 'Language', ar: 'اللغة' },
  english: { en: 'English', ar: 'الإنجليزية' },
  arabic: { en: 'العربية', ar: 'العربية' },
  
  // Contact Info
  phone: { en: '+1-800-PRIVACY', ar: '+1-800-PRIVACY' },
  email: { en: 'privacy@company.com', ar: 'privacy@company.com' }
};

const DSARUserPortal: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<PortalStep>('home');
  const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const isRTL = language === 'ar';

  const handleRequestTypeSelect = (type: string) => {
    setSelectedRequestType(type);
    setCurrentStep('request-form');
  };

  const handleFormSubmit = (formData: any) => {
    // Generate a mock reference number
    const referenceNumber = `DSAR-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setSubmittedRequest({ ...formData, referenceNumber });
    setCurrentStep('confirmation');
  };

  const handleBackToHome = () => {
    setCurrentStep('home');
    setSelectedRequestType(null);
    setSubmittedRequest(null);
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    // Update document direction
    document.documentElement.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLanguage;
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'home':
        return (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className={`text-center bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-8 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('yourPrivacyRights')}</h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-6">
                {t('heroDescription')}
              </p>
              <div className={`flex items-center justify-center space-x-4 ${isRTL ? 'space-x-reverse' : ''}`}>
                <Button onClick={() => setCurrentStep('new-request')}>
                  <FileText className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('submitNewRequest')}
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep('track-requests')}>
                  <Search className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('trackExistingRequests')}
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentStep('new-request')}>
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('submitRequest')}</h3>
                <p className="text-gray-600">{t('submitRequestDesc')}</p>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentStep('track-requests')}>
                <Search className="h-12 w-12 text-teal-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('trackProgress')}</h3>
                <p className="text-gray-600">{t('trackProgressDesc')}</p>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('getSupport')}</h3>
                <p className="text-gray-600">{t('getSupportDesc')}</p>
              </Card>
            </div>

            {/* Information Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('yourRights')}</h3>
                <div className="space-y-3">
                  <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{t('rightToAccess')}</p>
                      <p className="text-sm text-gray-600">{t('rightToAccessDesc')}</p>
                    </div>
                  </div>
                  <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{t('rightToDeletion')}</p>
                      <p className="text-sm text-gray-600">{t('rightToDeletionDesc')}</p>
                    </div>
                  </div>
                  <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{t('rightToPortability')}</p>
                      <p className="text-sm text-gray-600">{t('rightToPortabilityDesc')}</p>
                    </div>
                  </div>
                  <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{t('rightToRectification')}</p>
                      <p className="text-sm text-gray-600">{t('rightToRectificationDesc')}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('howItWorks')}</h3>
                <div className="space-y-4">
                  <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <p className="font-medium text-gray-900">{t('chooseRequestType')}</p>
                      <p className="text-sm text-gray-600">{t('chooseRequestTypeDesc')}</p>
                    </div>
                  </div>
                  <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <p className="font-medium text-gray-900">{t('verifyIdentity')}</p>
                      <p className="text-sm text-gray-600">{t('verifyIdentityDesc')}</p>
                    </div>
                  </div>
                  <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <p className="font-medium text-gray-900">{t('processRequest')}</p>
                      <p className="text-sm text-gray-600">{t('processRequestDesc')}</p>
                    </div>
                  </div>
                  <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
                    <div>
                      <p className="font-medium text-gray-900">{t('receiveResponse')}</p>
                      <p className="text-sm text-gray-600">{t('receiveResponseDesc')}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 'new-request':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Button variant="ghost" onClick={handleBackToHome}>
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                {t('backToHome')}
              </Button>
            </div>
            <RequestTypeSelector
              selectedType={selectedRequestType}
              onSelectType={handleRequestTypeSelect}
              language={language}
            />
          </div>
        );

      case 'request-form':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Button variant="ghost" onClick={() => setCurrentStep('new-request')}>
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                Back to Request Types
              </Button>
            </div>
            <RequestForm
              requestType={selectedRequestType!}
              onSubmit={handleFormSubmit}
              onBack={() => setCurrentStep('new-request')}
              language={language}
            />
          </div>
        );

      case 'confirmation':
        return (
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Submitted Successfully!</h2>
              <p className="text-gray-600 mb-6">
                Your request has been received and is being processed. You'll receive email updates on the progress.
              </p>
              
              <div className="bg-white border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Reference Number</h3>
                <p className="text-lg font-mono text-blue-600">{submittedRequest?.referenceNumber}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Save this reference number to track your request
                </p>
              </div>

              <div className={`flex items-center justify-center space-x-4 ${isRTL ? 'space-x-reverse' : ''}`}>
                <Button onClick={() => setCurrentStep('track-requests')}>
                  Track This Request
                </Button>
                <Button variant="outline" onClick={handleBackToHome}>
                  Submit Another Request
                </Button>
              </div>
            </div>
          </div>
        );

      case 'track-requests':
        return (
          <div>
            <div className="mb-6">
              <Button variant="ghost" onClick={handleBackToHome}>
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                {t('backToHome')}
              </Button>
            </div>
            <RequestTracker language={language} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <DSARPortalHeader language={language} onLanguageChange={handleLanguageChange} />
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">{t('privacyResources')}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">{t('privacyPolicy')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('cookiePolicy')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('termsOfService')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('dataProcessingAgreement')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">{t('support')}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">{t('helpCenter')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('contactPrivacyTeam')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('requestStatus')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('faq')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">{t('legal')}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">{t('gdprCompliance')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('ccpaRights')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('hipaaInformation')}</a></li>
                <li><a href="#" className="hover:text-blue-600">{t('regulatoryUpdates')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            <p>{t('copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DSARUserPortal;