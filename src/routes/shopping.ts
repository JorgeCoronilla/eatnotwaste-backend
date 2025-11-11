import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validationResult } from 'express-validator';
import { InventoryService } from '../services/InventoryService';
import { AuthenticatedRequest } from '../types';
import { validatePagination, validateAddToShopping, validateUpdateShoppingItem, validateMoveShoppingItem, validateUuid } from '../middleware/validation';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Shopping
 *   description: API for managing user's shopping list
 */

/**
 * GET /api/shopping
 * Obtener la lista de compras del usuario
 */
router.get('/', authenticateToken, validatePagination, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const { page = 1, limit = 20 } = req.query as any;

    const result = await InventoryService.getUserItems(userId, { listType: 'shopping', isConsumed: false }, Number(page), Number(limit));

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'Error interno del servidor' });
    }

    return res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    console.error('Error en GET /shopping:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/shopping
 * Agregar item a la lista de compras
 */
router.post('/', authenticateToken, validateAddToShopping, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Datos de entrada inválidos', details: errors.array() });
    }

    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const { productId, barcode, productName, quantity, unit, notes } = req.body as any;

    const result = await InventoryService.addItem(userId, {
      productId,
      barcode,
      productName,
      listType: 'shopping',
      quantity: Number(quantity),
      unit,
      notes,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'No se pudo agregar el producto' });
    }

    return res.status(201).json({ success: true, message: result.message || 'Producto agregado', data: result.data });
  } catch (error) {
    console.error('Error en POST /shopping:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/shopping/:id
 * Actualizar item de la lista de compras (cantidad, unidad, notas)
 */
router.put('/:id', authenticateToken, validateUpdateShoppingItem, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Datos de entrada inválidos', details: errors.array() });
    }

    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const { id } = req.params as { id: string };
    const { quantity, unit, notes } = req.body as any;

    const updatePayload: any = {};
    if (quantity !== undefined) updatePayload.quantity = Number(quantity);
    if (unit !== undefined) updatePayload.unit = unit;
    if (notes !== undefined) updatePayload.notes = notes;

    const result = await InventoryService.updateItem(userId, id, updatePayload);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'No se pudo actualizar el producto' });
    }

    return res.json({ success: true, message: result.message || 'Producto actualizado', data: result.data });
  } catch (error) {
    console.error('Error en PUT /shopping/:id:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/shopping/:id/move
 * Mover item de compras al inventario (fridge/freezer/pantry) y opcionalmente fijar expiración
 */
router.put('/:id/move', authenticateToken, validateMoveShoppingItem, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Datos de entrada inválidos', details: errors.array() });
    }

    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const { id } = req.params as { id: string };
    const { toList, expiryDate } = req.body as any;

    // Si viene fecha de expiración, aprovechar updateItem para fijarla junto con el cambio de lista
    const movePayload: any = { listType: toList };
    if (expiryDate) movePayload.expiryDate = new Date(expiryDate);

    const result = await InventoryService.updateItem(userId, id, movePayload);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'No se pudo mover el producto' });
    }

    return res.json({ success: true, message: result.message || `Producto movido a ${toList}`, data: result.data });
  } catch (error) {
    console.error('Error en PUT /shopping/:id/move:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /api/shopping/:id
 * Eliminar item de la lista de compras
 */
router.delete('/:id', authenticateToken, validateUuid('id'), async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const { id } = req.params as { id: string };
    const result = await InventoryService.deleteItem(userId, id);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'No se pudo eliminar el producto' });
    }

    return res.json({ success: true, message: result.message || 'Producto eliminado' });
  } catch (error) {
    console.error('Error en DELETE /shopping/:id:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

export default router;