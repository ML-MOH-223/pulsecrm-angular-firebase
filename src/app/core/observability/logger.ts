import { environment } from '../../../environments/environment';
import { AppError } from '../errors/app-error';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  readonly requestId?: string;
  readonly userId?: string | null;
  readonly organizationId?: string | null;
  readonly module: string;
  readonly durationMs?: number;
  readonly [key: string]: unknown;
}

export interface StructuredLogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly requestId: string;
  readonly userId: string | null;
  readonly organizationId: string | null;
  readonly module: string;
  readonly version: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
  readonly data?: Record<string, unknown>;
}

const APP_VERSION = '1.0.0';
const MAX_BUFFER_SIZE = 100;
const SENSITIVE_KEY_PATTERN =
  /pass(word|phrase)?|token|secret|cookie|authorization|apikey|api_key|credential/i;

export function redactSensitiveData(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…[truncated]` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactSensitiveData(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitiveData(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

class StructuredLogger {
  private readonly buffer: StructuredLogEntry[] = [];
  private activeUserId: string | null = null;
  private activeOrgId: string | null = 'pulsecrm-default';

  setActor(userId: string | null, organizationId = 'pulsecrm-default'): void {
    this.activeUserId = userId;
    this.activeOrgId = organizationId;
  }

  getRecentLogs(): readonly StructuredLogEntry[] {
    return this.buffer;
  }

  clearBuffer(): void {
    this.buffer.length = 0;
  }

  debug(message: string, ctx: LogContext): void {
    if (environment.production) return;
    this.emit('debug', message, ctx);
  }

  info(message: string, ctx: LogContext): void {
    this.emit('info', message, ctx);
  }

  warn(message: string, ctx: LogContext, err?: unknown): void {
    this.emit('warn', message, ctx, err);
  }

  error(message: string, ctx: LogContext, err?: unknown): void {
    this.emit('error', message, ctx, err);
  }

  private buildErrorData(err: unknown, appErr: AppError | null): Record<string, unknown> | undefined {
    if (err === undefined) return undefined;
    return {
      errorName: err instanceof Error ? err.name : 'UnknownError',
      errorMessage: err instanceof Error ? err.message : String(err),
      ...(appErr ? { errorContext: redactSensitiveData(appErr.context) } : {}),
    };
  }

  private buildMergedData(
    rest: Record<string, unknown>,
    err: unknown,
    appErr: AppError | null
  ): Record<string, unknown> | undefined {
    const redactedRest =
      Object.keys(rest).length > 0
        ? (redactSensitiveData(rest) as Record<string, unknown>)
        : undefined;
    const errorData = this.buildErrorData(err, appErr);
    if (!redactedRest && !errorData) return undefined;
    return { ...(redactedRest ?? {}), ...(errorData ?? {}) };
  }

  private emit(level: LogLevel, message: string, ctx: LogContext, err?: unknown): void {
    const { requestId, userId, organizationId, module, durationMs, ...rest } = ctx;
    const appErr = err instanceof AppError ? err : null;
    const mergedData = this.buildMergedData(rest, err, appErr);

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: requestId ?? appErr?.requestId ?? 'req_none',
      userId: userId ?? this.activeUserId,
      organizationId: organizationId ?? this.activeOrgId,
      module,
      version: APP_VERSION,
      ...(durationMs !== undefined ? { durationMs: Math.round(durationMs) } : {}),
      ...(appErr ? { errorCode: appErr.code } : {}),
      ...(mergedData ? { data: mergedData } : {}),
    };

    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }

    this.writeToConsole(entry);
  }

  private writeToConsole(entry: StructuredLogEntry): void {
    // Controlled single console sink; all other console.* calls are forbidden by ESLint.
    if (typeof console === 'undefined') return;
    const payload = environment.production
      ? JSON.stringify(entry)
      : `[${entry.level.toUpperCase()}] [${entry.module}] (${entry.requestId}) ${entry.message}`;

    /* eslint-disable no-console */
    if (entry.level === 'error') {
      console.error(payload, environment.production ? '' : entry.data ?? '');
    } else if (entry.level === 'warn') {
      console.warn(payload, environment.production ? '' : entry.data ?? '');
    } else if (entry.level === 'debug') {
      console.debug(payload, environment.production ? '' : entry.data ?? '');
    } else {
      console.info(payload, environment.production ? '' : entry.data ?? '');
    }
    /* eslint-enable no-console */
  }
}

export const logger = new StructuredLogger();
