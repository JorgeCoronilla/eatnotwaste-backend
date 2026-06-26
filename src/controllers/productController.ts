import { PrismaClient, ProductSource } from '@prisma/client';
import { Request, Response, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import ProductAPIService from '../services/ProductAPIService';
import ProductSearchService from '../services/ProductSearchService';
import NutritionCalculator from '../services/NutritionCalculator';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

/**
 * Escanear código de barras
 */
export const scanBarcode: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    const { barcode } = reqAuth.params;
    const { lang = 'es' } = reqAuth.query;
    if (!barcode) {
          res.status(400).json({
            success: false,
            message: 'Código de barras requerido'
          });
          return;
        }
    let product = await prisma.product.findFirst({
          where: { barcode }
        });
    if (product) {
          // Check if product is missing Health Score (legacy/incomplete data)
          if (!product.healthScore) {
             console.log(`⚠️ Local product missing Health Score: ${barcode}. Attempting refresh from external API...`);
             try {
                 // Attempt to fetch fresh data
                 const apiResult = await ProductAPIService.getProductData(barcode, lang as string);
                 
                 if (apiResult.success && apiResult.product) {
                     const pd = apiResult.product;
                     // Update the existing product with fresh data + Health Score
                     product = await prisma.product.update({
                         where: { id: product.id },
                         data: {
                             name: pd.name,
                             brand: pd.brand || null,
                             category: pd.category || null,
                             description: pd.description || null,
                             imageUrl: pd.imageUrl || null,
                             nutritionalInfo: (pd as any).nutritionalInfo || pd.nutrition || {},
                             ingredients: pd.ingredients ? pd.ingredients.join(", ") : null,
                             healthScore: pd.healthScore as any || undefined, // Force update score
                             updatedAt: new Date()
                         }
                     });
                     console.log(`✅ Product ${barcode} healed with new Health Score.`);
                     
                     res.json({
                        success: true,
                        message: 'Producto actualizado con Health Score',
                        data: product,
                        source: 'api-refresh'
                     });
                     return;
                 }
             } catch (refreshError) {
                 console.warn(`Failed to refresh product ${barcode}, returning local data:`, refreshError);
             }
          }

          // Producto encontrado en base de datos local (Healthy or Fallback)
          res.json({
            success: true,
            message: 'Producto encontrado',
            data: product,
            source: 'local'
          });
          return;
        }
    console.log(`🔍 Producto no encontrado localmente, buscando en APIs externas: ${barcode}`);
    try {
          const apiResult = await ProductAPIService.getProductData(barcode, lang as string);
          console.log('Resultado de la API:', apiResult);
          
          if (apiResult.success && apiResult.product) {
            // Crear producto en base de datos local con los datos de la API
            const productData = apiResult.product;
            
            const newProduct = await prisma.product.create({
              data: {
                name: productData.name,
                barcode: productData.barcode,
                brand: productData.brand || null,
                category: productData.category || null,
                description: productData.description || null,
                imageUrl: productData.imageUrl || null,
                // Persistir nutrición desde datos normalizados (acepta ambas claves)
                nutritionalInfo: (productData as any).nutritionalInfo || productData.nutrition || {},
                // Persistir alérgenos e ingredientes
                allergens: productData.allergens || [],
                ingredients: productData.ingredients ? productData.ingredients.join(", ") : null,
                source: apiResult.source as ProductSource,
                isVerified: false, // Los productos de API no se verifican automáticamente
                healthScore: productData.healthScore as any || undefined,
                healthScoreVersion: NutritionCalculator.ENGINE_VERSION,
              }
            });

            // Asociar el producto con el usuario que lo escaneó
            if (reqAuth.user) {
              await prisma.userProduct.create({
                data: {
                  userId: reqAuth.user.id,
                  productId: newProduct.id,
                },
              });
            }

            res.json({
              success: true,
              message: 'Producto obtenido de API externa y guardado',
              data: newProduct,
              source: apiResult.source
            });
            return;
          }
        } catch (apiError) {
          console.error('Error al buscar en APIs externas:', apiError);
        }
    res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
          suggestions: [
            'Verifica que el código de barras sea correcto',
            'Intenta escanear nuevamente',
            'Agrega el producto manualmente'
          ]
        });
};

