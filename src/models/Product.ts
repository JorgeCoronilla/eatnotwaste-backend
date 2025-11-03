import mongoose, { Document, Schema, Model } from 'mongoose';

// Tipos para enums
export type ProductCategory = 'fruits' | 'vegetables' | 'dairy' | 'meat' | 'fish' | 'grains' | 
  'legumes' | 'nuts' | 'oils' | 'spices' | 'beverages' | 'snacks' | 'frozen' | 'canned' | 'bakery' | 'condiments' | 'other';

export type StorageTemperature = 'room_temperature' | 'refrigerated' | 'frozen';
export type EcoScore = 'A' | 'B' | 'C' | 'D' | 'E';
export type ApiSource = 'openfoodfacts' | 'fatsecret' | 'spoonacular' | 'manual' | 'user_generated';
export type PriceUnit = 'kg' | 'g' | 'l' | 'ml' | 'unit';
export type Allergen = 'gluten' | 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' | 
  'peanuts' | 'soy' | 'sesame' | 'sulfites' | 'mustard' | 'celery';
export type ReportType = 'incorrect_info' | 'missing_data' | 'duplicate';

// Interfaces
export interface IProductNames {
  es: string;
  en?: string;
  fr?: string;
  pt?: string;
  it?: string;
  de?: string;
  ca?: string;
}

export interface IVitamins {
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  thiamine?: number;
  riboflavin?: number;
  niacin?: number;
  vitaminB6?: number;
  folate?: number;
  vitaminB12?: number;
}

export interface IMinerals {
  calcium?: number;
  iron?: number;
  magnesium?: number;
  phosphorus?: number;
  potassium?: number;
  zinc?: number;
}

export interface INutrition {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  cholesterol?: number;
  vitamins?: IVitamins;
  minerals?: IMinerals;
}

export interface IIngredients {
  list: string[];
  allergens: Allergen[];
}

export interface IStorage {
  temperature: StorageTemperature;
  shelfLife: {
    unopened?: number;
    opened?: number;
  };
  tips: {
    es?: string;
    en?: string;
    fr?: string;
    pt?: string;
  };
}

export interface ISustainability {
  ecoScore?: EcoScore;
  carbonFootprint?: number;
  packaging?: {
    material?: string;
    recyclable?: boolean;
  };
  origin?: {
    country?: string;
    region?: string;
    organic?: boolean;
    fairTrade?: boolean;
  };
}

export interface IPricing {
  averagePrice?: number;
  currency: string;
  unit: PriceUnit;
  lastUpdated?: Date;
}

export interface IApiData {
  source: ApiSource;
  sourceId?: string;
  lastSync: Date;
  confidence: number;
  verified: boolean;
}

export interface IImages {
  thumbnail?: string;
  main?: string;
  nutrition?: string;
  ingredients?: string;
}

export interface IProductStats {
  scanCount: number;
  userCount: number;
  popularityScore: number;
  lastScanned?: Date;
}

export interface IQualityReport {
  userId: mongoose.Types.ObjectId;
  type: ReportType;
  description?: string;
  createdAt: Date;
}

export interface IQuality {
  reportCount: number;
  reports: IQualityReport[];
  needsReview: boolean;
}

export interface IProduct extends Document {
  barcode?: string;
  names: IProductNames;
  brand?: string;
  category: ProductCategory;
  subcategory?: string;
  nutrition: INutrition;
  ingredients: IIngredients;
  storage: IStorage;
  sustainability: ISustainability;
  pricing: IPricing;
  apiData: IApiData;
  images: IImages;
  stats: IProductStats;
  quality: IQuality;
  createdAt: Date;
  updatedAt: Date;

  // Métodos de instancia
  getName(language?: string): string;
  incrementScanCount(): Promise<IProduct>;
  getNutritionalScore(): EcoScore | null;
  containsAllergen(allergen: Allergen): boolean;
}

export interface IProductModel extends Model<IProduct> {
  searchProducts(query: string, language?: string): Promise<IProduct[]>;
}

