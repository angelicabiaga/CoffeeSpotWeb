import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Menu, Ingredient, Order, Movement, Audit } from '../models.js';
import { parse, objectId, whole, fail, text } from '../utils.js';
import { calculateTotal, ingredientNeeds } from './calculations.js';
const checkout = z
  .object({
    requestId: z.uuid(),
    service: z.enum(['Dine-in', 'Takeaway']),
    cash: whole(1),
    items: z
      .array(z.object({ menuId: objectId, quantity: whole(1, 100) }).strict())
      .min(1)
      .max(50),
  })
  .strict();
export async function placeOrder(body, user) {
  const data = parse(checkout, body);
  const ids = data.items.map((x) => x.menuId);
  if (new Set(ids).size !== ids.length) fail(400, 'Combine duplicate products into one cart line.');
  const requestHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        service: data.service,
        cash: data.cash,
        items: [...data.items].sort((a, b) => a.menuId.localeCompare(b.menuId)),
      }),
    )
    .digest('hex');
  const existing = await Order.findOne({ requestId: data.requestId });
  const checkExisting = (o) => {
    if (String(o.cashier) !== String(user._id) || o.requestHash !== requestHash)
      fail(409, 'This checkout reference was already used with different details.');
    return o;
  };
  if (existing) return checkExisting(existing);
  try {
    return await mongoose.connection.transaction(async (session) => {
      const committed = await Order.findOne({ requestId: data.requestId }).session(session);
      if (committed) return checkExisting(committed);
      const items = [];
      for (const line of data.items) {
        // Touch the product so concurrent recipe edits conflict with this checkout.
        const m = await Menu.findOneAndUpdate(
          { _id: line.menuId, active: true },
          { $inc: { revision: 1 } },
          { new: true, session },
        );
        if (!m) fail(409, 'A selected product is no longer available. Refresh the menu.');
        if (!m.recipe.length) fail(409, `${m.name} has no recipe.`);
        const snapshot = [];
        for (const r of m.recipe) {
          const key = String(r.ingredient);
          const i = await Ingredient.findOne({
            _id: key,
            active: true,
          }).session(session);
          if (!i) fail(409, `${m.name} contains an unavailable ingredient.`);
          snapshot.push({
            ingredient: i._id,
            name: i.name,
            unit: i.unit,
            quantity: r.quantity,
          });
        }
        items.push({
          menu: m._id,
          name: m.name,
          quantity: line.quantity,
          price: m.price,
          recipe: snapshot,
        });
      }
      const total = calculateTotal(items);
      const needs = ingredientNeeds(items);
      if (data.cash < total) fail(400, 'Cash received is less than the order total.');
      const _id = new mongoose.Types.ObjectId();
      for (const [key, n] of needs) {
        const updated = await Ingredient.findOneAndUpdate(
          { _id: key, active: true, stock: { $gte: n.quantity } },
          { $inc: { stock: -n.quantity, revision: 1 } },
          { new: true, session },
        );
        if (!updated) fail(409, `Not enough ${n.name}. Refresh stock and adjust the cart.`);
        await Movement.create(
          [
            {
              ingredient: key,
              ingredientName: updated.name,
              unit: updated.unit,
              quantity: -n.quantity,
              balance: updated.stock,
              type: 'Sale',
              reason: 'Paid order',
              order: _id,
              actor: user.name,
            },
          ],
          { session },
        );
      }
      const [order] = await Order.create(
        [
          {
            _id,
            number: 'CS-' + _id.toString().slice(-10).toUpperCase(),
            requestId: data.requestId,
            requestHash,
            cashier: user._id,
            cashierName: user.name,
            service: data.service,
            items,
            total,
            cash: data.cash,
            change: data.cash - total,
            history: [{ status: 'Queued', at: new Date(), by: user.name }],
          },
        ],
        { session },
      );
      return order;
    });
  } catch (e) {
    if (e.code === 11000) {
      const o = await Order.findOne({ requestId: data.requestId });
      if (o) return checkExisting(o);
    }
    throw e;
  }
}
export async function voidOrder(orderId, body, user) {
  const { reason } = parse(z.object({ reason: text(5, 300) }).strict(), body);
  return mongoose.connection.transaction(async (session) => {
    const o = await Order.findById(orderId).session(session);
    if (!o) fail(404, 'Order not found.');
    if (o.status === 'Voided') fail(409, 'This order has already been voided.');
    const restore = o.status === 'Queued';
    const needs = ingredientNeeds(o.items);
    for (const [key, n] of needs) {
      const i = await Ingredient.findById(key).session(session);
      if (!i) fail(409, 'An ingredient record is missing.');
      if (restore) {
        i.stock += n.quantity;
        i.revision++;
        await i.save({ session });
      }
      await Movement.create(
        [
          {
            ingredient: key,
            ingredientName: n.name,
            unit: n.unit,
            quantity: restore ? n.quantity : 0,
            balance: i.stock,
            type: restore ? 'Reversal' : 'Waste',
            reason: restore
              ? reason
              : `${n.quantity} ${n.unit} consumed; no additional deduction. ${reason}`,
            order: o._id,
            actor: user.name,
          },
        ],
        { session },
      );
    }
    o.status = 'Voided';
    o.voidReason = reason;
    o.voidedAt = new Date();
    o.refunded = o.total;
    o.stockRestored = restore;
    o.history.push({ status: 'Voided', at: new Date(), by: user.name });
    await o.save({ session });
    await Audit.create(
      [
        {
          actor: user.name,
          action: 'Void and cash refund',
          target: o.number,
          detail: `${reason}; refunded ${o.total / 100}; ${restore ? 'stock restored' : 'consumed stock kept as waste'}`,
        },
      ],
      { session },
    );
    return o;
  });
}
