import mongoose from 'mongoose';
import { config, checkConfig } from './config.js';
import { initModels } from './models.js';
import { seedData } from './seed-data.js';
try {
  checkConfig();
  await mongoose.connect(config.uri);
  await initModels();
  await seedData({
    managerEmail: process.env.SEED_MANAGER_EMAIL,
    managerPassword: process.env.SEED_MANAGER_PASSWORD,
    staffEmail: process.env.SEED_STAFF_EMAIL,
    staffPassword: process.env.SEED_STAFF_PASSWORD,
  });
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
