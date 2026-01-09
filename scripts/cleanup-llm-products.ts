import 'dotenv/config';
import { prisma } from '../src/config/database';

async function main() {
  console.log('🔎 Listando productos con source=llm...');
  const count = await prisma.product.count({ where: { source: 'llm' } });
  console.log(`Encontrados ${count} productos LLM.`);

  if (count === 0) {
    console.log('No hay productos LLM para eliminar.');
    return;
  }

  const sample = await prisma.product.findMany({
    where: { source: 'llm' },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  console.log('Ejemplos de productos a eliminar (máx 20):');
  for (const p of sample) {
    console.log(`- ${p.name} (${p.id}) creado el ${p.createdAt.toISOString()}`);
  }

  console.log('🗑️ Eliminando productos LLM...');
  const result = await prisma.product.deleteMany({ where: { source: 'llm' } });
  console.log(`Eliminados ${result.count} productos LLM.`);

  const remaining = await prisma.product.count({ where: { source: 'llm' } });
  console.log(`Verificación: quedan ${remaining} productos LLM.`);
}

main()
  .catch((err) => {
    console.error('Error en limpieza de productos LLM:', err);
    // Re-lanzar para provocar salida no exitosa sin depender de tipos Node
    throw err;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });