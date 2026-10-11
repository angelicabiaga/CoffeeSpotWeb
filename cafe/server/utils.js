import { z } from 'zod';
export function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record ID.');
export const text = (min = 1, max = 100) => z.string().trim().min(min).max(max);
export const whole = (min = 0, max = 100000000) => z.number().int().min(min).max(max);
export const parse = (schema, value) => schema.parse(value);
export function id(value) {
  return parse(objectId, value);
}
export function paging(req) {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
}
export function search(value) {
  return new RegExp(
    String(value || '')
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i',
  );
}
export async function list(model, filter, req, res, populate) {
  const { page, limit, skip } = paging(req);
  let q = model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  if (populate) q = q.populate(populate);
  const [items, total] = await Promise.all([q.lean(), model.countDocuments(filter)]);
  res.json({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}
export function dates(req) {
  let { from, to } = req.query;
  const fmt = /^\d{4}-\d{2}-\d{2}$/;
  const valid = (d) =>
    fmt.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  if ((from && !valid(from)) || (to && !valid(to))) fail(400, 'Use valid YYYY-MM-DD dates.');
  if (from && to && from > to) fail(400, 'Start date must be before end date.');
  const d = {};
  if (from) d.$gte = new Date(from + 'T00:00:00+08:00');
  if (to) d.$lt = new Date(new Date(to + 'T00:00:00+08:00').getTime() + 86400000);
  return Object.keys(d).length ? { createdAt: d } : {};
}
