import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { config } from '../config/index.js';
import { prisma } from '../prisma/client.js';

export interface MongoSyncStatus {
  isConnected: boolean;
  connectionState: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'STANDBY';
  uriConfigured: boolean;
  maskedUri: string;
  dbName: string;
  totalSyncedRecords: number;
  lastSyncAt: string | null;
  lastError: string | null;
  collectionsStatus: Record<string, number>;
  queueStats: {
    pending: number;
    failed: number;
    completed: number;
    total: number;
  };
  serverInfo?: {
    hosts?: string[];
    latencyMs?: number;
    ssl?: boolean;
  };
}

export interface TestConnectionResult {
  reachable: boolean;
  latencyMs: number;
  database: string;
  hosts?: string[];
  error?: string;
  maskedUri: string;
}

export class MongoSyncService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionState: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'STANDBY' = 'STANDBY';
  private lastSyncAt: string | null = null;
  private lastError: string | null = null;
  private totalSyncedRecords = 0;
  private isSyncing = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private activeUri: string = '';
  private lastLatencyMs: number = 0;

  public readonly modelToCollectionMap: Record<string, string> = {
    User: 'users',
    Department: 'departments',
    Faculty: 'faculty',
    Course: 'courses',
    Semester: 'semesters',
    AcademicYear: 'academic_years',
    Student: 'students',
    FeeRecord: 'fee_records',
    ClearanceRequest: 'clearance_requests',
    Approval: 'approvals',
    ExaminationEligibility: 'examination_eligibilities',
    Certificate: 'certificates',
    CertificateVerification: 'certificate_verifications',
    Notification: 'notifications',
    AuditLog: 'audit_logs',
    SecurityEvent: 'security_events',
    PaymentTransaction: 'payment_transactions',
    FeeModificationLog: 'fee_modification_logs',
    ReapplicationRecord: 'reapplication_records',
  };

  constructor() {
    this.activeUri = config.mongoDbUri || '';
    if (this.activeUri) {
      this.connect(this.activeUri).catch((err) => {
        console.warn('[MongoSync] Initial connection notice:', err.message);
      });
    } else {
      this.connectionState = 'STANDBY';
      console.log('[MongoSync] Ready in STANDBY mode (MONGODB_URI not configured in .env).');
    }
  }

  /**
   * Validate MongoDB URI format (supports both mongodb:// and mongodb+srv://)
   */
  static validateUri(uri: string): { valid: boolean; error?: string } {
    if (!uri || typeof uri !== 'string') {
      return { valid: false, error: 'Connection string is required.' };
    }
    const trimmed = uri.trim();
    if (!trimmed.startsWith('mongodb://') && !trimmed.startsWith('mongodb+srv://')) {
      return {
        valid: false,
        error: 'Invalid connection scheme. Must start with "mongodb://" or "mongodb+srv://".',
      };
    }
    try {
      // Basic structure check
      const withoutScheme = trimmed.replace(/^mongodb(\+srv)?:\/\//, '');
      if (!withoutScheme || withoutScheme.length < 3) {
        return { valid: false, error: 'Malformed MongoDB connection string.' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'Failed to parse connection string.' };
    }
  }

  /**
   * Mask connection string to protect credentials
   */
  static maskUri(uri: string): string {
    if (!uri) return '';
    try {
      // Replace password between : and @ with 8 dots
      return uri.replace(/(mongodb(\+srv)?:\/\/[^:]+:)[^@]+(@)/, '$1••••••••$3');
    } catch {
      return 'mongodb://••••••••';
    }
  }

  /**
   * Sanitize record payloads to strip sensitive fields (passwords, tokens, secrets)
   */
  sanitizeRecord(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sanitizeRecord(item));

    const sensitiveFields = ['passwordHash', 'password', 'mfaSecret', 'sessionSecret', 'jwtSecret', 'cookieSecret'];
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.includes(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'bigint') {
        result[key] = value.toString();
      } else if (value instanceof Date) {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeRecord(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Connect to MongoDB Atlas or local MongoDB
   */
  async connect(targetUri?: string): Promise<boolean> {
    const uri = targetUri || this.activeUri || config.mongoDbUri;
    const validation = MongoSyncService.validateUri(uri);
    if (!validation.valid) {
      this.lastError = validation.error || 'Invalid URI';
      this.connectionState = 'STANDBY';
      return false;
    }

    this.activeUri = uri;
    const masked = MongoSyncService.maskUri(uri);

    try {
      if (this.client) {
        try {
          await this.client.close(true);
        } catch {}
      }

      console.log(`[MongoSync] Connecting to MongoDB Atlas cluster at ${masked}...`);
      this.connectionState = 'RECONNECTING';

      const options: MongoClientOptions = {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
      };

      const startMs = Date.now();
      this.client = new MongoClient(uri, options);

      // Handle unexpected client disconnects
      this.client.on('close', () => {
        if (this.connectionState === 'CONNECTED') {
          console.warn('[MongoSync] Connection closed by remote server. Scheduling reconnect...');
          this.scheduleReconnect();
        }
      });

      this.client.on('error', (err) => {
        console.error('[MongoSync] MongoDB client error:', err.message);
        this.lastError = err.message;
      });

      await this.client.connect();
      this.db = this.client.db(config.mongoDbName);

      // Ping to verify authentication and database access
      await this.db.command({ ping: 1 });
      this.lastLatencyMs = Date.now() - startMs;

      this.connectionState = 'CONNECTED';
      this.lastError = null;
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      console.log(`[MongoSync] Connected to MongoDB Atlas (${config.mongoDbName}) in ${this.lastLatencyMs}ms!`);

      // Ensure indexes asynchronously
      this.ensureIndexes().catch((err) => {
        console.warn('[MongoSync] Index verification notice:', err.message);
      });

      // Process any pending durable queue jobs asynchronously upon reconnect
      this.processDurableQueue().catch((err) => {
        console.warn('[MongoSync] Queue processing notice:', err.message);
      });

      return true;
    } catch (err: any) {
      this.connectionState = 'DISCONNECTED';
      this.lastError = err.message || 'Failed to connect to MongoDB cluster';
      console.error(`[MongoSync] Connection failed for ${masked}:`, this.lastError);
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * Schedule automatic reconnect with exponential backoff (2s, 4s, 8s, up to 30s)
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.activeUri) return;
    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    console.log(`[MongoSync] Will attempt reconnection #${this.reconnectAttempts} in ${Math.round(delay / 1000)}s...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.connectionState !== 'CONNECTED' && this.activeUri) {
        await this.connect(this.activeUri);
      }
    }, delay);
  }

  /**
   * Test connection to a MongoDB URI without modifying active service state
   */
  async testConnection(targetUri?: string): Promise<TestConnectionResult> {
    const uri = targetUri || this.activeUri || config.mongoDbUri;
    const validation = MongoSyncService.validateUri(uri);
    if (!validation.valid) {
      return {
        reachable: false,
        latencyMs: 0,
        database: config.mongoDbName,
        error: validation.error,
        maskedUri: MongoSyncService.maskUri(uri),
      };
    }

    const masked = MongoSyncService.maskUri(uri);
    let testClient: MongoClient | null = null;

    try {
      const startMs = Date.now();
      testClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 8000,
      });

      await testClient.connect();
      const testDb = testClient.db(config.mongoDbName);
      const pingRes = await testDb.command({ ping: 1 });
      const latencyMs = Date.now() - startMs;

      // Inspect topology
      const hosts: string[] = [];
      try {
        const isMaster = await testDb.command({ isMaster: 1 });
        if (isMaster.hosts) hosts.push(...isMaster.hosts);
        if (isMaster.primary) hosts.push(isMaster.primary);
      } catch {}

      await testClient.close();
      return {
        reachable: Boolean(pingRes && pingRes.ok),
        latencyMs,
        database: config.mongoDbName,
        hosts: Array.from(new Set(hosts)),
        maskedUri: masked,
      };
    } catch (err: any) {
      if (testClient) {
        try {
          await testClient.close();
        } catch {}
      }
      return {
        reachable: false,
        latencyMs: 0,
        database: config.mongoDbName,
        error: err.message || 'Connection test failed',
        maskedUri: masked,
      };
    }
  }

  /**
   * Disconnect from MongoDB Atlas
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      try {
        await this.client.close(true);
      } catch {}
      this.client = null;
      this.db = null;
    }
    this.connectionState = 'STANDBY';
    console.log('[MongoSync] Disconnected from MongoDB. Service in STANDBY mode.');
  }

  /**
   * Ensure unique indexes on record IDs and change history
   */
  private async ensureIndexes(): Promise<void> {
    if (!this.db) return;
    try {
      const collections = Object.values(this.modelToCollectionMap);
      for (const colName of collections) {
        const col = this.db.collection(colName);
        await col.createIndex({ id: 1 }, { unique: true, sparse: true }).catch(() => {});
        await col.createIndex({ updatedAt: -1 }).catch(() => {});
      }

      // Indexes for change_history
      const historyCol = this.db.collection('change_history');
      await historyCol.createIndex({ timestamp: -1 }).catch(() => {});
      await historyCol.createIndex({ model: 1, recordId: 1 }).catch(() => {});
      await historyCol.createIndex({ action: 1 }).catch(() => {});
    } catch (e: any) {
      console.warn('[MongoSync] Index creation notice:', e.message);
    }
  }

  /**
   * Handle real-time Prisma change events:
   * 1. If Atlas is connected, apply directly to MongoDB and record change_history.
   * 2. If disconnected or if error occurs, queue durably in primary database (MongoSyncQueueJob).
   */
  async handlePrismaChange(model: string, action: string, args: any, result: any): Promise<void> {
    // Ignore queue model itself to avoid recursion
    if (model === 'MongoSyncQueueJob') return;

    const rawRecordId = result?.id || args?.where?.id || null;
    const recordId = typeof rawRecordId === 'string' ? rawRecordId : rawRecordId ? JSON.stringify(rawRecordId) : null;
    const sanitizedResult = this.sanitizeRecord(result);
    const sanitizedArgs = this.sanitizeRecord(args);

    // If disconnected, record in durable queue immediately
    if (this.connectionState !== 'CONNECTED' || !this.db) {
      await this.queueJobDurable(model, action, recordId, { args: sanitizedArgs, result: sanitizedResult }, 'MongoDB not connected (queued for retry)');
      return;
    }

    // Try applying directly to MongoDB
    try {
      await this.applyChangeToMongo(model, action, recordId, sanitizedArgs, sanitizedResult);
      this.totalSyncedRecords++;
      this.lastSyncAt = new Date().toISOString();
    } catch (err: any) {
      console.warn(`[MongoSync] Direct sync error for ${model}.${action}: ${err.message}. Saving to durable queue.`);
      await this.queueJobDurable(model, action, recordId, { args: sanitizedArgs, result: sanitizedResult }, err.message);
    }
  }

  /**
   * Directly apply change to MongoDB and write immutable audit snapshot to change_history
   */
  private async applyChangeToMongo(model: string, action: string, recordId: string | null, sanitizedArgs: any, sanitizedResult: any): Promise<void> {
    if (!this.db) throw new Error('Database handle unavailable');

    const collectionName = this.modelToCollectionMap[model] || model.toLowerCase();
    const collection = this.db.collection(collectionName);
    const historyCol = this.db.collection('change_history');
    const timestamp = new Date();

    if (['create', 'update', 'upsert'].includes(action)) {
      if (sanitizedResult && typeof sanitizedResult === 'object') {
        const filter = recordId ? { id: recordId } : { id: sanitizedResult.id };
        await collection.updateOne(filter, { $set: sanitizedResult }, { upsert: true });

        // Append to change_history (append-only ledger)
        await historyCol.insertOne({
          model,
          action: action.toUpperCase(),
          recordId: recordId || sanitizedResult.id || null,
          previousValues: sanitizedArgs?.where ? null : undefined,
          changes: sanitizedArgs?.data || sanitizedArgs || {},
          snapshot: sanitizedResult,
          timestamp,
          syncStatus: 'SYNCED',
        });
      }
    } else if (action === 'delete') {
      const id = recordId || sanitizedArgs?.where?.id;
      if (id) {
        await collection.deleteOne({ id });
        await historyCol.insertOne({
          model,
          action: 'DELETE',
          recordId: id,
          changes: sanitizedArgs?.where || {},
          snapshot: sanitizedResult || null,
          timestamp,
          syncStatus: 'SYNCED',
        });
      }
    } else if (['createMany', 'updateMany', 'deleteMany'].includes(action)) {
      await historyCol.insertOne({
        model,
        action: action.toUpperCase(),
        recordId: null,
        changes: sanitizedArgs || {},
        snapshot: sanitizedResult || null,
        timestamp,
        syncStatus: 'SYNCED',
      });
    }
  }

  /**
   * Save failed/pending change to the durable queue in primary database
   */
  private async queueJobDurable(model: string, action: string, recordId: string | null, data: any, errorMessage: string): Promise<void> {
    try {
      await (prisma as any).mongoSyncQueueJob.create({
        data: {
          model,
          action,
          recordId: typeof recordId === 'string' ? recordId : recordId ? JSON.stringify(recordId) : null,
          payload: JSON.stringify(data),
          status: 'PENDING',
          attempts: 1,
          lastError: errorMessage,
        },
      });
    } catch (queueErr: any) {
      console.error('[MongoSync] Failed to write durable queue record:', queueErr.message);
    }
  }

  /**
   * Process all pending or failed jobs in the durable queue
   */
  async processDurableQueue(): Promise<{ processed: number; failed: number }> {
    if (this.connectionState !== 'CONNECTED' || !this.db) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    try {
      const pendingJobs = await (prisma as any).mongoSyncQueueJob.findMany({
        where: { status: { in: ['PENDING', 'FAILED'] } },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      for (const job of pendingJobs) {
        try {
          const payload = JSON.parse(job.payload || '{}');
          await this.applyChangeToMongo(job.model, job.action, job.recordId, payload.args, payload.result);

          await (prisma as any).mongoSyncQueueJob.update({
            where: { id: job.id },
            data: { status: 'COMPLETED', updatedAt: new Date() },
          });

          processed++;
          this.totalSyncedRecords++;
        } catch (jobErr: any) {
          failed++;
          await (prisma as any).mongoSyncQueueJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              attempts: { increment: 1 },
              lastError: jobErr.message,
              updatedAt: new Date(),
            },
          });
        }
      }

      if (processed > 0) {
        console.log(`[MongoSync] Recovered and processed ${processed} durable queue operations to MongoDB Atlas.`);
      }
    } catch (err: any) {
      console.error('[MongoSync] Durable queue processing error:', err.message);
    }

    return { processed, failed };
  }

  /**
   * Synchronize all 19 Prisma models into MongoDB Atlas (safe and idempotent bulk sync)
   */
  async syncAllRecords(prismaClient: any): Promise<{
    success: boolean;
    totalSynced: number;
    details: Record<string, number>;
    failedCollections: string[];
    error?: string;
  }> {
    if (this.connectionState !== 'CONNECTED' || !this.db) {
      const reconnected = await this.connect();
      if (!reconnected) {
        return {
          success: false,
          totalSynced: 0,
          details: {},
          failedCollections: [],
          error: this.lastError || 'MongoDB Atlas is not connected. Please configure MONGODB_URI.',
        };
      }
    }

    if (this.isSyncing) {
      return {
        success: false,
        totalSynced: this.totalSyncedRecords,
        details: {},
        failedCollections: [],
        error: 'A synchronization operation is already in progress.',
      };
    }

    this.isSyncing = true;
    const details: Record<string, number> = {};
    const failedCollections: string[] = [];
    let totalCount = 0;

    try {
      console.log('[MongoSync] Starting full 19-collection sync to MongoDB Atlas...');

      for (const [modelName, collectionName] of Object.entries(this.modelToCollectionMap)) {
        const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        const delegate = (prismaClient as any)[delegateName];

        if (!delegate || typeof delegate.findMany !== 'function') {
          console.warn(`[MongoSync] Delegate for model ${modelName} not found.`);
          continue;
        }

        try {
          const records = await delegate.findMany();
          const col = this.db!.collection(collectionName);

          if (records && records.length > 0) {
            // Upsert records in batches of 200
            const batchSize = 200;
            for (let i = 0; i < records.length; i += batchSize) {
              const batch = records.slice(i, i + batchSize);
              const bulkOps = batch.map((rec: any) => ({
                updateOne: {
                  filter: { id: rec.id },
                  update: { $set: this.sanitizeRecord(rec) },
                  upsert: true,
                },
              }));
              await col.bulkWrite(bulkOps);
            }
            details[collectionName] = records.length;
            totalCount += records.length;
          } else {
            details[collectionName] = 0;
          }
        } catch (colErr: any) {
          console.error(`[MongoSync] Error syncing ${collectionName}:`, colErr.message);
          details[collectionName] = -1;
          failedCollections.push(collectionName);
        }
      }

      this.totalSyncedRecords = totalCount;
      this.lastSyncAt = new Date().toISOString();

      // Record full sync event in system_sync_runs
      await this.db!.collection('system_sync_runs').insertOne({
        type: 'FULL_SYNC',
        timestamp: new Date(),
        totalSynced: totalCount,
        collections: details,
        status: failedCollections.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      });

      console.log(`[MongoSync] Sync complete! Synced ${totalCount} records across ${Object.keys(details).length} collections.`);

      return {
        success: failedCollections.length === 0,
        totalSynced: totalCount,
        details,
        failedCollections,
      };
    } catch (err: any) {
      this.lastError = err.message;
      return {
        success: false,
        totalSynced: totalCount,
        details,
        failedCollections,
        error: err.message,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Retrieve immutable change history entries with pagination
   */
  async getChangeHistory(limit = 50, model?: string, action?: string): Promise<any[]> {
    if (this.connectionState !== 'CONNECTED' || !this.db) {
      return [];
    }
    try {
      const filter: Record<string, any> = {};
      if (model) filter.model = model;
      if (action) filter.action = action.toUpperCase();

      const history = await this.db
        .collection('change_history')
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(Math.min(limit, 200))
        .toArray();

      return history;
    } catch (err: any) {
      console.error('[MongoSync] Error reading change history:', err.message);
      return [];
    }
  }

  /**
   * Get complete status including collection counts and durable queue metrics
   */
  async getStatus(): Promise<MongoSyncStatus> {
    const collectionsStatus: Record<string, number> = {};

    for (const colName of Object.values(this.modelToCollectionMap)) {
      collectionsStatus[colName] = 0;
    }

    if (this.connectionState === 'CONNECTED' && this.db) {
      try {
        for (const colName of Object.values(this.modelToCollectionMap)) {
          const count = await this.db.collection(colName).countDocuments().catch(() => 0);
          collectionsStatus[colName] = count;
        }
      } catch {}
    }

    // Query durable queue statistics from primary database
    let queueStats = { pending: 0, failed: 0, completed: 0, total: 0 };
    try {
      const [pending, failed, completed] = await Promise.all([
        (prisma as any).mongoSyncQueueJob.count({ where: { status: 'PENDING' } }).catch(() => 0),
        (prisma as any).mongoSyncQueueJob.count({ where: { status: 'FAILED' } }).catch(() => 0),
        (prisma as any).mongoSyncQueueJob.count({ where: { status: 'COMPLETED' } }).catch(() => 0),
      ]);
      queueStats = {
        pending,
        failed,
        completed,
        total: pending + failed + completed,
      };
    } catch {}

    return {
      isConnected: this.connectionState === 'CONNECTED',
      connectionState: this.connectionState,
      uriConfigured: Boolean(this.activeUri),
      maskedUri: MongoSyncService.maskUri(this.activeUri),
      dbName: config.mongoDbName,
      totalSyncedRecords: this.totalSyncedRecords,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      collectionsStatus,
      queueStats,
      serverInfo: {
        latencyMs: this.lastLatencyMs,
        ssl: this.activeUri.startsWith('mongodb+srv://') || this.activeUri.includes('ssl=true'),
      },
    };
  }
}

export const mongoSyncService = new MongoSyncService();
