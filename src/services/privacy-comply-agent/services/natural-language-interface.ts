// Natural Language Interface Service
import {
  ConversationContext,
  QueryResponse,
  ComplianceReport,
  ComplianceFinding,
  ComplianceAssessment,
  LegalMapping
} from '../types';
import { AWSServiceClients } from '../config/service-clients';

/**
 * Query intent classification for routing queries to appropriate handlers
 */
export enum QueryIntent {
  COMPLIANCE_STATUS = 'compliance_status',
  FINDING_EXPLANATION = 'finding_explanation',
  LEGAL_MAPPING = 'legal_mapping',
  REMEDIATION_GUIDANCE = 'remediation_guidance',
  REPORT_GENERATION = 'report_generation',
  RISK_ASSESSMENT = 'risk_assessment',
  REGULATION_INQUIRY = 'regulation_inquiry',
  GENERAL_HELP = 'general_help'
}

/**
 * Parsed query structure with extracted entities and intent
 */
export interface ParsedQuery {
  intent: QueryIntent;
  entities: {
    regulations?: string[];
    resources?: string[];
    timeframe?: string;
    severity?: string;
    department?: string;
  };
  confidence: number;
  originalQuery: string;
}

/**
 * Legal context for responses
 */
export interface LegalContext {
  applicableRegulations: string[];
  relevantArticles: LegalMapping[];
  complianceRequirements: string[];
  penalties: string[];
}

/**
 * Natural Language Interface
 * Provides conversational access to compliance information and system capabilities
 */
export interface NaturalLanguageInterface {
  /**
   * Process a natural language query about compliance
   * Returns structured response with relevant information and actions
   */
  processQuery(query: string, context?: ConversationContext): Promise<QueryResponse>;

  /**
   * Parse natural language query to extract intent and entities
   */
  parseQuery(query: string): Promise<ParsedQuery>;

  /**
   * Generate response with legal context
   */
  generateResponseWithLegalContext(
    parsedQuery: ParsedQuery,
    findings: ComplianceFinding[],
    assessments: ComplianceAssessment[]
  ): Promise<QueryResponse>;

  /**
   * Generate natural language summary of a compliance report
   * Creates human-readable executive summaries
   */
  generateNaturalLanguageReport(report: ComplianceReport): Promise<string>;

  /**
   * Explain a compliance finding in natural language
   * Provides detailed explanation of violations and implications
   */
  explainFinding(findingId: string): Promise<string>;

  /**
   * Suggest relevant queries based on current context
   * Helps users discover available information and actions
   */
  suggestQueries(): Promise<string[]>;

  /**
   * Generate contextual query suggestions based on conversation history
   * Provides personalized suggestions based on user's conversation patterns
   */
  generateContextualQuerySuggestions(conversationId: string): Promise<string[]>;

  /**
   * Start a new conversation session
   */
  startConversation(userId: string): Promise<string>;

  /**
   * End a conversation session
   */
  endConversation(conversationId: string): Promise<void>;

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId: string): Promise<{
    query: string;
    response: QueryResponse;
    timestamp: Date;
  }[]>;

  /**
   * Update conversation context with new information
   */
  updateContext(conversationId: string, context: Record<string, any>): Promise<void>;

  /**
   * Generate compliance training content based on findings
   */
  generateTrainingContent(findings: ComplianceFinding[]): Promise<{
    title: string;
    content: string;
    keyPoints: string[];
    resources: string[];
  }>;

  /**
   * Translate compliance information to different languages
   */
  translateContent(content: string, targetLanguage: string): Promise<string>;

  /**
   * Track conversation context with enhanced intent and entity history
   */
  trackConversationContext(
    conversationId: string,
    parsedQuery: ParsedQuery,
    response: QueryResponse
  ): Promise<void>;

  /**
   * Format response with conversation context for enhanced presentation
   */
  formatResponseWithContext(
    response: QueryResponse,
    conversationId: string
  ): {
    formattedAnswer: string;
    contextualInfo: {
      conversationLength: number;
      relatedTopics: string[];
      suggestedFollowUps: string[];
    };
    metadata: {
      confidence: string;
      sources: string[];
      findingsCount: number;
      actionsCount: number;
    };
  };

  /**
   * Get conversation statistics and analytics
   */
  getConversationStats(conversationId: string): Promise<{
    totalQueries: number;
    averageConfidence: number;
    topIntents: { intent: string; count: number }[];
    duration: number;
    lastActivity: Date;
  }>;
}

/**
 * Implementation class for Natural Language Interface
 */
export class NaturalLanguageInterfaceImpl implements NaturalLanguageInterface {
  private serviceClients: AWSServiceClients;
  private conversationStore: Map<string, ConversationContext> = new Map();
  private findingsCache: Map<string, ComplianceFinding> = new Map();
  private assessmentsCache: Map<string, ComplianceAssessment> = new Map();

  constructor() {
    this.serviceClients = AWSServiceClients.getInstance();
  }

  /**
   * Process a natural language query about compliance
   */
  async processQuery(query: string, context?: ConversationContext): Promise<QueryResponse> {
    try {
      // Parse the query to understand intent and extract entities
      const parsedQuery = await this.parseQuery(query);
      
      // Enhance query parsing with conversation context
      if (context) {
        await this.enhanceQueryWithContext(parsedQuery, context);
      }
      
      // Get relevant findings and assessments based on the query
      const findings = await this.getRelevantFindings(parsedQuery);
      const assessments = await this.getRelevantAssessments(parsedQuery);
      
      // Generate response with legal context
      const response = await this.generateResponseWithLegalContext(
        parsedQuery,
        findings,
        assessments
      );

      // Update conversation context if provided
      if (context) {
        await this.updateQueryContext(context, query, response);
        await this.trackConversationContext(context.conversationId, parsedQuery, response);
      }

      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      return {
        answer: 'I apologize, but I encountered an error processing your query. Please try rephrasing your question or contact support if the issue persists.',
        confidence: 0,
        sources: [],
        relatedFindings: [],
        suggestedActions: ['Try rephrasing your question', 'Contact support'],
        conversationId: context?.conversationId || 'error-session'
      };
    }
  }

  /**
   * Enhance query parsing with conversation context
   */
  private async enhanceQueryWithContext(
    parsedQuery: ParsedQuery,
    context: ConversationContext
  ): Promise<void> {
    try {
      const conversationContext = this.conversationStore.get(context.conversationId);
      if (!conversationContext) {
        return;
      }

      // Use previous entities to fill gaps in current query
      const lastEntities = conversationContext.context.lastEntities;
      if (lastEntities) {
        // If current query lacks regulation context but previous queries had it
        if (!parsedQuery.entities.regulations && lastEntities.regulations) {
          parsedQuery.entities.regulations = lastEntities.regulations;
          parsedQuery.confidence = Math.min(parsedQuery.confidence + 0.1, 0.95);
        }

        // If current query lacks resource context but previous queries had it
        if (!parsedQuery.entities.resources && lastEntities.resources) {
          parsedQuery.entities.resources = lastEntities.resources;
          parsedQuery.confidence = Math.min(parsedQuery.confidence + 0.05, 0.95);
        }

        // If current query lacks department context but previous queries had it
        if (!parsedQuery.entities.department && lastEntities.department) {
          parsedQuery.entities.department = lastEntities.department;
        }
      }

      // Use conversation topics to enhance understanding
      const topics = conversationContext.context.topics || [];
      if (topics.length > 0 && parsedQuery.confidence < 0.7) {
        // Boost confidence if query relates to established conversation topics
        const queryLower = parsedQuery.originalQuery.toLowerCase();
        for (const topic of topics) {
          if (queryLower.includes(topic.replace('-', ' '))) {
            parsedQuery.confidence = Math.min(parsedQuery.confidence + 0.15, 0.9);
            break;
          }
        }
      }

      // Use user preferences to enhance entity extraction
      const preferences = conversationContext.context.preferences;
      if (preferences) {
        // Add preferred regulations if none specified
        if (!parsedQuery.entities.regulations && preferences.preferredRegulations?.length > 0) {
          parsedQuery.entities.regulations = preferences.preferredRegulations.slice(0, 2);
        }
      }

    } catch (error) {
      console.error('Error enhancing query with context:', error);
      // Don't throw - query processing should continue
    }
  }

  /**
   * Parse natural language query to extract intent and entities
   * Enhanced with advanced pattern matching and entity extraction
   */
  async parseQuery(query: string): Promise<ParsedQuery> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Enhanced intent classification with multiple pattern matching approaches
    let intent = QueryIntent.GENERAL_HELP;
    let confidence = 0.5;

    // Use multiple classification methods for better accuracy
    const intentScores = await this.classifyQueryIntent(normalizedQuery);
    const topIntent = this.getTopIntent(intentScores);
    
    intent = topIntent.intent;
    confidence = topIntent.confidence;

    // Extract entities from the query using enhanced extraction
    const entities = await this.extractEntitiesAdvanced(normalizedQuery);

    // Validate and adjust confidence based on entity extraction quality
    const adjustedConfidence = this.adjustConfidenceBasedOnEntities(confidence, entities);

