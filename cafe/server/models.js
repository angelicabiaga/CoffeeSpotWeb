import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = (name) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required: true,
});
const options = { timestamps: true };
const user = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['manager', 'staff'], default: 'staff' },
    status: {
      type: String,
      enum: ['pending', 'active', 'disabled'],
      default: 'pending',
    },
  },
  options,
);
const ingredient = new Schema(
  {
    name: { type: String, required: true },
    unit: { type: String, enum: ['g', 'ml', 'piece'], required: true },
    stock: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 0 },
    supplier: { type: String, default: '' },
    active: { type: Boolean, default: true },
    revision: { type: Number, default: 0 },
  },
  options,
);
const recipe = new Schema(
  {
    ingredient: ref('Ingredient'),
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);
const menu = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 1 },
    visual: {
      type: String,
      enum: ['latte', 'espresso', 'matcha', 'chocolate', 'tea', 'pastry'],
      default: 'latte',
    },
    recipe: { type: [recipe], required: true },
    active: { type: Boolean, default: true },
    revision: { type: Number, default: 0 },
  },
  options,
);
const order = new Schema(
  {
    number: { type: String, unique: true, required: true },
    requestId: { type: String, unique: true, required: true },
    requestHash: { type: String, required: true },
    cashier: ref('User'),
    cashierName: String,
    service: { type: String, enum: ['Dine-in', 'Takeaway'], required: true },
    items: [
      {
        menu: ref('Menu'),
        name: String,
        quantity: Number,
        price: Number,
        recipe: [
          {
            ingredient: ref('Ingredient'),
            name: String,
            unit: String,
            quantity: Number,
          },
        ],
      },
    ],
    total: { type: Number, required: true },
    cash: Number,
    change: Number,
    status: {
      type: String,
      enum: ['Queued', 'Preparing', 'Ready', 'Completed', 'Voided'],
      default: 'Queued',
    },
    paid: { type: Boolean, default: true },
    history: [{ status: String, at: Date, by: String }],
    voidReason: String,
    voidedAt: Date,
    refunded: Number,
    stockRestored: Boolean,
  },
  options,
);
order.index({ createdAt: -1 });
const movement = new Schema(
  {
    ingredient: ref('Ingredient'),
    ingredientName: String,
    unit: String,
    quantity: Number,
    balance: Number,
    type: {
      type: String,
      enum: ['Receipt', 'Adjustment', 'Sale', 'Reversal', 'Waste'],
    },
    reason: String,
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    actor: String,
  },
  options,
);
const audit = new Schema(
  { actor: String, action: String, target: String, detail: String },
  options,
);
const session = new Schema(
  {
    user: ref('User'),
    tokenId: { type: String, unique: true },
    csrf: String,
    expiresAt: { type: Date, index: { expires: 0 } },
  },
  options,
);
const announcement = new Schema({ title: String, body: String, author: String }, options);
export const User = model('User', user),
  Ingredient = model('Ingredient', ingredient),
  Menu = model('Menu', menu),
  Order = model('Order', order),
  Movement = model('Movement', movement),
  Audit = model('Audit', audit),
  Session = model('Session', session),
  Announcement = model('Announcement', announcement);
export async function initModels() {
  for (const m of [User, Ingredient, Menu, Order, Movement, Audit, Session, Announcement])
    await m.init();
}
