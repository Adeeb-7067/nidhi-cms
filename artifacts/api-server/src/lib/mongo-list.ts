import type { Model, SortOrder } from "mongoose";

export type PaginationSlice = {
  page: number;
  limit: number;
  skip: number;
};

export type PaginateOptions = {
  sort?: Record<string, SortOrder>;
  projection?: Record<string, 0 | 1>;
  lean?: boolean;
};

/** Standard paginated find + count (lean by default for list endpoints). */
export async function paginateModel<T = unknown>(
  model: Model<unknown>,
  filter: Record<string, unknown>,
  pagination: PaginationSlice,
  options: PaginateOptions = {},
): Promise<{ items: T[]; total: number; page: number; limit: number }> {
  const sort = options.sort ?? { createdAt: -1 };
  const useLean = options.lean !== false;

  const findQuery = model
    .find(filter, options.projection)
    .sort(sort)
    .skip(pagination.skip)
    .limit(pagination.limit);

  const [items, total] = await Promise.all([
    (useLean ? findQuery.lean().exec() : findQuery.exec()) as Promise<T[]>,
    model.countDocuments(filter),
  ]);

  return { items, total, page: pagination.page, limit: pagination.limit };
}

export function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
