import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((value) => value === 'true' || value === '1' || value === 'yes');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4410),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  SESSION_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: booleanString.default(false),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(100).default(10),
  ALLOWED_UPLOAD_TYPES: z
    .string()
    .default(
      'image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv,application/zip,' +
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
});

export type Env = z.infer<typeof envSchema>;

export interface Config {
  env: Env['NODE_ENV'];
  host: string;
  port: number;
  logLevel: Env['LOG_LEVEL'];
  databaseUrl: string;
  jwtSecret: string;
  sessionDays: number;
  cookieSecure: boolean;
  uploadDir: string;
  maxUploadBytes: number;
  allowedUploadTypes: string[];
  bcryptRounds: number;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${problems}`);
  }
  const env = parsed.data;
  return {
    env: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET,
    sessionDays: env.SESSION_DAYS,
    cookieSecure: env.COOKIE_SECURE,
    uploadDir: env.UPLOAD_DIR,
    maxUploadBytes: Math.round(env.MAX_UPLOAD_MB * 1024 * 1024),
    allowedUploadTypes: env.ALLOWED_UPLOAD_TYPES.split(',')
      .map((type) => type.trim())
      .filter(Boolean),
    bcryptRounds: env.BCRYPT_ROUNDS,
  };
}
