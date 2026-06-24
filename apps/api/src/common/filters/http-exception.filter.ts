import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const code = (HttpStatus as Record<number, string | undefined>)[status] ?? 'HTTP_ERROR';

      response.status(status).json(this.buildEnvelope(code, body, exception.message));
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    } satisfies ErrorEnvelope);
  }

  private buildEnvelope(code: string, body: string | object, fallbackMessage: string): ErrorEnvelope {
    if (typeof body === 'string') {
      return { error: { code, message: body } };
    }

    const record = body as Record<string, unknown>;
    const rawMessage = record['message'];

    if (Array.isArray(rawMessage)) {
      return { error: { code, message: 'Validation failed', details: rawMessage } };
    }

    const message = typeof rawMessage === 'string' ? rawMessage : fallbackMessage;
    const details = record['details'];

    return details !== undefined
      ? { error: { code, message, details } }
      : { error: { code, message } };
  }
}
