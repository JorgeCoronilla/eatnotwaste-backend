// FreshKeeper v2.0.0 - Database Types
// Extended types based on Prisma models

import type {
  User as PrismaUser,
  Product as PrismaProduct,
  UserItem as PrismaUserItem,
  ItemMovement as PrismaItemMovement,
  ProductCache as PrismaProductCache,
  UserDeviceToken as PrismaUserDeviceToken,
  NotificationHistory as PrismaNotificationHistory,
  UserNotificationSettings as PrismaUserNotificationSettings,
  ListType,
  ProductSource,
  MovementType,
  Platform,
  NotificationStatus,
} from '../config/database';

// Extended User type with computed properties (without sensitive data)
export interface UserWithStats extends Omit<PrismaUser, 'passwordHash'> {
  totalItems?: number;
  expiringItems?: number;
  recentActivity?: PrismaItemMovement[];
}

// Extended Product type with usage stats
export interface ProductWithUsage extends PrismaProduct {
  activeUsers?: number;
  lastUsed?: Date;
  averagePrice?: number;
}

// Extended UserItem with product details
export interface UserItemWithProduct extends PrismaUserItem {
  product: PrismaProduct;
  daysUntilExpiry?: number | null;
  isExpiringSoon?: boolean;
}

// Extended ItemMovement with related data
export interface ItemMovementWithDetails extends PrismaItemMovement {
  product: PrismaProduct;
  userItem?: PrismaUserItem;
}

// Dashboard data structure
export interface DashboardData {
  inventory: {
    totalItems: number;
    totalQuantity: number;
    expiringItems: number;
    categories: number;
  };
  expiryAlerts: {
    today: number;
    tomorrow: number;
    thisWeek: number;
  };
  recentActivity: Array<{
    id: string;
    type: MovementType;
    productName: string;
    productImage?: string | null;
    quantity: number;
    date: Date;
  }>;
  shoppingList: {
    totalItems: number;
  };
  statistics: {
    consumedThisWeek: number;
    topCategories: Array<{
      category: string;
      count: number;
    }>;
  };
  quickActions: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    route: string;
  }>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search and filter types
export interface ProductSearchFilters {
  query?: string;
  category?: string;
  source?: ProductSource;
  hasBarcode?: boolean;
  isVerified?: boolean;
}

export interface UserItemFilters {
  listType?: ListType;
  expiringBefore?: Date;
  category?: string;
  isConsumed?: boolean;
}

export interface ItemMovementFilters {
  movementType?: MovementType;
  fromDate?: Date;
  toDate?: Date;
  productId?: string;
}

// Notification types
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface ExpiryNotificationData {
  itemId: string;
  productName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
}

export interface ShoppingReminderData {
  itemCount: number;
  categories: string[];
}

export interface WeeklySummaryData {
  itemsAdded: number;
  itemsConsumed: number;
  wasteReduced: number;
  moneySaved: number;
  topCategories: string[];
}

// Cache types
export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  ttl: number;
}

// Export all Prisma types for convenience
export type {
  PrismaUser as User,
  PrismaProduct as Product,
  PrismaUserItem as UserItem,
  PrismaItemMovement as ItemMovement,
  PrismaProductCache as ProductCache,
  PrismaUserDeviceToken as UserDeviceToken,
  PrismaNotificationHistory as NotificationHistory,
  PrismaUserNotificationSettings as UserNotificationSettings,
  ListType,
  ProductSource,
  MovementType,
  Platform,
  NotificationStatus,
};