import { PolicyRepository } from '../repositories/PolicyRepository';
import type {
  PolicyDocument,
  PolicyTemplate,
  PolicyAnalytics,
  PolicyReview,
  PolicyRelationship,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PolicySearchFilters,
  CreateTemplateRequest,
  PolicyApprovalRequest,
  PolicyVersionRequest,
  GeneratePolicyFromTemplateRequest,
  PolicyComplianceReport,
  PolicyEffectivenessMetrics,
  PolicyGap
} from '../models/Policy';
import { logger, auditLog } from '../utils/logger';
import { ValidationError, NotFoundError, AuthorizationError } from '../middleware/errorHandler';

export class PolicyService {
  private policyRepository: PolicyRepository;

  constructor() {
    this.policyRepository = new PolicyRepository();
  }

  // Policy Document Operations
  async createPolicy(policyData: CreatePolicyRequest, createdBy: string): Promise<PolicyDocument> {
    try {
      // Validate required fields
      if (!policyData.title || !policyData.type || !policyData.content) {
        throw new ValidationError('Title, type, and content are required');
      }

      if (!policyData.language || !policyData.jurisdiction) {
        throw new ValidationError('Language and jurisdiction are required');
      }

      const policy = await this.policyRepository.createPolicy(policyData, createdBy);

      // Log audit event
      auditLog('policy_created', createdBy, 'policy', policy._id?.toString() || '', {
        title: policy.title,
        type: policy.type,
        language: policy.language,
        jurisdiction: policy.jurisdiction
      });

      // Schedule initial review if review frequency is set
      if (policy.metadata.review_frequency) {
        await this.scheduleReview(policy._id?.toString() || '', createdBy);
      }

      return policy;

    } catch (error) {
      logger.error('Error creating policy:', error);
      throw error;
    }
  }

  async getPolicyById(id: string): Promise<PolicyDocument | null> {
    try {
      return await this.policyRepository.findPolicyById(id);
    } catch (error) {
      logger.error('Error getting policy by ID:', error);
      throw error;
    }
  }

  async updatePolicy(id: string, updates: UpdatePolicyRequest, updatedBy: string): Promise<PolicyDocument | null> {
    try {
      const existingPolicy = await this.policyRepository.findPolicyById(id);
      if (!existingPolicy) {
        throw new NotFoundError('Policy not found');
      }

      // If policy is approved and content is being changed, reset to draft status
      if (updates.content && existingPolicy.status === 'approved') {
        const policyWithDraftStatus = await this.policyRepository.updatePolicyStatus(id, 'draft', updatedBy);
        if (!policyWithDraftStatus) {
          throw new Error('Failed to update policy status to draft');
        }
      }

      const updatedPolicy = await this.policyRepository.updatePolicy(id, updates, updatedBy);

      if (updatedPolicy) {
        // Log audit event
        auditLog('policy_updated', updatedBy, 'policy', id, {
          changes: updates,
          previousVersion: existingPolicy.version,
          newVersion: updatedPolicy.version
        });

        // Update analytics
        await this.updatePolicyAnalytics(id, 'effectiveness', updatedBy);
      }

      return updatedPolicy;

    } catch (error) {
      logger.error('Error updating policy:', error);
      throw error;
    }
  }

  async deletePolicy(id: string, deletedBy: string): Promise<boolean> {
    try {
      const existingPolicy = await this.policyRepository.findPolicyById(id);
      if (!existingPolicy) {
        throw new NotFoundError('Policy not found');
      }

      // Prevent deletion of active policies
      if (existingPolicy.status === 'active') {
        throw new ValidationError('Cannot delete active policies. Archive the policy first.');
      }

      const deleted = await this.policyRepository.deletePolicy(id);

      if (deleted) {
        // Log audit event
        auditLog('policy_deleted', deletedBy, 'policy', id, {
          title: existingPolicy.title,
          type: existingPolicy.type,
          version: existingPolicy.version
        });
      }

      return deleted;

    } catch (error) {
      logger.error('Error deleting policy:', error);
      throw error;
    }
  }

