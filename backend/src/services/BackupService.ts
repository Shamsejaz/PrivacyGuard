import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { logger, auditLog } from '../utils/logger';
import { monitoringService } from './MonitoringService';

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron format
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  storage: {
    local: {
      enabled: boolean;
      path: string;
    };
    s3?: {
      enabled: boolean;
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  databases: {
    postgresql: boolean;
    mongodb: boolean;
  };
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental';
  databases: string[];
  size: number;
  duration: number;
  status: 'success' | 'failed' | 'in_progress';
  error?: string;
  checksum?: string;
}

class BackupService {
  private config: BackupConfig;
  private backupHistory: BackupMetadata[] = [];
  private isBackupInProgress = false;

  constructor() {
    this.config = this.loadConfig();
    this.initializeBackupDirectory();
    
    if (this.config.enabled) {
      this.scheduleBackups();
    }
  }

  private loadConfig(): BackupConfig {
    return {
      enabled: process.env.BACKUP_ENABLED === 'true',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      retention: {
        daily: parseInt(process.env.BACKUP_RETENTION_DAILY || '7'),
        weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY || '4'),
        monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY || '12'),
      },
      storage: {
        local: {
          enabled: true,
          path: process.env.BACKUP_PATH || './backups',
        },
      },
      databases: {
        postgresql: process.env.BACKUP_POSTGRESQL !== 'false',
        mongodb: process.env.BACKUP_MONGODB !== 'false',
      },
    };
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      await mkdir(this.config.storage.local.path, { recursive: true });
      logger.info(`Backup directory initialized: ${this.config.storage.local.path}`);
    } catch (error) {
      logger.error('Failed to initialize backup directory:', error);
    }
  }

  private scheduleBackups(): void {
    // For simplicity, we'll use a basic interval instead of a full cron implementation
    // In production, you'd want to use a proper cron library like node-cron
    const intervalMs = 24 * 60 * 60 * 1000; // 24 hours
    
    setInterval(() => {
      this.performBackup('full');
    }, intervalMs);

    logger.info('Backup scheduler initialized');
  }

  public async performBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupMetadata> {
    if (this.isBackupInProgress) {
      throw new Error('Backup already in progress');
    }

    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    const metadata: BackupMetadata = {
      id: backupId,
      timestamp: new Date(),
      type,
      databases: [],
      size: 0,
      duration: 0,
      status: 'in_progress',
    };

    this.isBackupInProgress = true;
    this.backupHistory.push(metadata);

    try {
      logger.info(`Starting ${type} backup: ${backupId}`);
      auditLog('backup_started', undefined, 'backup', backupId, { type });

      const backupDir = join(this.config.storage.local.path, backupId);
      await mkdir(backupDir, { recursive: true });

      // Backup PostgreSQL
      if (this.config.databases.postgresql) {
        await this.backupPostgreSQL(backupDir);
        metadata.databases.push('postgresql');
      }

      // Backup MongoDB
      if (this.config.databases.mongodb) {
        await this.backupMongoDB(backupDir);
        metadata.databases.push('mongodb');
      }

      // Calculate backup size
      metadata.size = await this.calculateDirectorySize(backupDir);
      metadata.duration = Date.now() - startTime;
      metadata.status = 'success';

      // Generate checksum
      metadata.checksum = await this.generateBackupChecksum(backupDir);

      // Save metadata
      await this.saveBackupMetadata(backupDir, metadata);

      logger.info(`Backup completed successfully: ${backupId}`, {
        duration: metadata.duration,
        size: metadata.size,
        databases: metadata.databases,
      });

      auditLog('backup_completed', undefined, 'backup', backupId, {
        duration: metadata.duration,
        size: metadata.size,
        databases: metadata.databases,
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      return metadata;

    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error.message;
      metadata.duration = Date.now() - startTime;

      logger.error(`Backup failed: ${backupId}`, error);
      auditLog('backup_failed', undefined, 'backup', backupId, { error: error.message });

      monitoringService.recordPerformanceMetric('backup_failure', 1);

      throw error;
    } finally {
      this.isBackupInProgress = false;
    }
  }

  private async backupPostgreSQL(backupDir: string): Promise<void> {
    const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump';
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured for PostgreSQL backup');
    }

    const backupFile = join(backupDir, 'postgresql.sql');
    const command = `${pgDumpPath} "${dbUrl}" > "${backupFile}"`;

    try {
      await execAsync(command);
      logger.info('PostgreSQL backup completed');
    } catch (error) {
      logger.error('PostgreSQL backup failed:', error);
      throw new Error(`PostgreSQL backup failed: ${error.message}`);
    }
  }

  private async backupMongoDB(backupDir: string): Promise<void> {
    const mongoDumpPath = process.env.MONGODUMP_PATH || 'mongodump';
    const mongoUrl = process.env.MONGODB_URL;
    
    if (!mongoUrl) {
      throw new Error('MONGODB_URL not configured for MongoDB backup');
    }

    const mongoBackupDir = join(backupDir, 'mongodb');
    const command = `${mongoDumpPath} --uri="${mongoUrl}" --out="${mongoBackupDir}"`;

    try {
      await execAsync(command);
      logger.info('MongoDB backup completed');
    } catch (error) {
      logger.error('MongoDB backup failed:', error);
      throw new Error(`MongoDB backup failed: ${error.message}`);
    }
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const files = await readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = join(dirPath, file.name);
        
        if (file.isDirectory()) {
          totalSize += await this.calculateDirectorySize(filePath);
        } else {
          const stats = await stat(filePath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      logger.error('Failed to calculate directory size:', error);
    }

    return totalSize;
  }

  private async generateBackupChecksum(backupDir: string): Promise<string> {
    // Simple checksum based on directory contents and sizes
    // In production, you'd want to use a proper hash function
    try {
      const files = await readdir(backupDir, { withFileTypes: true });
      let checksumData = '';
      
      for (const file of files) {
        const filePath = join(backupDir, file.name);
        const stats = await stat(filePath);
        checksumData += `${file.name}:${stats.size}:${stats.mtime.getTime()};`;
      }
      
      // Simple hash (in production, use crypto.createHash)
      return Buffer.from(checksumData).toString('base64');
    } catch (error) {
      logger.error('Failed to generate backup checksum:', error);
      return '';
    }
  }

  private async saveBackupMetadata(backupDir: string, metadata: BackupMetadata): Promise<void> {
    const metadataFile = join(backupDir, 'metadata.json');
    await writeFile(metadataFile, JSON.stringify(metadata, null, 2));
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupDirs = await readdir(this.config.storage.local.path, { withFileTypes: true });
      const backups: { name: string; date: Date }[] = [];

      for (const dir of backupDirs) {
        if (dir.isDirectory() && dir.name.startsWith('backup_')) {
          const metadataFile = join(this.config.storage.local.path, dir.name, 'metadata.json');
          
          try {
            const metadataContent = await readFile(metadataFile, 'utf-8');
            const metadata: BackupMetadata = JSON.parse(metadataContent);
            backups.push({ name: dir.name, date: new Date(metadata.timestamp) });
          } catch (error) {
            // If metadata is missing or corrupted, use directory name timestamp
            const timestamp = dir.name.split('_')[1];
            if (timestamp) {
              backups.push({ name: dir.name, date: new Date(parseInt(timestamp)) });
            }
          }
        }
      }

      // Sort by date (newest first)
      backups.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Keep only the configured number of backups
      const toDelete = backups.slice(this.config.retention.daily);
      
      for (const backup of toDelete) {
        const backupPath = join(this.config.storage.local.path, backup.name);
        await this.deleteDirectory(backupPath);
        logger.info(`Deleted old backup: ${backup.name}`);
      }

      if (toDelete.length > 0) {
        auditLog('backups_cleaned', undefined, 'backup', undefined, {
          deletedCount: toDelete.length,
          deletedBackups: toDelete.map(b => b.name),
        });
      }

    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  private async deleteDirectory(dirPath: string): Promise<void> {
    try {
      const files = await readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = join(dirPath, file.name);
        
        if (file.isDirectory()) {
          await this.deleteDirectory(filePath);
        } else {
          await unlink(filePath);
        }
      }
      
      // Remove the directory itself
      await execAsync(`rmdir "${dirPath}"`);
    } catch (error) {
      logger.error(`Failed to delete directory ${dirPath}:`, error);
    }
  }

  public async restoreBackup(backupId: string): Promise<void> {
    const backupDir = join(this.config.storage.local.path, backupId);
    
    try {
      // Verify backup exists and is valid
      const metadataFile = join(backupDir, 'metadata.json');
      const metadataContent = await readFile(metadataFile, 'utf-8');
      const metadata: BackupMetadata = JSON.parse(metadataContent);

      if (metadata.status !== 'success') {
        throw new Error('Cannot restore failed backup');
      }

      logger.info(`Starting restore from backup: ${backupId}`);
      auditLog('restore_started', undefined, 'backup', backupId);

      // Restore PostgreSQL
      if (metadata.databases.includes('postgresql')) {
        await this.restorePostgreSQL(backupDir);
      }

      // Restore MongoDB
      if (metadata.databases.includes('mongodb')) {
        await this.restoreMongoDB(backupDir);
      }

      logger.info(`Restore completed successfully: ${backupId}`);
      auditLog('restore_completed', undefined, 'backup', backupId);

    } catch (error) {
      logger.error(`Restore failed: ${backupId}`, error);
      auditLog('restore_failed', undefined, 'backup', backupId, { error: error.message });
      throw error;
    }
  }

  private async restorePostgreSQL(backupDir: string): Promise<void> {
    const psqlPath = process.env.PSQL_PATH || 'psql';
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured for PostgreSQL restore');
    }

    const backupFile = join(backupDir, 'postgresql.sql');
    const command = `${psqlPath} "${dbUrl}" < "${backupFile}"`;

    try {
      await execAsync(command);
      logger.info('PostgreSQL restore completed');
    } catch (error) {
      logger.error('PostgreSQL restore failed:', error);
      throw new Error(`PostgreSQL restore failed: ${error.message}`);
    }
  }

  private async restoreMongoDB(backupDir: string): Promise<void> {
    const mongoRestorePath = process.env.MONGORESTORE_PATH || 'mongorestore';
    const mongoUrl = process.env.MONGODB_URL;
    
    if (!mongoUrl) {
      throw new Error('MONGODB_URL not configured for MongoDB restore');
    }

    const mongoBackupDir = join(backupDir, 'mongodb');
    const command = `${mongoRestorePath} --uri="${mongoUrl}" --drop "${mongoBackupDir}"`;

    try {
      await execAsync(command);
      logger.info('MongoDB restore completed');
    } catch (error) {
      logger.error('MongoDB restore failed:', error);
      throw new Error(`MongoDB restore failed: ${error.message}`);
    }
  }

  public getBackupHistory(): BackupMetadata[] {
    return [...this.backupHistory];
  }

  public getBackupStatus(): { inProgress: boolean; lastBackup?: BackupMetadata } {
    const lastBackup = this.backupHistory
      .filter(b => b.status === 'success')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    return {
      inProgress: this.isBackupInProgress,
      lastBackup,
    };
  }

  public updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    auditLog('backup_config_updated', undefined, 'backup', undefined, newConfig);
  }
}

export const backupService = new BackupService();