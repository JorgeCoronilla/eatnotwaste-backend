import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interfaces para TypeScript
export interface IUserPreferences {
  language: 'es' | 'en' | 'fr' | 'pt' | 'it' | 'de' | 'ca';
  timezone: string;
  currency: 'EUR' | 'USD' | 'GBP' | 'BRL' | 'MXN';
  units: 'metric' | 'imperial';
  notifications: {
    expiration: {
      enabled: boolean;
      daysBeforeExpiry: number;
    };
    lowStock: {
      enabled: boolean;
      threshold: number;
    };
    recipes: {
      enabled: boolean;
    };
    weekly: {
      enabled: boolean;
      day: 'monday' | 'sunday';
    };
  };
}

export interface IUserProfile {
  age?: number;
  weight?: number;
  height?: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'maintain' | 'lose_weight' | 'gain_weight' | 'gain_muscle';
  dietaryRestrictions: ('vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free' | 'nut_free' | 'keto' | 'paleo')[];
  allergies: string[];
}

export interface IUserStats {
  totalScans: number;
  recipesGenerated: number;
  wasteReduced: number;
  moneySaved: number;
  lastLogin: Date;
}

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  preferences: IUserPreferences;
  profile: IUserProfile;
  stats: IUserStats;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Métodos
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLoginStats(): Promise<IUser>;
  incrementStat(statName: keyof IUserStats, value?: number): Promise<IUser>;
  getNotificationSettings(): IUserPreferences['notifications'];
}

const userSchema = new Schema<IUser>({
  // Información básica
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  
  // Configuración de la aplicación
  preferences: {
    language: {
      type: String,
      enum: ['es', 'en', 'fr', 'pt', 'it', 'de', 'ca'],
      default: 'es'
    },
    timezone: {
      type: String,
      default: 'Europe/Madrid'
    },
    currency: {
      type: String,
      enum: ['EUR', 'USD', 'GBP', 'BRL', 'MXN'],
      default: 'EUR'
    },
    units: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric'
    },
    notifications: {
      expiration: {
        enabled: { type: Boolean, default: true },
        daysBeforeExpiry: { type: Number, default: 3 }
      },
      lowStock: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 2 }
      },
      recipes: {
        enabled: { type: Boolean, default: true }
      },
      weekly: {
        enabled: { type: Boolean, default: true },
        day: { type: String, enum: ['monday', 'sunday'], default: 'sunday' }
      }
    }
  },

  // Perfil nutricional (opcional)
  profile: {
    age: { type: Number, min: 13, max: 120 },
    weight: { type: Number, min: 30, max: 300 },
    height: { type: Number, min: 100, max: 250 },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      default: 'moderate'
    },
    goal: {
      type: String,
      enum: ['maintain', 'lose_weight', 'gain_weight', 'gain_muscle'],
      default: 'maintain'
    },
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'keto', 'paleo']
    }],
    allergies: [String]
  },

  // Estadísticas de uso
  stats: {
    totalScans: { type: Number, default: 0 },
    recipesGenerated: { type: Number, default: 0 },
    wasteReduced: { type: Number, default: 0 },
    moneySaved: { type: Number, default: 0 },
    lastLogin: { type: Date, default: Date.now }
  },

  // Configuración de cuenta
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  }
});

// Índices para optimizar consultas
userSchema.index({ email: 1 });
userSchema.index({ 'stats.lastLogin': -1 });

// Middleware para hashear contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    if (this.password) {
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para actualizar estadísticas de login
userSchema.methods.updateLoginStats = function(): Promise<IUser> {
  this.stats.lastLogin = new Date();
  return this.save();
};

// Método para incrementar estadísticas
userSchema.methods.incrementStat = function(statName: keyof IUserStats, value: number = 1) {
  if (this.stats[statName] !== undefined) {
    (this.stats[statName] as number) += value;
    return this.save();
  }
  return Promise.resolve(this);
};

// Método para obtener configuración de notificaciones
userSchema.methods.getNotificationSettings = function(): IUserPreferences['notifications'] {
  return this.preferences.notifications;
};

export default mongoose.model<IUser>('User', userSchema);