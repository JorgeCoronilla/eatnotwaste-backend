import express, { Request, Response } from 'express';

const router = express.Router();

// Controladores
import {
  scanBarcode,
  searchProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getPopularProducts
} from '../controllers/productController';

// Middleware
import { authenticateToken, optionalAuth, requireRole } from '../middleware/auth';
import {
  validateBarcode,
  validateProductSearch,
  validateCreateProduct,
  validateMongoId,
  validatePagination,
  validateLanguage
} from '../middleware/validation';

/**
 * @route   GET /api/products/scan/:barcode
 * @desc    Escanear código de barras y obtener información del producto
 * @access  Public (con auth opcional para estadísticas)
 */
router.get('/scan/:barcode', 
  validateBarcode, 
  validateLanguage,
  optionalAuth, 
  scanBarcode
);

/**
 * @route   GET /api/products/search
 * @desc    Buscar productos por texto
 * @access  Public
 */
router.get('/search', 
  validateProductSearch,
  optionalAuth,
  searchProducts
);

/**
 * @route   GET /api/products/popular
 * @desc    Obtener productos populares
 * @access  Public
 */
router.get('/popular',
  validatePagination,
  validateLanguage,
  getPopularProducts
);

/**
 * @route   GET /api/products/categories
 * @desc    Obtener categorías disponibles
 * @access  Public
 */
router.get('/categories', (req: Request, res: Response) => {
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
});

/**
 * @route   GET /api/products/:id
 * @desc    Obtener detalles de un producto específico
 * @access  Public (con auth opcional para estadísticas)
 */
router.get('/:id',
  validateLanguage,
  optionalAuth,
  getProduct
);

/**
 * @route   POST /api/products
 * @desc    Crear producto manualmente
 * @access  Private
 */
router.post('/',
  authenticateToken,
  validateCreateProduct,
  createProduct
);

/**
 * @route   PUT /api/products/:id
 * @desc    Actualizar producto existente
 * @access  Private (solo admin o usuario verificado)
 */
router.put('/:id',
  authenticateToken,
  validateMongoId('id'),
  validateCreateProduct,
  updateProduct
);

/**
 * Eliminar producto
 * @route   DELETE /api/products/:id
 * @desc    Eliminar un producto
 * @access  Private
 */
router.delete('/:id',
  authenticateToken,
  validateMongoId('id'),
  deleteProduct
);

export default router;