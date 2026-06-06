import pino from 'pino';
import { loadConfig } from '../config.js';
import { createDatabase } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { seedDemo } from '../seed/demo.js';

const log = pino({ name: 'seed' });
const config = loadConfig();
const database = createDatabase(config.databaseUrl);
try {
  await runMigrations(database.db);
  const seeded = await seedDemo(database.db, config, log);
  log.info(seeded ? 'demo data created' : 'demo data already present, nothing to do');
} finally {
  await database.close();
}
