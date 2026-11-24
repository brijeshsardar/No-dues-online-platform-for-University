import { PrismaClient } from '@prisma/client';
import { mongoSyncService } from '../services/mongoSyncService.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = global.prismaGlobal || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Prisma middleware for real-time change capture and replication to MongoDB
const mutationActions = ['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'];

prisma.$use(async (params, next) => {
  const result = await next(params);

  // Ignore durable queue jobs to prevent recursion
  if (params.model === 'MongoSyncQueueJob') {
    return result;
  }

  if (params.model && mutationActions.includes(params.action)) {
    const modelName = params.model;
    const actionName = params.action;
    const mutationArgs = params.args;
    // Defer durable sync to next tick so interactive database transactions and SQLite locks are never blocked
    setImmediate(() => {
      mongoSyncService.handlePrismaChange(modelName, actionName, mutationArgs, result).catch((err) => {
        console.warn(`[MongoSync] Background sync notice for ${modelName}.${actionName}:`, err.message);
      });
    });
  }

  return result;
});

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}
