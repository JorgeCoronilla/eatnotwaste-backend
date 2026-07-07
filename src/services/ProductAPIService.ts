import axios, { AxiosInstance } from 'axios';
import { prisma } from '../config/database';
import { ProductService } from './ProductService';
import type { ProductSource } from '../types/database';
import { logger } from '../utils/logger';

import NutritionCalculator, { HealthScoreResult } from './NutritionCalculator';

interface APIHandler {
  name: string;
  handler: (barcode: string, language?: string) => Promise<ProductResult>;
}

interface ProductResult {
  success: boolean;
  product?: any;
  error?: string;
  source?: string;
}

interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
  vitaminA?: number;
  // Score-engine inputs — persisted so recalc can reproduce the exact same score
  novaGroup?: number;
  additivesTags?: string[];
  fruitsVegetablesNuts?: number;
}

interface ProductData {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  ingredients?: string[];
  allergens?: string[];
  // Clave unificada
  nutritionalInfo?: NutritionInfo;
  // Alias legacy para compatibilidad
  nutrition?: NutritionInfo;
  imageUrl?: string;
  servingSize?: string;
  servingUnit?: string | undefined;
  packageSize?: string;
  packageUnit?: string | undefined;
  source: string;
  language: string;
  lastUpdated: Date;
  healthScore?: HealthScoreResult;
}


class ProductAPIService {
  private apis: APIHandler[];
  private httpClient: AxiosInstance;

  constructor() {
    this.apis = [
      { name: 'OpenFoodFacts', handler: this.getOpenFoodFactsData.bind(this) },
      { name: 'ChompAPI', handler: this.getChompAPIData.bind(this) },
      { name: 'Local', handler: this.getLocalData.bind(this) }
    ];
    
    this.httpClient = axios.create({
      timeout: 7000, // 7s per source — enough for real networks, fails fast on flaky APIs
      headers: {
        'User-Agent': 'FreshKeeper/1.0 (https://freshkeeper.app)'
      }
    });
  }

  /**
   * Fetch product data by barcode.
   * OFF and Chomp are raced in parallel (Promise.any); Local DB is a last-resort
   * fallback for the case where the controller's initial DB check was bypassed.
   */
  async getProductData(barcode: string, language: string = 'es'): Promise<ProductResult> {
    logger.info('ProductAPIService:getProductData', { barcode });

    // Race OFF and Chomp — first success wins, losers are ignored.
    // Promise.any polyfill: invert errors to values and values to errors, then use Promise.all.
    const raceFirst = <T>(promises: Promise<T>[]): Promise<T> =>
      new Promise((resolve, reject) => {
        let remaining = promises.length;
        promises.forEach(p =>
          p.then(resolve).catch(() => { if (--remaining === 0) reject(new Error('all failed')); })
        );
      });

    try {
      const result = await raceFirst([
        this.getOpenFoodFactsData(barcode, language).then(r => {
          if (!r.success) throw new Error(r.error ?? 'not found');
          return r;
        }),
        this.getChompAPIData(barcode, language).then(r => {
          if (!r.success) throw new Error(r.error ?? 'not found');
          return r;
        }),
      ]);

      logger.info('ProductAPIService:externalHit', { barcode, source: result.source });
      await this.cacheProduct(result.product);
      return result;
    } catch {
      // Both external sources failed — fall back to local DB.
      logger.warn('ProductAPIService:externalMiss', { barcode });
    }

    const localResult = await this.getLocalData(barcode, language);
    if (localResult.success) {
      logger.info('ProductAPIService:localHit', { barcode });
      return localResult;
    }

    logger.warn('ProductAPIService:notFound', { barcode });
    return { success: false, error: 'Producto no encontrado en ninguna fuente', source: 'none' };
  }

