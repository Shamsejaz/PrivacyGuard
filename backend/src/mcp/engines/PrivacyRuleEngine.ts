/**
 * MCP Privacy Connectors - Privacy Rule Engine
 * Service for managing and evaluating organization-specific privacy policies
 */

import type {
  PrivacyRule,
  PIIType,
  SensitivityLevel,
  PIIFinding,
  ScanContext
} from '../types/index.js';

/**
 * Rule evaluation result
 */
interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  confidence: number;
  matches: Array<{
    start: number;
    end: number;
    text: string;
    context?: string;
  }>;
  evaluationTime: number;
}

/**
 * Rule condition for complex rule logic
 */
interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'not_equals' | 'not_contains' | 'in' | 'not_in';
  value: string | string[];
  caseSensitive?: boolean;
}

/**
 * Advanced privacy rule with conditions
 */
interface AdvancedPrivacyRule extends PrivacyRule {
  conditions?: RuleCondition[];
  contextRules?: {
    fieldNamePatterns?: string[];
    tableNamePatterns?: string[];
    systemTypes?: string[];
  };
  priority: number;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Rule evaluation context
 */
interface RuleEvaluationContext {
  content: string;
  scanContext: ScanContext;
  fieldName?: string;
  tableName?: string;
  recordMetadata?: Record<string, any>;
}

/**
 * Rule performance metrics
 */
interface RuleMetrics {
  ruleId: string;
  totalEvaluations: number;
  totalMatches: number;
  averageEvaluationTime: number;
  lastEvaluated: Date;
  matchRate: number;
}

/**
 * Privacy Rule Engine for organization-specific privacy policies
 */
export class PrivacyRuleEngine {
  private rules: Map<string, AdvancedPrivacyRule> = new Map();
  private ruleMetrics: Map<string, RuleMetrics> = new Map();
  private compiledPatterns: Map<string, RegExp> = new Map();
  private policyService: any; // Integration with existing policy management

  constructor(policyService?: any) {
    this.policyService = policyService;
    this.initializeDefaultRules();
  }

  /**
   * Add custom privacy rule
   */
  async addRule(rule: Omit<AdvancedPrivacyRule, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<string> {
    const ruleId = this.generateRuleId();
    
    const advancedRule: AdvancedPrivacyRule = {
      ...rule,
      id: ruleId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    // Validate rule
    this.validateRule(advancedRule);

    // Compile regex pattern for performance
    try {
      const compiledPattern = new RegExp(advancedRule.pattern, 'gi');
      this.compiledPatterns.set(ruleId, compiledPattern);
    } catch (error) {
      throw new Error(`Invalid regex pattern in rule ${advancedRule.name}: ${error.message}`);
    }

    // Store rule
    this.rules.set(ruleId, advancedRule);

    // Initialize metrics
    this.ruleMetrics.set(ruleId, {
      ruleId,
      totalEvaluations: 0,
      totalMatches: 0,
      averageEvaluationTime: 0,
      lastEvaluated: new Date(),
      matchRate: 0
    });

    // Persist to policy service if available
    if (this.policyService) {
      await this.policyService.createPrivacyRule(advancedRule);
    }

    console.log(`Privacy rule added: ${advancedRule.name} (${ruleId})`);
    return ruleId;
  }

  /**
   * Update existing privacy rule
   */
  async updateRule(ruleId: string, updates: Partial<AdvancedPrivacyRule>): Promise<void> {
    const existingRule = this.rules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Privacy rule not found: ${ruleId}`);
    }

    const updatedRule: AdvancedPrivacyRule = {
      ...existingRule,
      ...updates,
      id: ruleId, // Ensure ID doesn't change
      updatedAt: new Date(),
      version: existingRule.version + 1
    };

    // Validate updated rule
    this.validateRule(updatedRule);

    // Recompile pattern if changed
    if (updates.pattern && updates.pattern !== existingRule.pattern) {
      try {
        const compiledPattern = new RegExp(updatedRule.pattern, 'gi');
        this.compiledPatterns.set(ruleId, compiledPattern);
      } catch (error) {
        throw new Error(`Invalid regex pattern in updated rule: ${error.message}`);
      }
    }

    // Update rule
    this.rules.set(ruleId, updatedRule);

    // Persist to policy service if available
    if (this.policyService) {
      await this.policyService.updatePrivacyRule(ruleId, updatedRule);
    }

    console.log(`Privacy rule updated: ${updatedRule.name} (${ruleId})`);
  }

  /**
   * Remove privacy rule
   */
  async removeRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Privacy rule not found: ${ruleId}`);
    }

    // Remove from maps
    this.rules.delete(ruleId);
    this.ruleMetrics.delete(ruleId);
    this.compiledPatterns.delete(ruleId);

    // Remove from policy service if available
    if (this.policyService) {
      await this.policyService.deletePrivacyRule(ruleId);
    }

    console.log(`Privacy rule removed: ${rule.name} (${ruleId})`);
  }

