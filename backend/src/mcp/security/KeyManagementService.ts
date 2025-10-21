/**
 * MCP Privacy Connectors - Key Management Service
 * Advanced key management with rotation, versioning, and secure storage
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Encryption key metadata
 */
interface KeyMetadata {
  keyId: string;
  version: number;
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  rotationCount: number;
}

/**
 * Key rotation policy
 */
interface KeyRotationPolicy {
  automaticRotation: boolean;
  rotationIntervalDays: number;
  maxKeyAge: number;
  retainOldVersions: number;
  rotationSchedule?: string; // Cron expression
}

/**
 * Key derivation parameters
 */
interface KeyDerivationParams {
  salt: Buffer;
  iterations: number;
  keyLength: number;
  digest: string;
}

/**
 * Advanced key management service with rotation and versioning
 */
export class KeyManagementService extends EventEmitter {
  private keys: Map<string, { key: Buffer; metadata: KeyMetadata }> = new Map();
  private activeKeyId: string | null = null;
  private rotationPolicy: KeyRotationPolicy;
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor(rotationPolicy?: Partial<KeyRotationPolicy>) {
    super();
    
    this.rotationPolicy = {
      automaticRotation: true,
      rotationIntervalDays: 90,
      maxKeyAge: 365,
      retainOldVersions: 3,
      ...rotationPolicy
    };

    this.initializeKeyManagement();
  }

  /**
   * Initialize key management system
   */
  private async initializeKeyManagement(): Promise<void> {
    // Generate initial master key if none exists
    if (this.keys.size === 0) {
      await this.generateNewKey();
    }

    // Setup automatic rotation if enabled
    if (this.rotationPolicy.automaticRotation) {
      this.scheduleKeyRotation();
    }

    console.log('Key management service initialized');
  }

  /**
   * Generate a new encryption key
   */
  async generateNewKey(): Promise<string> {
    const keyId = this.generateKeyId();
    const key = crypto.randomBytes(32); // 256-bit key
    
    const metadata: KeyMetadata = {
      keyId,
      version: this.getNextKeyVersion(),
      algorithm: 'aes-256-gcm',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.rotationPolicy.maxKeyAge * 24 * 60 * 60 * 1000),
      isActive: true,
      rotationCount: 0
    };

    // Deactivate previous active key
    if (this.activeKeyId) {
      const previousKey = this.keys.get(this.activeKeyId);
      if (previousKey) {
        previousKey.metadata.isActive = false;
      }
    }

    // Store new key
    this.keys.set(keyId, { key, metadata });
    this.activeKeyId = keyId;

    // Clean up old keys
    await this.cleanupOldKeys();

    this.emit('keyGenerated', { keyId, version: metadata.version });
    console.log(`New encryption key generated: ${keyId} (version ${metadata.version})`);

