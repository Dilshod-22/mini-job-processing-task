import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // HTTP Exception (NestJS built-in)
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        error = (responseObj.error as string) || exception.name;

        // Handle validation errors (class-validator)
        if (Array.isArray(responseObj.message)) {
          message = (responseObj.message as string[]).join(', ');
        }
      }
    }
    // TypeORM Query Errors
    else if (exception instanceof QueryFailedError) {
      const driverError = (exception as QueryFailedError & { driverError?: { code?: string; detail?: string } }).driverError;

      if (driverError?.code === '23505') {
        statusCode = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        error = 'Conflict';
      }
      // Foreign key violation
      else if (driverError?.code === '23503') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Referenced resource does not exist';
        error = 'Bad Request';
      }
      // Not null violation
      else if (driverError?.code === '23502') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Required field is missing';
        error = 'Bad Request';
      }
      // Other database errors
      else {
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database error occurred';
        error = 'Internal Server Error';
      }

      this.logger.error(
        `Database error: ${exception.message}`,
        exception.stack,
      );
    }
    // Generic Error
    else if (exception instanceof Error) {
      message = exception.message || message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }
    // Unknown error type
    else {
      this.logger.error(`Unknown exception type: ${JSON.stringify(exception)}`);
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(errorResponse);
  }
}
