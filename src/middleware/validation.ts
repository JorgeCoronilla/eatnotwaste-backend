import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Validaciones para autenticación
 */
export const validateRegister: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido requerido'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('preferences.language')
    .optional()
    .isIn(['es', 'en', 'fr', 'pt'])
    .withMessage('Idioma no soportado'),
  
  body('preferences.units')
    .optional()
    .isIn(['metric', 'imperial'])
    .withMessage('Sistema de unidades no válido')
];

export const validateLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido requerido'),
  
  body('password')
    .notEmpty()
    .withMessage('Contraseña requerida')
];

export const validateChangePassword: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual requerida'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número')
];

/**
 * Validaciones para productos
 */
export const validateBarcode: ValidationChain[] = [
  param('barcode')
    .isLength({ min: 8, max: 18 })
    .withMessage('Código de barras debe tener entre 8 y 18 dígitos')
    .matches(/^\d+$/)
    .withMessage('Código de barras solo puede contener números')
];

export const validateProductSearch: ValidationChain[] = [
  query('q')
    .isLength({ min: 2, max: 100 })
    .withMessage('La búsqueda debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  query('language')
    .optional()
    .isIn(['es', 'en', 'fr', 'pt'])
    .withMessage('Idioma no soportado'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Límite debe ser entre 1 y 50')
];

export const validateCreateProduct: ValidationChain[] = [
  body('barcode')
    .optional()
    .isLength({ min: 8, max: 18 })
    .withMessage('Código de barras debe tener entre 8 y 18 dígitos')
    .matches(/^\d+$/)
    .withMessage('Código de barras solo puede contener números'),
  
  body('name')
    .notEmpty()
    .withMessage('Nombre requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('Nombre debe tener entre 2 y 255 caracteres'),
  
  body('brand')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Marca no puede exceder 255 caracteres'),
  
  body('category')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Categoría no puede exceder 100 caracteres'),
  
  body('subcategory')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Subcategoría no puede exceder 100 caracteres'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Descripción no puede exceder 1000 caracteres'),
  
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('URL de imagen no válida'),
  
  body('nutritionalInfo')
    .optional()
    .isObject()
    .withMessage('Información nutricional debe ser un objeto'),
  
  body('allergens')
    .optional()
    .isArray()
    .withMessage('Alérgenos debe ser un array'),
  
  body('allergens.*')
    .optional()
    .isString()
    .withMessage('Cada alérgeno debe ser una cadena de texto'),
  
  body('ingredients')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Ingredientes no pueden exceder 1000 caracteres')
];

/**
 * Validaciones para inventario
 */
export const validateAddToInventory: ValidationChain[] = [
  body('productId')
    .isUUID()
    .withMessage('ID de producto no válido'),
  
  body('quantity')
    .isFloat({ min: 0.1, max: 9999 })
    .withMessage('Cantidad debe ser mayor a 0'),
  
  body('unit')
    .isIn(['pieces', 'kg', 'g', 'l', 'ml', 'cups', 'tbsp', 'tsp'])
    .withMessage('Unidad no válida'),
  
  body('expirationDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de expiración no válida'),
  
  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de compra no válida'),
  
  body('location')
    .optional()
    .isIn(['fridge', 'freezer', 'pantry', 'counter'])
    .withMessage('Ubicación no válida'),
  
  body('purchase.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio debe ser positivo'),
  
  body('purchase.store')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Tienda no puede exceder 100 caracteres')
];

export const validateUpdateInventory: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('ID de inventario no válido'),
  
  body('quantity')
    .optional()
    .isFloat({ min: 0, max: 9999 })
    .withMessage('Cantidad debe ser positiva'),
  
  body('status')
    .optional()
    .isIn(['fresh', 'expiring_soon', 'expired', 'consumed', 'wasted'])
    .withMessage('Estado no válido'),
  
  body('openedDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de apertura no válida'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
];

export const validateConsumeItem: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('ID de inventario no válido'),
  
  body('quantity')
    .isFloat({ min: 0.1 })
    .withMessage('Cantidad consumida debe ser mayor a 0'),
  
  body('consumedAt')
    .optional()
    .isISO8601()
    .withMessage('Fecha de consumo no válida'),
  
  body('notes')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Notas no pueden exceder 200 caracteres')
];

/**
 * Validaciones para lista de compras
 */
export const validateAddToShopping: ValidationChain[] = [
  body('productId')
    .optional()
    .isUUID()
    .withMessage('ID de producto no válido'),
  
  body('barcode')
    .optional()
    .isLength({ min: 8, max: 18 })
    .withMessage('Código de barras debe tener entre 8 y 18 dígitos')
    .matches(/^\d+$/)
    .withMessage('Código de barras solo puede contener números'),
  
  body('productName')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nombre de producto debe tener entre 2 y 255 caracteres'),

  body('quantity')
    .isFloat({ min: 0.1, max: 9999 })
    .withMessage('Cantidad debe ser mayor a 0'),

  body('unit')
    .optional()
    .isIn(['pieces', 'kg', 'g', 'l', 'ml', 'cups', 'tbsp', 'tsp', 'units'])
    .withMessage('Unidad no válida'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
];

export const validateUpdateShoppingItem: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('ID de item no válido'),

  body('quantity')
    .optional()
    .isFloat({ min: 0, max: 9999 })
    .withMessage('Cantidad debe ser positiva'),

  body('unit')
    .optional()
    .isIn(['pieces', 'kg', 'g', 'l', 'ml', 'cups', 'tbsp', 'tsp', 'units'])
    .withMessage('Unidad no válida'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
];

export const validateMoveShoppingItem: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('ID de item no válido'),

  body('toList')
    .isIn(['fridge', 'freezer', 'pantry'])
    .withMessage('Lista destino no válida'),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de expiración no válida')
];

/**
 * Validaciones para perfil de usuario
 */
export const validateUpdateProfile: ValidationChain[] = [
  body('profile.name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento no válida'),
  
  body('profile.gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Género no válido'),
  
  body('preferences.language')
    .optional()
    .isIn(['es', 'en', 'fr', 'pt'])
    .withMessage('Idioma no soportado'),
  
  body('preferences.units')
    .optional()
    .isIn(['metric', 'imperial'])
    .withMessage('Sistema de unidades no válido'),
  
  body('nutritionalProfile.allergies')
    .optional()
    .isArray()
    .withMessage('Alergias debe ser un array'),
  
  body('nutritionalProfile.allergies.*')
    .optional()
    .isIn(['gluten', 'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'soy', 'sesame'])
    .withMessage('Alergia no válida'),
  
  body('nutritionalProfile.dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Restricciones dietéticas debe ser un array'),
  
  body('nutritionalProfile.dietaryRestrictions.*')
    .optional()
    .isIn(['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'keto', 'paleo', 'halal', 'kosher'])
    .withMessage('Restricción dietética no válida'),
  
  body('nutritionalProfile.healthGoals')
    .optional()
    .isArray()
    .withMessage('Objetivos de salud debe ser un array'),
  
  body('nutritionalProfile.healthGoals.*')
    .optional()
    .isIn(['weight_loss', 'weight_gain', 'muscle_gain', 'heart_health', 'diabetes_management', 'general_wellness'])
    .withMessage('Objetivo de salud no válido')
];

/**
 * Validaciones generales
 */
export const validatePagination: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser entre 1 y 100'),
  
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'name', '-name', 'expirationDate', '-expirationDate'])
    .withMessage('Ordenamiento no válido')
];

export const validateLanguage: ValidationChain[] = [
  query('language')
    .optional()
    .isIn(['es', 'en', 'fr', 'pt'])
    .withMessage('Idioma no soportado')
];

import { logger } from '../utils/logger';

// ... existing code ...

export const validateUuid = (paramName: string = 'id'): ValidationChain[] => {
  logger.info(`validateUuid: Validating param '${paramName}'`);
  return [
    param(paramName)
      .isUUID()
      .withMessage(`${paramName} no es un ID válido`)
  ];
};