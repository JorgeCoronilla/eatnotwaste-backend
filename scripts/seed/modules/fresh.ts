import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { ProductService } from '../../../src/services/ProductService'; // Adjust path if needed

const prisma = new PrismaClient();

export async function seedFreshProducts() {
  console.log('🍎 Seeding Fresh Products from JSON...');
  
  const jsonPath = path.join(__dirname, '../data/fresh-products.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found at: ${jsonPath}`);
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const products = JSON.parse(rawData);

  console.log(`📦 Found ${products.length} fresh products to seed.`);

  let count = 0;
  for (const p of products) {
    try {
        // We use upsert to be safe
        await prisma.product.upsert({
            where: { id: p.id },
            update: {
                name: p.name,
                category: p.category,
                description: p.description,
                ingredients: p.ingredients,
                source: 'manual', // Enforce manual for fresh items
                isVerified: true
            },
            create: {
                id: p.id,
                name: p.name,
                category: p.category,
                description: p.description,
                ingredients: p.ingredients,
                nutritionalInfo: p.nutritionalInfo || {},
                source: 'manual',
                isVerified: true
            }
        });
        count++;
    } catch (err: any) {
        console.warn(`⚠️ Failed to seed ${p.name}: ${err.message}`);
    }
  }
  
  console.log(`✅ Seeded ${count}/${products.length} fresh products.`);
}
