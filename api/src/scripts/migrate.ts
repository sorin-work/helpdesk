import pino from 'pino';
import { createDatabase } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';

const log = pino({ name: 'migrate' });
const url = process.env.DATABASE_URL;
if (!url) {
  log.error('DATABASE_URL is not set');
  process.exit(1);
}

const database = createDatabase(url);
try {
  await runMigrations(database.db);
  log.info('migrations applied');
} finally {
  await database.close();
}
