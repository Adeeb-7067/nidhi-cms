async function paginateModel(model, filter, pagination, options = {}) {
  const sort = options.sort ?? { createdAt: -1 };
  const useLean = options.lean !== false;
  const findQuery = model.find(filter, options.projection).sort(sort).skip(pagination.skip).limit(pagination.limit);
  const [items, total] = await Promise.all([
    useLean ? findQuery.lean().exec() : findQuery.exec(),
    model.countDocuments(filter)
  ]);
  return { items, total, page: pagination.page, limit: pagination.limit };
}
function toIso(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
export {
  paginateModel,
  toIso
};
