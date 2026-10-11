import bcrypt from 'bcryptjs';
import { User, Menu, Ingredient, Movement, Announcement } from './models.js';
export async function seedData({ managerEmail, managerPassword, staffEmail, staffPassword }) {
  if (
    !managerPassword ||
    managerPassword.length < 10 ||
    !staffPassword ||
    staffPassword.length < 10
  )
    throw Error('Set both seed passwords to at least 10 characters before seeding.');
  for (const [name, email, password, role] of [
    ['Coffee Spot Manager', managerEmail, managerPassword, 'manager'],
    ['Coffee Spot Staff', staffEmail, staffPassword, 'staff'],
  ])
    if (!(await User.exists({ email })))
      await User.create({
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role,
        status: 'active',
      });
  if ((await Menu.countDocuments()) || (await Ingredient.countDocuments())) {
    console.log('Existing inventory kept. No sample stock was added.');
    return;
  }
  const definitions = [
    ['Coffee beans', 'g', 5000, 1000],
    ['Fresh milk', 'ml', 12000, 2000],
    ['Oat milk', 'ml', 4000, 1000],
    ['Caramel syrup', 'ml', 1500, 500],
    ['Chocolate sauce', 'ml', 1500, 500],
    ['Matcha powder', 'g', 700, 150],
    ['Cups', 'piece', 200, 50],
    ['Croissants', 'piece', 8, 10],
  ];
  const ingredients = [];
  for (const [name, unit, stock, reorderLevel] of definitions) {
    const i = await Ingredient.create({
      name,
      unit,
      stock,
      reorderLevel,
      supplier: 'San Juan Head Office',
    });
    ingredients.push(i);
    await Movement.create({
      ingredient: i._id,
      ingredientName: name,
      unit,
      quantity: stock,
      balance: stock,
      type: 'Receipt',
      reason: 'Initial sample stock',
      actor: 'System seed',
    });
  }
  const items = [
    [
      'Classic Latte',
      'Coffee',
      12000,
      'latte',
      [
        [0, 18],
        [1, 200],
        [6, 1],
      ],
      'Our everyday espresso, softened with silky milk.',
    ],
    [
      'Americano',
      'Coffee',
      9500,
      'espresso',
      [
        [0, 18],
        [6, 1],
      ],
      'A clean, bold espresso with hot water.',
    ],
    [
      'Caramel Latte',
      'Coffee',
      14500,
      'latte',
      [
        [0, 18],
        [1, 180],
        [3, 25],
        [6, 1],
      ],
      'Rich espresso with a golden caramel finish.',
    ],
    [
      'Oat Milk Latte',
      'Coffee',
      15500,
      'latte',
      [
        [0, 18],
        [2, 200],
        [6, 1],
      ],
      'Smooth espresso with creamy oat milk.',
    ],
    [
      'Iced Matcha',
      'Non-coffee',
      15000,
      'matcha',
      [
        [5, 5],
        [1, 200],
        [6, 1],
      ],
      'Earthy matcha, fresh milk, served over ice.',
    ],
    [
      'Chocolate Milk',
      'Non-coffee',
      12500,
      'chocolate',
      [
        [4, 30],
        [1, 200],
        [6, 1],
      ],
      'A comforting cup of chocolate and milk.',
    ],
    [
      'Butter Croissant',
      'Pastries',
      8500,
      'pastry',
      [[7, 1]],
      'Golden layers, baked for your coffee break.',
    ],
  ];
  for (const [name, category, price, visual, recipe, description] of items)
    await Menu.create({
      name,
      category,
      price,
      visual,
      description,
      recipe: recipe.map(([index, quantity]) => ({
        ingredient: ingredients[index]._id,
        quantity,
      })),
    });
  await Announcement.create({
    title: 'Welcome to Coffee Spot',
    body: 'Check the preparation board during your shift. Record all deliveries in Stock Inventory and ask your manager before adjusting a stock count.',
    author: 'Coffee Spot Manager',
  });
  console.log('Sample menu, stock, announcements, and accounts are ready.');
}
