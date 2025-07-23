import React from 'react';
import { Eye, Trash2, Download, Edit, StopCircle, XCircle, HelpCircle } from 'lucide-react';
import Card from '../../ui/Card';

type Language = 'en' | 'ar';

interface RequestType {
  id: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: React.ReactNode;
  estimatedTime: { en: string; ar: string };
  examples: { en: string[]; ar: string[] };
  regulations: string[];
}

interface RequestTypeSelectorProps {
  selectedType: string | null;
  onSelectType: (type: string) => void;
  language: Language;
}

const RequestTypeSelector: React.FC<RequestTypeSelectorProps> = ({ selectedType, onSelectType, language }) => {
  const isRTL = language === 'ar';

  const requestTypes: RequestType[] = [
    {
      id: 'access',
      title: { 
        en: 'Access My Data', 
        ar: 'الوصول إلى بياناتي' 
      },
      description: { 
        en: 'Get a copy of all personal information we have about you',
        ar: 'احصل على نسخة من جميع المعلومات الشخصية التي لدينا عنك'
      },
      icon: <Eye className="h-6 w-6 text-blue-600" />,
      estimatedTime: { en: '30 days', ar: '30 يوماً' },
      examples: { 
        en: ['Personal profile information', 'Account activity logs', 'Communication history'],
        ar: ['معلومات الملف الشخصي', 'سجلات نشاط الحساب', 'تاريخ التواصل']
      },
      regulations: ['GDPR Article 15', 'CCPA Section 1798.110']
    },
    {
      id: 'delete',
      title: { 
        en: 'Delete My Data', 
        ar: 'حذف بياناتي' 
      },
      description: { 
        en: 'Request permanent deletion of your personal information',
        ar: 'طلب الحذف الدائم لمعلوماتك الشخصية'
      },
      icon: <Trash2 className="h-6 w-6 text-red-600" />,
      estimatedTime: { en: '30 days', ar: '30 يوماً' },
      examples: { 
        en: ['Account deletion', 'Remove personal information', 'Erase transaction history'],
        ar: ['حذف الحساب', 'إزالة المعلومات الشخصية', 'محو تاريخ المعاملات']
      },
      regulations: ['GDPR Article 17', 'CCPA Section 1798.105']
    },
    {
      id: 'portability',
      title: { 
        en: 'Download My Data', 
        ar: 'تنزيل بياناتي' 
      },
      description: { 
        en: 'Receive your data in a portable, machine-readable format',
        ar: 'تلقي بياناتك بتنسيق قابل للنقل ومقروء آلياً'
      },
      icon: <Download className="h-6 w-6 text-green-600" />,
      estimatedTime: { en: '30 days', ar: '30 يوماً' },
      examples: { 
        en: ['Export account data', 'Download purchase history', 'Get contact information'],
        ar: ['تصدير بيانات الحساب', 'تنزيل تاريخ المشتريات', 'الحصول على معلومات الاتصال']
      },
      regulations: ['GDPR Article 20', 'CCPA Section 1798.100']
    },
    {
      id: 'rectification',
      title: { 
        en: 'Correct My Data', 
        ar: 'تصحيح بياناتي' 
      },
      description: { 
        en: 'Update or correct inaccurate personal information',
        ar: 'تحديث أو تصحيح المعلومات الشخصية غير الدقيقة'
      },
      icon: <Edit className="h-6 w-6 text-yellow-600" />,
      estimatedTime: { en: '30 days', ar: '30 يوماً' },
      examples: { 
        en: ['Update contact information', 'Correct billing address', 'Fix profile details'],
        ar: ['تحديث معلومات الاتصال', 'تصحيح عنوان الفواتير', 'إصلاح تفاصيل الملف الشخصي']
      },
      regulations: ['GDPR Article 16', 'CCPA Section 1798.106']
    },
    {
      id: 'restriction',
      title: { 
        en: 'Restrict Processing', 
        ar: 'تقييد المعالجة' 
      },
      description: { 
        en: 'Limit how we process your personal information',
        ar: 'تحديد كيفية معالجتنا لمعلوماتك الشخصية'
      },
      icon: <StopCircle className="h-6 w-6 text-purple-600" />,
      estimatedTime: { en: '30 days', ar: '30 يوماً' },
      examples: { 
        en: ['Pause marketing emails', 'Stop data analysis', 'Limit data sharing'],
        ar: ['إيقاف رسائل التسويق الإلكترونية', 'إيقاف تحليل البيانات', 'تحديد مشاركة البيانات']
      },
      regulations: ['GDPR Article 18']
    },
    {
      id: 'objection',
      title: { 
        en: 'Object to Processing', 
        ar: 'الاعتراض على المعالجة' 
      },
      description: { 
        en: 'Object to specific uses of your personal information',
        ar: 'الاعتراض على استخدامات محددة لمعلوماتك الشخصية'
      },
      icon: <XCircle className="h-6 w-6 text-orange-600" />,
      estimatedTime: { en: '30 days', ar: '30 يوماً' },
      examples: { 
        en: ['Stop marketing communications', 'Object to profiling', 'Opt out of analytics'],
        ar: ['إيقاف الاتصالات التسويقية', 'الاعتراض على التنميط', 'إلغاء الاشتراك في التحليلات']
      },
      regulations: ['GDPR Article 21', 'CCPA Opt-Out Rights']
    }
  ];

  const translations = {
    chooseRequestType: { en: 'What would you like to do?', ar: 'ماذا تريد أن تفعل؟' },
    chooseDescription: { 
      en: 'Choose the type of request you\'d like to make. We\'ll guide you through the process and keep you updated on the status.',
      ar: 'اختر نوع الطلب الذي تريد تقديمه. سنرشدك خلال العملية ونبقيك على اطلاع بالحالة.'
    },
    estimatedTime: { en: 'Estimated time:', ar: 'الوقت المقدر:' },
    examples: { en: 'Examples:', ar: 'أمثلة:' },
    legalBasis: { en: 'Legal basis:', ar: 'الأساس القانوني:' },
    needHelp: { en: 'Need help choosing?', ar: 'تحتاج مساعدة في الاختيار؟' },
    helpText: { 
      en: 'If you\'re unsure which request type is right for you, contact our privacy team at',
      ar: 'إذا لم تكن متأكداً من نوع الطلب المناسب لك، اتصل بفريق الخصوصية لدينا على'
    },
    or: { en: 'or call', ar: 'أو اتصل على' }
  };

  const t = (key: string): string => {
    return translations[key as keyof typeof translations]?.[language] || key;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('chooseRequestType')}</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('chooseDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {requestTypes.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedType === type.id
                ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50'
                : 'hover:border-gray-300'
            }`}
            onClick={() => onSelectType(type.id)}
          >
            <div className={`flex items-start space-x-3 mb-4 ${isRTL ? 'space-x-reverse' : ''}`}>
              {type.icon}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{type.title[language]}</h3>
                <p className="text-sm text-gray-600">{type.description[language]}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-500">{t('estimatedTime')}</span>
                <span className="font-medium text-gray-900">{type.estimatedTime[language]}</span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('examples')}</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {type.examples[language].slice(0, 2).map((example, index) => (
                    <li key={index} className={`flex items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className={`w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`}></span>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('legalBasis')}</p>
                <div className={`flex flex-wrap gap-1 ${isRTL ? 'justify-end' : ''}`}>
                  {type.regulations.map((regulation, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {regulation}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
          <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">{t('needHelp')}</h4>
            <p className="text-sm text-blue-800">
              {t('helpText')}{' '}
              <a href="mailto:privacy@company.com" className="underline">privacy@company.com</a>{' '}
              {t('or')}{' '}
              <a href="tel:+1-800-PRIVACY" className="underline">+1-800-PRIVACY</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestTypeSelector;