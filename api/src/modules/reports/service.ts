import { sql, type SQL } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { TICKET_PRIORITIES, type TicketPriority } from '../../db/schema/index.js';
import { zonedTimeToUtc } from '../../lib/business-hours.js';
import { getSchedule } from '../sla/service.js';

export interface ReportRange {
  /** Local dates (YYYY-MM-DD) in the business-hours time zone, inclusive. */
  from: string;
  to: string;
}

interface Compliance {
  met: number;
  breached: number;
  /** Share of concluded clocks that met the target, 0-1. Null without data. */
  rate: number | null;
}

interface Duration {
  count: number;
  medianMinutes: number | null;
  averageMinutes: number | null;
}

export interface ReportOverview {
  range: ReportRange & { timezone: string };
  totals: { created: number; solved: number; backlog: number };
  volume: { date: string; created: number; solved: number }[];
  firstResponse: Duration;
  resolution: Duration;
  sla: { firstResponse: Compliance; resolution: Compliance };
  byPriority: {
    priority: TicketPriority;
    created: number;
    firstResponse: Compliance;
    resolution: Compliance;
  }[];
  byAgent: {
    id: number;
    name: string;
    assigned: number;
    solved: number;
    medianFirstResponseMinutes: number | null;
  }[];
}

function civil(date: string) {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

function compliance(met: number, breached: number): Compliance {
  const total = met + breached;
  return { met, breached, rate: total === 0 ? null : met / total };
}

const num = (value: unknown) => (value === null || value === undefined ? 0 : Number(value));
const numOrNull = (value: unknown) =>
  value === null || value === undefined ? null : Math.round(Number(value));

function metrics(now: Date): SQL {
  return sql`
    count(*)::int as created,
    count(*) filter (where t.solved_at is not null)::int as solved,
    percentile_cont(0.5) within group (order by t.first_response_minutes)::float8 as fr_median,
    avg(t.first_response_minutes)::float8 as fr_avg,
    count(t.first_response_minutes)::int as fr_count,
    percentile_cont(0.5) within group (order by t.resolution_minutes)::float8 as res_median,
    avg(t.resolution_minutes)::float8 as res_avg,
    count(t.resolution_minutes)::int as res_count,
    count(*) filter (where
      coalesce(t.first_responded_at, t.solved_at) <= t.first_response_due_at)::int as fr_met,
    count(*) filter (where
      coalesce(t.first_responded_at, t.solved_at) > t.first_response_due_at
      or (coalesce(t.first_responded_at, t.solved_at) is null
          and t.first_response_due_at < ${now}))::int as fr_breached,
    count(*) filter (where t.solved_at <= t.resolution_due_at)::int as res_met,
    count(*) filter (where t.solved_at > t.resolution_due_at
      or (t.solved_at is null and t.sla_paused_at is null
          and t.resolution_due_at < ${now}))::int as res_breached`;
}

type Row = Record<string, unknown>;

async function rows(db: Db, query: SQL): Promise<Row[]> {
  const result = await db.execute(query);
  return result.rows as Row[];
}

export async function reportOverview(
  db: Db,
  range: ReportRange,
  now: Date,
): Promise<ReportOverview> {
  const { timezone } = await getSchedule(db);
  const start = new Date(zonedTimeToUtc(civil(range.from), 0, timezone));
  const end = new Date(zonedTimeToUtc(civil(range.to), 24 * 60, timezone));
  const inRange = sql`t.created_at >= ${start} and t.created_at < ${end}`;

  const [volume, [overall], priorities, agents, [backlog]] = await Promise.all([
    rows(
      db,
      sql`
      with days as (
        select generate_series(${range.from}::date, ${range.to}::date, interval '1 day')::date as day
      )
      select to_char(d.day, 'YYYY-MM-DD') as date,
        (select count(*) from tickets t
          where (t.created_at at time zone ${timezone})::date = d.day)::int as created,
        (select count(*) from tickets t
          where (t.solved_at at time zone ${timezone})::date = d.day)::int as solved
      from days d
      order by d.day`,
    ),
    rows(db, sql`select ${metrics(now)} from tickets t where ${inRange}`),
    rows(
      db,
      sql`select t.priority, ${metrics(now)} from tickets t where ${inRange} group by t.priority`,
    ),
    rows(
      db,
      sql`
      select u.id, u.name,
        count(t.id)::int as assigned,
        count(t.solved_at)::int as solved,
        percentile_cont(0.5) within group (order by t.first_response_minutes)::float8 as fr_median
      from users u
      join tickets t on t.assignee_id = u.id and ${inRange}
      group by u.id, u.name
      order by solved desc, u.name`,
    ),
    rows(
      db,
      sql`select count(*)::int as backlog from tickets
        where status in ('new', 'open', 'pending', 'on_hold')`,
    ),
  ]);

  const o = overall ?? {};
  const byPriority = TICKET_PRIORITIES.map((priority) => {
    const p = priorities.find((row) => row.priority === priority) ?? {};
    return {
      priority,
      created: num(p.created),
      firstResponse: compliance(num(p.fr_met), num(p.fr_breached)),
      resolution: compliance(num(p.res_met), num(p.res_breached)),
    };
  }).reverse();

  return {
    range: { ...range, timezone },
    totals: { created: num(o.created), solved: num(o.solved), backlog: num(backlog?.backlog) },
    volume: volume.map((row) => ({
      date: String(row.date),
      created: num(row.created),
      solved: num(row.solved),
    })),
    firstResponse: {
      count: num(o.fr_count),
      medianMinutes: numOrNull(o.fr_median),
      averageMinutes: numOrNull(o.fr_avg),
    },
    resolution: {
      count: num(o.res_count),
      medianMinutes: numOrNull(o.res_median),
      averageMinutes: numOrNull(o.res_avg),
    },
    sla: {
      firstResponse: compliance(num(o.fr_met), num(o.fr_breached)),
      resolution: compliance(num(o.res_met), num(o.res_breached)),
    },
    byPriority,
    byAgent: agents.map((row) => ({
      id: num(row.id),
      name: String(row.name),
      assigned: num(row.assigned),
      solved: num(row.solved),
      medianFirstResponseMinutes: numOrNull(row.fr_median),
    })),
  };
}
