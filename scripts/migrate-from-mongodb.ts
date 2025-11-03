import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface MongoUser {
  _id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  preferences?: any;
  nutritionalProfile?: any;
  stats?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MongoProduct {
  _id: string;
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  nutrition?: any;
  images?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface MongoInventory {
  _id: string;
  userId: string;
  productId: string;
  quantity: number;
  unit?: string;
  purchaseDate?: Date;
  expiryDate?: Date;
  location?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class MongoDBMigrator {
  private mongoClient: MongoClient;
  private mongoDb: any;

  constructor() {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está configurada');
    }
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
  }

  async connect() {
    await this.mongoClient.connect();
    this.mongoDb = this.mongoClient.db();
    console.log('Conectado a MongoDB');
  }

  async disconnect() {
    await this.mongoClient.close();
    await prisma.$disconnect();
    console.log('Desconectado de las bases de datos');
  }

  async migrateUsers() {
    console.log('Migrando usuarios...');
    
    const users = await this.mongoDb.collection('users').find({}).toArray();
    console.log(`Encontrados ${users.length} usuarios`);

    for (const user of users) {
      try {
        await prisma.user.create({
          data: {
            id: user._id.toString(),
            email: user.email,
            password: user.password, // Ya está hasheado
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role || 'USER',
            preferences: user.preferences || {},
            nutritionalProfile: user.nutritionalProfile || {},
            stats: user.stats || {},
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || new Date(),
          },
        });
        console.log(`Usuario migrado: ${user.email}`);
      } catch (error) {
        console.error(`Error migrando usuario ${user.email}:`, error);
      }
    }
  }

  async migrateProducts() {
    console.log('Migrando productos...');
    
    const products = await this.mongoDb.collection('products').find({}).toArray();
    console.log(`Encontrados ${products.length} productos`);

    for (const product of products) {
      try {
        await prisma.product.create({
          data: {
            id: product._id.toString(),
            barcode: product.barcode,
            name: product.name,
            brand: product.brand,
            category: product.category,
            nutrition: product.nutrition || {},
            images: product.images || [],
            createdAt: product.createdAt || new Date(),
            updatedAt: product.updatedAt || new Date(),
          },
        });
        console.log(`Producto migrado: ${product.name}`);
      } catch (error) {
        console.error(`Error migrando producto ${product.name}:`, error);
      }
    }
  }

  async migrateInventory() {
    console.log('Migrando inventario...');
    
    const inventoryItems = await this.mongoDb.collection('inventory').find({}).toArray();
    console.log(`Encontrados ${inventoryItems.length} items de inventario`);

    for (const item of inventoryItems) {
      try {
        await prisma.inventory.create({
          data: {
            id: item._id.toString(),
            userId: item.userId.toString(),
            productId: item.productId.toString(),
            quantity: item.quantity,
            unit: item.unit || 'units',
            purchaseDate: item.purchaseDate,
            expiryDate: item.expiryDate,
            location: item.location,
            notes: item.notes,
            createdAt: item.createdAt || new Date(),
            updatedAt: item.updatedAt || new Date(),
          },
        });
        console.log(`Item de inventario migrado: ${item._id}`);
      } catch (error) {
        console.error(`Error migrando item de inventario ${item._id}:`, error);
      }
    }
  }

  async validateMigration() {
    console.log('Validando migración...');
    
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const inventoryCount = await prisma.inventory.count();
    
    const mongoUserCount = await this.mongoDb.collection('users').countDocuments();
    const mongoProductCount = await this.mongoDb.collection('products').countDocuments();
    const mongoInventoryCount = await this.mongoDb.collection('inventory').countDocuments();
    
    console.log('Resultados de la migración:');
    console.log(`Usuarios: ${userCount}/${mongoUserCount}`);
    console.log(`Productos: ${productCount}/${mongoProductCount}`);
    console.log(`Inventario: ${inventoryCount}/${mongoInventoryCount}`);
    
    return {
      users: userCount === mongoUserCount,
      products: productCount === mongoProductCount,
      inventory: inventoryCount === mongoInventoryCount,
    };
  }

  async run() {
    try {
      await this.connect();
      
      // Limpiar base de datos PostgreSQL
      console.log('Limpiando base de datos PostgreSQL...');
      await prisma.inventory.deleteMany();
      await prisma.product.deleteMany();
      await prisma.user.deleteMany();
      
      // Migrar datos
      await this.migrateUsers();
      await this.migrateProducts();
      await this.migrateInventory();
      
      // Validar migración
      const validation = await this.validateMigration();
      
      if (validation.users && validation.products && validation.inventory) {
        console.log('✅ Migración completada exitosamente');
      } else {
        console.log('⚠️ Migración completada con advertencias');
      }
      
    } catch (error) {
      console.error('Error durante la migración:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  const migrator = new MongoDBMigrator();
  migrator.run().catch(console.error);
}

export default MongoDBMigrator;