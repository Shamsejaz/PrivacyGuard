#!/usr/bin/env tsx

import { initializePostgreSQL } from '../config/database.js';
import { DatabaseMigrator } from './migrator.js';

async function runMigrations() {
  try {
    console.log('🔧 Initializing database connection...');
    const pool = await initializePostgreSQL();
    
    const migrator = new DatabaseMigrator(pool);
    
    const command = process.argv[2];
    
    switch (command) {
      case 'up':
      case undefined:
        await migrator.migrate();
        break;
      case 'down':
        await migrator.rollback();
        break;
      case 'status':
        await migrator.status();
        break;
      default:
        console.log('Usage: npm run migrate [up|down|status]');
        console.log('  up (default): Run pending migrations');
        console.log('  down: Rollback last migration');
        console.log('  status: Show migration status');
        process.exit(1);
    }
    
    await pool.end();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  }
}

runMigrations();
