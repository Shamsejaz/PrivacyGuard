import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: number;
  name: string;
  filename: string;
  sql: string;
}

interface MigrationRecord {
  id: number;
  name: string;
  executed_at: Date;
}

export class DatabaseMigrator {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.migrationsPath = join(__dirname, 'migrations');
  }

  // Initialize migrations table
  private async initializeMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await this.pool.query(createTableSQL);
  }

  // Get all migration files
  private getMigrationFiles(): Migration[] {
    const files = readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        throw new Error(`Invalid migration filename: ${filename}`);
      }

      const [, idStr, name] = match;
      const id = parseInt(idStr, 10);
      const sql = readFileSync(join(this.migrationsPath, filename), 'utf-8');

      return {
        id,
        name,
        filename,
        sql
      };
    });
  }

  // Get executed migrations from database
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const result = await this.pool.query(
      'SELECT id, name, executed_at FROM schema_migrations ORDER BY id'
    );
    return result.rows;
  }

  // Execute a single migration
  private async executeMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      await client.query(migration.sql);
      
      // Record migration in schema_migrations table
      await client.query(
        'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${migration.id}_${migration.name} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${migration.id}_${migration.name} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Run pending migrations
  async migrate(): Promise<void> {
    try {
      console.log('🚀 Starting database migrations...');
      
      await this.initializeMigrationsTable();
      
      const allMigrations = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      const executedIds = new Set(executedMigrations.map(m => m.id));
      
      const pendingMigrations = allMigrations.filter(m => !executedIds.has(m.id));
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('🎉 All migrations completed successfully');
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  }

  // Rollback last migration (basic implementation)
  async rollback(): Promise<void> {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      const lastMigration = executedMigrations[executedMigrations.length - 1];
      
      // For now, just remove from schema_migrations table
      // In a production system, you'd want proper rollback scripts
      await this.pool.query(
        'DELETE FROM schema_migrations WHERE id = $1',
        [lastMigration.id]
      );
      
      console.log(`⏪ Rolled back migration ${lastMigration.id}_${lastMigration.name}`);
      console.log('⚠️  Note: This only removes the migration record. Manual cleanup may be required.');
    } catch (error) {
      console.error('💥 Rollback failed:', error);
      throw error;
    }
  }

  // Get migration status
  async status(): Promise<void> {
    try {
      await this.initializeMigrationsTable();
      
      const allMigrations = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      const executedIds = new Set(executedMigrations.map(m => m.id));
      
      console.log('\n📊 Migration Status:');
      console.log('==================');
      
      for (const migration of allMigrations) {
        const status = executedIds.has(migration.id) ? '✅ Executed' : '⏳ Pending';
        const executedAt = executedMigrations.find(m => m.id === migration.id)?.executed_at;
        const timestamp = executedAt ? ` (${executedAt.toISOString()})` : '';
        
        console.log(`${status} ${migration.id}_${migration.name}${timestamp}`);
      }
      
      console.log('==================\n');
    } catch (error) {
      console.error('💥 Status check failed:', error);
      throw error;
    }
  }
}