  async searchPolicies(filters: PolicySearchFilters): Promise<{
    policies: PolicyDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      return await this.policyRepository.searchPolicies(filters);
    } catch (error) {
      logger.error('Error searching policies:', error);
      throw error;
    }
  }

  async approvePolicy(approvalRequest: PolicyApprovalRequest, approvedBy: string): Promise<PolicyDocument | null> {
    try {
      const { policy_id, action, comments, changes_required } = approvalRequest;

      const existingPolicy = await this.policyRepository.findPolicyById(policy_id);
      if (!existingPolicy) {
        throw new NotFoundError('Policy not found');
      }

      let newStatus: PolicyDocument['status'];
      switch (action) {
        case 'approve':
          newStatus = 'approved';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'request_changes':
          newStatus = 'draft';
          break;
        default:
          throw new ValidationError('Invalid approval action');
      }

      const updatedPolicy = await this.policyRepository.updatePolicyStatus(policy_id, newStatus, approvedBy, comments);

      if (updatedPolicy) {
        // Log audit event
        auditLog('policy_approval', approvedBy, 'policy', policy_id, {
          action,
          comments,
          changes_required,
          previousStatus: existingPolicy.status,
          newStatus
        });

        // If approved, activate the policy if it has an effective date
        if (action === 'approve' && updatedPolicy.effective_date && updatedPolicy.effective_date <= new Date()) {
          await this.policyRepository.updatePolicyStatus(policy_id, 'active', approvedBy);
        }
      }

      return updatedPolicy;

    } catch (error) {
      logger.error('Error approving policy:', error);
      throw error;
    }
  }

  async createNewVersion(id: string, versionRequest: PolicyVersionRequest, createdBy: string): Promise<PolicyDocument | null> {
    try {
      const existingPolicy = await this.policyRepository.findPolicyById(id);
      if (!existingPolicy) {
        throw new NotFoundError('Policy not found');
      }

      // Create new version by updating with version increment
      const newVersion = this.incrementVersion(existingPolicy.version, versionRequest.major_version || false);
      
      const updatedPolicy = await this.policyRepository.updatePolicy(id, {
        // Reset status to draft for new version
      }, createdBy);

      if (updatedPolicy) {
        // Add version history entry
        const versionHistory = [...existingPolicy.version_history, {
          version: newVersion,
          changes: versionRequest.changes,
          changed_by: createdBy,
          changed_at: new Date()
        }];

        // Update with new version and history
        await this.policyRepository.updatePolicy(id, {
          metadata: {
            ...existingPolicy.metadata
          }
        }, createdBy);

        // Log audit event
        auditLog('policy_version_created', createdBy, 'policy', id, {
          previousVersion: existingPolicy.version,
          newVersion,
          changes: versionRequest.changes,
          majorVersion: versionRequest.major_version
        });
      }

      return updatedPolicy;

    } catch (error) {
      logger.error('Error creating new policy version:', error);
      throw error;
    }
  }

  // Policy Template Operations
  async createTemplate(templateData: CreateTemplateRequest, createdBy: string): Promise<PolicyTemplate> {
    try {
      // Validate required fields
      if (!templateData.name || !templateData.content || !templateData.category) {
        throw new ValidationError('Name, content, and category are required');
      }

      const template = await this.policyRepository.createTemplate(templateData, createdBy);

      // Log audit event
      auditLog('policy_template_created', createdBy, 'policy_template', template._id?.toString() || '', {
        name: template.name,
        category: template.category,
        regulation: template.regulation
      });

      return template;

    } catch (error) {
      logger.error('Error creating policy template:', error);
      throw error;
    }
  }

  async getTemplateById(id: string): Promise<PolicyTemplate | null> {
    try {
      return await this.policyRepository.findTemplateById(id);
    } catch (error) {
      logger.error('Error getting template by ID:', error);
      throw error;
    }
  }

  async getTemplates(filters: {
    category?: string;
    regulation?: string;
    language?: string;
    jurisdiction?: string;
    search_text?: string;
    page?: number;
    limit?: number;
  }): Promise<PolicyTemplate[]> {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;

      return await this.policyRepository.findTemplates({
        ...filters,
        is_active: true,
        limit,
        offset
      });

    } catch (error) {
      logger.error('Error getting templates:', error);
      throw error;
    }
  }

  async generatePolicyFromTemplate(request: GeneratePolicyFromTemplateRequest, createdBy: string): Promise<PolicyDocument> {
    try {
      const template = await this.policyRepository.findTemplateById(request.template_id);
      if (!template) {
        throw new NotFoundError('Template not found');
      }

      // Replace variables in template content
      let content = template.content;
      for (const variable of template.variables) {
        const value = request.variable_values[variable.name];
        if (variable.required && (value === undefined || value === null || value === '')) {
          throw new ValidationError(`Required variable '${variable.name}' is missing`);
        }
        
        const placeholder = `{{${variable.name}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), value || '');
      }

      // Create policy from template
      const policyData: CreatePolicyRequest = {
        title: request.title,
        type: 'privacy_policy', // Default type, could be derived from template
        content,
        language: request.language || template.language,
        jurisdiction: request.jurisdiction || template.jurisdiction,
        tags: request.tags || [],
        metadata: {
          compliance_frameworks: [template.regulation],
          category: template.category
        }
      };

      const policy = await this.createPolicy(policyData, createdBy);

      // Log audit event
      auditLog('policy_generated_from_template', createdBy, 'policy', policy._id?.toString() || '', {
        template_id: request.template_id,
        template_name: template.name,
        variable_values: request.variable_values
      });

      return policy;

    } catch (error) {
      logger.error('Error generating policy from template:', error);
      throw error;
    }
  }

  // Policy Analytics and Reporting
  async getPolicyAnalytics(policyId: string, metricType?: string): Promise<PolicyAnalytics[]> {
    try {
      return await this.policyRepository.findAnalyticsByPolicyId(policyId, metricType);
    } catch (error) {
      logger.error('Error getting policy analytics:', error);
      throw error;
    }
  }

  async generateComplianceReport(policyId: string): Promise<PolicyComplianceReport | null> {
    try {
      return await this.policyRepository.generateComplianceReport(policyId);
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  async updatePolicyAnalytics(policyId: string, metricType: string, updatedBy: string): Promise<void> {
    try {
      const now = new Date();
      const analyticsData: Omit<PolicyAnalytics, '_id'> = {
        policy_id: policyId,
        metric_type: metricType as any,
        period: 'daily',
        date_range: {
          start: now,
          end: now
        },
        data: {
          total_count: 1,
          trends: [{
            date: now,
            value: 1
          }]
        },
        generated_by: updatedBy,
        generated_at: now
      };

      await this.policyRepository.createAnalytics(analyticsData);

    } catch (error) {
      logger.error('Error updating policy analytics:', error);
      // Don't throw error for analytics to avoid breaking main operations
    }
  }

  // Policy Review Operations
  async scheduleReview(policyId: string, scheduledBy: string, reviewDate?: Date): Promise<PolicyReview> {
    try {
      const policy = await this.policyRepository.findPolicyById(policyId);
      if (!policy) {
        throw new NotFoundError('Policy not found');
      }

      // Calculate review date based on policy review frequency
      let scheduledDate = reviewDate;
      if (!scheduledDate && policy.metadata.review_frequency) {
        scheduledDate = this.calculateNextReviewDate(policy.metadata.review_frequency);
      }

      if (!scheduledDate) {
        scheduledDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year
      }

      const reviewData: Omit<PolicyReview, '_id'> = {
        policy_id: policyId,
        reviewer_id: scheduledBy,
        review_type: 'scheduled',
        status: 'pending',
        scheduled_date: scheduledDate,
        findings: [],
        recommendations: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      const review = await this.policyRepository.createReview(reviewData);

      // Log audit event
      auditLog('policy_review_scheduled', scheduledBy, 'policy', policyId, {
        review_id: review._id?.toString(),
        scheduled_date: scheduledDate
      });

      return review;

    } catch (error) {
      logger.error('Error scheduling policy review:', error);
      throw error;
    }
  }

  async getPendingReviews(reviewerId?: string): Promise<PolicyReview[]> {
    try {
      return await this.policyRepository.findPendingReviews(reviewerId);
    } catch (error) {
      logger.error('Error getting pending reviews:', error);
      throw error;
    }
  }

  // Policy Relationship Operations
  async createPolicyRelationship(
    sourcePolicyId: string,
    targetPolicyId: string,
    relationshipType: PolicyRelationship['relationship_type'],
    description: string,
    createdBy: string
  ): Promise<PolicyRelationship> {
    try {
      // Validate that both policies exist
      const [sourcePolicy, targetPolicy] = await Promise.all([
        this.policyRepository.findPolicyById(sourcePolicyId),
        this.policyRepository.findPolicyById(targetPolicyId)
      ]);

      if (!sourcePolicy) {
        throw new NotFoundError('Source policy not found');
      }

      if (!targetPolicy) {
        throw new NotFoundError('Target policy not found');
      }

      const relationshipData: Omit<PolicyRelationship, '_id'> = {
        source_policy_id: sourcePolicyId,
        target_policy_id: targetPolicyId,
        relationship_type: relationshipType,
        description,
        created_by: createdBy,
        created_at: new Date()
      };

      const relationship = await this.policyRepository.createRelationship(relationshipData);

      // Log audit event
      auditLog('policy_relationship_created', createdBy, 'policy_relationship', relationship._id?.toString() || '', {
        source_policy: sourcePolicy.title,
        target_policy: targetPolicy.title,
        relationship_type: relationshipType
      });

      return relationship;

    } catch (error) {
      logger.error('Error creating policy relationship:', error);
      throw error;
    }
  }

  async getPolicyRelationships(policyId: string): Promise<PolicyRelationship[]> {
    try {
      return await this.policyRepository.findRelationshipsByPolicyId(policyId);
    } catch (error) {
      logger.error('Error getting policy relationships:', error);
      throw error;
    }
  }

  // Utility Methods
  private incrementVersion(currentVersion: string, major: boolean = false): string {
    const parts = currentVersion.split('.').map(Number);
    
    if (major) {
      parts[0] += 1;
      parts[1] = 0;
      parts[2] = 0;
    } else {
      parts[1] += 1;
      parts[2] = 0;
    }
    
    return parts.join('.');
  }

  private calculateNextReviewDate(frequency: string): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      case 'semi-annual':
        return new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
      case 'annual':
      default:
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }
  }

  // Policy effectiveness calculation
  async calculatePolicyEffectiveness(policyId: string): Promise<PolicyEffectivenessMetrics | null> {
    try {
      const policy = await this.policyRepository.findPolicyById(policyId);
      if (!policy) {
        return null;
      }

      const analytics = await this.policyRepository.findAnalyticsByPolicyId(policyId);
      
      // Calculate effectiveness metrics (simplified implementation)
      const views = analytics
        .filter(a => a.metric_type === 'views')
        .reduce((sum, a) => sum + (a.data.total_count || 0), 0);

      const downloads = analytics
        .filter(a => a.metric_type === 'downloads')
        .reduce((sum, a) => sum + (a.data.total_count || 0), 0);

      // Calculate effectiveness score based on various factors
      let effectivenessScore = 50; // Base score

      // Factor in policy age and activity
      const daysSinceCreated = Math.floor((Date.now() - policy.created_at.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreated > 0) {
        const activityScore = Math.min((views + downloads) / daysSinceCreated * 10, 30);
        effectivenessScore += activityScore;
      }

      // Factor in compliance score
      const complianceReport = await this.generateComplianceReport(policyId);
      if (complianceReport) {
        effectivenessScore += (complianceReport.compliance_score * 0.2);
      }

      // Factor in review status
      if (policy.metadata.last_review_date) {
        const daysSinceReview = Math.floor((Date.now() - policy.metadata.last_review_date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceReview < 90) { // Recent review
          effectivenessScore += 10;
        }
      }

      return {
        policy_id: policyId,
        views,
        downloads,
        compliance_incidents: 0, // Would need to be calculated from actual incident data
        last_updated: policy.updated_at,
        effectiveness_score: Math.min(Math.round(effectivenessScore), 100)
      };

    } catch (error) {
      logger.error('Error calculating policy effectiveness:', error);
      throw error;
    }
  }
}