// Script de inicialización para MongoDB
// Este script se ejecuta automáticamente cuando se crea el contenedor

// Crear usuario para la aplicación
db = db.getSiblingDB('freshkeeper');

db.createUser({
  user: 'freshkeeper_app',
  pwd: 'freshkeeper123',
  roles: [
    {
      role: 'readWrite',
      db: 'freshkeeper'
    }
  ]
});

// Crear colecciones con validación
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'displayName'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        displayName: {
          bsonType: 'string',
          minLength: 1
        }
      }
    }
  }
});

db.createCollection('products', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 1
        },
        barcode: {
          bsonType: 'string'
        }
      }
    }
  }
});

db.createCollection('inventory', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'productId', 'quantity'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        productId: {
          bsonType: 'objectId'
        },
        quantity: {
          bsonType: 'object',
          required: ['value', 'unit'],
          properties: {
            value: {
              bsonType: 'number',
              minimum: 0
            },
            unit: {
              bsonType: 'string',
              enum: ['kg', 'g', 'l', 'ml', 'unit', 'package']
            }
          }
        }
      }
    }
  }
});

// Crear índices optimizados
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ 'stats.lastLogin': -1 });

db.products.createIndex({ barcode: 1 }, { unique: true, sparse: true });
db.products.createIndex({ name: 'text', 'names.es': 'text', 'names.en': 'text' });
db.products.createIndex({ category: 1 });

db.inventory.createIndex({ userId: 1, expirationDate: 1 });
db.inventory.createIndex({ userId: 1, status: 1 });
db.inventory.createIndex({ userId: 1, location: 1 });
db.inventory.createIndex({ expirationDate: 1, status: 1 });

print('✅ MongoDB inicializado correctamente para FreshKeeper');
print('📊 Colecciones creadas: users, products, inventory');
print('🔍 Índices optimizados creados');
print('👤 Usuario de aplicación: freshkeeper_app');