import crypto from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
// Temporary real MongoDB replica set. No separate Atlas account is needed for this demo.
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'development';
const repl = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: '7.0.24' },
});
process.env.MONGODB_URI = repl.getUri('coffee_spot_demo');
const { default: mongoose } = await import('mongoose');
const { initModels } = await import('./models.js');
const { seedData } = await import('./seed-data.js');
await mongoose.connect(process.env.MONGODB_URI);
await initModels();
await seedData({
  managerEmail: 'manager@coffeespot.local',
  managerPassword: 'CoffeeSpot123!',
  staffEmail: 'staff@coffeespot.local',
  staffPassword: 'CoffeeSpot123!',
});
const { app } = await import('./app.js');
const server = app.listen(5000, () =>
  console.log('Coffee Spot DEMO API on 5000. Data resets when stopped. Password: CoffeeSpot123!'),
);
for (const sig of ['SIGINT', 'SIGTERM'])
  process.on(sig, () =>
    server.close(async () => {
      await mongoose.disconnect();
      await repl.stop();
      process.exit(0);
    }),
  );
