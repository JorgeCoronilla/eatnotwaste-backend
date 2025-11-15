import { Request, RequestHandler } from 'express';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';
import { UserProductService } from '../services/UserProductService';
import { DashboardService } from '../services/DashboardService';
import { AuthenticatedRequest } from '../types';
import { ListType } from '../types/database';

/**
 * Obtener inventario del usuario (nuevo diseño)
 */
export const getInventory: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
      return;
    }

    const userId = reqAuth.user.id;
    const { page = 1, limit = 20, listType, category, expiring = false } = req.query as any;

    // Si se solicitan productos expirando, usar el método específico
    if (expiring === 'true') {
      const result = await UserProductService.getExpiringLocations(userId, 3);
      if (!result.success) {
        res.status(500).json({ success: false, message: 'Error interno del servidor', error: result.error });
        return;
      }

      res.json({ 
        success: true, 
        message: 'Productos próximos a expirar obtenidos', 
        data: result.data
      });
      return;
    }

    // Construir filtros para ubicaciones de productos
    const filters: any = {};
    if (listType && listType !== 'all') {
      filters.listType = listType; // 'fridge' | 'freezer' | 'pantry' | 'shopping'
    }
    if (category && category !== 'all') {
      filters.category = category;
    }

    // Obtener ubicaciones de productos del usuario
    const result = await UserProductService.getUserProductLocations(userId, filters, Number(page), Number(limit));
    
    if (!result.success) {
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: result.error });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Inventario obtenido exitosamente', 
      data: result.data, 
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error en getInventory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Agregar producto al inventario (nuevo diseño)
 */
export const addToInventory: RequestHandler = async (req, res) => {
  try {
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

    const locationData: {
      productId: string;
      location: ListType;
      quantity: number;
      unit?: string;
      purchaseDate?: Date;
      expiryDate?: Date;
      price?: number;
      store?: string;
      notes?: string;
    } = {
      productId,
      location: location || 'pantry',
      quantity: Number(quantity),
    };

    if (unit !== undefined) locationData.unit = unit;
    if (purchaseDate !== undefined) locationData.purchaseDate = new Date(purchaseDate);
    if (expirationDate !== undefined) locationData.expiryDate = new Date(expirationDate);
    if (price !== undefined) locationData.price = price;
    if (notes !== undefined) locationData.notes = notes;

    const result = await UserProductService.addProductLocation(reqAuth.user.id, locationData);

    if (!result.success) {
      res.status(400).json({ success: false, message: 'Error al agregar producto', error: result.error });
      return;
    }

    res.status(201).json({ 
      success: true, 
      message: 'Producto agregado al inventario exitosamente', 
      data: result.data 
    });

  } catch (error) {
    console.error('Error en addToInventory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Actualizar producto en inventario (nuevo diseño)
 */
export const updateInventoryItem: RequestHandler = async (req, res) => {
  try {
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
    if (location !== undefined) updatePayload.location = location;
    if (expirationDate) updatePayload.expiryDate = new Date(expirationDate);
    if (price !== undefined) updatePayload.price = price;
    if (notes !== undefined) updatePayload.notes = notes;

    const result = await UserProductService.updateProductLocation(reqAuth.user.id, id, updatePayload);

    if (!result.success) {
      res.status(400).json({ success: false, message: 'Error al actualizar producto', error: result.error });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Producto actualizado exitosamente', 
      data: result.data 
    });

  } catch (error) {
    console.error('Error en updateInventoryItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Mover un producto a una nueva ubicación (nuevo diseño)
 */
export const moveInventoryItem: RequestHandler = async (req, res) => {
  logger.info('moveInventoryItem: Received request');
  try {
    const reqAuth = req as AuthenticatedRequest;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('moveInventoryItem: Validation errors', { errors: errors.array() });
      return res.status(400).json({ success: false, message: 'Datos de entrada inválidos', details: errors.array() });
    }

    if (!reqAuth.user) {
      logger.warn('moveInventoryItem: Unauthenticated user');
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { productId } = req.params as { productId: string };
    const { location, quantity, unit, notes } = req.body as any;
    logger.info('moveInventoryItem: Parsed data', { productId, location, quantity, unit, notes });

    logger.info('moveInventoryItem: Calling UserProductService.updateProductLocation');
    const result = await UserProductService.updateProductLocation(reqAuth.user.id, productId, {
      location,
      quantity,
      unit,
      notes,
    });
    logger.info('moveInventoryItem: UserProductService.updateProductLocation returned', { result });

    if (!result.success) {
      logger.error('moveInventoryItem: Error moving product', { error: result.error });
      return res.status(400).json({ success: false, message: 'Error al mover producto', error: result.error });
    }

    logger.info('moveInventoryItem: Product moved successfully');
    return res.json({ success: true, message: 'Producto movido exitosamente', data: result.data });
  } catch (error) {
    logger.error('moveInventoryItem: Caught exception', { error });
    console.error('Error en moveInventoryItem:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * Eliminar un ítem del inventario (nuevo diseño)
 */
export const deleteInventoryItem: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const result = await UserProductService.deleteProductLocation(reqAuth.user.id, id);

    if (!result.success) {
      res.status(400).json({ success: false, message: 'Error al eliminar producto', error: result.error });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Producto eliminado del inventario exitosamente' 
    });

  } catch (error) {
    console.error('Error en deleteInventoryItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Marcar producto como consumido (nuevo diseño)
 */
export const markAsConsumed: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const { consumedQuantity } = req.body as any;

    const updateData: {
      isConsumed: boolean;
      quantity?: number;
    } = {
      isConsumed: true,
    };

    if (consumedQuantity !== undefined) {
      updateData.quantity = Number(consumedQuantity);
    }

    const result = await UserProductService.updateProductLocation(reqAuth.user.id, id, updateData);

    if (!result.success) {
      res.status(400).json({ success: false, message: 'Error al consumir producto', error: result.error });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Producto marcado como consumido exitosamente',
      data: result.data
    });

  } catch (error) {
    console.error('Error en markAsConsumed:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Obtener estadísticas del inventario
 */
export const getInventoryStats: RequestHandler = async (req, res) => {
  try {
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

  } catch (error) {
    console.error('Error en getInventoryStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Obtener productos próximos a expirar (nuevo diseño)
 */
export const getExpiringItems: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
      return;
    }

    const userId = reqAuth.user.id;
    const { days = 3 } = req.query as any;
    
    const result = await UserProductService.getExpiringLocations(userId, Number(days));
    if (!result.success) {
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: result.error });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Productos próximos a expirar obtenidos', 
      data: result.data 
    });

  } catch (error) {
    console.error('Error en getExpiringItems:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};