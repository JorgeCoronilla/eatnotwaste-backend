import { prisma } from '../config/database';
import ProductAPIService from './ProductAPIService';
import LLMProductGenerator from './LLMProductGenerator';
import { COMMON_BRANDS } from './brandConfig';
import { normalizeTokens } from './tokenUtils';
import { cache as redisCache } from '../config/redis';
import { ProductSource } from '@prisma/client';
import { logger } from '../utils/logger';

export type SearchDecision = 'found' | 'list' | 'clarify' | 'generated' | 'none';

export interface SearchResult {
  decision: SearchDecision;
  product?: any;
  products?: any[];
  message?: string;
  clarify?: {
    needBrand?: boolean;
    isGenericQuestion?: boolean;
    questions?: string[];
  };
  source?: string;
}

const normalize = (q: string): string => {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
};

const GENERIC_KEYWORDS = [
  'lechuga','ensalada','tomate','pepino','pimiento','zanahoria','cebolla','ajo',
  'manzana','platano','banana','naranja','limon','pera','uva','fresa','melon','sandia',
  'carne','pollo','pescado','cerdo','ternera','cordero','huevo','huevos',
  'pan','harina','arroz','lentejas','garbanzos','judias','frijoles','avena','pasta',
  'leche','yogur','queso','mantequilla',
  'aceite','sal','azucar'
];

const looksGenericOrFresh = (q: string): boolean => {
  const nq = normalize(q);
  // Coincidencia exacta para evitar falsos positivos (ej. "huevo kinder" no debe ser genérico)
  return GENERIC_KEYWORDS.includes(nq);
};

const hasBrandIndicators = (q: string): boolean => {
  const nq = normalize(q);
  return COMMON_BRANDS.some(b => nq.includes(b));
};

// const searchCache = new NodeCache(...) -> Removed in favor of redisCache

export class ProductSearchService {
  static async searchByName(
    query: string, 
    language: string = 'es', 
    userId?: string,
    searchType: 'fast' | 'external' | 'all' | 'smart' = 'smart'
  ): Promise<SearchResult> {
    const q = normalize(query);
    logger.info('searchByName:start', { query, normalized: q, language, userId, searchType });

    if (!q) {
      return { decision: 'none', message: 'Consulta vacía' };
    }

    // --- STEP 1: LOCAL DATABASE (Free & Fast) ---
    // Always check local first unless explicitly skipped (which strict 'external' mode might imply, but 'smart' doesn't)
    if (searchType !== 'external') {
      // 1.1 Exact match
      const localExact = await prisma.product.findFirst({
        where: { name: { equals: query, mode: 'insensitive' } },
      });
      if (localExact) {
        // Quality Check: If local is LLM-generated and "empty", skip it.
        // This prevents returning "draft" products that might have been saved with missing data.
        const isLowQualityLlm = localExact.source === 'llm' && !localExact.imageUrl && !localExact.description;
        
        if (isLowQualityLlm) {
          logger.info('searchByName:localExactSkipped', { id: localExact.id, name: localExact.name, reason: 'low_quality_llm' });
        } else {
          logger.info('searchByName:localExactHit', { id: localExact.id, name: localExact.name });
          return { decision: 'found', product: localExact, source: 'local' };
        }
      }

      // 1.2 Fuzzy/Partial match in DB
      const isShort = q.length < 3;
      const searchOp = isShort ? 'startsWith' : 'contains';
      
      // Generic term check logic
      const isGeneric = looksGenericOrFresh(q);

      const whereClause: any = {
        OR: [
          { name: { [searchOp]: query, mode: 'insensitive' } },
          { brand: { [searchOp]: query, mode: 'insensitive' } },
        ],
      };
      
      if (!isGeneric) {
         whereClause.OR.push({ category: { [searchOp]: query, mode: 'insensitive' } });
      }

      const localResults = await prisma.product.findMany({
        where: whereClause,
        take: 5
      });

      // Simple scoring: if we have a very good match locally, stick with it.
      // For now, if we have results and one looks very similar, return it.
      // Or if explicitly 'fast' mode, return whatever we have locally.
      if (localResults.length > 0) {
        // If we found a perfect name match in the list
        const perfectMatch = localResults.find(p => normalize(p.name) === q);
        if (perfectMatch) {
             logger.info('searchByName:localPerfectMatch', { id: perfectMatch.id });
             return { decision: 'found', product: perfectMatch, source: 'local' };
        }
        
        // If 'fast' mode, just return local results if any
        if (searchType === 'fast') {
            return { decision: 'list', products: localResults, source: 'local' };
        }
      }
    }

    // --- STEP 2: EXTERNAL SEARCH (OpenFoodFacts) (Free & Good Quality) ---
    // Check external if local didn't satisfy us
    // SKIPPING if term is generic/fresh to avoid "Gum" results for "Watermelon"
    const isGeneric = looksGenericOrFresh(q);
    
    if (searchType !== 'fast' && !isGeneric) {
      try {
        const offResults = await ProductAPIService.searchOpenFoodFacts(query, language, 10);
        
        if (offResults && offResults.length > 0) {
          // Filter logic
          const tokens = normalizeTokens(q);
          const containsAnyToken = (text: string) => {
             const nt = normalize(text || '');
             return tokens.some((t: string) => nt.includes(t));
          };
          
          const relevantOffResults = offResults.filter(p => 
            containsAnyToken(p.name) || containsAnyToken(p.brand)
          );

          if (relevantOffResults.length > 0) {
             // If we have branded results (high confidence), stop here.
             const withBrand = relevantOffResults.filter(p => !!p.brand);
             
             if (withBrand.length > 0) {
                logger.info('searchByName:externalHit', { count: withBrand.length });
                return { 
                  decision: 'list', // or 'found' if length === 1
                  products: withBrand.slice(0, 10), 
                  source: 'external',
                  message: 'Resultados web encontrados' 
                };
             }
             
             // Even if no brand but relevant title matches
             logger.info('searchByName:externalHitUnknownBrand', { count: relevantOffResults.length });
             return {
                decision: 'list',
                products: relevantOffResults.slice(0,10),
                source: 'external'
             };
          }
        }
      } catch (err) {
        logger.error('searchByName:externalError', err);
        // Continue to step 3 on error
      }
    } else if (isGeneric) {
       logger.info('searchByName:skippingExternalForGeneric', { query });
    }

    // --- STEP 3: ARTIFICIAL INTELLIGENCE (Fallback - Costly) ---
    // Only if local failed AND external failed/returned garbage
    // And query is not empty/garbage itself
    
    // Safety check: is it a valid term worth generating?
    if (q.length < 2) {
       return { decision: 'none', message: 'Término muy corto para generar' };
    }

    logger.info('searchByName:aiFallbackTriggered', { query });
    const llmCacheKey = `${q}|${language}|llm`;
    const cachedLlm = await redisCache.get<SearchResult>(llmCacheKey);
    if (cachedLlm) {
       logger.debug('searchByName:llmCacheHit');
       return cachedLlm;
    }

    const generated = await LLMProductGenerator.generateGenericProduct(query, language);
    if (generated) {
       const result: SearchResult = {
         decision: 'generated',
         product: { ...generated, source: 'llm', isVerified: false },
         source: 'llm',
         message: 'Producto generado por IA'
       };
       await redisCache.set(llmCacheKey, result, 600);
       return result;
    }

    return { decision: 'none', message: 'No se encontraron resultados' };
  }
}


export default ProductSearchService;