    return keyId;
  }

  /**
   * Get the active encryption key
   */
  getActiveKey(): { keyId: string; key: Buffer; metadata: KeyMetadata } | null {
    if (!this.activeKeyId) {
      return null;
    }

    const keyData = this.keys.get(this.activeKeyId);
    if (!keyData) {
      return null;
    }

    return {
      keyId: this.activeKeyId,
      key: keyData.key,
      metadata: keyData.metadata
    };
  }

  /**
   * Get a specific key by ID
   */
  getKey(keyId: string): { key: Buffer; metadata: KeyMetadata } | null {
    return this.keys.get(keyId) || null;
  }

  /**
   * Derive key from master key with salt
   */
  deriveKey(masterKey: Buffer, params: KeyDerivationParams): Buffer {
    return crypto.pbkdf2Sync(
      masterKey,
      params.salt,
      params.iterations,
      params.keyLength,
      params.digest
    );
  }

  /**
   * Create key derivation parameters
   */
  createDerivationParams(keyLength: number = 32): KeyDerivationParams {
    return {
      salt: crypto.randomBytes(32),
      iterations: 100000,
      keyLength,
      digest: 'sha256'
    };
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<string> {
    console.log('Starting key rotation...');
    
    try {
      // Generate new key
      const newKeyId = await this.generateNewKey();
      
      // Update rotation count for old keys
      for (const [keyId, keyData] of this.keys) {
        if (keyId !== newKeyId) {
          keyData.metadata.rotationCount++;
        }
      }

      this.emit('keyRotated', { 
        newKeyId, 
        previousKeyId: this.activeKeyId,
        rotationTime: new Date()
      });

      console.log(`Key rotation completed. New active key: ${newKeyId}`);
      return newKeyId;
    } catch (error) {
      this.emit('keyRotationFailed', { error });
      console.error('Key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic key rotation
   */
  private scheduleKeyRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    const rotationInterval = this.rotationPolicy.rotationIntervalDays * 24 * 60 * 60 * 1000;
    
    this.rotationTimer = setInterval(async () => {
      try {
        await this.rotateKeys();
      } catch (error) {
        console.error('Scheduled key rotation failed:', error);
      }
    }, rotationInterval);

    console.log(`Automatic key rotation scheduled every ${this.rotationPolicy.rotationIntervalDays} days`);
  }

  /**
   * Clean up old keys based on retention policy
   */
  private async cleanupOldKeys(): Promise<void> {
    const sortedKeys = Array.from(this.keys.entries())
      .sort(([, a], [, b]) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime());

    // Keep only the specified number of versions
    const keysToDelete = sortedKeys.slice(this.rotationPolicy.retainOldVersions);
    
    for (const [keyId] of keysToDelete) {
      this.keys.delete(keyId);
      this.emit('keyDeleted', { keyId });
      console.log(`Old key deleted: ${keyId}`);
    }
  }

  /**
   * Check if keys need rotation
   */
  checkKeyRotationNeeded(): boolean {
    const activeKey = this.getActiveKey();
    if (!activeKey) {
      return true;
    }

    const keyAge = Date.now() - activeKey.metadata.createdAt.getTime();
    const rotationThreshold = this.rotationPolicy.rotationIntervalDays * 24 * 60 * 60 * 1000;

    return keyAge >= rotationThreshold;
  }

  /**
   * Get key management statistics
   */
  getKeyStatistics() {
    const keys = Array.from(this.keys.values());
    const now = new Date();

    return {
      totalKeys: keys.length,
      activeKeyId: this.activeKeyId,
      oldestKey: keys.reduce((oldest, current) => 
        !oldest || current.metadata.createdAt < oldest.metadata.createdAt ? current : oldest, null as any)?.metadata.createdAt,
      newestKey: keys.reduce((newest, current) => 
        !newest || current.metadata.createdAt > newest.metadata.createdAt ? current : newest, null as any)?.metadata.createdAt,
      expiredKeys: keys.filter(k => k.metadata.expiresAt < now).length,
      rotationPolicy: this.rotationPolicy,
      nextRotationDue: this.checkKeyRotationNeeded()
    };
  }

  /**
   * Export key metadata (without actual keys)
   */
  exportKeyMetadata(): KeyMetadata[] {
    return Array.from(this.keys.values()).map(k => ({ ...k.metadata }));
  }

  /**
   * Validate key integrity
   */
  async validateKeyIntegrity(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [keyId, keyData] of this.keys) {
      try {
        // Test key by performing a simple encryption/decryption
        const testData = 'key-integrity-test';
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv('aes-256-gcm', keyData.key, iv);
        let encrypted = cipher.update(testData, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyData.key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        results.set(keyId, decrypted === testData);
      } catch (error) {
        results.set(keyId, false);
        console.error(`Key integrity check failed for ${keyId}:`, error);
      }
    }

    return results;
  }

  /**
   * Update rotation policy
   */
  updateRotationPolicy(newPolicy: Partial<KeyRotationPolicy>): void {
    this.rotationPolicy = { ...this.rotationPolicy, ...newPolicy };
    
    // Reschedule rotation if automatic rotation is enabled
    if (this.rotationPolicy.automaticRotation) {
      this.scheduleKeyRotation();
    } else if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }

    this.emit('rotationPolicyUpdated', this.rotationPolicy);
    console.log('Key rotation policy updated:', this.rotationPolicy);
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get next key version number
   */
  private getNextKeyVersion(): number {
    const versions = Array.from(this.keys.values()).map(k => k.metadata.version);
    return versions.length > 0 ? Math.max(...versions) + 1 : 1;
  }

  /**
   * Shutdown key management service
   */
  async shutdown(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }

    // Clear keys from memory
    this.keys.clear();
    this.activeKeyId = null;

    console.log('Key management service shutdown complete');
  }
}