/**
 * Buscar productos
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  const { q: query, limit = 20, offset = 0 } = req.query;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ success: false, message: 'Parámetro de búsqueda requerido' });
    return;
  }

  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
  const searchLimit = Math.min(Number(limit), 50);
  const searchOffset = Math.max(Number(offset), 0);

  const result = await ProductSearchService.searchLocalPaginated(normalizedQuery, searchLimit, searchOffset);
  const products = result.products ?? [];

  res.json({
    success: true,
    message: 'Búsqueda completada',
    data: products,
    pagination: {
      limit: searchLimit,
      offset: searchOffset,
      total: result.total ?? products.length,
      totalPages: Math.ceil((result.total ?? products.length) / searchLimit),
    },
  });
};

/**
 * Búsqueda manual por nombre con flujo avanzado
 */
export const manualSearchByName: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
  const { q, lang = 'es', type = 'smart', limit = 20 } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ success: false, message: 'Parámetro de búsqueda requerido' });
    return;
  }
  const searchType = (type === 'fast' || type === 'external' || type === 'ai') ? type as 'fast' | 'external' | 'ai' : 'smart';
  const searchLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  logger.info('manualSearchByName:request', { q, lang, type: searchType, limit: searchLimit, userId: reqAuth.user?.id });
  const result = await ProductSearchService.searchByName(q, String(lang), reqAuth.user?.id, searchType, searchLimit);
  logger.info('manualSearchByName:response', { decision: result.decision, source: result.source, count: result.products?.length ?? 0 });
  res.json({ success: true, ...result });
};

/**
 * Crear producto
 */
export const createProduct: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            error: 'Validation failed',
            details: errors.array()
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
    const { barcode, name, brand, category, subcategory, description, imageUrl, nutritionalInfo, allergens, ingredients } = req.body;
    if (barcode) {
          const existingProduct = await prisma.product.findFirst({
            where: { barcode }
          });

          if (existingProduct) {
            res.status(409).json({
              success: false,
              message: 'Ya existe un producto con este código de barras',
              error: 'Product already exists'
            });
            return;
          }
        }
    const newProduct = await prisma.product.create({
          data: {
            barcode,
            name,
            brand,
            category,
            subcategory,
            description,
            imageUrl,
            nutritionalInfo,
            allergens,
            ingredients,
            source: ProductSource.manual,
            isVerified: true, // Productos creados por el usuario se consideran verificados
            createdById: reqAuth.user.id
          }
        });
    res.status(201).json({
          success: true,
          message: 'Producto creado exitosamente',
          data: newProduct
        });
};

/**
 * Obtener producto por ID
 */
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
    if (!id) {
          res.status(400).json({
            success: false,
            message: 'ID de producto requerido'
          });
          return;
        }
    const product = await prisma.product.findUnique({
          where: { id }
        });
    if (!product) {
          res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
          });
          return;
        }
    let productData = product;
    if (product.healthScoreVersion === null || product.healthScoreVersion < NutritionCalculator.ENGINE_VERSION) {
             console.log(`♻️ Recalculating outdated Health Score for ${product.name} (v${product.healthScoreVersion} -> v${NutritionCalculator.ENGINE_VERSION})`);
              
              const newScore = NutritionCalculator.calculateScore(
                  product.nutritionalInfo as any,
                  { 
                      ingredients: product.ingredients ? product.ingredients.split(", ") : [], 
                      additives: product.allergens 
                  },
                  { novaGroup: (product.nutritionalInfo as any)?.novaGroup },
                  product.category || undefined,
                  product.name
              );

              // Update local variable and DB
              productData = await prisma.product.update({
                  where: { id: product.id },
                  data: {
                      healthScore: newScore as any,
                      healthScoreVersion: NutritionCalculator.ENGINE_VERSION,
                      updatedAt: new Date()
                  }
              });
        }
    res.json({
          success: true,
          message: 'Producto obtenido exitosamente',
          data: productData
        });
};

/**
 * Actualizar producto
 */
