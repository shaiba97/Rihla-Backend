import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            message:
              exception instanceof Error
                ? exception.message
                : String(exception),
          };

    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : (errorResponse as any).message ?? String(errorResponse);

    this.logger.error(
      `[${request.method}] ${request.url} — ${status} — ${Array.isArray(message) ? message.join('; ') : message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message.join('; ') : message,
    });
  }
}
