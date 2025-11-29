import { buildApp, loggerOptions } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { runMigrations } from './db/migrate.js';

async function main() {
  const config = loadConfig();
  const database = createDatabase(config.databaseUrl);
  const app = await buildApp({ config, db: database.db, logger: loggerOptions(config) });

  await runMigrations(database.db);
  app.log.info('database migrations applied');

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await database.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.host, port: config.port });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
