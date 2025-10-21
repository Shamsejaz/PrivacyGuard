import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type { User, CreateUserRequest, UpdateUserRequest, UserSession, UserActivity, Permission } from '../models/User';
import { pgPool } from '../config/database';
import { logger } from '../utils/logger';

export class UserRepository {
  private pool: Pool;

  constructor() {
    this.pool = pgPool;
  }

  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO users (id, email, password_hash, name, role, department, permissions, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        id,
        userData.email.toLowerCase(),
        userData.password_hash,
        userData.name,
        userData.role,
        userData.department || null,
        JSON.stringify(userData.permissions || []),
        now,
        now
      ];
      
      const result = await client.query(query, values);
      const user = this.mapRowToUser(result.rows[0]);
      
      logger.info(`User created: ${user.email}`, { userId: user.id });
      return user;
      
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
      
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email.toLowerCase()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
      
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: UpdateUserRequest & { password_hash?: string }): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (updates.name !== undefined) {
        setClause.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      
      if (updates.role !== undefined) {
        setClause.push(`role = $${paramCount++}`);
        values.push(updates.role);
      }
      
      if (updates.department !== undefined) {
        setClause.push(`department = $${paramCount++}`);
        values.push(updates.department);
      }
      
      if (updates.permissions !== undefined) {
        setClause.push(`permissions = $${paramCount++}`);
        values.push(JSON.stringify(updates.permissions));
      }
      
      if (updates.password_hash !== undefined) {
        setClause.push(`password_hash = $${paramCount++}`);
        values.push(updates.password_hash);
      }
      
      setClause.push(`updated_at = $${paramCount++}`);
      values.push(new Date());
      
      values.push(id);
      
      const query = `
        UPDATE users 
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = this.mapRowToUser(result.rows[0]);
      logger.info(`User updated: ${user.email}`, { userId: user.id });
      return user;
      
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      
      const deleted = (result.rowCount || 0) > 0;
      if (deleted) {
        logger.info(`User deleted`, { userId: id });
      }
      
      return deleted;
      
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = 'UPDATE users SET last_login = $1 WHERE id = $2';
      await client.query(query, [new Date(), id]);
      
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findMany(filters: { role?: string; department?: string; limit?: number; offset?: number }): Promise<User[]> {
    const client = await this.pool.connect();
    
    try {
      let query = 'SELECT * FROM users WHERE 1=1';
      const values: any[] = [];
      let paramCount = 1;
      
      if (filters.role) {
        query += ` AND role = $${paramCount++}`;
        values.push(filters.role);
      }
      
      if (filters.department) {
        query += ` AND department = $${paramCount++}`;
        values.push(filters.department);
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (filters.limit) {
        query += ` LIMIT $${paramCount++}`;
        values.push(filters.limit);
      }
      
      if (filters.offset) {
        query += ` OFFSET $${paramCount++}`;
        values.push(filters.offset);
      }
      
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToUser(row));
      
    } catch (error) {
      logger.error('Error finding users:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Session management
  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<UserSession> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await client.query(query, [id, userId, tokenHash, expiresAt, now]);
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error creating user session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW()';
      const result = await client.query(query, [tokenHash]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error finding session by token hash:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSession(tokenHash: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM user_sessions WHERE token_hash = $1';
      await client.query(query, [tokenHash]);
      
    } catch (error) {
      logger.error('Error deleting session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteExpiredSessions(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM user_sessions WHERE expires_at <= NOW()';
      const result = await client.query(query);
      
      if ((result.rowCount || 0) > 0) {
        logger.info(`Deleted ${result.rowCount || 0} expired sessions`);
      }
      
    } catch (error) {
      logger.error('Error deleting expired sessions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Activity logging
  async logActivity(activity: Omit<UserActivity, 'id' | 'created_at'>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO user_activities (id, user_id, action, resource_type, resource_id, ip_address, user_agent, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      const values = [
        id,
        activity.user_id,
        activity.action,
        activity.resource_type || null,
        activity.resource_id || null,
        activity.ip_address || null,
        activity.user_agent || null,
        activity.details ? JSON.stringify(activity.details) : null,
        now
      ];
      
      await client.query(query, values);
      
    } catch (error) {
      logger.error('Error logging user activity:', error);
      // Don't throw error for activity logging to avoid breaking main operations
    } finally {
      client.release();
    }
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      role: row.role,
      department: row.department,
      permissions: row.permissions ? JSON.parse(row.permissions) : [],
      last_login: row.last_login,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
