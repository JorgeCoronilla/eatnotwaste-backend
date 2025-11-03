import mongoose, { Document, Schema, Model } from 'mongoose';

// Tipos para enums
export type QuantityUnit = 'kg' | 'g' | 'l' | 'ml' | 'unit' | 'package';
export type InventoryLocation = 'fridge' | 'freezer' | 'pantry' | 'counter' | 'other';
export type InventoryStatus = 'fresh' | 'near_expiry' | 'expired' | 'consumed' | 'discarded';
export type ConsumptionAction = 'consumed' | 'discarded' | 'donated' | 'cooked';
export type AddMethod = 'barcode_scan' | 'photo_recognition' | 'voice_input' | 'manual_entry' | 'shopping_list';

// Interfaces
export interface IQuantity {
  value: number;
  unit: QuantityUnit;
}

export interface IPurchase {
  price?: number;
  currency: string;
  store?: string;
  batch?: string;
}

export interface IAlerts {
  enabled: boolean;
  daysBeforeExpiry: number;
  notificationSent: boolean;
  lastNotification?: Date;
}

export interface IConsumption {
  date: Date;
  quantity: IQuantity;
  action: ConsumptionAction;
  reason?: string;
  recipe?: mongoose.Types.ObjectId;
}

export interface IAddedBy {
  method: AddMethod;
  confidence: number;
  originalImage?: string;
}

export interface IInventoryItem extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: IQuantity;
  purchaseDate: Date;
  expirationDate: Date;
  openedDate?: Date;
  purchase: IPurchase;
  location: InventoryLocation;
  status: InventoryStatus;
  notes?: string;
  alerts: IAlerts;
  consumption: IConsumption[];
  addedBy: IAddedBy;
  createdAt: Date;
  updatedAt: Date;

  // Métodos de instancia
  consume(quantity: number, unit: QuantityUnit, action?: ConsumptionAction, reason?: string, recipeId?: mongoose.Types.ObjectId): Promise<IInventoryItem>;
  needsAlert(): boolean;
  markAlertSent(): Promise<IInventoryItem>;
  getDaysUntilExpiry(): number;
  getWasteValue(): number;
  getTotalConsumed(): number;
}

export interface IInventoryModel extends Model<IInventoryItem> {
  getExpiringItems(userId: mongoose.Types.ObjectId, days?: number): Promise<IInventoryItem[]>;
  getInventoryByLocation(userId: mongoose.Types.ObjectId, location: InventoryLocation): Promise<IInventoryItem[]>;
  getInventoryByCategory(userId: mongoose.Types.ObjectId, category: string): Promise<IInventoryItem[]>;
  getWasteStats(userId: mongoose.Types.ObjectId, startDate: Date, endDate: Date): Promise<any[]>;
}

const inventoryItemSchema = new Schema<IInventoryItem>({
  // Referencia al usuario
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Referencia al producto
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },

  // Información específica del item en inventario
  quantity: {
    value: { type: Number, required: true, min: 0 },
    unit: { 
      type: String, 
      enum: ['kg', 'g', 'l', 'ml', 'unit', 'package'], 
      default: 'unit' 
    }
  },

  // Fechas importantes
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  
  expirationDate: {
    type: Date,
    required: [true, 'La fecha de caducidad es requerida']
  },

  openedDate: {
    type: Date
  },

  // Información de compra
  purchase: {
    price: { type: Number, min: 0 },
    currency: { type: String, default: 'EUR' },
    store: String,
    batch: String
  },

  // Ubicación en casa
  location: {
    type: String,
    enum: ['fridge', 'freezer', 'pantry', 'counter', 'other'],
    default: 'pantry'
  },

  // Estado del producto
  status: {
    type: String,
    enum: ['fresh', 'near_expiry', 'expired', 'consumed', 'discarded'],
    default: 'fresh'
  },

  // Notas del usuario
  notes: {
    type: String,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
  },

  // Alertas configuradas
  alerts: {
    enabled: { type: Boolean, default: true },
    daysBeforeExpiry: { type: Number, default: 3 },
    notificationSent: { type: Boolean, default: false },
    lastNotification: Date
  },

  // Historial de consumo
  consumption: [{
    date: { type: Date, default: Date.now },
    quantity: {
      value: { type: Number, required: true },
      unit: { type: String, required: true }
    },
    action: { 
      type: String, 
      enum: ['consumed', 'discarded', 'donated', 'cooked'],
      required: true 
    },
    reason: String,
    recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }
  }],

  // Metadatos
  addedBy: {
    method: {
      type: String,
      enum: ['barcode_scan', 'photo_recognition', 'voice_input', 'manual_entry', 'shopping_list'],
      required: true
    },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
    originalImage: String
  }
}, {
  timestamps: true
});

// Índices compuestos para optimizar consultas
inventoryItemSchema.index({ userId: 1, status: 1 });
inventoryItemSchema.index({ userId: 1, expirationDate: 1 });
inventoryItemSchema.index({ userId: 1, location: 1 });
inventoryItemSchema.index({ expirationDate: 1, 'alerts.enabled': 1 });

