// FreshKeeper v2.0.0 - User Product Service
// Service for managing user products and their locations

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type {
  UserProduct,
  UserProductLocation,
  UserProductWithProduct,
  UserProductLocationWithProduct,
  UserProductFilters,
  UserProductLocationFilters,
  ApiResponse,
  PaginatedResponse,
  ListType,
} from '../types/database';

export class UserProductService {
  /**
   * Get or create a UserProduct relationship
   */
  static async getOrCreateUserProduct(
    userId: string,
    productId: string
  ): Promise<UserProduct> {
    try {
      const userProduct = await prisma.userProduct.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        update: {
          lastUsed: new Date(),
        },
        create: {
          userId,
          productId,
          isActive: true,
        },
      });

      return userProduct;
    } catch (error) {
      logger.error('Error getting or creating user product:', error);
      throw error;
    }
  }

  /**
   * Get user products with filters
   */
  static async getUserProducts(
    userId: string,
    filters: UserProductFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<UserProductWithProduct>> {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        userId,
      };

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.hasLocations) {
        where.locations = {
          some: {
            removedAt: null,
          },
        };
      }

      const [userProducts, total] = await Promise.all([
        prisma.userProduct.findMany({
          where,
          include: {
            product: true,
            locations: {
              where: {
                removedAt: null, // Only active locations
              },
            },
          },
          skip,
          take: limit,
          orderBy: [
            { lastUsed: 'desc' },
            { firstAdded: 'desc' },
          ],
        }),
        prisma.userProduct.count({ where }),
      ]);

      // Calculate additional properties
      const userProductsWithDetails: UserProductWithProduct[] = userProducts.map(up => ({
        ...up,
        totalQuantity: up.locations.reduce((sum, loc) => sum + loc.quantity, 0),
        activeLocations: up.locations.length,
      }));

      return {
        success: true,
        data: userProductsWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting user products:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * Get user product locations with filters
   */
  static async getUserProductLocations(
    userId: string,
    filters: UserProductLocationFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<UserProductLocationWithProduct>> {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        userProduct: {
          userId,
        },
        removedAt: null, // Only active locations
      };

      if (filters.listType) {
        where.listType = filters.listType;
      }

      if (filters.isConsumed !== undefined) {
        where.isConsumed = filters.isConsumed;
      }

      if (filters.expiringBefore) {
        where.expiryDate = {
          lte: filters.expiringBefore,
          gte: new Date(),
        };
      }

      if (filters.category) {
        where.userProduct = {
          ...where.userProduct,
          product: {
            category: { equals: filters.category, mode: 'insensitive' },
          },
        };
      }

      const [locations, total] = await Promise.all([
        prisma.userProductLocation.findMany({
          where,
          include: {
            userProduct: {
              include: {
                product: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: [
            { expiryDate: 'asc' },
            { addedAt: 'desc' },
          ],
        }),
        prisma.userProductLocation.count({ where }),
      ]);

      // Add computed properties
      const locationsWithDetails: UserProductLocationWithProduct[] = locations.map(loc => ({
        ...loc,
        userProduct: {
          ...(loc as any).userProduct,
          locations: [], // No necesitamos todas las ubicaciones aquí
          totalQuantity: 0,
          activeLocations: 0,
        },
        daysUntilExpiry: loc.expiryDate
          ? Math.ceil((loc.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: loc.expiryDate
          ? Math.ceil((loc.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3
          : false,
      }));

      return {
        success: true,
        data: locationsWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting user product locations:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * Add a product location
   */
  static async addProductLocation(
    userId: string,
    data: {
      productId: string;
      location?: ListType;
      quantity: number;
      unit?: string;
      purchaseDate?: Date;
      expiryDate?: Date;
      price?: number;
      store?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<UserProductLocationWithProduct>> {
    try {
      // Get or create UserProduct first
      const userProduct = await this.getOrCreateUserProduct(userId, data.productId);

      // Create location
      const location = await prisma.userProductLocation.create({
        data: {
          userProductId: userProduct.id,
          listType: data.location || 'pantry',
          quantity: data.quantity,
          unit: data.unit || 'units',
          purchaseDate: data.purchaseDate || null,
          expiryDate: data.expiryDate || null,
          price: data.price || null,
          store: data.store || null,
          notes: data.notes || null,
        },
        include: {
          userProduct: {
            include: {
              product: true,
            },
          },
        },
      });

      // Add computed properties
      const locationWithDetails: UserProductLocationWithProduct = {
        ...location,
        userProduct: {
          ...(location as any).userProduct,
          locations: [], // No necesitamos todas las ubicaciones aquí
          totalQuantity: 0,
          activeLocations: 0,
        },
        daysUntilExpiry: location.expiryDate
          ? Math.ceil((location.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: location.expiryDate
          ? Math.ceil((location.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3
          : false,
      };

      logger.info(`Product location added: ${locationWithDetails.userProduct.product?.name} to ${data.location || 'pantry'} for user ${userId}`);

      return {
        success: true,
        data: locationWithDetails,
        message: 'Producto agregado exitosamente',
      };
    } catch (error) {
      logger.error('Error adding product location:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Update a product location
   */
  static async updateProductLocation(
    userId: string,
    locationId: string,
    updateData: {
      quantity?: number;
      unit?: string;
      location?: ListType;
      expiryDate?: Date;
      price?: number;
      store?: string;
      notes?: string;
      isConsumed?: boolean;
    }
  ): Promise<ApiResponse<UserProductLocationWithProduct>> {
    try {
      // Verify the location belongs to the user
      const existingLocation = await prisma.userProductLocation.findFirst({
        where: {
          id: locationId,
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

      if (!existingLocation) {
        return {
          success: false,
          error: 'Ubicación no encontrada',
        };
      }

      // Handle consumption and map location to listType
      let updatePayload: any = { ...updateData };
      if (updateData.location) {
        updatePayload.listType = updateData.location;
        delete updatePayload.location;
      }
      if (updateData.isConsumed && !existingLocation.isConsumed) {
        updatePayload.consumedAt = new Date();
      }

      const updatedLocation = await prisma.userProductLocation.update({
        where: { id: locationId },
        data: updatePayload,
        include: {
          userProduct: {
            include: {
              product: true,
            },
          },
        },
      });

      // Add computed properties
      const locationWithDetails: UserProductLocationWithProduct = {
        ...updatedLocation,
        userProduct: {
          ...updatedLocation.userProduct,
          locations: [], // No necesitamos todas las ubicaciones aquí
          totalQuantity: 0,
          activeLocations: 0,
        },
        daysUntilExpiry: updatedLocation.expiryDate
          ? Math.ceil((updatedLocation.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: updatedLocation.expiryDate
          ? Math.ceil((updatedLocation.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3
          : false,
      };

      logger.info(`Product location updated: ${updatedLocation.userProduct.product.name} for user ${userId}`);

      return {
        success: true,
        data: locationWithDetails,
        message: 'Producto actualizado exitosamente',
      };
    } catch (error) {
      logger.error('Error updating product location:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Soft delete a product location
   */
  static async deleteProductLocation(
    userId: string,
    locationId: string
  ): Promise<ApiResponse<void>> {
    try {
      // Verify the location belongs to the user
      const existingLocation = await prisma.userProductLocation.findFirst({
        where: {
          id: locationId,
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

      if (!existingLocation) {
        return {
          success: false,
          error: 'Ubicación no encontrada',
        };
      }

      // Soft delete by setting removedAt
      await prisma.userProductLocation.update({
        where: { id: locationId },
        data: {
          removedAt: new Date(),
        },
      });

      logger.info(`Product location deleted: ${existingLocation.userProduct.product.name} for user ${userId}`);

      return {
        success: true,
        message: 'Producto eliminado exitosamente',
      };
    } catch (error) {
      logger.error('Error deleting product location:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get expiring product locations
   */
  static async getExpiringLocations(
    userId: string,
    days: number = 3
  ): Promise<ApiResponse<UserProductLocationWithProduct[]>> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      const locations = await prisma.userProductLocation.findMany({
        where: {
          userProduct: {
            userId,
          },
          isConsumed: false,
          removedAt: null,
          expiryDate: {
            gte: new Date(),
            lte: expiryDate,
          },
        },
        include: {
          userProduct: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { expiryDate: 'asc' },
      });

      // Add computed properties
      const locationsWithDetails: UserProductLocationWithProduct[] = locations.map(loc => ({
        ...loc,
        userProduct: {
          ...(loc as any).userProduct,
          locations: [], // No necesitamos todas las ubicaciones aquí
          totalQuantity: 0,
          activeLocations: 0,
        },
        daysUntilExpiry: loc.expiryDate
          ? Math.ceil((loc.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpiringSoon: true,
      }));

      return {
        success: true,
        data: locationsWithDetails,
      };
    } catch (error) {
      logger.error('Error getting expiring locations:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }
}