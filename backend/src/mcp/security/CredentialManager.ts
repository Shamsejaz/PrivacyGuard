/**
 * MCP Privacy Connectors - Credential Manager
 * Secure credential storage and management using AES-256 encryption
 */

import crypto from 'crypto';
import { ConnectorCredentials, ConnectorType } from '../types/index.js';

/**
 * Encrypted credential storage format
 */
interface EncryptedCredentials {
  id: string;
  connectorType: ConnectorType;
  encryptedData: string;
  iv: string;
  salt: string;
  keyVersion: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Key rotation configuration
 */
interface KeyRotationConfig {
  rotationIntervalDays: number;
  maxKeyAge: number;
  keyVersions: number;
}

/**
 * Credential validation result
 */
interface CredentialValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Secure credential manager with AES-256 encryption and key rotation
 */
export class CredentialManager {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits
  private readonly tagLength = 16; // 128 bits

  private masterKey: Buffer;
  private keyRotationConfig: KeyRotationConfig;
  private credentialStore: Map<string, EncryptedCredentials> = new Map();

  constructor(masterKey?: string, keyRotationConfig?: Partial<KeyRotationConfig>) {
    // Initialize master key
    this.masterKey = masterKey 
      ? Buffer.from(masterKey, 'hex')
      : this.generateMasterKey();

    // Initialize key rotation configuration
    this.keyRotationConfig = {
      rotationIntervalDays: 90,
      maxKeyAge: 365,
      keyVersions: 5,
      ...keyRotationConfig
    };

    console.log('Credential manager initialized with AES-256 encryption');
  }

  /**
   * Store encrypted credentials
   */
  async storeCredentials(credentials: ConnectorCredentials): Promise<string> {
    try {
      // Validate credentials before storing
      const validation = this.validateCredentials(credentials);
      if (!validation.isValid) {
        throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
      }

      // Generate encryption components
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const derivedKey = this.deriveKey(this.masterKey, salt);

      // Prepare credential data for encryption
      const credentialData = {
        apiKey: credentials.apiKey,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        endpoint: credentials.endpoint,
        additionalConfig: credentials.additionalConfig
      };

      // Encrypt credentials
      const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);
      cipher.setAAD(Buffer.from(credentials.id)); // Additional authenticated data

      const credentialJson = JSON.stringify(credentialData);
      let encrypted = cipher.update(credentialJson, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      const encryptedData = encrypted + ':' + authTag.toString('hex');

      // Create encrypted credential record
      const encryptedCredentials: EncryptedCredentials = {
        id: credentials.id,
        connectorType: credentials.connectorType,
        encryptedData,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        keyVersion: 1, // Current key version
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: credentials.expiresAt
      };

      // Store in memory (in production, this would be stored in a secure database)
      this.credentialStore.set(credentials.id, encryptedCredentials);

      console.log(`Credentials stored securely for connector ${credentials.id}`);
      return credentials.id;
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw new Error(`Credential storage failed: ${error}`);
    }
  }

  /**
   * Retrieve and decrypt credentials
   */
  async retrieveCredentials(credentialId: string): Promise<ConnectorCredentials | null> {
    try {
      const encryptedCredentials = this.credentialStore.get(credentialId);
      if (!encryptedCredentials) {
        return null;
      }

      // Check if credentials are expired
      if (encryptedCredentials.expiresAt && encryptedCredentials.expiresAt < new Date()) {
        console.warn(`Credentials ${credentialId} have expired`);
        return null;
      }

      // Derive decryption key
      const salt = Buffer.from(encryptedCredentials.salt, 'hex');
      const iv = Buffer.from(encryptedCredentials.iv, 'hex');
      const derivedKey = this.deriveKey(this.masterKey, salt);

      // Split encrypted data and auth tag
      const [encryptedData, authTagHex] = encryptedCredentials.encryptedData.split(':');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Decrypt credentials
      const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv);
      decipher.setAAD(Buffer.from(credentialId)); // Additional authenticated data
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const credentialData = JSON.parse(decrypted);

      // Reconstruct credentials object
      const credentials: ConnectorCredentials = {
        id: credentialId,
        connectorType: encryptedCredentials.connectorType,
        ...credentialData,
        createdAt: encryptedCredentials.createdAt,
        updatedAt: encryptedCredentials.updatedAt,
        expiresAt: encryptedCredentials.expiresAt
      };

      return credentials;
    } catch (error) {
      console.error(`Failed to retrieve credentials ${credentialId}:`, error);
      throw new Error(`Credential retrieval failed: ${error}`);
    }
  }

