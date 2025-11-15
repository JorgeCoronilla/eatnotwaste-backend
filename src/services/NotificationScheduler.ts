import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();

export class NotificationScheduler {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Configurar todos los trabajos programados
   */
  setupScheduledJobs() {
    console.log('🔔 Setting up notification scheduled jobs...');

    // Verificar productos próximos a vencer (diario a las 9:00 AM)
    cron.schedule('0 9 * * *', async () => {
      console.log('🕘 Running daily expiry check...');
      await this.checkExpiringProducts();
    });

    // Verificar productos críticos (cada 6 horas)
    cron.schedule('0 */6 * * *', async () => {
      console.log('🚨 Running critical expiry check...');
      await this.checkCriticalExpiringProducts();
    });

    // Recordatorio lista de compras (lunes a las 10:00 AM)
    cron.schedule('0 10 * * 1', async () => {
      console.log('🛒 Running weekly shopping reminder...');
      await this.sendShoppingReminders();
    });

    // Limpieza de notificaciones antiguas (domingos a las 2:00 AM)
    cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Cleaning up old notifications...');
      await this.notificationService.cleanupOldNotifications(30);
    });

    console.log('✅ Notification scheduled jobs configured');
  }

  /**
   * Verificar productos próximos a vencer (1-7 días)
   */
  async checkExpiringProducts(): Promise<void> {
    try {
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      // Obtener usuarios con notificaciones habilitadas
      const usersWithNotifications = await prisma.userNotificationSettings.findMany({
        where: {
          expiryAlerts: true,
        },
        include: {
          user: true,
        },
      });

      for (const userSettings of usersWithNotifications) {
        const userId = userSettings.userId;

        // Obtener productos del usuario próximos a vencer
        const expiringItems = await prisma.userProductLocation.findMany({
          where: {
            userProduct: {
              userId: userId,
            },
            expiryDate: {
              gte: today,
              lte: sevenDaysFromNow,
            },
            isConsumed: false,
          },
          include: {
            userProduct: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            expiryDate: 'asc',
          },
        });

        if (expiringItems.length > 0) {
          // Agrupar por días hasta vencimiento
          const itemsByDays = this.groupItemsByDaysUntilExpiry(expiringItems);
          
          // Enviar notificación
          const expiringData = expiringItems.map(item => ({
            name: item.userProduct.product.name,
            daysUntilExpiry: this.calculateDaysUntilExpiry(item.expiryDate!),
          }));

          await this.notificationService.sendExpiryNotification(userId, expiringData);
          
          console.log(`📤 Sent expiry notification to user ${userId} for ${expiringItems.length} items`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking expiring products:', error);
    }
  }

  /**
   * Verificar productos críticos (vencen hoy o mañana)
   */
  async checkCriticalExpiringProducts(): Promise<void> {
    try {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const usersWithNotifications = await prisma.userNotificationSettings.findMany({
        where: {
          expiryAlerts: true,
        },
      });

      for (const userSettings of usersWithNotifications) {
        const userId = userSettings.userId;

        const criticalItems = await prisma.userProductLocation.findMany({
          where: {
            userProduct: {
              userId: userId,
            },
            expiryDate: {
              gte: today,
              lte: tomorrow,
            },
            isConsumed: false,
          },
          include: {
            userProduct: {
              include: {
                product: true,
              },
            },
          },
        });

        if (criticalItems.length > 0) {
          const criticalData = criticalItems.map(item => ({
            name: item.userProduct.product.name,
            daysUntilExpiry: this.calculateDaysUntilExpiry(item.expiryDate!),
          }));

          // Enviar notificación urgente
          await this.notificationService.sendNotificationToUser(userId, {
            title: '🚨 Productos críticos',
            body: `${criticalItems.length} producto(s) vencen muy pronto`,
            data: {
              type: 'critical_expiry',
              itemCount: criticalItems.length.toString(),
            },
          });

          console.log(`🚨 Sent critical expiry notification to user ${userId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking critical expiring products:', error);
    }
  }

  /**
   * Enviar recordatorios de lista de compras
   */
  async sendShoppingReminders(): Promise<void> {
    try {
      const usersWithNotifications = await prisma.userNotificationSettings.findMany({
        where: {
          shoppingReminders: true,
        },
      });

      for (const userSettings of usersWithNotifications) {
        const userId = userSettings.userId;

        const shoppingItems = await prisma.userProductLocation.count({
          where: {
            userProduct: {
              userId: userId,
            },
            listType: 'shopping',
            isConsumed: false,
          },
        });

        if (shoppingItems > 0) {
          await this.notificationService.sendShoppingReminder(userId, shoppingItems);
          console.log(`🛒 Sent shopping reminder to user ${userId} for ${shoppingItems} items`);
        }
      }
    } catch (error) {
      console.error('❌ Error sending shopping reminders:', error);
    }
  }

  /**
   * Calcular días hasta vencimiento
   */
  private calculateDaysUntilExpiry(expiryDate: Date): number {
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Agrupar items por días hasta vencimiento
   */
  private groupItemsByDaysUntilExpiry(items: any[]): Record<number, any[]> {
    return items.reduce((acc, item) => {
      const days = this.calculateDaysUntilExpiry(item.expiryDate!);
      if (!acc[days]) acc[days] = [];
      acc[days].push(item);
      return acc;
    }, {} as Record<number, any[]>);
  }

  /**
   * Verificar productos específicos de un usuario (para testing)
   */
  async checkUserExpiringProducts(userId: string): Promise<void> {
    try {
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const expiringItems = await prisma.userProductLocation.findMany({
        where: {
          userProduct: {
            userId: userId,
          },
          expiryDate: {
            gte: today,
            lte: sevenDaysFromNow,
          },
          isConsumed: false,
        },
        include: {
          userProduct: {
            include: {
              product: true,
            },
          },
        },
      });

      if (expiringItems.length > 0) {
        const expiringData = expiringItems.map(item => ({
          name: item.userProduct.product.name,
          daysUntilExpiry: this.calculateDaysUntilExpiry(item.expiryDate!),
        }));

        await this.notificationService.sendExpiryNotification(userId, expiringData);
        console.log(`📤 Manual expiry check: sent notification for ${expiringItems.length} items`);
      } else {
        console.log('✅ No expiring products found for user');
      }
    } catch (error) {
      console.error('❌ Error in manual expiry check:', error);
    }
  }
}

export default NotificationScheduler;
