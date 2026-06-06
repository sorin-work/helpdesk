# helpdesk

A help desk for small support teams. Customers open requests through a simple
portal; agents work them from shared queues with SLA targets, canned responses
and internal notes; admins set business hours, targets and the team.

## Features

- Customer portal: sign up, open requests with attachments, reply, mark as solved
- Agent queues: assigned to me, unassigned, all open, overdue and recently solved
- Statuses with allowed transitions, priorities and SLA targets per priority,
  counted in business hours and paused while waiting on the customer
- Round-robin assignment, internal notes, canned responses with placeholders,
  tags, attachments and full-text search
- Reports: volume, first-response and resolution times, SLA compliance

## Running with Docker

```bash
docker compose up --build
```

Then open http://localhost:5190. The first start creates demo data:

| Role     | Email                  | Password            |
| -------- | ---------------------- | ------------------- |
| Admin    | `demo@example.com`     | `demo-password`     |
| Agent    | `agent@example.com`    | `agent-password`    |
| Customer | `customer@example.com` | `customer-password` |

Set `SEED_DEMO=false` to start empty. Ports can be changed with `WEB_PORT`,
`API_PORT` and `DB_PORT` (see `.env.example`).

## Running without Docker

You need Node 22+ and PostgreSQL 15+.

```bash
docker compose up -d db          # or use your own Postgres
npm install
cp api/.env.example api/.env     # adjust DATABASE_URL and JWT_SECRET
npm run dev                      # API on :4410, web app on :5190
```

## Tests

```bash
npm test
npm run lint
npm run typecheck
```

API tests run against PGlite, so they do not need a database server.
