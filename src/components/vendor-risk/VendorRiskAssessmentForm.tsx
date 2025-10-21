import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  VendorAssessment, 
  AssessmentQuestionnaire, 
  AssessmentResponse, 
  AssessmentQuestion,
  QuestionnaireCategory 
} from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Upload, 
  Save, 
  Send,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface VendorRiskAssessmentFormProps {
  assessment: VendorAssessment;
  questionnaire: AssessmentQuestionnaire;
  onAssessmentUpdated: (assessment: VendorAssessment) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

export const VendorRiskAssessmentForm: React.FC<VendorRiskAssessmentFormProps> = ({
  assessment,
  questionnaire,
  onAssessmentUpdated,
  onCancel,
  readOnly = false
}) => {
  const [responses, setResponses] = useState<Record<string, AssessmentResponse>>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

  const currentCategory = questionnaire.categories[currentCategoryIndex];
  const totalQuestions = questionnaire.categories.reduce((sum, cat) => sum + cat.questions.length, 0);
  const answeredQuestions = Object.keys(responses).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  useEffect(() => {
    // Initialize responses from existing assessment
    const initialResponses: Record<string, AssessmentResponse> = {};
    assessment.responses.forEach(response => {
      initialResponses[response.questionId] = response;
    });
    setResponses(initialResponses);
  }, [assessment]);

  const handleResponseChange = (questionId: string, value: any, question: AssessmentQuestion) => {
    const score = calculateQuestionScore(value, question);
    
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        response: value,
        score,
        respondedAt: new Date(),
        respondedBy: 'current-user' // This should come from auth context
      }
    }));

    // Clear any validation errors
    if (errors[questionId]) {
      setErrors(prev => ({ ...prev, [questionId]: '' }));
    }
  };

  const calculateQuestionScore = (response: any, question: AssessmentQuestion): number => {
    switch (question.type) {
      case 'yes_no':
        // Higher risk questions should have lower scores for "No" answers
        const isHighRisk = question.riskImpact === 'high' || question.riskImpact === 'critical';
        if (response === true) {
          return isHighRisk ? question.weight : question.weight * 0.5;
        } else {
          return isHighRisk ? 0 : question.weight;
        }
      
      case 'multiple_choice':
        // Score based on option index (assuming options are ordered by risk level)
        const optionIndex = question.options?.indexOf(response) || 0;
        const maxOptions = question.options?.length || 1;
        return (optionIndex / (maxOptions - 1)) * question.weight;
      
      case 'numeric':
        // Normalize numeric responses (this would need business logic)
        return Math.min(Number(response) / 100, 1) * question.weight;
      
      default:
        return question.weight * 0.5; // Default score for text responses
    }
  };

  const validateCurrentCategory = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    currentCategory.questions.forEach(question => {
      if (question.required && !responses[question.id]) {
        newErrors[question.id] = 'This question is required';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleNextCategory = () => {
    if (validateCurrentCategory() && currentCategoryIndex < questionnaire.categories.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
    }
  };

  const handlePreviousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const responseArray = Object.values(responses);
      const updatedAssessment = await vendorRiskService.updateAssessment(assessment.id, {
        responses: responseArray,
        status: 'in_progress'
      });
      onAssessmentUpdated(updatedAssessment);
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssessment = async () => {
    // Validate all categories
    let allValid = true;
    questionnaire.categories.forEach((category, index) => {
      setCurrentCategoryIndex(index);
      if (!validateCurrentCategory()) {
        allValid = false;
      }
    });

    if (!allValid) {
      setCurrentCategoryIndex(0); // Go back to first category with errors
      return;
    }

    setLoading(true);
    try {
      const responseArray = Object.values(responses);
      const updatedAssessment = await vendorRiskService.submitAssessmentResponse(
        assessment.id, 
        responseArray
      );
      onAssessmentUpdated(updatedAssessment);
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (questionId: string, files: FileList) => {
    setUploadingFiles(prev => ({ ...prev, [questionId]: true }));
    
    try {
      // This would integrate with your file upload service
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('questionId', questionId);
        formData.append('assessmentId', assessment.id);
        
        // Mock upload - replace with actual upload service
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              id: Math.random().toString(36),
              name: file.name,
              type: file.type,
              size: file.size,
              url: URL.createObjectURL(file),
              uploadedBy: 'current-user',
              uploadedAt: new Date()
            });
          }, 1000);
        });
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      
      // Update response with uploaded files
      const currentResponse = responses[questionId];
      setResponses(prev => ({
        ...prev,
        [questionId]: {
          ...currentResponse,
          evidence: [...(currentResponse?.evidence || []), ...uploadedFiles as any]
        }
      }));
    } catch (error) {
      console.error('Failed to upload files:', error);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const renderQuestion = (question: AssessmentQuestion) => {
    const response = responses[question.id];
    const hasError = errors[question.id];

    return (
      <Card key={question.id} className="p-6 mb-6">
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-lg font-medium text-gray-900 flex-1">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </h4>
            <Badge 
              variant={question.riskImpact === 'critical' ? 'destructive' : 
                     question.riskImpact === 'high' ? 'secondary' : 'default'}
              className="ml-2"
            >
              {question.riskImpact} risk
            </Badge>
          </div>
          {question.description && (
            <p className="text-sm text-gray-600 mb-4">{question.description}</p>
          )}
        </div>

        <div className="space-y-4">
          {question.type === 'yes_no' && (
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value="true"
                  checked={response?.response === true}
                  onChange={() => handleResponseChange(question.id, true, question)}
                  disabled={readOnly}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value="false"
                  checked={response?.response === false}
                  onChange={() => handleResponseChange(question.id, false, question)}
                  disabled={readOnly}
                  className="mr-2"
                />
                No
              </label>
            </div>
          )}

          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              {question.options?.map(option => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={response?.response === option}
                    onChange={() => handleResponseChange(question.id, option, question)}
                    disabled={readOnly}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}

          {question.type === 'text' && (
            <textarea
              value={response?.response as string || ''}
              onChange={(e) => handleResponseChange(question.id, e.target.value, question)}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter your response..."
            />
          )}

          {question.type === 'numeric' && (
            <Input
              type="number"
              value={response?.response as number || ''}
              onChange={(e) => handleResponseChange(question.id, Number(e.target.value), question)}
              disabled={readOnly}
              placeholder="Enter numeric value"
            />
          )}

          {question.type === 'file_upload' && (
            <div>
              <input
                type="file"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(question.id, e.target.files)}
                disabled={readOnly || uploadingFiles[question.id]}
                className="mb-2"
              />
              {uploadingFiles[question.id] && (
                <div className="flex items-center text-sm text-gray-600">
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading files...
                </div>
              )}
              {response?.evidence && response.evidence.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Uploaded files:</p>
                  <div className="space-y-1">
                    {response.evidence.map(file => (
                      <div key={file.id} className="flex items-center text-sm text-gray-600">
                        <FileText className="w-4 h-4 mr-2" />
                        <span>{file.name}</span>
                        <span className="ml-2 text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={response?.comments || ''}
              onChange={(e) => setResponses(prev => ({
                ...prev,
                [question.id]: {
                  ...prev[question.id],
                  comments: e.target.value
                }
              }))}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Add any additional context or comments..."
            />
          </div>
        </div>

        {hasError && (
          <div className="mt-4 flex items-center text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 mr-2" />
            {hasError}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vendor Risk Assessment</h2>
            <p className="text-gray-600">Assessment ID: {assessment.id}</p>
          </div>
          <Badge 
            variant={assessment.status === 'completed' ? 'default' : 'secondary'}
          >
            {assessment.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">{answeredQuestions} of {totalQuestions} questions</span>
          </div>
          <ProgressBar value={progress} className="w-full" />
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
            {answeredQuestions} Completed
          </div>
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1 text-yellow-500" />
            {totalQuestions - answeredQuestions} Remaining
          </div>
        </div>
      </Card>

      {/* Category Navigation */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentCategory.name}
          </h3>
          <div className="flex items-center space-x-2">
            {questionnaire.categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setCurrentCategoryIndex(index)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  index === currentCategoryIndex
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">{currentCategory.description}</p>
      </Card>

      {/* Questions */}
      <div className="space-y-6">
        {currentCategory.questions.map(renderQuestion)}
      </div>

      {/* Navigation and Actions */}
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={handlePreviousCategory}
              disabled={currentCategoryIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={handleNextCategory}
              disabled={currentCategoryIndex === questionnaire.categories.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  loading={loading}
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  onClick={handleSubmitAssessment}
                  loading={loading}
                  disabled={loading || answeredQuestions < totalQuestions}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Assessment
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};