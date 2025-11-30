import type { z } from 'zod';

/** Parses input with a zod schema; the error handler turns failures into 400s. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  return schema.parse(input);
}
