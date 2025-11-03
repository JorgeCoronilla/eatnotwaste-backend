import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

class DatabaseSetup {
  async createAdminUser() {
    console.log('Creando usuario administrador...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@freshkeeper.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingAdmin) {
      console.log('Usuario administrador ya existe');
      return;
    }
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        name: 'Administrador',
        language: 'es',
        timezone: 'America/Mexico_City',
        preferences: {
          role: 'admin',
          theme: 'light',
          notifications: true
        }
      }
    });
    
    console.log(`✅ Usuario administrador creado: ${adminEmail}`);
  }
  
  async createSampleProducts() {
    console.log('Creando productos de ejemplo...');
    
    const sampleProducts = [
      {
        barcode: '1234567890123',
        name: 'Leche Entera',
        brand: 'La Serenísima',
        category: 'Lácteos',
        nutritionalInfo: {
          calories: 60,
          protein: 3.2,
          carbs: 4.8,
          fat: 3.2,
          fiber: 0,
          sugar: 4.8
        },
        imageUrl: null
      },
      {
        barcode: '2345678901234',
        name: 'Pan Integral',
        brand: 'Bimbo',
        category: 'Panadería',
        nutritionalInfo: {
          calories: 247,
          protein: 13,
          carbs: 41,
          fat: 4.2,
          fiber: 7,
          sugar: 6
        },
        imageUrl: null
      },
      {
        barcode: '3456789012345',
        name: 'Manzanas Rojas',
        brand: 'Frutas del Valle',
        category: 'Frutas',
        nutritionalInfo: {
          calories: 52,
          protein: 0.3,
          carbs: 14,
          fat: 0.2,
          fiber: 2.4,
          sugar: 10
        },
        imageUrl: null
      },
      {
        barcode: '4567890123456',
        name: 'Yogur Natural',
        brand: 'Danone',
        category: 'Lácteos',
        nutritionalInfo: {
          calories: 59,
          protein: 10,
          carbs: 3.6,
          fat: 0.4,
          fiber: 0,
          sugar: 3.6
        },
        imageUrl: null
      },
      {
        barcode: '5678901234567',
        name: 'Arroz Integral',
        brand: 'Gallo',
        category: 'Cereales',
        nutritionalInfo: {
          calories: 111,
          protein: 2.6,
          carbs: 23,
          fat: 0.9,
          fiber: 1.8,
          sugar: 0.4
        },
        imageUrl: null
      }
    ];
    
    for (const product of sampleProducts) {
      const existing = await prisma.product.findFirst({
        where: { barcode: product.barcode }
      });
      
      if (!existing) {
        await prisma.product.create({ data: product });
        console.log(`✅ Producto creado: ${product.name}`);
      }
    }
  }
  
  async createTestUser() {
    console.log('Creando usuario de prueba...');
    
    const testEmail = 'test@freshkeeper.com';
    const testPassword = 'test123';
    
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (existingUser) {
      console.log('Usuario de prueba ya existe');
      return existingUser;
    }
    
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: hashedPassword,
        name: 'Usuario de Prueba',
        language: 'es',
        timezone: 'America/Mexico_City',
        preferences: {
          role: 'user',
          theme: 'light',
          notifications: true
        }
      }
    });
    
    console.log(`✅ Usuario de prueba creado: ${testEmail}`);
    return testUser;
  }
  
  async createSampleInventory() {
    console.log('Creando inventario de ejemplo...');
    
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@freshkeeper.com' }
    });
    
    if (!testUser) {
      console.log('Usuario de prueba no encontrado, saltando inventario de ejemplo');
      return;
    }
    
    const products = await prisma.product.findMany({ take: 3 });
    
    if (products.length < 3) {
      console.log('No hay suficientes productos disponibles para crear inventario');
      return;
    }
    
    const sampleInventory = [
      {
        userId: testUser.id,
        productId: products[0]!.id,
        listType: 'fridge' as const,
        quantity: 1,
        unit: 'litros',
        purchaseDate: new Date(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        notes: 'Comprado en el supermercado'
      },
      {
        userId: testUser.id,
        productId: products[1]!.id,
        listType: 'pantry' as const,
        quantity: 1,
        unit: 'unidades',
        purchaseDate: new Date(),
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
        notes: 'Pan fresco'
      },
      {
        userId: testUser.id,
        productId: products[2]!.id,
        listType: 'fridge' as const,
        quantity: 6,
        unit: 'unidades',
        purchaseDate: new Date(),
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 días
        notes: 'Manzanas para la semana'
      }
    ];
    
    for (const item of sampleInventory) {
      await prisma.userItem.create({ data: item });
      console.log(`✅ Item de inventario creado para producto ${item.productId}`);
    }
  }
  
  async run() {
    try {
      console.log('🚀 Iniciando configuración de base de datos...');
      
      await this.createAdminUser();
      await this.createSampleProducts();
      await this.createTestUser();
      await this.createSampleInventory();
      
      console.log('✅ Configuración de base de datos completada');
      
      // Mostrar estadísticas
      const userCount = await prisma.user.count();
      const productCount = await prisma.product.count();
      const inventoryCount = await prisma.userItem.count();
      
      console.log('\n📊 Estadísticas de la base de datos:');
      console.log(`Usuarios: ${userCount}`);
      console.log(`Productos: ${productCount}`);
      console.log(`Items de inventario: ${inventoryCount}`);
      
    } catch (error) {
      console.error('❌ Error durante la configuración:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Ejecutar configuración si se llama directamente
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.run().catch(console.error);
}

export default DatabaseSetup;