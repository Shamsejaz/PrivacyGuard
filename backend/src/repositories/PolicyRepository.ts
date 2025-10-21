import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { mongoClient } from '../config/database';
import { logger } from '../utils/logger';
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
  PolicyGap,
  PolicyComplianceReport,
  PolicyEffectivenessMetrics
} from '../models/Policy';

export class PolicyRepository {
  private db: Db;
  private policiesCollection: Collection<PolicyDocument>;
  private templatesCollection: Collection<PolicyTemplate>;
  private analyticsCollection: Collection<PolicyAnalytics>;
  private reviewsCollection: Collection<PolicyReview>;
  private relationshipsCollection: Collection<PolicyRelationship>;

  constructor() {
    this.db = mongoClient.db('privacyguard');
    this.policiesCollection = this.db.collection('policy_documents');
    this.templatesCollection = this.db.collection('policy_templates');
    this.analyticsCollection = this.db.collection('policy_analytics');
    this.reviewsCollection = this.db.collection('policy_reviews');
    this.relationshipsCollection = this.db.collection('policy_relationships');
  }

  // Policy Document Operations
  async createPolicy(policyData: CreatePolicyRequest, createdBy: string): Promise<PolicyDocument> {
    try {
      const now = new Date();
      const policy: Omit<PolicyDocument, '_id'> = {
        title: policyData.title,
        type: policyData.type,
        content: policyData.content,
        version: '1.0.0',
        status: 'draft',
        language: policyData.language,
        jurisdiction: policyData.jurisdiction,
        effective_date: policyData.effective_date,
        expiry_date: policyData.expiry_date,
        created_by: createdBy,
        tags: policyData.tags || [],
        metadata: {
          word_count: this.countWords(policyData.content),
          compliance_frameworks: policyData.metadata?.compliance_frameworks || [],
          category: policyData.metadata?.category,
          priority: policyData.metadata?.priority || 'medium',
          review_frequency: policyData.metadata?.review_frequency || 'annual',
          stakeholders: policyData.metadata?.stakeholders || [],
          related_policies: policyData.metadata?.related_policies || [],
          ...policyData.metadata
        },
        version_history: [{
          version: '1.0.0',
          changes: 'Initial version',
          changed_by: createdBy,
          changed_at: now
        }],
        created_at: now,
        updated_at: now
      };

      const result = await this.policiesCollection.insertOne(policy);
      const createdPolicy = await this.policiesCollection.findOne({ _id: result.insertedId });
      
      if (!createdPolicy) {
        throw new Error('Failed to retrieve created policy');
      }

      logger.info(`Policy created: ${policy.title}`, { policyId: result.insertedId, createdBy });
      return createdPolicy;

    } catch (error) {
      logger.error('Error creating policy:', error);
      throw error;
    }
  }

  async findPolicyById(id: string): Promise<PolicyDocument | null> {
    try {
      const policy = await this.policiesCollection.findOne({ _id: new ObjectId(id) } as any as any);
      return policy;
    } catch (error) {
      logger.error('Error finding policy by ID:', error);
      throw error;
    }
  }

