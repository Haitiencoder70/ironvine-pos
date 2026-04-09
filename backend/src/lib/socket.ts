import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';

let ioInstance: SocketIOServer | null = null;

/**
 * Register the Socket.IO server instance.
 * Called once from index.ts after the HTTP server is created.
 */
export function initIO(io: SocketIOServer): void {
  ioInstance = io;
  logger.debug('Socket.IO instance registered');
}

/**
 * Retrieve the Socket.IO server instance.
 * Throws if initIO() has not been called yet.
 */
export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized. Call initIO() first.');
  }
  return ioInstance;
}

/**
 * Safely emit an event to all sockets in an organization room.
 * Uses `org:<orgId>` room naming for strict tenant isolation.
 * No-ops if Socket.IO is not yet initialized (e.g. during unit tests).
 */
export function emitToOrg(orgId: string, event: string, data: unknown): void {
  if (!ioInstance) {
    logger.warn('Socket.IO not initialized — skipping emit', { event, orgId });
    return;
  }
  ioInstance.to(`org:${orgId}`).emit(event, data);
}
