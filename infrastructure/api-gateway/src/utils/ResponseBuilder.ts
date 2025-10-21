import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Utility class for building consistent API Gateway responses
 */
export class ResponseBuilder {
  
  static success(data: any, statusCode: number = 200): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data,
        timestamp: new Date().toISOString()
      })
    };
  }
  
  static error(message: string, statusCode: number = 400, details?: any): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: {
          message,
          details,
          code: statusCode
        },
        timestamp: new Date().toISOString()
      })
    };
  }
  
  static validation(errors: string[]): APIGatewayProxyResult {
    return this.error('Validation failed', 400, { validationErrors: errors });
  }
  
  static unauthorized(message: string = 'Unauthorized'): APIGatewayProxyResult {
    return this.error(message, 401);
  }
  
  static forbidden(message: string = 'Forbidden'): APIGatewayProxyResult {
    return this.error(message, 403);
  }
  
  static notFound(message: string = 'Resource not found'): APIGatewayProxyResult {
    return this.error(message, 404);
  }
  
  static serverError(message: string = 'Internal server error'): APIGatewayProxyResult {
    return this.error(message, 500);
  }
}