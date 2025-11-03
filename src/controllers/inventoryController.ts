import { Request, Response } from 'express';
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
export const getInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      sort = '-createdAt',
      status,
      location,
      category,
      expiring = false
    } = req.query;

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
export const addToInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        error: 'Validation failed'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const inventoryData = req.body;

    // Mock inventory item creation
     const newInventoryItem: InventoryItem = {
       id: Math.random().toString(36).substr(2, 9),
       userId: req.user.id,
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

    console.log(`✅ Producto agregado al inventario: ${newInventoryItem.id} por ${req.user.email}`);

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
export const updateInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        error: 'Validation failed'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    // Mock inventory item update
    const updatedItem: InventoryItem = {
      id: id as string,
      userId: req.user.id,
      productId: 'prod1',
      quantity: updateData.quantity || 1,
      unit: updateData.unit || 'units',
      location: updateData.location || 'pantry',
      purchaseDate: new Date(),
      status: updateData.status || 'fresh',
      notes: updateData.notes,
      price: updateData.price
    };

    console.log(`📝 Producto actualizado en inventario: ${id} por ${req.user.email}`);

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
export const deleteInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params;

    console.log(`🗑️ Producto eliminado del inventario: ${id} por ${req.user.email}`);

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
export const markAsConsumed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params;
    const { consumedQuantity } = req.body;

    console.log(`✅ Producto marcado como consumido: ${id} (cantidad: ${consumedQuantity}) por ${req.user.email}`);

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
export const getInventoryStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const userId = req.user.id;

    console.log(`📊 Obteniendo estadísticas de inventario para usuario: ${userId}`);

    // Mock statistics
    const mockStats = {
      totalItems: 15,
      freshItems: 10,
      expiringSoon: 3,
      expired: 2,
      consumed: 25,
      totalValue: 125.50,
      categories: {
        dairy: 4,
        fruits: 3,
        vegetables: 5,
        grains: 2,
        other: 1
      },
      locations: {
        refrigerator: 8,
        pantry: 5,
        freezer: 2
      },
      expiringThisWeek: [
        {
          id: '2',
          productName: 'Pan Integral',
          expirationDate: new Date('2024-01-25'),
          daysLeft: 2
        }
      ]
    };

    res.json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: mockStats
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
export const getExpiringItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    const userId = req.user.id;
    const { days = 7 } = req.query;

    console.log(`⏰ Obteniendo productos que expiran en ${days} días para usuario: ${userId}`);

    // Mock expiring items
    const mockExpiringItems: InventoryItem[] = [
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
        product: {
          name: 'Pan Integral',
          brand: 'Bimbo',
          category: 'grains'
        }
      }
    ];

    res.json({
      success: true,
      message: 'Productos próximos a expirar obtenidos exitosamente',
      data: {
        items: mockExpiringItems,
        total: mockExpiringItems.length,
        daysFilter: Number(days)
      }
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