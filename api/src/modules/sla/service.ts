import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DbOrTx } from '../../db/client.js';
import {
  settings,
  slaPolicies,
  TICKET_PRIORITIES,
  type TicketPriority,
} from '../../db/schema/index.js';
import {
  DEFAULT_SCHEDULE,
  isValidTimezone,
  parseClock,
  WEEKDAYS,
  type BusinessSchedule,
} from '../../lib/business-hours.js';
import type { SlaTarget } from '../../lib/sla.js';

export const BUSINESS_HOURS_KEY = 'business_hours';

/** Sensible starting targets, in minutes. */
export const DEFAULT_POLICIES: Record<TicketPriority, SlaTarget> = {
  urgent: { firstResponseMinutes: 60, resolutionMinutes: 8 * 60, businessHours: false },
  high: { firstResponseMinutes: 4 * 60, resolutionMinutes: 2 * 8 * 60, businessHours: true },
  normal: { firstResponseMinutes: 8 * 60, resolutionMinutes: 5 * 8 * 60, businessHours: true },
  low: { firstResponseMinutes: 2 * 8 * 60, resolutionMinutes: 10 * 8 * 60, businessHours: true },
};

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)');

const dayHours = z
  .object({ start: clock, end: clock })
  .refine((d) => parseClock(d.end) > parseClock(d.start), {
    message: 'End time must be after start time',
    path: ['end'],
  })
  .nullable();

export const scheduleSchema = z
  .object({
    timezone: z.string().refine(isValidTimezone, 'Unknown time zone'),
    days: z.object(
      Object.fromEntries(WEEKDAYS.map((day) => [day, dayHours])) as Record<
        (typeof WEEKDAYS)[number],
        typeof dayHours
      >,
    ),
    holidays: z
      .array(z.iso.date())
      .max(366)
      .transform((dates) => [...new Set(dates)].sort()),
  })
  .refine((s) => Object.values(s.days).some((d) => d !== null), {
    message: 'At least one day needs working hours',
    path: ['days'],
  });

export const policySchema = z.object({
  firstResponseMinutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 60),
  resolutionMinutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 365),
  businessHours: z.boolean(),
});

export async function getSchedule(db: DbOrTx): Promise<BusinessSchedule> {
  const [row] = await db.select().from(settings).where(eq(settings.key, BUSINESS_HOURS_KEY));
  if (!row) return DEFAULT_SCHEDULE;
  const parsed = scheduleSchema.safeParse(row.value);
  return parsed.success ? parsed.data : DEFAULT_SCHEDULE;
}

export async function saveSchedule(db: DbOrTx, schedule: BusinessSchedule): Promise<void> {
  await db
    .insert(settings)
    .values({ key: BUSINESS_HOURS_KEY, value: schedule })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: schedule, updatedAt: new Date() },
    });
}

export async function getPolicies(db: DbOrTx): Promise<Record<TicketPriority, SlaTarget>> {
  const rows = await db.select().from(slaPolicies);
  const result = { ...DEFAULT_POLICIES };
  for (const row of rows) {
    result[row.priority] = {
      firstResponseMinutes: row.firstResponseMinutes,
      resolutionMinutes: row.resolutionMinutes,
      businessHours: row.businessHours,
    };
  }
  return result;
}

export async function getPolicy(db: DbOrTx, priority: TicketPriority): Promise<SlaTarget> {
  const [row] = await db.select().from(slaPolicies).where(eq(slaPolicies.priority, priority));
  if (!row) return DEFAULT_POLICIES[priority];
  return {
    firstResponseMinutes: row.firstResponseMinutes,
    resolutionMinutes: row.resolutionMinutes,
    businessHours: row.businessHours,
  };
}

export async function savePolicies(
  db: DbOrTx,
  policies: Partial<Record<TicketPriority, SlaTarget>>,
): Promise<void> {
  for (const priority of TICKET_PRIORITIES) {
    const target = policies[priority];
    if (!target) continue;
    await db
      .insert(slaPolicies)
      .values({ priority, ...target })
      .onConflictDoUpdate({
        target: slaPolicies.priority,
        set: { ...target, updatedAt: new Date() },
      });
  }
}