const productSchema = new Schema<IProduct>({
  // Identificadores únicos
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  // Información básica multiidioma
  names: {
    es: { type: String, required: true },
    en: String,
    fr: String,
    pt: String,
    it: String,
    de: String,
    ca: String
  },
  
  // Información del producto
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'La marca no puede exceder 100 caracteres']
  },
  
  category: {
    type: String,
    required: [true, 'La categoría es requerida'],
    enum: [
      'fruits', 'vegetables', 'dairy', 'meat', 'fish', 'grains', 
      'legumes', 'nuts', 'oils', 'spices', 'beverages', 'snacks',
      'frozen', 'canned', 'bakery', 'condiments', 'other'
    ]
  },
  
  subcategory: {
    type: String,
    trim: true
  },

  // Información nutricional (por 100g)
  nutrition: {
    calories: { type: Number, min: 0 },
    protein: { type: Number, min: 0 },
    carbohydrates: { type: Number, min: 0 },
    fat: { type: Number, min: 0 },
    fiber: { type: Number, min: 0 },
    sugar: { type: Number, min: 0 },
    sodium: { type: Number, min: 0 },
    saturatedFat: { type: Number, min: 0 },
    cholesterol: { type: Number, min: 0 },
    
    vitamins: {
      vitaminA: Number,
      vitaminC: Number,
      vitaminD: Number,
      vitaminE: Number,
      vitaminK: Number,
      thiamine: Number,
      riboflavin: Number,
      niacin: Number,
      vitaminB6: Number,
      folate: Number,
      vitaminB12: Number,
    },
    
    minerals: {
      calcium: Number,
      iron: Number,
      magnesium: Number,
      phosphorus: Number,
      potassium: Number,
      zinc: Number,
    }
  },

  // Ingredientes y alérgenos
  ingredients: {
    list: [String],
    allergens: [{
      type: String,
      enum: [
        'gluten', 'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 
        'peanuts', 'soy', 'sesame', 'sulfites', 'mustard', 'celery'
      ]
    }]
  },

  // Información de conservación
  storage: {
    temperature: {
      type: String,
      enum: ['room_temperature', 'refrigerated', 'frozen'],
      default: 'room_temperature'
    },
    shelfLife: {
      unopened: { type: Number },
      opened: { type: Number }
    },
    tips: {
      es: String,
      en: String,
      fr: String,
      pt: String
    }
  },

  // Información de sostenibilidad
  sustainability: {
    ecoScore: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E']
    },
    carbonFootprint: Number,
    packaging: {
      material: String,
      recyclable: Boolean
    },
    origin: {
      country: String,
      region: String,
      organic: Boolean,
      fairTrade: Boolean
    }
  },

  // Información de precios (opcional)
  pricing: {
    averagePrice: Number,
    currency: { type: String, default: 'EUR' },
    unit: { type: String, enum: ['kg', 'g', 'l', 'ml', 'unit'], default: 'unit' },
    lastUpdated: Date
  },

  // Metadatos de la API
  apiData: {
    source: {
      type: String,
      enum: ['openfoodfacts', 'fatsecret', 'spoonacular', 'manual', 'user_generated'],
      required: true
    },
    sourceId: String,
    lastSync: { type: Date, default: Date.now },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
    verified: { type: Boolean, default: false }
  },

  // Imágenes
  images: {
    thumbnail: String,
    main: String,
    nutrition: String,
    ingredients: String
  },

  // Estadísticas de uso
  stats: {
    scanCount: { type: Number, default: 0 },
    userCount: { type: Number, default: 0 },
    popularityScore: { type: Number, default: 0 },
    lastScanned: Date
  },

  // Control de calidad
  quality: {
    reportCount: { type: Number, default: 0 },
    reports: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: { type: String, enum: ['incorrect_info', 'missing_data', 'duplicate'] },
      description: String,
      createdAt: { type: Date, default: Date.now }
    }],
    needsReview: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
productSchema.index({ barcode: 1 });
productSchema.index({ 'names.es': 'text', 'names.en': 'text', brand: 'text' });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ 'stats.popularityScore': -1 });
productSchema.index({ 'apiData.source': 1, 'apiData.sourceId': 1 });

// Método para obtener nombre en idioma específico
productSchema.methods.getName = function(language: string = 'es'): string {
  return this.names[language as keyof IProductNames] || this.names.es || this.names.en || 'Producto sin nombre';
};

// Método para incrementar estadísticas de escaneo
productSchema.methods.incrementScanCount = function(): Promise<IProduct> {
  this.stats.scanCount += 1;
  this.stats.lastScanned = new Date();
  return this.save();
};

// Método para calcular score nutricional simplificado
productSchema.methods.getNutritionalScore = function(): EcoScore | null {
  if (!this.nutrition.calories) return null;
  
  let score = 0;
  const nutrition = this.nutrition;
  
  // Penalizar calorías altas, azúcar, sodio, grasa saturada
  if (nutrition.calories && nutrition.calories > 400) score -= 2;
  if (nutrition.sugar && nutrition.sugar > 15) score -= 2;
  if (nutrition.sodium && nutrition.sodium > 600) score -= 2;
  if (nutrition.saturatedFat && nutrition.saturatedFat > 5) score -= 1;
  
  // Premiar proteína, fibra
  if (nutrition.protein && nutrition.protein > 10) score += 2;
  if (nutrition.fiber && nutrition.fiber > 5) score += 1;
  
  // Normalizar a escala A-E
  if (score >= 2) return 'A';
  if (score >= 0) return 'B';
  if (score >= -2) return 'C';
  if (score >= -4) return 'D';
  return 'E';
};

// Método para verificar si contiene alérgenos específicos
productSchema.methods.containsAllergen = function(allergen: Allergen): boolean {
  return this.ingredients.allergens.includes(allergen);
};

// Método estático para buscar productos
productSchema.statics.searchProducts = function(query: string, language: string = 'es'): Promise<IProduct[]> {
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $or: [
      { [`names.${language}`]: searchRegex },
      { 'names.es': searchRegex },
      { 'names.en': searchRegex },
      { brand: searchRegex },
      { barcode: query }
    ]
  }).sort({ 'stats.popularityScore': -1 }).limit(20);
};

export default mongoose.model<IProduct, IProductModel>('Product', productSchema);