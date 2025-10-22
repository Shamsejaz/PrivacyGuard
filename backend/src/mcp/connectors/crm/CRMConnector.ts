/**
 * MCP Privacy Connectors - Generic CRM Connector
 * Base class for CRM system integrations with privacy scanning and remediation
 */

import { MCPConnector } from '../MCPConnector.js';
import { CRMDataScanner } from './CRMDataScanner.js';
import { CRMRemediationEngine } from './CRMRemediationEngine.js';
import type {
  ConnectorCredentials,
  ScanConfiguration,
  ScanResult,
  RemediationAction,
  RemediationResult,
  PIIFinding,
  ScanContext
} from '../../types/index.js';

/**
 * Generic CRM connector interface for different CRM systems
 */
export abstract class CRMConnector extends MCPConnector {
  protected dataScanner: CRMDataScanner;
  protected remediationEngine: CRMRemediationEngine | null = null;

  constructor(connectorId: string, credentials: ConnectorCredentials) {
    super(connectorId, 'crm', credentials);
    this.dataScanner = new CRMDataScanner();
  }

  /**
   * Scan CRM contacts for PII - must be implemented by concrete classes
   */
  abstract scanContacts(config: ScanConfiguration, scanId: string): Promise<{ findings: PIIFinding[], recordsScanned: number }>;

  /**
   * Scan CRM leads for PII - must be implemented by concrete classes
   */
  abstract scanLeads(config: ScanConfiguration, scanId: string): Promise<{ findings: PIIFinding[], recordsScanned: number }>;

  /**
   * Scan CRM accounts for PII - must be implemented by concrete classes
   */
  abstract scanAccounts(config: ScanConfiguration, scanId: string): Promise<{ findings: PIIFinding[], recordsScanned: number }>;

