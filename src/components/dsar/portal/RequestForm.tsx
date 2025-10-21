import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, FileText, Upload, Shield, AlertTriangle } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import { useDSARActions } from '../../../hooks/useDSAR';

type Language = 'en' | 'ar';

interface RequestFormProps {
  requestType: string;
  onSubmit: (formData: any) => void;
  onBack: () => void;
  language: Language;
}

const RequestForm: React.FC<RequestFormProps> = ({ requestType, onSubmit, onBack, language }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    accountNumber: '',
    details: '',
    verificationMethod: 'email',
    attachments: [] as File[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { submitRequest, loading, error } = useDSARActions();

  const isRTL = language === 'ar';

  const translations = {
    requestTypes: {
      access: { en: 'Access My Data', ar: 'الوصول إلى بياناتي' },
      delete: { en: 'Delete My Data', ar: 'حذف بياناتي' },
      portability: { en: 'Download My Data', ar: 'تنزيل بياناتي' },
      rectification: { en: 'Correct My Data', ar: 'تصحيح بياناتي' },
      restriction: { en: 'Restrict Processing', ar: 'تقييد المعالجة' },
      objection: { en: 'Object to Processing', ar: 'الاعتراض على المعالجة' }
    },
    formLabels: {
      personalInfo: { en: 'Personal Information', ar: 'المعلومات الشخصية' },
      firstName: { en: 'First Name *', ar: 'الاسم الأول *' },
      lastName: { en: 'Last Name *', ar: 'اسم العائلة *' },
      email: { en: 'Email Address *', ar: 'عنوان البريد الإلكتروني *' },
      phone: { en: 'Phone Number', ar: 'رقم الهاتف' },
      address: { en: 'Address', ar: 'العنوان' },
      dateOfBirth: { en: 'Date of Birth', ar: 'تاريخ الميلاد' },
      accountNumber: { en: 'Account Number (if applicable)', ar: 'رقم الحساب (إن وجد)' },
      requestDetails: { en: 'Request Details', ar: 'تفاصيل الطلب' },
      detailsLabel: { en: 'Please describe your request in detail *', ar: 'يرجى وصف طلبك بالتفصيل *' },
      identityVerification: { en: 'Identity Verification', ar: 'التحقق من الهوية' },
      verificationMethod: { en: 'Preferred verification method', ar: 'طريقة التحقق المفضلة' },
      emailVerification: { en: 'Email verification (recommended)', ar: 'التحقق عبر البريد الإلكتروني (موصى به)' },
      phoneVerification: { en: 'Phone verification', ar: 'التحقق عبر الهاتف' },
      documentVerification: { en: 'Document verification', ar: 'التحقق عبر الوثائق' },
      supportingDocs: { en: 'Supporting Documents (optional)', ar: 'الوثائق الداعمة (اختيارية)' },
      uploadText: { en: 'Upload documents to help verify your identity or support your request', ar: 'ارفع الوثائق للمساعدة في التحقق من هويتك أو دعم طلبك' },
      chooseFiles: { en: 'Choose Files', ar: 'اختر الملفات' },
      acceptedFormats: { en: 'Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 10MB each)', ar: 'التنسيقات المقبولة: PDF, JPG, PNG, DOC, DOCX (حد أقصى 10 ميجابايت لكل ملف)' },
      remove: { en: 'Remove', ar: 'إزالة' }
    },
    placeholders: {
      firstName: { en: 'Enter your first name', ar: 'أدخل اسمك الأول' },
      lastName: { en: 'Enter your last name', ar: 'أدخل اسم عائلتك' },
      email: { en: 'Enter your email address', ar: 'أدخل عنوان بريدك الإلكتروني' },
      phone: { en: 'Enter your phone number', ar: 'أدخل رقم هاتفك' },
      address: { en: 'Enter your address', ar: 'أدخل عنوانك' },
      accountNumber: { en: 'Enter your account number', ar: 'أدخل رقم حسابك' },
      details: { en: 'Provide specific details about what data you\'re requesting, what you\'d like corrected, or any other relevant information...', ar: 'قدم تفاصيل محددة حول البيانات التي تطلبها، أو ما تريد تصحيحه، أو أي معلومات أخرى ذات صلة...' }
    },
    buttons: {
      back: { en: 'Back', ar: 'رجوع' },
      submit: { en: 'Submit Request', ar: 'تقديم الطلب' }
    },
    importantInfo: {
      title: { en: 'Important Information', ar: 'معلومات مهمة' },
      points: {
        en: [
          '• We will verify your identity before processing your request',
          '• You will receive email updates on the status of your request',
          '• Most requests are completed within 30 days',
          '• You can track your request status using the reference number we provide'
        ],
        ar: [
          '• سنتحقق من هويتك قبل معالجة طلبك',
          '• ستتلقى تحديثات عبر البريد الإلكتروني حول حالة طلبك',
          '• معظم الطلبات تكتمل خلال 30 يوماً',
          '• يمكنك تتبع حالة طلبك باستخدام الرقم المرجعي الذي نوفره'
        ]
      }
    },
    errors: {
      firstNameRequired: { en: 'First name is required', ar: 'الاسم الأول مطلوب' },
      lastNameRequired: { en: 'Last name is required', ar: 'اسم العائلة مطلوب' },
      emailRequired: { en: 'Email is required', ar: 'البريد الإلكتروني مطلوب' },
      emailInvalid: { en: 'Email is invalid', ar: 'البريد الإلكتروني غير صحيح' },
      detailsRequired: { en: 'Please provide details about your request', ar: 'يرجى تقديم تفاصيل حول طلبك' }
    }
  };

  const t = (key: string, subKey?: string): string => {
    if (subKey) {
      return translations[key as keyof typeof translations]?.[subKey as any]?.[language] || `${key}.${subKey}`;
    }
    return translations[key as keyof typeof translations]?.[language] || key;
  };

  const getRequestTypeTitle = (type: string) => {
    return translations.requestTypes[type as keyof typeof translations.requestTypes]?.[language] || type;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = t('errors', 'firstNameRequired');
    if (!formData.lastName.trim()) newErrors.lastName = t('errors', 'lastNameRequired');
    if (!formData.email.trim()) newErrors.email = t('errors', 'emailRequired');
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('errors', 'emailInvalid');
    if (!formData.details.trim()) newErrors.details = t('errors', 'detailsRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const requestData = {
          subjectName: `${formData.firstName} ${formData.lastName}`,
          subjectEmail: formData.email,
          subjectPhone: formData.phone || undefined,
          requestType: requestType as any,
          description: formData.details,
          dataCategories: [], // Could be extracted from form if needed
          processingPurposes: [] // Could be extracted from form if needed
        };
        
        const result = await submitRequest(requestData);
        onSubmit({ ...formData, requestType, ...result });
      } catch (err) {
        // Error is handled by the hook
        console.error('Failed to submit DSAR request:', err);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{getRequestTypeTitle(requestType)}</h2>
        <p className="text-gray-600">
          {language === 'en' 
            ? 'Please provide the following information to process your request. All fields marked with * are required.'
            : 'يرجى تقديم المعلومات التالية لمعالجة طلبك. جميع الحقول المميزة بـ * مطلوبة.'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <User className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('formLabels', 'personalInfo')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'firstName')}
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                } ${isRTL ? 'text-right' : 'text-left'}`}
                placeholder={t('placeholders', 'firstName')}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'lastName')}
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                } ${isRTL ? 'text-right' : 'text-left'}`}
                placeholder={t('placeholders', 'lastName')}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t('placeholders', 'email')}
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('placeholders', 'phone')}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'address')}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                placeholder={t('placeholders', 'address')}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'dateOfBirth')}
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'accountNumber')}
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('placeholders', 'accountNumber')}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <FileText className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('formLabels', 'requestDetails')}
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('formLabels', 'detailsLabel')}
            </label>
            <textarea
              rows={4}
              value={formData.details}
              onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.details ? 'border-red-300' : 'border-gray-300'
              } ${isRTL ? 'text-right' : 'text-left'}`}
              placeholder={t('placeholders', 'details')}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            {errors.details && <p className="text-red-600 text-sm mt-1">{errors.details}</p>}
          </div>
        </Card>

        <Card>
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Shield className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('formLabels', 'identityVerification')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'verificationMethod')}
              </label>
              <div className="space-y-2">
                <label className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="radio"
                    name="verificationMethod"
                    value="email"
                    checked={formData.verificationMethod === 'email'}
                    onChange={(e) => setFormData(prev => ({ ...prev, verificationMethod: e.target.value }))}
                    className={isRTL ? 'ml-2' : 'mr-2'}
                  />
                  <Mail className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('formLabels', 'emailVerification')}
                </label>
                <label className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="radio"
                    name="verificationMethod"
                    value="phone"
                    checked={formData.verificationMethod === 'phone'}
                    onChange={(e) => setFormData(prev => ({ ...prev, verificationMethod: e.target.value }))}
                    className={isRTL ? 'ml-2' : 'mr-2'}
                  />
                  <Phone className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('formLabels', 'phoneVerification')}
                </label>
                <label className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="radio"
                    name="verificationMethod"
                    value="document"
                    checked={formData.verificationMethod === 'document'}
                    onChange={(e) => setFormData(prev => ({ ...prev, verificationMethod: e.target.value }))}
                    className={isRTL ? 'ml-2' : 'mr-2'}
                  />
                  <FileText className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('formLabels', 'documentVerification')}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formLabels', 'supportingDocs')}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    {t('formLabels', 'uploadText')}
                  </p>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {t('formLabels', 'chooseFiles')}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('formLabels', 'acceptedFormats')}
                  </p>
                </div>
              </div>

              {formData.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className={`flex items-center justify-between bg-gray-50 p-2 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        {t('formLabels', 'remove')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">{t('importantInfo', 'title')}</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {translations.importantInfo.points[language].map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="outline" onClick={onBack} disabled={loading}>
            {t('buttons', 'back')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : t('buttons', 'submit')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RequestForm;