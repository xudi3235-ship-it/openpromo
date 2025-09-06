import { type PgSelect, QueryBuilder } from "drizzle-orm/pg-core";

export function withPagination<T extends PgSelect>(
  qb: T,
  page: number = 1,
  pageSize: number = 20,
) {
  return qb.limit(pageSize).offset((page - 1) * pageSize);
}

export const qb = new QueryBuilder();
