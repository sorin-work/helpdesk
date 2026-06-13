import { eq } from 'drizzle-orm';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { tickets, type TicketPriority, type User } from '../db/schema/index.js';
import { addBusinessMinutes, type BusinessSchedule } from '../lib/business-hours.js';
import { scheduleFor } from '../lib/sla.js';
import { saveAssignmentSettings } from '../modules/assignment/service.js';
import { createCannedResponse } from '../modules/canned/service.js';
import { DEFAULT_POLICIES, savePolicies, saveSchedule } from '../modules/sla/service.js';
import { addMessage } from '../modules/tickets/messages.js';
import { closeSolvedTickets, createTicket, updateTicket } from '../modules/tickets/service.js';
import { createUser, findUserByEmail } from '../modules/users/service.js';
import { AGENTS, CANNED_RESPONSES, CHASERS, CUSTOMERS, SCENARIOS } from './content.js';

export const DEMO_ADMIN = {
  email: 'demo@example.com',
  password: 'demo-password',
  name: 'Dana Whitfield',
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TICKETS = 72;
const HISTORY_DAYS = 45;

export const DEMO_SCHEDULE: BusinessSchedule = {
  timezone: 'Europe/London',
  days: {
    sun: null,
    mon: { start: '09:00', end: '17:30' },
    tue: { start: '09:00', end: '17:30' },
    wed: { start: '09:00', end: '17:30' },
    thu: { start: '09:00', end: '17:30' },
    fri: { start: '09:00', end: '16:00' },
    sat: null,
  },
  holidays: ['2026-12-25', '2026-12-28', '2027-01-01'],
};

interface SeedLogger {
  info(msg: string): void;
}

/** Small deterministic PRNG so every demo database looks the same. */
function random(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (min: number, max: number) => min + next() * (max - min),
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
  };
}

