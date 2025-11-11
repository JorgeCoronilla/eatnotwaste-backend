// FreshKeeper v2.0.0 - Inventory Service
// Modern inventory management with PostgreSQL and Prisma

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { Decimal } from '@prisma/client/runtime/library';
import type {
  UserItem,
  UserProductWithProduct,
  UserProductLocationWithProduct,
  ItemMovement,
  ApiResponse,
  PaginatedResponse,
  ListType,
  MovementType,
  Product,
} from '../types/database';

// Tipos de compatibilidad para migración
interface UserItemFilters {
  listType?: ListType;
  isConsumed?: boolean;
  expiringBefore?: Date;
  category?: string;
}

interface UserItemWithProduct {
  id: string;
  userId: string;
  productId: string;
  listType: ListType;
  quantity: number;
  unit?: string | null;
  purchaseDate?: Date | null;
  expiryDate?: Date | null;
  price?: number | Decimal | null;
  store?: string | null;
  notes?: string | null;
  isConsumed: boolean;
  consumedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  product: Product;
  daysUntilExpiry?: number | null | undefined;
  isExpiringSoon?: boolean | undefined;
  addedAt?: Date; // Campo adicional del nuevo esquema
  userProduct?: UserProductWithProduct; // Para compatibilidad con el mapeo
}
import { ProductService } from './ProductService';
import { UserProductService } from './UserProductService';

