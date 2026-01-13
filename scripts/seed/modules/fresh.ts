import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { ProductService } from '../../../src/services/ProductService'; // Adjust path if needed

import NutritionCalculator from '../../../src/services/NutritionCalculator';

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
        const nutInfo = p.nutritionalInfo || {};
        
        // Calculate dynamic health score for fresh products
        // Assumptions: Fresh fruit/veg is NOVA 1, has 0 additives, and is 100% fruit/veg
        const healthScore = NutritionCalculator.calculateScore(
            {
                energy: nutInfo.calories,
                sugars: nutInfo.sugar,
                saturatedFat: nutInfo.saturatedFat || 0, // Default to 0 if missing in JSON
                sodium: nutInfo.sodium || 0,             // Default to 0 if missing in JSON
                fiber: nutInfo.fiber,
                protein: nutInfo.protein,
                fruitsVegetablesNuts: 100 // It's a fresh fruit/veg
            },
            {
                ingredients: [p.name],
                additives: [] // Fresh products have no additives
            },
            {
                novaGroup: 1 // Fresh products are unprocessed
            }
        );

        // We use upsert to be safe
        await prisma.product.upsert({
            where: { id: p.id },
            update: {
                name: p.name,
                category: p.category,
                description: p.description,
                ingredients: p.ingredients,
                source: 'manual', // Enforce manual for fresh items
                isVerified: true,
                healthScore: healthScore as any // Store the calculated score
            },
            create: {
                id: p.id,
                name: p.name,
                category: p.category,
                description: p.description,
                ingredients: p.ingredients,
                nutritionalInfo: p.nutritionalInfo || {},
                source: 'manual',
                isVerified: true,
                healthScore: healthScore as any
            }
        });
        count++;
    } catch (err: any) {
        console.warn(`⚠️ Failed to seed ${p.name}: ${err.message}`);
    }
  }
  
  console.log(`✅ Seeded ${count}/${products.length} fresh products.`);
}
