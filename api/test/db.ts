import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Db } from '../src/db/client.js';
import { migrationsFolder } from '../src/db/migrate.js';
import * as schema from '../src/db/schema/index.js';

export interface TestDatabase {
  db: Db;
  close(): Promise<void>;
}

/** In-memory Postgres (PGlite) with all migrations applied. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder });
  // The query builder API is the same; only the driver type differs.
  return { db: pglite as unknown as Db, close: () => client.close() };
}

/** Empties every application table, keeping the schema. */
export async function resetDatabase(db: Db): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
}
