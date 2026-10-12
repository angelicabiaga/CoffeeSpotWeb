import mongoose from 'mongoose';
import { config, checkConfig } from './config.js';
import { app } from './app.js';
import { initModels } from './models.js';

import dns from 'node:dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

try {
  checkConfig();
  await mongoose.connect(config.uri, { serverSelectionTimeoutMS: 10000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid')
    throw Error('Coffee Spot needs MongoDB Atlas or a replica set for safe checkout transactions.');
  await initModels();
  const server = app.listen(config.port, () =>
    console.log(`Coffee Spot API: http://localhost:${config.port}`),
  );
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.on(sig, () =>
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      }),
    );
} catch (e) {
  console.error('Startup:', e.message);
  await mongoose.disconnect();
  process.exit(1);
}
