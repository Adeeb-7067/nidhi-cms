import { getNextSequence } from "../../../models/schema/index.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { dateOnly, softDeleteFields } from "./helpers.js";
import { logger } from "../../../lib/logger.js";

/**
 * Shared soft-delete CRUD for CA Phase-2 collections.
 * Controllers stay thin; pages keep using CmsDataTable / PortalPageShell.
 *
 * Optional afterCreate / afterUpdate run best-effort (e.g. calendar sync).
 */
export function makeSoftCrud({
  table,
  sequenceKey,
  listKey,
  singularLabel,
  format,
  parseCreate,
  parsePatch,
  defaultSort = { updatedAt: -1 },
  buildListQuery,
  afterCreate,
  afterUpdate,
}) {
  async function list(req, res) {
    const pagination = parsePagination(req.query);
    const query = { isDeleted: false };
    if (buildListQuery) buildListQuery(query, req.query);
    const { items, total, page, limit } = await paginateModel(table, query, pagination, {
      sort: defaultSort,
    });
    res.json({ [listKey]: items.map(format), total, page, limit });
  }

  async function getById(req, res) {
    const id = parseIdParam(req.params.id);
    const doc = await table.findOne({ id, isDeleted: false }).lean();
    if (!doc) notFound(singularLabel);
    res.json(format(doc));
  }

  async function create(req, res) {
    const fields = await parseCreate(req.body ?? {}, req);
    const id = await getNextSequence(sequenceKey);
    const doc = await table.create({ id, ...fields, createdBy: req.user.id });
    const plain = doc.toObject?.() ?? doc;
    if (afterCreate) {
      try {
        await afterCreate(plain, req);
      } catch (err) {
        logger.warn({ err, sequenceKey, id }, "CA afterCreate hook failed");
      }
    }
    res.status(201).json(format(plain));
  }

  async function update(req, res) {
    const id = parseIdParam(req.params.id);
    const existing = await table.findOne({ id, isDeleted: false }).lean();
    if (!existing) notFound(singularLabel);
    const fields = await parsePatch(req.body ?? {}, req, existing);
    const updated = await table
      .findOneAndUpdate({ id, isDeleted: false }, { $set: fields }, { new: true })
      .lean();
    if (afterUpdate) {
      try {
        await afterUpdate(updated, req, existing);
      } catch (err) {
        logger.warn({ err, sequenceKey, id }, "CA afterUpdate hook failed");
      }
    }
    res.json(format(updated));
  }

  async function remove(req, res) {
    const id = parseIdParam(req.params.id);
    const updated = await table
      .findOneAndUpdate({ id, isDeleted: false }, { $set: softDeleteFields() }, { new: true })
      .lean();
    if (!updated) notFound(singularLabel);
    res.json({ ok: true, id });
  }

  return { list, getById, create, update, remove };
}

export function requireEnum(value, allowed, field) {
  const v = optionalString(value);
  if (!v || !allowed.includes(v)) badRequest(`Invalid ${field}.`, field);
  return v;
}

export function requireDate(value, field, { required = true } = {}) {
  if (value == null || value === "") {
    if (required) badRequest(`${field} is required.`, field);
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) badRequest(`Invalid ${field}.`, field);
  return d;
}

export function requireNumber(value, field, { required = true, min = null } = {}) {
  if (value == null || value === "") {
    if (required) badRequest(`${field} is required.`, field);
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) badRequest(`Invalid ${field}.`, field);
  if (min != null && n < min) badRequest(`${field} must be >= ${min}.`, field);
  return n;
}

export function requireText(value, field, { required = true } = {}) {
  const v = optionalString(value);
  if (!v && required) badRequest(`${field} is required.`, field);
  return v ?? null;
}

export { dateOnly, optionalString, badRequest };
