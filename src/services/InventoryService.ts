// FreshKeeper v2.0.0 - Inventory Service
// Modern inventory management with PostgreSQL and Prisma

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type {
  UserItem,
  UserItemWithProduct,
  ItemMovement,
  ApiResponse,
  PaginatedResponse,
  ListType,
  MovementType,
  UserItemFilters,
} from '../types/database';
import { ProductService } from './ProductService';

export class InventoryService {
  /**
   * Add item to user's inventory
   */
  static async addItem(
    userId: string,
    itemData: {
      productId?: string;
      barcode?: string;
      productName?: string;
      listType: ListType;
      quantity: number;
      unit?: string;
      purchaseDate?: Date;
      expiryDate?: Date;
      price?: number;
      store?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<UserItemWithProduct>> {
    try {
      let productId = itemData.productId;

      // If no productId provided, try to find or create product
      if (!productId) {
        if (itemData.barcode) {
          // Search by barcode first
          const searchResult = await ProductService.searchProducts(itemData.barcode, 1, 1);
          if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
            productId = searchResult.data[0]?.id;
          }
        }

        // If still no product found, create a new one
        if (!productId && itemData.productName) {
          const productData: any = {
            name: itemData.productName,
            source: 'manual' as const,
          };
          
          if (itemData.barcode) {
            productData.barcode = itemData.barcode;
          }

          const createResult = await ProductService.createProduct(productData);

          if (createResult.success && createResult.data) {
            productId = createResult.data.id;
          }
        }

        if (!productId) {
          return {
            success: false,
            error: 'No se pudo identificar o crear el producto',
          };
        }
      }

      // Create user item data
      const createData: any = {
        userId,
        productId,
        listType: itemData.listType,
        quantity: itemData.quantity,
        unit: itemData.unit || 'units',
      };

      // Add optional fields only if they exist
      if (itemData.purchaseDate) createData.purchaseDate = itemData.purchaseDate;
      if (itemData.expiryDate) createData.expiryDate = itemData.expiryDate;
      if (itemData.price) createData.price = itemData.price;
      if (itemData.store) createData.store = itemData.store;
      if (itemData.notes) createData.notes = itemData.notes;

      // Create user item
      const userItem = await prisma.userItem.create({
        data: createData,
        include: {
          product: true,
        },
      });

      // Create movement record
      await prisma.itemMovement.create({
        data: {
          userId,
          productId,
          movementType: 'add',
          quantity: itemData.quantity,
          fromList: null,
          toList: itemData.listType,
          metadata: { action: `Producto agregado a ${itemData.listType}` },
        },
      });

      // Increment product usage count
      await ProductService.incrementUsageCount(productId);

      // Calculate additional properties
      const userItemWithProduct: UserItemWithProduct = {
        ...userItem,
        daysUntilExpiry: userItem.expiryDate
          ? Math.ceil((userItem.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: userItem.expiryDate
          ? Math.ceil((userItem.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3
          : false,
      };

      logger.info(`Item added to inventory: ${userItem.product.name} for user ${userId}`);

      return {
        success: true,
        data: userItemWithProduct,
        message: 'Producto agregado exitosamente',
      };
    } catch (error) {
      logger.error('Error adding item to inventory:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get user's inventory items with filters
   */
  static async getUserItems(
    userId: string,
    filters: UserItemFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<UserItemWithProduct>> {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        userId,
        isConsumed: filters.isConsumed ?? false,
      };

      if (filters.listType) {
        where.listType = filters.listType;
      }

      if (filters.expiringBefore) {
        where.expiryDate = {
          lte: filters.expiringBefore,
          gte: new Date(),
        };
      }

      if (filters.category) {
        where.product = {
          category: { equals: filters.category, mode: 'insensitive' },
        };
      }

      const [items, total] = await Promise.all([
        prisma.userItem.findMany({
          where,
          include: {
            product: true,
          },
          skip,
          take: limit,
          orderBy: [
            { expiryDate: 'asc' },
            { createdAt: 'desc' },
          ],
        }),
        prisma.userItem.count({ where }),
      ]);

      // Add computed properties
      const itemsWithDetails: UserItemWithProduct[] = items.map(item => ({
        ...item,
        daysUntilExpiry: item.expiryDate
          ? Math.ceil((item.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: item.expiryDate
          ? Math.ceil((item.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3
          : false,
      }));

      return {
        success: true,
        data: itemsWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting user items:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * Update user item
   */
  static async updateItem(
    userId: string,
    itemId: string,
    updateData: {
      quantity?: number;
      unit?: string;
      expiryDate?: Date;
      price?: number;
      store?: string;
      notes?: string;
      listType?: ListType;
    }
  ): Promise<ApiResponse<UserItemWithProduct>> {
    try {
      // Get current item
      const currentItem = await prisma.userItem.findFirst({
        where: { id: itemId, userId },
        include: { product: true },
      });

      if (!currentItem) {
        return {
          success: false,
          error: 'Producto no encontrado',
        };
      }

      // Update item
      const updatedItem = await prisma.userItem.update({
        where: { id: itemId },
        data: updateData,
        include: { product: true },
      });

      // Create movement record if list type changed
      if (updateData.listType && updateData.listType !== currentItem.listType) {
        await prisma.itemMovement.create({
          data: {
            userId,
            productId: currentItem.productId,
            movementType: 'move',
            quantity: currentItem.quantity,
            fromList: currentItem.listType,
            toList: updateData.listType,
            metadata: { action: `Movido de ${currentItem.listType} a ${updateData.listType}` },
          },
        });
      }

      // Add computed properties
      const itemWithDetails: UserItemWithProduct = {
        ...updatedItem,
        daysUntilExpiry: updatedItem.expiryDate
          ? Math.ceil((updatedItem.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: updatedItem.expiryDate
          ? Math.ceil((updatedItem.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3
          : false,
      };

      logger.info(`Item updated: ${updatedItem.product.name} for user ${userId}`);

      return {
        success: true,
        data: itemWithDetails,
        message: 'Producto actualizado exitosamente',
      };
    } catch (error) {
      logger.error('Error updating item:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Consume/use item
   */
  static async consumeItem(
    userId: string,
    itemId: string,
    consumedQuantity?: number
  ): Promise<ApiResponse<void>> {
    try {
      const item = await prisma.userItem.findFirst({
        where: { id: itemId, userId },
        include: { product: true },
      });

      if (!item) {
        return {
          success: false,
          error: 'Producto no encontrado',
        };
      }

      if (item.isConsumed) {
        return {
          success: false,
          error: 'El producto ya ha sido consumido',
        };
      }

      const quantityToConsume = consumedQuantity || item.quantity;

      if (quantityToConsume >= item.quantity) {
        // Consume entire item
        await prisma.userItem.update({
          where: { id: itemId },
          data: {
            isConsumed: true,
            consumedAt: new Date(),
            quantity: 0,
          },
        });
      } else {
        // Partial consumption - reduce quantity
        await prisma.userItem.update({
          where: { id: itemId },
          data: {
            quantity: item.quantity - quantityToConsume,
          },
        });
      }

      // Create movement record
      await prisma.itemMovement.create({
        data: {
          userId,
          productId: item.productId,
          movementType: 'consume',
          quantity: quantityToConsume,
          fromList: item.listType,
          toList: null,
          metadata: { action: `Consumido ${quantityToConsume} ${item.unit}` },
        },
      });

      logger.info(`Item consumed: ${item.product.name} (${quantityToConsume}) for user ${userId}`);

      return {
        success: true,
        message: 'Producto consumido exitosamente',
      };
    } catch (error) {
      logger.error('Error consuming item:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Delete item from inventory
   */
  static async deleteItem(userId: string, itemId: string): Promise<ApiResponse<void>> {
    try {
      const item = await prisma.userItem.findFirst({
        where: { id: itemId, userId },
        include: { product: true },
      });

      if (!item) {
        return {
          success: false,
          error: 'Producto no encontrado',
        };
      }

      // Delete item
      await prisma.userItem.delete({
        where: { id: itemId },
      });

      // Create movement record
      await prisma.itemMovement.create({
        data: {
          userId,
          productId: item.productId,
          movementType: 'remove',
          quantity: item.quantity,
          fromList: item.listType,
          toList: null,
          metadata: { action: 'Producto eliminado del inventario' },
        },
      });

      logger.info(`Item deleted: ${item.product.name} for user ${userId}`);

      return {
        success: true,
        message: 'Producto eliminado exitosamente',
      };
    } catch (error) {
      logger.error('Error deleting item:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get items expiring soon
   */
  static async getExpiringItems(
    userId: string,
    days: number = 3
  ): Promise<ApiResponse<UserItemWithProduct[]>> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      const items = await prisma.userItem.findMany({
        where: {
          userId,
          isConsumed: false,
          expiryDate: {
            gte: new Date(),
            lte: expiryDate,
          },
        },
        include: {
          product: true,
        },
        orderBy: { expiryDate: 'asc' },
      });

      const itemsWithDetails: UserItemWithProduct[] = items.map(item => ({
        ...item,
        daysUntilExpiry: item.expiryDate
          ? Math.ceil((item.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: true,
      }));

      return {
        success: true,
        data: itemsWithDetails,
      };
    } catch (error) {
      logger.error('Error getting expiring items:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get item movements history
   */
  static async getItemMovements(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<ItemMovement>> {
    try {
      const skip = (page - 1) * limit;

      const [movements, total] = await Promise.all([
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
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.itemMovement.count({ where: { userId } }),
      ]);

      return {
        success: true,
        data: movements as ItemMovement[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting item movements:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * Move item between lists
   */
  static async moveItem(
    userId: string,
    itemId: string,
    toList: ListType
  ): Promise<ApiResponse<UserItemWithProduct>> {
    try {
      const item = await prisma.userItem.findFirst({
        where: { id: itemId, userId },
        include: { product: true },
      });

      if (!item) {
        return {
          success: false,
          error: 'Producto no encontrado',
        };
      }

      if (item.listType === toList) {
        return {
          success: false,
          error: 'El producto ya está en esa lista',
        };
      }

      const fromList = item.listType;

      // Update item list
      const updatedItem = await prisma.userItem.update({
        where: { id: itemId },
        data: { listType: toList },
        include: { product: true },
      });

      // Create movement record
      await prisma.itemMovement.create({
        data: {
          userId,
          productId: item.productId,
          movementType: 'move',
          quantity: item.quantity,
          fromList,
          toList,
          metadata: { action: `Movido de ${fromList} a ${toList}` },
        },
      });

      const itemWithDetails: UserItemWithProduct = {
        ...updatedItem,
        daysUntilExpiry: updatedItem.expiryDate
          ? Math.ceil((updatedItem.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: updatedItem.expiryDate
          ? Math.ceil((updatedItem.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3
          : false,
      };

      logger.info(`Item moved: ${item.product.name} from ${fromList} to ${toList} for user ${userId}`);

      return {
        success: true,
        data: itemWithDetails,
        message: `Producto movido a ${toList} exitosamente`,
      };
    } catch (error) {
      logger.error('Error moving item:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }
}