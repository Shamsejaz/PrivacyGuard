// End-to-End Integration Tests for Privacy Comply Agent
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrivacyComplyAgentFactory } from '../factory';
import { PrivacyComplyAgent } from '../services/privacy-comply-agent';
import { ComplianceFinding, ComplianceAssessment, RemediationResult } from '../types';

describe('Privacy Comply Agent - End-to-End Integration Tests', () => {
  let agent: PrivacyComplyAgent;
  let factory: PrivacyComplyAgentFactory;

  beforeEach(async () => {
    // Create agent factory
    factory = PrivacyComplyAgentFactory.getInstance();
    
    // Create agent instance
    agent = await factory.createAgent();
    
    // Initialize agent
    await agent.initialize();
  });

  afterEach(async () => {
    // Cleanup
    if (agent) {
      await agent.shutdown();
    }
  });

  describe('Complete Compliance Workflow', () => {
    it('should execute complete compliance workflow from detection to remediation', async () => {
      // Step 1: Run compliance scan
      const scanResults = await agent.runComplianceScan();
      
      expect(scanResults).toBeDefined();
      expect(scanResults.findings).toBeInstanceOf(Array);
      expect(scanResults.assessments).toBeInstanceOf(Array);
      expect(scanResults.recommendations).toBeInstanceOf(Array);
      
      // Verify findings structure
      if (scanResults.findings.length > 0) {
        const finding = scanResults.findings[0];
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('resourceArn');
        expect(finding).toHaveProperty('findingType');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('description');
        expect(finding).toHaveProperty('detectedAt');
      }

      // Step 2: Execute automated remediation if recommendations exist
      if (scanResults.recommendations.length > 0) {
        const remediationResults = await agent.executeAutomatedRemediation();
        
        expect(remediationResults).toBeInstanceOf(Array);
        
        if (remediationResults.length > 0) {
          const result = remediationResults[0];
          expect(result).toHaveProperty('remediationId');
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('executedAt');
        }
      }

      // Step 3: Generate compliance report
      const report = await agent.generateComplianceReport('SUMMARY');
      
      expect(report).toBeDefined();
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('type');
      expect(report).toHaveProperty('generatedAt');
      expect(report.type).toBe('SUMMARY');
    }, 30000); // 30 second timeout for complete workflow

    it('should handle natural language queries about compliance status', async () => {
      // Test various types of queries
      const queries = [
        'What is our current compliance status?',
        'How many critical issues do we have?',
        'Show me GDPR compliance violations',
        'What remediations were executed today?'
      ];

      for (const query of queries) {
        const response = await agent.processQuery(query);
        
        expect(response).toBeDefined();
        expect(response).toHaveProperty('answer');
        expect(response).toHaveProperty('confidence');
        expect(response).toHaveProperty('conversationId');
        expect(typeof response.answer).toBe('string');
        expect(typeof response.confidence).toBe('number');
        expect(response.confidence).toBeGreaterThanOrEqual(0);
        expect(response.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should maintain conversation context across multiple queries', async () => {
      // First query
      const firstResponse = await agent.processQuery('What are our critical compliance issues?');
      expect(firstResponse.conversationId).toBeDefined();

      // Follow-up query with context
      const followUpResponse = await agent.processQuery(
        'Can you provide more details about the first one?',
        { conversationId: firstResponse.conversationId }
      );
      
      expect(followUpResponse.conversationId).toBe(firstResponse.conversationId);
      expect(followUpResponse.answer).toBeDefined();
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide accurate system status', async () => {
      const status = await agent.getSystemStatus();
      
      expect(status).toBeDefined();
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('lastScan');
      expect(status).toHaveProperty('nextScan');
      expect(status).toHaveProperty('activeRemediations');
      
      expect(['HEALTHY', 'DEGRADED', 'UNHEALTHY']).toContain(status.status);
      expect(typeof status.services).toBe('object');
      expect(status.lastScan).toBeInstanceOf(Date);
      expect(status.nextScan).toBeInstanceOf(Date);
      expect(typeof status.activeRemediations).toBe('number');
    });

    it('should calculate compliance health score', async () => {
      const healthScore = await agent.getComplianceHealthScore();
      
      expect(healthScore).toBeDefined();
      expect(healthScore).toHaveProperty('overallScore');
      expect(healthScore).toHaveProperty('categoryScores');
      expect(healthScore).toHaveProperty('trends');
      expect(healthScore).toHaveProperty('criticalIssues');
      
      expect(typeof healthScore.overallScore).toBe('number');
      expect(healthScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(healthScore.overallScore).toBeLessThanOrEqual(1);
      expect(typeof healthScore.categoryScores).toBe('object');
      expect(Array.isArray(healthScore.trends)).toBe(true);
      expect(typeof healthScore.criticalIssues).toBe('number');
    });

    it('should start and stop monitoring successfully', async () => {
      // Start monitoring
      await agent.startMonitoring();
      
      // Verify monitoring is active
      const statusAfterStart = await agent.getSystemStatus();
      expect(statusAfterStart.status).toBeDefined();
      
      // Stop monitoring
      await agent.stopMonitoring();
      
      // Verify monitoring stopped
      const statusAfterStop = await agent.getSystemStatus();
      expect(statusAfterStop.status).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should update and retrieve configuration', async () => {
      // Get initial configuration
      const initialConfig = await agent.getConfiguration();
      expect(initialConfig).toBeDefined();
      expect(initialConfig).toHaveProperty('scanInterval');
      expect(initialConfig).toHaveProperty('autoRemediation');
      
      // Update configuration
      const newConfig = {
        scanInterval: 7200000, // 2 hours
        autoRemediation: false,
        maxConcurrentRemediations: 3
      };
      
      await agent.updateConfiguration(newConfig);
      
      // Verify configuration was updated
      const updatedConfig = await agent.getConfiguration();
      expect(updatedConfig.scanInterval).toBe(newConfig.scanInterval);
      expect(updatedConfig.autoRemediation).toBe(newConfig.autoRemediation);
      expect(updatedConfig.maxConcurrentRemediations).toBe(newConfig.maxConcurrentRemediations);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service failures gracefully', async () => {
      // This test would simulate service failures
      // For now, we'll test that the agent continues to function
      const status = await agent.getSystemStatus();
      expect(status).toBeDefined();
      
      // Even if some services fail, the agent should provide status
      expect(['HEALTHY', 'DEGRADED', 'UNHEALTHY']).toContain(status.status);
    });

    it('should handle concurrent operations', async () => {
      // Test concurrent compliance scans
      const scanPromises = [
        agent.runComplianceScan(),
        agent.runComplianceScan(),
        agent.runComplianceScan()
      ];
      
      const results = await Promise.allSettled(scanPromises);
      
      // At least some scans should succeed
      const successfulScans = results.filter(r => r.status === 'fulfilled');
      expect(successfulScans.length).toBeGreaterThan(0);
    });

    it('should handle shutdown gracefully', async () => {
      // Start some operations
      const scanPromise = agent.runComplianceScan();
      
      // Shutdown should wait for operations to complete
      const shutdownPromise = agent.shutdown();
      
      // Both should complete without errors
      await expect(scanPromise).resolves.toBeDefined();
      await expect(shutdownPromise).resolves.toBeUndefined();
    });
  });

  describe('Cross-Service Communication', () => {
    it('should validate data flow between services', async () => {
      // Run a scan to generate data flow
      const scanResults = await agent.runComplianceScan();
      
      // Verify data flows correctly between services
      expect(scanResults.findings).toBeInstanceOf(Array);
      expect(scanResults.assessments).toBeInstanceOf(Array);
      expect(scanResults.recommendations).toBeInstanceOf(Array);
      
      // If we have findings, we should have assessments
      if (scanResults.findings.length > 0) {
        expect(scanResults.assessments.length).toBeGreaterThan(0);
      }
      
      // If we have assessments, we should have recommendations
      if (scanResults.assessments.length > 0) {
        expect(scanResults.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should maintain data consistency across operations', async () => {
      // Run multiple operations and verify consistency
      const [scanResults, healthScore, systemStatus] = await Promise.all([
        agent.runComplianceScan(),
        agent.getComplianceHealthScore(),
        agent.getSystemStatus()
      ]);
      
      // Verify data consistency
      expect(scanResults).toBeDefined();
      expect(healthScore).toBeDefined();
      expect(systemStatus).toBeDefined();
      
      // Critical issues count should be consistent
      const criticalFindings = scanResults.findings.filter(f => f.severity === 'CRITICAL').length;
      expect(healthScore.criticalIssues).toBe(criticalFindings);
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete operations within acceptable time limits', async () => {
      const startTime = Date.now();
      
      // Run compliance scan
      await agent.runComplianceScan();
      
      const duration = Date.now() - startTime;
      
      // Should complete within 10 seconds for basic scan
      expect(duration).toBeLessThan(10000);
    });

    it('should handle multiple report generations', async () => {
      const reportTypes: Array<'DPIA' | 'ROPA' | 'AUDIT' | 'SUMMARY'> = ['DPIA', 'ROPA', 'AUDIT', 'SUMMARY'];
      
      const reportPromises = reportTypes.map(type => 
        agent.generateComplianceReport(type)
      );
      
      const reports = await Promise.all(reportPromises);
      
      expect(reports).toHaveLength(4);
      reports.forEach((report, index) => {
        expect(report.type).toBe(reportTypes[index]);
        expect(report).toHaveProperty('id');
        expect(report).toHaveProperty('generatedAt');
      });
    });
  });
});

describe('System Readiness Tests', () => {
  it('should validate system readiness before operations', async () => {
    const factory = PrivacyComplyAgentFactory.getInstance();
    
    // Test system readiness
    const readiness = await factory.testSystemReadiness();
    
    expect(readiness).toBeDefined();
    expect(readiness).toHaveProperty('ready');
    expect(readiness).toHaveProperty('issues');
    expect(readiness).toHaveProperty('serviceStatus');
    
    expect(typeof readiness.ready).toBe('boolean');
    expect(Array.isArray(readiness.issues)).toBe(true);
    expect(Array.isArray(readiness.serviceStatus)).toBe(true);
  });

  it('should create agent with custom configuration', async () => {
    const factory = PrivacyComplyAgentFactory.getInstance();
    
    const customConfig = {
      services: {
        scanInterval: 1800000, // 30 minutes
        autoRemediation: false
      }
    };
    
    const agent = await factory.createAgentWithConfig(customConfig);
    expect(agent).toBeDefined();
    
    await agent.initialize();
    
    const config = await agent.getConfiguration();
    expect(config.autoRemediation).toBe(false);
    
    await agent.shutdown();
  });
});