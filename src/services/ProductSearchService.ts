import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import ProductAPIService from './ProductAPIService';
import LLMProductGenerator from './LLMProductGenerator';
import NutritionCalculator from './NutritionCalculator';
import { normalizeTokens } from './tokenUtils';
import { cache as redisCache } from '../config/redis';
import { logger } from '../utils/logger';
import { looksGenericOrFresh } from '../utils/genericKeywords';
import { ProductDTO, toProductDTO } from '../types/ProductDTO';

export type SearchDecision = 'found' | 'list' | 'clarify' | 'generated' | 'none';

export interface SearchResult {
  decision: SearchDecision;
  product?: ProductDTO;
  products?: ProductDTO[];
  total?: number; // total matching rows, populated only by searchLocalPaginated
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

const isLowQualityLlm = (p: Record<string, any>): boolean =>
  p.source === 'llm' && !(p.image_url ?? p.imageUrl) && !p.description;

export class ProductSearchService {
  static async searchLocal(q: string, limit: number, isGeneric: boolean): Promise<SearchResult> {
    // 1.1 Exact match — uses the functional index products_name_unaccent_lower_idx.
    // immutable_unaccent(lower(...)) must match the index definition exactly.
    const localExactRaw = await prisma.$queryRaw<any[]>`
      SELECT * FROM "products"
      WHERE immutable_unaccent(lower("name")) = ${q}
      LIMIT 1
    `;
    const localExact = localExactRaw.length > 0 ? localExactRaw[0] : null;

    if (localExact) {
      if (isLowQualityLlm(localExact)) {
        logger.info('searchLocal:exactSkipped', { id: localExact.id, name: localExact.name, reason: 'low_quality_llm' });
      } else {
        logger.info('searchLocal:exactHit', { id: localExact.id, name: localExact.name });
        return { decision: 'found', product: toProductDTO(localExact), source: 'local' };
      }
    }

    // 1.2 Fuzzy match.
    // Short queries (<3 chars) use ILIKE startsWith — trgm similarity is unreliable on very short tokens.
    const isShort = q.length < 3;
    let localResults: ProductDTO[];

    if (isShort) {
      const whereClause: any = {
        OR: [
          { name: { startsWith: q, mode: 'insensitive' } },
          { brand: { startsWith: q, mode: 'insensitive' } },
          ...(!isGeneric ? [{ category: { startsWith: q, mode: 'insensitive' } }] : []),
        ],
      };
      const rows = await prisma.product.findMany({
        where: whereClause,
        take: limit,
        orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      });
      localResults = rows.map(toProductDTO);
    } else {
      // pg_trgm similarity() ranked fuzzy search — hits the GIN trigram index.
      // Low-quality LLM rows are excluded here so they never pollute results.
      const categoryClause = isGeneric
        ? Prisma.sql`FALSE`
        : Prisma.sql`similarity("category", ${q}) > 0.15`;

      const rows = await prisma.$queryRaw<any[]>`
        SELECT *,
          GREATEST(
            similarity("name",  ${q}),
            similarity(COALESCE("brand", ''), ${q})
          ) AS _sim
        FROM "products"
        WHERE (
          similarity("name",  ${q}) > 0.15
          OR similarity(COALESCE("brand", ''), ${q}) > 0.15
          OR (${categoryClause})
        )
        AND NOT (
          "source" = 'llm'
          AND "image_url" IS NULL
          AND "description" IS NULL
        )
        ORDER BY "is_verified" DESC, _sim DESC
        LIMIT ${limit}
      `;
      localResults = rows.map(toProductDTO);
    }

    if (localResults.length > 0) {
      const perfectMatch = localResults.find(p => normalize(p.name) === q);
      if (perfectMatch) {
        logger.info('searchLocal:perfectMatch', { id: perfectMatch.id });
        return { decision: 'found', product: perfectMatch, source: 'local' };
      }
      logger.info('searchLocal:fuzzyHit', { count: localResults.length, isShort });
      return { decision: 'list', products: localResults, source: 'local' };
    }

    return { decision: 'none' };
  }

