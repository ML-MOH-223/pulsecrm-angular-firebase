import {
  AppError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  normalizeError,
} from './app-error';
import { ERROR_CATALOG } from './error-codes';

describe('AppError & normalizeError', () => {
  it('creates safe API-compatible responses without leaking stack traces', () => {
    const err = new ValidationError('Invalid email', {
      requestId: 'req_test_123',
      fields: { email: 'Format email invalide' },
    });

    const safe = err.toSafeResponse();
    expect(safe).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: ERROR_CATALOG.VALIDATION_ERROR.defaultUserMessage,
        requestId: 'req_test_123',
        fields: { email: 'Format email invalide' },
      },
    });
    expect('stack' in safe.error).toBeFalse();
    expect(JSON.stringify(safe)).not.toContain('app-error.ts');
  });

  it('normalizes Firebase permission-denied, not-found, already-exists, and unavailable codes', () => {
    const forbidden = normalizeError({ code: 'permission-denied', message: 'Denied' }, {
      code: 'DATABASE_ERROR',
      requestId: 'req_1',
    });
    expect(forbidden).toBeInstanceOf(ForbiddenError);
    expect(forbidden.statusCode).toBe(403);

    const notFound = normalizeError({ code: 'not-found', message: 'Missing' }, {
      code: 'DATABASE_ERROR',
      requestId: 'req_2',
    });
    expect(notFound).toBeInstanceOf(NotFoundError);
    expect(notFound.statusCode).toBe(404);

    const conflict = normalizeError({ code: 'already-exists', message: 'Dup' }, {
      code: 'DATABASE_ERROR',
      requestId: 'req_3',
    });
    expect(conflict).toBeInstanceOf(ConflictError);
    expect(conflict.statusCode).toBe(409);

    const ext = normalizeError({ code: 'unavailable', message: 'Offline' }, {
      code: 'DATABASE_ERROR',
      requestId: 'req_4',
    });
    expect(ext).toBeInstanceOf(ExternalServiceError);
    expect(ext.statusCode).toBe(502);

    const db = normalizeError(new Error('Generic failure'), {
      code: 'DATABASE_ERROR',
      requestId: 'req_5',
    });
    expect(db).toBeInstanceOf(DatabaseError);
    expect(db.statusCode).toBe(500);
  });

  it('returns existing AppError instances unchanged', () => {
    const existing = new AppError('Original', { code: 'AUTH_ERROR', requestId: 'req_orig' });
    expect(normalizeError(existing, { code: 'UNKNOWN_ERROR', requestId: 'req_other' })).toBe(existing);
  });
});
