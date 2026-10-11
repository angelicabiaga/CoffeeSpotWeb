import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Menu, Ingredient, Movement, Order, Audit } from '../models.js';
import { manager } from '../auth.js';
import { wrap, parse, text, whole, objectId, id, fail, list, search } from '../utils.js';
import { availableServings } from '../services/calculations.js';
export const catalog = Router();
const ingredientSchema = z
  .object({
    name: text(2),
    unit: z.enum(['g', 'ml', 'piece']),
    reorderLevel: whole(),
    supplier: z.string().trim().max(120),
    active: z.boolean(),
  })
  .strict();
const menuSchema = z
  .object({
    name: text(2),
    category: text(2, 40),
    description: z.string().trim().max(300),
    price: whole(1, 1000000),
    visual: z.enum(['latte', 'espresso', 'matcha', 'chocolate', 'tea', 'pastry']),
    active: z.boolean(),
    recipe: z
      .array(z.object({ ingredient: objectId, quantity: whole(1, 100000) }).strict())
      .min(1)
      .max(30),
  })
  .strict();
catalog.get(
  '/ingredients',
  wrap(async (req, res) =>
    list(
      Ingredient,
      {
        name: search(req.query.q),
        ...(req.query.active === 'true' ? { active: true } : {}),
        ...(req.query.low === 'true'
          ? { active: true, $expr: { $lte: ['$stock', '$reorderLevel'] } }
          : {}),
      },
      req,
      res,
    ),
  ),
);
catalog.post(
  '/ingredients',
  manager,
  wrap(async (req, res) => {
    const data = parse(ingredientSchema, req.body);
    const i = await Ingredient.create(data);
    await Audit.create({
      actor: req.user.name,
      action: 'Create ingredient',
      target: i.name,
    });
    res.status(201).json(i);
  }),
);
catalog.patch(
  '/ingredients/:id',
  manager,
  wrap(async (req, res) => {
    const data = parse(ingredientSchema, req.body);
    const i = await Ingredient.findById(id(req.params.id));
    if (!i) fail(404, 'Ingredient not found.');
    if (i.unit !== data.unit)
      fail(400, 'Base units cannot be changed. Create a new ingredient instead.');
    Object.assign(i, data);
    i.revision++;
    await i.save();
    await Audit.create({
      actor: req.user.name,
      action: 'Edit ingredient',
      target: i.name,
      detail: `${data.active ? 'Active' : 'Archived'}; reorder at ${data.reorderLevel} ${data.unit}; supplier: ${data.supplier || 'not set'}`,
    });
    res.json(i);
  }),
);
catalog.delete(
  '/ingredients/:id',
  manager,
  wrap(async (req, res) => {
    const key = id(req.params.id);
    await mongoose.connection.transaction(async (session) => {
      const i = await Ingredient.findOneAndDelete({ _id: key }, { session });
      if (!i) fail(404, 'Ingredient not found.');
      if (
        (await Menu.exists({ 'recipe.ingredient': key }).session(session)) ||
        (await Movement.exists({ ingredient: key }).session(session))
      )
        fail(409, 'This ingredient has history or a recipe. Archive it instead.');
      await Audit.create([{ actor: req.user.name, action: 'Delete ingredient', target: i.name }], {
        session,
      });
    });
    res.json({ message: 'Ingredient deleted.' });
  }),
);
catalog.post(
  '/stock',
  manager,
  wrap(async (req, res) => {
    const data = parse(
      z
        .object({
          ingredient: objectId,
          type: z.enum(['Receipt', 'Adjustment']),
          quantity: z
            .number()
            .int()
            .min(-100000000)
            .max(100000000)
            .refine((x) => x !== 0, 'Quantity must not be zero.'),
          reason: text(3, 250),
        })
        .strict(),
      req.body,
    );
    if (data.type === 'Receipt' && data.quantity < 1)
      fail(400, 'Receipt quantity must be positive.');
    const result = await mongoose.connection.transaction(async (session) => {
      const i = await Ingredient.findOneAndUpdate(
        {
          _id: data.ingredient,
          active: true,
          ...(data.quantity < 0 ? { stock: { $gte: -data.quantity } } : {}),
        },
        { $inc: { stock: data.quantity, revision: 1 } },
        { new: true, session },
      );
      if (!i) fail(409, 'Ingredient unavailable, or adjustment would make stock negative.');
      await Movement.create(
        [
          {
            ...data,
            ingredientName: i.name,
            unit: i.unit,
            balance: i.stock,
            actor: req.user.name,
          },
        ],
        { session },
      );
      await Audit.create(
        [
          {
            actor: req.user.name,
            action: data.type,
            target: i.name,
            detail: `${data.quantity} ${i.unit}. ${data.reason}`,
          },
        ],
        { session },
      );
      return i;
    });
    res.json(result);
  }),
);
catalog.get(
  '/movements',
  manager,
  wrap(async (req, res) =>
    list(Movement, req.query.ingredient ? { ingredient: id(req.query.ingredient) } : {}, req, res),
  ),
);
async function saveMenu(data, recordId, user) {
  return mongoose.connection.transaction(async (session) => {
    if (new Set(data.recipe.map((r) => r.ingredient)).size !== data.recipe.length)
      fail(400, 'Each ingredient can appear only once.');
    for (const r of data.recipe) {
      if (
        !(await Ingredient.findOneAndUpdate(
          { _id: r.ingredient, ...(data.active ? { active: true } : {}) },
          { $inc: { revision: 1 } },
          { session },
        ))
      )
        fail(400, 'Select active ingredients for the recipe.');
    }
    let m;
    if (recordId) {
      m = await Menu.findByIdAndUpdate(
        recordId,
        { $set: data, $inc: { revision: 1 } },
        { new: true, session, runValidators: true },
      );
      if (!m) fail(404, 'Product not found.');
    } else {
      [m] = await Menu.create([data], { session });
    }
    await Audit.create(
      [
        {
          actor: user.name,
          action: recordId ? 'Edit product' : 'Create product',
          target: m.name,
          detail: `Price ${m.price / 100}; ${data.active ? 'active' : 'archived'}`,
        },
      ],
      { session },
    );
    return m;
  });
}
catalog.get(
  '/menu',
  wrap(async (req, res) => {
    const { paging } = await import('../utils.js');
    const { page, limit, skip } = paging(req);
    const filter = {
      name: search(req.query.q),
      ...(req.query.category ? { category: String(req.query.category) } : {}),
      ...(req.query.active === 'true' ? { active: true } : {}),
    };
    const rows = await Menu.find(filter)
      .populate('recipe.ingredient')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const items = rows.map((m) => ({ ...m, available: availableServings(m) }));
    const total = await Menu.countDocuments(filter);
    res.json({
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  }),
);
catalog.post(
  '/menu',
  manager,
  wrap(async (req, res) =>
    res.status(201).json(await saveMenu(parse(menuSchema, req.body), null, req.user)),
  ),
);
catalog.patch(
  '/menu/:id',
  manager,
  wrap(async (req, res) =>
    res.json(await saveMenu(parse(menuSchema, req.body), id(req.params.id), req.user)),
  ),
);
catalog.delete(
  '/menu/:id',
  manager,
  wrap(async (req, res) => {
    const key = id(req.params.id);
    await mongoose.connection.transaction(async (session) => {
      const m = await Menu.findOneAndDelete({ _id: key }, { session });
      if (!m) fail(404, 'Product not found.');
      if (await Order.exists({ 'items.menu': key }).session(session))
        fail(409, 'This product has sales history. Archive it instead.');
      await Audit.create([{ actor: req.user.name, action: 'Delete product', target: m.name }], {
        session,
      });
    });
    res.json({ message: 'Product deleted.' });
  }),
);
