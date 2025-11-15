import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Validaciones para el nuevo diseño de inventario (UserProduct y UserProductLocation)
 */

// Validaciones para agregar ubicación de producto (nuevo diseño)
export const validateAddProductLocation: ValidationChain[] = [
  body('productId')
    .isUUID()
    .withMessage('ID de producto no válido'),
  
  body('quantity')
    .isFloat({ min: 0.1, max: 9999 })
    .withMessage('Cantidad debe ser mayor a 0'),
  
  body('unit')
    .optional()
    .isIn(['pieces', 'kg', 'g', 'l', 'ml', 'cups', 'tbsp', 'tsp'])
    .withMessage('Unidad no válida'),
  
  body('location')
    .isIn(['fridge', 'freezer', 'pantry', 'counter'])
    .withMessage('Ubicación no válida'),
  
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de expiración no válida'),
  
  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de compra no válida'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio debe ser positivo'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
];

// Validaciones para actualizar ubicación de producto (nuevo diseño)
export const validateUpdateProductLocation: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('ID de ubicación no válido'),
  
  body('quantity')
    .optional()
    .isFloat({ min: 0, max: 9999 })
    .withMessage('Cantidad debe ser positiva'),
  
  body('unit')
    .optional()
    .isIn(['pieces', 'kg', 'g', 'l', 'ml', 'cups', 'tbsp', 'tsp'])
    .withMessage('Unidad no válida'),
  
  body('location')
    .optional()
    .isIn(['fridge', 'freezer', 'pantry', 'counter'])
    .withMessage('Ubicación no válida'),
  
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de expiración no válida'),
  
  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de compra no válida'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio debe ser positivo'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres'),
  
  body('isConsumed')
    .optional()
    .isBoolean()
    .withMessage('isConsumed debe ser booleano'),
  
  body('consumedQuantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cantidad consumida debe ser positiva')
];

// Validaciones para mover un producto a una nueva ubicación
export const validateMoveProductLocation: ValidationChain[] = [
  body('location')
    .isIn(['fridge', 'freezer', 'pantry', 'shopping'])
    .withMessage('Ubicación de destino no válida'),
];

// Validaciones para marcar producto como consumido (nuevo diseño)
export const validateConsumeProductLocation: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('ID de ubicación no válido'),
  
  body('consumedQuantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cantidad consumida debe ser positiva')
];

// Validaciones para filtros de búsqueda de productos del usuario
export const validateUserProductFilters: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser entre 1 y 100'),
  
  query('category')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Categoría no puede exceder 100 caracteres'),
  
  query('location')
    .optional()
    .isIn(['fridge', 'freezer', 'pantry', 'counter'])
    .withMessage('Ubicación no válida'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser booleano'),
  
  query('hasLocations')
    .optional()
    .isBoolean()
    .withMessage('hasLocations debe ser booleano'),
  
  query('expiringBefore')
    .optional()
    .isISO8601()
    .withMessage('Fecha de expiración no válida'),
  
  query('isConsumed')
    .optional()
    .isBoolean()
    .withMessage('isConsumed debe ser booleano')
];

// Validaciones para obtener productos próximos a expirar
export const validateExpiringProducts: ValidationChain[] = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Días debe ser entre 1 y 365')
];

// Validaciones para UserProduct (productos del usuario)
export const validateCreateUserProduct: ValidationChain[] = [
  body('productId')
    .isUUID()
    .withMessage('ID de producto no válido'),
  
  body('listType')
    .optional()
    .isIn(['fridge', 'freezer', 'pantry', 'shopping'])
    .withMessage('Tipo de lista no válido'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
];

export const validateUpdateUserProduct: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('ID de producto de usuario no válido'),
  
  body('listType')
    .optional()
    .isIn(['fridge', 'freezer', 'pantry', 'shopping'])
    .withMessage('Tipo de lista no válido'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
];



// Exportar todas las validaciones
export default {
  validateAddProductLocation,
  validateUpdateProductLocation,
  validateConsumeProductLocation,
  validateUserProductFilters,
  validateExpiringProducts,
  validateCreateUserProduct,
  validateUpdateUserProduct
};