// Middleware para actualizar estado basado en fecha de caducidad
inventoryItemSchema.pre('save', function(next) {
  const now = new Date();
  const expiry = new Date(this.expirationDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Actualizar estado automáticamente
  if (this.status === 'fresh' || this.status === 'near_expiry') {
    if (daysUntilExpiry < 0) {
      this.status = 'expired';
    } else if (daysUntilExpiry <= this.alerts.daysBeforeExpiry) {
      this.status = 'near_expiry';
    } else {
      this.status = 'fresh';
    }
  }

  next();
});

// Método para consumir cantidad del producto
inventoryItemSchema.methods.consume = function(
  quantity: number, 
  unit: QuantityUnit, 
  action: ConsumptionAction = 'consumed', 
  reason?: string, 
  recipeId?: mongoose.Types.ObjectId
): Promise<IInventoryItem> {
  // Validar que hay suficiente cantidad
  if (this.quantity.unit === unit && this.quantity.value < quantity) {
    throw new Error('Cantidad insuficiente en inventario');
  }

  // Registrar consumo
  this.consumption.push({
    quantity: { value: quantity, unit: unit },
    action: action,
    reason: reason,
    recipe: recipeId,
    date: new Date()
  });

  // Actualizar cantidad restante
  if (this.quantity.unit === unit) {
    this.quantity.value -= quantity;
    
    // Si se consumió todo, marcar como consumido
    if (this.quantity.value <= 0) {
      this.status = 'consumed';
      this.quantity.value = 0;
    }
  }

  return this.save();
};

// Método para verificar si necesita alerta
inventoryItemSchema.methods.needsAlert = function(): boolean {
  if (!this.alerts.enabled || this.alerts.notificationSent) {
    return false;
  }

  const now = new Date();
  const expiry = new Date(this.expirationDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return daysUntilExpiry <= this.alerts.daysBeforeExpiry && daysUntilExpiry >= 0;
};

// Método para marcar alerta como enviada
inventoryItemSchema.methods.markAlertSent = function(): Promise<IInventoryItem> {
  this.alerts.notificationSent = true;
  this.alerts.lastNotification = new Date();
  return this.save();
};

// Método para obtener días hasta caducidad
inventoryItemSchema.methods.getDaysUntilExpiry = function(): number {
  const now = new Date();
  const expiry = new Date(this.expirationDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// Método para calcular valor monetario perdido
inventoryItemSchema.methods.getWasteValue = function(): number {
  if (this.status !== 'discarded' && this.status !== 'expired') {
    return 0;
  }

  const totalConsumed = this.getTotalConsumed();
  const remainingRatio = this.quantity.value / (this.quantity.value + totalConsumed);
  return (this.purchase.price || 0) * remainingRatio;
};

// Método para obtener total consumido
inventoryItemSchema.methods.getTotalConsumed = function(): number {
  return this.consumption.reduce((total: number, consumption: IConsumption) => {
    if (consumption.quantity.unit === this.quantity.unit) {
      return total + consumption.quantity.value;
    }
    return total;
  }, 0);
};

// Métodos estáticos para consultas comunes
inventoryItemSchema.statics.getExpiringItems = function(
  userId: mongoose.Types.ObjectId, 
  days: number = 3
): Promise<IInventoryItem[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    userId: userId,
    expirationDate: { $lte: futureDate },
    status: { $in: ['fresh', 'near_expiry'] }
  }).populate('productId').sort({ expirationDate: 1 });
};

inventoryItemSchema.statics.getInventoryByLocation = function(
  userId: mongoose.Types.ObjectId, 
  location: InventoryLocation
): Promise<IInventoryItem[]> {
  return this.find({
    userId: userId,
    location: location,
    status: { $in: ['fresh', 'near_expiry'] }
  }).populate('productId').sort({ expirationDate: 1 });
};

inventoryItemSchema.statics.getInventoryByCategory = function(
  userId: mongoose.Types.ObjectId, 
  category: string
): Promise<IInventoryItem[]> {
  return this.find({
    userId: userId,
    status: { $in: ['fresh', 'near_expiry'] }
  }).populate({
    path: 'productId',
    match: { category: category }
  }).sort({ expirationDate: 1 });
};

// Método estático para estadísticas de desperdicio
inventoryItemSchema.statics.getWasteStats = function(
  userId: mongoose.Types.ObjectId, 
  startDate: Date, 
  endDate: Date
): Promise<any[]> {
  return this.aggregate([
    {
      $match: {
        userId: userId,
        status: { $in: ['discarded', 'expired'] },
        updatedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalValue: { $sum: '$purchase.price' },
        categories: { $push: '$productId.category' }
      }
    }
  ]);
};

export default mongoose.model<IInventoryItem, IInventoryModel>('InventoryItem', inventoryItemSchema);