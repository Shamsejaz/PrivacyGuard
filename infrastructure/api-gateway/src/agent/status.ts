import { APIGatewayProxyHandler } from 'aws-lambda';
import { BedrockAgentService } from '../../../src/services/privacy-comply-agent/bedrock-agents/BedrockAgentService';
import { DynamoDBService } from '../services/DynamoDBService';
import { ResponseBuilder } from '../utils/ResponseBuilder';

/**
 * API Gateway Lambda function for Privacy Comply Agent status
 */
export const handler: APIGatewayProxyHandler = async (event, context) => {
  try {
    console.log('Agent status request:', JSON.stringify(event, null, 2));
    
    const bedrockAgent = new BedrockAgentService();
    const dynamoDB = new DynamoDBService();
    
    // Get agent health status
    const agentHealth = await checkAgentHealth(bedrockAgent);
    
    // Get recent scan results
    const recentScans = await dynamoDB.getRecentScans(5);
    
    // Get active remediations
    const activeRemediations = await dynamoDB.getActiveRemediations();
    
    // Calculate compliance metrics
    const complianceMetrics = await calculateComplianceMetrics(dynamoDB);
    
    const status = {
      agent: {
        status: agentHealth.status,
        initialized: agentHealth.initialized,
        lastHealthCheck: new Date().toISOString(),
        version: '2.0.0-bedrock'
      },
      monitoring: {
        enabled: true,
        lastScan: recentScans[0]?.timestamp || null,
        nextScan: calculateNextScanTime(),
        scanInterval: 3600000 // 1 hour
      },
      services: {
        bedrock: agentHealth.bedrockAvailable,
        dynamodb: true,
        s3: true,
        lambda: true
      },
      metrics: complianceMetrics,
      activeWorkflows: {
        scans: recentScans.filter(s => s.status === 'running').length,
        remediations: activeRemediations.length
      }
    };
    
    return ResponseBuilder.success(status);
    
  } catch (error) {
    console.error('Agent status error:', error);
    return ResponseBuilder.error('Failed to get agent status', 500);
  }
};

async function checkAgentHealth(bedrockAgent: BedrockAgentService): Promise<any> {
  try {
    // Test Bedrock Agent connectivity
    const testResponse = await bedrockAgent.invokeAgent('Health check');
    
    return {
      status: 'HEALTHY',
      initialized: true,
      bedrockAvailable: true
    };
  } catch (error) {
    console.error('Agent health check failed:', error);
    return {
      status: 'UNHEALTHY',
      initialized: false,
      bedrockAvailable: false
    };
  }
}

async function calculateComplianceMetrics(dynamoDB: DynamoDBService): Promise<any> {
  const findings = await dynamoDB.getRecentFindings(100);
  
  const metrics = {
    totalFindings: findings.length,
    criticalFindings: findings.filter(f => f.severity === 'CRITICAL').length,
    highFindings: findings.filter(f => f.severity === 'HIGH').length,
    mediumFindings: findings.filter(f => f.severity === 'MEDIUM').length,
    lowFindings: findings.filter(f => f.severity === 'LOW').length,
    overallScore: calculateOverallScore(findings),
    trends: calculateTrends(findings)
  };
  
  return metrics;
}

function calculateOverallScore(findings: any[]): number {
  if (findings.length === 0) return 100;
  
  const severityWeights = { CRITICAL: 10, HIGH: 5, MEDIUM: 2, LOW: 1 };
  const totalWeight = findings.reduce((sum, finding) => {
    return sum + (severityWeights[finding.severity] || 1);
  }, 0);
  
  const maxPossibleWeight = findings.length * 10;
  return Math.max(0, 100 - (totalWeight / maxPossibleWeight) * 100);
}

function calculateTrends(findings: any[]): any[] {
  // Calculate 7-day and 30-day trends
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  const recent7Days = findings.filter(f => f.timestamp > sevenDaysAgo);
  const recent30Days = findings.filter(f => f.timestamp > thirtyDaysAgo);
  
  return [
    {
      period: '7d',
      findings: recent7Days.length,
      criticalFindings: recent7Days.filter(f => f.severity === 'CRITICAL').length,
      trend: recent7Days.length > findings.length * 0.2 ? 'increasing' : 'stable'
    },
    {
      period: '30d', 
      findings: recent30Days.length,
      criticalFindings: recent30Days.filter(f => f.severity === 'CRITICAL').length,
      trend: recent30Days.length > findings.length * 0.7 ? 'increasing' : 'decreasing'
    }
  ];
}

function calculateNextScanTime(): string {
  return new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
}