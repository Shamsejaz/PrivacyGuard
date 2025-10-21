import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  ArrowRight, 
  MessageSquare,
  FileSignature,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { 
  DocumentWorkflow, 
  DocumentApproval, 
  WorkflowStep,
  Document,
  ApprovalStatus 
} from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentApprovalWorkflowProps {
  document: Document;
  onApprovalUpdate?: () => void;
}

export const DocumentApprovalWorkflow: React.FC<DocumentApprovalWorkflowProps> = ({
  document,
  onApprovalUpdate
}) => {
  const [workflows, setWorkflows] = useState<DocumentWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DocumentWorkflow | null>(null);
  const [approvals, setApprovals] = useState<DocumentApproval[]>([]);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    loadWorkflows();
    loadApprovals();
  }, [document.id]);

  const loadWorkflows = async () => {
    try {
      const workflowsData = await documentManagementService.getWorkflows();
      const applicableWorkflows = workflowsData.filter(
        w => w.documentType === document.type && w.isActive
      );
      setWorkflows(applicableWorkflows);
      
      // Auto-select workflow if only one applicable
      if (applicableWorkflows.length === 1) {
        setSelectedWorkflow(applicableWorkflows[0]);
      }
    } catch (err) {
      setError('Failed to load workflows');
      console.error('Error loading workflows:', err);
    }
  };

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const approvalsData = await documentManagementService.getDocumentApprovals(document.id);
      setApprovals(approvalsData);
      
      // Determine current workflow step
      if (selectedWorkflow && approvalsData.length > 0) {
        const currentStepIndex = approvalsData.filter(a => a.status === 'approved').length;
        if (currentStepIndex < selectedWorkflow.steps.length) {
          setCurrentStep(selectedWorkflow.steps[currentStepIndex]);
        }
      }
    } catch (err) {
      setError('Failed to load approvals');
      console.error('Error loading approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!selectedWorkflow) return;

    try {
      setSubmitting(true);
      await documentManagementService.submitForApproval(document.id, selectedWorkflow.id);
      await loadApprovals();
      onApprovalUpdate?.();
    } catch (err) {
      setError('Failed to submit for approval');
      console.error('Error submitting for approval:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async () => {
    try {
      setSubmitting(true);
      
      if (approvalAction === 'approve') {
        await documentManagementService.approveDocument(
          document.id,
          document.version.toString(),
          approvalComment
        );
      } else {
        await documentManagementService.rejectDocument(
          document.id,
          document.version.toString(),
          approvalComment
        );
      }
      
      await loadApprovals();
      onApprovalUpdate?.();
      setShowApprovalModal(false);
      setApprovalComment('');
    } catch (err) {
      setError(`Failed to ${approvalAction} document`);
      console.error(`Error ${approvalAction}ing document:`, err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStepStatus = (step: WorkflowStep, stepIndex: number): 'completed' | 'current' | 'pending' => {
    const stepApprovals = approvals.filter(a => 
      a.status === 'approved' && 
      stepIndex < approvals.filter(ap => ap.status === 'approved').length
    );
    
    if (stepApprovals.length >= step.requiredApprovals) {
      return 'completed';
    } else if (stepIndex === approvals.filter(a => a.status === 'approved').length) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const canUserApprove = (step: WorkflowStep): boolean => {
    // This would check if current user has required role
    // For now, return true for demo purposes
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Selection */}
      {document.status === 'draft' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Select Approval Workflow
            </h3>
            
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedWorkflow?.id === workflow.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                      <p className="text-sm text-gray-500">
                        {workflow.steps.length} steps • {workflow.documentType}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {workflow.steps.map((step, index) => (
                        <React.Fragment key={step.id}>
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                          </div>
                          {index < workflow.steps.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedWorkflow && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSubmitForApproval}
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow Progress */}
      {selectedWorkflow && document.status !== 'draft' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              Approval Progress: {selectedWorkflow.name}
            </h3>

            <div className="space-y-6">
              {selectedWorkflow.steps.map((step, stepIndex) => {
                const stepStatus = getStepStatus(step, stepIndex);
                const stepApprovals = approvals.filter(a => 
                  // This would need proper step matching logic
                  true
                );

                return (
                  <div key={step.id} className="relative">
                    {stepIndex < selectedWorkflow.steps.length - 1 && (
                      <div className={`absolute left-4 top-8 w-0.5 h-16 ${
                        stepStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}

                    <div className="flex items-start">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        stepStatus === 'completed' 
                          ? 'bg-green-500 text-white' 
                          : stepStatus === 'current'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {stepStatus === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-medium">{stepIndex + 1}</span>
                        )}
                      </div>

                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{step.name}</h4>
                            <p className="text-sm text-gray-500">
                              {step.type} • Requires {step.requiredApprovals} approval(s)
                            </p>
                            <p className="text-xs text-gray-400">
                              Roles: {step.assignedRoles.join(', ')}
                            </p>
                          </div>

                          {stepStatus === 'current' && canUserApprove(step) && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setApprovalAction('approve');
                                  setShowApprovalModal(true);
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setApprovalAction('reject');
                                  setShowApprovalModal(true);
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Step Approvals */}
                        {stepApprovals.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {stepApprovals.map((approval) => (
                              <div key={approval.id} className="flex items-center text-sm">
                                {getStatusIcon(approval.status)}
                                <span className="ml-2 text-gray-600">
                                  {approval.approverName} ({approval.approverRole})
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  {new Date(approval.timestamp).toLocaleString()}
                                </span>
                                {approval.comment && (
                                  <MessageSquare className="w-4 h-4 ml-2 text-gray-400" />
                                )}
                                {approval.digitalSignature && (
                                  <FileSignature className="w-4 h-4 ml-2 text-blue-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {approvalAction === 'approve' ? 'Approve Document' : 'Reject Document'}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment {approvalAction === 'reject' ? '(Required)' : '(Optional)'}
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder={`Add a comment for this ${approvalAction}...`}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalComment('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproval}
                  disabled={submitting || (approvalAction === 'reject' && !approvalComment.trim())}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                    approvalAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Reject')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};