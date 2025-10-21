import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { DEFAULT_PERMISSIONS } from '../config/permissions';
import { logger } from '../utils/logger';
import { initializeDatabases, closeDatabaseConnections } from '../config/database';

async function seedUsers() {
  try {
    logger.info('🌱 Starting user seeding...');
    
    // Initialize database connections
    await initializeDatabases();
    
    const userRepository = new UserRepository();
    
    // Check if admin user already exists
    const existingAdmin = await userRepository.findByEmail('admin@privacyguard.com');
    
    if (existingAdmin) {
      logger.info('Admin user already exists, skipping seed');
      return;
    }
    
    // Create admin user
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const password_hash = await bcrypt.hash('Admin123!@#', saltRounds);
    
    const adminUser = await userRepository.create({
      email: 'admin@privacyguard.com',
      password: 'Admin123!@#', // This won't be used since we're passing password_hash
      password_hash,
      name: 'System Administrator',
      role: 'admin',
      department: 'IT Security',
      permissions: DEFAULT_PERMISSIONS.admin
    });
    
    logger.info(`✅ Admin user created: ${adminUser.email}`);
    
    // Create DPO user
    const dpoPasswordHash = await bcrypt.hash('DPO123!@#', saltRounds);
    
    const dpoUser = await userRepository.create({
      email: 'dpo@privacyguard.com',
      password: 'DPO123!@#', // This won't be used since we're passing password_hash
      password_hash: dpoPasswordHash,
      name: 'Data Protection Officer',
      role: 'dpo',
      department: 'Legal & Compliance',
      permissions: DEFAULT_PERMISSIONS.dpo
    });
    
    logger.info(`✅ DPO user created: ${dpoUser.email}`);
    
    // Create compliance user
    const compliancePasswordHash = await bcrypt.hash('Compliance123!@#', saltRounds);
    
    const complianceUser = await userRepository.create({
      email: 'compliance@privacyguard.com',
      password: 'Compliance123!@#', // This won't be used since we're passing password_hash
      password_hash: compliancePasswordHash,
      name: 'Compliance Manager',
      role: 'compliance',
      department: 'Legal & Compliance',
      permissions: DEFAULT_PERMISSIONS.compliance
    });
    
    logger.info(`✅ Compliance user created: ${complianceUser.email}`);
    
    logger.info('🎉 User seeding completed successfully!');
    
    // Log the credentials for development
    if (process.env.NODE_ENV === 'development') {
      logger.info('📋 Development Credentials:');
      logger.info('  Admin: admin@privacyguard.com / Admin123!@#');
      logger.info('  DPO: dpo@privacyguard.com / DPO123!@#');
      logger.info('  Compliance: compliance@privacyguard.com / Compliance123!@#');
    }
    
  } catch (error) {
    logger.error('💥 Error seeding users:', error);
    throw error;
  } finally {
    await closeDatabaseConnections();
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsers()
    .then(() => {
      logger.info('User seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('User seeding script failed:', error);
      process.exit(1);
    });
}

export { seedUsers };