  /**
   * Evaluate all rules against content
   */
  async evaluateRules(
    content: string,
    context: ScanContext
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const evaluationContext: RuleEvaluationContext = {
      content,
      scanContext: context,
      fieldName: context.fieldNames?.[0],
      tableName: context.recordMetadata?.tableName,
      recordMetadata: context.recordMetadata
    };

    // Get enabled rules sorted by priority
    const enabledRules = Array.from(this.rules.values())
      .filter(rule => rule.isEnabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of enabledRules) {
      const result = await this.evaluateRule(rule, evaluationContext);
      results.push(result);

      // Update metrics
      this.updateRuleMetrics(rule.id, result);
    }

    return results;
  }

  /**
   * Evaluate single rule against content
   */
  private async evaluateRule(
    rule: AdvancedPrivacyRule,
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult> {
    const startTime = Date.now();
    const matches: Array<{ start: number; end: number; text: string; context?: string }> = [];

    try {
      // Check context conditions first
      if (!this.evaluateContextConditions(rule, context)) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          matched: false,
          confidence: 0,
          matches: [],
          evaluationTime: Date.now() - startTime
        };
      }

      // Check additional conditions
      if (rule.conditions && !this.evaluateConditions(rule.conditions, context)) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          matched: false,
          confidence: 0,
          matches: [],
          evaluationTime: Date.now() - startTime
        };
      }

      // Evaluate pattern against content
      const compiledPattern = this.compiledPatterns.get(rule.id);
      if (!compiledPattern) {
        throw new Error(`Compiled pattern not found for rule ${rule.id}`);
      }

      // Reset regex lastIndex for global patterns
      compiledPattern.lastIndex = 0;

      let match;
      while ((match = compiledPattern.exec(context.content)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          context: this.extractContext(context.content, match.index, match[0].length)
        });

