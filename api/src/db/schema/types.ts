import { customType } from 'drizzle-orm/pg-core';

/** Postgres full-text search vector. Only ever written by generated columns. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});
