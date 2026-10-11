import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import supertest from 'supertest';
import {
  calculateTotal,
  ingredientNeeds,
  availableServings,
  nextStatus,
} from '../services/calculations.js';
import { dates, search } from '../utils.js';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const { app } = await import('../app.js');
test('Centavo calculations keep decimal currency exact', () => {
  assert.equal(
    calculateTotal([
      { price: 12000, quantity: 2 },
      { price: 9550, quantity: 3 },
    ]),
    52650,
  );
  assert.equal(calculateTotal([]), 0);
});
test('Mixed cart requirements sum shared ingredients', () => {
  const r = [
    { ingredient: 'milk', quantity: 200, name: 'Milk', unit: 'ml' },
    { ingredient: 'beans', quantity: 18, name: 'Beans', unit: 'g' },
  ];
  const needs = ingredientNeeds([
    { quantity: 2, recipe: r },
    {
      quantity: 3,
      recipe: [{ ingredient: 'milk', quantity: 100, name: 'Milk', unit: 'ml' }],
    },
  ]);
  assert.equal(needs.get('milk').quantity, 700);
  assert.equal(needs.get('beans').quantity, 36);
});
test('Availability uses the limiting ingredient and rejects archived ingredients', () => {
  const recipe = [
    { quantity: 18, ingredient: { active: true, stock: 100 } },
    { quantity: 200, ingredient: { active: true, stock: 999 } },
  ];
  assert.equal(availableServings({ active: true, recipe }), 4);
  recipe[1].ingredient.active = false;
  assert.equal(availableServings({ active: true, recipe }), 0);
  assert.equal(availableServings({ active: true, recipe: [] }), 0);
});
test('Preparation workflow cannot move beyond terminal states', () => {
  assert.equal(nextStatus('Queued'), 'Preparing');
  assert.equal(nextStatus('Ready'), 'Completed');
  assert.equal(nextStatus('Voided'), null);
  assert.equal(nextStatus('Completed'), null);
});
test('Business dates include Manila end date and reject invalid ranges', () => {
  const f = dates({ query: { from: '2026-10-11', to: '2026-10-11' } });
  assert.equal(f.createdAt.$gte.toISOString(), '2026-10-10T16:00:00.000Z');
  assert.equal(f.createdAt.$lt.toISOString(), '2026-10-11T16:00:00.000Z');
  assert.throws(() => dates({ query: { from: '2026-02-30' } }));
  assert.throws(() => dates({ query: { from: '2026-12-01', to: '2026-01-01' } }));
});
test('Search treats input as literal text, not executable regex', () => {
  const r = search('a.*(b)');
  assert.ok(r.test('test a.*(b)'));
  assert.ok(!r.test('anything b'));
});
test('Anonymous API access and cross-site mutations are denied before database access', async () => {
  assert.equal((await supertest(app).get('/api/menu')).status, 401);
  assert.equal(
    (
      await supertest(app)
        .post('/api/auth/login')
        .set('Origin', 'https://untrusted.example')
        .send({})
    ).status,
    403,
  );
});
test('Registration rejects privileged roles and weak passwords', async () => {
  assert.equal(
    (
      await supertest(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'CoffeeSpot123!',
        role: 'manager',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await supertest(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'short',
      })
    ).status,
    400,
  );
});
test('Login validates malformed payloads without querying the database', async () => {
  assert.equal(
    (
      await supertest(app)
        .post('/api/auth/login')
        .send({ email: { $ne: null }, password: 'password' })
    ).status,
    400,
  );
  assert.equal(
    (await supertest(app).post('/api/auth/login').send({ email: 'test@example.com', password: '' }))
      .status,
    400,
  );
});
test('Health endpoint responds without exposing credentials', async () => {
  const r = await supertest(app).get('/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body).sort(), ['demo', 'ok']);
});
