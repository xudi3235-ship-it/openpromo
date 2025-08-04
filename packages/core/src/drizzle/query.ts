import { type MySqlSelect, QueryBuilder } from "drizzle-orm/mysql-core";

function _withPagination<T extends MySqlSelect>(
  qb: T,
  page: number = 1,
  pageSize: number = 20,
) {
  return qb.limit(pageSize).offset((page - 1) * pageSize);
}

export const qb = new QueryBuilder();
