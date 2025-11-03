import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { ProductSource } from '../../generated/prisma';
import ProductAPIService from '../services/ProductAPIService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Escanear código de barras
 */
export const scanBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode } = req.params;
    const { lang = 'es' } = req.query;

    if (!barcode) {
      res.status(400).json({
        success: false,
        message: 'Código de barras requerido'
      });
      return;
    }

    // Primero buscar producto en la base de datos local
    let product = await prisma.product.findFirst({
      where: { barcode }
    });

    if (product) {
      // Producto encontrado en base de datos local
      res.json({
        success: true,
        message: 'Producto encontrado',
        data: product,
        source: 'local'
      });
      return;
    }

    // Si no se encuentra localmente, buscar en APIs externas
    console.log(`🔍 Producto no encontrado localmente, buscando en APIs externas: ${barcode}`);
    
    try {
      const apiResult = await ProductAPIService.getProductData(barcode, lang as string);
      
      if (apiResult.success && apiResult.product) {
        // Crear producto en base de datos local con los datos de la API
        const productData = apiResult.product;
        
        const newProduct = await prisma.product.create({
          data: {
            name: productData.name,
            barcode: productData.barcode,
            brand: productData.brand || null,
            category: productData.category || null,
            description: productData.description || null,
            imageUrl: productData.imageUrl || null,
            nutritionalInfo: productData.nutrition || {},
            source: ProductSource.openfoodfacts,
            isVerified: true
          }
        });

        res.json({
          success: true,
          message: 'Producto encontrado y agregado a la base de datos',
          data: newProduct,
          source: apiResult.source
        });
        return;
      }
    } catch (apiError) {
      console.error('Error al buscar en APIs externas:', apiError);
    }

    // No se encontró en ninguna fuente
    res.status(404).json({
      success: false,
      message: 'Producto no encontrado',
      suggestions: [
        'Verifica que el código de barras sea correcto',
        'Intenta escanear nuevamente',
        'Agrega el producto manualmente'
      ]
    });

  } catch (error) {
    console.error('Error en scanBarcode:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Buscar productos
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query, limit = 20, offset = 0 } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Parámetro de búsqueda requerido'
      });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      message: 'Búsqueda completada',
      data: products,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: products.length
      }
    });

  } catch (error) {
    console.error('Error en searchProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Crear producto
 */
export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const { barcode, name, brand, category, subcategory, description, imageUrl, nutritionalInfo, allergens, ingredients } = req.body;

    // Verificar si ya existe un producto con el mismo código de barras
    if (barcode) {
      const existingProduct = await prisma.product.findFirst({
        where: { barcode }
      });

      if (existingProduct) {
        res.status(409).json({
          success: false,
          message: 'Ya existe un producto con este código de barras',
          error: 'Product already exists'
        });
        return;
      }
    }

    // Crear nuevo producto
    const newProduct = await prisma.product.create({
      data: {
        barcode,
        name,
        brand,
        category,
        subcategory,
        description,
        imageUrl,
        nutritionalInfo: nutritionalInfo || {},
        allergens: allergens || [],
        ingredients,
        source: ProductSource.manual,
        isVerified: false
      }
    });

    console.log(`✅ Producto creado: ${newProduct.name} por ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: newProduct
    });

  } catch (error) {
    console.error('Error en createProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Obtener producto por ID
 */
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID de producto requerido'
      });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Producto obtenido exitosamente',
      data: product
    });

  } catch (error) {
    console.error('Error en getProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Actualizar producto
 */
export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID de producto requerido'
      });
      return;
    }

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
      return;
    }

    // Actualizar producto
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData
    });

    console.log(`✅ Producto actualizado: ${updatedProduct.name} por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Error en updateProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Eliminar producto
 */
export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID de producto requerido'
      });
      return;
    }

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
      return;
    }

    // Eliminar producto
    await prisma.product.delete({
      where: { id }
    });

    console.log(`✅ Producto eliminado: ${existingProduct.name} por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en deleteProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Obtener productos populares
 */
export const getPopularProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    const products = await prisma.product.findMany({
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      message: 'Productos populares obtenidos exitosamente',
      data: products
    });

  } catch (error) {
    console.error('Error en getPopularProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Obtener categorías de productos
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtener categorías únicas con conteo
    const categories = await prisma.product.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      where: {
        category: {
          not: null
        }
      }
    });

    const formattedCategories = categories.map(cat => ({
      name: cat.category,
      count: cat._count.category
    }));

    res.json({
      success: true,
      message: 'Categorías obtenidas exitosamente',
      data: formattedCategories
    });

  } catch (error) {
    console.error('Error en getCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};