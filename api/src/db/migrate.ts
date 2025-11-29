import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Db } from './client.js';

// Resolves to api/drizzle from both src/db (tsx) and dist/db (compiled).
export const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../drizzle',
);

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}