  /**
   * Paginated version of the local fuzzy search, used by the GET /search endpoint.
   * Returns the real total count so the client can render pagination controls.
   * Does NOT run exact-match or LLM — it is a pure DB query.
   */
  static async searchLocalPaginated(
    q: string,
    limit: number,
    offset: number
  ): Promise<SearchResult> {
    if (!q) return { decision: 'none', total: 0 };

    if (q.length < 3) {
      // Short query: Prisma findMany + count with the same where clause.
      const whereClause: any = {
        OR: [
          { name: { startsWith: q, mode: 'insensitive' } },
          { brand: { startsWith: q, mode: 'insensitive' } },
          { category: { startsWith: q, mode: 'insensitive' } },
        ],
      };
      const [rows, total] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          take: limit,
          skip: offset,
          orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
        }),
        prisma.product.count({ where: whereClause }),
      ]);
      return {
        decision: rows.length > 0 ? 'list' : 'none',
        products: rows.map(toProductDTO),
        total,
        source: 'local',
      };
    }

    // Long query: similarity with parallel COUNT + paginated SELECT.
    const [countRows, rows] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM "products"
        WHERE
          similarity("name", ${q}) > 0.15
          OR similarity(COALESCE("brand", ''), ${q}) > 0.15
          OR similarity(COALESCE("category", ''), ${q}) > 0.15
      `,
      prisma.$queryRaw<any[]>`
        SELECT *,
          GREATEST(
            similarity("name",  ${q}),
            similarity(COALESCE("brand", ''), ${q})
          ) AS _sim
        FROM "products"
        WHERE
          similarity("name",  ${q}) > 0.15
          OR similarity(COALESCE("brand", ''), ${q}) > 0.15
          OR similarity(COALESCE("category", ''), ${q}) > 0.15
        ORDER BY "is_verified" DESC, _sim DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      decision: rows.length > 0 ? 'list' : 'none',
      products: rows.map(toProductDTO),
      total,
      source: 'local',
    };
  }

  static async searchByName(
    query: string,
    language: string = 'es',
    userId?: string,
    searchType: 'fast' | 'external' | 'smart' | 'ai' = 'smart',
    limit: number = 20
  ): Promise<SearchResult> {
    const startMs = Date.now();
    const q = normalize(query);
    // Use the multi-language generic detector (handles singularisation via normalizeTokens)
    const isGeneric = looksGenericOrFresh(q, language);
    logger.info('searchByName:start', { query, normalized: q, language, userId, searchType, isGeneric });

    if (!q) {
      return { decision: 'none', message: 'Consulta vacía' };
    }

    // Helper: emit the structured metric and return the result in one call.
    const done = (result: SearchResult): SearchResult => {
      logger.info('search:completed', {
        query: q,
        language,
        searchType,
        decision: result.decision,
        source: result.source ?? 'none',
        resultCount: result.products?.length ?? (result.product ? 1 : 0),
        durationMs: Date.now() - startMs,
        isGeneric,
        authenticated: !!userId,
      });
      return result;
    };

    // --- TOP-LEVEL CACHE (local + OFF results only; LLM has its own cache) ---
    // Only cache 'smart' mode — 'fast' is for autocomplete (must be fresh), 'ai' / 'external' are explicit.
    const topCacheKey = searchType === 'smart' ? `search|smart|${q}|${language}` : null;
    if (topCacheKey) {
      const cached = await redisCache.get<SearchResult>(topCacheKey);
      if (cached) {
        logger.debug('searchByName:topCacheHit', { key: topCacheKey });
        return done(cached);
      }
    }

    let localResults: ProductDTO[] = [];

    // --- STEP 1: LOCAL DATABASE ---
    if (searchType !== 'external' && searchType !== 'ai') {
      const localRes = await this.searchLocal(q, limit, isGeneric);
      if (localRes.decision === 'found') {
        if (topCacheKey) await redisCache.set(topCacheKey, localRes, 120);
        return done(localRes);
      }
      if (localRes.decision === 'list') {
        localResults = localRes.products || [];
        if (searchType === 'fast') {
          return done(localRes); // fast path: no cache (autocomplete needs freshness)
        }
      }
    }

    // --- STEP 2: OPENFOODFACTS ---
    // Skipped for generic/fresh terms — their catalogue returns irrelevant branded results.
    if (searchType !== 'fast' && searchType !== 'ai' && !isGeneric) {
      const controller = new AbortController();
      try {
        // Use original (non-normalised) query: OFF benefits from diacritics/casing.
        const offPromise = ProductAPIService.searchOpenFoodFacts(query, language, 10, controller.signal);
        const timeoutMs = localResults.length > 0 ? 1500 : 3000;
        const offResults = await Promise.race([
          offPromise,
          new Promise<any[] | null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
        ]);

        if (offResults === null) {
          controller.abort();
          logger.warn('searchByName:offTimeout', { query, timeoutMs });
          if (localResults.length > 0) {
            const fallback: SearchResult = { decision: 'list', products: localResults, source: 'local', message: 'Resultados aproximados (fallback)' };
            if (topCacheKey) await redisCache.set(topCacheKey, fallback, 120);
            return done(fallback);
          }
        } else if (offResults.length > 0) {
          const tokens = normalizeTokens(q);
          const containsAnyToken = (text: string) => {
            const nt = normalize(text || '');
            return tokens.some((t: string) => nt.includes(t));
          };

          const relevantOff = offResults
            .filter(p => containsAnyToken(p.name) || containsAnyToken(p.brand))
            .filter(offItem => {
              const offBarcode = offItem.barcode;
              const offNameNorm = normalize(offItem.name);
              return !localResults.some(
                local =>
                  (offBarcode && local.barcode === offBarcode) ||
                  normalize(local.name) === offNameNorm
              );
            })
            .map(toProductDTO);

          if (relevantOff.length > 0) {
            const withBrand = relevantOff.filter(p => !!p.brand);
            const toMerge = (withBrand.length > 0 ? withBrand : relevantOff).slice(0, 10);
            const combined = [...localResults, ...toMerge];
            logger.info('searchByName:externalHit', { count: toMerge.length, hasBrand: withBrand.length > 0 });
            const extResult: SearchResult = { decision: 'list', products: combined, source: 'external', message: 'Resultados web encontrados' };
            if (topCacheKey) await redisCache.set(topCacheKey, extResult, 3600); // OFF data is stable — cache 1h
            return done(extResult);
          }
        }
      } catch (err) {
        logger.error('searchByName:externalError', err);
      }
    } else if (isGeneric) {
      logger.info('searchByName:skippingExternalForGeneric', { query });
    }

    if (localResults.length > 0) {
      logger.info('searchByName:localFuzzyHit', { count: localResults.length });
      const fuzzyResult: SearchResult = { decision: 'list', products: localResults, source: 'local', message: 'Resultados aproximados' };
      if (topCacheKey) await redisCache.set(topCacheKey, fuzzyResult, 120);
      return done(fuzzyResult);
    }

    // --- STEP 3: LLM FALLBACK ---
    // Requires authenticated user — anonymous requests must not trigger costly AI calls.
    if (!userId) {
      logger.info('searchByName:llmSkippedAnon', { query });
      return done({ decision: 'none', message: 'Sin resultados. Inicia sesión para activar la búsqueda IA.' });
    }

    if (q.length < 2) {
      return { decision: 'none', message: 'Término muy corto para generar' };
    }

    logger.info('searchByName:aiFallbackTriggered', { query, userId });

    const llmCacheKey = `search|llm|${q}|${language}`;
    const cachedLlm = await redisCache.get<SearchResult>(llmCacheKey);
    if (cachedLlm) {
      logger.debug('searchByName:llmCacheHit');
      return cachedLlm;
    }

    const generated = await LLMProductGenerator.generateGenericProduct(query, language);
    if (generated) {
      const ingredientsList = generated.ingredients
        ? generated.ingredients.split(',').map(i => i.trim())
        : [];

      const healthScore = NutritionCalculator.calculateScore(
        {
          energy: generated.nutritionalInfo?.calories || 0,
          sugars: generated.nutritionalInfo?.sugar || 0,
          saturatedFat: generated.nutritionalInfo?.fat
            ? generated.nutritionalInfo.fat * 0.3
            : 0,
          sodium: generated.nutritionalInfo?.sodium || 0,
          fiber: generated.nutritionalInfo?.fiber || 0,
          protein: generated.nutritionalInfo?.protein || 0,
          fruitsVegetablesNuts: 0,
        },
        { ingredients: ingredientsList, additives: [] },
        {},
        generated.category,
        generated.name
      );

      // Dedup: avoid persisting the same LLM product twice.
      // The unique partial index (products_llm_name_unique_idx) enforces this at DB level too.
      const normalizedName = normalize(generated.name);
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM "products"
        WHERE immutable_unaccent(lower("name")) = ${normalizedName}
        AND "source" = 'llm'
        LIMIT 1
      `;

      let savedProduct: ProductDTO;

      if (existing.length > 0) {
        logger.info('searchByName:llmDedupHit', { name: generated.name });
        const existingFull = await prisma.product.findUnique({ where: { id: existing[0].id } });
        savedProduct = toProductDTO(existingFull!);
      } else {
        try {
          const dbProduct = await prisma.product.create({
            data: {
              name: generated.name,
              brand: generated.brand || null,
              category: generated.category || null,
              subcategory: generated.subcategory || null,
              description: generated.description || null,
              ingredients: generated.ingredients || null,
              allergens: generated.allergens || [],
              nutritionalInfo: generated.nutritionalInfo || {},
              imageUrl: generated.imageUrl || null,
              source: 'llm',
              isVerified: false,
              healthScore: healthScore as any,
              healthScoreVersion: NutritionCalculator.ENGINE_VERSION,
            },
          });
          savedProduct = toProductDTO(dbProduct);
          logger.info('searchByName:llmSavedToDb', { id: dbProduct.id });
        } catch (err) {
          logger.error('searchByName:llmSaveError', err);
          savedProduct = toProductDTO({ ...generated, source: 'llm', isVerified: false, healthScore });
        }
      }

      const result: SearchResult = {
        decision: 'generated',
        product: savedProduct,
        source: 'llm',
        message: 'Producto generado por IA',
      };
      await redisCache.set(llmCacheKey, result, 600);
      return done(result);
    }

    return done({ decision: 'none', message: 'No se encontraron resultados' });
  }
}

export default ProductSearchService;
