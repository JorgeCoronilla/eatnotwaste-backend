import axios from 'axios';
import { prisma } from '../../../src/config/database'; // Adjust path
import ProductAPIService from '../../../src/services/ProductAPIService'; // Adjust path

const BATCH_SIZE = 100;
const MAX_PRODUCTS = 1000;

// Configuration for target markets
// Easy to extend: just add more entries here (e.g. { lang: 'fr', country: 'france' })
const TARGET_MARKETS = [
    { lang: 'es', country: 'spain' }
];

export async function seedTopProducts() {
  console.log('🌍 Seeding Top 1000 Products from OpenFoodFacts...');
  
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
            fields: 'code,product_name,product_name_es,product_name_en,brands,categories,ingredients_text,nutriments,image_url,quantity,generic_name,generic_name_es,generic_name_en'
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
            await ProductAPIService.cacheProduct(normalized);
            addedCount++;
            if (addedCount % 20 === 0) process.stdout.write('.');
        } catch (err) {
            // skip
        }
      }
      
      console.log(`\n✅ Total cached so far: ${addedCount}`);
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
