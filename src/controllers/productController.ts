import { Request, Response, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
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
            source: 'openfoodfacts',
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
export const createProduct: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
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

    if (!reqAuth.user) {
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
        source: 'manual',
        isVerified: false
      }
    });

    console.log(`✅ Producto creado: ${newProduct.name} por ${reqAuth.user.email}`);

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
    const { id } = req.params as { id: string };

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
export const updateProduct: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
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

    if (!reqAuth.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params as { id: string };
    const { name, brand, category, subcategory, description, imageUrl, nutritionalInfo, allergens, ingredients, isVerified } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        brand,
        category,
        subcategory,
        description,
        imageUrl,
        nutritionalInfo: nutritionalInfo || {},
        allergens: allergens || [],
        ingredients,
        isVerified: Boolean(isVerified)
      }
    });

    console.log(`📝 Producto actualizado: ${updatedProduct.name} por ${reqAuth.user.email}`);

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
export const deleteProduct: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params as { id: string };

    await prisma.product.delete({
      where: { id }
    });

    console.log(`🗑️ Producto eliminado: ${id} por ${reqAuth.user.email}`);

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente',
      data: {}
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
    const { page = 1, limit = 10 } = req.query;

    const products = await prisma.product.findMany({
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      message: 'Productos populares obtenidos',
      data: products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(products.length / Number(limit)),
        totalItems: products.length,
        itemsPerPage: Number(limit)
      }
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
 * Obtener categorías (mock)
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      message: 'Categorías obtenidas exitosamente',
      data: {
        categories: [
          { name: 'dairy', count: 15 },
          { name: 'fruits', count: 25 },
          { name: 'vegetables', count: 30 },
          { name: 'grains', count: 12 },
          { name: 'other', count: 8 }
        ]
      }
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