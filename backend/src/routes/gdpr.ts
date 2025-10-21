import { Router } from 'express';
import type { Request, Response } from 'express';
import { GDPRService } from '../services/GDPRService';
import { GDPRRepository } from '../repositories/GDPRRepository';
import { pgPool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import type { 
  CreateLawfulBasisRequest,
  CreateProcessingRecordRequest,
  CreateDPIARequest,
  CreateDataBreachRequest,
  CreateDataPortabilityRequest,
  GDPRFilters
} from '../models/GDPR';

const router = Router();
const gdprRepository = new GDPRRepository(pgPool);
const gdprService = new GDPRService(gdprRepository);

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Dashboard and Statistics
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const stats = await gdprService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching GDPR dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

router.get('/compliance-matrix', async (req: Request, res: Response) => {
  try {
    const matrix = await gdprService.getComplianceMatrix();
    res.json(matrix);
  } catch (error) {
    console.error('Error fetching compliance matrix:', error);
    res.status(500).json({ error: 'Failed to fetch compliance matrix' });
  }
});

router.get('/reports/compliance', async (req: Request, res: Response) => {
  try {
    const filters: GDPRFilters = {
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
    };
    
    const report = await gdprService.generateComplianceReport(filters);
    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// Lawful Basis Management
router.get('/lawful-basis', async (req: Request, res: Response) => {
  try {
    const filters: GDPRFilters = {
      status: req.query.status as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    
    const records = await gdprService.getLawfulBasisRecords(filters);
    res.json(records);
  } catch (error) {
    console.error('Error fetching lawful basis records:', error);
    res.status(500).json({ error: 'Failed to fetch lawful basis records' });
  }
});

router.post('/lawful-basis', async (req: Request, res: Response) => {
  try {
    const data: CreateLawfulBasisRequest = req.body;
    const record = await gdprService.createLawfulBasisRecord(data);
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating lawful basis record:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create lawful basis record' });
  }
});

router.put('/lawful-basis/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const record = await gdprService.updateLawfulBasisRecord(id, updates);
    res.json(record);
  } catch (error) {
    console.error('Error updating lawful basis record:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update lawful basis record' });
  }
});

router.delete('/lawful-basis/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await gdprService.deleteLawfulBasisRecord(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting lawful basis record:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete lawful basis record' });
  }
});

// Processing Records Management
router.get('/processing-records', async (req: Request, res: Response) => {
  try {
    const filters: GDPRFilters = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    
    const records = await gdprService.getProcessingRecords(filters);
    res.json(records);
  } catch (error) {
    console.error('Error fetching processing records:', error);
    res.status(500).json({ error: 'Failed to fetch processing records' });
  }
});

router.post('/processing-records', async (req: Request, res: Response) => {
  try {
    const data: CreateProcessingRecordRequest = req.body;
    const record = await gdprService.createProcessingRecord(data);
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating processing record:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create processing record' });
  }
});

router.get('/processing-records/export', async (req: Request, res: Response) => {
  try {
    const csvContent = await gdprService.exportProcessingRecords();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=processing-records.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting processing records:', error);
    res.status(500).json({ error: 'Failed to export processing records' });
  }
});

// DPIA Management
router.get('/dpias', async (req: Request, res: Response) => {
  try {
    const filters: GDPRFilters = {
      status: req.query.status as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    
    const dpias = await gdprService.getDPIAs(filters);
    res.json(dpias);
  } catch (error) {
    console.error('Error fetching DPIAs:', error);
    res.status(500).json({ error: 'Failed to fetch DPIAs' });
  }
});

router.post('/dpias', async (req: Request, res: Response) => {
  try {
    const data: CreateDPIARequest = req.body;
    const dpia = await gdprService.createDPIA(data);
    res.status(201).json(dpia);
  } catch (error) {
    console.error('Error creating DPIA:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create DPIA' });
  }
});

router.put('/dpias/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const dpia = await gdprService.updateDPIA(id, updates);
    res.json(dpia);
  } catch (error) {
    console.error('Error updating DPIA:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update DPIA' });
  }
});

router.post('/dpias/:id/assess-risk', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { riskLevel } = req.body;
    const dpia = await gdprService.assessDPIARisk(id, riskLevel);
    res.json(dpia);
  } catch (error) {
    console.error('Error assessing DPIA risk:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to assess DPIA risk' });
  }
});

// Data Breach Management
router.get('/breaches', async (req: Request, res: Response) => {
  try {
    const filters: GDPRFilters = {
      status: req.query.status as string,
      assignedTo: req.query.assignedTo as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    
    const breaches = await gdprService.getDataBreaches(filters);
    res.json(breaches);
  } catch (error) {
    console.error('Error fetching data breaches:', error);
    res.status(500).json({ error: 'Failed to fetch data breaches' });
  }
});

router.post('/breaches', async (req: Request, res: Response) => {
  try {
    const data: CreateDataBreachRequest = req.body;
    const breach = await gdprService.createDataBreach(data);
    res.status(201).json(breach);
  } catch (error) {
    console.error('Error creating data breach:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create data breach' });
  }
});

router.put('/breaches/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const breach = await gdprService.updateDataBreach(id, updates);
    res.json(breach);
  } catch (error) {
    console.error('Error updating data breach:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update data breach' });
  }
});

router.post('/breaches/:id/notify-authority', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const breach = await gdprService.notifySupervisoryAuthority(id);
    res.json(breach);
  } catch (error) {
    console.error('Error notifying supervisory authority:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to notify supervisory authority' });
  }
});

router.post('/breaches/:id/notify-subjects', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const breach = await gdprService.notifyDataSubjects(id);
    res.json(breach);
  } catch (error) {
    console.error('Error notifying data subjects:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to notify data subjects' });
  }
});

// Data Portability Management
router.get('/portability-requests', async (req: Request, res: Response) => {
  try {
    const filters: GDPRFilters = {
      status: req.query.status as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    
    const requests = await gdprService.getDataPortabilityRequests(filters);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching data portability requests:', error);
    res.status(500).json({ error: 'Failed to fetch data portability requests' });
  }
});

router.post('/portability-requests', async (req: Request, res: Response) => {
  try {
    const data: CreateDataPortabilityRequest = req.body;
    const request = await gdprService.createDataPortabilityRequest(data);
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating data portability request:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create data portability request' });
  }
});

router.post('/portability-requests/:id/process', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = await gdprService.processDataPortabilityRequest(id);
    res.json(request);
  } catch (error) {
    console.error('Error processing data portability request:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to process data portability request' });
  }
});

router.post('/portability-requests/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fileSize } = req.body;
    const request = await gdprService.completeDataPortabilityRequest(id, fileSize);
    res.json(request);
  } catch (error) {
    console.error('Error completing data portability request:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to complete data portability request' });
  }
});

router.post('/portability-requests/:id/deliver', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = await gdprService.deliverDataPortabilityRequest(id);
    res.json(request);
  } catch (error) {
    console.error('Error delivering data portability request:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to deliver data portability request' });
  }
});

export default router;