  async updatePolicy(id: string, updates: UpdatePolicyRequest, updatedBy: string): Promise<PolicyDocument | null> {
    try {
      const now = new Date();
      const existingPolicy = await this.findPolicyById(id);
      
      if (!existingPolicy) {
        return null;
      }

      // Calculate new version if content changed
      let newVersion = existingPolicy.version;
      let versionHistory = [...existingPolicy.version_history];
      
      if (updates.content && updates.content !== existingPolicy.content) {
        newVersion = this.incrementVersion(existingPolicy.version, false); // Minor version increment
        versionHistory.push({
          version: newVersion,
          changes: 'Content updated',
          changed_by: updatedBy,
          changed_at: now
        });
      }

      const updateData: any = {
        ...updates,
        version: newVersion,
        version_history: versionHistory,
        updated_at: now
      };

      // Update word count if content changed
      if (updates.content) {
        updateData.metadata = {
          ...existingPolicy.metadata,
          word_count: this.countWords(updates.content),
          ...updates.metadata
        };
      }

      const result = await this.policiesCollection.findOneAndUpdate(
        { _id: new ObjectId(id) } as any,
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (result) {
        logger.info(`Policy updated: ${result.title}`, { policyId: id, updatedBy });
      }

      return result;

    } catch (error) {
      logger.error('Error updating policy:', error);
      throw error;
    }
  }

  async deletePolicy(id: string): Promise<boolean> {
    try {
      const result = await this.policiesCollection.deleteOne({ _id: new ObjectId(id) } as any);
      const deleted = result.deletedCount > 0;
      
      if (deleted) {
        // Also delete related data
        await Promise.all([
          this.analyticsCollection.deleteMany({ policy_id: id }),
          this.reviewsCollection.deleteMany({ policy_id: id }),
          this.relationshipsCollection.deleteMany({ 
            $or: [{ source_policy_id: id }, { target_policy_id: id }] 
          })
        ]);
        
        logger.info(`Policy deleted`, { policyId: id });
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
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.language) {
        query.language = filters.language;
      }

      if (filters.jurisdiction) {
        query.jurisdiction = filters.jurisdiction;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.compliance_frameworks && filters.compliance_frameworks.length > 0) {
        query['metadata.compliance_frameworks'] = { $in: filters.compliance_frameworks };
      }

      if (filters.created_by) {
        query.created_by = filters.created_by;
      }

      if (filters.date_range) {
        query.created_at = {
          $gte: filters.date_range.start,
          $lte: filters.date_range.end
        };
      }

      if (filters.search_text) {
        query.$text = { $search: filters.search_text };
      }

      // Build sort
      const sort: any = {};
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order === 'asc' ? 1 : -1;
      sort[sortBy] = sortOrder;

      // Execute query
      const [policies, total] = await Promise.all([
        this.policiesCollection
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.policiesCollection.countDocuments(query)
      ]);

      return {
        policies,
        total,
        page,
        limit
      };

    } catch (error) {
      logger.error('Error searching policies:', error);
      throw error;
    }
  }

  async updatePolicyStatus(id: string, status: PolicyDocument['status'], updatedBy: string, comments?: string): Promise<PolicyDocument | null> {
    try {
      const now = new Date();
      const updateData: Partial<PolicyDocument> = {
        status,
        updated_at: now
      };

      // If approving, set approval fields
      if (status === 'approved') {
        updateData.approved_by = updatedBy;
        updateData.approval_date = now;
      }

      const result = await this.policiesCollection.findOneAndUpdate(
        { _id: new ObjectId(id) } as any,
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (result) {
        logger.info(`Policy status updated: ${status}`, { policyId: id, updatedBy });
      }

      return result;

    } catch (error) {
      logger.error('Error updating policy status:', error);
      throw error;
    }
  }

  // Policy Template Operations
  async createTemplate(templateData: CreateTemplateRequest, createdBy: string): Promise<PolicyTemplate> {
    try {
      const now = new Date();
      const template: Omit<PolicyTemplate, '_id'> = {
        ...templateData,
        is_active: true,
        created_by: createdBy,
        created_at: now,
        updated_at: now
      };

      const result = await this.templatesCollection.insertOne(template);
      const createdTemplate = await this.templatesCollection.findOne({ _id: result.insertedId });
      
      if (!createdTemplate) {
        throw new Error('Failed to retrieve created template');
      }

      logger.info(`Policy template created: ${template.name}`, { templateId: result.insertedId, createdBy });
      return createdTemplate;

    } catch (error) {
      logger.error('Error creating policy template:', error);
      throw error;
    }
  }

  async findTemplateById(id: string): Promise<PolicyTemplate | null> {
    try {
      const template = await this.templatesCollection.findOne({ _id: new ObjectId(id) } as any);
      return template;
    } catch (error) {
      logger.error('Error finding template by ID:', error);
      throw error;
    }
  }

  async findTemplates(filters: {
    category?: string;
    regulation?: string;
    language?: string;
    jurisdiction?: string;
    is_active?: boolean;
    search_text?: string;
    limit?: number;
    offset?: number;
  }): Promise<PolicyTemplate[]> {
    try {
      const query: any = {};

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.regulation) {
        query.regulation = filters.regulation;
      }

      if (filters.language) {
        query.language = filters.language;
      }

      if (filters.jurisdiction) {
        query.jurisdiction = filters.jurisdiction;
      }

      if (filters.is_active !== undefined) {
        query.is_active = filters.is_active;
      }

      if (filters.search_text) {
        query.$text = { $search: filters.search_text };
      }

      let queryBuilder = this.templatesCollection.find(query).sort({ created_at: -1 });

      if (filters.limit) {
        queryBuilder = queryBuilder.limit(filters.limit);
      }

      if (filters.offset) {
        queryBuilder = queryBuilder.skip(filters.offset);
      }

      return await queryBuilder.toArray();

    } catch (error) {
      logger.error('Error finding templates:', error);
      throw error;
    }
  }

  // Policy Analytics Operations
  async createAnalytics(analyticsData: Omit<PolicyAnalytics, '_id'>): Promise<PolicyAnalytics> {
    try {
      const result = await this.analyticsCollection.insertOne(analyticsData);
      const createdAnalytics = await this.analyticsCollection.findOne({ _id: result.insertedId });
      
      if (!createdAnalytics) {
        throw new Error('Failed to retrieve created analytics');
      }

      return createdAnalytics;

    } catch (error) {
      logger.error('Error creating policy analytics:', error);
      throw error;
    }
  }

  async findAnalyticsByPolicyId(policyId: string, metricType?: string): Promise<PolicyAnalytics[]> {
    try {
      const query: any = { policy_id: policyId };
      
      if (metricType) {
        query.metric_type = metricType;
      }

      return await this.analyticsCollection
        .find(query)
        .sort({ generated_at: -1 })
        .toArray();

    } catch (error) {
      logger.error('Error finding analytics by policy ID:', error);
      throw error;
    }
  }

  // Policy Review Operations
  async createReview(reviewData: Omit<PolicyReview, '_id'>): Promise<PolicyReview> {
    try {
      const result = await this.reviewsCollection.insertOne(reviewData);
      const createdReview = await this.reviewsCollection.findOne({ _id: result.insertedId });
      
      if (!createdReview) {
        throw new Error('Failed to retrieve created review');
      }

      return createdReview;

    } catch (error) {
      logger.error('Error creating policy review:', error);
      throw error;
    }
  }

  async findReviewsByPolicyId(policyId: string): Promise<PolicyReview[]> {
    try {
      return await this.reviewsCollection
        .find({ policy_id: policyId })
        .sort({ scheduled_date: -1 })
        .toArray();

    } catch (error) {
      logger.error('Error finding reviews by policy ID:', error);
      throw error;
    }
  }

  async findPendingReviews(reviewerId?: string): Promise<PolicyReview[]> {
    try {
      const query: any = { status: { $in: ['pending', 'in_progress'] } };
      
      if (reviewerId) {
        query.reviewer_id = reviewerId;
      }

      return await this.reviewsCollection
        .find(query)
        .sort({ scheduled_date: 1 })
        .toArray();

    } catch (error) {
      logger.error('Error finding pending reviews:', error);
      throw error;
    }
  }

  // Policy Relationship Operations
  async createRelationship(relationshipData: Omit<PolicyRelationship, '_id'>): Promise<PolicyRelationship> {
    try {
      const result = await this.relationshipsCollection.insertOne(relationshipData);
      const createdRelationship = await this.relationshipsCollection.findOne({ _id: result.insertedId });
      
      if (!createdRelationship) {
        throw new Error('Failed to retrieve created relationship');
      }

      return createdRelationship;

    } catch (error) {
      logger.error('Error creating policy relationship:', error);
      throw error;
    }
  }

  async findRelationshipsByPolicyId(policyId: string): Promise<PolicyRelationship[]> {
    try {
      return await this.relationshipsCollection
        .find({
          $or: [
            { source_policy_id: policyId },
            { target_policy_id: policyId }
          ]
        })
        .toArray();

    } catch (error) {
      logger.error('Error finding relationships by policy ID:', error);
      throw error;
    }
  }

  // Utility Methods
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

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

  // Compliance and Analytics Helper Methods
  async generateComplianceReport(policyId: string): Promise<PolicyComplianceReport | null> {
    try {
      const policy = await this.findPolicyById(policyId);
      if (!policy) {
        return null;
      }

      // This is a simplified implementation - in production, you'd have more sophisticated compliance checking
      const complianceScore = this.calculateComplianceScore(policy);
      const gaps = await this.identifyComplianceGaps(policy);
      
      return {
        policy_id: policyId,
        policy_title: policy.title,
        compliance_score: complianceScore,
        framework_scores: this.calculateFrameworkScores(policy),
        gaps,
        recommendations: this.generateRecommendations(gaps),
        last_review_date: policy.metadata.last_review_date,
        next_review_date: policy.metadata.next_review_date,
        status: this.determineComplianceStatus(complianceScore, gaps)
      };

    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  private calculateComplianceScore(policy: PolicyDocument): number {
    // Simplified scoring logic - in production, this would be more sophisticated
    let score = 70; // Base score
    
    // Check for required sections based on policy type
    if (policy.metadata.compliance_frameworks.length > 0) {
      score += 10;
    }
    
    if (policy.effective_date) {
      score += 5;
    }
    
    if (policy.metadata.next_review_date) {
      score += 5;
    }
    
    if (policy.status === 'approved') {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  private async identifyComplianceGaps(policy: PolicyDocument): Promise<PolicyGap[]> {
    const gaps: PolicyGap[] = [];
    
    // Example gap identification logic
    if (!policy.effective_date) {
      gaps.push({
        requirement: 'Effective Date',
        current_coverage: 0,
        target_coverage: 100,
        gap_severity: 'medium',
        remediation_steps: ['Set an effective date for the policy']
      });
    }
    
    if (policy.metadata.compliance_frameworks.length === 0) {
      gaps.push({
        requirement: 'Compliance Framework Mapping',
        current_coverage: 0,
        target_coverage: 100,
        gap_severity: 'high',
        remediation_steps: ['Map policy to relevant compliance frameworks']
      });
    }
    
    return gaps;
  }

  private calculateFrameworkScores(policy: PolicyDocument): Record<string, number> {
    const scores: Record<string, number> = {};
    
    for (const framework of policy.metadata.compliance_frameworks) {
      // Simplified framework scoring
      scores[framework] = this.calculateComplianceScore(policy);
    }
    
    return scores;
  }

  private generateRecommendations(gaps: PolicyGap[]): string[] {
    const recommendations: string[] = [];
    
    for (const gap of gaps) {
      recommendations.push(...gap.remediation_steps);
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  private determineComplianceStatus(score: number, gaps: PolicyGap[]): PolicyComplianceReport['status'] {
    const criticalGaps = gaps.filter(gap => gap.gap_severity === 'critical').length;
    const highGaps = gaps.filter(gap => gap.gap_severity === 'high').length;
    
    if (criticalGaps > 0 || score < 60) {
      return 'non_compliant';
    } else if (highGaps > 0 || score < 80) {
      return 'major_gaps';
    } else if (gaps.length > 0 || score < 95) {
      return 'minor_gaps';
    } else {
      return 'compliant';
    }
  }
}
