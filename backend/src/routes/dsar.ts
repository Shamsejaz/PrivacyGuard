import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { dsarRateLimiter } from '../middleware/rateLimiter';
import { authenticateToken } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { DSARService } from '../services/DSARService';
import { DSARRepository } from '../repositories/DSARRepository';
import { pgPool } from '../config/database';
import type { CreateDSARRequest, UpdateDSARRequest, DSARFilters } from '../models/DSAR';

const router = Router();

// Initialize DSAR service
const dsarRepository = new DSARRepository(pgPool);
const dsarService = new DSARService(dsarRepository);

// Public DSAR submission (with rate limiting)
router.post('/submit', (req: Request, res: Response, next) => {
  return dsarRateLimiter.middleware(req, res, next);
}, asyncHandler(async (req: Request, res: Response) => {
  const requestData: CreateDSARRequest = {
    subjectName: req.body.subjectName,
    subjectEmail: req.body.subjectEmail,
    subjectPhone: req.body.subjectPhone,
    requestType: req.body.requestType,
    description: req.body.description,
    dataCategories: req.body.dataCategories || [],
    processingPurposes: req.body.processingPurposes || []
  };

  const dsarRequest = await dsarService.createRequest(requestData);
  
  res.status(201).json({
    success: true,
    message: 'DSAR request submitted successfully',
    data: {
      requestId: dsarRequest.requestId,
      status: dsarRequest.status,
      submittedAt: dsarRequest.createdAt
    }
  });
}));

// Public endpoint to check DSAR status by request ID
router.get('/status/:requestId', asyncHandler(async (req: Request, res: Response) => {
  const dsarRequest = await dsarService.getRequestByRequestId(req.params.requestId);
  
  res.json({
    success: true,
    data: {
      requestId: dsarRequest.requestId,
      status: dsarRequest.status,
      submittedAt: dsarRequest.createdAt,
      lastUpdated: dsarRequest.updatedAt
    }
  });
}));

// Admin DSAR management routes (protected)
router.use(authenticateToken);

router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const filters: DSARFilters = {
    status: req.query.status as any,
    requestType: req.query.requestType as any,
    priority: req.query.priority as any,
    assignedTo: req.query.assignedTo as string,
    subjectEmail: req.query.subjectEmail as string,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10
  };

  const result = await dsarService.getRequests(filters);
  
  res.json({
    success: true,
    data: result
  });
}));

router.get('/statistics', asyncHandler(async (req: Request, res: Response) => {
  const statistics = await dsarService.getStatistics();
  
  res.json({
    success: true,
    data: statistics
  });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dsarRequest = await dsarService.getRequestById(req.params.id);
  
  res.json({
    success: true,
    data: dsarRequest
  });
}));

router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updates: UpdateDSARRequest = {
    status: req.body.status,
    priority: req.body.priority,
    assignedTo: req.body.assignedTo,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    rejectionReason: req.body.rejectionReason,
    legalBasis: req.body.legalBasis,
    dataCategories: req.body.dataCategories,
    processingPurposes: req.body.processingPurposes
  };

  // Remove undefined values
  Object.keys(updates).forEach(key => {
    if (updates[key as keyof UpdateDSARRequest] === undefined) {
      delete updates[key as keyof UpdateDSARRequest];
    }
  });

  const updatedRequest = await dsarService.updateRequest(req.params.id, updates, req.user!.id);
  
  res.json({
    success: true,
    message: 'DSAR request updated successfully',
    data: updatedRequest
  });
}));

router.post('/:id/status', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const statusChange = {
    dsarId: req.params.id,
    status: req.body.status,
    comment: req.body.comment,
    changedBy: req.user!.id
  };

  const updatedRequest = await dsarService.updateRequestStatus(statusChange);
  
  res.json({
    success: true,
    message: 'DSAR status updated successfully',
    data: updatedRequest
  });
}));

router.post('/:id/assign', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updatedRequest = await dsarService.assignRequest(
    req.params.id, 
    req.body.assigneeId, 
    req.user!.id
  );
  
  res.json({
    success: true,
    message: 'DSAR request assigned successfully',
    data: updatedRequest
  });
}));

router.get('/:id/history', asyncHandler(async (req: Request, res: Response) => {
  const history = await dsarService.getStatusHistory(req.params.id);
  
  res.json({
    success: true,
    data: history
  });
}));

router.get('/:id/report', asyncHandler(async (req: Request, res: Response) => {
  const report = await dsarService.generateReport(req.params.id);
  
  res.json({
    success: true,
    data: report
  });
}));

router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await dsarService.deleteRequest(req.params.id);
  
  res.json({
    success: true,
    message: 'DSAR request deleted successfully'
  });
}));

export default router;
