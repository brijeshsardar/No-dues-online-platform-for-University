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

  if (params.model && mutationActions.includes(params.action)) {
    // Asynchronously sync the change to MongoDB without blocking primary database flow
    mongoSyncService.handlePrismaChange(params.model, params.action, params.args, result).catch((err) => {
      console.warn(`[MongoSync] Background sync notice for ${params.model}.${params.action}:`, err.message);
    });
  }

  return result;
});

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}
