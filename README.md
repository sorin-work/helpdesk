# helpdesk

A small help desk: customers open tickets in a portal, agents work them from
shared queues against SLA targets that run on business hours.

## Stack

| Part  | Tech                                                         |
| ----- | ------------------------------------------------------------ |
| API   | Node 22, TypeScript, Fastify 5, Drizzle ORM, Zod, PostgreSQL |
| Web   | Vue 3, TypeScript, Vite, Pinia, Vue Router                   |
| Tests | Vitest, PGlite (in-memory Postgres), Vue Test Utils          |

## Running with Docker

```bash
docker compose up --build
```

Then open http://localhost:5190 and create an account. The API is on
http://localhost:4410 and Postgres on port 5450. Change the ports with
`WEB_PORT`, `API_PORT` and `DB_PORT` (see `.env.example`).

Agents and admins are not created through sign-up yet; promote a user in the
database for now:

```bash
docker compose exec db psql -U helpdesk -c "update users set role = 'admin' where email = 'you@example.com'"
```

## Running without Docker

You need Node 22+ and PostgreSQL 15+.

```bash
docker compose up -d db          # or use your own Postgres
npm install
cp api/.env.example api/.env     # adjust DATABASE_URL and JWT_SECRET
npm run dev                      # API on :4410, web app on :5190
```

The API applies migrations when it starts.

## Tests

```bash
npm test
npm run lint
npm run typecheck
```

API tests run against PGlite, so they do not need a database server.
