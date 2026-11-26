import { ERROR_CATALOG, ErrorCode } from './error-codes';

export interface SafeErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly requestId: string;
    readonly fields?: Record<string, string>;
  };
}

export interface AppErrorOptions {
  readonly code: ErrorCode;
  readonly statusCode?: number;
  readonly userMessage?: string;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
  readonly requestId?: string;
  readonly fields?: Record<string, string>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly userMessage: string;
  readonly context: Record<string, unknown>;
  readonly requestId: string;
  readonly fields?: Record<string, string>;
  readonly timestamp: string;

  constructor(message: string, options: AppErrorOptions) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    const def = ERROR_CATALOG[options.code];
    this.code = options.code;
    this.statusCode = options.statusCode ?? def.statusCode;
    this.userMessage = options.userMessage ?? def.defaultUserMessage;
    this.context = options.context ?? {};
    this.requestId = options.requestId ?? 'req_unassigned';
    this.fields = options.fields;
    this.timestamp = new Date().toISOString();
  }

  toSafeResponse(): SafeErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.userMessage,
        requestId: this.requestId,
        ...(this.fields ? { fields: this.fields } : {}),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    options: Omit<AppErrorOptions, 'code' | 'statusCode'> = {}
  ) {
    super(message, { ...options, code: 'VALIDATION_ERROR', statusCode: 400 });
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string,
    options: Omit<AppErrorOptions, 'code' | 'statusCode'> = {}
  ) {
    super(message, { ...options, code: 'NOT_FOUND', statusCode: 404 });
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string,
    options: Omit<AppErrorOptions, 'code' | 'statusCode'> = {}
  ) {
    super(message, { ...options, code: 'FORBIDDEN', statusCode: 403 });
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    options: Omit<AppErrorOptions, 'code' | 'statusCode'> = {}
  ) {
    super(message, { ...options, code: 'CONFLICT', statusCode: 409 });
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    options: Omit<AppErrorOptions, 'code' | 'statusCode'> = {}
  ) {
    super(message, { ...options, code: 'EXTERNAL_SERVICE_ERROR', statusCode: 502 });
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    options: Omit<AppErrorOptions, 'code' | 'statusCode'> = {}
  ) {
    super(message, { ...options, code: 'DATABASE_ERROR', statusCode: 500 });
  }
}

function extractFirebaseCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

const PROVIDER_CODE_MAP: Record<
  string,
  new (message: string, opts: Omit<AppErrorOptions, 'code' | 'statusCode'>) => AppError
> = {
  'permission-denied': ForbiddenError,
  'functions/permission-denied': ForbiddenError,
  'not-found': NotFoundError,
  'functions/not-found': NotFoundError,
  'already-exists': ConflictError,
  unavailable: ExternalServiceError,
  'deadline-exceeded': ExternalServiceError,
};

export function normalizeError(
  err: unknown,
  fallback: {
    code: ErrorCode;
    userMessage?: string;
    requestId: string;
    context?: Record<string, unknown>;
  }
): AppError {
  if (err instanceof AppError) {
    return err;
  }

  const fbCode = extractFirebaseCode(err);
  const rawMessage = err instanceof Error ? err.message : String(err);
  const baseContext = {
    ...(fallback.context ?? {}),
    ...(fbCode ? { providerCode: fbCode } : {}),
  };

  const MappedErrorCtor = PROVIDER_CODE_MAP[fbCode];
  if (MappedErrorCtor) {
    return new MappedErrorCtor(rawMessage, {
      userMessage: fallback.userMessage,
      requestId: fallback.requestId,
      context: baseContext,
      cause: err,
    });
  }

  if (fallback.code === 'DATABASE_ERROR') {
    return new DatabaseError(rawMessage, {
      userMessage: fallback.userMessage,
      requestId: fallback.requestId,
      context: baseContext,
      cause: err,
    });
  }

  return new AppError(rawMessage, {
    code: fallback.code,
    userMessage: fallback.userMessage,
    requestId: fallback.requestId,
    context: baseContext,
    cause: err,
  });
}
