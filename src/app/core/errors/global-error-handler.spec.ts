import { logger } from '../observability/logger';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    logger.clearBuffer();
  });

  it('captures unhandled errors and records structured log with requestId', () => {
    const handler = new GlobalErrorHandler();
    handler.handleError(new Error('Unexpected UI failure'));

    const logs = logger.getRecentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].module).toBe('GlobalErrorHandler');
    expect(logs[0].errorCode).toBe('UNKNOWN_ERROR');
    expect(logs[0].requestId.startsWith('err_')).toBeTrue();
  });
});
