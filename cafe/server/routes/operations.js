import { Router } from 'express';
import { z } from 'zod';
import { Order, Ingredient, Menu, Audit, Announcement } from '../models.js';
import { manager } from '../auth.js';
import { wrap, parse, text, id, fail, list, search, dates } from '../utils.js';
import { placeOrder, voidOrder } from '../services/orders.js';
import { nextStatus } from '../services/calculations.js';
export const operations = Router();
const filter = (req) => ({
  ...dates(req),
  ...(req.query.q ? { number: search(req.query.q) } : {}),
  ...(req.query.status ? { status: String(req.query.status) } : {}),
});
operations.post(
  '/orders',
  wrap(async (req, res) => res.status(201).json(await placeOrder(req.body, req.user))),
);
operations.get(
  '/orders',
  wrap(async (req, res) =>
    list(
      Order,
      {
        ...filter(req),
        ...(req.user.role === 'staff' && req.query.board !== 'true'
          ? { cashier: req.user._id }
          : {}),
        ...(req.query.board === 'true'
          ? { status: { $in: ['Queued', 'Preparing', 'Ready'] } }
          : {}),
      },
      req,
      res,
    ),
  ),
);
operations.get(
  '/orders/:id',
  wrap(async (req, res) => {
    const o = await Order.findById(id(req.params.id));
    if (!o) fail(404, 'Order not found.');
    if (req.user.role !== 'manager' && String(o.cashier) !== String(req.user._id))
      fail(403, 'You can only open your own receipts.');
    res.json(o);
  }),
);
operations.patch(
  '/orders/:id/status',
  wrap(async (req, res) => {
    const { status } = parse(
      z.object({ status: z.enum(['Preparing', 'Ready', 'Completed']) }).strict(),
      req.body,
    );
    const before = ['Queued', 'Preparing', 'Ready'].find((s) => nextStatus(s) === status);
    const o = await Order.findOneAndUpdate(
      { _id: id(req.params.id), status: before },
      {
        $set: { status },
        $push: { history: { status, at: new Date(), by: req.user.name } },
      },
      { new: true },
    );
    if (!o) fail(409, 'Order status changed. Refresh the preparation board.');
    res.json(o);
  }),
);
operations.post(
  '/orders/:id/void',
  manager,
  wrap(async (req, res) => res.json(await voidOrder(id(req.params.id), req.body, req.user))),
);
operations.get(
  '/dashboard',
  wrap(async (req, res) => {
    const low = await Ingredient.find({
      active: true,
      $expr: { $lte: ['$stock', '$reorderLevel'] },
    }).lean();
    const preparing = await Order.countDocuments({
      status: { $in: ['Queued', 'Preparing', 'Ready'] },
    });
    const products = await Menu.countDocuments({ active: true });
    if (req.user.role !== 'manager') return res.json({ low, preparing, products });
    const match = { ...dates(req), paid: true, status: { $ne: 'Voided' } };
    const totals = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          sales: { $sum: '$total' },
          transactions: { $sum: 1 },
        },
      },
    ]);
    const trend = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              date: '$createdAt',
              format: '%Y-%m-%d',
              timezone: 'Asia/Manila',
            },
          },
          sales: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const top = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menu',
          name: { $last: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          sales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]);
    res.json({
      low,
      preparing,
      products,
      sales: totals[0]?.sales || 0,
      transactions: totals[0]?.transactions || 0,
      trend,
      top,
    });
  }),
);
function csvCell(v) {
  const s = String(v ?? '');
  return '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
}
operations.get(
  '/reports/export',
  manager,
  wrap(async (req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Coffee-Spot-Sales.csv"');
    res.write(
      '\uFEFF' +
        ['Order', 'Date (Manila)', 'Status', 'Service', 'Cashier', 'Sales PHP', 'Refund PHP']
          .map(csvCell)
          .join(',') +
        '\r\n',
    );
    for await (const o of Order.find(filter(req)).sort({ createdAt: -1 }).cursor()) {
      res.write(
        [
          o.number,
          new Date(o.createdAt).toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
          }),
          o.status,
          o.service,
          o.cashierName,
          o.status === 'Voided' ? '0.00' : (o.total / 100).toFixed(2),
          ((o.refunded || 0) / 100).toFixed(2),
        ]
          .map(csvCell)
          .join(',') + '\r\n',
      );
    }
    res.end();
  }),
);
operations.get(
  '/audit',
  manager,
  wrap(async (req, res) => list(Audit, {}, req, res)),
);
operations.get(
  '/announcements',
  wrap(async (req, res) => list(Announcement, {}, req, res)),
);
operations.post(
  '/announcements',
  manager,
  wrap(async (req, res) => {
    const data = parse(z.object({ title: text(3, 100), body: text(5, 1500) }).strict(), req.body);
    res.status(201).json(await Announcement.create({ ...data, author: req.user.name }));
  }),
);
operations.delete(
  '/announcements/:id',
  manager,
  wrap(async (req, res) => {
    const a = await Announcement.findByIdAndDelete(id(req.params.id));
    if (!a) fail(404, 'Announcement not found.');
    await Audit.create({
      actor: req.user.name,
      action: 'Delete announcement',
      target: a.title,
    });
    res.json({ message: 'Announcement deleted.' });
  }),
);
