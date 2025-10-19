// Example usage of Privacy Comply Agent
// This file demonstrates how to integrate the agent into the PrivacyGuard platform

import { 
  createPrivacyComplyAgent, 
  testSystemReadiness,
  PrivacyComplyAgentFactory 
} from './index';

/**
 * Example: Initialize and use the Privacy Comply Agent
 */
export async function initializePrivacyComplyAgent() {
  try {
    // Test system readiness first
    console.log('Testing system readiness...');
    const readiness = await testSystemReadiness();
    
    if (!readiness.ready) {
      console.error('System not ready:', readiness.issues);
      return null;
    }

    console.log('System ready! Service status:', readiness.serviceStatus);

    // Create agent instance
    console.log('Creating Privacy Comply Agent...');
    const agent = await createPrivacyComplyAgent();

    // Initialize the agent
    await agent.initialize();
    console.log('Privacy Comply Agent initialized successfully');

    return agent;
  } catch (error) {
    console.error('Failed to initialize Privacy Comply Agent:', error);
    return null;
  }
}

/**
 * Example: Run compliance monitoring workflow
 */
export async function runComplianceWorkflow() {
  const agent = await initializePrivacyComplyAgent();
  if (!agent) return;

  try {
    // Start monitoring
    console.log('Starting compliance monitoring...');
    await agent.startMonitoring();

    // Run initial compliance scan
    console.log('Running compliance scan...');
    const scanResults = await agent.runComplianceScan();
    
    console.log(`Found ${scanResults.findings.length} compliance findings`);
    console.log(`Generated ${scanResults.assessments.length} assessments`);
    console.log(`Created ${scanResults.recommendations.length} recommendations`);

    // Execute automated remediation for high-priority issues
    const highPriorityFindings = scanResults.findings
      .filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL')
      .map(f => f.id);

    if (highPriorityFindings.length > 0) {
      console.log(`Executing automated remediation for ${highPriorityFindings.length} high-priority findings...`);
      const remediationResults = await agent.executeAutomatedRemediation(highPriorityFindings);
      
      const successful = remediationResults.filter(r => r.success).length;
      console.log(`Successfully remediated ${successful}/${remediationResults.length} issues`);
    }

    // Generate compliance report
    console.log('Generating compliance summary...');
    const report = await agent.generateComplianceReport('SUMMARY');
    console.log(`Generated report: ${report.id}`);
    console.log(`Executive summary: ${report.executiveSummary.substring(0, 200)}...`);

    // Get compliance health score
    const healthScore = await agent.getComplianceHealthScore();
    console.log(`Overall compliance score: ${healthScore.overallScore}/100`);
    console.log(`Critical issues: ${healthScore.criticalIssues}`);

  } catch (error) {
    console.error('Error in compliance workflow:', error);
  }
}

/**
 * Example: Natural language query interface
 */
export async function demonstrateNaturalLanguageInterface() {
  const agent = await initializePrivacyComplyAgent();
  if (!agent) return;

  const queries = [
    "What are our current GDPR compliance violations?",
    "Show me all S3 buckets with public access containing PII",
    "Generate a DPIA report for our customer data processing",
    "What remediation actions are currently running?",
    "How has our compliance score changed over the last month?"
  ];

  console.log('Demonstrating natural language queries...');
  
  for (const query of queries) {
    try {
      console.log(`\nQuery: ${query}`);
      const response = await agent.processQuery(query);
      
      console.log(`Answer: ${response.answer}`);
      console.log(`Confidence: ${response.confidence}`);
      console.log(`Related findings: ${response.relatedFindings.length}`);
      console.log(`Suggested actions: ${response.suggestedActions.join(', ')}`);
    } catch (error) {
      console.error(`Error processing query "${query}":`, error);
    }
  }
}

/**
 * Example: Integration with PrivacyGuard dashboard
 */
export async function getComplianceDashboardData() {
  const agent = await initializePrivacyComplyAgent();
  if (!agent) return null;

  try {
    // Get system status for dashboard
    const systemStatus = await agent.getSystemStatus();
    
    // Get compliance health score
    const healthScore = await agent.getComplianceHealthScore();
    
    // Get recent findings (this would be implemented in the actual service)
    // const recentFindings = await agent.getRecentFindings(7); // last 7 days
    
    return {
      systemStatus: {
        status: systemStatus.status,
        lastScan: systemStatus.lastScan,
        nextScan: systemStatus.nextScan,
        activeRemediations: systemStatus.activeRemediations
      },
      complianceScore: {
        overall: healthScore.overallScore,
        categories: healthScore.categoryScores,
        criticalIssues: healthScore.criticalIssues,
        trends: healthScore.trends
      },
      // recentFindings: recentFindings || []
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return null;
  }
}

/**
 * Example: Custom configuration
 */
export async function createAgentWithCustomConfig() {
  const factory = PrivacyComplyAgentFactory.getInstance();
  
  const customConfig = {
    aws: {
      region: 'eu-west-1', // European region for GDPR compliance
      profile: 'privacy-compliance'
    },
    services: {
      bedrock: {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        region: 'us-east-1'
      },
      s3: {
        reportsBucket: 'eu-privacy-reports',
        region: 'eu-west-1'
      }
    }
  };

  try {
    const agent = await factory.createAgentWithConfig(customConfig);
    await agent.initialize();
    
    console.log('Agent created with custom configuration');
    return agent;
  } catch (error) {
    console.error('Failed to create agent with custom config:', error);
    return null;
  }
}