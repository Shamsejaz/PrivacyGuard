import { useCallback } from 'react';
import { auditService } from '../services/auditService';
import { 
  AuditEventType, 
  AuditCategory, 
  AuditSeverity, 
  AuditOutcome 
} from '../types/audit';

interface UseAuditLoggerOptions {
  component?: string;
  correlationId?: string;
}

export const useAuditLogger = (options: UseAuditLoggerOptions = {}) => {
  const logEvent = useCallback(async (
    eventType: AuditEventType,
    category: AuditCategory,
    action: string,
    resource: string,
    details: Record<string, any> = {},
    eventOptions: {
      resourceId?: string;
      severity?: AuditSeverity;
      outcome?: AuditOutcome;
      customFields?: Record<string, any>;
    } = {}
  ) => {
    try {
      await auditService.logEvent(
        eventType,
        category,
        action,
        resource,
        details,
        {
          ...eventOptions,
          correlationId: options.correlationId,
          customFields: {
            component: options.component,
            ...eventOptions.customFields
          }
        }
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }, [options.component, options.correlationId]);

  // Convenience methods for common events
  const logPageView = useCallback(async (pageName: string, additionalData: Record<string, any> = {}) => {
    await logEvent(
      AuditEventType.DATA_ACCESS,
      AuditCategory.DATA_MANAGEMENT,
      'PAGE_VIEW',
      'page',
      { pageName, ...additionalData },
      { severity: AuditSeverity.LOW }
    );
  }, [logEvent]);

  const logButtonClick = useCallback(async (buttonName: string, context: Record<string, any> = {}) => {
    await logEvent(
      AuditEventType.DATA_ACCESS,
      AuditCategory.SYSTEM,
      'BUTTON_CLICK',
      'ui_element',
      { buttonName, ...context },
      { severity: AuditSeverity.LOW }
    );
  }, [logEvent]);

  const logFormSubmit = useCallback(async (
    formName: string, 
    success: boolean, 
    validationErrors?: string[]
  ) => {
    await logEvent(
      AuditEventType.DATA_MODIFY,
      AuditCategory.DATA_MANAGEMENT,
      'FORM_SUBMIT',
      'form',
      { formName, validationErrors },
      { 
        severity: AuditSeverity.MEDIUM,
        outcome: success ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE
      }
    );
  }, [logEvent]);

  const logDataDownload = useCallback(async (
    resourceType: string,
    fileName: string,
    format: string,
    recordCount?: number
  ) => {
    await logEvent(
      AuditEventType.DATA_EXPORT,
      AuditCategory.DATA_MANAGEMENT,
      'DATA_DOWNLOAD',
      resourceType,
      { fileName, format, recordCount },
      { severity: AuditSeverity.HIGH }
    );
  }, [logEvent]);

  const logSearch = useCallback(async (
    searchType: string,
    query: string,
    resultCount: number,
    filters?: Record<string, any>
  ) => {
    await logEvent(
      AuditEventType.DATA_ACCESS,
      AuditCategory.DATA_MANAGEMENT,
      'SEARCH_PERFORMED',
      searchType,
      { 
        query: query.length > 100 ? query.substring(0, 100) + '...' : query,
        resultCount,
        filters
      },
      { severity: AuditSeverity.LOW }
    );
  }, [logEvent]);

  const logConfigurationChange = useCallback(async (
    configType: string,
    changes: Record<string, any>,
    previousValues?: Record<string, any>
  ) => {
    await logEvent(
      AuditEventType.CONFIGURATION_CHANGE,
      AuditCategory.SYSTEM,
      'CONFIGURATION_UPDATE',
      configType,
      { changes, previousValues },
      { severity: AuditSeverity.HIGH }
    );
  }, [logEvent]);

  const logComplianceAction = useCallback(async (
    framework: string,
    action: string,
    requirementId?: string,
    details?: Record<string, any>
  ) => {
    await logEvent(
      AuditEventType.COMPLIANCE_ASSESSMENT,
      AuditCategory.COMPLIANCE,
      action,
      'compliance_framework',
      { framework, requirementId, ...details },
      { severity: AuditSeverity.MEDIUM }
    );
  }, [logEvent]);

  const logDSARAction = useCallback(async (
    dsarId: string,
    action: string,
    requestType: string,
    details?: Record<string, any>
  ) => {
    const eventType = action.includes('CREATE') ? AuditEventType.DSAR_CREATED :
                     action.includes('PROCESS') ? AuditEventType.DSAR_PROCESSED :
                     action.includes('COMPLETE') ? AuditEventType.DSAR_COMPLETED :
                     action.includes('REJECT') ? AuditEventType.DSAR_REJECTED :
                     AuditEventType.DATA_ACCESS;

    await logEvent(
      eventType,
      AuditCategory.PRIVACY,
      action,
      'dsar_request',
      { requestType, ...details },
      { 
        resourceId: dsarId,
        severity: AuditSeverity.HIGH
      }
    );
  }, [logEvent]);

  const logSecurityEvent = useCallback(async (
    eventDescription: string,
    severity: AuditSeverity,
    details: Record<string, any> = {}
  ) => {
    await logEvent(
      AuditEventType.SECURITY_INCIDENT,
      AuditCategory.SECURITY,
      'SECURITY_EVENT',
      'security',
      { eventDescription, ...details },
      { severity }
    );
  }, [logEvent]);

  const logTenantAction = useCallback(async (
    tenantId: string,
    action: string,
    details?: Record<string, any>
  ) => {
    const eventType = action.includes('CREATE') ? AuditEventType.TENANT_CREATED :
                     action.includes('SWITCH') ? AuditEventType.TENANT_SWITCHED :
                     AuditEventType.TENANT_MODIFIED;

    await logEvent(
      eventType,
      AuditCategory.TENANT_MANAGEMENT,
      action,
      'tenant',
      details || {},
      { 
        resourceId: tenantId,
        severity: AuditSeverity.MEDIUM
      }
    );
  }, [logEvent]);

  const logAIAgentAction = useCallback(async (
    agentId: string,
    action: string,
    agentType: string,
    details?: Record<string, any>
  ) => {
    const eventType = action.includes('ACTIVATE') ? AuditEventType.AI_AGENT_ACTIVATED :
                     action.includes('CONFIGURE') ? AuditEventType.AI_AGENT_CONFIGURED :
                     AuditEventType.AI_AGENT_TASK_EXECUTED;

    await logEvent(
      eventType,
      AuditCategory.AI_OPERATIONS,
      action,
      'ai_agent',
      { agentType, ...details },
      { 
        resourceId: agentId,
        severity: AuditSeverity.MEDIUM
      }
    );
  }, [logEvent]);

  return {
    logEvent,
    logPageView,
    logButtonClick,
    logFormSubmit,
    logDataDownload,
    logSearch,
    logConfigurationChange,
    logComplianceAction,
    logDSARAction,
    logSecurityEvent,
    logTenantAction,
    logAIAgentAction
  };
};

export default useAuditLogger;