export async function seedDemo(db: Db, config: Config, log: SeedLogger): Promise<boolean> {
  if (await findUserByEmail(db, DEMO_ADMIN.email)) return false;

  const rng = random(20251129);
  const now = new Date();
  const rounds = config.bcryptRounds;

  const admin = await createUser(db, { ...DEMO_ADMIN, role: 'admin' }, rounds);
  const agents: User[] = [];
  for (const agent of AGENTS)
    agents.push(await createUser(db, { ...agent, role: 'agent' }, rounds));
  const customers: User[] = [];
  for (const customer of CUSTOMERS) {
    customers.push(
      await createUser(
        db,
        { ...customer, password: customer.password ?? 'customer-password', role: 'customer' },
        rounds,
      ),
    );
  }
  log.info(`seeded ${agents.length} agents and ${customers.length} customers`);

  await saveSchedule(db, DEMO_SCHEDULE);
  await savePolicies(db, DEFAULT_POLICIES);
  for (const canned of CANNED_RESPONSES) await createCannedResponse(db, admin, canned);

  const team = [...agents, ...agents, admin];
  const limit = now.getTime() - 5 * MINUTE;
  const escalated: { id: number; agent: User }[] = [];

  for (let i = 0; i < TICKETS; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length]!;
    // Casey gets a handful of tickets so the customer login has something to show.
    const customer = i % 6 === 0 ? customers[0]! : rng.pick(customers.slice(1));
    const agent = rng.pick(team);
    const priority: TicketPriority =
      scenario.priority === 'normal' && rng.chance(0.15) ? 'high' : scenario.priority;
    const target = DEFAULT_POLICIES[priority];
    const clock = scheduleFor(target, DEMO_SCHEDULE);

    // Spread tickets over the last weeks, a bit denser towards today.
    const age = Math.pow(rng.next(), 2) * HISTORY_DAYS * DAY;
    const createdAt = new Date(Math.min(limit - HOUR, now.getTime() - age));
    const at = (date: Date) => (date.getTime() < limit ? date : null);

    const ticket = await createTicket(
      db,
      customer,
      {
        subject: scenario.subject,
        body: scenario.opening,
        priority,
        attachmentIds: [],
        tags: [],
      },
      createdAt,
    );

    // A quarter of the replies miss the first-response target.
    const factor = rng.chance(0.25) ? rng.between(1.05, 2.2) : rng.between(0.05, 0.9);
    const respondAt = at(
      addBusinessMinutes(createdAt, target.firstResponseMinutes * factor, clock),
    );
    // Keep a fresh backlog so the queues have something in them.
    const fresh = createdAt.getTime() > now.getTime() - 2 * DAY;
    if (!respondAt || (fresh && rng.chance(0.3))) {
      // Still waiting: leave some unassigned for the queue, assign the rest.
      if (rng.chance(0.4)) {
        await updateTicket(db, admin, ticket.id, { assigneeId: agent.id }, createdAt);
      }
      continue;
    }

    await updateTicket(db, agent, ticket.id, { tags: scenario.tags }, respondAt);
    if (scenario.note) {
      await addMessage(
        db,
        agent,
        ticket.id,
        { body: scenario.note, internal: true, attachmentIds: [] },
        new Date(Math.max(createdAt.getTime() + MINUTE, respondAt.getTime() - 2 * MINUTE)),
      );
    }

    const waitsForCustomer = Boolean(scenario.followUp) || !scenario.closing;
    const followUpAt = at(new Date(respondAt.getTime() + rng.between(1, 30) * HOUR));
    const oldEnough = createdAt.getTime() < now.getTime() - 5 * DAY;

    if (!waitsForCustomer) {
      await addMessage(
        db,
        agent,
        ticket.id,
        {
          body: `${scenario.reply}\n\n${scenario.closing}`,
          internal: false,
          status: 'solved',
          attachmentIds: [],
        },
        respondAt,
      );
      continue;
    }

    // Bugs and anything escalated internally wait on someone else for a while.
    const onHold = !oldEnough && (scenario.tags.includes('bug') || Boolean(scenario.note));
    if (onHold) escalated.push({ id: ticket.id, agent });
    await addMessage(
      db,
      agent,
      ticket.id,
      {
        body: scenario.reply,
        internal: false,
        status: onHold ? 'on_hold' : rng.chance(0.25) ? 'open' : 'pending',
        attachmentIds: [],
      },
      respondAt,
    );
    if (!followUpAt) continue;

    if (!scenario.followUp) {
      // No reply from the customer: solve old ones after a few days of silence.
      if (oldEnough) {
        await updateTicket(
          db,
          agent,
          ticket.id,
          { status: 'solved' },
          new Date(Math.min(limit, respondAt.getTime() + 3 * DAY)),
        );
      }
      continue;
    }

    await addMessage(
      db,
      customer,
      ticket.id,
      {
        body: rng.chance(0.2) ? rng.pick(CHASERS) : scenario.followUp,
        internal: false,
        attachmentIds: [],
      },
      followUpAt,
    );

    const closeAt = at(
      addBusinessMinutes(followUpAt, rng.between(20, 600), scheduleFor(target, DEMO_SCHEDULE)),
    );
    if (!closeAt || (!oldEnough && rng.chance(0.7))) continue;
    await addMessage(
      db,
      agent,
      ticket.id,
      {
        body: scenario.closing ?? 'Thanks for confirming. I will mark this as solved.',
        internal: false,
        status: 'solved',
        attachmentIds: [],
      },
      closeAt,
    );
  }

  // Customers chased some escalated tickets back to open; park a few again.
  let parked = 0;
  for (const { id, agent } of escalated.reverse()) {
    if (parked >= 3) break;
    const [row] = await db
      .select({ status: tickets.status })
      .from(tickets)
      .where(eq(tickets.id, id));
    if (row?.status !== 'open') continue;
    await updateTicket(
      db,
      agent,
      id,
      { status: 'on_hold' },
      new Date(limit - parked * 20 * MINUTE),
    );
    parked++;
  }

  const closed = await closeSolvedTickets(db, config.autoCloseDays || 7, now);
  await saveAssignmentSettings(db, { autoAssign: true });
  log.info(`seeded ${TICKETS} tickets (${closed} closed after staying solved)`);
  return true;
}
