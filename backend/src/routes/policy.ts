import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.js';
import { PolicyService } from '../services/PolicyService.js';
import { PolicyAnalyticsService } from '../services/PolicyAnalyticsService.js';
import { authenticateToken } from '../middleware/auth.js';
import { validatePermission } from '../middleware/permissions.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type {
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PolicySearchFilters,
  CreateTemplateRequest,
  PolicyApprovalRequest,
  PolicyVersionRequest,
  GeneratePolicyFromTemplateRequest
} from '../models/Policy.js';

const router = Router();
const policyService = new PolicyService();
const policyAnalyticsService = new PolicyAnalyticsService();

// Apply authentication to all routes
router.use(authenticateToken);

// Policy Document Routes

// GET /api/policies - Search and list policies
router.get('/', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const filters: PolicySearchFilters = {
      type: req.query.type as any,
      status: req.query.status as any,
      language: req.query.language as string,
      jurisdiction: req.query.jurisdiction as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      compliance_frameworks: req.query.compliance_frameworks ? (req.query.compliance_frameworks as string).split(',') : undefined,
      created_by: req.query.created_by as string,
      search_text: req.query.search_text as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort_by: req.query.sort_by as any,
      sort_order: req.query.sort_order as any
    };

    if (req.query.date_range_start && req.query.date_range_end) {
      filters.date_range = {
        start: new Date(req.query.date_range_start as string),
        end: new Date(req.query.date_range_end as string)
      };
    }

    const result = await policyService.searchPolicies(filters);
    res.json(result);

  } catch (error) {
    logger.error('Error searching policies:', error);
    return res.status(500).json({ error: 'Failed to search policies' });
  }
});

// POST /api/policies - Create new policy
router.post('/', validatePermission('policy', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const policyData: CreatePolicyRequest = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const policy = await policyService.createPolicy(policyData, createdBy);
    return res.status(201).json(policy);

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    } else {
      logger.error('Error creating policy:', error);
      return res.status(500).json({ error: 'Failed to create policy' });
    }
  }
});

// GET /api/policies/:id - Get policy by ID
router.get('/:id', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const policy = await policyService.getPolicyById(id);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);

  } catch (error) {
    logger.error('Error getting policy:', error);
    return res.status(500).json({ error: 'Failed to get policy' });
  }
});

// PUT /api/policies/:id - Update policy
router.put('/:id', validatePermission('policy', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates: UpdatePolicyRequest = req.body;
    const updatedBy = req.user?.id;

    if (!updatedBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const policy = await policyService.updatePolicy(id, updates, updatedBy);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    } else if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    } else {
      logger.error('Error updating policy:', error);
      return res.status(500).json({ error: 'Failed to update policy' });
    }
  }
});

// DELETE /api/policies/:id - Delete policy
router.delete('/:id', validatePermission('policy', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id;

    if (!deletedBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const deleted = await policyService.deletePolicy(id, deletedBy);

    if (!deleted) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.status(204).send();

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    } else if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    } else {
      logger.error('Error deleting policy:', error);
      return res.status(500).json({ error: 'Failed to delete policy' });
    }
  }
});

// POST /api/policies/:id/approve - Approve/reject policy
router.post('/:id/approve', validatePermission('policy', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const approvalRequest: PolicyApprovalRequest = {
      policy_id: id,
      ...req.body
    };
    const approvedBy = req.user?.id;

    if (!approvedBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const policy = await policyService.approvePolicy(approvalRequest, approvedBy);
    
    return res.json({
      success: true,
      data: policy,
      message: 'Policy approval status updated successfully'
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    } else if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    } else {
      logger.error('Error approving policy:', error);
      return res.status(500).json({ error: 'Failed to approve policy' });
    }
  }
});

// POST /api/policies/:id/version - Create new version
router.post('/:id/version', validatePermission('policy', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const versionRequest: PolicyVersionRequest = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const policy = await policyService.createNewVersion(id, versionRequest, createdBy);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.status(201).json({
      success: true,
      data: policy,
      message: 'Policy version created successfully'
    });

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    } else if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    } else {
      logger.error('Error creating policy version:', error);
      return res.status(500).json({ error: 'Failed to create policy version' });
    }
  }
});

// GET /api/policies/:id/analytics - Get policy analytics
router.get('/:id/analytics', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const metricType = req.query.metric_type as string;

    const analytics = await policyService.getPolicyAnalytics(id, metricType);
    res.json(analytics);

  } catch (error) {
    logger.error('Error getting policy analytics:', error);
    return res.status(500).json({ error: 'Failed to get policy analytics' });
  }
});

// GET /api/policies/:id/compliance-report - Generate compliance report
router.get('/:id/compliance-report', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const report = await policyService.generateComplianceReport(id);

    if (!report) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.json(report);

  } catch (error) {
    logger.error('Error generating compliance report:', error);
    return res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// GET /api/policies/:id/effectiveness - Get policy effectiveness metrics
router.get('/:id/effectiveness', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const effectiveness = await policyService.calculatePolicyEffectiveness(id);

    if (!effectiveness) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.json(effectiveness);

  } catch (error) {
    logger.error('Error calculating policy effectiveness:', error);
    return res.status(500).json({ error: 'Failed to calculate policy effectiveness' });
  }
});

// Policy Template Routes

// GET /api/policies/templates - Get policy templates
router.get('/templates', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const filters = {
      category: req.query.category as string,
      regulation: req.query.regulation as string,
      language: req.query.language as string,
      jurisdiction: req.query.jurisdiction as string,
      search_text: req.query.search_text as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const templates = await policyService.getTemplates(filters);
    return res.json(templates);

  } catch (error) {
    logger.error('Error getting policy templates:', error);
    return res.status(500).json({ error: 'Failed to get policy templates' });
  }
});

