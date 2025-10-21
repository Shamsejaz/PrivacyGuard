import { Router } from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import dsarRoutes from './dsar';
import riskRoutes from './risk';
import gdprRoutes from './gdpr';
import policyRoutes from './policy';
import analyticsRoutes from './analytics';
import websocketRoutes from './websocket';
import externalSystemsRoutes from './external-systems';
import { authenticate } from '../middleware/auth';

export function setupRoutes(): Router {
  const router = Router();

  // Public routes (no authentication required)
  router.use('/auth', authRoutes);
  
  // Public DSAR submission endpoint
  router.use('/dsar/public', dsarRoutes);

  // Protected routes (authentication required)
  router.use('/users', usersRoutes);
  router.use('/dsar', authenticate, dsarRoutes);
  router.use('/risk', authenticate, riskRoutes);
  router.use('/gdpr', authenticate, gdprRoutes);
  router.use('/policy', authenticate, policyRoutes);
  router.use('/analytics', authenticate, analyticsRoutes);
  router.use('/websocket', websocketRoutes);
  router.use('/external-systems', externalSystemsRoutes);

  // API documentation endpoint
  router.get('/', (req, res) => {
    res.json({
      name: 'PrivacyGuard API',
      version: '1.0.0',
      description: 'Backend API for PrivacyGuard privacy compliance platform',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        dsar: '/api/v1/dsar',
        risk: '/api/v1/risk',
        gdpr: '/api/v1/gdpr',
        policy: '/api/v1/policy',
        analytics: '/api/v1/analytics',
        websocket: '/api/v1/websocket',
        externalSystems: '/api/v1/external-systems',
      },
      documentation: 'https://docs.privacyguard.com/api',
      support: 'support@privacyguard.com',
    });
  });

  return router;
}
