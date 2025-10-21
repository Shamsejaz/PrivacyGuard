import React, { useState } from 'react';
import { Search, Eye, Download, MessageSquare, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import ProgressBar from '../../ui/ProgressBar';
import { useDSARActions } from '../../../hooks/useDSAR';

type Language = 'en' | 'ar';

interface TrackedRequest {
  id: string;
  referenceNumber: string;
  type: string;
  status: 'submitted' | 'verifying' | 'processing' | 'completed' | 'rejected';
  submittedDate: Date;
  lastUpdate: Date;
  estimatedCompletion: Date;
  progress: number;
  updates: Array<{
    date: Date;
    message: { en: string; ar: string };
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
}

interface RequestTrackerProps {
  language: Language;
}

const RequestTracker: React.FC<RequestTrackerProps> = ({ language }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<any>(null);
  const { checkStatus, loading, error } = useDSARActions();

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      try {
        const status = await checkStatus(searchTerm.trim());
        setRequestStatus(status);
      } catch (err) {
        setRequestStatus(null);
      }
    }
  };

  const isRTL = language === 'ar';

  const translations = {
    title: { en: 'Track Your Requests', ar: 'تتبع طلباتك' },
    description: { 
      en: 'Monitor the status of your data subject requests and receive real-time updates on their progress.',
      ar: 'راقب حالة طلبات حقوق البيانات الخاصة بك واحصل على تحديثات فورية حول تقدمها.'
    },
    searchPlaceholder: { en: 'Search by reference number or request type...', ar: 'البحث برقم المرجع أو نوع الطلب...' },
    noRequests: { en: 'No requests found matching your search criteria.', ar: 'لم يتم العثور على طلبات تطابق معايير البحث الخاصة بك.' },
    estimatedTime: { en: 'Est. completion:', ar: 'الإنجاز المقدر:' },
    lastUpdate: { en: 'Last update:', ar: 'آخر تحديث:' },
    submitted: { en: 'Submitted:', ar: 'تم التقديم:' },
    progress: { en: 'Progress', ar: 'التقدم' },
    requestTimeline: { en: 'Request Timeline', ar: 'الجدول الزمني للطلب' },
    needHelp: { en: 'Need Help?', ar: 'تحتاج مساعدة؟' },
    helpDescription: { 
      en: 'If you have questions about your request or need assistance, our privacy team is here to help.',
      ar: 'إذا كان لديك أسئلة حول طلبك أو تحتاج إلى مساعدة، فريق الخصوصية لدينا هنا للمساعدة.'
    },
    liveChat: { en: 'Live Chat', ar: 'دردشة مباشرة' },
    emailSupport: { en: 'Email Support', ar: 'دعم البريد الإلكتروني' },
    callSupport: { en: 'Call +1-800-PRIVACY', ar: 'اتصل على +1-800-PRIVACY' },
    requestTypes: {
      'Data Access Request': { en: 'Data Access Request', ar: 'طلب الوصول إلى البيانات' },
      'Data Deletion Request': { en: 'Data Deletion Request', ar: 'طلب حذف البيانات' },
      'Data Portability Request': { en: 'Data Portability Request', ar: 'طلب نقل البيانات' }
    },
    statuses: {
      submitted: { en: 'Submitted', ar: 'مقدم' },
      verifying: { en: 'Verifying', ar: 'جاري التحقق' },
      processing: { en: 'Processing', ar: 'قيد المعالجة' },
      completed: { en: 'Completed', ar: 'مكتمل' },
      rejected: { en: 'Rejected', ar: 'مرفوض' }
    }
  };

  const t = (key: string, subKey?: string): string => {
    if (subKey) {
      return translations[key as keyof typeof translations]?.[subKey as any]?.[language] || `${key}.${subKey}`;
    }
    return translations[key as keyof typeof translations]?.[language] || key;
  };

  const mockRequests: TrackedRequest[] = [
    {
      id: '1',
      referenceNumber: 'DSAR-2024-001234',
      type: 'Data Access Request',
      status: 'processing',
      submittedDate: new Date('2024-01-15T10:30:00'),
      lastUpdate: new Date('2024-01-18T14:20:00'),
      estimatedCompletion: new Date('2024-02-14T17:00:00'),
      progress: 65,
      updates: [
        {
          date: new Date('2024-01-15T10:30:00'),
          message: { 
            en: 'Your request has been submitted and is being reviewed.',
            ar: 'تم تقديم طلبك وهو قيد المراجعة.'
          },
          type: 'info'
        },
        {
          date: new Date('2024-01-16T09:15:00'),
          message: { 
            en: 'Identity verification completed successfully.',
            ar: 'تم التحقق من الهوية بنجاح.'
          },
          type: 'success'
        },
        {
          date: new Date('2024-01-18T14:20:00'),
          message: { 
            en: 'Data collection in progress. We have found 127 records containing your information.',
            ar: 'جمع البيانات قيد التقدم. لقد وجدنا 127 سجلاً يحتوي على معلوماتك.'
          },
          type: 'info'
        }
      ]
    },
    {
      id: '2',
      referenceNumber: 'DSAR-2024-001189',
      type: 'Data Deletion Request',
      status: 'completed',
      submittedDate: new Date('2024-01-08T16:45:00'),
      lastUpdate: new Date('2024-01-25T11:30:00'),
      estimatedCompletion: new Date('2024-02-07T17:00:00'),
      progress: 100,
      updates: [
        {
          date: new Date('2024-01-08T16:45:00'),
          message: { 
            en: 'Deletion request received and acknowledged.',
            ar: 'تم استلام طلب الحذف والإقرار به.'
          },
          type: 'info'
        },
        {
          date: new Date('2024-01-10T10:20:00'),
          message: { 
            en: 'Identity verification completed.',
            ar: 'تم التحقق من الهوية.'
          },
          type: 'success'
        },
        {
          date: new Date('2024-01-25T11:30:00'),
          message: { 
            en: 'Data deletion completed. All personal information has been permanently removed from our systems.',
            ar: 'تم حذف البيانات. تم حذف جميع المعلومات الشخصية نهائياً من أنظمتنا.'
          },
          type: 'success'
        }
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusText = t('statuses', status);
    switch (status) {
      case 'submitted': return <Badge variant="info">{statusText}</Badge>;
      case 'verifying': return <Badge variant="warning">{statusText}</Badge>;
      case 'processing': return <Badge variant="info">{statusText}</Badge>;
      case 'completed': return <Badge variant="success">{statusText}</Badge>;
      case 'rejected': return <Badge variant="danger">{statusText}</Badge>;
      default: return <Badge variant="default">{statusText}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'verifying': return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'processing': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredRequests = mockRequests.filter(request =>
    request.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('requestTypes', request.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('title')}</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('description')}
        </p>
      </div>

      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !searchTerm.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {requestStatus && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                {getStatusIcon(requestStatus.status)}
                <div className="flex-1">
                  <div className={`flex items-center space-x-2 mb-1 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <h3 className="font-medium text-gray-900">{requestStatus.requestId}</h3>
                    {getStatusBadge(requestStatus.status)}
                  </div>
                  <div className={`flex items-center space-x-4 text-sm text-gray-500 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <span>{t('submitted')} {new Date(requestStatus.submittedAt).toLocaleDateString()}</span>
                    <span>{t('lastUpdate')} {new Date(requestStatus.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                  {getStatusIcon(request.status)}
                  <div className="flex-1">
                    <div className={`flex items-center space-x-2 mb-1 ${isRTL ? 'space-x-reverse' : ''}`}>
                      <h3 className="font-medium text-gray-900">{request.referenceNumber}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{t('requestTypes', request.type)}</p>
                    <div className={`flex items-center space-x-4 text-sm text-gray-500 ${isRTL ? 'space-x-reverse' : ''}`}>
                      <span>{t('submitted')} {request.submittedDate.toLocaleDateString()}</span>
                      <span>{t('lastUpdate')} {request.lastUpdate.toLocaleDateString()}</span>
                      <span>{t('estimatedTime')} {request.estimatedCompletion.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className={`flex items-center space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {request.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      <Download className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      {language === 'en' ? 'Download' : 'تنزيل'}
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <MessageSquare className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    {language === 'en' ? 'Contact' : 'اتصال'}
                  </Button>
                </div>
              </div>

              <div className="mb-4">
                <div className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-medium text-gray-700">{t('progress')}</span>
                  <span className="text-sm text-gray-600">{request.progress}%</span>
                </div>
                <ProgressBar 
                  value={request.progress} 
                  variant={request.progress >= 80 ? 'success' : request.progress >= 50 ? 'info' : 'warning'} 
                />
              </div>

              {selectedRequest === request.id && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('requestTimeline')}</h4>
                  <div className="space-y-3">
                    {request.updates.map((update, index) => (
                      <div key={index} className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                        {getUpdateIcon(update.type)}
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{update.message[language]}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {update.date.toLocaleDateString()} {language === 'en' ? 'at' : 'في'} {update.date.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('noRequests')}</p>
          </div>
        )}
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">{t('needHelp')}</h4>
        <p className="text-sm text-blue-800 mb-3">
          {t('helpDescription')}
        </p>
        <div className={`flex items-center space-x-4 ${isRTL ? 'space-x-reverse' : ''}`}>
          <Button variant="outline" size="sm">
            <MessageSquare className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t('liveChat')}
          </Button>
          <Button variant="outline" size="sm">
            {t('emailSupport')}
          </Button>
          <Button variant="outline" size="sm">
            {t('callSupport')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestTracker;