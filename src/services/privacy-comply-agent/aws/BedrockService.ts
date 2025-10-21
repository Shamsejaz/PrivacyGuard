import { 
  BedrockRuntimeClient, 
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand
} from '@aws-sdk/client-bedrock-runtime';
import { 
  BedrockClient,
  ListFoundationModelsCommand,
  GetFoundationModelCommand
} from '@aws-sdk/client-bedrock';
import { AWSConfigManager } from '../config/aws-config';

/**
 * Complete AWS Bedrock Service Implementation
 * Handles Claude 3 Sonnet interactions for compliance reasoning
 */
export class BedrockService {
  private bedrockRuntimeClient: BedrockRuntimeClient;
  private bedrockClient: BedrockClient;
  private configManager: AWSConfigManager;
  private modelId: string;

  constructor() {
    this.configManager = AWSConfigManager.getInstance();
    const credentials = this.configManager.getServiceCredentials('bedrock');
    
    this.bedrockRuntimeClient = new BedrockRuntimeClient({
      region: credentials.region,
      credentials: credentials.credentials
    });
    
    this.bedrockClient = new BedrockClient({
      region: credentials.region,
      credentials: credentials.credentials
    });
    
    this.modelId = this.configManager.getServiceConfig().bedrock.modelId;
  }

