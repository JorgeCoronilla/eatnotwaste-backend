import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando migración de UserItem hacia UserProduct/UserProductLocation...');
  
  const userItems = await prisma.userItem.findMany({
    include: {
      movements: true
    }
  });
  console.log(`Encontrados ${userItems.length} UserItems para migrar.`);

  let migratedCount = 0;

  for (const item of userItems) {
    try {
      // 1. Buscar o crear el UserProduct
      const userProduct = await prisma.userProduct.upsert({
        where: {
          userId_productId: {
            userId: item.userId,
            productId: item.productId
          }
        },
        update: {
          lastUsed: new Date(), // Actualizar fecha de último uso
        },
        create: {
          userId: item.userId,
          productId: item.productId,
          isActive: true,
          firstAdded: item.createdAt,
          lastUsed: item.updatedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      });

      // 2. Crear la entrada en UserProductLocation copiando exactamente los datos
      const location = await prisma.userProductLocation.create({
        data: {
          userProductId: userProduct.id,
          listType: item.listType as any,
          quantity: item.quantity,
          unit: item.unit,
          purchaseDate: item.purchaseDate,
          expiryDate: item.expiryDate,
          price: item.price,
          store: item.store,
          notes: item.notes,
          isConsumed: item.isConsumed,
          consumedAt: item.consumedAt,
          addedAt: item.createdAt,
          updatedAt: item.updatedAt,
        }
      });

      // 3. Re-vincular los movimientos del viejo item a la nueva localización
      if (item.movements.length > 0) {
        await prisma.itemMovement.updateMany({
          where: { userItemId: item.id },
          data: { userProductLocationId: location.id }
        });
      }

      migratedCount++;
    } catch (err) {
      console.error(`Error migrando UserItem ID ${item.id}:`, err);
    }
  }

  console.log(`Migración completada. ${migratedCount} de ${userItems.length} registros migrados con éxito.`);
}

main()
  .catch(e => {
    console.error('Error fatal durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