  /**
   * Update existing credentials
   */
  async updateCredentials(credentialId: string, updates: Partial<ConnectorCredentials>): Promise<void> {
    const existingCredentials = await this.retrieveCredentials(credentialId);
    if (!existingCredentials) {
      throw new Error(`Credentials ${credentialId} not found`);
    }

    const updatedCredentials: ConnectorCredentials = {
      ...existingCredentials,
      ...updates,
      id: credentialId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    await this.storeCredentials(updatedCredentials);
    console.log(`Credentials ${credentialId} updated successfully`);
  }

  /**
   * Delete credentials
   */
  async deleteCredentials(credentialId: string): Promise<void> {
    const deleted = this.credentialStore.delete(credentialId);
    if (!deleted) {
      throw new Error(`Credentials ${credentialId} not found`);
    }

    console.log(`Credentials ${credentialId} deleted successfully`);
  }

  /**
   * List all stored credential IDs (without decrypting)
   */
  listCredentials(): Array<{
    id: string;
    connectorType: ConnectorType;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    isExpired: boolean;
  }> {
    const credentials: Array<{
      id: string;
      connectorType: ConnectorType;
      createdAt: Date;
      updatedAt: Date;
      expiresAt: Date | undefined;
      isExpired: boolean;
    }> = [];
    const now = new Date();

    for (const [id, encryptedCreds] of this.credentialStore) {
      credentials.push({
        id,
        connectorType: encryptedCreds.connectorType,
        createdAt: encryptedCreds.createdAt,
        updatedAt: encryptedCreds.updatedAt,
        expiresAt: encryptedCreds.expiresAt,
        isExpired: encryptedCreds.expiresAt ? encryptedCreds.expiresAt < now : false
      });
    }

    return credentials;
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    console.log('Starting key rotation process...');
    
    const newMasterKey = this.generateMasterKey();
    const oldMasterKey = this.masterKey;
    const oldCredentials = Array.from(this.credentialStore.values());
    const decryptedCredentials: ConnectorCredentials[] = [];

    try {
      // First, decrypt all credentials with the old key
      for (const encryptedCreds of oldCredentials) {
        const credentials = await this.retrieveCredentials(encryptedCreds.id);
        if (credentials) {
          decryptedCredentials.push(credentials);
        }
      }

      // Update master key
      this.masterKey = newMasterKey;

      // Re-encrypt all credentials with new key
      for (const credentials of decryptedCredentials) {
        await this.storeCredentials({
          ...credentials,
          updatedAt: new Date()
        });
      }

      console.log(`Key rotation completed for ${decryptedCredentials.length} credential sets`);
    } catch (error) {
      console.error(`Key rotation failed:`, error);
      // Restore old key on failure
      this.masterKey = oldMasterKey;
      throw error;
    }
  }

  /**
   * Validate credentials format and content
   */
  private validateCredentials(credentials: ConnectorCredentials): CredentialValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!credentials.id) {
      errors.push('Credential ID is required');
    }

    if (!credentials.connectorType) {
      errors.push('Connector type is required');
    }

    // At least one authentication method should be provided
    const hasAuth = credentials.apiKey || 
                   credentials.accessToken || 
                   (credentials.clientId && credentials.clientSecret);
    
    if (!hasAuth) {
      errors.push('At least one authentication method must be provided');
    }

    // Validate API key format if provided
    if (credentials.apiKey && credentials.apiKey.length < 10) {
      warnings.push('API key appears to be too short');
    }

    // Validate endpoint URL if provided
    if (credentials.endpoint) {
      try {
        new URL(credentials.endpoint);
      } catch {
        errors.push('Invalid endpoint URL format');
      }
    }

    // Check expiration
    if (credentials.expiresAt && credentials.expiresAt < new Date()) {
      warnings.push('Credentials are already expired');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate a new master key
   */
  private generateMasterKey(): Buffer {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Derive encryption key from master key and salt
   */
  private deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Get credential manager statistics
   */
  getStatistics() {
    const credentials = this.listCredentials();
    const now = new Date();
    
    const stats = {
      totalCredentials: credentials.length,
      expiredCredentials: credentials.filter(c => c.isExpired).length,
      credentialsByType: {} as Record<ConnectorType, number>,
      oldestCredential: credentials.reduce((oldest, current) => 
        !oldest || current.createdAt < oldest.createdAt ? current : oldest, null as any)?.createdAt,
      newestCredential: credentials.reduce((newest, current) => 
        !newest || current.createdAt > newest.createdAt ? current : newest, null as any)?.createdAt,
      keyRotationConfig: this.keyRotationConfig
    };

    // Count by connector type
    for (const cred of credentials) {
      stats.credentialsByType[cred.connectorType] = 
        (stats.credentialsByType[cred.connectorType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Test credential decryption (for health checks)
   */
  async testCredentialAccess(credentialId: string): Promise<boolean> {
    try {
      const credentials = await this.retrieveCredentials(credentialId);
      return credentials !== null;
    } catch (error) {
      console.error(`Credential access test failed for ${credentialId}:`, error);
      return false;
    }
  }
}