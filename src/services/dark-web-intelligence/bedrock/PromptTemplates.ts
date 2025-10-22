/**
 * Prompt Templates for Bedrock Threat Intelligence Analysis
 * Provides structured prompts for different types of threat analysis
 */

import { ExposureType, DataClassification, ThreatIntelSource } from '../types';

export interface PromptContext {
  exposureType: ExposureType;
  dataClassification: DataClassification;
  source: ThreatIntelSource;
  organizationContext?: string;
  regulatoryContext?: string[];
}

export class ThreatAnalysisPrompts {
  /**
   * System prompt for threat intelligence analysis
   */
  static getSystemPrompt(): string {
    return `You are a cybersecurity threat intelligence analyst specializing in dark web monitoring and data breach analysis. Your role is to:

1. Analyze threat intelligence data for risk assessment
2. Identify potential business and regulatory impacts
3. Recommend appropriate response actions
4. Generate sanitized summaries that protect sensitive information
5. Assess confidence levels and data reliability

Guidelines:
- Always prioritize data protection and privacy
- Provide actionable, specific recommendations
- Consider regulatory compliance requirements (GDPR, CCPA, HIPAA, PDPL)
- Assess both technical and business risks
- Maintain objectivity and evidence-based analysis
- Never include actual PII or sensitive data in responses
- Use risk scoring from 0-100 (0=no risk, 100=critical risk)
- Provide confidence scores from 0-1 (0=no confidence, 1=certain)`;
  }

  /**
   * Generate threat analysis prompt
   */
  static getThreatAnalysisPrompt(
    threatData: string,
    context: PromptContext
  ): string {
    return `Analyze the following threat intelligence data and provide a comprehensive risk assessment:

**Threat Data:**
${threatData}

**Context:**
- Exposure Type: ${context.exposureType}
- Data Classification: ${context.dataClassification}
- Source: ${context.source}
${context.organizationContext ? `- Organization Context: ${context.organizationContext}` : ''}
${context.regulatoryContext ? `- Regulatory Requirements: ${context.regulatoryContext.join(', ')}` : ''}

**Required Analysis:**

1. **Risk Assessment** (provide numerical scores):
   - Overall Risk Score (0-100)
   - Confidence Level (0-1)
   - Urgency Level (low/medium/high/critical)

2. **Impact Analysis:**
   - Business Impact (describe potential consequences)
   - Regulatory Impact (compliance violations, notification requirements)
   - Technical Impact (systems, data, operations affected)

3. **Threat Classification:**
   - Threat Type (credential theft, data breach, corporate espionage, etc.)
   - Attack Vector (how the data was likely compromised)
   - Threat Actor Profile (if determinable)

4. **Recommendations:**
   - Immediate Actions (within 24 hours)
   - Short-term Actions (within 1 week)
   - Long-term Actions (strategic improvements)
   - Escalation Requirements (who needs to be notified)

5. **Compliance Considerations:**
   - Breach Notification Requirements
   - Regulatory Reporting Obligations
   - Documentation Requirements
   - Legal Considerations

Provide your analysis in structured JSON format with clear, actionable insights.`;
  }

  /**
   * Generate PII redaction prompt
   */
  static getPIIRedactionPrompt(content: string): string {
    return `Analyze the following content and create a sanitized version that removes all personally identifiable information (PII) while preserving the threat intelligence value:

**Original Content:**
${content}

**Redaction Requirements:**
- Remove all email addresses, phone numbers, physical addresses
- Remove names, usernames, and personal identifiers
- Remove credit card numbers, SSNs, and financial information
- Remove API keys, passwords, and authentication tokens
- Replace with generic placeholders (e.g., [EMAIL], [NAME], [PHONE])
- Preserve threat context and technical details
- Maintain data structure and relationships where possible

**Output Format:**
Provide two sections:
1. **Sanitized Content:** The redacted version suitable for sharing
2. **Redaction Log:** List of what was redacted and replacement patterns used

Ensure the sanitized content maintains its analytical value while protecting all sensitive information.`;
  }

  /**
   * Generate risk scoring prompt
   */
  static getRiskScoringPrompt(
    finding: any,
    businessContext?: string
  ): string {
    return `Calculate a comprehensive risk score for this dark web finding:

**Finding Details:**
${JSON.stringify(finding, null, 2)}

${businessContext ? `**Business Context:**\n${businessContext}` : ''}

**Risk Scoring Criteria:**

1. **Data Sensitivity (0-25 points):**
   - Public information: 0-5 points
   - Internal data: 6-10 points
   - Confidential data: 11-20 points
   - Restricted/regulated data: 21-25 points

2. **Exposure Scope (0-25 points):**
   - Single record: 0-5 points
   - Multiple records: 6-15 points
   - Database/system access: 16-20 points
   - Enterprise-wide exposure: 21-25 points

3. **Recency & Availability (0-25 points):**
   - Historical/archived: 0-5 points
   - Recent but limited access: 6-15 points
   - Currently available: 16-20 points
   - Actively traded/distributed: 21-25 points

4. **Potential Impact (0-25 points):**
   - Minimal business impact: 0-5 points
   - Operational disruption: 6-10 points
   - Financial/reputational damage: 11-20 points
   - Critical business/regulatory impact: 21-25 points

**Required Output:**
- Total Risk Score (0-100)
- Breakdown by category
- Confidence Level (0-1)
- Risk Justification
- Recommended Priority Level`;
  }

