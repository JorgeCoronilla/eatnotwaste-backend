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
  validateUuid,
  validatePagination,
  validateLanguage
} from '../middleware/validation';

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API for managing products
 */

/**
 * @route   GET /api/products/scan/:barcode
 * @desc    Escanear código de barras y obtener información del producto
 * @access  Public (con auth opcional para estadísticas)
 */

/**
 * @swagger
 * /api/products/scan/{barcode}:
 *   get:
 *     summary: Scan barcode and get product information
 *     description: Scans a barcode and returns information about the corresponding product.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product information retrieved successfully.
 *       404:
 *         description: Product not found.
 *       500:
 *         description: Server error.
 */
router.get('/scan/:barcode', 
  validateBarcode, 
  validateLanguage,
  authenticateToken, 
  scanBarcode
);

/**
 * @route   GET /api/products/search
 * @desc    Buscar productos por texto
 * @access  Public
 */

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search for products
 *     description: Searches for products based on a query string.
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of products.
 *       400:
 *         description: Bad request.
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

/**
 * @swagger
 * /api/products/popular:
 *   get:
 *     summary: Get popular products
 *     description: Retrieves a list of popular products.
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of popular products.
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

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Get available categories
 *     description: Retrieves a list of available product categories.
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of categories.
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

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product details
 *     description: Retrieves the details of a specific product.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product details.
 *       404:
 *         description: Product not found.
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

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Creates a new product manually.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       210:
 *         description: Product created successfully.
 *       400:
 *         description: Bad request.
 *       401:
 *         description: Unauthorized.
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

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update an existing product
 *     description: Updates an existing product.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully.
 *       400:
 *         description: Bad request.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Product not found.
 */
router.put('/:id',
  authenticateToken,
  validateUuid('id'),
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
  validateUuid('id'),
  deleteProduct
);

export default router;