import { createApp } from './app';
import { env } from './config/env';
import { pool } from './config/database';

const app = createApp();
const server = app.listen(env.PORT, env.HOST, () => {
  console.info(`LENDR backend listening on http://${env.HOST}:${env.PORT}`);
});

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.info(`${signal} received; shutting down LENDR backend.`);

  server.close(async (serverError) => {
    if (serverError) {
      console.error('HTTP server shutdown failed:', serverError);
      process.exitCode = 1;
    }

    try {
      await pool?.end();
    } catch (error) {
      console.error('PostgreSQL pool shutdown failed:', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

server.on('error', (error) => {
  console.error('HTTP server failed to start:', error);
  process.exitCode = 1;
});
