/** In-memory cache for batching related-entity lookups in list formatters. */
export class IdLookupCache<T extends { id: number }> {
  private readonly map = new Map<number, T>();

  constructor(private readonly loadByIds: (ids: number[]) => Promise<T[]>) {}

  async preload(ids: Array<number | null | undefined>): Promise<void> {
    const missing = [...new Set(ids.filter((id): id is number => typeof id === "number" && id > 0))]
      .filter((id) => !this.map.has(id));
    if (!missing.length) return;
    const rows = await this.loadByIds(missing);
    for (const row of rows) this.map.set(row.id, row);
  }

  get(id: number | null | undefined): T | undefined {
    if (id == null) return undefined;
    return this.map.get(id);
  }
}
