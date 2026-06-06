import { buildApp, loggerOptions } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { closeSolvedTickets } from './modules/tickets/service.js';
import { seedDemo } from './seed/demo.js';

const HOUR = 60 * 60_000;

async function main() {
  const config = loadConfig();
  const database = createDatabase(config.databaseUrl);
  const app = await buildApp({ config, db: database.db, logger: loggerOptions(config) });

  await runMigrations(database.db);
  app.log.info('database migrations applied');

  if (config.seedDemo) {
    const seeded = await seedDemo(database.db, config, app.log);
    if (seeded) app.log.info('demo data created');
  }

  const housekeeping = async () => {
    try {
      const closed = await closeSolvedTickets(database.db, config.autoCloseDays, new Date());
      if (closed > 0) app.log.info({ closed }, 'closed tickets that stayed solved');
    } catch (err) {
      app.log.error({ err }, 'housekeeping failed');
    }
  };
  await housekeeping();
  const timer = setInterval(housekeeping, HOUR);
  timer.unref();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    clearInterval(timer);
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