  /**
   * Obtener datos de OpenFoodFacts
   */
  async getOpenFoodFactsData(barcode: string, language: string = 'es'): Promise<ProductResult> {
    try {
      // En Railway/Local la variable es OPEN_FOOD_FACTS_API_URL y ya incluye "/api/v0"
      // Ejemplo: https://world.openfoodfacts.org/api/v0
      const apiUrl = process.env.OPEN_FOOD_FACTS_API_URL || 'https://world.openfoodfacts.org/api/v0';
      
      // Aseguramos no duplicar la barra /
      const cleanUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const url = `${cleanUrl}/product/${barcode}.json`;
      logger.debug('ProductAPIService:offUrl', { url });
      const response = await this.httpClient.get(url);

      if (response.data.status === 1 && response.data.product) {
        const normalizedProduct = this.normalizeOpenFoodFactsData(response.data.product, barcode);
        return { success: true, product: normalizedProduct, source: 'openfoodfacts' };
      } else {
        logger.debug('ProductAPIService:offMiss', { barcode, status: response.data.status });
        return { success: false, error: 'Producto no encontrado en OpenFoodFacts', source: 'openfoodfacts' };
      }
    } catch (error: any) {
      logger.debug('ProductAPIService:offError', { barcode, message: error.message });
      return { success: false, error: error.message, source: 'openfoodfacts' };
    }
  }