export class InventoryService {
  /**
   * @deprecated Este servicio está siendo migrado a UserProductService.
   * Se mantiene por compatibilidad temporal. Use UserProductService para nueva funcionalidad.
   */
  static readonly DEPRECATION_NOTICE = 'InventoryService está en proceso de migración. Use UserProductService para nueva funcionalidad.';
  /**
   * Add item to user's inventory
   * @deprecated Use UserProductService.addProductLocation instead
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

      // Use new UserProductService for adding location
      const locationData: any = {
        productId,
        location: itemData.listType,
        quantity: itemData.quantity,
      };
      
      if (itemData.unit !== undefined) locationData.unit = itemData.unit;
      if (itemData.purchaseDate !== undefined) locationData.purchaseDate = itemData.purchaseDate;
      if (itemData.expiryDate !== undefined) locationData.expiryDate = itemData.expiryDate;
      if (itemData.price !== undefined) locationData.price = itemData.price;
      if (itemData.store !== undefined) locationData.store = itemData.store;
      if (itemData.notes !== undefined) locationData.notes = itemData.notes;

      const result = await UserProductService.addProductLocation(userId, locationData);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Error al agregar producto',
        };
      }

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

      // Convert to UserItem format for backward compatibility
      const userItemWithProduct: UserItemWithProduct = {
        id: result.data.id,
        userId,
        productId,
        listType: result.data.listType,
        quantity: result.data.quantity,
        unit: result.data.unit,
        purchaseDate: result.data.purchaseDate,
        expiryDate: result.data.expiryDate,
        price: result.data.price,
        store: result.data.store,
        notes: result.data.notes,
        isConsumed: result.data.isConsumed,
        consumedAt: result.data.consumedAt,
        createdAt: result.data.addedAt,
        updatedAt: result.data.addedAt,
        product: result.data.userProduct.product,
        daysUntilExpiry: result.data.daysUntilExpiry,
        isExpiringSoon: result.data.isExpiringSoon,
      };

      logger.info(`Item added to inventory: ${result.data.userProduct.product.name} for user ${userId}`);

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
   * @deprecated Use UserProductService.getUserProductLocations instead
   */
  static async getUserItems(
    userId: string,
    filters: UserItemFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<UserItemWithProduct>> {
    try {
      // Use new UserProductService for getting locations
      // Build filters dynamically to avoid undefined values with exactOptionalPropertyTypes
      const locationFilters: any = {
        isConsumed: filters.isConsumed ?? false,
      };
      
      if (filters.listType !== undefined) {
        locationFilters.listType = filters.listType;
      }
      if (filters.expiringBefore !== undefined) {
        locationFilters.expiringBefore = filters.expiringBefore;
      }
      if (filters.category !== undefined) {
        locationFilters.category = filters.category;
      }
      
      const result = await UserProductService.getUserProductLocations(
        userId,
        locationFilters,
        page,
        limit
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Error al obtener productos',
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      // Convert UserProductLocation to UserItem format for backward compatibility
      const itemsWithDetails: UserItemWithProduct[] = result.data.map(location => ({
        id: location.id,
        userId,
        productId: location.userProduct.productId,
        listType: location.listType,
        quantity: location.quantity,
        unit: location.unit,
        purchaseDate: location.purchaseDate,
        expiryDate: location.expiryDate,
        price: location.price,
        store: location.store,
        notes: location.notes,
        isConsumed: location.isConsumed,
        consumedAt: location.consumedAt,
        createdAt: location.addedAt,
        updatedAt: location.addedAt,
        product: location.userProduct.product,
        daysUntilExpiry: location.daysUntilExpiry,
        isExpiringSoon: location.isExpiringSoon,
      }));

      return {
        success: true,
        data: itemsWithDetails,
        pagination: result.pagination,
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
   * @deprecated Use UserProductService.updateProductLocation instead
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
      // Use new UserProductService for updating location
      const result = await UserProductService.updateProductLocation(userId, itemId, updateData);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Error al actualizar producto',
        };
      }

      // Create movement record if list type changed
      if (updateData.listType) {
        const currentItem = await prisma.userItem.findFirst({
          where: { id: itemId, userId },
          include: { product: true },
        });

        if (currentItem && updateData.listType !== currentItem.listType) {
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
      }

      // Convert to UserItem format for backward compatibility
      const itemWithDetails: UserItemWithProduct = {
        id: result.data.id,
        userId,
        productId: result.data.userProduct.productId,
        listType: result.data.listType,
        quantity: result.data.quantity,
        unit: result.data.unit,
        purchaseDate: result.data.purchaseDate,
        expiryDate: result.data.expiryDate,
        price: result.data.price,
        store: result.data.store,
        notes: result.data.notes,
        isConsumed: result.data.isConsumed,
        consumedAt: result.data.consumedAt,
        createdAt: result.data.addedAt,
        updatedAt: result.data.addedAt,
        product: result.data.userProduct.product,
        daysUntilExpiry: result.data.daysUntilExpiry,
        isExpiringSoon: result.data.isExpiringSoon,
      };

      logger.info(`Item updated: ${result.data.userProduct.product.name} for user ${userId}`);

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
   * @deprecated Use UserProductService.updateProductLocation instead
   */
  static async consumeItem(
    userId: string,
    itemId: string,
    consumedQuantity?: number
  ): Promise<ApiResponse<void>> {
    try {
      // Get the location first to check current state
      const location = await prisma.userProductLocation.findFirst({
        where: {
          id: itemId,
          userProduct: {
            userId,
          },
        },
        include: {
          userProduct: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!location) {
        return {
          success: false,
          error: 'Producto no encontrado',
        };
      }

      if (location.isConsumed) {
        return {
          success: false,
          error: 'El producto ya ha sido consumido',
        };
      }

      const quantityToConsume = consumedQuantity || location.quantity;

      if (quantityToConsume >= location.quantity) {
        // Consume entire location
        await UserProductService.updateProductLocation(userId, itemId, {
          isConsumed: true,
          quantity: 0,
        });
      } else {
        // Partial consumption - reduce quantity
        await UserProductService.updateProductLocation(userId, itemId, {
          quantity: location.quantity - quantityToConsume,
        });
      }

      // Create movement record
      await prisma.itemMovement.create({
        data: {
          userId,
          productId: location.userProduct.productId,
          movementType: 'consume',
          quantity: quantityToConsume,
          fromList: location.listType,
          toList: null,
          metadata: { action: `Consumido ${quantityToConsume} ${location.unit}` },
        },
      });

      logger.info(`Item consumed: ${location.userProduct.product.name} (${quantityToConsume}) for user ${userId}`);

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
   * @deprecated Use UserProductService.deleteProductLocation instead
   */
  static async deleteItem(userId: string, itemId: string): Promise<ApiResponse<void>> {
    try {
      // Get location details first for movement record
      const location = await prisma.userProductLocation.findFirst({
        where: {
          id: itemId,
          userProduct: {
            userId,
          },
        },
        include: {
          userProduct: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!location) {
        return {
          success: false,
          error: 'Producto no encontrado',
        };
      }

      // Use new UserProductService for deletion
      const result = await UserProductService.deleteProductLocation(userId, itemId);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Error al eliminar producto',
        };
      }

      // Create movement record
      await prisma.itemMovement.create({
        data: {
          userId,
          productId: location.userProduct.productId,
          movementType: 'remove',
          quantity: location.quantity,
          fromList: location.listType,
          toList: null,
          metadata: { action: 'Producto eliminado del inventario' },
        },
      });

      logger.info(`Item deleted: ${location.userProduct.product.name} for user ${userId}`);

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
   * @deprecated Use UserProductService.getExpiringLocations instead
   */
  static async getExpiringItems(
    userId: string,
    days: number = 3
  ): Promise<ApiResponse<UserItemWithProduct[]>> {
    try {
      // Use new UserProductService for getting expiring locations
      const result = await UserProductService.getExpiringLocations(userId, days);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Error al obtener productos próximos a vencer',
        };
      }

      // Convert UserProductLocation to UserItem format for backward compatibility
      const itemsWithDetails: UserItemWithProduct[] = result.data.map(location => ({
        id: location.id,
        userId,
        productId: location.userProduct.productId,
        listType: location.listType,
        quantity: location.quantity,
        unit: location.unit,
        purchaseDate: location.purchaseDate,
        expiryDate: location.expiryDate,
        price: location.price,
        store: location.store,
        notes: location.notes,
        isConsumed: location.isConsumed,
        consumedAt: location.consumedAt,
        createdAt: location.addedAt,
        updatedAt: location.addedAt,
        product: location.userProduct.product,
        daysUntilExpiry: location.daysUntilExpiry,
        isExpiringSoon: location.isExpiringSoon,
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
   * @deprecated Use UserProductService.updateProductLocation instead
   */
  static async moveItem(
    userId: string,
    itemId: string,
    toList: ListType
  ): Promise<ApiResponse<UserItemWithProduct>> {
    try {
      // Get current location
      const location = await prisma.userProductLocation.findFirst({
        where: {
          id: itemId,
          userProduct: {
            userId,
          },
        },
        include: {
          userProduct: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!location) {
        return {
          success: false,
          error: 'Producto no encontrado',
        };
      }

      if (location.listType === toList) {
        return {
          success: false,
          error: 'El producto ya está en esa lista',
        };
      }

      const fromList = location.listType;
      let updatedLocation: UserProductLocationWithProduct;

      // If moving from shopping list, mark as consumed and create a new location
      if (fromList === 'shopping') {
        // Mark original location as consumed
        await UserProductService.updateProductLocation(userId, itemId, {
          isConsumed: true,
        });

        // Create a new location in the destination list
        const newLocationData: {
          productId: string;
          location: ListType;
          quantity: number;
          unit: string;
          purchaseDate: Date;
          price?: number;
          store?: string;
          notes?: string;
        } = {
          productId: location.userProduct.productId,
          location: toList,
          quantity: location.quantity,
          unit: location.unit || 'units',
          purchaseDate: new Date(),
        };
        
        if (location.price !== null && location.price !== undefined) {
          newLocationData.price = Number(location.price);
        }
        if (location.store !== null && location.store !== undefined) {
          newLocationData.store = location.store;
        }
        if (location.notes !== null && location.notes !== undefined) {
          newLocationData.notes = location.notes;
        }

        const newLocationResult = await UserProductService.addProductLocation(userId, newLocationData);

        if (!newLocationResult.success || !newLocationResult.data) {
          return {
            success: false,
            error: newLocationResult.error || 'Error al mover producto',
          };
        }
        updatedLocation = newLocationResult.data;

      } else {
        // For other movements, just update the listType
        const updateResult = await UserProductService.updateProductLocation(userId, itemId, {
          location: toList,
        });

        if (!updateResult.success || !updateResult.data) {
          return {
            success: false,
            error: updateResult.error || 'Error al mover producto',
          };
        }
        updatedLocation = updateResult.data;
      }

      // Create movement record
      await prisma.itemMovement.create({
        data: {
          userId,
          productId: location.userProduct.productId,
          movementType: 'move',
          quantity: location.quantity,
          fromList,
          toList,
          metadata: { action: `Movido de ${fromList} a ${toList}` },
        },
      });

      // Convert to UserItem format for backward compatibility
      const itemWithDetails: UserItemWithProduct = {
        id: updatedLocation.id,
        userId,
        productId: updatedLocation.userProduct.productId,
        listType: updatedLocation.listType,
        quantity: updatedLocation.quantity,
        unit: updatedLocation.unit,
        purchaseDate: updatedLocation.purchaseDate,
        expiryDate: updatedLocation.expiryDate,
        price: updatedLocation.price,
        store: updatedLocation.store,
        notes: updatedLocation.notes,
        isConsumed: updatedLocation.isConsumed,
        consumedAt: updatedLocation.consumedAt,
        createdAt: updatedLocation.addedAt,
        updatedAt: updatedLocation.addedAt,
        product: updatedLocation.userProduct.product,
        daysUntilExpiry: updatedLocation.daysUntilExpiry,
        isExpiringSoon: updatedLocation.isExpiringSoon,
      };

      logger.info(`Item moved: ${location.userProduct.product.name} from ${fromList} to ${toList} for user ${userId}`);

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