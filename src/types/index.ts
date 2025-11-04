import { Request } from 'express';

// Tipos de usuario
export interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  role: 'user' | 'admin' | 'moderator';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  preferences: {
    language: 'es' | 'en' | 'fr' | 'pt';
    units: 'metric' | 'imperial';
    notifications: {
      expiration: boolean;
      lowStock: boolean;
      recipes: boolean;
      marketing: boolean;
    };
    privacy: {
      shareData: boolean;
      analytics: boolean;
    };
  };
  nutritionalProfile?: {
    allergies: string[];
    dietaryRestrictions: string[];
    healthGoals: string[];
    dailyCalorieTarget?: number;
  };
  stats: {
    totalScans: number;
    totalProducts: number;
    lastLoginAt?: Date;
    loginCount: number;
    accountCreatedAt: Date;
  };
  isActive: boolean;
  lastActiveAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLoginStats(): Promise<void>;
  updateNotificationSettings(settings: Partial<IUser['preferences']['notifications']>): Promise<void>;
}

// Tipos de producto
export interface INutrition {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
  servingSize?: string;
  servingsPerContainer?: number;
}

export interface IProduct {
  barcode: string;
  names: {
    es?: string;
    en?: string;
    fr?: string;
    pt?: string;
  };
  brand?: string;
  category: string;
  nutrition: INutrition;
  ingredients?: string[];
  allergens?: string[];
  storage?: {
    temperature?: 'room' | 'refrigerated' | 'frozen';
    humidity?: 'low' | 'medium' | 'high';
    instructions?: string;
    shelfLife?: number; // días
  };
  sustainability?: {
    ecoScore?: string;
    carbonFootprint?: number;
    packaging?: string[];
  };
  pricing?: {
    averagePrice?: number;
    currency?: string;
    pricePerUnit?: number;
    unit?: string;
  };
  apiData: {
    source: 'openfoodfacts' | 'fatsecret' | 'spoonacular' | 'manual';
    sourceId?: string;
    lastUpdated: Date;
    confidence: number;
  };
  images?: {
    thumbnail?: string;
    full?: string;
    nutrition?: string;
  };
  stats: {
    scanCount: number;
    popularityScore: number;
    lastScannedAt?: Date;
  };
  quality: {
    isVerified: boolean;
    reportCount: number;
    lastReportedAt?: Date;
  };
  getNameInLanguage(language: string): string;
  incrementScanCount(): Promise<void>;
  calculateNutritionalScore(): number;
  hasAllergen(allergen: string): boolean;
}

// Tipos de inventario
export interface IInventory {
  userId: string;
  productId: string;
  quantity: number;
  unit: string;
  purchaseDate: Date;
  expirationDate?: Date;
  openedDate?: Date;
  purchase: {
    store?: string;
    price?: number;
    currency?: string;
  };
  location: {
    type: 'pantry' | 'refrigerator' | 'freezer' | 'other';
    specific?: string;
  };
  status: 'fresh' | 'expiring_soon' | 'expired' | 'consumed' | 'wasted';
  notes?: string;
  alerts: {
    expirationAlert: boolean;
    lowStockAlert: boolean;
    alertDays: number;
  };
  consumption: {
    consumedAt?: Date;
    consumedQuantity?: number;
    wasteReason?: string;
  };
  addedBy: 'scan' | 'manual' | 'recipe' | 'import';
  consumeItem(quantity: number, reason?: string): Promise<void>;
  checkAlerts(): { expiring: boolean; lowStock: boolean };
  getDaysUntilExpiry(): number | null;
  calculateWasteValue(): number;
}

// Tipos de API externa
export interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name?: string;
    product_name_es?: string;
    product_name_en?: string;
    product_name_fr?: string;
    product_name_pt?: string;
    brands?: string;
    categories?: string;
    nutriments?: Record<string, number>;
    ingredients_text?: string;
    allergens?: string;
    image_url?: string;
    image_nutrition_url?: string;
    ecoscore_grade?: string;
    nova_group?: number;
  };
  status: number;
  status_verbose: string;
}

// Tipos de request extendidos
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    preferences: IUser['preferences'];
  };
}

// Tipos de respuesta API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Tipos de validación
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Tipos de configuración
export interface DatabaseConfig {
  uri: string;
  options?: Record<string, any>;
}

export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

// Tipos de servicios externos
export interface ExternalAPIConfig {
  openFoodFacts: {
    baseUrl: string;
  };
  fatSecret: {
    clientId: string;
    clientSecret: string;
  };
  spoonacular: {
    apiKey: string;
  };
}

// Tipos de estadísticas
export interface UserStats {
  totalScans: number;
  totalProducts: number;
  wasteReduced: number;
  moneySaved: number;
  streakDays: number;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
}

export interface InventoryStats {
  totalItems: number;
  expiringItems: number;
  expiredItems: number;
  totalValue: number;
  wasteValue: number;
  byLocation: Record<string, number>;
  byCategory: Record<string, number>;
}

// Tipos de filtros y búsqueda
export interface ProductSearchFilters {
  category?: string;
  brand?: string;
  allergens?: string[];
  minCalories?: number;
  maxCalories?: number;
  hasNutrition?: boolean;
}

export interface InventoryFilters {
  location?: string;
  status?: IInventory['status'];
  category?: string;
  expiringInDays?: number;
  addedAfter?: Date;
  addedBefore?: Date;
}

// Tipos de paginación
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Tipos de notificaciones
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  userId: string;
  type: 'expiration' | 'low_stock' | 'recipe' | 'general';
}