// POST /api/policies/templates - Create policy template
router.post('/templates', validatePermission('policy', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templateData: CreateTemplateRequest = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const template = await policyService.createTemplate(templateData, createdBy);
    return res.status(201).json(template);

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    } else {
      logger.error('Error creating policy template:', error);
      return res.status(500).json({ error: 'Failed to create policy template' });
    }
  }
});

// GET /api/policies/templates/:id - Get template by ID
router.get('/templates/:id', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await policyService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json(template);

  } catch (error) {
    logger.error('Error getting policy template:', error);
    return res.status(500).json({ error: 'Failed to get policy template' });
  }
});

// POST /api/policies/generate-from-template - Generate policy from template
router.post('/generate-from-template', validatePermission('policy', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const request: GeneratePolicyFromTemplateRequest = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const policy = await policyService.generatePolicyFromTemplate(request, createdBy);
    return res.status(201).json(policy);

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    } else if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    } else {
      logger.error('Error generating policy from template:', error);
      return res.status(500).json({ error: 'Failed to generate policy from template' });
    }
  }
});

// Policy Review Routes

// GET /api/policies/reviews/pending - Get pending reviews
router.get('/reviews/pending', validatePermission('policy', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reviewerId = req.query.reviewer_id as string || req.user?.id;
    const reviews = await policyService.getPendingReviews(reviewerId);
    return res.json(reviews);

  } catch (error) {
    logger.error('Error getting pending reviews:', error);
    return res.status(500).json({ error: 'Failed to get pending reviews' });
  }
});

// POST /api/policies/:id/schedule-review - Schedule policy review
router.post('/:id/schedule-review', validatePermission('policy', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { review_date } = req.body;
    const scheduledBy = req.user?.id;

    if (!scheduledBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const reviewDate = review_date ? new Date(review_date) : undefined;
    const review = await policyService.scheduleReview(id, scheduledBy, reviewDate);

    return res.status(201).json(review);

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    } else {
      logger.error('Error scheduling policy review:', error);
      return res.status(500).json({ error: 'Failed to schedule policy review' });
    }
  }
});

// Policy Relationship Routes

// GET /api/policies/:id/relationships - Get policy relationships
router.get('/:id/relationships', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const relationships = await policyService.getPolicyRelationships(id);
    return res.json(relationships);
    res.json(relationships);

  } catch (error) {
    logger.error('Error getting policy relationships:', error);
    return res.status(500).json({ error: 'Failed to get policy relationships' });
  }
});

// POST /api/policies/:id/relationships - Create policy relationship
router.post('/:id/relationships', validatePermission('policy', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { target_policy_id, relationship_type, description } = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!target_policy_id || !relationship_type) {
      return res.status(400).json({ error: 'Target policy ID and relationship type are required' });
    }

    const relationship = await policyService.createPolicyRelationship(
      id,
      target_policy_id,
      relationship_type,
      description || '',
      createdBy
    );

    return res.status(201).json(relationship);

  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    } else if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    } else {
      logger.error('Error creating policy relationship:', error);
      return res.status(500).json({ error: 'Failed to create policy relationship' });
    }
  }
});

// Policy Analytics Routes

// GET /api/policies/analytics/dashboard - Get dashboard analytics
router.get('/analytics/dashboard', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const filters: any = {};

    if (req.query.date_range_start && req.query.date_range_end) {
      filters.date_range = {
        start: new Date(req.query.date_range_start as string),
        end: new Date(req.query.date_range_end as string)
      };
    }

    if (req.query.policy_types) {
      filters.policy_types = (req.query.policy_types as string).split(',');
    }

    if (req.query.jurisdictions) {
      filters.jurisdictions = (req.query.jurisdictions as string).split(',');
    }

    if (req.query.compliance_frameworks) {
      filters.compliance_frameworks = (req.query.compliance_frameworks as string).split(',');
    }

    const analytics = await policyAnalyticsService.generateDashboardAnalytics(filters);
    res.json(analytics);

  } catch (error) {
    logger.error('Error getting dashboard analytics:', error);
    return res.status(500).json({ error: 'Failed to get dashboard analytics' });
  }
});

// GET /api/policies/:id/gap-analysis - Get compliance gap analysis
router.get('/:id/gap-analysis', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const gaps = await policyAnalyticsService.generateComplianceGapAnalysis(id);
    res.json(gaps);

  } catch (error) {
    logger.error('Error getting compliance gap analysis:', error);
    return res.status(500).json({ error: 'Failed to get compliance gap analysis' });
  }
});

// GET /api/policies/:id/relationship-map - Get policy relationship map
router.get('/:id/relationship-map', validatePermission('policy', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const relationshipMap = await policyAnalyticsService.generateRelationshipMap(id);

    if (!relationshipMap) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.json(relationshipMap);

  } catch (error) {
    logger.error('Error getting policy relationship map:', error);
    return res.status(500).json({ error: 'Failed to get policy relationship map' });
  }
});

// POST /api/policies/schedule-review-notifications - Schedule review notifications (admin only)
router.post('/schedule-review-notifications', validatePermission('policy', 'update'), async (req: Request, res: Response) => {
  try {
    await policyAnalyticsService.scheduleReviewNotifications();
    res.json({ message: 'Review notifications scheduled successfully' });

  } catch (error) {
    logger.error('Error scheduling review notifications:', error);
    return res.status(500).json({ error: 'Failed to schedule review notifications' });
  }
});

export default router;
