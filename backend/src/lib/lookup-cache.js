class IdLookupCache {
  constructor(loadByIds) {
    this.loadByIds = loadByIds;
  }
  map = /* @__PURE__ */ new Map();
  async preload(ids) {
    const missing = [...new Set(ids.filter((id) => typeof id === "number" && id > 0))].filter((id) => !this.map.has(id));
    if (!missing.length) return;
    const rows = await this.loadByIds(missing);
    for (const row of rows) this.map.set(row.id, row);
  }
  get(id) {
    if (id == null) return void 0;
    return this.map.get(id);
  }
}
export {
  IdLookupCache
};