  /**
   * Generate action recommendation prompt
   */
  static getActionRecommendationPrompt(
    analysis: any,
    organizationCapabilities?: string[]
  ): string {
    return `Based on the threat analysis, recommend specific response actions:

**Threat Analysis:**
${JSON.stringify(analysis, null, 2)}

${organizationCapabilities ? `**Organization Capabilities:**\n${organizationCapabilities.join(', ')}` : ''}

**Action Categories:**

1. **Immediate Response (0-24 hours):**
   - Critical security measures
   - Stakeholder notifications
   - Evidence preservation
   - Initial containment

2. **Short-term Actions (1-7 days):**
   - Detailed investigation
   - Takedown requests
   - System hardening
   - Communication planning

3. **Long-term Actions (1+ weeks):**
   - Process improvements
   - Security enhancements
   - Monitoring expansion
   - Training and awareness

**For Each Recommendation:**
- Specific action description
- Priority level (critical/high/medium/low)
- Estimated effort/resources required
- Success criteria
- Dependencies and prerequisites
- Risk if not completed

**Escalation Matrix:**
- Who needs immediate notification
- Approval requirements for actions
- External parties to involve (legal, PR, regulators)
- Communication templates

Provide actionable, prioritized recommendations with clear implementation guidance.`;
  }

  /**
   * Generate compliance report prompt
   */
  static getComplianceReportPrompt(
    findings: any[],
    regulations: string[]
  ): string {
    return `Generate a compliance-focused report for the following dark web findings:

**Findings:**
${JSON.stringify(findings, null, 2)}

**Applicable Regulations:**
${regulations.join(', ')}

**Report Requirements:**

1. **Executive Summary:**
   - High-level risk overview
   - Key compliance implications
   - Recommended actions summary

2. **Regulatory Analysis:**
   - Breach notification requirements
   - Reporting timelines and authorities
   - Potential penalties and consequences
   - Documentation obligations

3. **Risk Assessment:**
   - Data subjects affected
   - Types of personal data involved
   - Likelihood of harm to individuals
   - Organizational risk exposure

4. **Remediation Plan:**
   - Immediate containment measures
   - Investigation procedures
   - Notification processes
   - Preventive measures

5. **Documentation Requirements:**
   - Evidence preservation
   - Incident documentation
   - Communication records
   - Compliance audit trail

**Output Format:**
Structure as a formal compliance report suitable for:
- Internal stakeholders (executives, legal, compliance)
- External auditors
- Regulatory authorities (if required)
- Legal proceedings (if necessary)

Ensure all recommendations are specific, actionable, and compliance-focused.`;
  }

  /**
   * Generate summary prompt for dashboard display
   */
  static getSummaryPrompt(analysis: any): string {
    return `Create a concise executive summary of this threat analysis for dashboard display:

**Analysis Data:**
${JSON.stringify(analysis, null, 2)}

**Summary Requirements:**
- Maximum 200 words
- Executive-level language
- Key risks and impacts highlighted
- Clear action items
- No technical jargon
- Suitable for C-level audience

**Format:**
- Risk Level: [Critical/High/Medium/Low]
- Key Threat: [Brief description]
- Business Impact: [Primary concern]
- Immediate Actions: [Top 2-3 actions]
- Timeline: [Urgency indicator]

Keep it concise, clear, and action-oriented.`;
  }

  /**
   * Generate trend analysis prompt
   */
  static getTrendAnalysisPrompt(
    historicalFindings: any[],
    timeframe: string
  ): string {
    return `Analyze trends in dark web findings over the specified timeframe:

**Historical Findings:**
${JSON.stringify(historicalFindings, null, 2)}

**Timeframe:** ${timeframe}

**Trend Analysis Requirements:**

1. **Volume Trends:**
   - Finding frequency over time
   - Peak periods and patterns
   - Seasonal variations

2. **Risk Trends:**
   - Risk score evolution
   - Severity distribution changes
   - Emerging threat types

3. **Source Analysis:**
   - Most active threat sources
   - Source reliability trends
   - New source emergence

4. **Impact Patterns:**
   - Business impact evolution
   - Regulatory implications trends
   - Response effectiveness

5. **Predictive Insights:**
   - Likely future trends
   - Emerging risks
   - Recommended monitoring adjustments

**Output:**
Provide actionable trend insights with recommendations for improving threat detection and response strategies.`;
  }
}

export default ThreatAnalysisPrompts;