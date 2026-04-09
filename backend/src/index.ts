import 'dotenv/config'; // IMPORTANT: must be first — populates process.env before env.ts reads it
import { env } from './config/env'; // reads process.env — must come after dotenv/config
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyToken } from '@clerk/express';

import { logger } from './lib/logger';
import { app } from './app';
import { initIO } from './lib/socket';

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

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${env.NODE_ENV})`);
});
