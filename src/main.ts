import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { AppError } from './app/core/errors/app-error';
import { logger } from './app/core/observability/logger';
import { createRequestId } from './app/core/observability/request-id';

bootstrapApplication(AppComponent, appConfig).catch((err: unknown) => {
  const requestId = createRequestId('boot');
  const bootErr = new AppError('Angular bootstrapApplication failed', {
    code: 'BOOTSTRAP_ERROR',
    requestId,
    cause: err,
  });
  logger.error('Application bootstrap failed', { module: 'main', requestId }, bootErr);
});
