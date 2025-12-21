# helpdesk

A small help desk: customers open tickets, agents answer them against SLA
targets that run on business hours.

Work in progress. The API is a Fastify + TypeScript service on PostgreSQL; a Vue
front end is next.

## Running locally

You need Node 22+ and PostgreSQL 15+. The compose file starts a database on
port 5450:

```bash
docker compose up -d db
npm install
cp api/.env.example api/.env
npm run dev -w api
```

The API listens on http://localhost:4410 and applies migrations on startup.

## Tests

```bash
npm test
npm run lint
npm run typecheck
```

API tests run against PGlite (Postgres compiled to WASM), so they do not need a
database server.
