import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse, IInventory } from '../types';

const router = express.Router();

// Nuevos controladores
import {
  getInventory as getInventoryNew,
  addToInventory as addToInventoryNew,
  updateInventoryItem as updateInventoryItemNew,
  deleteInventoryItem as deleteInventoryItemNew,
  markAsConsumed as markAsConsumedNew,
  getInventoryStats,
  getExpiringItems as getExpiringItemsNew,
  moveInventoryItem as moveInventoryItemNew, // <-- Importar el nuevo controlador
} from '../controllers/inventoryControllerNew';

// Nuevas validaciones
import {
  validateAddProductLocation,
  validateAddProductLocationFlexible,
  validateUpdateProductLocation,
  validateConsumeProductLocation,
  validateUserProductFilters,
  validateExpiringProducts,
  validateMoveProductLocation, // <-- Importar la nueva validación
} from '../middleware/validationNew';
import {
  validateUuid,
  validatePagination
} from '../middleware/validation';

/**
 * @swagger
 * tags:
 *   name: Inventory (New)
 *   description: API for managing user inventory with new design
 */

/**
 * @route   GET /api/inventory/v2
 * @desc    Obtener inventario del usuario (nuevo diseño)
 * @access  Private
 */
router.get('/v2',
  authenticateToken,
  validateUserProductFilters,
  getInventoryNew
);

/**
 * @route   POST /api/inventory/v2
 * @desc    Agregar producto al inventario (nuevo diseño)
 * @access  Private
 */
router.post('/v2',
  authenticateToken,
  validateAddProductLocationFlexible,
  addToInventoryNew
);

/**
 * @route   GET /api/inventory/v2/expiring
 * @desc    Obtener productos próximos a expirar (nuevo diseño)
 * @access  Private
 */
router.get('/v2/expiring',
  authenticateToken,
  validateExpiringProducts,
  getExpiringItemsNew
);

/**
 * @route   GET /api/inventory/stats
 * @desc    Obtener estadísticas del inventario
 * @access  Private
 */
router.get('/stats',
  authenticateToken,
  getInventoryStats
);

/**
 * @route   PUT /api/inventory/v2/:id/move
 * @desc    Mover un producto a una nueva ubicación (nuevo diseño)
 * @access  Private
 */
router.put('/v2/:productId/move',
  authenticateToken,
  validateUuid('productId'),
  validateMoveProductLocation,
  moveInventoryItemNew
);

/**
 * Obtener estadísticas de desperdicio (mock)
 * @route   GET /api/inventory/waste
 * @desc    Obtener estadísticas de desperdicio de alimentos
 * @access  Private
 */
router.get('/waste',
  authenticateToken,
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Estadísticas de desperdicio obtenidas exitosamente',
      data: {
        totalWasted: 15,
        wasteValue: 45.50,
        topWastedCategories: [
          { category: 'fruits', count: 8, value: 20.00 },
          { category: 'vegetables', count: 5, value: 15.50 },
          { category: 'dairy', count: 2, value: 10.00 }
        ]
      }
    });
  }
);

/**
 * @route   GET /api/inventory/location/:location
 * @desc    Obtener inventario por ubicación (mock)
 * @access  Private
 */
router.get('/location/:location',
  authenticateToken,
  (req: Request, res: Response) => {
    const { location } = req.params;
    res.json({
      success: true,
      message: `Inventario de ${location} obtenido exitosamente`,
      data: {
        items: [
          {
            id: '1',
            productId: 'prod1',
            quantity: 5,
            location: location,
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        ],
        total: 1
      }
    });
  }
);

/**
 * @route   PUT /api/inventory/v2/:id
 * @desc    Actualizar item del inventario (nuevo diseño)
 * @access  Private
 */
router.put('/v2/:id',
  authenticateToken,
  validateUuid('id'),
  validateUpdateProductLocation,
  updateInventoryItemNew
);

/**
 * @route   POST /api/inventory/v2/:id/consume
 * @desc    Marcar item como consumido (nuevo diseño)
 * @access  Private
 */
router.post('/v2/:id/consume',
  authenticateToken,
  validateUuid('id'),
  validateConsumeProductLocation,
  markAsConsumedNew
);

/**
 * @route   DELETE /api/inventory/v2/:id
 * @desc    Eliminar item del inventario (nuevo diseño)
 * @access  Private
 */
router.delete('/v2/:id',
  authenticateToken,
  validateUuid('id'),
  deleteInventoryItemNew
);

export default router;