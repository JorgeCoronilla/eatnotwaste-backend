import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkUser(email: string) {
  try {
    console.log(`🔍 Buscando usuario: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        language: true,
        timezone: true,
        preferences: true
      }
    });

    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log('-------------------');
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Nombre: ${user.name}`);
      console.log(`Activo: ${user.isActive}`);
      console.log(`Email verificado: ${user.emailVerified}`);
      console.log(`Último login: ${user.lastLogin || 'Nunca'}`);
      console.log(`Creado: ${user.createdAt}`);
      console.log(`Actualizado: ${user.updatedAt}`);
      console.log(`Idioma: ${user.language}`);
      console.log(`Zona horaria: ${user.timezone}`);
      console.log(`Preferencias: ${JSON.stringify(user.preferences, null, 2)}`);
    } else {
      console.log('❌ Usuario NO encontrado en la base de datos');
    }

    // También verificar todos los usuarios para debug
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('\n📋 Últimos 10 usuarios registrados:');
    console.log('-----------------------------------');
    allUsers.forEach((u, index) => {
      console.log(`${index + 1}. ${u.email} (${u.name}) - ${u.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener email del argumento de línea de comandos o usar el por defecto
const emailToCheck = process.argv[2] || 'jorge@stampit.co';
checkUser(emailToCheck);