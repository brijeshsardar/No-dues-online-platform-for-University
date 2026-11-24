import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { mongoSyncService } from '../services/mongoSyncService.js';

// Setup writable SQLite location for Vercel Serverless environment
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  process.env.DATABASE_URL = `file:${tmpDbPath}`;

  try {
    const tmpDir = path.dirname(tmpDbPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  } catch {}

  if (!fs.existsSync(tmpDbPath)) {
    const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    const searchPaths = [
      path.join(process.cwd(), 'backend', 'prisma', 'template.db'),
      path.join(process.cwd(), 'prisma', 'template.db'),
      path.join(currentDir, '..', '..', 'prisma', 'template.db'),
      path.join(currentDir, '..', 'prisma', 'template.db'),
      path.join(currentDir, 'template.db'),
    ];
    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        try {
          fs.copyFileSync(p, tmpDbPath);
          console.log(`[Database] Initialized writable SQLite at ${tmpDbPath} from ${p}`);
          break;
        } catch (err: any) {
          console.warn('[Database] Could not copy template db:', err.message);
        }
      }
    }
  }
}

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
