import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse, IInventory } from '../types';

const router = express.Router();

// Controladores
import {
  getInventory,
  addToInventory,
  updateInventoryItem,
  deleteInventoryItem,
  markAsConsumed,
  getInventoryStats,
  getExpiringItems
} from '../controllers/inventoryController';

// Middleware ya importado arriba
import {
  validateAddToInventory,
  validateUpdateInventory,
  validateConsumeItem,
  validateMongoId,
  validatePagination
} from '../middleware/validation';

/**
 * @route   GET /api/inventory
 * @desc    Obtener inventario del usuario
 * @access  Private
 */
router.get('/',
  authenticateToken,
  validatePagination,
  getInventory
);

/**
 * @route   POST /api/inventory
 * @desc    Agregar producto al inventario
 * @access  Private
 */
router.post('/',
  authenticateToken,
  validateAddToInventory,
  addToInventory
);

/**
 * @route   GET /api/inventory/expiring
 * @desc    Obtener productos próximos a expirar
 * @access  Private
 */
router.get('/expiring',
  authenticateToken,
  getExpiringItems
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
 * @route   PUT /api/inventory/:id
 * @desc    Actualizar item del inventario
 * @access  Private
 */
router.put('/:id',
  authenticateToken,
  validateMongoId('id'),
  validateUpdateInventory,
  updateInventoryItem
);

/**
 * @route   POST /api/inventory/:id/consume
 * @desc    Marcar item como consumido
 * @access  Private
 */
router.post('/:id/consume',
  authenticateToken,
  validateMongoId('id'),
  validateConsumeItem,
  markAsConsumed
);

/**
 * @route   DELETE /api/inventory/:id
 * @desc    Eliminar item del inventario
 * @access  Private
 */
router.delete('/:id',
  authenticateToken,
  validateMongoId('id'),
  deleteInventoryItem
);

export default router;