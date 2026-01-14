import axios from 'axios';
import { prisma } from '../../../src/config/database'; // Adjust path
import ProductAPIService from '../../../src/services/ProductAPIService'; // Adjust path
import { ProductSource } from '../../../src/types/database';

const BATCH_SIZE = 100;
const MAX_PRODUCTS = 2500;

// Configuration for target markets
const TARGET_MARKETS = [
    { lang: 'es', country: 'spain' }
];

export async function seedTopProducts() {
  console.log('🌍 Seeding Top 1000 Products from OpenFoodFacts to Main DB...');
  
  for (const market of TARGET_MARKETS) {
    console.log(`\n🇪🇸 Processing market: ${market.country.toUpperCase()} (${market.lang})...`);
    
    let addedCount = 0;
    let page = 1;

    try {
        while (addedCount < MAX_PRODUCTS) {
        console.log(`📡 Fetching page ${page}...`);
        
        const response = await axios.get('https://world.openfoodfacts.org/api/v2/search', {
            params: {
            countries_tags_en: market.country,
            page_size: BATCH_SIZE,
            page: page,
            sort_by: 'popularity_key',
            fields: 'code,product_name,product_name_es,product_name_en,brands,categories,ingredients_text,nutriments,image_url,quantity,generic_name,generic_name_es,generic_name_en,nova_group,additives_tags'
            },
            timeout: 30000 
        });

      const products = response.data.products;
      
      if (!products || products.length === 0) {
        console.log('⚠️ No more products found from API.');
        break;
      }

      console.log(`📦 Processing batch of ${products.length}...`);

      for (const offProduct of products) {
        if (!offProduct.code) continue;

        try {
            const normalized = ProductAPIService.normalizeOpenFoodFactsData(offProduct, offProduct.code);
            
            // Check if exists in Product Main Table
            // We use findFirst because barcode is not unique in schema (though it should be)
            const existing = await prisma.product.findFirst({
                where: { barcode: normalized.barcode }
            });

            const productData = {
                name: normalized.name,
                brand: normalized.brand || null,
                category: normalized.category || null,
                description: normalized.description || null,
                imageUrl: normalized.imageUrl || null,
                nutritionalInfo: normalized.nutritionalInfo as any, // Json
                ingredients: Array.isArray(normalized.ingredients) ? normalized.ingredients.join(', ') : (normalized.ingredients || null),
                allergens: normalized.allergens || [],
                healthScore: normalized.healthScore as any,
                // Ensure we don't overwrite manual sources if we are updating
            };

            if (existing) {
                // Only update if it's NOT a manual product (don't overwrite user's custom or fresh data)
                // Or if it IS manual but we want to fill missing data? No, safer to leave manual alone.
                if (existing.source !== 'manual') {
                    await prisma.product.update({
                        where: { id: existing.id },
                        data: {
                            ...productData,
                            source: 'openfoodfacts', // Re-affirm source
                            isVerified: false,
                        }
                    });
                     // Also cache it for redundancy? Not strictly needed if search looks at Product.
                }
            } else {
                // Create new
                await prisma.product.create({
                    data: {
                        barcode: normalized.barcode,
                        ...productData,
                        source: 'openfoodfacts',
                        isVerified: false,
                        sourceId: offProduct.id || offProduct._id // store OFF ID if available
                    }
                });
            }

            // Still cache for API redundancy? 
            // ProductAPIService.cacheProduct(normalized); 
            // We'll skip caching to avoid duplicating efforts, manual search uses DB now.

            addedCount++;
            if (addedCount % 20 === 0) process.stdout.write('.');
        } catch (err: any) {
             console.log(`Error seeding product ${offProduct.code}: ${err.message}`);
        }
      }
      
      console.log(`\n✅ Total processed so far: ${addedCount}`);
      page++;
      
      // Delay to be polite
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
      
      console.log(`✨ Market ${market.country} finished! Added: ${addedCount}`);
    
    } catch (error: any) {
        console.error(`\n❌ Error seeding market ${market.country}:`, error.message);
    }
  }
  
  console.log('\n✅ All markets processed.');
}
