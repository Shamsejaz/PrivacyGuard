import { AWSServiceClients } from '../config/service-clients';

/**
 * Feedback Collection Service
 * Collects and manages human feedback for machine learning improvement
 */
export class FeedbackCollectionService {
  private awsClients: AWSServiceClients;
  private dynamoClient: any;
  private s3Client: any;

  constructor() {
    this.awsClients = AWSServiceClients.getInstance();
    this.dynamoClient = this.awsClients.getDynamoDBClient();
    this.s3Client = this.awsClients.getS3Client();
  }

  /**
   * Collect feedback on compliance assessment accuracy
   */
  async collectAssessmentFeedback(feedback: {
    findingId: string;
    assessmentId: string;
    userId: string;
    correctAssessment: boolean;
    correctRiskScore?: number;
    correctLegalMappings?: string[];
    comments?: string;
    timestamp?: Date;
  }): Promise<string> {
    try {
      const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const feedbackRecord = {
        id: feedbackId,
        type: 'ASSESSMENT_FEEDBACK',
        findingId: feedback.findingId,
        assessmentId: feedback.assessmentId,
        userId: feedback.userId,
        correctAssessment: feedback.correctAssessment,
        correctRiskScore: feedback.correctRiskScore,
        correctLegalMappings: feedback.correctLegalMappings,
        comments: feedback.comments,
        timestamp: feedback.timestamp || new Date(),
        processed: false
      };

      // Store feedback in DynamoDB
      await this.dynamoClient.putItem({
        TableName: 'PrivacyComplyFeedback',
        Item: this.marshalDynamoItem(feedbackRecord)
      }).promise();

      console.log(`Assessment feedback collected: ${feedbackId}`);
      return feedbackId;
    } catch (error) {
      console.error('Error collecting assessment feedback:', error);
      throw new Error(`Failed to collect assessment feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect feedback on remediation recommendation effectiveness
   */
  async collectRemediationFeedback(feedback: {
    remediationId: string;
    recommendationId: string;
    userId: string;
    effectiveRemediation: boolean;
    actualOutcome?: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';
    sideEffects?: string[];
    alternativeApproach?: string;
    comments?: string;
    timestamp?: Date;
  }): Promise<string> {
    try {
      const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const feedbackRecord = {
        id: feedbackId,
        type: 'REMEDIATION_FEEDBACK',
        remediationId: feedback.remediationId,
        recommendationId: feedback.recommendationId,
        userId: feedback.userId,
        effectiveRemediation: feedback.effectiveRemediation,
        actualOutcome: feedback.actualOutcome,
        sideEffects: feedback.sideEffects,
        alternativeApproach: feedback.alternativeApproach,
        comments: feedback.comments,
        timestamp: feedback.timestamp || new Date(),
        processed: false
      };

      // Store feedback in DynamoDB
      await this.dynamoClient.putItem({
        TableName: 'PrivacyComplyFeedback',
        Item: this.marshalDynamoItem(feedbackRecord)
      }).promise();

      console.log(`Remediation feedback collected: ${feedbackId}`);
      return feedbackId;
    } catch (error) {
      console.error('Error collecting remediation feedback:', error);
      throw new Error(`Failed to collect remediation feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect feedback on false positive/negative detections
   */
  async collectDetectionFeedback(feedback: {
    findingId: string;
    userId: string;
    falsePositive: boolean;
    falseNegative?: boolean;
    actualSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actualFindingType?: string;
    missedFindings?: string[];
    comments?: string;
    timestamp?: Date;
  }): Promise<string> {
    try {
      const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const feedbackRecord = {
        id: feedbackId,
        type: 'DETECTION_FEEDBACK',
        findingId: feedback.findingId,
        userId: feedback.userId,
        falsePositive: feedback.falsePositive,
        falseNegative: feedback.falseNegative,
        actualSeverity: feedback.actualSeverity,
        actualFindingType: feedback.actualFindingType,
        missedFindings: feedback.missedFindings,
        comments: feedback.comments,
        timestamp: feedback.timestamp || new Date(),
        processed: false
      };

      // Store feedback in DynamoDB
      await this.dynamoClient.putItem({
        TableName: 'PrivacyComplyFeedback',
        Item: this.marshalDynamoItem(feedbackRecord)
      }).promise();

      console.log(`Detection feedback collected: ${feedbackId}`);
      return feedbackId;
    } catch (error) {
      console.error('Error collecting detection feedback:', error);
      throw new Error(`Failed to collect detection feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect general system feedback
   */
  async collectSystemFeedback(feedback: {
    userId: string;
    category: 'USABILITY' | 'PERFORMANCE' | 'ACCURACY' | 'FEATURE_REQUEST' | 'BUG_REPORT';
    rating: number; // 1-5 scale
    description: string;
    context?: Record<string, any>;
    timestamp?: Date;
  }): Promise<string> {
    try {
      const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const feedbackRecord = {
        id: feedbackId,
        type: 'SYSTEM_FEEDBACK',
        userId: feedback.userId,
        category: feedback.category,
        rating: feedback.rating,
        description: feedback.description,
        context: feedback.context,
        timestamp: feedback.timestamp || new Date(),
        processed: false
      };

      // Store feedback in DynamoDB
      await this.dynamoClient.putItem({
        TableName: 'PrivacyComplyFeedback',
        Item: this.marshalDynamoItem(feedbackRecord)
      }).promise();

      console.log(`System feedback collected: ${feedbackId}`);
      return feedbackId;
    } catch (error) {
      console.error('Error collecting system feedback:', error);
      throw new Error(`Failed to collect system feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get unprocessed feedback for ML training
   */
  async getUnprocessedFeedback(limit: number = 100): Promise<any[]> {
    try {
      const params = {
        TableName: 'PrivacyComplyFeedback',
        FilterExpression: 'processed = :processed',
        ExpressionAttributeValues: {
          ':processed': { BOOL: false }
        },
        Limit: limit
      };

      const result = await this.dynamoClient.scan(params).promise();
      return result.Items?.map((item: any) => this.unmarshalDynamoItem(item)) || [];
    } catch (error) {
      console.error('Error getting unprocessed feedback:', error);
      throw new Error(`Failed to get unprocessed feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark feedback as processed
   */
  async markFeedbackProcessed(feedbackIds: string[]): Promise<void> {
    try {
      const updatePromises = feedbackIds.map(id => 
        this.dynamoClient.updateItem({
          TableName: 'PrivacyComplyFeedback',
          Key: { id: { S: id } },
          UpdateExpression: 'SET processed = :processed, processedAt = :processedAt',
          ExpressionAttributeValues: {
            ':processed': { BOOL: true },
            ':processedAt': { S: new Date().toISOString() }
          }
        }).promise()
      );

      await Promise.all(updatePromises);
      console.log(`Marked ${feedbackIds.length} feedback items as processed`);
    } catch (error) {
      console.error('Error marking feedback as processed:', error);
      throw new Error(`Failed to mark feedback as processed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStatistics(timeRange?: { startDate: Date; endDate: Date }): Promise<{
    totalFeedback: number;
    feedbackByType: Record<string, number>;
    averageRating: number;
    processedFeedback: number;
    unprocessedFeedback: number;
    feedbackByUser: Record<string, number>;
    recentTrends: Array<{ date: string; count: number; averageRating: number }>;
  }> {
    try {
      let params: any = {
        TableName: 'PrivacyComplyFeedback'
      };

      // Add time range filter if provided
      if (timeRange) {
        params.FilterExpression = '#timestamp BETWEEN :startDate AND :endDate';
        params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
        params.ExpressionAttributeValues = {
          ':startDate': { S: timeRange.startDate.toISOString() },
          ':endDate': { S: timeRange.endDate.toISOString() }
        };
      }

      const result = await this.dynamoClient.scan(params).promise();
      const feedback = result.Items?.map((item: any) => this.unmarshalDynamoItem(item)) || [];

      // Calculate statistics
      const stats = {
        totalFeedback: feedback.length,
        feedbackByType: {} as Record<string, number>,
        averageRating: 0,
        processedFeedback: 0,
        unprocessedFeedback: 0,
        feedbackByUser: {} as Record<string, number>,
        recentTrends: [] as Array<{ date: string; count: number; averageRating: number }>
      };

      let totalRating = 0;
      let ratingCount = 0;

      feedback.forEach((item: any) => {
        // Count by type
        stats.feedbackByType[item.type] = (stats.feedbackByType[item.type] || 0) + 1;

        // Count processed/unprocessed
        if (item.processed) {
          stats.processedFeedback++;
        } else {
          stats.unprocessedFeedback++;
        }

        // Count by user
        if (item.userId) {
          stats.feedbackByUser[item.userId] = (stats.feedbackByUser[item.userId] || 0) + 1;
        }

        // Calculate average rating
        if (item.rating) {
          totalRating += item.rating;
          ratingCount++;
        }
      });

      stats.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      // Calculate recent trends (last 7 days)
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayFeedback = feedback.filter((item: any) => 
          item.timestamp && item.timestamp.toISOString().split('T')[0] === dateStr
        );

        const dayRating = dayFeedback
          .filter((item: any) => item.rating)
          .reduce((sum: number, item: any) => sum + item.rating, 0);
        
        const dayRatingCount = dayFeedback.filter((item: any) => item.rating).length;

        stats.recentTrends.push({
          date: dateStr,
          count: dayFeedback.length,
          averageRating: dayRatingCount > 0 ? dayRating / dayRatingCount : 0
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting feedback statistics:', error);
      throw new Error(`Failed to get feedback statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export feedback data for analysis
   */
  async exportFeedbackData(
    timeRange?: { startDate: Date; endDate: Date },
    feedbackTypes?: string[]
  ): Promise<string> {
    try {
      let params: any = {
        TableName: 'PrivacyComplyFeedback'
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

      if (feedbackTypes && feedbackTypes.length > 0) {
        const typeConditions = feedbackTypes.map((type, index) => {
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
      const feedback = result.Items?.map((item: any) => this.unmarshalDynamoItem(item)) || [];

      // Export to S3
      const exportKey = `feedback-exports/${Date.now()}-feedback-export.json`;
      const bucketName = this.awsClients.getS3ReportsBucket();

      await this.s3Client.putObject({
        Bucket: bucketName,
        Key: exportKey,
        Body: JSON.stringify(feedback, null, 2),
        ContentType: 'application/json'
      }).promise();

      console.log(`Feedback data exported to s3://${bucketName}/${exportKey}`);
      return exportKey;
    } catch (error) {
      console.error('Error exporting feedback data:', error);
      throw new Error(`Failed to export feedback data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          if (key === 'timestamp' || key === 'processedAt') {
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