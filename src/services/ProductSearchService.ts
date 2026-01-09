import { prisma } from '../config/database';
import ProductAPIService from './ProductAPIService';
import LLMProductGenerator from './LLMProductGenerator';
import { COMMON_BRANDS } from './brandConfig';
import { normalizeTokens } from './tokenUtils';
import NodeCache from 'node-cache';
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
  'manzana','plátano','banana','naranja','limón','pera','uva','fresa','melón',
  'carne','pollo','pescado','cerdo','ternera','cordero','huevo','huevos',
  'pan','harina','arroz','lentejas','garbanzos','judías','frijoles','avena','pasta',
  'leche','yogur','queso','mantequilla',
  'aceite','sal','azúcar'
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

const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10 minutes TTL

export class ProductSearchService {
  static async searchByName(
    query: string, 
    language: string = 'es', 
    userId?: string,
    searchType: 'fast' | 'external' | 'all' = 'all'
  ): Promise<SearchResult> {
    const q = normalize(query);
    logger.info('searchByName:start', { query, normalized: q, language, userId, searchType });

    if (!q) {
      return { decision: 'none', message: 'Consulta vacía' };
    }

    // --- FAST SEARCH (Local DB + LLM) ---
    if (searchType !== 'external') {
      // 1) Intento de match claro en BD local
      const localExact = await prisma.product.findFirst({
        where: { name: { equals: query, mode: 'insensitive' } },
      });
      if (localExact) {
        logger.info('searchByName:localExact', { id: localExact.id, name: localExact.name, brand: localExact.brand });
        return { decision: 'found', product: localExact, source: 'local' };
      }

      // 2) Búsqueda en BD local
      // Si la query es corta (1-2 chars), usar startsWith para evitar ruido.
      // Si es más larga, usar contains.
      const isShort = q.length < 3;
      const searchOp = isShort ? 'startsWith' : 'contains';
      const isGeneric = looksGenericOrFresh(q);
      logger.debug('searchByName:localSearchConfig', { isShort, searchOp, isGeneric });

      const whereClause: any = {
        OR: [
          { name: { [searchOp]: query, mode: 'insensitive' } },
          { brand: { [searchOp]: query, mode: 'insensitive' } },
        ],
      };

      // Solo buscar en categoría si NO es un término genérico
      // Esto evita que al buscar "huevos" salgan todos los productos de la categoría "Huevos y lácteos" (como mayonesa)
      if (!isGeneric) {
        whereClause.OR.push({ category: { [searchOp]: query, mode: 'insensitive' } });
      }

      // Estrategia "rápida": solo coincidencia exacta en BD; si no, LLM
      const localExactFast = await prisma.product.findFirst({
        where: { name: { equals: query, mode: 'insensitive' } },
      });
      if (localExactFast) {
        logger.info('searchByName:localExactFast', { id: localExactFast.id, name: localExactFast.name });
        return { decision: 'found', product: localExactFast, source: 'local' };
      }

      // Si es búsqueda rápida y no hay locales, intentar LLM (siempre fallback genérico)
      if (searchType === 'fast') {
        const llmCacheKey = `${query}|${language}|llm`;
        const cachedLlm = searchCache.get<SearchResult>(llmCacheKey);
        if (cachedLlm) {
          logger.debug('searchByName:llmCacheHit', { llmCacheKey });
          return cachedLlm;
        }

        const generated = await LLMProductGenerator.generateGenericProduct(query, language);
        if (generated) {
           const result: SearchResult = {
             decision: 'generated',
             product: { ...generated, source: 'llm', isVerified: false },
             source: 'llm'
           };
           searchCache.set(llmCacheKey, result);
           return result;
        }

        logger.info('searchByName:fastNoResults');
        return { decision: 'none', message: 'No se encontraron resultados rápidos' };
      }
    }

    // --- EXTERNAL SEARCH (OpenFoodFacts) ---
    let offResults: any[] = [];
    const isGeneric = looksGenericOrFresh(q);
    
      if (searchType === 'external' || (searchType === 'all' && !isGeneric)) {
        offResults = await ProductAPIService.searchOpenFoodFacts(query, language, 10);
        logger.info('searchByName:offResponse', { query, language, count: offResults.length });
      }
    
    // Filtrar resultados de OFF para asegurar relevancia (coincidencia por tokens)
    const tokens = normalizeTokens(q);
 const containsAnyToken = (text: string): boolean => {
   const nt = normalize(text || '');
   return tokens.some((t: string) => nt.includes(t));
 };
   

    const filteredOffResults = offResults.filter(p => {
      return containsAnyToken(p.name) || containsAnyToken(p.brand);
    });
    logger.debug('searchByName:offFilter', { tokens, filteredCount: filteredOffResults.length });

    // Si no hubo coincidencias estrictas pero OFF devolvió algo, ofrecer una lista corta
    if (filteredOffResults.length === 0 && offResults.length > 0) {
      const withBrand = offResults.filter(p => !!p.brand);
      const top = (withBrand.length > 0 ? withBrand : offResults).slice(0, 10);
      logger.info('searchByName:offFallbackList', { withBrandCount: withBrand.length, topCount: top.length });
      return { decision: 'list', products: top, source: 'openfoodfacts' };
    }

    if (filteredOffResults.length === 1) {
      logger.info('searchByName:offSingleMatch');
      return { decision: 'found', product: filteredOffResults[0], source: 'openfoodfacts' };
    }
    if (filteredOffResults.length > 1) {
      const withBrand = filteredOffResults.filter(p => !!p.brand);
      if (withBrand.length > 0) {
        const top = withBrand.slice(0, 10);
        logger.info('searchByName:offListWithBrand', { topCount: top.length });
        return { decision: 'list', products: top, source: 'openfoodfacts' };
      }
      logger.info('searchByName:offClarifyNeeded');
      return {
        decision: 'clarify',
        clarify: {
          needBrand: true,
          isGenericQuestion: true,
          questions: [
            '¿Es un producto de supermercado con marca?',
            '¿Es un producto fresco o sin marca?',
            'Si tiene marca, ¿cuál es?',
          ],
        },
        message: 'Resultados ambiguos. Se necesita clarificación.',
        source: 'openfoodfacts',
      };
    }

    // Si llegamos aquí en modo 'external', no encontramos nada
    if (searchType === 'external') {
       logger.info('searchByName:offNoResults');
       return { decision: 'none', message: 'No se encontraron resultados externos' };
    }

    // --- FALLBACK FOR 'ALL' MODE ---
    // 4) Sin resultados OFF. ¿Es genérico/fresco?
    if (looksGenericOrFresh(query) || !hasBrandIndicators(query)) {
      const llmCacheKey = `${query}|${language}|llm`;
      const cachedLlm = searchCache.get<SearchResult>(llmCacheKey);
      if (cachedLlm) {
         logger.debug('searchByName:llmCacheHit', { llmCacheKey });
         return cachedLlm;
      }

      const generated = await LLMProductGenerator.generateGenericProduct(query, language);
      if (generated) {
         logger.info('searchByName:llmGeneratedGeneric');
         const result: SearchResult = { 
           decision: 'generated', 
           product: {
             ...generated,
             source: 'llm',
             isVerified: false
           }, 
           source: 'llm' 
         };
         searchCache.set(llmCacheKey, result);
         return result;
      }
    }

    // 5) Solicitar clarificación si no genérico
    logger.info('searchByName:clarifyFallback');
    return {
      decision: 'clarify',
      clarify: {
        needBrand: true,
        isGenericQuestion: true,
        questions: [
          '¿Es un producto de supermercado con marca?',
          '¿Es un producto fresco o sin marca?',
          '¿Cuál es la marca? (opcional)',
        ],
      },
      message: 'Sin coincidencias claras. Aclara si es con marca o fresco.',
      source: 'none',
    };
  }
}


export default ProductSearchService;