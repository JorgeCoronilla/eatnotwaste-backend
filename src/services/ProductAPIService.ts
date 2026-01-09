import axios, { AxiosInstance } from 'axios';
import { prisma } from '../config/database';
import { ProductService } from './ProductService';
import type { ProductSource } from '../types/database';

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
    
    // Configurar axios con timeout
    this.httpClient = axios.create({
      timeout: 10000, // 10 segundos (no bloquea UI en modo paralelo)
      headers: {
        'User-Agent': 'FreshKeeper/1.0 (https://freshkeeper.app)'
      }
    });
  }

  /**
   * Obtener datos de producto por código de barras
   * Implementa estrategia de fallback entre APIs
   */
  async getProductData(barcode: string, language: string = 'es'): Promise<ProductResult> {
    console.log(`🔍 Buscando producto con código: ${barcode}`);

    for (const api of this.apis) {
      try {
        console.log(`📡 Intentando con ${api.name}...`);
        const result = await api.handler(barcode, language);
        
        if (result.success) {
          console.log(`✅ Producto encontrado en ${api.name}`);
          
          // Guardar/actualizar en base de datos local
          await this.cacheProduct(result.product);
          
          return result;
        }
      } catch (error: any) {
        console.warn(`⚠️ Error en ${api.name}:`, error.message);
        continue;
      }
    }

    console.log(`❌ Producto no encontrado: ${barcode}`);
    return {
      success: false,
      error: 'Producto no encontrado en ninguna fuente',
      source: 'none'
    };
  }

  /**
   * Obtener datos de OpenFoodFacts
   */
  async getOpenFoodFactsData(barcode: string, language: string = 'es'): Promise<ProductResult> {
    try {
      const url = `${process.env.OPEN_FOOD_FACTS_BASE_URL}/api/v0/product/${barcode}.json`;
      console.log('OpenFoodFacts URL:', url);
      const response = await this.httpClient.get(url);
      console.log('OpenFoodFacts raw response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.status === 1 && response.data.product) {
        const normalizedProduct = this.normalizeOpenFoodFactsData(response.data.product, barcode);
        return {
          success: true,
          product: normalizedProduct,
          source: 'openfoodfacts'
        };
      } else {
        console.log('OpenFoodFacts status check failed:', { status: response.data.status, productExists: !!response.data.product });
        return {
          success: false,
          error: 'Producto no encontrado en OpenFoodFacts',
          source: 'openfoodfacts'
        };
      }
    } catch (error: any) {
      console.error('Error in getOpenFoodFactsData:', error);
      return {
        success: false,
        error: error.message,
        source: 'openfoodfacts'
      };
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
    if (!category) return 'Sin categoría';
    
    const categoryMap: { [key: string]: string } = {
      'Beverages': 'Bebidas',
      'Dairy and Egg Products': 'Lácteos y Huevos',
      'Spices and Herbs': 'Especias y Hierbas',
      'Fats and Oils': 'Grasas y Aceites',
      'Poultry Products': 'Productos Avícolas',
      'Soups, Sauces, and Gravies': 'Sopas, Salsas y Caldos',
      'Sausages and Luncheon Meats': 'Embutidos',
      'Breakfast Cereals': 'Cereales',
      'Fruits and Fruit Juices': 'Frutas y Zumos',
      'Pork Products': 'Productos de Cerdo',
      'Vegetables and Vegetable Products': 'Verduras y Vegetales',
      'Nut and Seed Products': 'Frutos Secos y Semillas',
      'Beef Products': 'Productos de Ternera',
      'Finfish and Shellfish Products': 'Pescados y Mariscos',
      'Legumes and Legume Products': 'Legumbres',
      'Lamb, Veal, and Game Products': 'Cordero y Caza',
      'Baked Products': 'Productos Horneados',
      'Sweets': 'Dulces',
      'Cereal Grains and Pasta': 'Cereales y Pasta',
      'Fast Foods': 'Comida Rápida',
      'Meals, Entrees, and Side Dishes': 'Comidas Preparadas',
      'Snacks': 'Aperitivos'
    };
    
    return categoryMap[category] || category;
  }

  /**
   * Normalizar datos de OpenFoodFacts
   */
  normalizeOpenFoodFactsData(rawData: any, barcode: string): ProductData {
    const nutrition = this.extractNutrition(rawData.nutriments);
    return {
      barcode,
      name: rawData.product_name || rawData.product_name_es || rawData.product_name_en || 'Producto sin nombre',
      brand: rawData.brands || undefined,
      category: this.mapCategory(rawData.categories),
      description: rawData.generic_name || rawData.generic_name_es || rawData.generic_name_en || undefined,
      ingredients: rawData.ingredients_text ? 
        rawData.ingredients_text.split(/[,;]/).map((ing: string) => ing.trim()).filter((ing: string) => ing.length > 0) : 
        [],
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
      lastUpdated: new Date()
    };
  }

  /**
   * Extraer información nutricional de OpenFoodFacts
   */
  extractNutrition(nutriments: any): NutritionInfo {
    if (!nutriments) return {};
    
    return {
      calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || undefined,
      protein: nutriments.proteins_100g || nutriments.proteins || undefined,
      carbohydrates: nutriments.carbohydrates_100g || nutriments.carbohydrates || undefined,
      fat: nutriments.fat_100g || nutriments.fat || undefined,
      fiber: nutriments.fiber_100g || nutriments.fiber || undefined,
      sugar: nutriments.sugars_100g || nutriments.sugars || undefined,
      sodium: nutriments.sodium_100g || nutriments.sodium || undefined,
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
      console.log(`💾 Producto cacheado: ${productData.barcode}`);
    } catch (error: any) {
      console.warn('⚠️ Error guardando en cache:', error.message);
    }
  }

  /**
   * Buscar productos por texto
   */
  async searchProducts(query: string, language: string = 'es', limit: number = 20): Promise<any[]> {
    try {
      // Primero buscar en base de datos local
      const resp = await ProductService.searchProducts(query, 1, limit);

      if (resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
        return resp.data;
      }

      // Si no hay resultados locales, buscar en OpenFoodFacts
      return await this.searchOpenFoodFacts(query, language, limit);
    } catch (error: any) {
      console.error('Error en búsqueda de productos:', error);
      return [];
    }
  }

  /**
   * Buscar en OpenFoodFacts
   */
  async searchOpenFoodFacts(query: string, language: string = 'es', limit: number = 20): Promise<any[]> {
    try {
      const response = await this.httpClient.get('https://world.openfoodfacts.org/cgi/search.pl', {
        params: {
          search_terms: query,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: limit,
          lang: language
        }
      });

      if (response.data && response.data.products) {
        return response.data.products.map((product: any) => 
          this.normalizeOpenFoodFactsData(product, product.code || product._id)
        );
      }

      return [];
    } catch (error: any) {
      console.error('Error buscando en OpenFoodFacts:', error);
      return [];
    }
  }
}

export default new ProductAPIService();