// FreshKeeper v2.0.0 - Product Service
// Modern product management with PostgreSQL and Prisma

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type {
  Product,
  ProductWithUsage,
  ApiResponse,
  PaginatedResponse,
  ProductSource,
} from '../types/database';

export class ProductService {
  /**
   * Search products by barcode or name
   */
  static async searchProducts(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Product>> {
    try {
      const skip = (page - 1) * limit;

      // Check if query is a barcode (numeric)
      const isBarcode = /^\d+$/.test(query);

      const where = isBarcode
        ? { barcode: query }
        : {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { brand: { contains: query, mode: 'insensitive' as const } },
            ],
          };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { isVerified: 'desc' },
            { name: 'asc' },
          ],
        }),
        prisma.product.count({ where }),
      ]);

      return {
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching products:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * Get product by ID with usage statistics
   */
  static async getProductById(productId: string): Promise<ApiResponse<ProductWithUsage>> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          userItems: {
            where: { isConsumed: false },
            include: { user: { select: { id: true, name: true } } },
          },
          itemMovements: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });

      if (!product) {
        return {
          success: false,
          error: 'Producto no encontrado',
        };
      }

      const productWithUsage: ProductWithUsage = {
        ...product,
        activeUsers: product.userItems.length,
        recentMovements: product.itemMovements,
      } as ProductWithUsage;

      return {
        success: true,
        data: productWithUsage,
      };
    } catch (error) {
      logger.error('Error getting product:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Create a new product
   */
  static async createProduct(productData: {
    name: string;
    barcode?: string;
    brand?: string;
    category?: string;
    description?: string;
    imageUrl?: string;
    defaultExpiryDays?: number;
    nutritionInfo?: any;
    source: ProductSource;
    isVerified?: boolean;
  }): Promise<ApiResponse<Product>> {
    try {
      // Check if product with barcode already exists
      if (productData.barcode) {
        const existingProduct = await prisma.product.findFirst({
          where: { barcode: productData.barcode },
        });

        if (existingProduct) {
          return {
            success: false,
            error: 'Ya existe un producto con este código de barras',
          };
        }
      }

      const product = await prisma.product.create({
        data: {
          ...productData,
          isVerified: productData.isVerified || false,
        },
      });

      logger.info(`New product created: ${product.name} (${product.id})`);

      return {
        success: true,
        data: product,
        message: 'Producto creado exitosamente',
      };
    } catch (error) {
      logger.error('Error creating product:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Update product information
   */
  static async updateProduct(
    productId: string,
    updateData: {
      name?: string;
      brand?: string;
      category?: string;
      description?: string;
      imageUrl?: string;
      defaultExpiryDays?: number;
      nutritionInfo?: any;
      isVerified?: boolean;
    }
  ): Promise<ApiResponse<Product>> {
    try {
      const product = await prisma.product.update({
        where: { id: productId },
        data: updateData,
      });

      logger.info(`Product updated: ${product.name} (${product.id})`);

      return {
        success: true,
        data: product,
        message: 'Producto actualizado exitosamente',
      };
    } catch (error) {
      logger.error('Error updating product:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get popular products
   */
  static async getPopularProducts(limit: number = 20): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        take: limit,
        orderBy: [
          { isVerified: 'desc' },
          { name: 'asc' },
        ],
        where: {
          userItems: { some: {} }, // Products that have been used
        },
      });

      return {
        success: true,
        data: products,
      };
    } catch (error) {
      logger.error('Error getting popular products:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(
    category: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Product>> {
    try {
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: { category: { equals: category, mode: 'insensitive' } },
          skip,
          take: limit,
          orderBy: [
            { isVerified: 'desc' },
            { name: 'asc' },
          ],
        }),
        prisma.product.count({
          where: { category: { equals: category, mode: 'insensitive' } },
        }),
      ]);

      return {
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting products by category:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * Increment product usage count (simulate with updated timestamp)
   */
  static async incrementUsageCount(productId: string): Promise<void> {
    try {
      await prisma.product.update({
        where: { id: productId },
        data: {
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error incrementing usage count:', error);
    }
  }

  /**
   * Get product categories
   */
  static async getCategories(): Promise<ApiResponse<string[]>> {
    try {
      const categories = await prisma.product.findMany({
        select: { category: true },
        where: { category: { not: null } },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      const categoryList = categories
        .map(p => p.category)
        .filter(Boolean) as string[];

      return {
        success: true,
        data: categoryList,
      };
    } catch (error) {
      logger.error('Error getting categories:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
      };
    }
  }

  /**
   * Cache product from external API
   */
  static async cacheProduct(
    productData: any,
    source: ProductSource,
    ttl: number = 86400 // 24 hours
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl * 1000);

      await prisma.productCache.upsert({
        where: {
          barcode_source: {
            barcode: productData.barcode,
            source,
          },
        },
        update: {
          productData: productData,
          expiresAt,
        },
        create: {
          barcode: productData.barcode,
          source,
          productData: productData,
          expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error caching product:', error);
    }
  }

  /**
   * Get cached product
   */
  static async getCachedProduct(
    barcode: string,
    source: ProductSource
  ): Promise<any | null> {
    try {
      const cached = await prisma.productCache.findUnique({
        where: {
          barcode_source: { barcode, source },
          expiresAt: { gt: new Date() },
        },
      });

      return cached?.productData || null;
    } catch (error) {
      logger.error('Error getting cached product:', error);
      return null;
    }
  }
}