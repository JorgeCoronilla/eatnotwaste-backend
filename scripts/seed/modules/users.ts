import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export async function seedUsers() {
  console.log('👤 Seeding Users (Admin & Test)...');

  // 1. Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@freshkeeper.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        name: 'Administrador',
        language: 'es',
        timezone: 'Europe/Madrid',
        role: 'admin',
        preferences: { role: 'admin', theme: 'light', notifications: true }
      }
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log('ℹ️ Admin user already exists.');
  }

  // 2. Test User
  const testEmail = 'test@freshkeeper.com';
  const testPassword = 'test123';
  
  const existingTest = await prisma.user.findUnique({ where: { email: testEmail } });
  
  if (!existingTest) {
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: hashedPassword,
        name: 'Usuario de Prueba',
        language: 'es',
        timezone: 'Europe/Madrid',
        role: 'user',
        preferences: { role: 'user', theme: 'light', notifications: true }
      }
    });
    console.log(`✅ Test user created: ${testEmail}`);
  } else {
    console.log('ℹ️ Test user already exists.');
  }
}
