// FreshKeeper v2.0.0 - User Service
// Modern user management with PostgreSQL and Prisma

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type {
  User,
  UserWithStats,
  ApiResponse,
  PaginatedResponse,
} from '../types/database';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(userData: {
    email: string;
    password: string;
    name: string;
    language?: string;
    timezone?: string;
  }): Promise<ApiResponse<User>> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'El usuario ya existe',
        };
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          passwordHash,
          name: userData.name,
          language: userData.language || 'es',
          timezone: userData.timezone || 'UTC',
          preferences: {},
        },
      });

      // Create default notification settings
      await prisma.userNotificationSettings.create({
        data: {
          userId: user.id,
        },
      });

      logger.info(`New user created: ${user.email}`);

      return {
        success: true,
        data: user,
        message: 'Usuario creado exitosamente',
      };
    } catch (error) {
      logger.error('Error creating user:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Authenticate user and return JWT token
   */
  static async authenticateUser(
    email: string,
    password: string
  ): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    try {
      // Find user with password
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        return {
          success: false,
          error: 'Credenciales inválidas',
        };
      }

      // If the account has no password (Google-only), block password login
      if (!user.passwordHash) {
        return {
          success: false,
          error: 'La cuenta no tiene contraseña. Inicia con Google o configura una contraseña.',
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Credenciales inválidas',
        };
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Generate tokens
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Remove password from response
      const { passwordHash, ...userWithoutPassword } = user;

      logger.info(`User authenticated: ${user.email}`);

      return {
        success: true,
        data: {
          user: userWithoutPassword as User,
          token,
          refreshToken,
        },
        message: 'Autenticación exitosa',
      };
    } catch (error) {
      logger.error('Error authenticating user:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Find user by Google ID
   */
  static async findByGoogleId(googleId: string): Promise<any> {
    try {
      return await prisma.user.findUnique({
        where: { googleId },
      });
    } catch (error) {
      logger.error('Error finding user by Google ID:', error);
      throw new Error('Error interno del servidor');
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<any> {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw new Error('Error interno del servidor');
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<any> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw new Error('Error interno del servidor');
    }
  }



  /**
   * Create user with Google OAuth
   */
  static async createUserWithGoogle(userData: {
    email: string;
    name: string;
    googleId: string;
    avatar?: string;
    language?: string;
    timezone?: string;
  }): Promise<any> {
    try {
      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          name: userData.name,
          googleId: userData.googleId,
          avatarUrl: userData.avatar ?? null,
          passwordHash: null, // No password for Google users
          language: userData.language || 'es',
          timezone: userData.timezone || 'UTC',
          emailVerified: true,
          preferences: {},
        },
      });

      // Create default notification settings
      await prisma.userNotificationSettings.create({
        data: {
          userId: user.id,
        },
      });

      logger.info(`New Google user created: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error creating Google user:', error);
      throw new Error('Error interno del servidor');
    }
  }

  /**
   * Get user by ID with stats
   */
  static async getUserById(userId: string): Promise<ApiResponse<UserWithStats>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userItems: {
            where: { isConsumed: false },
            include: { product: true },
          },
          itemMovements: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { product: true },
          },
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado',
        };
      }

      // Calculate stats
      const totalItems = user.userItems.length;
      const expiringItems = user.userItems.filter((item: any) => {
        if (!item.expiryDate) return false;
        const daysUntilExpiry = Math.ceil(
          (item.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
      }).length;

      const { passwordHash, userItems, itemMovements, ...userWithoutSensitiveData } = user;

      const userWithStats: UserWithStats = {
        ...userWithoutSensitiveData,
        totalItems,
        expiringItems,
        recentActivity: itemMovements,
      };

      return {
        success: true,
        data: userWithStats,
      };
    } catch (error) {
      logger.error('Error getting user:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(
    userId: string,
    updateData: {
      name?: string;
      language?: string;
      timezone?: string;
      preferences?: any;
      avatarUrl?: string;
      googleId?: string;
      emailVerified?: boolean;
      passwordHash?: string | null;
    }
  ): Promise<ApiResponse<User>> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      const { passwordHash, ...userWithoutPassword } = user;

      logger.info(`User updated: ${user.email}`);

      return {
        success: true,
        data: userWithoutPassword as User,
        message: 'Perfil actualizado exitosamente',
      };
    } catch (error) {
      logger.error('Error updating user:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<void>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado',
        };
      }

      // Block update if no password is configured (Google-only account)
      if (!user.passwordHash) {
        return {
          success: false,
          error: 'La cuenta no tiene contraseña configurada',
        };
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Contraseña actual incorrecta',
        };
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      logger.info(`Password updated for user: ${user.email}`);

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente',
      };
    } catch (error) {
      logger.error('Error updating password:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string): Promise<ApiResponse<void>> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info(`User deleted: ${userId}`);

      return {
        success: true,
        message: 'Cuenta eliminada exitosamente',
      };
    } catch (error) {
      logger.error('Error deleting user:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get user notification settings
   */
  static async getNotificationSettings(userId: string) {
    try {
      const settings = await prisma.userNotificationSettings.findUnique({
        where: { userId },
      });

      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      logger.error('Error getting notification settings:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Update user notification settings
   */
  static async updateNotificationSettings(
    userId: string,
    settings: Partial<Omit<any, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) {
    try {
      const updatedSettings = await prisma.userNotificationSettings.upsert({
        where: { userId },
        update: settings,
        create: {
          userId,
          ...settings,
        },
      });

      return {
        success: true,
        data: updatedSettings,
      };
    } catch (error) {
      logger.error('Error updating notification settings:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }
}