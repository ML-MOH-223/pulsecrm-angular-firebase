import { logger, redactSensitiveData } from './logger';
import { createRequestId } from './request-id';

describe('StructuredLogger & requestId', () => {
  beforeEach(() => {
    logger.clearBuffer();
  });

  it('generates prefixed unique requestIds', () => {
    const id1 = createRequestId('deal');
    const id2 = createRequestId('deal');
    expect(id1.startsWith('deal_')).toBeTrue();
    expect(id1).not.toBe(id2);
  });

  it('redacts sensitive keys recursively', () => {
    const redacted = redactSensitiveData({
      email: 'alice@pulsecrm.io',
      password: 'super-secret-password',
      nested: {
        apiKey: 'AIzaSyTest',
        idToken: 'jwt-token',
        safeField: 'visible',
      },
    }) as Record<string, unknown>;

    expect(redacted['email']).toBe('alice@pulsecrm.io');
    expect(redacted['password']).toBe('[REDACTED]');
    const nested = redacted['nested'] as Record<string, unknown>;
    expect(nested['apiKey']).toBe('[REDACTED]');
    expect(nested['idToken']).toBe('[REDACTED]');
    expect(nested['safeField']).toBe('visible');
  });

  it('records structured log entries with actor, module, requestId, and durationMs', () => {
    logger.setActor('uid-42', 'org-acme');
    logger.info('Deal updated', {
      module: 'CrmStore',
      requestId: 'req_abc',
      durationMs: 42.7,
      dealId: 'd1',
    });

    const logs = logger.getRecentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].userId).toBe('uid-42');
    expect(logs[0].organizationId).toBe('org-acme');
    expect(logs[0].requestId).toBe('req_abc');
    expect(logs[0].durationMs).toBe(43);
    expect(logs[0].data?.['dealId']).toBe('d1');
  });
});
