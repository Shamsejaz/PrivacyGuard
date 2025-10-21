import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  AssessmentQuestionnaire, 
  QuestionnaireCategory, 
  AssessmentQuestion 
} from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';

interface DueDiligenceQuestionnaireProps {
  questionnaire?: AssessmentQuestionnaire;
  onQuestionnaireUpdated: (questionnaire: AssessmentQuestionnaire) => void;
  onCancel: () => void;
}

export const DueDiligenceQuestionnaire: React.FC<DueDiligenceQuestionnaireProps> = ({
  questionnaire,
  onQuestionnaireUpdated,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<AssessmentQuestionnaire>>({
    name: '',
    version: '1.0',
    categories: []
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const questionTypes = [
    { value: 'yes_no', label: 'Yes/No' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'text', label: 'Text Response' },
    { value: 'numeric', label: 'Numeric' },
    { value: 'file_upload', label: 'File Upload' }
  ];

  const riskLevels = [
    { value: 'low', label: 'Low Risk' },
    { value: 'medium', label: 'Medium Risk' },
    { value: 'high', label: 'High Risk' },
    { value: 'critical', label: 'Critical Risk' }
  ];

  useEffect(() => {
    if (questionnaire) {
      setFormData(questionnaire);
    }
  }, [questionnaire]);

  const addCategory = () => {
    const newCategory: QuestionnaireCategory = {
      id: `cat_${Date.now()}`,
      name: 'New Category',
      description: '',
      weight: 1,
      questions: []
    };

    setFormData(prev => ({
      ...prev,
      categories: [...(prev.categories || []), newCategory]
    }));
    setEditingCategory(newCategory.id);
  };

  const updateCategory = (categoryId: string, updates: Partial<QuestionnaireCategory>) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories?.map(cat => 
        cat.id === categoryId ? { ...cat, ...updates } : cat
      ) || []
    }));
  };

  const deleteCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories?.filter(cat => cat.id !== categoryId) || []
    }));
  };

  const addQuestion = (categoryId: string) => {
    const newQuestion: AssessmentQuestion = {
      id: `q_${Date.now()}`,
      categoryId,
      question: 'New Question',
      description: '',
      type: 'yes_no',
      required: true,
      weight: 1,
      riskImpact: 'medium'
    };

    setFormData(prev => ({
      ...prev,
      categories: prev.categories?.map(cat => 
        cat.id === categoryId 
          ? { ...cat, questions: [...cat.questions, newQuestion] }
          : cat
      ) || []
    }));
    setEditingQuestion(newQuestion.id);
  };

  const updateQuestion = (categoryId: string, questionId: string, updates: Partial<AssessmentQuestion>) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories?.map(cat => 
        cat.id === categoryId 
          ? {
              ...cat,
              questions: cat.questions.map(q => 
                q.id === questionId ? { ...q, ...updates } : q
              )
            }
          : cat
      ) || []
    }));
  };

  const deleteQuestion = (categoryId: string, questionId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories?.map(cat => 
        cat.id === categoryId 
          ? { ...cat, questions: cat.questions.filter(q => q.id !== questionId) }
          : cat
      ) || []
    }));
  };

  const validateQuestionnaire = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Questionnaire name is required';
    }

    if (!formData.categories || formData.categories.length === 0) {
      newErrors.categories = 'At least one category is required';
    }

    formData.categories?.forEach((category, catIndex) => {
      if (!category.name.trim()) {
        newErrors[`category_${catIndex}_name`] = 'Category name is required';
      }

      if (category.questions.length === 0) {
        newErrors[`category_${catIndex}_questions`] = 'Each category must have at least one question';
      }

      category.questions.forEach((question, qIndex) => {
        if (!question.question.trim()) {
          newErrors[`question_${catIndex}_${qIndex}_text`] = 'Question text is required';
        }

        if (question.type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
          newErrors[`question_${catIndex}_${qIndex}_options`] = 'Multiple choice questions need at least 2 options';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateQuestionnaire()) {
      return;
    }

    setLoading(true);
    try {
      const totalQuestions = formData.categories?.reduce((sum, cat) => sum + cat.questions.length, 0) || 0;
      const maxScore = formData.categories?.reduce((sum, cat) => 
        sum + cat.questions.reduce((catSum, q) => catSum + q.weight, 0), 0
      ) || 0;

      const questionnaireData = {
        ...formData,
        totalQuestions,
        maxScore
      } as AssessmentQuestionnaire;

      let savedQuestionnaire;
      if (questionnaire?.id) {
        // Update existing questionnaire
        savedQuestionnaire = await vendorRiskService.updateQuestionnaire(questionnaire.id, questionnaireData);
      } else {
        // Create new questionnaire
        savedQuestionnaire = await vendorRiskService.createQuestionnaire(questionnaireData);
      }

      onQuestionnaireUpdated(savedQuestionnaire);
    } catch (error) {
      console.error('Failed to save questionnaire:', error);
      setErrors({ submit: 'Failed to save questionnaire. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderQuestionEditor = (category: QuestionnaireCategory, question: AssessmentQuestion, questionIndex: number) => {
    const isEditing = editingQuestion === question.id;

    return (
      <Card key={question.id} className="p-4 ml-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <Input
                    value={question.question}
                    onChange={(e) => updateQuestion(category.id, question.id, { question: e.target.value })}
                    placeholder="Enter question text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={question.description || ''}
                    onChange={(e) => updateQuestion(category.id, question.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Additional context or instructions"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Type
                    </label>
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(category.id, question.id, { type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {questionTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Risk Impact
                    </label>
                    <select
                      value={question.riskImpact}
                      onChange={(e) => updateQuestion(category.id, question.id, { riskImpact: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {riskLevels.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={question.weight}
                      onChange={(e) => updateQuestion(category.id, question.id, { weight: Number(e.target.value) })}
                    />
                  </div>

                  <div className="flex items-center space-x-4 pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(category.id, question.id, { required: e.target.checked })}
                        className="mr-2"
                      />
                      Required
                    </label>
                  </div>
                </div>

                {question.type === 'multiple_choice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Answer Options
                    </label>
                    <div className="space-y-2">
                      {(question.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(question.options || [])];
                              newOptions[optionIndex] = e.target.value;
                              updateQuestion(category.id, question.id, { options: newOptions });
                            }}
                            placeholder={`Option ${optionIndex + 1}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
                              updateQuestion(category.id, question.id, { options: newOptions });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newOptions = [...(question.options || []), ''];
                          updateQuestion(category.id, question.id, { options: newOptions });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h5 className="font-medium text-gray-900 mb-1">
                  {question.question}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </h5>
                {question.description && (
                  <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                )}
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{questionTypes.find(t => t.value === question.type)?.label}</Badge>
                  <Badge 
                    variant={question.riskImpact === 'critical' ? 'destructive' : 
                           question.riskImpact === 'high' ? 'secondary' : 'default'}
                  >
                    {question.riskImpact} risk
                  </Badge>
                  <span className="text-sm text-gray-500">Weight: {question.weight}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingQuestion(null)}
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingQuestion(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingQuestion(question.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteQuestion(category.id, question.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderCategoryEditor = (category: QuestionnaireCategory, categoryIndex: number) => {
    const isEditing = editingCategory === category.id;

    return (
      <Card key={category.id} className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <Input
                    value={category.name}
                    onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={category.description}
                    onChange={(e) => updateCategory(category.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Describe this category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight
                  </label>
                  <Input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={category.weight}
                    onChange={(e) => updateCategory(category.id, { weight: Number(e.target.value) })}
                  />
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{category.questions.length} questions</span>
                  <span>Weight: {category.weight}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCategory(null)}
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCategory(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCategory(category.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteCategory(category.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {category.questions.map((question, questionIndex) => 
            renderQuestionEditor(category, question, questionIndex)
          )}

          <Button
            variant="outline"
            onClick={() => addQuestion(category.id)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {questionnaire ? 'Edit' : 'Create'} Due Diligence Questionnaire
            </h2>
            <p className="text-gray-600">
              Design comprehensive questionnaires for vendor risk assessments
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">
              {formData.categories?.reduce((sum, cat) => sum + cat.questions.length, 0) || 0} total questions
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Questionnaire Name *
            </label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter questionnaire name"
              error={errors.name}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version
            </label>
            <Input
              value={formData.version || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              placeholder="1.0"
            />
          </div>
        </div>
      </Card>

      {/* Categories */}
      <div className="space-y-6">
        {formData.categories?.map((category, categoryIndex) => 
          renderCategoryEditor(category, categoryIndex)
        )}

        <Card className="p-6 border-dashed border-2 border-gray-300">
          <Button
            variant="outline"
            onClick={addCategory}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </Card>
      </div>

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <Card className="p-4 mt-6 bg-red-50 border-red-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
              <ul className="text-sm text-red-600 space-y-1">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card className="p-6 mt-6">
        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {questionnaire ? 'Update' : 'Create'} Questionnaire
          </Button>
        </div>
      </Card>
    </div>
  );
};