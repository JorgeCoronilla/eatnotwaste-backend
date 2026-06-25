import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validationResult } from 'express-validator';
import { UserProductService } from '../services/UserProductService';
import { ProductService } from '../services/ProductService';
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
  const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    if (!userId) {
          return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        }
    const { page = 1, limit = 20 } = req.query as any;
    const result = await UserProductService.getUserProductLocations(userId, { listType: 'shopping', isConsumed: false }, Number(page), Number(limit));
    if (!result.success) {
          return res.status(500).json({ success: false, error: result.error || 'Error interno del servidor' });
        }
    return res.json({ success: true, data: result.data, pagination: result.pagination });
});

/**
 * POST /api/shopping
 * Agregar item a la lista de compras
 */
router.post('/', authenticateToken, validateAddToShopping, async (req: Request, res: Response) => {
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
    let finalProductId = productId;
    if (!finalProductId) {
          if (barcode) {
            const searchResult = await ProductService.searchProducts(barcode, 1, 1);
            if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
              finalProductId = searchResult.data[0]?.id;
            }
          }
          if (!finalProductId && productName) {
            const createResult = await ProductService.createProduct({
              name: productName,
              source: 'manual' as any,
              barcode: barcode || undefined,
            });
            if (createResult.success && createResult.data) {
              finalProductId = createResult.data.id;
            }
          }
          if (!finalProductId) {
            return res.status(400).json({ success: false, error: 'No se pudo identificar o crear el producto' });
          }
        }
    const result = await UserProductService.addProductLocation(userId, {
          productId: finalProductId,
          location: 'shopping',
          quantity: Number(quantity),
          unit,
          notes,
        });
    if (!result.success) {
          return res.status(400).json({ success: false, error: result.error || 'No se pudo agregar el producto' });
        }
    return res.status(201).json({ success: true, message: result.message || 'Producto agregado', data: result.data });
});

/**
 * PUT /api/shopping/:id
 * Actualizar item de la lista de compras (cantidad, unidad, notas)
 */
router.put('/:id', authenticateToken, validateUpdateShoppingItem, async (req: Request, res: Response) => {
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
    const result = await UserProductService.updateProductLocation(userId, id, updatePayload);
    if (!result.success) {
          return res.status(400).json({ success: false, error: result.error || 'No se pudo actualizar el producto' });
        }
    return res.json({ success: true, message: result.message || 'Producto actualizado', data: result.data });
});

/**
 * PUT /api/shopping/:id/move
 * Mover item de compras al inventario (fridge/freezer/pantry) y opcionalmente fijar expiración
 */
router.put('/:id/move', authenticateToken, validateMoveShoppingItem, async (req: Request, res: Response) => {
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
    const movePayload: any = { listType: toList };
    if (expiryDate) movePayload.expiryDate = new Date(expiryDate);
    const result = await UserProductService.updateProductLocation(userId, id, movePayload);
    if (!result.success) {
          return res.status(400).json({ success: false, error: result.error || 'No se pudo mover el producto' });
        }
    return res.json({ success: true, message: result.message || `Producto movido a ${toList}`, data: result.data });
});

/**
 * DELETE /api/shopping/:id
 * Eliminar item de la lista de compras
 */
router.delete('/:id', authenticateToken, validateUuid('id'), async (req: Request, res: Response) => {
  const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    if (!userId) {
          return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        }
    const { id } = req.params as { id: string };
    const result = await UserProductService.deleteProductLocation(userId, id);
    if (!result.success) {
          return res.status(400).json({ success: false, error: result.error || 'No se pudo eliminar el producto' });
        }
    return res.json({ success: true, message: result.message || 'Producto eliminado' });
});

export default router;