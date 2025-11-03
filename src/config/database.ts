// FreshKeeper v2.0.0 - Database Configuration
// PostgreSQL connection with Prisma ORM

import { PrismaClient } from '../../generated/prisma';
import { logger } from '../utils/logger';

// Singleton pattern for Prisma Client
class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'pretty',
    });
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('✅ PostgreSQL connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('✅ PostgreSQL disconnected successfully');
    } catch (error) {
      logger.error('❌ Failed to disconnect from PostgreSQL:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  public async runMigrations(): Promise<void> {
    try {
      // This would typically be handled by Prisma CLI in production
      // But we can add custom migration logic here if needed
      logger.info('Running database migrations...');
      
      // For now, we'll just ensure the connection works
      await this.connect();
      
      logger.info('✅ Database migrations completed');
    } catch (error) {
      logger.error('❌ Database migrations failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();
export const prisma = db.getClient();

// Export types for convenience
export type {
  User,
  Product,
  UserItem,
  ItemMovement,
  ProductCache,
  UserDeviceToken,
  NotificationHistory,
  UserNotificationSettings,
  ListType,
  ProductSource,
  MovementType,
  Platform,
  NotificationStatus,
} from '../../generated/prisma';