export const updateProduct: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            error: 'Validation failed',
            details: errors.array()
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
    const { id } = req.params as { id: string };
    const { name, brand, category, subcategory, description, imageUrl, nutritionalInfo, allergens, ingredients, isVerified } = req.body;
    const updatedProduct = await prisma.product.update({
          where: { id },
          data: {
            name,
            brand,
            category,
            subcategory,
            description,
            imageUrl,
            nutritionalInfo: nutritionalInfo || {},
            allergens: allergens || [],
            ingredients,
            isVerified: Boolean(isVerified)
          }
        });
    console.log(`📝 Producto actualizado: ${updatedProduct.name} por ${reqAuth.user.email}`);
    res.json({
          success: true,
          message: 'Producto actualizado exitosamente',
          data: updatedProduct
        });
};

/**
 * Eliminar producto
 */
export const deleteProduct: RequestHandler = async (req, res) => {
  const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
          res.status(401).json({
            success: false,
            message: 'Usuario no autenticado',
            error: 'Not authenticated'
          });
          return;
        }
    const { id } = req.params as { id: string };
    await prisma.product.delete({
          where: { id }
        });
    console.log(`🗑️ Producto eliminado: ${id} por ${reqAuth.user.email}`);
    res.json({
          success: true,
          message: 'Producto eliminado exitosamente',
          data: {}
        });
};

/**
 * Obtener todos los productos con paginación
 */
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20, lang = 'es', category } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const whereClause: any = {};
    if (category && typeof category === 'string' && category !== 'all') {
          whereClause.category = { equals: category, mode: 'insensitive' };
        }
    const [products, total] = await Promise.all([
          prisma.product.findMany({
            where: whereClause,
            skip: offset,
            take: limitNum,
            orderBy: { createdAt: 'desc' }
          }),
          prisma.product.count({ where: whereClause })
        ]);
    res.json({
          success: true,
          message: 'Productos obtenidos exitosamente',
          data: products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        });
};

/**
 * Obtener productos recientes del usuario
 */
export const getUserRecentProducts = async (req: Request, res: Response): Promise<void> => {
  const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    if (!userId) {
          res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
          return;
        }
    const { page = 1, limit = 5, lang = 'es' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const recentUserProductLocations = await prisma.userProductLocation.findMany({
          where: {
            userProduct: {
              userId: userId
            },
            removedAt: null, // Solo productos activos
            listType: {
              in: ['fridge', 'freezer', 'pantry'] // Solo inventario, no shopping
            }
          },
          include: {
            userProduct: {
              include: {
                product: true
              }
            }
          },
          orderBy: {
            addedAt: 'desc'
          },
          skip: offset,
          take: limitNum,
          distinct: ['userProductId'] // Evitar duplicados del mismo producto
        });
    const products = recentUserProductLocations.map(location => location.userProduct.product);
    const total = await prisma.userProductLocation.groupBy({
          by: ['userProductId'],
          where: { 
            userProduct: {
              userId: userId
            },
            removedAt: null,
            listType: {
              in: ['fridge', 'freezer', 'pantry']
            }
          }
        }).then(groups => groups.length);
    res.json({
          success: true,
          message: 'Productos recientes del usuario obtenidos exitosamente',
          data: products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        });
};

/**
 * Obtener productos populares
 */
export const getPopularProducts = async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10 } = req.query;
    const products = await prisma.product.findMany({
          take: Number(limit),
          skip: (Number(page) - 1) * Number(limit),
          orderBy: { createdAt: 'desc' }
        });
    res.json({
          success: true,
          message: 'Productos populares obtenidos',
          data: products,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(products.length / Number(limit)),
            totalItems: products.length,
            itemsPerPage: Number(limit)
          }
        });
};

/**
 * Obtener categorías (mock)
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  res.json({
          success: true,
          message: 'Categorías obtenidas exitosamente',
          data: {
            categories: [
              { name: 'dairy', count: 15 },
              { name: 'fruits', count: 25 },
              { name: 'vegetables', count: 30 },
              { name: 'grains', count: 12 },
              { name: 'other', count: 8 }
            ]
          }
        });
};