        // Prevent infinite loop for zero-length matches
        if (match.index === compiledPattern.lastIndex) {
          compiledPattern.lastIndex++;
        }
      }

      const confidence = this.calculateRuleConfidence(rule, matches, context);

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: matches.length > 0,
        confidence,
        matches,
        evaluationTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        confidence: 0,
        matches: [],
        evaluationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Evaluate context conditions
   */
  private evaluateContextConditions(
    rule: AdvancedPrivacyRule,
    context: RuleEvaluationContext
  ): boolean {
    if (!rule.contextRules) return true;

    const { contextRules } = rule;

    // Check field name patterns
    if (contextRules.fieldNamePatterns && context.fieldName) {
      const fieldMatches = contextRules.fieldNamePatterns.some(pattern => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(context.fieldName!);
      });
      if (!fieldMatches) return false;
    }

    // Check table name patterns
    if (contextRules.tableNamePatterns && context.tableName) {
      const tableMatches = contextRules.tableNamePatterns.some(pattern => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(context.tableName!);
      });
      if (!tableMatches) return false;
    }

    // Check system types
    if (contextRules.systemTypes) {
      if (!contextRules.systemTypes.includes(context.scanContext.connectorType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate additional conditions
   */
  private evaluateConditions(
    conditions: RuleCondition[],
    context: RuleEvaluationContext
  ): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, context));
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    context: RuleEvaluationContext
  ): boolean {
    let fieldValue: string | undefined;

    // Get field value based on field name
    switch (condition.field) {
      case 'content':
        fieldValue = context.content;
        break;
      case 'fieldName':
        fieldValue = context.fieldName;
        break;
      case 'tableName':
        fieldValue = context.tableName;
        break;
      case 'connectorType':
        fieldValue = context.scanContext.connectorType;
        break;
      case 'dataSource':
        fieldValue = context.scanContext.dataSource;
        break;
      default:
        // Check in record metadata
        fieldValue = context.recordMetadata?.[condition.field];
        break;
    }

    if (fieldValue === undefined) return false;

    // Apply case sensitivity
    const compareValue = condition.caseSensitive !== false ? fieldValue : fieldValue.toLowerCase();
    const conditionValue = condition.caseSensitive !== false 
      ? condition.value 
      : Array.isArray(condition.value) 
        ? condition.value.map(v => v.toLowerCase())
        : condition.value.toLowerCase();

    // Evaluate based on operator
    switch (condition.operator) {
      case 'equals':
        return compareValue === conditionValue;
      case 'not_equals':
        return compareValue !== conditionValue;
      case 'contains':
        return compareValue.includes(conditionValue as string);
      case 'not_contains':
        return !compareValue.includes(conditionValue as string);
      case 'matches':
        const regex = new RegExp(conditionValue as string, condition.caseSensitive !== false ? '' : 'i');
        return regex.test(compareValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(compareValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(compareValue);
      default:
        return false;
    }
  }

  /**
   * Calculate rule confidence based on matches and context
   */
  private calculateRuleConfidence(
    rule: AdvancedPrivacyRule,
    matches: any[],
    context: RuleEvaluationContext
  ): number {
    if (matches.length === 0) return 0;

    let confidence = 0.8; // Base confidence for pattern match

    // Increase confidence for context matches
    if (rule.contextRules) {
      if (rule.contextRules.fieldNamePatterns && context.fieldName) {
        confidence += 0.1;
      }
      if (rule.contextRules.tableNamePatterns && context.tableName) {
        confidence += 0.1;
      }
    }

    // Increase confidence for additional conditions
    if (rule.conditions && rule.conditions.length > 0) {
      confidence += 0.1;
    }

    // Adjust based on number of matches (more matches = higher confidence)
    const matchBonus = Math.min(matches.length * 0.05, 0.2);
    confidence += matchBonus;

    return Math.min(confidence, 1.0);
  }

  /**
   * Extract context around match
   */
  private extractContext(content: string, start: number, length: number): string {
    const contextLength = 50;
    const contextStart = Math.max(0, start - contextLength);
    const contextEnd = Math.min(content.length, start + length + contextLength);
    
    return content.substring(contextStart, contextEnd);
  }

  /**
   * Update rule metrics
   */
  private updateRuleMetrics(ruleId: string, result: RuleEvaluationResult): void {
    const metrics = this.ruleMetrics.get(ruleId);
    if (!metrics) return;

    metrics.totalEvaluations++;
    if (result.matched) {
      metrics.totalMatches++;
    }

    // Update average evaluation time
    metrics.averageEvaluationTime = 
      (metrics.averageEvaluationTime * (metrics.totalEvaluations - 1) + result.evaluationTime) / 
      metrics.totalEvaluations;

    metrics.lastEvaluated = new Date();
    metrics.matchRate = (metrics.totalMatches / metrics.totalEvaluations) * 100;

    this.ruleMetrics.set(ruleId, metrics);
  }

  /**
   * Convert rule evaluation results to PII findings
   */
  convertToFindings(
    results: RuleEvaluationResult[],
    context: ScanContext
  ): PIIFinding[] {
    const findings: PIIFinding[] = [];

    for (const result of results) {
      if (!result.matched) continue;

      const rule = this.rules.get(result.ruleId);
      if (!rule) continue;

      for (const match of result.matches) {
        const finding: PIIFinding = {
          id: this.generateFindingId(),
          type: rule.piiType,
          location: {
            system: context.connectorType,
            database: context.dataSource,
            metadata: {
              fieldNames: context.fieldNames,
              recordMetadata: context.recordMetadata,
              customRule: rule.id,
              ruleName: rule.name,
              ruleVersion: rule.version,
              startPosition: match.start,
              endPosition: match.end,
              matchContext: match.context
            }
          },
          content: this.maskContent(match.text),
          confidence: result.confidence,
          sensitivityLevel: rule.sensitivityLevel,
          recommendedAction: {
            id: this.generateActionId(),
            type: 'flag_review',
            description: `Custom rule match: ${rule.name}`,
            priority: this.mapSensitivityToPriority(rule.sensitivityLevel),
            automated: false
          },
          detectionMethod: 'custom_rule',
          timestamp: new Date()
        };

        findings.push(finding);
      }
    }

    return findings;
  }

  /**
   * Get all rules
   */
  getAllRules(): AdvancedPrivacyRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AdvancedPrivacyRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get rules by tag
   */
  getRulesByTag(tag: string): AdvancedPrivacyRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.tags.includes(tag));
  }

  /**
   * Get rule metrics
   */
  getRuleMetrics(ruleId?: string): RuleMetrics | RuleMetrics[] {
    if (ruleId) {
      return this.ruleMetrics.get(ruleId) || {
        ruleId,
        totalEvaluations: 0,
        totalMatches: 0,
        averageEvaluationTime: 0,
        lastEvaluated: new Date(),
        matchRate: 0
      };
    }

    return Array.from(this.ruleMetrics.values());
  }

  /**
   * Validate rule
   */
  private validateRule(rule: AdvancedPrivacyRule): void {
    if (!rule.name || rule.name.trim().length === 0) {
      throw new Error('Rule name is required');
    }

    if (!rule.pattern || rule.pattern.trim().length === 0) {
      throw new Error('Rule pattern is required');
    }

    if (!rule.piiType) {
      throw new Error('PII type is required');
    }

    if (!rule.sensitivityLevel) {
      throw new Error('Sensitivity level is required');
    }

    // Validate regex pattern
    try {
      new RegExp(rule.pattern);
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${error.message}`);
    }

    // Validate conditions if present
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        if (!condition.field || !condition.operator || condition.value === undefined) {
          throw new Error('Invalid rule condition: field, operator, and value are required');
        }
      }
    }
  }

  /**
   * Initialize default rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: Omit<AdvancedPrivacyRule, 'id' | 'createdAt' | 'updatedAt' | 'version'>[] = [
      {
        name: 'Employee ID Pattern',
        description: 'Detects employee ID patterns (EMP-XXXXX)',
        pattern: '\\bEMP-\\d{5}\\b',
        piiType: 'custom',
        sensitivityLevel: 'medium',
        isEnabled: true,
        priority: 100,
        tags: ['employee', 'internal'],
        createdBy: 'system',
        contextRules: {
          fieldNamePatterns: ['employee.*id', 'emp.*id', 'staff.*id'],
          systemTypes: ['crm', 'cms']
        }
      },
      {
        name: 'Customer Reference Number',
        description: 'Detects customer reference numbers (CRN-XXXXXXXX)',
        pattern: '\\bCRN-\\d{8}\\b',
        piiType: 'custom',
        sensitivityLevel: 'medium',
        isEnabled: true,
        priority: 90,
        tags: ['customer', 'reference'],
        createdBy: 'system',
        contextRules: {
          fieldNamePatterns: ['customer.*ref', 'crn', 'reference.*number'],
          systemTypes: ['crm']
        }
      },
      {
        name: 'Internal IP Address',
        description: 'Detects internal IP addresses (192.168.x.x, 10.x.x.x)',
        pattern: '\\b(?:192\\.168|10\\.)(?:\\d{1,3}\\.){2}\\d{1,3}\\b',
        piiType: 'custom',
        sensitivityLevel: 'low',
        isEnabled: true,
        priority: 50,
        tags: ['network', 'internal'],
        createdBy: 'system'
      },
      {
        name: 'API Key Pattern',
        description: 'Detects API key patterns (various formats)',
        pattern: '\\b(?:api[_-]?key|apikey)\\s*[:=]\\s*[\'"]?([a-zA-Z0-9]{32,})[\'"]?',
        piiType: 'custom',
        sensitivityLevel: 'high',
        isEnabled: true,
        priority: 150,
        tags: ['security', 'credentials'],
        createdBy: 'system'
      }
    ];

    // Add default rules
    for (const ruleData of defaultRules) {
      this.addRule(ruleData).catch(error => {
        console.error('Failed to add default rule:', error);
      });
    }
  }

  /**
   * Map sensitivity level to priority
   */
  private mapSensitivityToPriority(sensitivityLevel: SensitivityLevel): 'low' | 'medium' | 'high' | 'critical' {
    const mapping: Record<SensitivityLevel, 'low' | 'medium' | 'high' | 'critical'> = {
      low: 'low',
      medium: 'medium',
      high: 'high'
    };

    return mapping[sensitivityLevel] || 'medium';
  }

  /**
   * Mask content for findings
   */
  private maskContent(content: string): string {
    if (!content || content.length <= 4) {
      return '***';
    }
    
    const visibleChars = Math.min(2, Math.floor(content.length * 0.2));
    const maskedLength = content.length - (visibleChars * 2);
    
    return content.substring(0, visibleChars) + 
           '*'.repeat(maskedLength) + 
           content.substring(content.length - visibleChars);
  }

  /**
   * Generate unique rule ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique finding ID
   */
  private generateFindingId(): string {
    return `finding_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Export rules for backup
   */
  exportRules(): AdvancedPrivacyRule[] {
    return this.getAllRules();
  }

  /**
   * Import rules from backup
   */
  async importRules(rules: AdvancedPrivacyRule[]): Promise<void> {
    for (const rule of rules) {
      try {
        await this.addRule(rule);
      } catch (error) {
        console.error(`Failed to import rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Get engine statistics
   */
  getEngineStatistics() {
    const allMetrics = Array.from(this.ruleMetrics.values());
    
    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.isEnabled).length,
      totalEvaluations: allMetrics.reduce((sum, m) => sum + m.totalEvaluations, 0),
      totalMatches: allMetrics.reduce((sum, m) => sum + m.totalMatches, 0),
      averageMatchRate: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.matchRate, 0) / allMetrics.length 
        : 0,
      rulesByPiiType: this.getRuleDistributionByPiiType(),
      rulesBySensitivity: this.getRuleDistributionBySensitivity()
    };
  }

  /**
   * Get rule distribution by PII type
   */
  private getRuleDistributionByPiiType(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const rule of this.rules.values()) {
      distribution[rule.piiType] = (distribution[rule.piiType] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * Get rule distribution by sensitivity level
   */
  private getRuleDistributionBySensitivity(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const rule of this.rules.values()) {
      distribution[rule.sensitivityLevel] = (distribution[rule.sensitivityLevel] || 0) + 1;
    }
    
    return distribution;
  }
}