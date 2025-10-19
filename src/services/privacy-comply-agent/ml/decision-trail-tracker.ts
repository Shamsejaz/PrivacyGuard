import { AWSServiceClients } from '../config/service-clients';

/**
 * Decision Trail Tracker
 * Tracks and maintains audit trails of all AI decisions and reasoning
 */
export class DecisionTrailTracker {
  private awsClients: AWSServiceClients;
  private dynamoClient: any;
  private s3Client: any;

  constructor() {
    this.awsClients = AWSServiceClients.getInstance();
    this.dynamoClient = this.awsClients.getDynamoDBClient();
    this.s3Client = this.awsClients.getS3Client();
  }

  /**
   * Record a compliance assessment decision
   */
  async recordAssessmentDecision(decision: {
    findingId: string;
    assessmentId: string;
    modelUsed: string;
    inputData: any;
    reasoning: string;
    confidence: number;
    legalMappings: any[];
    riskScore: number;
    recommendations: string[];
    processingTime: number;
    timestamp?: Date;
  }): Promise<string> {
    try {
      const trailId = `trail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const decisionRecord = {
        id: trailId,
        type: 'ASSESSMENT_DECISION',
        findingId: decision.findingId,
        assessmentId: decision.assessmentId,
        modelUsed: decision.modelUsed,
        inputData: decision.inputData,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        legalMappings: decision.legalMappings,
        riskScore: decision.riskScore,
        recommendations: decision.recommendations,
        processingTime: decision.processingTime,
        timestamp: decision.timestamp || new Date(),
        version: '1.0'
      };

      // Store decision trail in DynamoDB
      await this.dynamoClient.putItem({
        TableName: 'PrivacyComplyDecisionTrail',
        Item: this.marshalDynamoItem(decisionRecord)
      }).promise();

      // Store detailed reasoning in S3 for long-term storage
      await this.storeDetailedReasoning(trailId, {
        reasoning: decision.reasoning,
        inputData: decision.inputData,
        modelOutputs: {
          legalMappings: decision.legalMappings,
          riskScore: decision.riskScore,
          recommendations: decision.recommendations
        }
      });

      console.log(`Assessment decision recorded: ${trailId}`);
      return trailId;
    } catch (error) {
      console.error('Error recording assessment decision:', error);
      throw new Error(`Failed to record assessment decision: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record a remediation decision
   */
  async recordRemediationDecision(decision: {
    remediationId: string;
    recommendationId: string;
    findingId: string;
    action: string;
    parameters: any;
    riskAssessment: string;
    approvalRequired: boolean;
    estimatedImpact: string;
    rollbackPlan: string;
    timestamp?: Date;
  }): Promise<string> {
    try {
      const trailId = `trail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const decisionRecord = {
        id: trailId,
        type: 'REMEDIATION_DECISION',
        remediationId: decision.remediationId,
        recommendationId: decision.recommendationId,
        findingId: decision.findingId,
        action: decision.action,
        parameters: decision.parameters,
        riskAssessment: decision.riskAssessment,
        approvalRequired: decision.approvalRequired,
        estimatedImpact: decision.estimatedImpact,
        rollbackPlan: decision.rollbackPlan,
        timestamp: decision.timestamp || new Date(),
        version: '1.0'
      };

      // Store decision trail in DynamoDB
      await this.dynamoClient.putItem({
        TableName: 'PrivacyComplyDecisionTrail',
        Item: this.marshalDynamoItem(decisionRecord)
      }).promise();

      console.log(`Remediation decision recorded: ${trailId}`);
      return trailId;
    } catch (error) {
      console.error('Error recording remediation decision:', error);
      throw new Error(`Failed to record remediation decision: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record a model prediction decision
   */
  async recordModelPrediction(prediction: {
    modelName: string;
    modelVersion: string;
    inputFeatures: any;
    prediction: any;
    confidence: number;
    predictionType: 'RISK_SCORE' | 'FALSE_POSITIVE' | 'REMEDIATION_SUCCESS';
    context: any;
    timestamp?: Date;
  }): Promise<string> {
    try {
      const trailId = `trail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const predictionRecord = {
        id: trailId,
        type: 'MODEL_PREDICTION',
        modelName: prediction.modelName,
        modelVersion: prediction.modelVersion,
        inputFeatures: prediction.inputFeatures,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        predictionType: prediction.predictionType,
        context: prediction.context,
        timestamp: prediction.timestamp || new Date(),
        version: '1.0'
      };

      // Store prediction trail in DynamoDB
      await this.dynamoClient.putItem({
        TableName: 'PrivacyComplyDecisionTrail',
        Item: this.marshalDynamoItem(predictionRecord)
      }).promise();

      console.log(`Model prediction recorded: ${trailId}`);
      return trailId;
    } catch (error) {
      console.error('Error recording model prediction:', error);
      throw new Error(`Failed to record model prediction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record a system decision (non-ML)
   */
  async recordSystemDecision(decision: {
    decisionType: string;
    context: any;
    logic: string;
    outcome: any;
    triggeredBy: string;
    timestamp?: Date;
  }): Promise<string> {
    try {
      const trailId = `trail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const decisionRecord = {
        id: trailId,
        type: 'SYSTEM_DECISION',
        decisionType: decision.decisionType,
        context: decision.context,
        logic: decision.logic,
        outcome: decision.outcome,
        triggeredBy: decision.triggeredBy,
        timestamp: decision.timestamp || new Date(),
        version: '1.0'
      };

      // Store decision trail in DynamoDB
      await this.dynamoClient.putItem({
        TableName: 'PrivacyComplyDecisionTrail',
        Item: this.marshalDynamoItem(decisionRecord)
      }).promise();

      console.log(`System decision recorded: ${trailId}`);
      return trailId;
    } catch (error) {
      console.error('Error recording system decision:', error);
      throw new Error(`Failed to record system decision: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get decision trail for a specific finding
   */
  async getDecisionTrailForFinding(findingId: string): Promise<any[]> {
    try {
      const params = {
        TableName: 'PrivacyComplyDecisionTrail',
        FilterExpression: 'findingId = :findingId',
        ExpressionAttributeValues: {
          ':findingId': { S: findingId }
        }
      };

      const result = await this.dynamoClient.scan(params).promise();
      const decisions = result.Items?.map((item: any) => this.unmarshalDynamoItem(item)) || [];

      // Sort by timestamp
      decisions.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return decisions;
    } catch (error) {
      console.error('Error getting decision trail for finding:', error);
      throw new Error(`Failed to get decision trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get decision trail by type and time range
   */
  async getDecisionTrailByType(
    decisionType: string,
    timeRange?: { startDate: Date; endDate: Date },
    limit: number = 100
  ): Promise<any[]> {
    try {
      let params: any = {
        TableName: 'PrivacyComplyDecisionTrail',
        FilterExpression: '#type = :type',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: {
          ':type': { S: decisionType }
        },
        Limit: limit
      };

      if (timeRange) {
        params.FilterExpression += ' AND #timestamp BETWEEN :startDate AND :endDate';
        params.ExpressionAttributeNames['#timestamp'] = 'timestamp';
        params.ExpressionAttributeValues[':startDate'] = { S: timeRange.startDate.toISOString() };
        params.ExpressionAttributeValues[':endDate'] = { S: timeRange.endDate.toISOString() };
      }

      const result = await this.dynamoClient.scan(params).promise();
      const decisions = result.Items?.map((item: any) => this.unmarshalDynamoItem(item)) || [];

      // Sort by timestamp (most recent first)
      decisions.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return decisions;
    } catch (error) {
      console.error('Error getting decision trail by type:', error);
      throw new Error(`Failed to get decision trail by type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze decision patterns
   */
  async analyzeDecisionPatterns(timeRange: { startDate: Date; endDate: Date }): Promise<{
    totalDecisions: number;
    decisionsByType: Record<string, number>;
    averageConfidence: Record<string, number>;
    decisionTrends: Array<{ date: string; count: number; types: Record<string, number> }>;
    modelUsage: Record<string, number>;
    processingTimeStats: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
  }> {
    try {
      const params = {
        TableName: 'PrivacyComplyDecisionTrail',
        FilterExpression: '#timestamp BETWEEN :startDate AND :endDate',
        ExpressionAttributeNames: { '#timestamp': 'timestamp' },
        ExpressionAttributeValues: {
          ':startDate': { S: timeRange.startDate.toISOString() },
          ':endDate': { S: timeRange.endDate.toISOString() }
        }
      };

      const result = await this.dynamoClient.scan(params).promise();
      const decisions = result.Items?.map((item: any) => this.unmarshalDynamoItem(item)) || [];

      // Initialize analysis results
      const analysis = {
        totalDecisions: decisions.length,
        decisionsByType: {} as Record<string, number>,
        averageConfidence: {} as Record<string, number>,
        decisionTrends: [] as Array<{ date: string; count: number; types: Record<string, number> }>,
        modelUsage: {} as Record<string, number>,
        processingTimeStats: {
          average: 0,
          median: 0,
          min: 0,
          max: 0
        }
      };

      // Analyze decisions by type and confidence
      const confidenceByType: Record<string, number[]> = {};
      const processingTimes: number[] = [];

      decisions.forEach((decision: any) => {
        // Count by type
        analysis.decisionsByType[decision.type] = (analysis.decisionsByType[decision.type] || 0) + 1;

        // Collect confidence scores
        if (decision.confidence !== undefined) {
          if (!confidenceByType[decision.type]) {
            confidenceByType[decision.type] = [];
          }
          confidenceByType[decision.type].push(decision.confidence);
        }

        // Count model usage
        if (decision.modelUsed) {
          analysis.modelUsage[decision.modelUsed] = (analysis.modelUsage[decision.modelUsed] || 0) + 1;
        }

        // Collect processing times
        if (decision.processingTime !== undefined) {
          processingTimes.push(decision.processingTime);
        }
      });

      // Calculate average confidence by type
      Object.keys(confidenceByType).forEach(type => {
        const confidences = confidenceByType[type];
        analysis.averageConfidence[type] = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
      });

      // Calculate processing time statistics
      if (processingTimes.length > 0) {
        processingTimes.sort((a, b) => a - b);
        analysis.processingTimeStats.average = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
        analysis.processingTimeStats.median = processingTimes[Math.floor(processingTimes.length / 2)];
        analysis.processingTimeStats.min = processingTimes[0];
        analysis.processingTimeStats.max = processingTimes[processingTimes.length - 1];
      }

      // Calculate daily trends
      const dailyDecisions: Record<string, { count: number; types: Record<string, number> }> = {};
      
      decisions.forEach((decision: any) => {
        const date = new Date(decision.timestamp).toISOString().split('T')[0];
        
        if (!dailyDecisions[date]) {
          dailyDecisions[date] = { count: 0, types: {} };
        }
        
        dailyDecisions[date].count++;
        dailyDecisions[date].types[decision.type] = (dailyDecisions[date].types[decision.type] || 0) + 1;
      });

      analysis.decisionTrends = Object.keys(dailyDecisions)
        .sort()
        .map(date => ({
          date,
          count: dailyDecisions[date].count,
          types: dailyDecisions[date].types
        }));

      return analysis;
    } catch (error) {
      console.error('Error analyzing decision patterns:', error);
      throw new Error(`Failed to analyze decision patterns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export decision trail data
   */
  async exportDecisionTrail(
    timeRange?: { startDate: Date; endDate: Date },
    decisionTypes?: string[]
  ): Promise<string> {
    try {
      let params: any = {
        TableName: 'PrivacyComplyDecisionTrail'
      };

      // Build filter expression
      const filterExpressions: string[] = [];
      const expressionAttributeValues: any = {};

      if (timeRange) {
        filterExpressions.push('#timestamp BETWEEN :startDate AND :endDate');
        params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
        expressionAttributeValues[':startDate'] = { S: timeRange.startDate.toISOString() };
        expressionAttributeValues[':endDate'] = { S: timeRange.endDate.toISOString() };
      }

      if (decisionTypes && decisionTypes.length > 0) {
        const typeConditions = decisionTypes.map((type, index) => {
          expressionAttributeValues[`:type${index}`] = { S: type };
          return `#type = :type${index}`;
        });
        filterExpressions.push(`(${typeConditions.join(' OR ')})`);
        params.ExpressionAttributeNames = { 
          ...params.ExpressionAttributeNames, 
          '#type': 'type' 
        };
      }

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
        params.ExpressionAttributeValues = expressionAttributeValues;
      }

      const result = await this.dynamoClient.scan(params).promise();
      const decisions = result.Items?.map((item: any) => this.unmarshalDynamoItem(item)) || [];

      // Export to S3
      const exportKey = `decision-trail-exports/${Date.now()}-decision-trail-export.json`;
      const bucketName = this.awsClients.getS3ReportsBucket();

      await this.s3Client.putObject({
        Bucket: bucketName,
        Key: exportKey,
        Body: JSON.stringify(decisions, null, 2),
        ContentType: 'application/json'
      }).promise();

      console.log(`Decision trail exported to s3://${bucketName}/${exportKey}`);
      return exportKey;
    } catch (error) {
      console.error('Error exporting decision trail:', error);
      throw new Error(`Failed to export decision trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store detailed reasoning in S3
   */
  private async storeDetailedReasoning(trailId: string, reasoning: any): Promise<void> {
    try {
      const s3Key = `decision-reasoning/${trailId}.json`;
      const bucketName = this.awsClients.getS3ReportsBucket();

      await this.s3Client.putObject({
        Bucket: bucketName,
        Key: s3Key,
        Body: JSON.stringify(reasoning, null, 2),
        ContentType: 'application/json'
      }).promise();
    } catch (error) {
      console.error('Error storing detailed reasoning:', error);
      // Don't throw here as this is supplementary storage
    }
  }

  /**
   * Helper method to marshal DynamoDB items
   */
  private marshalDynamoItem(item: Record<string, any>): Record<string, any> {
    const marshaled: any = {};
    
    for (const [key, value] of Object.entries(item)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'string') {
        marshaled[key] = { S: value };
      } else if (typeof value === 'number') {
        marshaled[key] = { N: value.toString() };
      } else if (typeof value === 'boolean') {
        marshaled[key] = { BOOL: value };
      } else if (value instanceof Date) {
        marshaled[key] = { S: value.toISOString() };
      } else if (Array.isArray(value)) {
        marshaled[key] = { SS: value.map(v => v.toString()) };
      } else if (typeof value === 'object') {
        marshaled[key] = { S: JSON.stringify(value) };
      }
    }
    
    return marshaled;
  }

  /**
   * Helper method to unmarshal DynamoDB items
   */
  private unmarshalDynamoItem(item: Record<string, any>): Record<string, any> {
    const unmarshaled: any = {};
    
    for (const [key, value] of Object.entries(item)) {
      const dynamoValue = value as any;
      
      if (dynamoValue.S !== undefined) {
        // Try to parse as JSON first, then as Date, then as string
        try {
          unmarshaled[key] = JSON.parse(dynamoValue.S);
        } catch {
          if (key === 'timestamp' || key.includes('Time') || key.includes('At')) {
            unmarshaled[key] = new Date(dynamoValue.S);
          } else {
            unmarshaled[key] = dynamoValue.S;
          }
        }
      } else if (dynamoValue.N !== undefined) {
        unmarshaled[key] = parseFloat(dynamoValue.N);
      } else if (dynamoValue.BOOL !== undefined) {
        unmarshaled[key] = dynamoValue.BOOL;
      } else if (dynamoValue.SS !== undefined) {
        unmarshaled[key] = dynamoValue.SS;
      }
    }
    
    return unmarshaled;
  }
}