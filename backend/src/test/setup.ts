import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});

// Test database helpers
export async function getTestDatabase(): Promise<Pool> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'privacyguard_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  // Test connection
  await pool.query('SELECT NOW()');
  return pool;
}

export async function cleanupTestDatabase(db: Pool): Promise<void> {
  await db.end();
}

export async function createTestUser(db: Pool) {
  const hashedPassword = await bcrypt.hash('testpassword', 10);
  
  const result = await db.query(
    `INSERT INTO users (email, password_hash, name, role, permissions) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [
      'test@example.com',
      hashedPassword,
      'Test User',
      'admin',
      JSON.stringify(['*'])
    ]
  );

  return result.rows[0];
}

export function getAuthToken(user: any): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured for tests');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}
