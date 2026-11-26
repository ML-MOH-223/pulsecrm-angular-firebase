import { ErrorHandler, Injectable } from '@angular/core';
import { normalizeError } from './app-error';
import { logger } from '../observability/logger';
import { createRequestId } from '../observability/request-id';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const requestId = createRequestId('err');
    const appError = normalizeError(error, {
      code: 'UNKNOWN_ERROR',
      requestId,
      context: { source: 'GlobalErrorHandler' },
    });

    logger.error('Unhandled application error captured by GlobalErrorHandler', {
      module: 'GlobalErrorHandler',
      requestId: appError.requestId,
    }, appError);
  }
}
