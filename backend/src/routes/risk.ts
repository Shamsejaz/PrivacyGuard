import { Router, type Request, type Response } from 'express';
import { RiskAssessmentService } from '../services/RiskAssessmentService.js';
import { RiskAssessmentRepository } from '../repositories/RiskAssessmentRepository.js';
// import { pool } from '../config/database.js'; // Will be injected via dependency injection
import { authenticateToken } from '../middleware/auth.js';
import type { 
  RiskFilters, 
  ComplianceFilters, 
  CreateRiskAssessmentRequest, 
  UpdateRiskAssessmentRequest,
  CreateComplianceFindingRequest 
} from '../types/risk.js';

// Async handler utility
const asyncHandler = (fn: (req: Request, res: Response, next?: any) => Promise<any>) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();

// Initialize service - pool will be injected from main app
const riskRepository = new RiskAssessmentRepository(null as any); // TODO: Inject pool properly
const riskService = new RiskAssessmentService(riskRepository);

// Apply authentication to all routes
router.use(authenticateToken);

// Risk Assessment endpoints

// GET /api/v1/risk/assessments
router.get('/assessments', asyncHandler(async (req, res) => {
  const filters: RiskFilters = {
    riskLevel: req.query.riskLevel as string,
    status: req.query.status as string,
    category: req.query.category as string,
    ownerId: req.query.ownerId as string,
    // reviewDateFrom: req.query.reviewDateFrom ? new Date(req.query.reviewDateFrom as string) : undefined,
    // reviewDateTo: req.query.reviewDateTo ? new Date(req.query.reviewDateTo as string) : undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    // sortBy: req.query.sortBy as string,
    // sortOrder: req.query.sortOrder as 'asc' | 'desc'
  };

  const result = await riskService.getRiskAssessments(filters);
  res.json({
    success: true,
    data: result
  });
}));

// GET /api/v1/risk/assessments/:id
router.get('/assessments/:id', asyncHandler(async (req, res) => {
  const riskAssessment = await riskService.getRiskAssessmentById(req.params.id);
  res.json({
    success: true,
    data: riskAssessment
  });
}));

// POST /api/v1/risk/assessments
router.post('/assessments', asyncHandler(async (req, res) => {
  const data: CreateRiskAssessmentRequest = req.body;
  const riskAssessment = await riskService.createRiskAssessment(data);
  
  res.status(201).json({
    success: true,
    data: riskAssessment,
    message: 'Risk assessment created successfully'
  });
}));

// PUT /api/v1/risk/assessments/:id
router.put('/assessments/:id', asyncHandler(async (req, res) => {
  const data: UpdateRiskAssessmentRequest = req.body;
  const riskAssessment = await riskService.updateRiskAssessment(req.params.id, data);
  
  res.json({
    success: true,
    data: riskAssessment,
    message: 'Risk assessment updated successfully'
  });
}));

// DELETE /api/v1/risk/assessments/:id
router.delete('/assessments/:id', asyncHandler(async (req, res) => {
  await riskService.deleteRiskAssessment(req.params.id);
  
  res.json({
    success: true,
    message: 'Risk assessment deleted successfully'
  });
}));

// Compliance Finding endpoints

// GET /api/v1/risk/findings
router.get('/findings', asyncHandler(async (req, res) => {
  const filters: ComplianceFilters = {
    regulation: req.query.regulation as string,
    severity: req.query.severity as string,
    status: req.query.status as string,
    category: req.query.category as string,
    assignedTo: req.query.assignedTo as string,
    dateFrom: req.query.dueDateFrom ? new Date(req.query.dueDateFrom as string) : undefined,
    dateTo: req.query.dueDateTo ? new Date(req.query.dueDateTo as string) : undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  };

  const result = await riskService.getComplianceFindings(filters);
  res.json({
    success: true,
    data: result
  });
}));

// GET /api/v1/risk/findings/:id
router.get('/findings/:id', asyncHandler(async (req: Request, res: Response) => {
  const finding = await riskService.getComplianceFindingById(req.params.id);
  res.json({
    success: true,
    data: finding
  });
}));

// POST /api/v1/risk/findings
router.post('/findings', asyncHandler(async (req: Request, res: Response) => {
  const data: CreateComplianceFindingRequest = req.body;
  const finding = await riskService.createComplianceFinding(data);
  
  res.status(201).json({
    success: true,
    data: finding,
    message: 'Compliance finding created successfully'
  });
}));

// PUT /api/v1/risk/findings/:id
router.put('/findings/:id', asyncHandler(async (req: Request, res: Response) => {
  const finding = await riskService.updateComplianceFinding(req.params.id, req.body);
  
  res.json({
    success: true,
    data: finding,
    message: 'Compliance finding updated successfully'
  });
}));

// Analytics and Reporting endpoints

// GET /api/v1/risk/metrics
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const metrics = await riskService.getRiskMetrics();
  res.json({
    success: true,
    data: metrics
  });
}));

// GET /api/v1/risk/trends
router.get('/trends', asyncHandler(async (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(req.query.days as string) : 30;
  const trends = await riskService.getRiskTrends(days);
  res.json({
    success: true,
    data: trends
  });
}));

// GET /api/v1/risk/analysis
router.get('/analysis', asyncHandler(async (req: Request, res: Response) => {
  const analysis = await riskService.analyzeRiskTrends();
  res.json({
    success: true,
    data: analysis
  });
}));

// POST /api/v1/risk/reports
router.post('/reports', asyncHandler(async (req: Request, res: Response) => {
  const filters: RiskFilters = req.body.filters || {};
  const report = await riskService.generateRiskReport(filters);
  
  res.json({
    success: true,
    data: report,
    message: 'Risk report generated successfully'
  });
}));

// Risk calculation utility endpoint
// POST /api/v1/risk/calculate
router.post('/calculate', asyncHandler(async (req: Request, res: Response) => {
  const { impact, likelihood } = req.body;
  
  if (!impact || !likelihood) {
    return res.status(400).json({
      success: false,
      error: 'Impact and likelihood scores are required'
    });
  }

  const score = riskService.calculateRiskScore(impact, likelihood);
  const level = riskService.determineRiskLevel(score);
  
  return res.json({
    success: true,
    data: {
      impact,
      likelihood,
      overallScore: score,
      riskLevel: level
    }
  });
}));

export default router;
