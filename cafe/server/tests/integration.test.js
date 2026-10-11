import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import supertest from 'supertest';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.NODE_ENV = 'test';
const { default: mongoose } = await import('mongoose');
const { app } = await import('../app.js');
const { initModels, Ingredient, Menu, Order, Movement, User } = await import('../models.js');
const { seedData } = await import('../seed-data.js');
let db, manager, staff, managerToken, staffToken;
const send = (agent, token, method, path, body) =>
  agent[method]('/api' + path)
    .set('X-CSRF-Token', token)
    .send(body);
async function fixture(stock = 100) {
  const i = await Ingredient.create({
    name: 'Test beans ' + crypto.randomUUID(),
    unit: 'g',
    stock,
    reorderLevel: 20,
  });
  const m = await Menu.create({
    name: 'Test latte',
    category: 'Coffee',
    price: 12000,
    visual: 'latte',
    recipe: [{ ingredient: i._id, quantity: 18 }],
  });
  return { i, m };
}
const orderBody = (m, quantity = 1) => ({
  requestId: crypto.randomUUID(),
  service: 'Takeaway',
  cash: 30000,
  items: [{ menuId: String(m._id), quantity }],
});
before(async () => {
  db = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.24' },
  });
  await mongoose.connect(db.getUri('test_coffee'));
  await initModels();
  await seedData({
    managerEmail: 'manager@test.local',
    managerPassword: 'CoffeeSpot123!',
    staffEmail: 'staff@test.local',
    staffPassword: 'CoffeeSpot123!',
  });
  manager = supertest.agent(app);
  staff = supertest.agent(app);
  let r = await manager
    .post('/api/auth/login')
    .send({ email: 'manager@test.local', password: 'CoffeeSpot123!' });
  assert.equal(r.status, 200);
  managerToken = r.body.csrf;
  r = await staff
    .post('/api/auth/login')
    .send({ email: 'staff@test.local', password: 'CoffeeSpot123!' });
  assert.equal(r.status, 200);
  staffToken = r.body.csrf;
});
after(async () => {
  await mongoose.disconnect();
  if (db) await db.stop();
});
test('Authentication, registration approval, and duplicate email protection', async () => {
  assert.equal((await supertest(app).get('/api/menu')).status, 401);
  assert.equal(
    (
      await supertest(app)
        .post('/api/auth/login')
        .send({ email: 'manager@test.local', password: 'wrong' })
    ).status,
    401,
  );
  let r = await supertest(app).post('/api/auth/register').send({
    name: 'New Staff',
    email: 'new@test.local',
    password: 'NewStaff123!',
  });
  assert.equal(r.status, 201);
  r = await supertest(app).post('/api/auth/register').send({
    name: 'New Staff',
    email: 'new@test.local',
    password: 'NewStaff123!',
  });
  assert.equal(r.status, 409);
  const agent = supertest.agent(app);
  r = await agent
    .post('/api/auth/login')
    .send({ email: 'new@test.local', password: 'NewStaff123!' });
  assert.equal(r.status, 403);
  const u = await User.findOne({ email: 'new@test.local' });
  assert.equal(u.role, 'staff');
  r = await send(manager, managerToken, 'patch', '/users/' + u._id, {
    status: 'active',
  });
  assert.equal(r.status, 200);
  r = await agent
    .post('/api/auth/login')
    .send({ email: 'new@test.local', password: 'NewStaff123!' });
  assert.equal(r.status, 200);
  const token = r.body.csrf;
  await send(manager, managerToken, 'patch', '/users/' + u._id, {
    status: 'disabled',
  });
  assert.equal((await agent.get('/api/auth/me')).status, 401);
  assert.ok(token);
});
test('Server permissions, CSRF, origin validation, and payload allowlisting', async () => {
  assert.equal((await staff.get('/api/users')).status, 403);
  assert.equal((await staff.get('/api/reports/export')).status, 403);
  assert.equal((await send(staff, staffToken, 'post', '/ingredients', {})).status, 403);
  assert.equal((await manager.post('/api/ingredients').send({})).status, 403);
  assert.equal(
    (await manager.post('/api/auth/login').set('Origin', 'https://untrusted.example').send({}))
      .status,
    403,
  );
  assert.equal(
    (
      await supertest(app).post('/api/auth/register').send({
        name: 'Bad Role',
        email: 'bad@test.local',
        password: 'NewStaff123!',
        role: 'manager',
      })
    ).status,
    400,
  );
});
test('Validated CRUD, base units, receive stock, negative stock protection, and pagination', async () => {
  let r = await send(manager, managerToken, 'post', '/ingredients', {
    name: 'CRUD Sugar',
    unit: 'g',
    reorderLevel: 10,
    supplier: 'Test',
    active: true,
  });
  assert.equal(r.status, 201);
  const key = r.body._id;
  assert.equal(r.body.stock, 0);
  r = await send(manager, managerToken, 'patch', '/ingredients/' + key, {
    name: 'Sugar edited',
    unit: 'g',
    reorderLevel: 20,
    supplier: 'Test',
    active: true,
  });
  assert.equal(r.status, 200);
  r = await send(manager, managerToken, 'post', '/stock', {
    ingredient: key,
    type: 'Receipt',
    quantity: 30,
    reason: 'Test receipt',
  });
  assert.equal(r.body.stock, 30);
  r = await send(manager, managerToken, 'post', '/stock', {
    ingredient: key,
    type: 'Adjustment',
    quantity: -31,
    reason: 'Test count',
  });
  assert.equal(r.status, 409);
  assert.equal((await Ingredient.findById(key)).stock, 30);
  r = await manager.get('/api/ingredients?limit=2&page=1&q=Sugar');
  assert.equal(r.body.total, 1);
  r = await send(manager, managerToken, 'delete', '/ingredients/' + key);
  assert.equal(r.status, 409);
  const unused = await Ingredient.create({ name: 'Unused', unit: 'piece' });
  assert.equal(
    (await send(manager, managerToken, 'delete', '/ingredients/' + unused._id)).status,
    200,
  );
});
test('Checkout calculates totals from server prices and commits exact recipe deductions', async () => {
  const { i, m } = await fixture();
  let b = orderBody(m, 2);
  let r = await send(staff, staffToken, 'post', '/orders', b);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.total, 24000);
  assert.equal(r.body.change, 6000);
  assert.equal((await Ingredient.findById(i._id)).stock, 64);
  assert.equal(await Movement.countDocuments({ order: r.body._id }), 1);
  const replay = await send(staff, staffToken, 'post', '/orders', b);
  assert.equal(replay.body._id, r.body._id);
  assert.equal((await Ingredient.findById(i._id)).stock, 64);
  assert.equal(
    (await send(staff, staffToken, 'post', '/orders', { ...b, cash: 40000 })).status,
    409,
  );
  assert.equal(
    (
      await send(staff, staffToken, 'post', '/orders', {
        ...orderBody(m),
        total: 1,
      })
    ).status,
    400,
  );
});
test('Insufficient cash and stock roll back the whole order', async () => {
  const { i, m } = await fixture(18);
  let b = { ...orderBody(m), cash: 1 };
  assert.equal((await send(staff, staffToken, 'post', '/orders', b)).status, 400);
  assert.equal((await Ingredient.findById(i._id)).stock, 18);
  b = orderBody(m, 2);
  assert.equal((await send(staff, staffToken, 'post', '/orders', b)).status, 409);
  assert.equal(await Order.countDocuments({ requestId: b.requestId }), 0);
  assert.equal((await Ingredient.findById(i._id)).stock, 18);
});
test('Shared ingredients are summed across products and checkout is atomic', async () => {
  const { i, m } = await fixture(30);
  const m2 = await Menu.create({
    name: 'Second drink',
    category: 'Coffee',
    price: 1000,
    recipe: [{ ingredient: i._id, quantity: 18 }],
  });
  const b = orderBody(m);
  b.items.push({ menuId: String(m2._id), quantity: 1 });
  assert.equal((await send(staff, staffToken, 'post', '/orders', b)).status, 409);
  assert.equal((await Ingredient.findById(i._id)).stock, 30);
  assert.equal(await Movement.countDocuments({ ingredient: i._id }), 0);
});
test('Concurrent orders cannot oversell the last serving', async () => {
  const { i, m } = await fixture(18);
  const results = await Promise.all([
    send(staff, staffToken, 'post', '/orders', orderBody(m)),
    send(staff, staffToken, 'post', '/orders', orderBody(m)),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await Ingredient.findById(i._id)).stock, 0);
});
test('Concurrent duplicate checkouts save one order and one deduction', async () => {
  const { i, m } = await fixture(100);
  const b = orderBody(m);
  const results = await Promise.all([
    send(staff, staffToken, 'post', '/orders', b),
    send(staff, staffToken, 'post', '/orders', b),
  ]);
  assert.deepEqual(
    results.map((r) => r.status),
    [201, 201],
  );
  assert.equal(results[0].body._id, results[1].body._id);
  assert.equal((await Ingredient.findById(i._id)).stock, 82);
});
test('Queued void refunds and restores stock once; historical records cannot be deleted', async () => {
  const { i, m } = await fixture();
  const r = await send(staff, staffToken, 'post', '/orders', orderBody(m));
  const key = r.body._id;
  assert.equal(
    (
      await send(staff, staffToken, 'post', `/orders/${key}/void`, {
        reason: 'Wrong order',
      })
    ).status,
    403,
  );
  const v = await send(manager, managerToken, 'post', `/orders/${key}/void`, {
    reason: 'Customer changed order',
  });
  assert.equal(v.status, 200);
  assert.equal(v.body.refunded, 12000);
  assert.equal(v.body.stockRestored, true);
  assert.equal((await Ingredient.findById(i._id)).stock, 100);
  assert.equal(
    (
      await send(manager, managerToken, 'post', `/orders/${key}/void`, {
        reason: 'Repeat void',
      })
    ).status,
    409,
  );
  assert.equal((await send(manager, managerToken, 'delete', '/menu/' + m._id)).status, 409);
});
test('Preparation transitions must be sequential; prepared void is waste without extra deduction', async () => {
  const { i, m } = await fixture();
  const r = await send(staff, staffToken, 'post', '/orders', orderBody(m));
  const key = r.body._id;
  assert.equal(
    (
      await send(staff, staffToken, 'patch', `/orders/${key}/status`, {
        status: 'Completed',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await send(staff, staffToken, 'patch', `/orders/${key}/status`, {
        status: 'Preparing',
      })
    ).status,
    200,
  );
  const v = await send(manager, managerToken, 'post', `/orders/${key}/void`, {
    reason: 'Customer canceled after preparation',
  });
  assert.equal(v.body.stockRestored, false);
  assert.equal((await Ingredient.findById(i._id)).stock, 82);
  assert.equal((await Movement.findOne({ order: key, type: 'Waste' })).quantity, 0);
});
test('Reports reconcile paid non-voided totals, validate dates, and export CSV', async () => {
  const r = await manager.get('/api/dashboard');
  const orders = await Order.find({ status: { $ne: 'Voided' }, paid: true });
  assert.equal(
    r.body.sales,
    orders.reduce((s, o) => s + o.total, 0),
  );
  assert.equal(r.body.transactions, orders.length);
  assert.equal((await manager.get('/api/dashboard?from=2026-02-30')).status, 400);
  assert.equal((await manager.get('/api/dashboard?from=2026-12-01&to=2026-01-01')).status, 400);
  const csv = await manager.get('/api/reports/export');
  assert.equal(csv.status, 200);
  assert.match(csv.text, /Sales PHP/);
  assert.match(csv.text, /Refund PHP/);
});
test('Announcements are shared, while logout revokes the saved JWT session', async () => {
  const r = await send(manager, managerToken, 'post', '/announcements', {
    title: 'Shift meeting',
    body: 'Please check stock before closing.',
  });
  assert.equal(r.status, 201);
  assert.ok((await staff.get('/api/announcements')).body.items.some((i) => i._id === r.body._id));
  assert.equal(
    (await send(staff, staffToken, 'delete', '/announcements/' + r.body._id)).status,
    403,
  );
  const profile = await staff.get('/api/auth/me');
  const cookie = profile.request.cookies;
  assert.equal((await send(staff, staffToken, 'post', '/auth/logout', {})).status, 200);
  assert.equal((await staff.get('/api/auth/me')).status, 401);
  if (cookie)
    assert.equal((await supertest(app).get('/api/auth/me').set('Cookie', cookie)).status, 401);
});