  /**
   * Common CRM scanning logic
   */
  protected async executeCRMScan(config: ScanConfiguration): Promise<ScanResult> {
    this.validateScanConfiguration(config);
    const scanId = this.generateScanId();
    const startTime = Date.now();
    
    // Initialize data scanner with custom rules from configuration
    this.dataScanner = new CRMDataScanner(config.customRules);
    
    this.logActivity('Starting CRM privacy scan', { 
      scanId, 
      scanDepth: config.scanDepth,
      includeArchived: config.includeArchived,
      customRulesCount: config.customRules.length
    });

    try {
      const findings: PIIFinding[] = [];
      let recordsScanned = 0;

      // Scan contacts
      const contactFindings = await this.scanContacts(config, scanId);
      findings.push(...contactFindings.findings);
      recordsScanned += contactFindings.recordsScanned;

      // Scan leads
      const leadFindings = await this.scanLeads(config, scanId);
      findings.push(...leadFindings.findings);
      recordsScanned += leadFindings.recordsScanned;

      // Scan accounts if deep scan is requested
      if (config.scanDepth === 'deep') {
        const accountFindings = await this.scanAccounts(config, scanId);
        findings.push(...accountFindings.findings);
        recordsScanned += accountFindings.recordsScanned;
      }

      const processingTime = Date.now() - startTime;
      const metrics = {
        recordsScanned,
        piiInstancesFound: findings.length,
        sensitiveDataVolume: this.calculateDataVolume(findings),
        complianceScore: this.calculateComplianceScore(findings),
        processingTimeMs: processingTime,
        errorCount: 0
      };

      const result: ScanResult = {
        id: `result_${scanId}`,
        scanId,
        connectorId: this.connectorId,
        connectorType: 'crm',
        status: 'completed',
        findings,
        metrics,
        remediationActions: this.generateRemediationActions(findings),
        startedAt: new Date(startTime),
        completedAt: new Date()
      };

      this.logActivity('CRM privacy scan completed', {
        scanId,
        recordsScanned,
        findingsCount: findings.length,
        processingTimeMs: processingTime
      });

      return result;

    } catch (error) {
      this.logActivity('CRM privacy scan failed', { scanId, error: error.message });
      
      return {
        id: `result_${scanId}`,
        scanId,
        connectorId: this.connectorId,
        connectorType: 'crm',
        status: 'failed',
        findings: [],
        metrics: {
          recordsScanned: 0,
          piiInstancesFound: 0,
          sensitiveDataVolume: 0,
          complianceScore: 0,
          processingTimeMs: Date.now() - startTime,
          errorCount: 1
        },
        remediationActions: [],
        startedAt: new Date(startTime),
        completedAt: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Common CRM remediation logic
   */
  protected async executeCRMRemediation(actions: RemediationAction[]): Promise<RemediationResult> {
    if (!this.remediationEngine) {
      throw new Error('Remediation engine not initialized');
    }

    this.logActivity('Starting CRM remediation', { actionsCount: actions.length });

    try {
      let totalRecordsAffected = 0;
      const results: string[] = [];

      // Group actions by type for efficient processing
      const actionsByType = this.groupActionsByType(actions);

      // Execute each action type
      for (const [actionType, actionGroup] of actionsByType) {
        this.logActivity(`Executing ${actionType} actions`, { count: actionGroup.length });
        
        for (const action of actionGroup) {
          const result = await this.remediationEngine.executeRemediation(action, []);
          totalRecordsAffected += result.recordsAffected;
          results.push(`${actionType}: ${result.details}`);
        }
      }

      this.logActivity('CRM remediation completed', { 
        actionsExecuted: actions.length,
        recordsAffected: totalRecordsAffected
      });

      return {
        actionId: `remediation_${Date.now()}`,
        status: 'success',
        recordsAffected: totalRecordsAffected,
        details: results.join('; '),
        timestamp: new Date()
      };

    } catch (error) {
      this.logActivity('CRM remediation failed', { error: error.message });
      
      return {
        actionId: `remediation_${Date.now()}`,
        status: 'failed',
        recordsAffected: 0,
        details: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Scan individual CRM record using data scanner
   */
  protected async scanCRMRecord(
    record: any,
    objectType: string,
    scanId: string,
    dataSource: string
  ): Promise<PIIFinding[]> {
    const scanContext: ScanContext = {
      connectorType: 'crm',
      dataSource,
      fieldNames: Object.keys(record),
      recordMetadata: {
        objectType,
        recordId: record.Id,
        lastModified: record.LastModifiedDate
      },
      organizationRules: [] // Would be populated from configuration
    };

    return await this.dataScanner.scanCRMRecord(record, objectType, scanId, scanContext);
  }

  /**
   * Generate remediation actions using CRM data scanner
   */
  protected generateRemediationActions(findings: PIIFinding[]): RemediationAction[] {
    // Get individual recommendations from findings
    const individualActions = findings.map(finding => finding.recommendedAction);
    
    // Get bulk/optimized actions from data scanner
    const bulkActions = this.dataScanner.generateFieldRemediationActions(findings, 'CRM');
    
    // Combine and deduplicate actions
    return [...individualActions, ...bulkActions];
  }

  /**
   * Group actions by type for efficient processing
   */
  protected groupActionsByType(actions: RemediationAction[]): Map<string, RemediationAction[]> {
    const actionMap = new Map<string, RemediationAction[]>();
    
    for (const action of actions) {
      if (!actionMap.has(action.type)) {
        actionMap.set(action.type, []);
      }
      actionMap.get(action.type)!.push(action);
    }
    
    return actionMap;
  }

  /**
   * Calculate data volume from findings
   */
  protected calculateDataVolume(findings: PIIFinding[]): number {
    return findings.reduce((total, finding) => {
      return total + finding.content.length;
    }, 0);
  }

  /**
   * Calculate compliance score based on findings
   */
  protected calculateComplianceScore(findings: PIIFinding[]): number {
    if (findings.length === 0) {
      return 100;
    }

    const revokedConsent = findings.filter(f => f.consentStatus === 'revoked').length;
    const expiredConsent = findings.filter(f => f.consentStatus === 'expired').length;
    const highSensitivity = findings.filter(f => f.sensitivityLevel === 'high').length;

    const penalties = (revokedConsent * 30) + (expiredConsent * 20) + (highSensitivity * 10);
    const maxPenalty = findings.length * 30;
    
    return Math.max(0, 100 - (penalties / maxPenalty) * 100);
  }

  /**
   * Add external consent synchronization target
   */
  addConsentSyncTarget(system: string, endpoint: string, credentials: Record<string, any>): void {
    if (this.remediationEngine) {
      this.remediationEngine.addConsentSyncTarget({
        system,
        endpoint,
        credentials
      });
      
      this.logActivity('Added consent sync target', { system, endpoint });
    }
  }
}