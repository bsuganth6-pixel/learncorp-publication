import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB, prepareDatabase } from './config/db';
import { assertRuntimeConfig } from './config/env';

const PORT = process.env.PORT || 5000;

async function start() {
  assertRuntimeConfig();
  await connectDB();
  await prepareDatabase();
  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});
