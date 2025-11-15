import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';

// Types from Prisma
type UserDeviceToken = {
  id: string;
  userId: string;
  deviceId: string;
  fcmToken: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string | null;
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
};

type NotificationHistory = {
  id: string;
  userId: string;
  deviceTokenId: string | null;
  notificationType: string;
  title: string;
  body: string;
  data: any;
  sentAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  clickedAt: Date | null;
  status: 'sent' | 'delivered' | 'failed' | 'read' | 'clicked';
};

// Firebase Admin SDK
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try environment variables first (for Railway/production)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (projectId && clientEmail && privateKey) {
      // Use environment variables (Railway/production)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      console.log('🔥 Firebase Admin SDK initialized with environment variables');
    } else {
      // Fallback to JSON file (local development)
      try {
        const serviceAccount = require('../../config/firebase-service-account.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });
        console.log('🔥 Firebase Admin SDK initialized with JSON file (local)');
      } catch (fileError) {
        throw new Error('Firebase configuration missing. Set environment variables or add JSON file.');
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase configuration failed');
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface NotificationOptions {
  sound?: string;
  badge?: number;
  priority?: 'high' | 'normal';
  ttl?: number;
}

export class NotificationService {
  private prisma: PrismaClient;
  private isInitialized: boolean = false;
  private mockDeviceTokens: Map<string, UserDeviceToken[]> = new Map();
  private mockNotificationHistory: NotificationHistory[] = [];

  constructor() {
    this.prisma = prisma;
  }

  private async initialize(): Promise<void> {
    // Mock: No inicialización de Firebase necesaria
    return;
  }

  // Register device token
  async registerDeviceToken(
    userId: string,
    deviceId: string,
    fcmToken: string,
    platform: 'ios' | 'android',
    appVersion?: string
  ): Promise<void> {
    try {
      // Mock implementation to avoid database errors
      const platformLower = platform.toLowerCase() as 'ios' | 'android';

    if (!['ios', 'android'].includes(platformLower)) {
        throw new Error('Plataforma no válida. Debe ser IOS o ANDROID.');
      }

      // Mock de la base de datos para los tokens de dispositivo
      if (!this.mockDeviceTokens.has(userId)) {
        this.mockDeviceTokens.set(userId, []);
      }

      const userTokens = this.mockDeviceTokens.get(userId)!;
      const existingTokenIndex = userTokens.findIndex(token => token.deviceId === deviceId);

      if (existingTokenIndex > -1) {
        const oldToken = userTokens[existingTokenIndex];
        if (oldToken) {
          userTokens[existingTokenIndex] = {
            id: oldToken.id,
            userId: oldToken.userId,
            deviceId: oldToken.deviceId,
            createdAt: oldToken.createdAt,
            fcmToken: fcmToken,
            platform: platformLower,
            appVersion: appVersion || oldToken.appVersion,
            isActive: true,
            lastUsed: new Date(),
            updatedAt: new Date(),
          };
          console.log(`Token de dispositivo actualizado para el usuario ${userId}`);
        }
      } else {
        // Añadir nuevo token, asegurando que todas las propiedades requeridas estén presentes
        const newDeviceToken: UserDeviceToken = {
          id: `mock-token-${Date.now()}`,
          userId,
          deviceId,
          fcmToken,
          platform: platformLower,
          appVersion: appVersion || '1.0.0',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsed: new Date(),
        };
        userTokens.push(newDeviceToken);
        console.log(`Nuevo token de dispositivo registrado para el usuario ${userId}`);
      }
    } catch (error: any) {
      console.error('Error registering device token:', error);
      throw new Error('Failed to register device token');
    }
  }

  // Unregister device token
  async unregisterDeviceToken(userId: string, deviceId: string): Promise<void> {
    try {
      await this.prisma.userDeviceToken.updateMany({
        where: {
          userId,
          deviceId,
        },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      console.error('Error unregistering device token:', error);
      throw new Error('Failed to unregister device token');
    }
  }

  // Get active device tokens for user
  async getUserDeviceTokens(userId: string): Promise<UserDeviceToken[]> {
    try {
      return await this.prisma.userDeviceToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });
    } catch (error) {
      console.error('Error getting user device tokens:', error);
      return [];
    }
  }

  // Send notification to specific user
  async sendNotificationToUser(
    userId: string,
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<boolean> {
    try {
      const deviceTokens = await this.getUserDeviceTokens(userId);
      
      if (deviceTokens.length === 0) {
        console.log(`No active device tokens found for user ${userId}`);
        return false;
      }

      const tokens = deviceTokens.map(dt => dt.fcmToken);
      return await this.sendNotificationToTokens(tokens, payload, options, userId);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  // Send notification to multiple tokens
  async sendNotificationToTokens(
    tokens: string[],
    payload: NotificationPayload,
    options?: NotificationOptions,
    userId?: string
  ): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
       const message: any = {
         tokens,
         notification: {
           title: payload.title,
           body: payload.body,
           ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
         },
         data: payload.data || {},
         android: {
           notification: {
             ...(options?.sound && { sound: options.sound }),
             priority: options?.priority === 'high' ? 'high' : 'default',
           },
           ttl: options?.ttl || 3600000, // 1 hour default
         },
         apns: {
           payload: {
             aps: {
               ...(options?.sound && { sound: options.sound }),
               ...(options?.badge !== undefined && { badge: options.badge }),
               'content-available': 1,
             },
           },
         },
       };

       const response = await admin.messaging().sendEachForMulticast(message);

      // Log notification history
       if (userId) {
         await this.logNotificationHistory(
           userId,
           payload,
           response.successCount > 0 ? 'sent' : 'failed'
         );
       }

       return response.successCount > 0;
     } catch (error) {
       console.error('Error sending notification:', error);
       
       if (userId) {
         await this.logNotificationHistory(userId, payload, 'failed');
       }
       
       return false;
     }
  }

  // Send expiry notification
  async sendExpiryNotification(
    userId: string,
    expiringItems: Array<{ name: string; daysUntilExpiry: number }>
  ): Promise<boolean> {
    const itemCount = expiringItems.length;
    const title = itemCount === 1 
      ? 'Producto próximo a vencer'
      : `${itemCount} productos próximos a vencer`;
    
    const body = itemCount === 1 && expiringItems[0]
      ? `${expiringItems[0].name} vence en ${expiringItems[0].daysUntilExpiry} días`
      : `Tienes ${itemCount} productos que vencen pronto`;

    return await this.sendNotificationToUser(userId, {
      title,
      body,
      data: {
        type: 'expiry',
        itemCount: itemCount.toString(),
      },
    });
  }

  // Send shopping reminder
  async sendShoppingReminder(
    userId: string,
    shoppingListCount: number
  ): Promise<boolean> {
    const title = 'Recordatorio de compras';
    const body = shoppingListCount === 1
      ? 'Tienes 1 producto en tu lista de compras'
      : `Tienes ${shoppingListCount} productos en tu lista de compras`;

    return await this.sendNotificationToUser(userId, {
      title,
      body,
      data: {
        type: 'shopping_reminder',
        itemCount: shoppingListCount.toString(),
      },
    });
  }

  // Send weekly summary
  async sendWeeklySummary(
    userId: string,
    stats: {
      itemsConsumed: number;
      itemsExpired: number;
      moneySaved: number;
    }
  ): Promise<boolean> {
    const title = 'Resumen semanal';
    const body = `Esta semana consumiste ${stats.itemsConsumed} productos y ahorraste $${stats.moneySaved.toFixed(2)}`;

    return await this.sendNotificationToUser(userId, {
      title,
      body,
      data: {
        type: 'weekly_summary',
        itemsConsumed: stats.itemsConsumed.toString(),
        itemsExpired: stats.itemsExpired.toString(),
        moneySaved: stats.moneySaved.toString(),
      },
    });
  }

  // Log notification history
  private async logNotificationHistory(
    userId: string,
    payload: NotificationPayload,
    status: 'sent' | 'delivered' | 'failed' | 'read' | 'clicked',
    deviceTokenId?: string
  ): Promise<void> {
    try {
      await this.prisma.notificationHistory.create({
        data: {
          userId,
          ...(deviceTokenId && { deviceTokenId }),
          notificationType: payload.data?.type || 'general',
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          status,
        },
      });
    } catch (error) {
      console.error('Error logging notification history:', error);
    }
  }

  // Get notification history for user
  async getNotificationHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationHistory[]> {
    try {
      return await this.prisma.notificationHistory.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await this.prisma.notificationHistory.update({
        where: { id: notificationId },
        data: {
          readAt: new Date(),
          status: 'read',
        },
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await this.prisma.notificationHistory.deleteMany({
        where: {
          sentAt: {
            lt: cutoffDate,
          },
        },
      });
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }
}

export default NotificationService;