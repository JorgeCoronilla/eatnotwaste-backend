// FreshKeeper v2.0.0 - Dashboard Service
// Unified dashboard data with optimized queries

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { DashboardData, ApiResponse } from '../types/database';

export class DashboardService {
  /**
   * Get comprehensive dashboard data for a user
   */
  static async getDashboardData(userId: string): Promise<ApiResponse<DashboardData>> {
    try {
      // Execute all queries in parallel for optimal performance
      const [
        inventoryStats,
        expiringItems,
        recentActivity,
        shoppingListCount,
        consumedThisWeek,
        userProductsData,
      ] = await Promise.all([
        // Inventory statistics
        prisma.userProductLocation.aggregate({
          where: {
            userProduct: { userId },
            isConsumed: false,
            removedAt: null,
            listType: { in: ['pantry', 'fridge', 'freezer'] },
          },
          _count: { id: true },
          _sum: { quantity: true },
        }),

        // Items expiring in the next 3 days
        prisma.userProductLocation.findMany({
          where: {
            userProduct: { userId },
            isConsumed: false,
            removedAt: null,
            expiryDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            userProduct: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: { expiryDate: 'asc' },
          take: 10,
        }),

        // Recent activity (last 10 movements)
        prisma.itemMovement.findMany({
          where: { userId },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),

        // Shopping list count
        prisma.userProductLocation.count({
          where: {
            userProduct: { userId },
            listType: 'shopping',
            removedAt: null,
          },
        }),

        // Items consumed this week
        prisma.userProductLocation.count({
          where: {
            userProduct: { userId },
            isConsumed: true,
            consumedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Active UserProducts to calculate categories
        prisma.userProduct.findMany({
          where: { userId, isActive: true },
          include: {
            product: { select: { id: true, category: true } },
            locations: { where: { isConsumed: false, removedAt: null, listType: { in: ['pantry', 'fridge', 'freezer'] } } }
          }
        }),
      ]);

      // Process category data in memory
      const categoryMap = new Map<string, number>();
      userProductsData.forEach(up => {
        if (up.product?.category && up.locations.length > 0) {
          const current = categoryMap.get(up.product.category) || 0;
          categoryMap.set(up.product.category, current + up.locations.length);
        }
      });

      const topCategoriesData = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate expiry alerts
      const expiryAlerts = {
        today: expiringItems.filter((item: any) => {
          if (!item.expiryDate) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expiry = new Date(item.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          return expiry.getTime() === today.getTime();
        }).length,
        tomorrow: expiringItems.filter((item: any) => {
          if (!item.expiryDate) return false;
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          const expiry = new Date(item.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          return expiry.getTime() === tomorrow.getTime();
        }).length,
        thisWeek: expiringItems.length,
      };

      // Build dashboard data
      const dashboardData: DashboardData = {
        inventory: {
          totalItems: inventoryStats._count.id || 0,
          totalQuantity: inventoryStats._sum.quantity || 0,
          expiringItems: expiringItems.length,
          categories: topCategoriesData.length,
        },
        expiryAlerts,
        recentActivity: recentActivity.map(activity => ({
          id: activity.id,
          type: activity.movementType,
          productName: activity.product.name,
          productImage: activity.product.imageUrl,
          quantity: activity.quantity,
          date: activity.createdAt,
        })),
        shoppingList: {
          totalItems: shoppingListCount,
        },
        statistics: {
          consumedThisWeek,
          topCategories: topCategoriesData,
        },
        quickActions: [
          {
            id: 'add-item',
            title: 'Agregar Producto',
            description: 'Escanear código de barras o buscar',
            icon: 'plus',
            route: '/inventory/add',
          },
          {
            id: 'shopping-list',
            title: 'Lista de Compras',
            description: `${shoppingListCount} productos pendientes`,
            icon: 'shopping-cart',
            route: '/shopping',
          },
          {
            id: 'expiring-soon',
            title: 'Por Vencer',
            description: `${expiringItems.length} productos próximos a vencer`,
            icon: 'clock',
            route: '/inventory?filter=expiring',
          },
        ],
      };

      return {
        success: true,
        data: dashboardData,
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get inventory summary for a user
   */
  static async getInventorySummary(userId: string) {
    try {
      const [totalItems, expiringCount, userProductsData] = await Promise.all([
        prisma.userProductLocation.count({
          where: {
            userProduct: { userId },
            isConsumed: false,
            removedAt: null,
            listType: { in: ['pantry', 'fridge', 'freezer'] }
          },
        }),

        prisma.userProductLocation.count({
          where: {
            userProduct: { userId },
            isConsumed: false,
            removedAt: null,
            expiryDate: {
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        prisma.userProduct.findMany({
          where: { userId, isActive: true },
          include: {
            product: { select: { category: true } },
            locations: { where: { isConsumed: false, removedAt: null, listType: { in: ['pantry', 'fridge', 'freezer'] } } }
          }
        }),
      ]);

      const categoriesCount = new Set(
        userProductsData
          .filter(up => up.locations.length > 0 && up.product?.category)
          .map(up => up.product.category)
      ).size;

      return {
        success: true,
        data: {
          totalItems,
          expiringCount,
          categoriesCount,
        },
      };
    } catch (error) {
      logger.error('Error getting inventory summary:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get consumption statistics for a user
   */
  static async getConsumptionStats(userId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const consumedItems = await prisma.userProductLocation.findMany({
        where: {
          userProduct: { userId },
          isConsumed: true,
          consumedAt: { gte: startDate },
        },
        include: {
          userProduct: {
            include: {
              product: {
                select: {
                  category: true,
                },
              },
            }
          }
        },
      });

      // Group by category
      const categoryStats = consumedItems.reduce((acc, item: any) => {
        const category = item.userProduct?.product?.category || 'Sin categoría';
        if (!acc[category]) acc[category] = 0;
        acc[category] += item.quantity;
        return acc;
      }, {} as Record<string, number>);

      // Group by day for trend analysis
      const dailyStats = consumedItems.reduce((acc, item: any) => {
        if (!item.consumedAt) return acc;
        const day = item.consumedAt.toISOString().split('T')[0];
        if (day) {
          if (!acc[day]) acc[day] = 0;
          acc[day] += item.quantity;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        data: {
          totalConsumed: consumedItems.reduce((sum, item) => sum + item.quantity, 0),
          categoryBreakdown: Object.entries(categoryStats)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count),
          dailyTrend: Object.entries(dailyStats)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        },
      };
    } catch (error) {
      logger.error('Error getting consumption stats:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }
}