  /**
   * Obtener datos de Chomp API
   */
  async getChompAPIData(barcode: string, language: string = 'es'): Promise<ProductResult> {
    try {
      const response = await this.httpClient.get(`https://chompthis.com/api/v2/food/branded/barcode.php`, {
        params: {
          api_key: process.env.CHOMP_API_KEY,
          code: barcode
        }
      });

      if (response.data && response.data.foods && response.data.foods.length > 0) {
        const normalizedProduct = this.normalizeChompAPIData(response.data.foods[0], barcode);
        return {
          success: true,
          product: normalizedProduct,
          source: 'chomp'
        };
      } else {
        return {
          success: false,
          error: 'Producto no encontrado en Chomp API',
          source: 'chomp'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        source: 'chomp'
      };
    }
  }

  /**
   * Normalizar datos de Chomp API
   */
  normalizeChompAPIData(rawData: any, barcode: string): ProductData {
    const nutrition = this.extractChompNutrition(rawData);
    return {
      barcode,
      name: rawData.food_name || 'Producto sin nombre',
      brand: rawData.brand_name || undefined,
      category: this.mapChompCategory(rawData.food_category),
      description: rawData.food_description || undefined,
      ingredients: rawData.ingredients ? rawData.ingredients.split(', ') : [],
      allergens: this.extractChompAllergens(rawData),
      nutritionalInfo: nutrition,
      nutrition,
      imageUrl: rawData.photo?.thumb || undefined,
      servingSize: rawData.serving_qty?.toString() || undefined,
      servingUnit: rawData.serving_unit || undefined,
      packageSize: rawData.household_serving_fulltext || undefined,
      packageUnit: undefined,
      source: 'chomp',
      language: 'en', // Chomp API principalmente en inglés
      lastUpdated: new Date()
    };
  }

  /**
   * Extraer información nutricional de Chomp API
   */
  extractChompNutrition(rawData: any): NutritionInfo {
    const nutrition: NutritionInfo = {};
    
    if (rawData.full_nutrients) {
      rawData.full_nutrients.forEach((nutrient: any) => {
        switch (nutrient.attr_id) {
          case 208: nutrition.calories = nutrient.value; break;
          case 203: nutrition.protein = nutrient.value; break;
          case 205: nutrition.carbohydrates = nutrient.value; break;
          case 204: nutrition.fat = nutrient.value; break;
          case 291: nutrition.fiber = nutrient.value; break;
          case 269: nutrition.sugar = nutrient.value; break;
          case 307: nutrition.sodium = nutrient.value; break;
          case 606: nutrition.saturatedFat = nutrient.value; break;
          case 605: nutrition.transFat = nutrient.value; break;
          case 601: nutrition.cholesterol = nutrient.value; break;
          case 301: nutrition.calcium = nutrient.value; break;
          case 303: nutrition.iron = nutrient.value; break;
          case 401: nutrition.vitaminC = nutrient.value; break;
          case 320: nutrition.vitaminA = nutrient.value; break;
        }
      });
    }
    
    return nutrition;
  }

  /**
   * Extraer alérgenos de Chomp API
   */
  extractChompAllergens(rawData: any): string[] {
    const allergens: string[] = [];
    
    if (rawData.allergen_contains_milk) allergens.push('leche');
    if (rawData.allergen_contains_eggs) allergens.push('huevos');
    if (rawData.allergen_contains_fish) allergens.push('pescado');
    if (rawData.allergen_contains_shellfish) allergens.push('mariscos');
    if (rawData.allergen_contains_tree_nuts) allergens.push('frutos secos');
    if (rawData.allergen_contains_peanuts) allergens.push('cacahuetes');
    if (rawData.allergen_contains_wheat) allergens.push('trigo');
    if (rawData.allergen_contains_soybeans) allergens.push('soja');
    
    return allergens;
  }

  /**
   * Mapear categoría de Chomp API
   */
  mapChompCategory(category: string): string {
    if (!category) return 'uncategorized';
    
    const categoryMap: { [key: string]: string } = {
      'Beverages': 'beverages',
      'Dairy and Egg Products': 'dairy_and_egg_products',
      'Spices and Herbs': 'spices_and_herbs',
      'Fats and Oils': 'fats_and_oils',
      'Poultry Products': 'poultry_products',
      'Soups, Sauces, and Gravies': 'soups_sauces_and_gravies',
      'Sausages and Luncheon Meats': 'sausages_and_luncheon_meats',
      'Breakfast Cereals': 'breakfast_cereals',
      'Fruits and Fruit Juices': 'fruits_and_fruit_juices',
      'Pork Products': 'pork_products',
      'Vegetables and Vegetable Products': 'vegetables_and_vegetable_products',
      'Nut and Seed Products': 'nut_and_seed_products',
      'Beef Products': 'beef_products',
      'Finfish and Shellfish Products': 'finfish_and_shellfish_products',
      'Legumes and Legume Products': 'legumes_and_legume_products',
      'Lamb, Veal, and Game Products': 'lamb_veal_and_game_products',
      'Baked Products': 'baked_products',
      'Sweets': 'sweets',
      'Cereal Grains and Pasta': 'cereal_grains_and_pasta',
      'Fast Foods': 'fast_foods',
      'Meals, Entrees, and Side Dishes': 'meals_entrees_and_side_dishes',
      'Snacks': 'snacks'
    };
    
    return categoryMap[category] || category;
  }

  /**
   * Normalizar datos de OpenFoodFacts
   */
  normalizeOpenFoodFactsData(rawData: any, barcode: string): ProductData {
    const baseNutrition = this.extractNutrition(rawData.nutriments);

    // Persist score-engine inputs alongside the nutrition data so the
    // recalc path can reproduce the EXACT same score without raw OFF data.
    const fruitsVegetablesNuts: number | undefined =
      rawData.nutriments?.['fruits-vegetables-nuts-estimate-from-ingredients_100g'] ??
      rawData.nutriments?.['fruits-vegetables-nuts_100g'] ??
      undefined;

    const nutrition: NutritionInfo = {
      ...baseNutrition,
      novaGroup: rawData.nova_group ?? undefined,
      additivesTags: rawData.additives_tags ?? [],
      ...(fruitsVegetablesNuts !== undefined ? { fruitsVegetablesNuts } : {}),
    };

    const ingredientsList: string[] = rawData.ingredients_text
      ? rawData.ingredients_text.split(/[,;]/).map((ing: string) => ing.trim()).filter((ing: string) => ing.length > 0)
      : [];

    return {
      barcode,
      name: rawData.product_name_es || rawData.product_name_en || rawData.product_name || 'Unnamed Product',
      brand: rawData.brands || undefined,
      category: this.mapCategory(rawData.categories),
      description: rawData.generic_name_es || rawData.generic_name_en || rawData.generic_name || undefined,
      ingredients: ingredientsList,
      allergens: this.extractAllergens(rawData.allergens),
      nutritionalInfo: nutrition,
      nutrition,
      imageUrl: rawData.image_url || rawData.image_front_url || undefined,
      servingSize: rawData.serving_size || undefined,
      servingUnit: undefined,
      packageSize: rawData.quantity || undefined,
      packageUnit: undefined,
      source: 'openfoodfacts',
      language: 'es',
      lastUpdated: new Date(),
      healthScore: NutritionCalculator.calculateScore(
        { // Nutrition Input — derived from persisted nutrition (single source of truth)
          energy: nutrition.calories ?? 0,
          sugars: nutrition.sugar ?? 0,
          fat: nutrition.fat ?? 0,
          saturatedFat: nutrition.saturatedFat ?? 0,
          sodium: nutrition.sodium ?? 0,
          fiber: nutrition.fiber ?? 0,
          protein: nutrition.protein ?? 0,
          ...(typeof nutrition.fruitsVegetablesNuts === 'number'
            ? { fruitsVegetablesNuts: nutrition.fruitsVegetablesNuts }
            : {}),
        },
        { // Ingredient Input
          ingredients: ingredientsList,
          additives: nutrition.additivesTags ?? [],
        },
        { // Processing Input
          ...(typeof nutrition.novaGroup === 'number' ? { novaGroup: nutrition.novaGroup } : {}),
        },
        this.mapCategory(rawData.categories),
        rawData.product_name
      )
    };
  }

  /**
   * Extraer información nutricional de OpenFoodFacts
   */
  extractNutrition(nutriments: any): NutritionInfo {
    if (!nutriments) return {};

    // OFF provides sodium in grams (sodium_100g), NOT milligrams.
    // The scoring engine expects sodium in mg, so multiply by 1000.
    // When sodium is absent but salt_100g (or salt) is present, derive it:
    //   sodium_mg = salt_g * 400  (i.e. salt_g / 2.5 * 1000)
    // This ensures the engine always receives mg regardless of which field OFF populated.
    const sodiumG: number | undefined =
      nutriments.sodium_100g ?? nutriments.sodium ?? undefined;
    const saltG: number | undefined =
      nutriments.salt_100g ?? nutriments.salt ?? undefined;

    let sodiumMg: number | undefined;
    if (sodiumG !== undefined && sodiumG !== null) {
      sodiumMg = sodiumG * 1000;
    } else if (saltG !== undefined && saltG !== null) {
      // Fallback: derive sodium from salt (salt_g × 400 = sodium_mg)
      sodiumMg = saltG * 400;
    }

    return {
      calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || undefined,
      protein: nutriments.proteins_100g || nutriments.proteins || undefined,
      carbohydrates: nutriments.carbohydrates_100g || nutriments.carbohydrates || undefined,
      fat: nutriments.fat_100g || nutriments.fat || undefined,
      fiber: nutriments.fiber_100g || nutriments.fiber || undefined,
      sugar: nutriments.sugars_100g || nutriments.sugars || undefined,
      // exactOptionalPropertyTypes: only include sodium when it has a value
      ...(sodiumMg !== undefined ? { sodium: sodiumMg } : {}),
      saturatedFat: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || undefined,
      transFat: nutriments['trans-fat_100g'] || nutriments['trans-fat'] || undefined,
      cholesterol: nutriments.cholesterol_100g || nutriments.cholesterol || undefined,
      calcium: nutriments.calcium_100g || nutriments.calcium || undefined,
      iron: nutriments.iron_100g || nutriments.iron || undefined,
      vitaminC: nutriments['vitamin-c_100g'] || nutriments['vitamin-c'] || undefined,
      vitaminA: nutriments['vitamin-a_100g'] || nutriments['vitamin-a'] || undefined
    };
  }

  /**
   * Extraer alérgenos de OpenFoodFacts
   */
  extractAllergens(allergensString: string): string[] {
    if (!allergensString) return [];
    
    const allergenMap: { [key: string]: string } = {
      'milk': 'leche',
      'eggs': 'huevos',
      'fish': 'pescado',
      'crustaceans': 'crustáceos',
      'molluscs': 'moluscos',
      'tree-nuts': 'frutos secos',
      'peanuts': 'cacahuetes',
      'sesame-seeds': 'sésamo',
      'soybeans': 'soja',
      'celery': 'apio',
      'mustard': 'mostaza',
      'lupin': 'altramuz',
      'sulphur-dioxide-and-sulphites': 'sulfitos',
      'gluten': 'gluten'
    };
    
    const allergens: string[] = [];
    const allergensLower = allergensString.toLowerCase();
    
    Object.keys(allergenMap).forEach(key => {
      if (allergensLower.includes(key)) {
        const mappedAllergen = allergenMap[key];
        if (mappedAllergen) {
          allergens.push(mappedAllergen);
        }
      }
    });
    
    return allergens;
  }

  /**
   * Mapear categoría de OpenFoodFacts
   */
  mapCategory(categoriesString: string): string {
    if (!categoriesString) return 'Sin categoría';
    
    const categories = categoriesString.toLowerCase();
    
    if (categories.includes('bebidas') || categories.includes('beverages')) return 'Bebidas';
    if (categories.includes('lácteos') || categories.includes('dairy')) return 'Lácteos';
    if (categories.includes('carne') || categories.includes('meat')) return 'Carnes';
    if (categories.includes('pescado') || categories.includes('fish')) return 'Pescados';
    if (categories.includes('verduras') || categories.includes('vegetables')) return 'Verduras';
    if (categories.includes('frutas') || categories.includes('fruits')) return 'Frutas';
    if (categories.includes('cereales') || categories.includes('cereals')) return 'Cereales';
    if (categories.includes('panadería') || categories.includes('bakery')) return 'Panadería';
    if (categories.includes('dulces') || categories.includes('sweets')) return 'Dulces';
    if (categories.includes('aperitivos') || categories.includes('snacks')) return 'Aperitivos';
    if (categories.includes('condimentos') || categories.includes('condiments')) return 'Condimentos';
    if (categories.includes('conservas') || categories.includes('canned')) return 'Conservas';
    
    // Devolver la primera categoría si no hay mapeo específico
    const firstCategory = categoriesString.split(',')[0]?.trim();
    return firstCategory || 'Sin categoría';
  }

  /**
   * Obtener datos de la base de datos local
   */
  async getLocalData(barcode: string, language: string = 'es'): Promise<ProductResult> {
    try {
      const product = await prisma.product.findFirst({ where: { barcode } });

      if (product) {
        return {
          success: true,
          product,
          source: 'Local'
        };
      }
      return {
        success: false,
        error: 'Producto no encontrado en base de datos local',
        source: 'Local'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        source: 'Local'
      };
    }
  }

  /**
   * Guardar producto en cache local
   */
  async cacheProduct(productData: ProductData): Promise<void> {
    try {
      await ProductService.cacheProduct(productData as any, productData.source as ProductSource);
      logger.debug('ProductAPIService:productCached', { barcode: productData.barcode });
    } catch (error: any) {
      logger.warn('ProductAPIService:cacheError', { message: error.message });
    }
  }


  /**
   * Buscar en OpenFoodFacts
   */
  async searchOpenFoodFacts(query: string, language: string = 'es', limit: number = 20, signal?: AbortSignal): Promise<any[]> {
    try {
      const params: any = {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: limit,
        lang: language,
        fields: 'code,product_name,product_name_es,product_name_en,brands,categories,ingredients_text,nutriments,image_url,quantity,generic_name,generic_name_es,generic_name_en,nova_group,additives_tags'
      };

      // Dynamic Country Filtering based on language
      const countryTag = this.getCountryForLanguage(language);
      if (countryTag) {
        params.tagtype_0 = 'countries';
        params.tag_contains_0 = 'contains';
        params.tag_0 = countryTag;
      }

      const response = await this.httpClient.get('https://world.openfoodfacts.org/cgi/search.pl', {
        params,
        ...(signal !== undefined && { signal }),
        paramsSerializer: (params) => {
          // OpenFoodFacts CGI script seems to have trouble with unencoded single quotes
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach(key => {
            searchParams.append(key, params[key]);
          });
          return searchParams.toString().replace(/'/g, '%27');
        }
      });

      if (response.data && response.data.products) {
        return response.data.products.map((product: any) => 
          this.normalizeOpenFoodFactsData(product, product.code || product._id)
        );
      }

      return [];
    } catch (error: any) {
      if (axios.isCancel(error)) {
        logger.debug('ProductAPIService:offSearchCanceled', { query });
        return [];
      }
      logger.error('ProductAPIService:offSearchError', { query, message: (error as any)?.message });
      return [];
    }
  }

  /**
   * Helper to map language code to OpenFoodFacts country tag
   * This improves search relevance by prioritizing products from the user's region
   */
  private getCountryForLanguage(lang: string): string | null {
    const map: { [key: string]: string } = {
      'es': 'spain',
      'fr': 'france',
      'it': 'italy',
      'de': 'germany',
      'pt': 'portugal',
      'en': 'united-kingdom', // Default to UK for English in Europe context, can be changed
    };
    return map[lang.toLowerCase()] || null;
  }
}

export default new ProductAPIService();