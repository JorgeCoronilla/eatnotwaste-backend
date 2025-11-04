import { Request, RequestHandler } from 'express';
import { validationResult } from 'express-validator';

// Interfaces para inventario
interface InventoryItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  unit: string;
  location: string;
  purchaseDate: Date;
  expirationDate?: Date;
  status: 'fresh' | 'expiring_soon' | 'expired' | 'consumed';
  notes?: string;
  price?: number;
  product?: {
    name: string;
    brand?: string;
    category: string;
    images?: {
      main?: string;
    };
  };
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Obtener inventario del usuario
 */
export const getInventory: RequestHandler = async (req, res) => {
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

    const userId = reqAuth.user.id;
    const { 
      page = 1, 
      limit = 20, 
      sort = '-createdAt',
      status,
      location,
      category,
      expiring = false
    } = req.query as any;

    console.log(`📦 Obteniendo inventario para usuario: ${userId}`);

    // Mock inventory data
    const mockInventory: InventoryItem[] = [
      {
        id: '1',
        userId: userId,
        productId: 'prod1',
        quantity: 2,
        unit: 'units',
        location: 'refrigerator',
        purchaseDate: new Date('2024-01-15'),
        expirationDate: new Date('2024-02-15'),
        status: 'fresh',
        notes: 'Comprado en el supermercado',
        price: 3.50,
        product: {
          name: 'Leche Entera',
          brand: 'La Lechera',
          category: 'dairy',
          images: { main: '/images/leche.jpg' }
        }
      },
      {
        id: '2',
        userId: userId,
        productId: 'prod2',
        quantity: 1,
        unit: 'kg',
        location: 'pantry',
        purchaseDate: new Date('2024-01-10'),
        expirationDate: new Date('2024-01-25'),
        status: 'expiring_soon',
        notes: 'Usar pronto',
        price: 2.80,
        product: {
          name: 'Pan Integral',
          brand: 'Bimbo',
          category: 'grains'
        }
      }
    ];

    // Apply filters
    let filteredInventory = mockInventory;

    if (status && status !== 'all') {
      filteredInventory = filteredInventory.filter(item => item.status === status);
    }

    if (location && location !== 'all') {
      filteredInventory = filteredInventory.filter(item => item.location === location);
    }

    if (expiring === 'true') {
      filteredInventory = filteredInventory.filter(item => 
        item.status === 'expiring_soon' || item.status === 'expired'
      );
    }

    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedInventory = filteredInventory.slice(startIndex, startIndex + Number(limit));

    res.json({
      success: true,
      message: 'Inventario obtenido exitosamente',
      data: {
        inventory: paginatedInventory,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(filteredInventory.length / Number(limit)),
          totalItems: filteredInventory.length,
          itemsPerPage: Number(limit)
        },
        filters: {
          status: status || 'all',
          location: location || 'all',
          expiring: expiring === 'true'
        }
      }
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
 * Agregar producto al inventario
 */
export const addToInventory: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        error: 'Validation failed'
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

    const inventoryData = req.body as any;

    // Mock inventory item creation
     const newInventoryItem: InventoryItem = {
       id: Math.random().toString(36).substr(2, 9),
       userId: reqAuth.user.id,
       productId: inventoryData.productId || 'unknown',
       quantity: inventoryData.quantity || 1,
       unit: inventoryData.unit || 'units',
       location: inventoryData.location || 'pantry',
       purchaseDate: new Date(inventoryData.purchaseDate || Date.now()),
       status: 'fresh',
       notes: inventoryData.notes,
       price: inventoryData.price,
       ...(inventoryData.expirationDate && { expirationDate: new Date(inventoryData.expirationDate) })
     };

    console.log(`✅ Producto agregado al inventario: ${newInventoryItem.id} por ${reqAuth.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Producto agregado al inventario exitosamente',
      data: newInventoryItem
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
 * Actualizar producto en inventario
 */
export const updateInventoryItem: RequestHandler = async (req, res) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        error: 'Validation failed'
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

    const { id } = req.params;
    const updateData = req.body as any;

    // Mock inventory item update
    const updatedItem: InventoryItem = {
      id: id as string,
      userId: reqAuth.user.id,
      productId: 'prod1',
      quantity: updateData.quantity || 1,
      unit: updateData.unit || 'units',
      location: updateData.location || 'pantry',
      purchaseDate: new Date(),
      status: updateData.status || 'fresh',
      notes: updateData.notes,
      price: updateData.price
    };

    console.log(`📝 Producto actualizado en inventario: ${id} por ${reqAuth.user.email}`);

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: updatedItem
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
 * Eliminar producto del inventario
 */
export const deleteInventoryItem: RequestHandler = async (req, res) => {
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

    const { id } = req.params;

    console.log(`🗑️ Producto eliminado del inventario: ${id} por ${reqAuth.user.email}`);

    res.json({
      success: true,
      message: 'Producto eliminado del inventario exitosamente',
      data: {}
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
 * Marcar producto como consumido
 */
export const markAsConsumed: RequestHandler = async (req, res) => {
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

    const { id } = req.params;
    const { consumedQuantity } = (req.body as any);

    console.log(`✅ Producto marcado como consumido: ${id} (cantidad: ${consumedQuantity}) por ${reqAuth.user.email}`);

    res.json({
      success: true,
      message: 'Producto marcado como consumido exitosamente',
      data: {
        id: id,
        status: 'consumed',
        consumedQuantity: consumedQuantity || 1,
        consumedDate: new Date()
      }
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
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const userId = reqAuth.user.id;

    const stats = {
      totalItems: 42,
      expiringSoon: 7,
      expired: 3,
      consumedThisWeek: 12,
      categories: {
        dairy: 10,
        fruits: 8,
        vegetables: 12,
        grains: 7,
        other: 5
      }
    };

    res.json({
      success: true,
      message: 'Estadísticas del inventario obtenidas',
      data: stats
    });

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
 * Obtener productos próximos a expirar
 */
export const getExpiringItems: RequestHandler = async (req, res) => {
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

    const items = [
      { id: '1', name: 'Yogur natural', daysUntilExpiry: 2 },
      { id: '2', name: 'Plátanos', daysUntilExpiry: 3 },
      { id: '3', name: 'Queso cheddar', daysUntilExpiry: 1 },
    ];

    res.json({
      success: true,
      message: 'Productos próximos a expirar obtenidos',
      data: items
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