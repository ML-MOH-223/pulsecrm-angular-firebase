import { z } from 'zod';
import { environment } from '../../../environments/environment';
import { ValidationError } from '../errors/app-error';
import { logger } from '../observability/logger';

export const FirebaseConfigSchema = z.object({
  apiKey: z.string(),
  authDomain: z.string(),
  projectId: z.string(),
  storageBucket: z.string(),
  messagingSenderId: z.string(),
  appId: z.string(),
  measurementId: z.string().optional(),
});

export const AppEnvSchema = z.object({
  production: z.boolean(),
  useEmulators: z.boolean(),
  firebase: FirebaseConfigSchema,
});

export type ValidatedAppEnv = z.infer<typeof AppEnvSchema>;

function isPlaceholder(value: string): boolean {
  return (
    value.trim().length === 0 ||
    value.startsWith('YOUR_') ||
    value.startsWith('VOTRE_')
  );
}

export function isFirebaseConfigReady(cfg: ValidatedAppEnv['firebase']): boolean {
  return (
    !isPlaceholder(cfg.apiKey) &&
    !isPlaceholder(cfg.projectId) &&
    !isPlaceholder(cfg.appId)
  );
}

export function parseAppEnv(raw: unknown): ValidatedAppEnv {
  const parsed = AppEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.') || 'env'] = issue.message;
    }
    const err = new ValidationError('Invalid environment configuration', {
      requestId: 'boot_env',
      fields,
      context: { issues: parsed.error.issues },
    });
    logger.error('Environment configuration validation failed', {
      module: 'env',
      requestId: 'boot_env',
    }, err);
    throw err;
  }
  return parsed.data;
}

export const appEnv: ValidatedAppEnv = parseAppEnv(environment);
