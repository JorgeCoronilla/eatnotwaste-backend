import { Request, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { InventoryService } from '../services/InventoryService';
import { DashboardService } from '../services/DashboardService';
import { AuthenticatedRequest } from '../types';

/**
 * Obtener inventario del usuario
 */
export const getInventoryLegacy: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    const userId = reqAuth.user.id;
    const { page = 1, limit = 20, location, category, expiring = false } = req.query as any;
    const filters: any = {};
    if (location && location !== 'all') {
          // location en rutas se mapea a listType en BD
          filters.listType = location; // 'fridge' | 'freezer' | 'pantry'
        }
    if (category && category !== 'all') {
          filters.category = category;
        }
    if (expiring === 'true') {
          filters.expiringBefore = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        }
    const result = await InventoryService.getUserItems(userId, filters, Number(page), Number(limit));
    if (!result.success) {
          res.status(500).json({ success: false, message: 'Error interno del servidor', error: result.error });
          return;
        }
    res.json({ success: true, message: 'Inventario obtenido exitosamente', data: result.data, pagination: result.pagination });
};

/**
 * Agregar producto al inventario
 */
export const addToInventoryLegacy: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
          res.status(400).json({ success: false, message: 'Datos de entrada inválidos', error: 'Validation failed', details: errors.array() });
          return;
        }
    if (!reqAuth.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    const { productId, quantity, unit, location, purchaseDate, expirationDate, price, notes } = req.body as any;
    const addPayload: any = {
          productId,
          listType: location || 'pantry',
          quantity: Number(quantity),
        };
    if (unit !== undefined) addPayload.unit = unit;
    if (purchaseDate) addPayload.purchaseDate = new Date(purchaseDate);
    if (expirationDate) addPayload.expiryDate = new Date(expirationDate);
    if (price !== undefined) addPayload.price = price;
    if (notes !== undefined) addPayload.notes = notes;
    const result = await InventoryService.addItem(reqAuth.user.id, addPayload);
    if (!result.success) {
          res.status(400).json({ success: false, message: 'Error al agregar producto', error: result.error });
          return;
        }
    res.status(201).json({ success: true, message: result.message || 'Producto agregado al inventario exitosamente', data: result.data });
};

/**
 * Actualizar producto en inventario
 */
export const updateInventoryItemLegacy: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
          res.status(400).json({ success: false, message: 'Datos de entrada inválidos', error: 'Validation failed', details: errors.array() });
          return;
        }
    if (!reqAuth.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    const { id } = req.params as { id: string };
    const { quantity, unit, location, expirationDate, price, notes } = req.body as any;
    const updatePayload: any = {};
    if (quantity !== undefined) updatePayload.quantity = Number(quantity);
    if (unit !== undefined) updatePayload.unit = unit;
    if (location !== undefined) updatePayload.listType = location;
    if (expirationDate) updatePayload.expiryDate = new Date(expirationDate);
    if (price !== undefined) updatePayload.price = price;
    if (notes !== undefined) updatePayload.notes = notes;
    const result = await InventoryService.updateItem(reqAuth.user.id, id, updatePayload);
    if (!result.success) {
          res.status(400).json({ success: false, message: 'Error al actualizar producto', error: result.error });
          return;
        }
    res.json({ success: true, message: result.message || 'Producto actualizado exitosamente', data: result.data });
};

/**
 * Eliminar producto del inventario
 */
export const deleteInventoryItemLegacy: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    const { id } = req.params as { id: string };
    const result = await InventoryService.deleteItem(reqAuth.user.id, id);
    if (!result.success) {
          res.status(400).json({ success: false, message: 'Error al eliminar producto', error: result.error });
          return;
        }
    res.json({ success: true, message: result.message || 'Producto eliminado del inventario exitosamente' });
};

/**
 * Marcar producto como consumido
 */
export const markAsConsumedLegacy: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    const { id } = req.params as { id: string };
    const { consumedQuantity } = req.body as any;
    const result = await InventoryService.consumeItem(reqAuth.user.id, id, consumedQuantity ? Number(consumedQuantity) : undefined);
    if (!result.success) {
          res.status(400).json({ success: false, message: 'Error al consumir producto', error: result.error });
          return;
        }
    res.json({ success: true, message: result.message || 'Producto marcado como consumido exitosamente' });
};

/**
 * Obtener estadísticas del inventario
 */
export const getInventoryStatsLegacy: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    const userId = reqAuth.user.id;
    const summary = await DashboardService.getInventorySummary(userId);
    if (!summary.success) {
          res.status(500).json({ success: false, message: 'Error interno del servidor', error: summary.error });
          return;
        }
    res.json({ success: true, message: 'Estadísticas del inventario obtenidas', data: summary.data });
};

/**
 * Obtener productos próximos a expirar
 */
export const getExpiringItemsLegacy: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    const userId = reqAuth.user.id;
    const result = await InventoryService.getExpiringItems(userId, 3);
    if (!result.success) {
          res.status(500).json({ success: false, message: 'Error interno del servidor', error: result.error });
          return;
        }
    res.json({ success: true, message: 'Productos próximos a expirar obtenidos', data: result.data });
};