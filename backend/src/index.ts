import 'dotenv/config'; // IMPORTANT: must be first — populates process.env before env.ts reads it
import { env } from './config/env'; // reads process.env — must come after dotenv/config
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyToken } from '@clerk/express';

import { logger } from './lib/logger';
import { app } from './app';
import { initIO } from './lib/socket';
import { prisma } from './lib/prisma';

const httpServer = createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
  },
});

// Register the io instance in our singleton for global use
initIO(io);

io.on('connection', (socket) => {
  const token = socket.handshake.auth['token'] as string | undefined;

  if (!token) {
    logger.warn(`Socket ${socket.id} rejected: no token`);
    socket.disconnect(true);
    return;
  }

  verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
    .then((payload) => {
      const orgId = payload.org_id;
      if (!orgId) {
        logger.warn(`Socket ${socket.id} rejected: no org context in token`);
        socket.disconnect(true);
        return;
      }
      void socket.join(`org:${orgId}`);
      logger.debug(`Socket ${socket.id} joined org room: ${orgId}`);

      socket.on('disconnect', () => {
        logger.debug(`Socket ${socket.id} disconnected`);
      });
    })
    .catch(() => {
      logger.warn(`Socket ${socket.id} rejected: invalid token`);
      socket.disconnect(true);
    });
});

const PORT = env.PORT;

const server = httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${env.NODE_ENV})`);
});

// Graceful Shutdown
function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
    
    io.close(() => {
      logger.info('Socket.io connections closed.');
      
      prisma.$disconnect().then(() => {
        logger.info('Database connections closed.');
        process.exit(0);
      }).catch((err) => {
        logger.error('Error during database disconnection:', err);
        process.exit(1);
      });
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