    return {
      intent,
      entities,
      confidence: adjustedConfidence,
      originalQuery: query
    };
  }

  /**
   * Enhanced query intent classification using multiple approaches
   */
  private async classifyQueryIntent(query: string): Promise<Record<QueryIntent, number>> {
    const scores: Record<QueryIntent, number> = {
      [QueryIntent.COMPLIANCE_STATUS]: 0,
      [QueryIntent.FINDING_EXPLANATION]: 0,
      [QueryIntent.LEGAL_MAPPING]: 0,
      [QueryIntent.REMEDIATION_GUIDANCE]: 0,
      [QueryIntent.REPORT_GENERATION]: 0,
      [QueryIntent.RISK_ASSESSMENT]: 0,
      [QueryIntent.REGULATION_INQUIRY]: 0,
      [QueryIntent.GENERAL_HELP]: 0.1 // Base score for fallback
    };

    // Pattern-based classification with weighted scoring
    const patterns = {
      [QueryIntent.COMPLIANCE_STATUS]: {
        primary: ['compliance status', 'how compliant', 'compliance score', 'overall compliance'],
        secondary: ['dashboard', 'summary', 'overview', 'current state'],
        keywords: ['compliant', 'status', 'score', 'level', 'posture']
      },
      [QueryIntent.FINDING_EXPLANATION]: {
        primary: ['explain finding', 'what is finding', 'finding details', 'violation details'],
        secondary: ['why is this', 'what does this mean', 'help me understand'],
        keywords: ['explain', 'finding', 'violation', 'issue', 'problem', 'details']
      },
      [QueryIntent.LEGAL_MAPPING]: {
        primary: ['gdpr article', 'ccpa section', 'pdpl article', 'legal requirement'],
        secondary: ['regulation', 'law', 'article', 'compliance requirement'],
        keywords: ['gdpr', 'ccpa', 'pdpl', 'hipaa', 'article', 'section', 'legal', 'regulation']
      },
      [QueryIntent.REMEDIATION_GUIDANCE]: {
        primary: ['how to fix', 'remediation', 'resolve', 'fix this', 'solve'],
        secondary: ['recommendation', 'what should i do', 'next steps', 'action plan'],
        keywords: ['fix', 'resolve', 'remediate', 'solve', 'action', 'steps', 'how']
      },
      [QueryIntent.REPORT_GENERATION]: {
        primary: ['generate report', 'create report', 'dpia', 'ropa', 'audit report'],
        secondary: ['compliance report', 'export', 'download report', 'documentation'],
        keywords: ['report', 'generate', 'create', 'dpia', 'ropa', 'audit', 'export']
      },
      [QueryIntent.RISK_ASSESSMENT]: {
        primary: ['risk assessment', 'risk score', 'risk level', 'how risky'],
        secondary: ['security risk', 'privacy risk', 'risk analysis', 'threat level'],
        keywords: ['risk', 'assessment', 'score', 'level', 'threat', 'vulnerability']
      },
      [QueryIntent.REGULATION_INQUIRY]: {
        primary: ['what is gdpr', 'ccpa requirements', 'pdpl compliance', 'regulation overview'],
        secondary: ['privacy law', 'data protection', 'regulatory requirements'],
        keywords: ['gdpr', 'ccpa', 'pdpl', 'hipaa', 'privacy', 'protection', 'law']
      }
    };

    // Calculate scores for each intent
    for (const [intentKey, patternSet] of Object.entries(patterns)) {
      const intent = intentKey as QueryIntent;
      let score = 0;

      // Primary patterns (high weight)
      for (const pattern of patternSet.primary) {
        if (query.includes(pattern)) {
          score += 0.8;
        }
      }

      // Secondary patterns (medium weight)
      for (const pattern of patternSet.secondary) {
        if (query.includes(pattern)) {
          score += 0.5;
        }
      }

      // Keyword matching (lower weight but cumulative)
      for (const keyword of patternSet.keywords) {
        if (query.includes(keyword)) {
          score += 0.2;
        }
      }

      // Normalize score to 0-1 range
      scores[intent] = Math.min(score, 1.0);
    }

    // Apply contextual boosting based on query structure
    scores[QueryIntent.COMPLIANCE_STATUS] += this.getStructuralBoost(query, ['what', 'how', 'status', 'current']);
    scores[QueryIntent.FINDING_EXPLANATION] += this.getStructuralBoost(query, ['explain', 'why', 'what', 'mean']);
    scores[QueryIntent.REMEDIATION_GUIDANCE] += this.getStructuralBoost(query, ['how', 'fix', 'solve', 'do']);
    scores[QueryIntent.REPORT_GENERATION] += this.getStructuralBoost(query, ['generate', 'create', 'show', 'give']);

    return scores;
  }

  /**
   * Get structural boost based on question words and patterns
   */
  private getStructuralBoost(query: string, boostWords: string[]): number {
    let boost = 0;
    const words = query.split(' ');
    
    // Question word at beginning gets higher boost
    if (boostWords.includes(words[0])) {
      boost += 0.3;
    }
    
    // Question words anywhere get smaller boost
    for (const word of words) {
      if (boostWords.includes(word)) {
        boost += 0.1;
      }
    }
    
    return Math.min(boost, 0.5);
  }

  /**
   * Get the top intent from classification scores
   */
  private getTopIntent(scores: Record<QueryIntent, number>): { intent: QueryIntent; confidence: number } {
    let topIntent = QueryIntent.GENERAL_HELP;
    let maxScore = 0;

    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        topIntent = intent as QueryIntent;
      }
    }

    // Ensure minimum confidence threshold
    const confidence = Math.max(maxScore, 0.3);

    return { intent: topIntent, confidence };
  }

  /**
   * Advanced entity extraction with improved accuracy
   */
  private async extractEntitiesAdvanced(query: string): Promise<ParsedQuery['entities']> {
    const entities: ParsedQuery['entities'] = {};

    // Enhanced regulation extraction with variations
    const regulationPatterns = {
      'GDPR': ['gdpr', 'general data protection regulation', 'european privacy', 'eu privacy'],
      'CCPA': ['ccpa', 'california consumer privacy act', 'california privacy', 'ca privacy'],
      'PDPL': ['pdpl', 'personal data protection law', 'saudi privacy', 'ksa privacy'],
      'HIPAA': ['hipaa', 'health insurance portability', 'healthcare privacy', 'medical privacy']
    };

    const regulations = [];
    for (const [regulation, patterns] of Object.entries(regulationPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        regulations.push(regulation);
      }
    }
    if (regulations.length > 0) entities.regulations = regulations;

    // Enhanced severity extraction with context
    const severityPatterns = {
      'CRITICAL': ['critical', 'severe', 'urgent', 'immediate', 'emergency'],
      'HIGH': ['high', 'important', 'significant', 'major', 'serious'],
      'MEDIUM': ['medium', 'moderate', 'normal', 'standard'],
      'LOW': ['low', 'minor', 'small', 'trivial']
    };

    for (const [severity, patterns] of Object.entries(severityPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        entities.severity = severity;
        break; // Take the first match
      }
    }

    // Enhanced timeframe extraction with relative dates
    const timeframePatterns = {
      '1h': ['last hour', 'past hour', '1 hour', 'one hour'],
      '24h': ['today', '24 hours', 'last day', 'past day', 'one day'],
      '7d': ['week', 'last week', 'past week', '7 days', 'seven days'],
      '30d': ['month', 'last month', 'past month', '30 days', 'thirty days'],
      '90d': ['quarter', 'last quarter', '90 days', 'three months'],
      '365d': ['year', 'last year', 'past year', '365 days', 'twelve months']
    };

    for (const [timeframe, patterns] of Object.entries(timeframePatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        entities.timeframe = timeframe;
        break;
      }
    }

    // Enhanced resource extraction with AWS service names
    const resourcePatterns = {
      'S3': ['s3', 'bucket', 'storage', 'object storage'],
      'IAM': ['iam', 'role', 'policy', 'user', 'permission', 'access'],
      'Lambda': ['lambda', 'function', 'serverless'],
      'RDS': ['rds', 'database', 'db', 'mysql', 'postgres'],
      'EC2': ['ec2', 'instance', 'server', 'compute'],
      'CloudTrail': ['cloudtrail', 'audit', 'log', 'trail'],
      'VPC': ['vpc', 'network', 'subnet', 'security group']
    };

    const resources = [];
    for (const [resource, patterns] of Object.entries(resourcePatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        resources.push(resource);
      }
    }
    if (resources.length > 0) entities.resources = resources;

    // Extract department/organizational context
    const departmentPatterns = {
      'IT': ['it', 'information technology', 'tech', 'engineering'],
      'Security': ['security', 'infosec', 'cybersecurity', 'sec'],
      'Legal': ['legal', 'compliance', 'privacy', 'dpo'],
      'Finance': ['finance', 'financial', 'accounting', 'fin'],
      'HR': ['hr', 'human resources', 'personnel', 'people']
    };

    for (const [department, patterns] of Object.entries(departmentPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        entities.department = department;
        break;
      }
    }

    return entities;
  }

  /**
   * Adjust confidence based on entity extraction quality
   */
  private adjustConfidenceBasedOnEntities(baseConfidence: number, entities: ParsedQuery['entities']): number {
    let adjustment = 0;

    // Boost confidence if we extracted specific entities
    if (entities.regulations && entities.regulations.length > 0) adjustment += 0.1;
    if (entities.severity) adjustment += 0.05;
    if (entities.timeframe) adjustment += 0.05;
    if (entities.resources && entities.resources.length > 0) adjustment += 0.1;
    if (entities.department) adjustment += 0.05;

    // Cap the final confidence at 0.95
    return Math.min(baseConfidence + adjustment, 0.95);
  }

  /**
   * Generate response with legal context using Amazon Bedrock
   */
  async generateResponseWithLegalContext(
    parsedQuery: ParsedQuery,
    findings: ComplianceFinding[],
    assessments: ComplianceAssessment[]
  ): Promise<QueryResponse> {
    try {
      // Use Amazon Q Business for enhanced query processing
      const qBusinessResponse = await this.queryAmazonQBusiness(parsedQuery, findings);
      
      // Generate legal context
      const legalContext = await this.generateLegalContext(parsedQuery, assessments);
      
      // Use Amazon Bedrock for response generation
      const bedrockResponse = await this.generateBedrockResponse(
        parsedQuery,
        findings,
        assessments,
        legalContext,
        qBusinessResponse
      );

      return {
        answer: bedrockResponse.answer,
        confidence: Math.min(parsedQuery.confidence, bedrockResponse.confidence),
        sources: bedrockResponse.sources,
        relatedFindings: findings.slice(0, 5), // Limit to top 5 relevant findings
        suggestedActions: bedrockResponse.suggestedActions,
        conversationId: this.generateConversationId()
      };
    } catch (error) {
      console.error('Error generating response with legal context:', error);
      
      // Fallback to rule-based response generation
      return this.generateFallbackResponse(parsedQuery, findings, assessments);
    }
  }

  /**
   * Query Amazon Q Business for enhanced processing
   * Enhanced with better context preparation and error handling
   */
  private async queryAmazonQBusiness(
    parsedQuery: ParsedQuery,
    findings: ComplianceFinding[]
  ): Promise<{ answer: string; sources: string[] }> {
    try {
      const qBusinessClient = this.serviceClients.getQBusinessClient();
      
      // Prepare enhanced context for Q Business
      const context = await this.prepareQBusinessContext(parsedQuery, findings);
      
      // Attempt to query Q Business with retry logic
      const response = await this.executeQBusinessQuery(qBusinessClient, context);
      
      return {
        answer: response.answer,
        sources: response.sources
      };
    } catch (error) {
      console.error('Error querying Amazon Q Business:', error);
      
      // Fallback to enhanced mock response
      return await this.generateEnhancedFallbackResponse(parsedQuery, findings);
    }
  }

  /**
   * Prepare comprehensive context for Amazon Q Business
   */
  private async prepareQBusinessContext(
    parsedQuery: ParsedQuery,
    findings: ComplianceFinding[]
  ): Promise<{
    conversationId: string;
    query: string;
    context: any;
    metadata: any;
  }> {
    // Create conversation context
    const conversationId = this.generateConversationId();
    
    // Prepare findings summary
    const findingsSummary = findings.map(f => ({
      id: f.id,
      type: f.findingType,
      severity: f.severity,
      description: f.description,
      resourceArn: f.resourceArn,
      detectedAt: f.detectedAt.toISOString()
    }));

    // Prepare regulatory context based on entities
    const regulatoryContext = await this.buildRegulatoryContext(parsedQuery.entities.regulations || []);
    
    // Prepare resource context
    const resourceContext = await this.buildResourceContext(parsedQuery.entities.resources || []);

    return {
      conversationId,
      query: parsedQuery.originalQuery,
      context: {
        intent: parsedQuery.intent,
        entities: parsedQuery.entities,
        confidence: parsedQuery.confidence,
        findings: findingsSummary,
        regulatoryContext,
        resourceContext,
        timestamp: new Date().toISOString()
      },
      metadata: {
        findingsCount: findings.length,
        criticalFindings: findings.filter(f => f.severity === 'CRITICAL').length,
        highFindings: findings.filter(f => f.severity === 'HIGH').length,
        queryComplexity: this.assessQueryComplexity(parsedQuery)
      }
    };
  }

  /**
   * Execute Q Business query with proper error handling and retries
   */
  private async executeQBusinessQuery(
    qBusinessClient: any,
    context: any
  ): Promise<{ answer: string; sources: string[] }> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Prepare Q Business chat request
        const chatRequest = {
          applicationId: 'privacy-comply-agent-app', // Would be configured
          conversationId: context.conversationId,
          userMessage: context.query,
          clientToken: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          attachments: [{
            name: 'compliance-context.json',
            data: Buffer.from(JSON.stringify(context.context)).toString('base64')
          }]
        };

        // Execute the chat request (mock implementation for now)
        const response = await this.mockQBusinessChatSync(chatRequest);
        
        return {
          answer: response.systemMessage || 'No response from Q Business',
          sources: response.sourceAttributions?.map((attr: any) => attr.title) || []
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(`Q Business query attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Q Business query failed after all retries');
  }

  /**
   * Build regulatory context for Q Business
   */
  private async buildRegulatoryContext(regulations: string[]): Promise<any> {
    const regulatoryInfo: Record<string, any> = {};

    for (const regulation of regulations) {
      switch (regulation.toUpperCase()) {
        case 'GDPR':
          regulatoryInfo.GDPR = {
            fullName: 'General Data Protection Regulation',
            jurisdiction: 'European Union',
            keyPrinciples: ['Lawfulness', 'Fairness', 'Transparency', 'Purpose Limitation', 'Data Minimisation'],
            maxPenalty: '€20 million or 4% of annual global turnover',
            keyArticles: ['Article 5 (Principles)', 'Article 6 (Lawful Basis)', 'Article 32 (Security)']
          };
          break;
        case 'CCPA':
          regulatoryInfo.CCPA = {
            fullName: 'California Consumer Privacy Act',
            jurisdiction: 'California, USA',
            keyRights: ['Right to Know', 'Right to Delete', 'Right to Opt-Out', 'Right to Non-Discrimination'],
            maxPenalty: '$7,500 per violation for intentional violations',
            keyRequirements: ['Privacy Notice', 'Consumer Rights', 'Data Security']
          };
          break;
        case 'PDPL':
          regulatoryInfo.PDPL = {
            fullName: 'Personal Data Protection Law',
            jurisdiction: 'Saudi Arabia',
            keyPrinciples: ['Consent', 'Purpose Limitation', 'Data Minimization', 'Accuracy'],
            maxPenalty: 'SAR 5 million or 2% of annual revenue',
            keyRequirements: ['Consent Management', 'Data Breach Notification', 'Privacy Impact Assessment']
          };
          break;
      }
    }

    return regulatoryInfo;
  }

  /**
   * Build resource context for Q Business
   */
  private async buildResourceContext(resources: string[]): Promise<any> {
    const resourceInfo: Record<string, any> = {};

    for (const resource of resources) {
      switch (resource.toUpperCase()) {
        case 'S3':
          resourceInfo.S3 = {
            service: 'Amazon Simple Storage Service',
            commonIssues: ['Public Access', 'Encryption', 'Versioning', 'Logging'],
            complianceControls: ['Bucket Policies', 'Access Control Lists', 'Server-Side Encryption']
          };
          break;
        case 'IAM':
          resourceInfo.IAM = {
            service: 'AWS Identity and Access Management',
            commonIssues: ['Overprivileged Roles', 'Unused Permissions', 'Policy Complexity'],
            complianceControls: ['Least Privilege', 'Regular Reviews', 'MFA Requirements']
          };
          break;
        case 'LAMBDA':
          resourceInfo.LAMBDA = {
            service: 'AWS Lambda',
            commonIssues: ['Environment Variables', 'VPC Configuration', 'Execution Role Permissions'],
            complianceControls: ['Encryption at Rest', 'VPC Isolation', 'IAM Roles']
          };
          break;
      }
    }

    return resourceInfo;
  }

  /**
   * Assess query complexity for better processing
   */
  private assessQueryComplexity(parsedQuery: ParsedQuery): 'LOW' | 'MEDIUM' | 'HIGH' {
    let complexity = 0;

    // Intent complexity
    const complexIntents = [QueryIntent.LEGAL_MAPPING, QueryIntent.REMEDIATION_GUIDANCE, QueryIntent.REPORT_GENERATION];
    if (complexIntents.includes(parsedQuery.intent)) complexity += 2;
    else complexity += 1;

    // Entity complexity
    const entityCount = Object.keys(parsedQuery.entities).length;
    complexity += entityCount;

    // Query length complexity
    const wordCount = parsedQuery.originalQuery.split(' ').length;
    if (wordCount > 20) complexity += 2;
    else if (wordCount > 10) complexity += 1;

    if (complexity >= 6) return 'HIGH';
    if (complexity >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Mock Q Business chat sync (placeholder for actual implementation)
   */
  private async mockQBusinessChatSync(request: any): Promise<{
    systemMessage: string;
    sourceAttributions: { title: string; snippet: string }[];
    conversationId: string;
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Parse context from attachments
    let context: any = {};
    if (request.attachments && request.attachments.length > 0) {
      try {
        const contextData = Buffer.from(request.attachments[0].data, 'base64').toString();
        context = JSON.parse(contextData);
      } catch (error) {
        console.warn('Failed to parse Q Business context:', error);
      }
    }

    // Generate contextual response based on intent and findings
    const response = this.generateContextualQBusinessResponse(request.userMessage, context);

    return {
      systemMessage: response.message,
      sourceAttributions: response.sources.map(source => ({
        title: source,
        snippet: `Relevant information from ${source}`
      })),
      conversationId: request.conversationId
    };
  }

  /**
   * Generate contextual Q Business response
   */
  private generateContextualQBusinessResponse(
    query: string,
    context: any
  ): { message: string; sources: string[] } {
    const intent = context.intent;
    const findings = context.findings || [];
    const criticalCount = context.metadata?.criticalFindings || 0;
    const highCount = context.metadata?.highFindings || 0;

    let message = '';
    let sources: string[] = [];

    switch (intent) {
      case QueryIntent.COMPLIANCE_STATUS:
        message = `Based on current analysis, your organization has ${findings.length} compliance findings. `;
        if (criticalCount > 0) {
          message += `${criticalCount} critical issues require immediate attention. `;
        }
        if (highCount > 0) {
          message += `${highCount} high-priority issues should be addressed promptly. `;
        }
        message += 'The compliance posture shows areas for improvement in data protection and access controls.';
        sources = ['AWS Security Hub', 'Amazon Macie', 'CloudTrail Analysis', 'Compliance Assessment Engine'];
        break;

      case QueryIntent.FINDING_EXPLANATION:
        if (findings.length > 0) {
          const finding = findings[0];
          message = `This ${finding.severity.toLowerCase()}-severity finding indicates ${finding.description.toLowerCase()}. `;
          message += `The issue affects resource ${finding.resourceArn} and represents a ${finding.type.replace('_', ' ').toLowerCase()} concern. `;
          message += 'This type of violation can lead to regulatory penalties and should be addressed according to your risk management policies.';
        } else {
          message = 'To explain a specific finding, please provide the finding ID or describe the compliance issue you\'d like me to analyze.';
        }
        sources = ['Compliance Knowledge Base', 'Regulatory Guidelines', 'Risk Assessment Framework'];
        break;

      case QueryIntent.REMEDIATION_GUIDANCE:
        message = 'Based on the identified compliance issues, I recommend the following remediation approach: ';
        if (criticalCount > 0) {
          message += '1) Address critical findings immediately through automated remediation where possible. ';
        }
        message += '2) Implement proper access controls and encryption. 3) Enable comprehensive logging and monitoring. ';
        message += '4) Update policies and procedures to prevent recurrence. 5) Conduct regular compliance assessments.';
        sources = ['Remediation Playbook', 'AWS Best Practices', 'Compliance Framework', 'Security Controls Catalog'];
        break;

      case QueryIntent.LEGAL_MAPPING:
        const regulations = context.entities?.regulations || ['GDPR', 'CCPA', 'PDPL'];
        message = `The compliance issues map to several regulatory requirements across ${regulations.join(', ')}. `;
        message += 'Key applicable articles include data security requirements, access control provisions, and breach notification obligations. ';
        message += 'Specific legal mappings depend on the nature of data processing and jurisdictional scope.';
        sources = ['Legal Compliance Database', 'Regulatory Mapping Engine', 'Privacy Law Repository'];
        break;

      case QueryIntent.REPORT_GENERATION:
        message = 'I can generate comprehensive compliance reports including Data Protection Impact Assessments (DPIA), ';
        message += 'Records of Processing Activities (RoPA), and audit reports. These reports will include current findings, ';
        message += 'risk assessments, and remediation recommendations formatted for regulatory compliance and executive review.';
        sources = ['Report Templates', 'Compliance Data Store', 'Regulatory Reporting Standards'];
        break;

      default:
        message = 'I can help you with privacy compliance questions, finding explanations, remediation guidance, ';
        message += 'and report generation. Please let me know what specific aspect of compliance you\'d like to explore.';
        sources = ['Compliance Help Center', 'Privacy Documentation', 'User Guide'];
    }

    return { message, sources };
  }

  /**
   * Generate enhanced fallback response when Q Business is unavailable
   */
  private async generateEnhancedFallbackResponse(
    parsedQuery: ParsedQuery,
    findings: ComplianceFinding[]
  ): Promise<{ answer: string; sources: string[] }> {
    // Use the same contextual response generation as Q Business mock
    const context = {
      intent: parsedQuery.intent,
      entities: parsedQuery.entities,
      findings: findings.map(f => ({
        id: f.id,
        type: f.findingType,
        severity: f.severity,
        description: f.description,
        resourceArn: f.resourceArn
      })),
      metadata: {
        criticalFindings: findings.filter(f => f.severity === 'CRITICAL').length,
        highFindings: findings.filter(f => f.severity === 'HIGH').length
      }
    };

    const response = this.generateContextualQBusinessResponse(parsedQuery.originalQuery, context);
    
    return {
      answer: `[Fallback Mode] ${response.message}`,
      sources: response.sources
    };
  }

  /**
   * Generate comprehensive legal context for the response
   * Enhanced with detailed regulatory analysis and cross-references
   */
  private async generateLegalContext(
    parsedQuery: ParsedQuery,
    assessments: ComplianceAssessment[]
  ): Promise<LegalContext> {
    const regulations = parsedQuery.entities.regulations || ['GDPR', 'CCPA', 'PDPL'];
    const relevantArticles: LegalMapping[] = [];
    const complianceRequirements: string[] = [];
    const penalties: string[] = [];

    // Extract and enhance legal mappings from assessments
    for (const assessment of assessments) {
      for (const mapping of assessment.legalMappings) {
        // Enhance mapping with additional context
        const enhancedMapping = await this.enhanceLegalMapping(mapping, parsedQuery);
        relevantArticles.push(enhancedMapping);
      }
    }

    // Generate contextual legal mappings based on query intent
    const contextualMappings = await this.generateContextualLegalMappings(parsedQuery, assessments);
    relevantArticles.push(...contextualMappings);

    // Add comprehensive regulation-specific requirements and penalties
    for (const regulation of regulations) {
      const regulationContext = await this.getRegulationContext(regulation, parsedQuery);
      complianceRequirements.push(...regulationContext.requirements);
      penalties.push(...regulationContext.penalties);
    }

    // Remove duplicates and sort by relevance
    const uniqueArticles = this.deduplicateAndSortArticles(relevantArticles);
    const uniqueRequirements = [...new Set(complianceRequirements)];
    const uniquePenalties = [...new Set(penalties)];

    return {
      applicableRegulations: regulations,
      relevantArticles: uniqueArticles.slice(0, 15), // Increased limit for better coverage
      complianceRequirements: uniqueRequirements,
      penalties: uniquePenalties
    };
  }

  /**
   * Enhance legal mapping with additional context and cross-references
   */
  private async enhanceLegalMapping(
    mapping: LegalMapping,
    parsedQuery: ParsedQuery
  ): Promise<LegalMapping> {
    // Add context-specific enhancements based on query intent
    let enhancedDescription = mapping.description;
    
    switch (parsedQuery.intent) {
      case QueryIntent.REMEDIATION_GUIDANCE:
        enhancedDescription += ' - Focus on implementing technical and organizational measures';
        break;
      case QueryIntent.RISK_ASSESSMENT:
        enhancedDescription += ' - Consider impact on data subjects and business operations';
        break;
      case QueryIntent.REPORT_GENERATION:
        enhancedDescription += ' - Document compliance measures and evidence';
        break;
    }

    // Boost applicability based on query entities
    let adjustedApplicability = mapping.applicability;
    if (parsedQuery.entities.resources) {
      // Boost applicability if the regulation is relevant to mentioned resources
      if (this.isRegulationRelevantToResources(mapping.regulation, parsedQuery.entities.resources)) {
        adjustedApplicability = Math.min(adjustedApplicability + 0.1, 1.0);
      }
    }

    return {
      ...mapping,
      description: enhancedDescription,
      applicability: adjustedApplicability
    };
  }

  /**
   * Generate contextual legal mappings based on query intent and findings
   */
  private async generateContextualLegalMappings(
    parsedQuery: ParsedQuery,
    assessments: ComplianceAssessment[]
  ): Promise<LegalMapping[]> {
    const mappings: LegalMapping[] = [];
    const regulations = parsedQuery.entities.regulations || ['GDPR', 'CCPA', 'PDPL'];

    // Generate mappings based on query intent
    for (const regulation of regulations) {
      const intentMappings = this.getIntentSpecificMappings(regulation, parsedQuery.intent);
      mappings.push(...intentMappings);
    }

    // Generate mappings based on resource types mentioned
    if (parsedQuery.entities.resources) {
      for (const resource of parsedQuery.entities.resources) {
        const resourceMappings = this.getResourceSpecificMappings(resource, regulations);
        mappings.push(...resourceMappings);
      }
    }

    // Generate mappings based on severity if mentioned
    if (parsedQuery.entities.severity) {
      const severityMappings = this.getSeveritySpecificMappings(parsedQuery.entities.severity, regulations);
      mappings.push(...severityMappings);
    }

    return mappings;
  }

  /**
   * Get intent-specific legal mappings
   */
  private getIntentSpecificMappings(regulation: string, intent: QueryIntent): LegalMapping[] {
    const mappings: LegalMapping[] = [];

    switch (regulation.toUpperCase()) {
      case 'GDPR':
        switch (intent) {
          case QueryIntent.COMPLIANCE_STATUS:
            mappings.push({
              regulation: 'GDPR',
              article: 'Article 5',
              description: 'Principles relating to processing of personal data - lawfulness, fairness, transparency',
              applicability: 0.9
            });
            break;
          case QueryIntent.REMEDIATION_GUIDANCE:
            mappings.push({
              regulation: 'GDPR',
              article: 'Article 32',
              description: 'Security of processing - implement appropriate technical and organizational measures',
              applicability: 0.95
            });
            break;
          case QueryIntent.REPORT_GENERATION:
            mappings.push({
              regulation: 'GDPR',
              article: 'Article 35',
              description: 'Data protection impact assessment - required for high-risk processing',
              applicability: 0.85
            });
            break;
          case QueryIntent.RISK_ASSESSMENT:
            mappings.push({
              regulation: 'GDPR',
              article: 'Article 83',
              description: 'General conditions for imposing administrative fines',
              applicability: 0.8
            });
            break;
        }
        break;

      case 'CCPA':
        switch (intent) {
          case QueryIntent.COMPLIANCE_STATUS:
            mappings.push({
              regulation: 'CCPA',
              article: 'Section 1798.100',
              description: 'Consumer right to know about personal information collected',
              applicability: 0.85
            });
            break;
          case QueryIntent.REMEDIATION_GUIDANCE:
            mappings.push({
              regulation: 'CCPA',
              article: 'Section 1798.150',
              description: 'Personal information security requirements and breach liability',
              applicability: 0.9
            });
            break;
          case QueryIntent.REPORT_GENERATION:
            mappings.push({
              regulation: 'CCPA',
              article: 'Section 1798.130',
              description: 'Notice requirements and consumer request procedures',
              applicability: 0.8
            });
            break;
        }
        break;

      case 'PDPL':
        switch (intent) {
          case QueryIntent.COMPLIANCE_STATUS:
            mappings.push({
              regulation: 'PDPL',
              article: 'Article 6',
              description: 'Lawful basis for processing personal data',
              applicability: 0.9
            });
            break;
          case QueryIntent.REMEDIATION_GUIDANCE:
            mappings.push({
              regulation: 'PDPL',
              article: 'Article 22',
              description: 'Technical and organizational security measures',
              applicability: 0.95
            });
            break;
          case QueryIntent.REPORT_GENERATION:
            mappings.push({
              regulation: 'PDPL',
              article: 'Article 46',
              description: 'Privacy impact assessment requirements',
              applicability: 0.85
            });
            break;
        }
        break;
    }

    return mappings;
  }

  /**
   * Get resource-specific legal mappings
   */
  private getResourceSpecificMappings(resource: string, regulations: string[]): LegalMapping[] {
    const mappings: LegalMapping[] = [];

    for (const regulation of regulations) {
      switch (resource.toUpperCase()) {
        case 'S3':
          if (regulation.toUpperCase() === 'GDPR') {
            mappings.push({
              regulation: 'GDPR',
              article: 'Article 32(1)',
              description: 'Security of processing - encryption of personal data at rest and in transit',
              applicability: 0.9
            });
          }
          break;
        case 'IAM':
          if (regulation.toUpperCase() === 'GDPR') {
            mappings.push({
              regulation: 'GDPR',
              article: 'Article 32(2)',
              description: 'Security of processing - ability to ensure ongoing confidentiality and access control',
              applicability: 0.85
            });
          }
          break;
        case 'CLOUDTRAIL':
          if (regulation.toUpperCase() === 'GDPR') {
            mappings.push({
              regulation: 'GDPR',
              article: 'Article 30',
              description: 'Records of processing activities - maintain comprehensive audit logs',
              applicability: 0.8
            });
          }
          break;
      }
    }

    return mappings;
  }

  /**
   * Get severity-specific legal mappings
   */
  private getSeveritySpecificMappings(severity: string, regulations: string[]): LegalMapping[] {
    const mappings: LegalMapping[] = [];

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      for (const regulation of regulations) {
        switch (regulation.toUpperCase()) {
          case 'GDPR':
            mappings.push({
              regulation: 'GDPR',
              article: 'Article 33',
              description: 'Notification of personal data breach to supervisory authority within 72 hours',
              applicability: 0.9
            });
            break;
          case 'PDPL':
            mappings.push({
              regulation: 'PDPL',
              article: 'Article 47',
              description: 'Data breach notification to authorities within 72 hours',
              applicability: 0.9
            });
            break;
        }
      }
    }

    return mappings;
  }

  /**
   * Get comprehensive regulation context
   */
  private async getRegulationContext(
    regulation: string,
    parsedQuery: ParsedQuery
  ): Promise<{ requirements: string[]; penalties: string[] }> {
    const requirements: string[] = [];
    const penalties: string[] = [];

    switch (regulation.toUpperCase()) {
      case 'GDPR':
        requirements.push(
          'Implement privacy by design and by default (Article 25)',
          'Maintain records of processing activities (Article 30)',
          'Conduct Data Protection Impact Assessments for high-risk processing (Article 35)',
          'Appoint a Data Protection Officer if required (Article 37)',
          'Implement appropriate technical and organizational measures (Article 32)',
          'Ensure lawful basis for all processing activities (Article 6)',
          'Provide transparent information to data subjects (Articles 13-14)',
          'Honor data subject rights requests (Articles 15-22)'
        );
        penalties.push(
          'Administrative fines up to €20 million or 4% of annual global turnover (Article 83)',
          'Compensation for material and non-material damage (Article 82)',
          'Corrective measures including processing limitations (Article 58)'
        );
        break;

      case 'CCPA':
        requirements.push(
          'Provide clear and conspicuous privacy notices (Section 1798.130)',
          'Honor consumer rights requests within specified timeframes (Sections 1798.100-120)',
          'Implement reasonable security measures (Section 1798.150)',
          'Maintain consumer request logs for 24 months (Section 1798.130)',
          'Provide opt-out mechanisms for sale of personal information (Section 1798.120)',
          'Train staff on privacy requirements and consumer rights (Section 1798.135)',
          'Implement data minimization practices (Section 1798.100)'
        );
        penalties.push(
          'Civil penalties up to $2,500 per violation (Section 1798.155)',
          'Civil penalties up to $7,500 per intentional violation (Section 1798.155)',
          'Private right of action for data breaches (Section 1798.150)',
          'Injunctive relief and other equitable remedies (Section 1798.150)'
        );
        break;

      case 'PDPL':
        requirements.push(
          'Obtain valid consent for processing personal data (Article 6)',
          'Implement appropriate technical and organizational measures (Article 22)',
          'Notify authorities of data breaches within 72 hours (Article 47)',
          'Conduct privacy impact assessments for high-risk processing (Article 46)',
          'Appoint a data protection officer if required (Article 18)',
          'Maintain records of processing activities (Article 28)',
          'Ensure lawful basis for cross-border data transfers (Articles 36-42)',
          'Provide transparent information to data subjects (Article 12)'
        );
        penalties.push(
          'Administrative fines up to SAR 5 million (Article 72)',
          'Administrative fines up to 2% of annual revenue (Article 72)',
          'Temporary or permanent suspension of processing (Article 71)',
          'Corrective measures and compliance orders (Article 71)'
        );
        break;
    }

    // Filter requirements based on query context
    const contextualRequirements = this.filterRequirementsByContext(requirements, parsedQuery);

    return {
      requirements: contextualRequirements,
      penalties
    };
  }

  /**
   * Filter requirements based on query context
   */
  private filterRequirementsByContext(requirements: string[], parsedQuery: ParsedQuery): string[] {
    // If specific resources are mentioned, prioritize relevant requirements
    if (parsedQuery.entities.resources) {
      const resourceKeywords = parsedQuery.entities.resources.map(r => r.toLowerCase());
      return requirements.filter(req => {
        const reqLower = req.toLowerCase();
        return resourceKeywords.some(keyword => 
          reqLower.includes(keyword) || 
          reqLower.includes('security') || 
          reqLower.includes('technical') ||
          reqLower.includes('organizational')
        );
      }).concat(requirements.slice(0, 3)); // Always include top 3 general requirements
    }

    // For specific intents, prioritize relevant requirements
    switch (parsedQuery.intent) {
      case QueryIntent.REMEDIATION_GUIDANCE:
        return requirements.filter(req => 
          req.toLowerCase().includes('implement') || 
          req.toLowerCase().includes('measures') ||
          req.toLowerCase().includes('security')
        );
      case QueryIntent.REPORT_GENERATION:
        return requirements.filter(req => 
          req.toLowerCase().includes('record') || 
          req.toLowerCase().includes('assessment') ||
          req.toLowerCase().includes('documentation')
        );
      default:
        return requirements;
    }
  }

  /**
   * Check if regulation is relevant to mentioned resources
   */
  private isRegulationRelevantToResources(regulation: string, resources: string[]): boolean {
    // All privacy regulations are generally relevant to data storage and access resources
    const dataResources = ['S3', 'RDS', 'DYNAMODB', 'IAM', 'LAMBDA'];
    return resources.some(resource => dataResources.includes(resource.toUpperCase()));
  }

  /**
   * Deduplicate and sort articles by relevance
   */
  private deduplicateAndSortArticles(articles: LegalMapping[]): LegalMapping[] {
    // Remove duplicates based on regulation + article combination
    const uniqueArticles = articles.filter((article, index, self) => 
      index === self.findIndex(a => 
        a.regulation === article.regulation && a.article === article.article
      )
    );

    // Sort by applicability score (descending)
    return uniqueArticles.sort((a, b) => b.applicability - a.applicability);
  }

  /**
   * Generate response using Amazon Bedrock
   */
  private async generateBedrockResponse(
    parsedQuery: ParsedQuery,
    findings: ComplianceFinding[],
    assessments: ComplianceAssessment[],
    legalContext: LegalContext,
    qBusinessResponse: { answer: string; sources: string[] }
  ): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
    suggestedActions: string[];
  }> {
    try {
      const bedrockClient = this.serviceClients.getBedrockClient();
      
      // Prepare prompt for Bedrock
      const prompt = this.buildBedrockPrompt(
        parsedQuery,
        findings,
        assessments,
        legalContext,
        qBusinessResponse
      );

      // Mock Bedrock response (will be replaced with actual AWS SDK call)
      const response = await this.mockBedrockResponse(prompt);
      
      return response;
    } catch (error) {
      console.error('Error generating Bedrock response:', error);
      throw error;
    }
  }

  /**
   * Build prompt for Amazon Bedrock
   */
  private buildBedrockPrompt(
    parsedQuery: ParsedQuery,
    findings: ComplianceFinding[],
    assessments: ComplianceAssessment[],
    legalContext: LegalContext,
    qBusinessResponse: { answer: string; sources: string[] }
  ): string {
    return `
You are a privacy compliance expert assistant. Please provide a comprehensive response to the following query.

Query: "${parsedQuery.originalQuery}"
Intent: ${parsedQuery.intent}
Entities: ${JSON.stringify(parsedQuery.entities)}

Current Compliance Findings:
${findings.map(f => `- ${f.findingType}: ${f.description} (Severity: ${f.severity})`).join('\n')}

Legal Context:
Applicable Regulations: ${legalContext.applicableRegulations.join(', ')}
Relevant Articles: ${legalContext.relevantArticles.map(a => `${a.regulation} ${a.article}: ${a.description}`).join('\n')}

Compliance Requirements:
${legalContext.complianceRequirements.map(req => `- ${req}`).join('\n')}

Potential Penalties:
${legalContext.penalties.map(penalty => `- ${penalty}`).join('\n')}

Amazon Q Business Context: ${qBusinessResponse.answer}

Please provide:
1. A clear, actionable answer to the user's query
2. Specific legal references where applicable
3. Practical next steps or recommendations
4. Any relevant warnings about compliance risks

Format your response in a professional, accessible manner suitable for privacy officers and compliance teams.
    `.trim();
  }

  /**
   * Mock Amazon Q Business response (placeholder for actual implementation)
   */
  private async mockQBusinessResponse(context: any): Promise<{ answer: string; sources: string[] }> {
    // This will be replaced with actual Amazon Q Business API call
    const intentResponses = {
      [QueryIntent.COMPLIANCE_STATUS]: {
        answer: 'Based on current findings, your organization has several compliance gaps that need attention.',
        sources: ['AWS Security Hub', 'Amazon Macie', 'CloudTrail Logs']
      },
      [QueryIntent.FINDING_EXPLANATION]: {
        answer: 'This finding indicates a potential privacy risk that could lead to regulatory violations.',
        sources: ['Compliance Assessment Engine', 'Legal Mapping Database']
      },
      [QueryIntent.LEGAL_MAPPING]: {
        answer: 'The relevant legal requirements are mapped to specific regulation articles.',
        sources: ['GDPR Articles Database', 'CCPA Compliance Guide', 'PDPL Requirements']
      },
      [QueryIntent.REMEDIATION_GUIDANCE]: {
        answer: 'Here are the recommended steps to address this compliance issue.',
        sources: ['Remediation Playbook', 'Best Practices Guide']
      },
      [QueryIntent.REPORT_GENERATION]: {
        answer: 'I can help you generate the requested compliance report.',
        sources: ['Report Templates', 'Compliance Data Store']
      },
      [QueryIntent.RISK_ASSESSMENT]: {
        answer: 'The risk assessment shows areas requiring immediate attention.',
        sources: ['Risk Assessment Engine', 'Threat Intelligence']
      },
      [QueryIntent.REGULATION_INQUIRY]: {
        answer: 'Here\'s what you need to know about the specific regulation.',
        sources: ['Regulation Database', 'Legal Updates']
      },
      [QueryIntent.GENERAL_HELP]: {
        answer: 'I can help you with various privacy compliance questions and tasks.',
        sources: ['Help Documentation', 'User Guide']
      }
    };

    return intentResponses[context.intent as QueryIntent] || intentResponses[QueryIntent.GENERAL_HELP];
  }

  /**
   * Mock Amazon Bedrock response (placeholder for actual implementation)
   */
  private async mockBedrockResponse(prompt: string): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
    suggestedActions: string[];
  }> {
    // This will be replaced with actual Amazon Bedrock API call
    // For now, generate a structured response based on the prompt content
    
    const isComplianceStatus = prompt.includes('compliance status') || prompt.includes('COMPLIANCE_STATUS');
    const isFindingExplanation = prompt.includes('finding') || prompt.includes('FINDING_EXPLANATION');
    const isRemediationGuidance = prompt.includes('fix') || prompt.includes('REMEDIATION_GUIDANCE');
    
    if (isComplianceStatus) {
      return {
        answer: `Based on the current compliance assessment, your organization has identified several areas requiring attention. The findings indicate potential violations of privacy regulations including GDPR, CCPA, and PDPL. Key areas of concern include unencrypted data storage, overprivileged access controls, and insufficient logging mechanisms. Immediate action is recommended to address high-severity findings to maintain regulatory compliance.`,
        confidence: 0.85,
        sources: ['AWS Security Hub', 'Amazon Macie', 'Compliance Assessment Engine'],
        suggestedActions: [
          'Review high-severity findings immediately',
          'Implement recommended security controls',
          'Schedule compliance audit',
          'Update privacy policies'
        ]
      };
    } else if (isFindingExplanation) {
      return {
        answer: `This compliance finding represents a potential privacy risk that could result in regulatory violations. The issue involves inadequate protection of personal data, which may violate data protection principles under GDPR Article 5, CCPA Section 1798.100, or PDPL Article 6. The finding indicates that current security measures are insufficient to protect personal information from unauthorized access or disclosure. This could result in significant penalties and reputational damage if not addressed promptly.`,
        confidence: 0.9,
        sources: ['Legal Mapping Database', 'Regulation Articles', 'Risk Assessment Engine'],
        suggestedActions: [
          'Implement immediate containment measures',
          'Review and update security controls',
          'Conduct impact assessment',
          'Document remediation steps'
        ]
      };
    } else if (isRemediationGuidance) {
      return {
        answer: `To address this compliance issue, I recommend the following remediation steps: 1) Immediately restrict unauthorized access to sensitive data, 2) Enable encryption for all data at rest and in transit, 3) Implement proper access controls following the principle of least privilege, 4) Enable comprehensive logging and monitoring, 5) Update privacy policies and procedures to reflect current practices. These actions will help bring your organization into compliance with applicable privacy regulations and reduce the risk of regulatory penalties.`,
        confidence: 0.88,
        sources: ['Remediation Playbook', 'Best Practices Guide', 'Compliance Framework'],
        suggestedActions: [
          'Execute automated remediation where possible',
          'Schedule manual remediation tasks',
          'Verify remediation effectiveness',
          'Update compliance documentation'
        ]
      };
    }
    
    // Default response
    return {
      answer: `I understand you're asking about privacy compliance. Based on the available information, I can help you understand your compliance status, explain specific findings, provide remediation guidance, and generate compliance reports. Your organization should focus on addressing high-priority compliance gaps to maintain regulatory compliance and protect personal data.`,
      confidence: 0.7,
      sources: ['Compliance Knowledge Base', 'Privacy Regulations Database'],
      suggestedActions: [
        'Ask specific questions about compliance findings',
        'Request detailed remediation guidance',
        'Generate compliance reports',
        'Review privacy policies'
      ]
    };
  }

  /**
   * Generate fallback response when AI services are unavailable
   */
  private generateFallbackResponse(
    parsedQuery: ParsedQuery,
    findings: ComplianceFinding[],
    assessments: ComplianceAssessment[]
  ): QueryResponse {
    const intentResponses = {
      [QueryIntent.COMPLIANCE_STATUS]: `Your current compliance status shows ${findings.length} findings requiring attention. ${findings.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL').length} are high priority.`,
      [QueryIntent.FINDING_EXPLANATION]: `This finding indicates a compliance issue that needs to be addressed to maintain regulatory compliance.`,
      [QueryIntent.LEGAL_MAPPING]: `This issue may be related to privacy regulation requirements. Please consult with legal counsel for specific guidance.`,
      [QueryIntent.REMEDIATION_GUIDANCE]: `To address this issue, review the recommended actions and implement appropriate security controls.`,
      [QueryIntent.REPORT_GENERATION]: `I can help generate compliance reports. Please specify the type of report you need (DPIA, RoPA, or Audit Report).`,
      [QueryIntent.RISK_ASSESSMENT]: `Based on current findings, there are compliance risks that require attention.`,
      [QueryIntent.REGULATION_INQUIRY]: `Privacy regulations like GDPR, CCPA, and PDPL have specific requirements for data protection and privacy.`,
      [QueryIntent.GENERAL_HELP]: `I can help with compliance questions, finding explanations, and remediation guidance.`
    };

    return {
      answer: intentResponses[parsedQuery.intent] || intentResponses[QueryIntent.GENERAL_HELP],
      confidence: 0.6,
      sources: ['Compliance Database'],
      relatedFindings: findings.slice(0, 3),
      suggestedActions: ['Contact support for detailed assistance'],
      conversationId: this.generateConversationId()
    };
  }

  /**
   * Get relevant findings based on parsed query
   */
  private async getRelevantFindings(parsedQuery: ParsedQuery): Promise<ComplianceFinding[]> {
    // Mock implementation - in real scenario, this would query the findings database
    const mockFindings: ComplianceFinding[] = [
      {
        id: 'finding-1',
        resourceArn: 'arn:aws:s3:::example-bucket',
        findingType: 'ENCRYPTION',
        severity: 'HIGH',
        description: 'S3 bucket lacks server-side encryption',
        detectedAt: new Date(),
        rawData: {}
      },
      {
        id: 'finding-2',
        resourceArn: 'arn:aws:iam::123456789012:role/AdminRole',
        findingType: 'ACCESS_CONTROL',
        severity: 'CRITICAL',
        description: 'IAM role has overprivileged access to sensitive data',
        detectedAt: new Date(),
        rawData: {}
      }
    ];

    // Filter findings based on query entities
    return mockFindings.filter(finding => {
      if (parsedQuery.entities.severity) {
        return finding.severity.toLowerCase() === parsedQuery.entities.severity.toLowerCase();
      }
      return true;
    });
  }

  /**
   * Get relevant assessments based on parsed query
   */
  private async getRelevantAssessments(parsedQuery: ParsedQuery): Promise<ComplianceAssessment[]> {
    // Mock implementation - in real scenario, this would query the assessments database
    const mockAssessments: ComplianceAssessment[] = [
      {
        findingId: 'finding-1',
        legalMappings: [
          {
            regulation: 'GDPR',
            article: 'Article 32',
            description: 'Security of processing',
            applicability: 0.9
          }
        ],
        riskScore: 8.5,
        confidenceScore: 0.85,
        recommendations: [],
        reasoning: 'Lack of encryption violates GDPR security requirements',
        assessedAt: new Date()
      }
    ];

    return mockAssessments;
  }



  /**
   * Generate unique conversation ID
   */
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if query matches any of the given patterns (legacy method, kept for compatibility)
   */
  private matchesPattern(query: string, patterns: string[]): boolean {
    return patterns.some(pattern => 
      query.includes(pattern.toLowerCase()) || 
      pattern.toLowerCase().split(' ').every(word => query.includes(word))
    );
  }

  async generateNaturalLanguageReport(report: ComplianceReport): Promise<string> {
    try {
      const bedrockClient = this.serviceClients.getBedrockClient();
      
      // Build prompt for report summarization
      const prompt = `
Please generate a natural language executive summary for the following compliance report:

Report Type: ${report.type}
Generated: ${report.generatedAt.toISOString()}
Scope: ${JSON.stringify(report.scope)}

Findings Summary:
- Total Findings: ${report.findings.length}
- Critical: ${report.findings.filter(f => f.severity === 'CRITICAL').length}
- High: ${report.findings.filter(f => f.severity === 'HIGH').length}
- Medium: ${report.findings.filter(f => f.severity === 'MEDIUM').length}
- Low: ${report.findings.filter(f => f.severity === 'LOW').length}

Key Findings:
${report.findings.slice(0, 5).map(f => `- ${f.description} (${f.severity})`).join('\n')}

Assessments: ${report.assessments.length} compliance assessments completed
Recommendations: ${report.recommendations.length} remediation recommendations provided

Please provide a professional executive summary suitable for senior management, highlighting key risks, compliance status, and recommended actions.
      `.trim();

      // Mock Bedrock response for report generation
      const summary = await this.mockReportSummary(report);
      return summary;
    } catch (error) {
      console.error('Error generating natural language report:', error);
      return this.generateFallbackReportSummary(report);
    }
  }

  /**
   * Generate fallback report summary when AI services are unavailable
   */
  private generateFallbackReportSummary(report: ComplianceReport): string {
    const criticalCount = report.findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = report.findings.filter(f => f.severity === 'HIGH').length;
    
    return `
Compliance Report Summary - ${report.type}

Generated: ${report.generatedAt.toLocaleDateString()}
Total Findings: ${report.findings.length}
Critical Issues: ${criticalCount}
High Priority Issues: ${highCount}

This ${report.type.toLowerCase()} report provides an overview of your organization's compliance status. 
${criticalCount > 0 ? `Immediate attention is required for ${criticalCount} critical issues.` : ''}
${highCount > 0 ? `${highCount} high-priority issues should be addressed promptly.` : ''}

Please review the detailed findings and implement the recommended remediation actions to maintain regulatory compliance.
    `.trim();
  }

  async explainFinding(findingId: string): Promise<string> {
    try {
      // Get finding details from cache or database
      const finding = this.findingsCache.get(findingId) || await this.fetchFinding(findingId);
      if (!finding) {
        return `Finding ${findingId} not found. Please verify the finding ID and try again.`;
      }

      // Get associated assessment
      const assessment = this.assessmentsCache.get(findingId) || await this.fetchAssessment(findingId);

      // Generate explanation using Bedrock
      const prompt = `
Please explain the following compliance finding in clear, non-technical language:

Finding ID: ${finding.id}
Type: ${finding.findingType}
Severity: ${finding.severity}
Description: ${finding.description}
Resource: ${finding.resourceArn}
Detected: ${finding.detectedAt.toISOString()}

${assessment ? `
Legal Context:
${assessment.legalMappings.map(m => `- ${m.regulation} ${m.article}: ${m.description}`).join('\n')}

Risk Score: ${assessment.riskScore}/10
Confidence: ${(assessment.confidenceScore * 100).toFixed(1)}%
Reasoning: ${assessment.reasoning}
` : ''}

Please provide:
1. What this finding means in business terms
2. Why it's a compliance risk
3. What regulations it may violate
4. Potential consequences if not addressed
5. Recommended next steps

Use clear, professional language suitable for privacy officers and business stakeholders.
      `.trim();

      return await this.mockFindingExplanation(finding, assessment || undefined);
    } catch (error) {
      console.error('Error explaining finding:', error);
      return `I apologize, but I encountered an error explaining finding ${findingId}. Please try again or contact support.`;
    }
  }

  async suggestQueries(): Promise<string[]> {
    try {
      // Get current compliance status to suggest relevant queries
      const findings = await this.getRecentFindings();
      const suggestions = await this.generateContextualSuggestions(findings);
      
      return suggestions;
    } catch (error) {
      console.error('Error suggesting queries:', error);
      return this.getDefaultSuggestions();
    }
  }

  async startConversation(userId: string): Promise<string> {
    try {
      const conversationId = this.generateConversationId();
      
      // Initialize conversation context
      const context: ConversationContext = {
        conversationId,
        userId,
        previousQueries: [],
        context: {
          startedAt: new Date(),
          userId,
          preferences: {},
          sessionData: {}
        }
      };

      // Store conversation context
      this.conversationStore.set(conversationId, context);
      
      // Store in DynamoDB for persistence
      await this.persistConversationContext(context);
      
      console.log(`Started conversation ${conversationId} for user ${userId}`);
      return conversationId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw new Error('Failed to start conversation session');
    }
  }

  async endConversation(conversationId: string): Promise<void> {
    try {
      const context = this.conversationStore.get(conversationId);
      if (!context) {
        console.warn(`Conversation ${conversationId} not found`);
        return;
      }

      // Update context with end time
      context.context.endedAt = new Date();
      context.context.duration = Date.now() - new Date(context.context.startedAt).getTime();
      
      // Persist final state
      await this.persistConversationContext(context);
      
      // Remove from memory
      this.conversationStore.delete(conversationId);
      
      console.log(`Ended conversation ${conversationId}`);
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw new Error('Failed to end conversation session');
    }
  }

  async getConversationHistory(conversationId: string): Promise<{
    query: string;
    response: QueryResponse;
    timestamp: Date;
  }[]> {
    try {
      // First check memory cache
      const context = this.conversationStore.get(conversationId);
      if (context && context.context.history) {
        return context.context.history;
      }

      // Fetch from DynamoDB if not in memory
      const history = await this.fetchConversationHistory(conversationId);
      return history;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async updateContext(conversationId: string, context: Record<string, any>): Promise<void> {
    try {
      const conversationContext = this.conversationStore.get(conversationId);
      if (!conversationContext) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Merge new context with existing context
      conversationContext.context = {
        ...conversationContext.context,
        ...context,
        updatedAt: new Date()
      };

      // Update in memory
      this.conversationStore.set(conversationId, conversationContext);
      
      // Persist to DynamoDB
      await this.persistConversationContext(conversationContext);
      
      console.log(`Updated context for conversation ${conversationId}`);
    } catch (error) {
      console.error('Error updating conversation context:', error);
      throw error; // Re-throw the original error to preserve the message
    }
  }

  async generateTrainingContent(findings: ComplianceFinding[]): Promise<{
    title: string;
    content: string;
    keyPoints: string[];
    resources: string[];
  }> {
    try {
      const findingTypes = [...new Set(findings.map(f => f.findingType))];
      const severities = findings.map(f => f.severity);
      const criticalCount = severities.filter(s => s === 'CRITICAL').length;
      const highCount = severities.filter(s => s === 'HIGH').length;

      const title = `Privacy Compliance Training: Addressing ${findingTypes.join(', ')} Issues`;
      
      const content = `
This training module addresses recent compliance findings in your organization. We have identified ${findings.length} compliance issues, including ${criticalCount} critical and ${highCount} high-severity findings that require immediate attention.

Key Areas of Focus:
${findingTypes.map(type => `- ${type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`).join('\n')}

Understanding Privacy Compliance:
Privacy compliance is essential for protecting personal data and maintaining trust with customers and stakeholders. Violations can result in significant financial penalties, reputational damage, and legal consequences.

Common Compliance Issues:
1. Inadequate data encryption
2. Overprivileged access controls
3. Insufficient logging and monitoring
4. Lack of data classification
5. Missing privacy impact assessments

Best Practices:
- Implement privacy by design principles
- Regularly review and update access controls
- Maintain comprehensive audit logs
- Conduct regular compliance assessments
- Provide ongoing staff training

Your organization should prioritize addressing critical and high-severity findings to maintain regulatory compliance and protect personal data.
      `.trim();

      const keyPoints = [
        `${findings.length} compliance findings identified`,
        `${criticalCount} critical issues require immediate action`,
        'Privacy compliance is essential for regulatory adherence',
        'Regular assessments help maintain compliance posture',
        'Staff training is crucial for ongoing compliance'
      ];

      const resources = [
        'GDPR Compliance Guide',
        'CCPA Implementation Checklist',
        'PDPL Requirements Overview',
        'Privacy by Design Principles',
        'Data Protection Best Practices',
        'Incident Response Procedures'
      ];

      return {
        title,
        content,
        keyPoints,
        resources
      };
    } catch (error) {
      console.error('Error generating training content:', error);
      throw error;
    }
  }

  async translateContent(content: string, targetLanguage: string): Promise<string> {
    try {
      // Use Amazon Bedrock for translation
      const bedrockClient = this.serviceClients.getBedrockClient();
      
      const prompt = `
Please translate the following privacy compliance content to ${targetLanguage}. Maintain technical accuracy and professional tone:

${content}

Ensure that:
1. Legal and technical terms are accurately translated
2. The professional tone is maintained
3. Regulatory references remain clear
4. The meaning and intent are preserved
      `.trim();

      // Mock translation response
      return await this.mockTranslation(content, targetLanguage);
    } catch (error) {
      console.error('Error translating content:', error);
      return `Translation to ${targetLanguage} is currently unavailable. Please try again later.`;
    }
  }

  /**
   * Helper methods for mock responses
   */
  private async mockReportSummary(report: ComplianceReport): Promise<string> {
    const criticalCount = report.findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = report.findings.filter(f => f.severity === 'HIGH').length;
    
    return `
Executive Summary - ${report.type} Report

This ${report.type.toLowerCase()} report provides a comprehensive assessment of your organization's privacy compliance status as of ${report.generatedAt.toLocaleDateString()}.

Key Findings:
Our analysis identified ${report.findings.length} compliance findings across your AWS environment. Of particular concern are ${criticalCount} critical and ${highCount} high-severity issues that require immediate attention to maintain regulatory compliance.

Risk Assessment:
The current compliance posture indicates areas of significant risk, particularly around data encryption, access controls, and audit logging. These gaps could potentially result in regulatory violations under GDPR, CCPA, and PDPL.

Recommendations:
We recommend prioritizing the ${criticalCount + highCount} high-priority findings for immediate remediation. Our automated remediation system can address many of these issues, while others require manual intervention and policy updates.

Next Steps:
1. Review and approve recommended automated remediations
2. Assign resources for manual remediation tasks
3. Update privacy policies and procedures
4. Schedule follow-up compliance assessment

This report demonstrates your organization's commitment to privacy compliance and provides a clear roadmap for maintaining regulatory adherence.
    `.trim();
  }

  private async mockFindingExplanation(finding: ComplianceFinding, assessment?: ComplianceAssessment): Promise<string> {
    const severityDescriptions = {
      CRITICAL: 'poses an immediate and severe risk to data privacy and regulatory compliance',
      HIGH: 'represents a significant compliance risk that should be addressed promptly',
      MEDIUM: 'indicates a moderate compliance concern that requires attention',
      LOW: 'represents a minor compliance issue that should be addressed during regular maintenance'
    };

    return `
Finding Explanation: ${finding.description}

What This Means:
This ${finding.severity.toLowerCase()}-severity finding ${severityDescriptions[finding.severity as keyof typeof severityDescriptions]}. The issue was detected in resource ${finding.resourceArn} and relates to ${finding.findingType.replace('_', ' ').toLowerCase()}.

Compliance Risk:
${assessment ? `
This finding has been assessed with a risk score of ${assessment.riskScore}/10. ${assessment.reasoning}

Legal Implications:
${assessment.legalMappings.map(m => `- ${m.regulation} ${m.article}: ${m.description} (${(m.applicability * 100).toFixed(0)}% applicable)`).join('\n')}
` : 'This finding may violate privacy regulations and could result in regulatory penalties if not addressed.'}

Potential Consequences:
- Regulatory fines and penalties
- Reputational damage
- Loss of customer trust
- Legal liability
- Operational disruption

Recommended Actions:
1. Assess the immediate impact and scope
2. Implement temporary containment measures if needed
3. Execute recommended remediation steps
4. Verify remediation effectiveness
5. Update policies and procedures to prevent recurrence

This finding should be addressed according to its severity level and your organization's risk tolerance.
    `.trim();
  }

  private async mockTranslation(content: string, targetLanguage: string): Promise<string> {
    // Mock translation - in real implementation, this would use Amazon Bedrock
    const translations: Record<string, string> = {
      'spanish': 'Contenido de cumplimiento de privacidad traducido al español.',
      'french': 'Contenu de conformité à la confidentialité traduit en français.',
      'german': 'Datenschutz-Compliance-Inhalte ins Deutsche übersetzt.',
      'arabic': 'محتوى الامتثال للخصوصية مترجم إلى العربية.'
    };

    return translations[targetLanguage.toLowerCase()] || 
           `Privacy compliance content translated to ${targetLanguage}. [Translation would be provided by Amazon Bedrock in production]`;
  }

  private async fetchFinding(findingId: string): Promise<ComplianceFinding | null> {
    // Mock implementation - would fetch from database in production
    // Return null for non-existent findings to test error handling
    if (findingId === 'non-existent-finding') {
      return null;
    }
    
    return {
      id: findingId,
      resourceArn: 'arn:aws:s3:::example-bucket',
      findingType: 'ENCRYPTION',
      severity: 'HIGH',
      description: 'S3 bucket lacks server-side encryption',
      detectedAt: new Date(),
      rawData: {}
    };
  }

  private async fetchAssessment(findingId: string): Promise<ComplianceAssessment | null> {
    // Mock implementation - would fetch from database in production
    return {
      findingId,
      legalMappings: [
        {
          regulation: 'GDPR',
          article: 'Article 32',
          description: 'Security of processing',
          applicability: 0.9
        }
      ],
      riskScore: 8.5,
      confidenceScore: 0.85,
      recommendations: [],
      reasoning: 'Lack of encryption violates GDPR security requirements',
      assessedAt: new Date()
    };
  }

  /**
   * Conversation Management Helper Methods
   */

  /**
   * Get recent findings for contextual suggestions
   */
  private async getRecentFindings(): Promise<ComplianceFinding[]> {
    // Mock implementation - would query recent findings from database
    return [
      {
        id: 'finding-recent-1',
        resourceArn: 'arn:aws:s3:::sensitive-data-bucket',
        findingType: 'ENCRYPTION',
        severity: 'CRITICAL',
        description: 'Unencrypted S3 bucket containing PII data',
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        rawData: {}
      },
      {
        id: 'finding-recent-2',
        resourceArn: 'arn:aws:iam::123456789012:role/DataAccessRole',
        findingType: 'ACCESS_CONTROL',
        severity: 'HIGH',
        description: 'IAM role with excessive permissions to sensitive data',
        detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        rawData: {}
      },
      {
        id: 'finding-recent-3',
        resourceArn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/data-processor',
        findingType: 'LOGGING',
        severity: 'MEDIUM',
        description: 'Insufficient logging for data processing activities',
        detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        rawData: {}
      }
    ];
  }

  /**
   * Generate contextual query suggestions based on current findings
   */
  private async generateContextualSuggestions(findings: ComplianceFinding[]): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Base suggestions always available
    const baseSuggestions = [
      "What's my current compliance status?",
      "Show me recent compliance findings",
      "Generate a GDPR compliance report",
      "How can I improve my privacy compliance?"
    ];

    // Add contextual suggestions based on findings
    if (findings.length > 0) {
      const criticalFindings = findings.filter(f => f.severity === 'CRITICAL');
      const highFindings = findings.filter(f => f.severity === 'HIGH');
      
      if (criticalFindings.length > 0) {
        suggestions.push(
          "What are my critical compliance issues?",
          "How do I fix critical security violations?",
          "Show me immediate remediation steps"
        );
      }
      
      if (highFindings.length > 0) {
        suggestions.push(
          "What high-priority issues need attention?",
          "Explain my high-severity findings"
        );
      }

      // Suggestions based on finding types
      const findingTypes = [...new Set(findings.map(f => f.findingType))];
      
      if (findingTypes.includes('ENCRYPTION')) {
        suggestions.push(
          "How do I enable encryption for my data?",
          "What are the encryption requirements for GDPR?"
        );
      }
      
      if (findingTypes.includes('ACCESS_CONTROL')) {
        suggestions.push(
          "How do I implement least privilege access?",
          "Review my IAM permissions and roles"
        );
      }
      
      if (findingTypes.includes('PII_EXPOSURE')) {
        suggestions.push(
          "How do I protect PII data?",
          "What are the requirements for handling personal data?"
        );
      }
      
      if (findingTypes.includes('LOGGING')) {
        suggestions.push(
          "What logging is required for compliance?",
          "How do I set up proper audit trails?"
        );
      }
    }

    // Regulation-specific suggestions
    suggestions.push(
      "What are my GDPR compliance obligations?",
      "How do I handle CCPA data subject requests?",
      "What are PDPL requirements for data transfers?",
      "Generate a Data Protection Impact Assessment",
      "Create Records of Processing Activities"
    );

    // Limit to top 10 suggestions and randomize order
    const shuffled = [...baseSuggestions, ...suggestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
    
    return shuffled;
  }

  /**
   * Get default query suggestions when context is unavailable
   */
  private getDefaultSuggestions(): string[] {
    return [
      "What's my current compliance status?",
      "Show me recent compliance findings",
      "How can I improve my privacy compliance?",
      "Generate a GDPR compliance report",
      "What are my critical security issues?",
      "How do I handle data subject requests?",
      "What encryption is required for compliance?",
      "Create a Data Protection Impact Assessment",
      "Review my access controls and permissions",
      "What are the penalties for non-compliance?"
    ];
  }

  /**
   * Persist conversation context to DynamoDB
   */
  private async persistConversationContext(context: ConversationContext): Promise<void> {
    try {
      const dynamoClient = this.serviceClients.getDynamoDBClient();
      const tableName = this.serviceClients.getDynamoDBTableName();
      
      const item = {
        pk: `conversation#${context.conversationId}`,
        sk: 'context',
        conversationId: context.conversationId,
        userId: context.userId,
        previousQueries: context.previousQueries,
        context: context.context,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
      };

      await dynamoClient.put({
        TableName: tableName,
        Item: item
      }).promise();
      
      console.log(`Persisted conversation context for ${context.conversationId}`);
    } catch (error) {
      console.error('Error persisting conversation context:', error);
      // Don't throw error - conversation can continue without persistence
    }
  }

  /**
   * Fetch conversation history from DynamoDB
   */
  private async fetchConversationHistory(conversationId: string): Promise<{
    query: string;
    response: QueryResponse;
    timestamp: Date;
  }[]> {
    try {
      const dynamoClient = this.serviceClients.getDynamoDBClient();
      const tableName = this.serviceClients.getDynamoDBTableName();
      
      const result = await dynamoClient.query({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': `conversation#${conversationId}`,
          ':sk': 'history#'
        },
        ScanIndexForward: true // Sort by timestamp ascending
      }).promise();

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      return result.Items.map((item: any) => ({
        query: item.query,
        response: item.response,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  /**
   * Enhanced update query context with history tracking
   */
  private async updateQueryContext(
    context: ConversationContext,
    query: string,
    response: QueryResponse
  ): Promise<void> {
    try {
      // Update in-memory context
      context.previousQueries.push(query);
      context.context.lastQuery = query;
      context.context.lastResponse = response;
      context.context.queryCount = (context.context.queryCount || 0) + 1;
      
      // Add to history
      if (!context.context.history) {
        context.context.history = [];
      }
      
      context.context.history.push({
        query,
        response,
        timestamp: new Date()
      });
      
      // Keep only last 50 queries in memory
      if (context.context.history.length > 50) {
        context.context.history = context.context.history.slice(-50);
      }
      
      this.conversationStore.set(context.conversationId, context);
      
      // Persist history entry to DynamoDB
      await this.persistHistoryEntry(context.conversationId, query, response);
      
    } catch (error) {
      console.error('Error updating query context:', error);
      // Don't throw - conversation can continue
    }
  }

  /**
   * Persist individual history entry to DynamoDB
   */
  private async persistHistoryEntry(
    conversationId: string,
    query: string,
    response: QueryResponse
  ): Promise<void> {
    try {
      const dynamoClient = this.serviceClients.getDynamoDBClient();
      const tableName = this.serviceClients.getDynamoDBTableName();
      
      const timestamp = new Date().toISOString();
      const item = {
        pk: `conversation#${conversationId}`,
        sk: `history#${timestamp}`,
        query,
        response,
        timestamp,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
      };

      await dynamoClient.put({
        TableName: tableName,
        Item: item
      }).promise();
      
    } catch (error) {
      console.error('Error persisting history entry:', error);
      // Don't throw - conversation can continue without persistence
    }
  }

  /**
   * Format response for presentation
   */
  public formatResponseForPresentation(response: QueryResponse): {
    formattedAnswer: string;
    metadata: {
      confidence: string;
      sources: string[];
      findingsCount: number;
      actionsCount: number;
    };
    sections: {
      answer: string;
      findings?: string;
      actions?: string;
      sources?: string;
    };
  } {
    const confidenceLevel = response.confidence >= 0.8 ? 'High' : 
                           response.confidence >= 0.6 ? 'Medium' : 'Low';
    
    const sections: any = {
      answer: response.answer
    };
    
    // Add findings section if available
    if (response.relatedFindings && response.relatedFindings.length > 0) {
      sections.findings = `Related Compliance Findings:\n${
        response.relatedFindings.map((f, i) => 
          `${i + 1}. ${f.description} (${f.severity})`
        ).join('\n')
      }`;
    }
    
    // Add actions section if available
    if (response.suggestedActions && response.suggestedActions.length > 0) {
      sections.actions = `Recommended Actions:\n${
        response.suggestedActions.map((action, i) => 
          `${i + 1}. ${action}`
        ).join('\n')
      }`;
    }
    
    // Add sources section if available
    if (response.sources && response.sources.length > 0) {
      sections.sources = `Information Sources:\n${
        response.sources.map((source, i) => 
          `${i + 1}. ${source}`
        ).join('\n')
      }`;
    }
    
    // Create formatted answer with all sections
    const formattedSections = [
      sections.answer,
      sections.findings,
      sections.actions,
      sections.sources
    ].filter(Boolean);
    
    return {
      formattedAnswer: formattedSections.join('\n\n'),
      metadata: {
        confidence: confidenceLevel,
        sources: response.sources || [],
        findingsCount: response.relatedFindings?.length || 0,
        actionsCount: response.suggestedActions?.length || 0
      },
      sections
    };
  }

  /**
   * Get conversation statistics
   */
  public async getConversationStats(conversationId: string): Promise<{
    totalQueries: number;
    averageConfidence: number;
    topIntents: { intent: string; count: number }[];
    duration: number;
    lastActivity: Date;
  }> {
    try {
      const context = this.conversationStore.get(conversationId);
      if (!context) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
      
      const history = context.context.history || [];
      const totalQueries = history.length;
      
      if (totalQueries === 0) {
        return {
          totalQueries: 0,
          averageConfidence: 0,
          topIntents: [],
          duration: 0,
          lastActivity: new Date(context.context.startedAt)
        };
      }
      
      // Calculate average confidence
      const totalConfidence = history.reduce((sum: number, entry: any) => 
        sum + (entry.response.confidence || 0), 0);
      const averageConfidence = totalConfidence / totalQueries;
      
      // Calculate top intents from conversation context
      const intentCounts: Record<string, number> = {};
      if (context.context.intentHistory) {
        for (const intent of context.context.intentHistory) {
          intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        }
      }
      
      const topIntents = Object.entries(intentCounts)
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Calculate duration
      const startTime = new Date(context.context.startedAt).getTime();
      const endTime = context.context.endedAt ? 
        new Date(context.context.endedAt).getTime() : Date.now();
      const duration = endTime - startTime;
      
      // Get last activity
      const lastActivity = history.length > 0 ? 
        new Date(history[history.length - 1].timestamp) : 
        new Date(context.context.startedAt);
      
      return {
        totalQueries,
        averageConfidence,
        topIntents,
        duration,
        lastActivity
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      throw error;
    }
  }

  /**
   * Enhanced conversation context tracking with intent and entity history
   */
  public async trackConversationContext(
    conversationId: string,
    parsedQuery: ParsedQuery,
    response: QueryResponse
  ): Promise<void> {
    try {
      const context = this.conversationStore.get(conversationId);
      if (!context) {
        console.warn(`Conversation ${conversationId} not found for context tracking`);
        return;
      }

      // Track intent history
      if (!context.context.intentHistory) {
        context.context.intentHistory = [];
      }
      context.context.intentHistory.push(parsedQuery.intent);
      
      // Keep only last 20 intents
      if (context.context.intentHistory.length > 20) {
        context.context.intentHistory = context.context.intentHistory.slice(-20);
      }

      // Track entity patterns
      if (!context.context.entityPatterns) {
        context.context.entityPatterns = {};
      }
      
      for (const [entityType, entityValues] of Object.entries(parsedQuery.entities)) {
        if (!context.context.entityPatterns[entityType]) {
          context.context.entityPatterns[entityType] = [];
        }
        
        if (Array.isArray(entityValues)) {
          context.context.entityPatterns[entityType].push(...entityValues);
        } else if (entityValues) {
          context.context.entityPatterns[entityType].push(entityValues);
        }
      }

      // Track conversation topics
      if (!context.context.topics) {
        context.context.topics = [];
      }
      
      const topic = this.extractTopicFromQuery(parsedQuery);
      if (topic && !context.context.topics.includes(topic)) {
        context.context.topics.push(topic);
      }

      // Track user preferences based on query patterns
      this.updateUserPreferences(context, parsedQuery, response);

      // Update conversation context
      context.context.lastIntent = parsedQuery.intent;
      context.context.lastEntities = parsedQuery.entities;
      context.context.lastConfidence = response.confidence;
      context.context.updatedAt = new Date();

      // Store updated context
      this.conversationStore.set(conversationId, context);
      
      // Persist to database
      await this.persistConversationContext(context);
      
    } catch (error) {
      console.error('Error tracking conversation context:', error);
      // Don't throw - conversation should continue
    }
  }

  /**
   * Extract topic from parsed query for conversation tracking
   */
  private extractTopicFromQuery(parsedQuery: ParsedQuery): string | null {
    const topicMap: Record<QueryIntent, string> = {
      [QueryIntent.COMPLIANCE_STATUS]: 'compliance-status',
      [QueryIntent.FINDING_EXPLANATION]: 'findings',
      [QueryIntent.LEGAL_MAPPING]: 'legal-requirements',
      [QueryIntent.REMEDIATION_GUIDANCE]: 'remediation',
      [QueryIntent.REPORT_GENERATION]: 'reporting',
      [QueryIntent.RISK_ASSESSMENT]: 'risk-assessment',
      [QueryIntent.REGULATION_INQUIRY]: 'regulations',
      [QueryIntent.GENERAL_HELP]: 'general-help'
    };

    return topicMap[parsedQuery.intent] || null;
  }

  /**
   * Update user preferences based on query patterns
   */
  private updateUserPreferences(
    context: ConversationContext,
    parsedQuery: ParsedQuery,
    response: QueryResponse
  ): void {
    if (!context.context.preferences) {
      context.context.preferences = {
        preferredRegulations: [],
        preferredReportTypes: [],
        detailLevel: 'medium',
        responseFormat: 'structured'
      };
    }

    // Ensure arrays are initialized
    if (!context.context.preferences.preferredRegulations) {
      context.context.preferences.preferredRegulations = [];
    }
    if (!context.context.preferences.preferredReportTypes) {
      context.context.preferences.preferredReportTypes = [];
    }

    // Track preferred regulations
    if (parsedQuery.entities.regulations) {
      for (const regulation of parsedQuery.entities.regulations) {
        if (!context.context.preferences.preferredRegulations.includes(regulation)) {
          context.context.preferences.preferredRegulations.push(regulation);
        }
      }
    }

    // Infer detail level preference from query complexity
    const queryComplexity = this.assessQueryComplexity(parsedQuery);
    if (queryComplexity === 'HIGH') {
      context.context.preferences.detailLevel = 'high';
    } else if (queryComplexity === 'LOW') {
      context.context.preferences.detailLevel = 'low';
    }

    // Track report type preferences
    if (parsedQuery.intent === QueryIntent.REPORT_GENERATION) {
      const reportTypes = ['DPIA', 'RoPA', 'Audit'];
      for (const reportType of reportTypes) {
        if (parsedQuery.originalQuery.toLowerCase().includes(reportType.toLowerCase())) {
          if (!context.context.preferences.preferredReportTypes.includes(reportType)) {
            context.context.preferences.preferredReportTypes.push(reportType);
          }
        }
      }
    }
  }

  /**
   * Generate contextual query suggestions based on conversation history
   */
  public async generateContextualQuerySuggestions(conversationId: string): Promise<string[]> {
    try {
      const context = this.conversationStore.get(conversationId);
      if (!context) {
        return this.getDefaultSuggestions();
      }

      const suggestions: string[] = [];
      const history = context.context.history || [];
      const recentQueries = history.slice(-5); // Last 5 queries
      
      // Suggestions based on recent intents
      const recentIntents = context.context.intentHistory?.slice(-3) || [];
      const intentSuggestions = this.getIntentBasedSuggestions(recentIntents);
      suggestions.push(...intentSuggestions);

      // Suggestions based on entity patterns
      const entitySuggestions = this.getEntityBasedSuggestions(context.context.entityPatterns || {});
      suggestions.push(...entitySuggestions);

      // Suggestions based on conversation topics
      const topicSuggestions = this.getTopicBasedSuggestions(context.context.topics || []);
      suggestions.push(...topicSuggestions);

      // Suggestions based on user preferences
      const preferenceSuggestions = this.getPreferenceBasedSuggestions(context.context.preferences || {});
      suggestions.push(...preferenceSuggestions);

      // Follow-up suggestions based on last response
      if (history.length > 0) {
        const lastEntry = history[history.length - 1];
        const followUpSuggestions = this.getFollowUpSuggestions(lastEntry.response);
        suggestions.push(...followUpSuggestions);
      }

      // Remove duplicates and limit to 10 suggestions
      const uniqueSuggestions = [...new Set(suggestions)];
      return uniqueSuggestions.slice(0, 10);
      
    } catch (error) {
      console.error('Error generating contextual suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Get suggestions based on recent intents
   */
  private getIntentBasedSuggestions(recentIntents: string[]): string[] {
    const suggestions: string[] = [];
    
    for (const intent of recentIntents) {
      switch (intent) {
        case QueryIntent.COMPLIANCE_STATUS:
          suggestions.push(
            "Show me detailed compliance metrics",
            "What are my biggest compliance risks?",
            "Generate a compliance dashboard summary"
          );
          break;
        case QueryIntent.FINDING_EXPLANATION:
          suggestions.push(
            "How do I fix these compliance issues?",
            "What are the legal implications?",
            "Show me similar findings"
          );
          break;
        case QueryIntent.REMEDIATION_GUIDANCE:
          suggestions.push(
            "Track remediation progress",
            "What's the next remediation step?",
            "Validate my remediation efforts"
          );
          break;
        case QueryIntent.REPORT_GENERATION:
          suggestions.push(
            "Schedule regular compliance reports",
            "Export report data",
            "Create executive summary"
          );
          break;
      }
    }
    
    return suggestions;
  }

  /**
   * Get suggestions based on entity patterns
   */
  private getEntityBasedSuggestions(entityPatterns: Record<string, any[]>): string[] {
    const suggestions: string[] = [];
    
    if (entityPatterns.regulations) {
      const regulations = [...new Set(entityPatterns.regulations)];
      for (const regulation of regulations.slice(0, 2)) {
        suggestions.push(`What are the latest ${regulation} requirements?`);
        suggestions.push(`Generate ${regulation} compliance report`);
      }
    }
    
    if (entityPatterns.resources) {
      const resources = [...new Set(entityPatterns.resources)];
      for (const resource of resources.slice(0, 2)) {
        suggestions.push(`Review ${resource} security configuration`);
        suggestions.push(`What are ${resource} compliance best practices?`);
      }
    }
    
    if (entityPatterns.severity) {
      const severities = [...new Set(entityPatterns.severity)];
      if (severities.includes('CRITICAL') || severities.includes('HIGH')) {
        suggestions.push("Show me all high-priority issues");
        suggestions.push("What's my critical issue remediation plan?");
      }
    }
    
    return suggestions;
  }

  /**
   * Get suggestions based on conversation topics
   */
  private getTopicBasedSuggestions(topics: string[]): string[] {
    const suggestions: string[] = [];
    
    for (const topic of topics) {
      switch (topic) {
        case 'compliance-status':
          suggestions.push(
            "Compare compliance across departments",
            "Show compliance trends over time"
          );
          break;
        case 'findings':
          suggestions.push(
            "Group findings by category",
            "Show finding resolution timeline"
          );
          break;
        case 'remediation':
          suggestions.push(
            "Automate common remediations",
            "Create remediation playbook"
          );
          break;
        case 'reporting':
          suggestions.push(
            "Set up automated reporting",
            "Customize report templates"
          );
          break;
      }
    }
    
    return suggestions;
  }

  /**
   * Get suggestions based on user preferences
   */
  private getPreferenceBasedSuggestions(preferences: any): string[] {
    const suggestions: string[] = [];
    
    if (preferences.preferredRegulations) {
      for (const regulation of preferences.preferredRegulations.slice(0, 2)) {
        suggestions.push(`What's new in ${regulation} compliance?`);
      }
    }
    
    if (preferences.preferredReportTypes) {
      for (const reportType of preferences.preferredReportTypes) {
        suggestions.push(`Update my ${reportType} template`);
      }
    }
    
    if (preferences.detailLevel === 'high') {
      suggestions.push(
        "Show me detailed technical analysis",
        "Provide comprehensive remediation steps"
      );
    } else if (preferences.detailLevel === 'low') {
      suggestions.push(
        "Give me a quick compliance summary",
        "Show me only critical issues"
      );
    }
    
    return suggestions;
  }

  /**
   * Get follow-up suggestions based on last response
   */
  private getFollowUpSuggestions(lastResponse: QueryResponse): string[] {
    const suggestions: string[] = [];
    
    if (lastResponse.relatedFindings && lastResponse.relatedFindings.length > 0) {
      suggestions.push(
        "Explain these related findings",
        "How do I prioritize these issues?",
        "Show me remediation steps for these findings"
      );
    }
    
    if (lastResponse.suggestedActions && lastResponse.suggestedActions.length > 0) {
      suggestions.push(
        "Help me implement these actions",
        "What's the timeline for these actions?",
        "Track progress on these recommendations"
      );
    }
    
    if (lastResponse.confidence < 0.7) {
      suggestions.push(
        "Can you clarify this information?",
        "Provide more details on this topic",
        "Show me additional resources"
      );
    }
    
    return suggestions;
  }

  /**
   * Enhanced response formatting with conversation context
   */
  public formatResponseWithContext(
    response: QueryResponse,
    conversationId: string
  ): {
    formattedAnswer: string;
    contextualInfo: {
      conversationLength: number;
      relatedTopics: string[];
      suggestedFollowUps: string[];
    };
    metadata: {
      confidence: string;
      sources: string[];
      findingsCount: number;
      actionsCount: number;
    };
  } {
    const baseFormatting = this.formatResponseForPresentation(response);
    
    // Get conversation context
    const context = this.conversationStore.get(conversationId);
    const conversationLength = context?.context.history?.length || 0;
    const relatedTopics = context?.context.topics || [];
    
    // Generate contextual follow-ups
    const suggestedFollowUps = this.getFollowUpSuggestions(response).slice(0, 3);
    
    return {
      formattedAnswer: baseFormatting.formattedAnswer,
      contextualInfo: {
        conversationLength,
        relatedTopics,
        suggestedFollowUps
      },
      metadata: baseFormatting.metadata
    };
  }
}