import 'dotenv/config';
import { buildApp } from './app.js';
import { config } from './config/index.js';
import { prisma, disconnectDatabase } from './config/database.js';
import { disconnectRedis } from './config/redis.js';

async function start(): Promise<void> {
  const app = await buildApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    await disconnectDatabase();
    await disconnectRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    // Verify DB connection
    await prisma.$connect();
    app.log.info('Database connected');

    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info(`Swagger UI → http://localhost:${config.PORT}/docs`);
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

void start();
