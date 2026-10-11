// These UI tests mock API responses; they do not test MongoDB transactions.
const { test } = require('@playwright/test');
const assert = require('node:assert/strict');
test('Coffee Spot interface workflows', async ({ page }) => {
  let role = 'manager',
    logged = false;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const user = {
    _id: '111111111111111111111111',
    name: 'Alex Santos',
    email: 'manager@coffeespot.local',
    role: 'manager',
    status: 'active',
  };
  const now = new Date().toISOString();
  const ingredients = [
    {
      _id: '222222222222222222222222',
      name: 'Coffee beans',
      unit: 'g',
      stock: 5000,
      reorderLevel: 1000,
      supplier: 'San Juan Head Office',
      active: true,
    },
    {
      _id: '333333333333333333333333',
      name: 'Milk',
      unit: 'ml',
      stock: 150,
      reorderLevel: 500,
      supplier: 'San Juan Head Office',
      active: true,
    },
  ];
  let products = [
    ['Classic Latte', 12000, 'latte'],
    ['Americano', 9500, 'espresso'],
    ['Caramel Latte', 14500, 'latte'],
    ['Iced Matcha', 15000, 'matcha'],
    ['Chocolate Milk', 12500, 'chocolate'],
    ['Butter Croissant', 8500, 'pastry'],
  ].map(([name, price, visual], i) => ({
    _id: '44444444444444444444444' + i,
    name,
    price,
    visual,
    category: i < 3 ? 'Coffee' : i === 5 ? 'Pastries' : 'Non-coffee',
    active: true,
    available: 50,
    description: 'Freshly made at Coffee Spot.',
    recipe: [{ ingredient: ingredients[0], quantity: 18 }],
  }));
  let orders = [
    {
      _id: '555555555555555555555555',
      number: 'CS-ABC123',
      cashier: user._id,
      cashierName: user.name,
      service: 'Dine-in',
      items: [{ menu: products[0]._id, name: 'Classic Latte', quantity: 2, price: 12000 }],
      total: 24000,
      cash: 30000,
      change: 6000,
      status: 'Queued',
      createdAt: now,
    },
  ];
  let lastCheckout;
  const paged = (items) => ({ items, total: items.length, page: 1, pages: 1 });
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      u = new URL(req.url()),
      p = u.pathname,
      method = req.method();
    let data = {},
      status = 200;
    const body = () => req.postDataJSON();
    if (p === '/api/health') data = { ok: true, demo: true };
    else if (p === '/api/auth/me') {
      status = logged ? 200 : 401;
      data = logged
        ? { user: { ...user, role }, csrf: 'test-csrf' }
        : { message: 'Login required' };
    } else if (p === '/api/auth/login') {
      logged = true;
      data = { user: { ...user, role }, csrf: 'test-csrf' };
    } else if (p === '/api/auth/logout') {
      logged = false;
      data = { message: 'Logged out' };
    } else if (p === '/api/dashboard')
      data = {
        low: [ingredients[1]],
        preparing: orders.filter((o) => o.status !== 'Completed').length,
        products: products.length,
        sales: 124500,
        transactions: 14,
        trend: [
          { _id: '2026-10-09', sales: 27500 },
          { _id: '2026-10-10', sales: 48000 },
          { _id: '2026-10-11', sales: 49000 },
        ],
        top: [{ _id: products[0]._id, name: 'Classic Latte', quantity: 12, sales: 144000 }],
      };
    else if (p === '/api/menu' && method === 'GET') {
      let list = products;
      const q = u.searchParams.get('q');
      if (q) list = list.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));
      const c = u.searchParams.get('category');
      if (c) list = list.filter((x) => x.category === c);
      data = paged(list);
    } else if (p === '/api/menu' && method === 'POST') {
      data = { ...body(), _id: '444444444444444444444449' };
      products.push({
        ...data,
        available: 5,
        recipe: data.recipe.map((r) => ({
          ...r,
          ingredient: ingredients.find((i) => i._id === r.ingredient),
        })),
      });
    } else if (p === '/api/ingredients')
      data = paged(u.searchParams.get('low') === 'true' ? [ingredients[1]] : ingredients);
    else if (p === '/api/stock') {
      const b = body();
      ingredients.find((i) => i._id === b.ingredient).stock += b.quantity;
      data = { message: 'Saved' };
    } else if (p === '/api/orders' && method === 'GET') data = paged(orders);
    else if (p === '/api/orders' && method === 'POST') {
      lastCheckout = body();
      const items = lastCheckout.items.map((i) => {
        const m = products.find((p) => p._id === i.menuId);
        return { ...i, name: m.name, price: m.price };
      });
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      data = {
        _id: '555555555555555555555556',
        number: 'CS-NEW123',
        createdAt: now,
        items,
        total,
        cash: lastCheckout.cash,
        change: lastCheckout.cash - total,
        status: 'Queued',
        service: lastCheckout.service,
        cashierName: user.name,
      };
      orders.push(data);
    } else if (p.endsWith('/status')) {
      const o = orders.find((o) => p.includes(o._id));
      o.status = body().status;
      data = o;
    } else if (p === '/api/announcements')
      data = paged([
        {
          _id: '777777777777777777777777',
          title: 'A fresh start to your shift',
          body: 'Check stock levels and review the preparation board before taking new orders.',
          author: 'Coffee Spot Manager',
          createdAt: now,
        },
      ]);
    else if (p === '/api/users')
      data = paged([
        user,
        {
          ...user,
          _id: '111111111111111111111112',
          name: 'New Team Member',
          status: 'pending',
          role: 'staff',
        },
      ]);
    else if (p === '/api/audit')
      data = paged([
        {
          _id: '888888888888888888888888',
          actor: 'Alex Santos',
          action: 'Receipt',
          target: 'Coffee beans',
          detail: '5000 g. Initial delivery',
          createdAt: now,
        },
      ]);
    else if (p === '/api/movements')
      data = paged([
        {
          _id: '999999999999999999999999',
          actor: 'Alex Santos',
          type: 'Receipt',
          quantity: 5000,
          balance: 5000,
          unit: 'g',
          reason: 'Initial delivery',
          createdAt: now,
        },
      ]);
    else if (p === '/api/profile') {
      Object.assign(user, body());
      data = { user };
    } else data = { message: 'ok' };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor();
  await page.getByLabel('Email address', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('CoffeeSpot123!');
  await page.getByRole('button', { name: 'Login to workspace' }).click();
  await page.getByRole('heading', { name: 'Good day, Alex.' }).waitFor();
  await page.getByRole('link', { name: 'Point of Sale', exact: true }).click();
  await page.getByRole('button', { name: /Classic Latte/ }).waitFor();
  await page.getByRole('button', { name: /Classic Latte/ }).click();
  await page.getByRole('button', { name: 'Increase Classic Latte' }).click();
  await page.getByRole('button', { name: 'Checkout', exact: true }).click();
  await page.getByLabel('Cash received (PHP)').fill('300');
  await page.getByRole('button', { name: 'Confirm payment' }).click();
  await page.getByRole('dialog', { name: 'Receipt preview' }).waitFor();
  assert.equal(lastCheckout.items[0].quantity, 2);
  assert.equal(lastCheckout.cash, 30000);
  assert.ok(lastCheckout.requestId);
  await page.emulateMedia({ media: 'print' });
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('link', { name: 'Preparation Board', exact: true }).click();
  await page.getByRole('button', { name: 'Start preparing' }).first().click();
  await page.getByRole('button', { name: 'Mark as ready' }).waitFor();
  await page.getByRole('link', { name: 'Menu & Recipes', exact: true }).click();
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  await page.getByLabel('Product name').fill('Test Vanilla Latte');
  await page.getByLabel('Selling price (PHP)').fill('150');
  await page.getByRole('button', { name: 'Ingredient', exact: true }).click();
  await page.getByLabel('Ingredient 1', { exact: true }).selectOption(ingredients[0]._id);
  await page.getByLabel('Recipe quantity 1').fill('18');
  await page.getByRole('dialog').getByRole('button', { name: 'Add product', exact: true }).click();
  await page.getByText('Menu updated successfully.').waitFor();
  assert.equal(products.length, 7);
  await page.getByRole('link', { name: 'Stock Inventory', exact: true }).click();
  await page.getByRole('button', { name: 'Receive Coffee beans' }).click();
  await page.getByLabel('Quantity change (g)').fill('1000');
  await page.getByLabel('Reason or delivery reference').fill('Delivery 002');
  await page.getByRole('button', { name: 'Record stock movement' }).click();
  await page.getByText('Inventory updated successfully.').waitFor();
  assert.equal(ingredients[0].stock, 6000);
  for (const [path, heading] of [
    ['/orders', 'Transactions'],
    ['/reports', 'Sales & reports'],
    ['/announcements', 'Announcements'],
    ['/users', 'Team members'],
    ['/audit', 'Activity history'],
    ['/profile', 'My profile'],
  ]) {
    await page.goto('http://127.0.0.1:5173' + path);
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/pos', '/inventory', '/board', '/reports', '/profile']) {
    await page.goto('http://127.0.0.1:5173' + path);
    await page.locator('h1').waitFor();
    await page.waitForTimeout(180);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Horizontal overflow on ${path}`,
    );
    if (path === '/pos') {
      await page.getByRole('button', { name: /Classic Latte/ }).click();
      await page.getByRole('button', { name: /View cart/ }).click();
      await page.getByRole('dialog', { name: 'Your cart' }).waitFor();
      await page.getByRole('button', { name: 'Close dialog' }).click();
    }
  }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor();
  role = 'staff';
  await page.getByLabel('Email address', { exact: true }).fill('staff@coffeespot.local');
  await page.getByLabel('Password', { exact: true }).fill('CoffeeSpot123!');
  await page.getByRole('button', { name: 'Login to workspace' }).click();
  await page.locator('h1').waitFor();
  await page.goto('http://127.0.0.1:5173/users');
  await page.getByRole('heading', { name: 'Good day, Alex.' }).waitFor();
  assert.ok(!page.url().endsWith('/users'));
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(
    'PASS: login, manager routing, POS checkout payload, receipt, board transition, menu creation, stock receipt, all screen renders, six mobile overflow checks, logout, and staff route guard. API responses were mocked for UI tests.',
  );
});
