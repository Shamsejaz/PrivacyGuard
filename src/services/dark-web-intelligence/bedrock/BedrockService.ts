/**
 * AWS Bedrock Service Integration for Dark Web Intelligence Analysis
 * Provides AI-powered threat analysis, risk scoring, and PII redaction
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
  BedrockRuntimeClientConfig
} from '@aws-sdk/client-bedrock-runtime';
import { fromEnv } from '@aws-sdk/credential-providers';

export interface BedrockConfig {
  region: string;
  modelId: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  timeout: number;
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export interface BedrockRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  streaming?: boolean;
}

export interface BedrockResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  modelId: string;
  timestamp: Date;
}

export interface BedrockStreamResponse {
  content: AsyncIterable<string>;
  usage: Promise<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }>;
  modelId: string;
  timestamp: Date;
}

export class BedrockService {
  private client: BedrockRuntimeClient;
  private config: BedrockConfig;

  constructor(config: BedrockConfig) {
    this.config = config;
    
    const clientConfig: BedrockRuntimeClientConfig = {
      region: config.region,
      credentials: fromEnv(),
      requestHandler: {
        requestTimeout: config.timeout
      },
      retryMode: 'adaptive',
      maxAttempts: config.retryConfig.maxRetries
    };

    this.client = new BedrockRuntimeClient(clientConfig);
  }

  /**
   * Invoke Bedrock model with standard request/response
   */
  async invokeModel(request: BedrockRequest): Promise<BedrockResponse> {
    try {
      const body = this.buildRequestBody(request);
      
      const command = new InvokeModelCommand({
        modelId: this.config.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body)
      });

      const response = await this.client.send(command);
      
      if (!response.body) {
        throw new Error('Empty response body from Bedrock');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return {
        content: this.extractContent(responseBody),
        usage: this.extractUsage(responseBody),
        modelId: this.config.modelId,
        timestamp: new Date()
      };
    } catch (error) {
      throw this.handleBedrockError(error);
    }
  }

  /**
   * Invoke Bedrock model with streaming response for real-time analysis
   */
  async invokeModelStream(request: BedrockRequest): Promise<BedrockStreamResponse> {
    try {
      const body = this.buildRequestBody(request);
      
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.config.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body)
      });

      const response = await this.client.send(command);
      
      if (!response.body) {
        throw new Error('Empty response body from Bedrock streaming');
      }

      const contentStream = this.processStreamResponse(response.body);
      const usagePromise = this.extractStreamUsage(response.body);

      return {
        content: contentStream,
        usage: usagePromise,
        modelId: this.config.modelId,
        timestamp: new Date()
      };
    } catch (error) {
      throw this.handleBedrockError(error);
    }
  }

  /**
   * Build request body based on model type (Claude vs Titan)
   */
  private buildRequestBody(request: BedrockRequest): any {
    const maxTokens = request.maxTokens || this.config.maxTokens;
    const temperature = request.temperature || this.config.temperature;
    const topP = request.topP || this.config.topP;

    // Claude model format
    if (this.config.modelId.includes('claude')) {
      const messages = [];
      
      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: request.prompt
      });

      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        messages
      };
    }
    
    // Titan model format
    if (this.config.modelId.includes('titan')) {
      return {
        inputText: request.systemPrompt ? 
          `${request.systemPrompt}\n\nHuman: ${request.prompt}\n\nAssistant:` : 
          request.prompt,
        textGenerationConfig: {
          maxTokenCount: maxTokens,
          temperature,
          topP
        }
      };
    }

    throw new Error(`Unsupported model: ${this.config.modelId}`);
  }

  /**
   * Extract content from response based on model type
   */
  private extractContent(responseBody: any): string {
    // Claude response format
    if (responseBody.content && Array.isArray(responseBody.content)) {
      return responseBody.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('');
    }
    
    // Titan response format
    if (responseBody.results && Array.isArray(responseBody.results)) {
      return responseBody.results
        .map((result: any) => result.outputText)
        .join('');
    }

    throw new Error('Unable to extract content from response');
  }

  /**
   * Extract token usage from response
   */
  private extractUsage(responseBody: any): { inputTokens: number; outputTokens: number; totalTokens: number } {
    // Claude usage format
    if (responseBody.usage) {
      return {
        inputTokens: responseBody.usage.input_tokens || 0,
        outputTokens: responseBody.usage.output_tokens || 0,
        totalTokens: (responseBody.usage.input_tokens || 0) + (responseBody.usage.output_tokens || 0)
      };
    }
    
    // Titan usage format (if available)
    if (responseBody.inputTextTokenCount && responseBody.results) {
      const outputTokens = responseBody.results.reduce((sum: number, result: any) => 
        sum + (result.tokenCount || 0), 0);
      
      return {
        inputTokens: responseBody.inputTextTokenCount,
        outputTokens,
        totalTokens: responseBody.inputTextTokenCount + outputTokens
      };
    }

    // Default fallback
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    };
  }

  /**
   * Process streaming response
   */
  private async* processStreamResponse(stream: any): AsyncIterable<string> {
    try {
      for await (const chunk of stream) {
        if (chunk.chunk?.bytes) {
          const chunkData = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
          
          // Claude streaming format
          if (chunkData.type === 'content_block_delta' && chunkData.delta?.text) {
            yield chunkData.delta.text;
          }
          
          // Titan streaming format
          if (chunkData.outputText) {
            yield chunkData.outputText;
          }
        }
      }
    } catch (error) {
      throw new Error(`Streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract usage from streaming response
   */
  private async extractStreamUsage(stream: any): Promise<{ inputTokens: number; outputTokens: number; totalTokens: number }> {
    // For streaming, usage is typically provided in the final chunk
    // This is a simplified implementation - actual usage extraction would depend on the specific model
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    };
  }

  /**
   * Handle Bedrock-specific errors with retry logic
   */
  private handleBedrockError(error: any): Error {
    if (error.name === 'ThrottlingException') {
      return new BedrockError(
        'Rate limit exceeded',
        'RATE_LIMIT',
        true,
        error
      );
    }
    
    if (error.name === 'ValidationException') {
      return new BedrockError(
        'Invalid request parameters',
        'VALIDATION_ERROR',
        false,
        error
      );
    }
    
    if (error.name === 'AccessDeniedException') {
      return new BedrockError(
        'Insufficient permissions for Bedrock access',
        'ACCESS_DENIED',
        false,
        error
      );
    }
    
    if (error.name === 'ModelNotReadyException') {
      return new BedrockError(
        'Model is not ready or available',
        'MODEL_NOT_READY',
        true,
        error
      );
    }

    return new BedrockError(
      error.message || 'Unknown Bedrock error',
      'UNKNOWN_ERROR',
      false,
      error
    );
  }

  /**
   * Test connection to Bedrock service
   */
  async testConnection(): Promise<boolean> {
    try {
      const testRequest: BedrockRequest = {
        prompt: 'Test connection',
        maxTokens: 10
      };
      
      await this.invokeModel(testRequest);
      return true;
    } catch (error) {
      console.error('Bedrock connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.testConnection();
      return {
        healthy: true,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export class BedrockError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
    public originalError?: any
  ) {
    super(message);
    this.name = 'BedrockError';
  }
}

// Default configuration
export const DEFAULT_BEDROCK_CONFIG: BedrockConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
  maxTokens: 4000,
  temperature: 0.1,
  topP: 0.9,
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
};