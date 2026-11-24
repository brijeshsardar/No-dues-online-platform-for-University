import { MongoClient, Db } from 'mongodb';
import { config } from '../config/index.js';

export interface MongoSyncStatus {
  isConnected: boolean;
  uriConfigured: boolean;
  dbName: string;
  totalSyncedRecords: number;
  lastSyncAt: string | null;
  lastError: string | null;
  collectionsStatus: Record<string, number>;
}

export class MongoSyncService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;
  private lastSyncAt: string | null = null;
  private lastError: string | null = null;
  private totalSyncedRecords = 0;
  private isSyncing = false;

  private modelToCollectionMap: Record<string, string> = {
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
    // Attempt auto-connect if URI is configured
    if (config.mongoDbUri) {
      this.connect().catch((err) => {
        console.warn('[MongoSync] Auto-connect deferred:', err.message);
      });
    } else {
      console.log('[MongoSync] Service ready in STANDBY mode (MONGODB_URI not configured in .env).');
    }
  }

  /**
   * Connect to MongoDB
   */
  async connect(customUri?: string): Promise<boolean> {
    const uri = customUri || config.mongoDbUri;
    if (!uri) {
      this.lastError = 'MongoDB URI not configured';
      this.isConnected = false;
      return false;
    }

    try {
      if (this.client) {
        try {
          await this.client.close();
        } catch {}
      }

      console.log(`[MongoSync] Connecting to MongoDB (${config.mongoDbName})...`);
      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      await this.client.connect();
      this.db = this.client.db(config.mongoDbName);
      
      // Ping to verify
      await this.db.command({ ping: 1 });
      this.isConnected = true;
      this.lastError = null;
      console.log(`[MongoSync] Connected to MongoDB database: ${config.mongoDbName}`);

      // Ensure indexes for performance and fast lookups
      await this.ensureIndexes();

      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.lastError = err.message || 'Failed to connect to MongoDB';
      console.error('[MongoSync] Connection failed:', this.lastError);
      return false;
    }
  }

  /**
   * Ensure standard lookup indexes exist in MongoDB
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
      
      // Index for the change_history collection
      const historyCol = this.db.collection('change_history');
      await historyCol.createIndex({ model: 1, recordId: 1, timestamp: -1 }).catch(() => {});
      await historyCol.createIndex({ timestamp: -1 }).catch(() => {});
    } catch (e: any) {
      console.warn('[MongoSync] Index creation notice:', e.message);
    }
  }

  /**
   * Sanitize objects for MongoDB (handle dates, circular refs, and BigInts)
   */
  private sanitize(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sanitize(item));

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'bigint') {
        result[key] = value.toString();
      } else if (value instanceof Date) {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitize(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Handle real-time Prisma change event
   */
  async handlePrismaChange(model: string, action: string, args: any, result: any): Promise<void> {
    if (!this.isConnected || !this.db) {
      // If not connected, silently bypass without failing primary app operation
      return;
    }

    const collectionName = this.modelToCollectionMap[model] || model.toLowerCase();
    const collection = this.db.collection(collectionName);
    const historyCol = this.db.collection('change_history');

    try {
      const timestamp = new Date();

      if (['create', 'update', 'upsert'].includes(action)) {
        if (result && typeof result === 'object') {
          const doc = this.sanitize(result);
          const filter = result.id ? { id: result.id } : { _id: result.id };
          
          await collection.updateOne(filter, { $set: doc }, { upsert: true });

          // Also record in change history
          await historyCol.insertOne({
            model,
            action: action.toUpperCase(),
            recordId: result.id || null,
            changes: this.sanitize(args?.data || args || {}),
            snapshot: doc,
            timestamp,
          });

          this.totalSyncedRecords++;
          this.lastSyncAt = timestamp.toISOString();
        }
      } else if (action === 'delete') {
        const id = args?.where?.id || result?.id;
        if (id) {
          await collection.deleteOne({ id });
          await historyCol.insertOne({
            model,
            action: 'DELETE',
            recordId: id,
            where: this.sanitize(args?.where || {}),
            timestamp,
          });
          this.lastSyncAt = timestamp.toISOString();
        }
      } else if (['createMany', 'updateMany', 'deleteMany'].includes(action)) {
        // Record batch action in change history
        await historyCol.insertOne({
          model,
          action: action.toUpperCase(),
          args: this.sanitize(args || {}),
          resultSummary: this.sanitize(result || {}),
          timestamp,
        });
        this.lastSyncAt = timestamp.toISOString();
      }
    } catch (err: any) {
      console.error(`[MongoSync] Failed to sync ${model}.${action}:`, err.message);
    }
  }

  /**
   * Full bulk sync of all records from primary database into MongoDB
   */
  async syncAllRecords(prisma: any): Promise<{
    success: boolean;
    totalSynced: number;
    details: Record<string, number>;
    error?: string;
  }> {
    if (!this.isConnected || !this.db) {
      const reconnected = await this.connect();
      if (!reconnected) {
        return {
          success: false,
          totalSynced: 0,
          details: {},
          error: this.lastError || 'MongoDB is not connected. Please set MONGODB_URI in backend/.env',
        };
      }
    }

    if (this.isSyncing) {
      return {
        success: false,
        totalSynced: this.totalSyncedRecords,
        details: {},
        error: 'A synchronization operation is already in progress.',
      };
    }

    this.isSyncing = true;
    const details: Record<string, number> = {};
    let totalCount = 0;

    try {
      console.log('[MongoSync] Starting full database mirror to MongoDB...');

      for (const [modelName, collectionName] of Object.entries(this.modelToCollectionMap)) {
        const prismaModelDelegate = (prisma as any)[
          modelName.charAt(0).toLowerCase() + modelName.slice(1)
        ];

        if (!prismaModelDelegate || typeof prismaModelDelegate.findMany !== 'function') {
          continue;
        }

        try {
          const records = await prismaModelDelegate.findMany();
          if (records && records.length > 0) {
            const col = this.db!.collection(collectionName);
            
            // Bulk upsert each record by its ID
            const bulkOps = records.map((record: any) => ({
              updateOne: {
                filter: { id: record.id },
                update: { $set: this.sanitize(record) },
                upsert: true,
              },
            }));

            await col.bulkWrite(bulkOps);
            details[collectionName] = records.length;
            totalCount += records.length;
          } else {
            details[collectionName] = 0;
          }
        } catch (colErr: any) {
          console.warn(`[MongoSync] Error syncing collection ${collectionName}:`, colErr.message);
          details[collectionName] = -1;
        }
      }

      this.totalSyncedRecords = totalCount;
      this.lastSyncAt = new Date().toISOString();
      this.lastError = null;

      // Record sync run metadata in MongoDB
      await this.db!.collection('system_sync_runs').insertOne({
        type: 'FULL_SYNC',
        timestamp: new Date(),
        totalSynced: totalCount,
        collections: details,
      });

      console.log(`[MongoSync] Full synchronization complete! Total records synced: ${totalCount}`);

      return {
        success: true,
        totalSynced: totalCount,
        details,
      };
    } catch (err: any) {
      this.lastError = err.message;
      return {
        success: false,
        totalSynced: totalCount,
        details,
        error: err.message,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get live sync status & collection stats
   */
  async getStatus(): Promise<MongoSyncStatus> {
    const collectionsStatus: Record<string, number> = {};

    // Initialize all collections
    for (const colName of Object.values(this.modelToCollectionMap)) {
      collectionsStatus[colName] = 0;
    }

    if (this.isConnected && this.db) {
      try {
        for (const colName of Object.values(this.modelToCollectionMap)) {
          const count = await this.db.collection(colName).countDocuments().catch(() => 0);
          collectionsStatus[colName] = count;
        }
      } catch {}
    }

    return {
      isConnected: this.isConnected,
      uriConfigured: Boolean(config.mongoDbUri),
      dbName: config.mongoDbName,
      totalSyncedRecords: this.totalSyncedRecords,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      collectionsStatus,
    };
  }
}

export const mongoSyncService = new MongoSyncService();
