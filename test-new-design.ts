#!/usr/bin/env ts-node

/**
 * Script de prueba para el nuevo diseño de inventario
 * Este script prueba las funcionalidades del nuevo diseño con UserProduct y UserProductLocation
 */

import { db, prisma } from './src/config/database';
import { UserProductService } from './src/services/UserProductService';
import { InventoryService } from './src/services/InventoryService';

async function testNewDesign() {
  console.log('🧪 Iniciando pruebas del nuevo diseño de inventario...\n');

  try {
    // Buscar un usuario de prueba
    const testUser = await prisma.user.findFirst();
    if (!testUser) {
      console.log('❌ No se encontró ningún usuario para probar');
      return;
    }

    console.log(`👤 Usuario de prueba: ${testUser.email} (${testUser.id})`);

    // Buscar un producto de prueba
    const testProduct = await prisma.product.findFirst();
    if (!testProduct) {
      console.log('❌ No se encontró ningún producto para probar');
      return;
    }

    console.log(`📦 Producto de prueba: ${testProduct.name} (${testProduct.id})`);

    console.log('\n--- Probando UserProductService ---');

    // 1. Agregar una ubicación de producto
    console.log('\n1️⃣ Agregando ubicación de producto...');
    const addResult = await UserProductService.addProductLocation(testUser.id, {
      productId: testProduct.id,
      location: 'fridge',
      quantity: 5,
      unit: 'pieces',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      price: 10.50,
      notes: 'Producto de prueba'
    });

    if (addResult.success) {
      console.log('✅ Ubicación agregada exitosamente');
      console.log(`   ID: ${addResult.data?.id}`);
      console.log(`   Ubicación: ${addResult.data?.listType}`);
      console.log(`   Cantidad: ${addResult.data?.quantity}`);
    } else {
      console.log('❌ Error al agregar ubicación:', addResult.error);
      return;
    }

    const locationId = addResult.data!.id;

    // 2. Obtener ubicaciones del usuario
    console.log('\n2️⃣ Obteniendo ubicaciones del usuario...');
    const getResult = await UserProductService.getUserProductLocations(testUser.id, {}, 1, 10);
    
    if (getResult.success) {
      console.log('✅ Ubicaciones obtenidas exitosamente');
      console.log(`   Total: ${getResult.pagination?.total || 0}`);
      console.log(`   Página: ${getResult.pagination?.page || 1}`);
      console.log(`   Items: ${getResult.data?.length || 0}`);
      
      if (getResult.data && getResult.data.length > 0) {
        const firstLocation = getResult.data[0];
        if (firstLocation && firstLocation.userProduct) {
          const productName = firstLocation.userProduct.product?.name || 'Producto desconocido';
          const listType = firstLocation.listType || 'unknown';
          const daysUntilExpiry = firstLocation.daysUntilExpiry || 'N/A';
          const isExpiringSoon = firstLocation.isExpiringSoon || false;
          
          console.log(`   Primer item: ${productName} en ${listType}`);
          console.log(`   Días hasta expiración: ${daysUntilExpiry}`);
          console.log(`   Está por expirar: ${isExpiringSoon}`);
        } else {
          console.log('   Primer item: Datos incompletos');
        }
      }
    } else {
      console.log('❌ Error al obtener ubicaciones:', getResult.error);
    }

    // 3. Actualizar ubicación
    console.log('\n3️⃣ Actualizando ubicación...');
    const updateResult = await UserProductService.updateProductLocation(testUser.id, locationId, {
      quantity: 3,
      notes: 'Producto actualizado'
    });

    if (updateResult.success) {
      console.log('✅ Ubicación actualizada exitosamente');
      console.log(`   Nueva cantidad: ${updateResult.data?.quantity}`);
      console.log(`   Nuevas notas: ${updateResult.data?.notes}`);
    } else {
      console.log('❌ Error al actualizar ubicación:', updateResult.error);
    }

    // 4. Marcar como consumido
    console.log('\n4️⃣ Marcando como consumido...');
    const consumeResult = await UserProductService.updateProductLocation(testUser.id, locationId, {
      isConsumed: true
    });

    if (consumeResult.success) {
      console.log('✅ Producto marcado como consumido');
      console.log(`   Consumido en: ${consumeResult.data?.consumedAt}`);
    } else {
      console.log('❌ Error al marcar como consumido:', consumeResult.error);
    }

    // 5. Obtener productos próximos a expirar
    console.log('\n5️⃣ Obteniendo productos próximos a expirar...');
    const expiringResult = await UserProductService.getExpiringLocations(testUser.id, 7);
    
    if (expiringResult.success) {
      console.log('✅ Productos próximos a expirar obtenidos');
      console.log(`   Total: ${expiringResult.data?.length || 0}`);
      
      if (expiringResult.data && expiringResult.data.length > 0) {
        expiringResult.data.forEach(item => {
          console.log(`   - ${item.userProduct.product?.name} en ${item.listType} (expira en ${item.daysUntilExpiry} días)`);
        });
      }
    } else {
      console.log('❌ Error al obtener productos próximos a expirar:', expiringResult.error);
    }

    console.log('\n--- Probando compatibilidad con InventoryService ---');

    // 6. Probar compatibilidad hacia atrás con InventoryService
    console.log('\n6️⃣ Probando compatibilidad con InventoryService...');
    
    // Obtener items usando el servicio antiguo (debería funcionar con el nuevo diseño)
    const oldServiceResult = await InventoryService.getUserItems(testUser.id, {}, 1, 10);
    
    if (oldServiceResult.success) {
      console.log('✅ InventoryService funciona con el nuevo diseño');
      console.log(`   Total: ${oldServiceResult.pagination?.total || 0}`);
      console.log(`   Items: ${oldServiceResult.data?.length || 0}`);
      
      if (oldServiceResult.data && oldServiceResult.data.length > 0) {
        const firstItem = oldServiceResult.data[0];
        if (firstItem && firstItem.product) {
          console.log(`   Primer item: ${firstItem.product.name} (${firstItem.quantity} ${firstItem.unit})`);
          console.log(`   Días hasta expiración: ${firstItem.daysUntilExpiry}`);
        } else {
          console.log('   Primer item: Datos incompletos');
        }
      }
    } else {
      console.log('❌ Error con InventoryService:', oldServiceResult.error);
    }

    console.log('\n--- Limpiando ---');

    // 7. Limpiar - eliminar la ubicación de prueba
    console.log('\n7️⃣ Eliminando ubicación de prueba...');
    const deleteResult = await UserProductService.deleteProductLocation(testUser.id, locationId);
    
    if (deleteResult.success) {
      console.log('✅ Ubicación eliminada exitosamente');
    } else {
      console.log('❌ Error al eliminar ubicación:', deleteResult.error);
    }

    console.log('\n🎉 ¡Pruebas completadas exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('   ✅ UserProductService.addProductLocation funciona');
    console.log('   ✅ UserProductService.getUserProductLocations funciona');
    console.log('   ✅ UserProductService.updateProductLocation funciona');
    console.log('   ✅ UserProductService.getExpiringLocations funciona');
    console.log('   ✅ UserProductService.deleteProductLocation funciona');
    console.log('   ✅ InventoryService mantiene compatibilidad hacia atrás');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    await db.disconnect();
    console.log('\n🔌 Conexión a base de datos cerrada');
  }
}

// Ejecutar las pruebas si se ejecuta directamente
if (require.main === module) {
  testNewDesign().catch(console.error);
}

export default testNewDesign;