  /**
   * Invoke Claude 3 Sonnet for compliance reasoning
   */
  async invokeClaudeForCompliance(prompt: string, context?: any): Promise<{
    response: string;
    usage: {
      inputTokens: number;
      outputTokens: number;
    };
    confidence: number;
  }> {
    try {
      const enhancedPrompt = this.buildCompliancePrompt(prompt, context);
      
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          temperature: 0.1, // Low temperature for consistent compliance analysis
          messages: [
            {
              role: 'user',
              content: enhancedPrompt
            }
          ]
        })
      });

      const response = await this.bedrockRuntimeClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return {
        response: responseBody.content[0].text,
        usage: {
          inputTokens: responseBody.usage.input_tokens,
          outputTokens: responseBody.usage.output_tokens
        },
        confidence: this.calculateConfidence(responseBody)
      };
    } catch (error) {
      console.error('Bedrock invocation failed:', error);
      throw new Error(`Claude 3 Sonnet invocation failed: ${error.message}`);
    }
  }

  /**
   * Stream responses for real-time compliance analysis
   */
  async streamComplianceAnalysis(prompt: string, context?: any): Promise<AsyncIterable<string>> {
    const enhancedPrompt = this.buildCompliancePrompt(prompt, context);
    
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ]
      })
    });

    const response = await this.bedrockRuntimeClient.send(command);
    
    return this.processStreamResponse(response.body);
  }

  /**
   * Analyze compliance findings using Claude 3 Sonnet
   */
  async analyzeComplianceFindings(findings: any[]): Promise<{
    analysis: string;
    riskScore: number;
    recommendations: string[];
    priorityActions: string[];
  }> {
    const prompt = `
    As a privacy compliance expert, analyze these compliance findings and provide:
    1. Detailed analysis of compliance risks
    2. Risk score (0-100)
    3. Specific remediation recommendations
    4. Priority actions for immediate attention

    Findings:
    ${JSON.stringify(findings, null, 2)}
    
    Focus on GDPR, CCPA, HIPAA, and PDPL compliance requirements.
    `;

    const response = await this.invokeClaudeForCompliance(prompt, { 
      type: 'compliance_analysis',
      findingsCount: findings.length 
    });

    return this.parseComplianceAnalysis(response.response);
  }

  /**
   * Generate compliance reports using AI
   */
  async generateComplianceReport(type: 'DPIA' | 'ROPA' | 'AUDIT', data: any): Promise<{
    report: string;
    executiveSummary: string;
    recommendations: string[];
  }> {
    const prompt = this.buildReportPrompt(type, data);
    
    const response = await this.invokeClaudeForCompliance(prompt, {
      type: 'report_generation',
      reportType: type
    });

    return this.parseReportResponse(response.response);
  }

  /**
   * Process natural language queries about compliance
   */
  async processComplianceQuery(query: string, context: any): Promise<{
    answer: string;
    sources: string[];
    confidence: number;
    followUpQuestions: string[];
  }> {
    const prompt = `
    As a privacy compliance expert, answer this question based on the provided context:
    
    Question: ${query}
    
    Context:
    ${JSON.stringify(context, null, 2)}
    
    Provide:
    1. Clear, accurate answer
    2. Relevant sources/references
    3. Confidence level
    4. Follow-up questions the user might have
    
    Focus on actionable compliance guidance.
    `;

    const response = await this.invokeClaudeForCompliance(prompt, {
      type: 'query_processing',
      query: query
    });

    return this.parseQueryResponse(response.response);
  }

  /**
   * List available foundation models
   */
  async listFoundationModels(): Promise<any[]> {
    try {
      const command = new ListFoundationModelsCommand({});
      const response = await this.bedrockClient.send(command);
      return response.modelSummaries || [];
    } catch (error) {
      console.error('Failed to list foundation models:', error);
      return [];
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId?: string): Promise<any> {
    try {
      const command = new GetFoundationModelCommand({
        modelIdentifier: modelId || this.modelId
      });
      const response = await this.bedrockClient.send(command);
      return response.modelDetails;
    } catch (error) {
      console.error('Failed to get model info:', error);
      return null;
    }
  }

  // Private helper methods

  private buildCompliancePrompt(prompt: string, context?: any): string {
    const systemContext = `
    You are an expert privacy compliance AI assistant specializing in:
    - GDPR (General Data Protection Regulation)
    - CCPA (California Consumer Privacy Act)
    - HIPAA (Health Insurance Portability and Accountability Act)
    - PDPL (Personal Data Protection Law)
    
    Always provide accurate, actionable compliance guidance.
    Consider legal requirements, best practices, and risk mitigation.
    `;

    const contextInfo = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
    
    return `${systemContext}\n\nUser Request: ${prompt}${contextInfo}`;
  }

  private buildReportPrompt(type: string, data: any): string {
    const reportTemplates = {
      DPIA: `Generate a comprehensive Data Protection Impact Assessment (DPIA) report`,
      ROPA: `Generate a detailed Records of Processing Activities (ROPA) report`,
      AUDIT: `Generate a thorough compliance audit report`
    };

    return `
    ${reportTemplates[type]} based on the following data:
    
    ${JSON.stringify(data, null, 2)}
    
    Include:
    1. Executive Summary
    2. Detailed Analysis
    3. Risk Assessment
    4. Recommendations
    5. Action Items
    
    Format as a professional compliance document.
    `;
  }

  private calculateConfidence(responseBody: any): number {
    // Calculate confidence based on response characteristics
    const textLength = responseBody.content[0].text.length;
    const hasSpecificRecommendations = responseBody.content[0].text.includes('recommend');
    const hasRiskAssessment = responseBody.content[0].text.includes('risk');
    
    let confidence = 0.7; // Base confidence
    
    if (textLength > 500) confidence += 0.1;
    if (hasSpecificRecommendations) confidence += 0.1;
    if (hasRiskAssessment) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private async *processStreamResponse(body: any): AsyncIterable<string> {
    for await (const chunk of body) {
      if (chunk.chunk?.bytes) {
        const chunkData = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
        if (chunkData.type === 'content_block_delta') {
          yield chunkData.delta.text;
        }
      }
    }
  }

  private parseComplianceAnalysis(response: string): any {
    // Parse structured response from Claude
    try {
      const sections = response.split('\n\n');
      return {
        analysis: sections[0] || response,
        riskScore: this.extractRiskScore(response),
        recommendations: this.extractRecommendations(response),
        priorityActions: this.extractPriorityActions(response)
      };
    } catch (error) {
      return {
        analysis: response,
        riskScore: 50,
        recommendations: ['Review compliance findings manually'],
        priorityActions: ['Conduct detailed analysis']
      };
    }
  }

  private parseReportResponse(response: string): any {
    const sections = response.split('\n## ');
    return {
      report: response,
      executiveSummary: sections.find(s => s.includes('Executive Summary')) || '',
      recommendations: this.extractRecommendations(response)
    };
  }

  private parseQueryResponse(response: string): any {
    return {
      answer: response,
      sources: this.extractSources(response),
      confidence: 0.85,
      followUpQuestions: this.extractFollowUpQuestions(response)
    };
  }

  private extractRiskScore(text: string): number {
    const match = text.match(/risk score[:\s]*(\d+)/i);
    return match ? parseInt(match[1]) : 50;
  }

  private extractRecommendations(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('recommend') || line.match(/^\d+\./))
      .slice(0, 5);
  }

  private extractPriorityActions(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('priority') || line.includes('immediate'))
      .slice(0, 3);
  }

  private extractSources(text: string): string[] {
    const sources = text.match(/\[(.*?)\]/g) || [];
    return sources.map(s => s.replace(/[\[\]]/g, ''));
  }

  private extractFollowUpQuestions(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('?'))
      .slice(0, 3);
  }
}

export default BedrockService;