import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// --- Mocks (must be declared before imports that use them) ---
vi.mock('../config/database', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../services/ProductAPIService', () => ({
  default: { searchOpenFoodFacts: vi.fn() },
}));

vi.mock('./LLMProductGenerator', () => ({
  default: { generateGenericProduct: vi.fn() },
}));

vi.mock('../services/LLMProductGenerator', () => ({
  default: { generateGenericProduct: vi.fn() },
}));

vi.mock('../config/redis', () => ({
  cache: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/NutritionCalculator', () => ({
  default: {
    calculateScore: vi.fn().mockReturnValue({ score: 70, grade: 'B' }),
    ENGINE_VERSION: 1,
  },
}));

// --- Imports after mocks ---
import { prisma } from '../config/database';
import ProductAPIService from '../services/ProductAPIService';
import LLMProductGenerator from '../services/LLMProductGenerator';
import { cache as redisCache } from '../config/redis';
import { ProductSearchService } from '../services/ProductSearchService';

// Helpers
const makeRawProduct = (overrides: Record<string, any> = {}) => ({
  id: 'abc-123',
  name: 'Leche Entera',
  brand: 'Pascual',
  source: 'openfoodfacts',
  is_verified: true,
  image_url: 'https://img.example.com/leche.jpg',
  description: 'Leche entera UHT',
  nutritional_info: { calories: 65 },
  allergens: [],
  ingredients: null,
  source_id: null,
  created_by_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  health_score: null,
  health_score_version: 0,
  category: 'Lácteos',
  subcategory: null,
  barcode: '8410188010192',
  ...overrides,
});

const makePrismaProduct = (overrides = {}) => ({
  id: 'abc-123',
  name: 'Leche Entera',
  brand: 'Pascual',
  source: 'openfoodfacts',
  isVerified: true,
  imageUrl: 'https://img.example.com/leche.jpg',
  description: 'Leche entera UHT',
  nutritionalInfo: { calories: 65 },
  allergens: [],
  ingredients: null,
  sourceId: null,
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  healthScore: null,
  healthScoreVersion: 0,
  category: 'Lácteos',
  subcategory: null,
  barcode: '8410188010192',
  ...overrides,
});

const makeLlmProduct = (overrides = {}) => ({
  name: 'Refresco de Cola Genérico',
  brand: null,
  category: 'Bebidas',
  subcategory: null,
  description: 'Refresco de cola sin marca',
  ingredients: 'agua, azucar, colorante',
  allergens: [],
  nutritionalInfo: { calories: 42, sugar: 10.6, fat: 0, protein: 0, sodium: 10, fiber: 0 },
  imageUrl: null,
  ...overrides,
});

// ─────────────────────────────────────────────
// searchLocal
// ─────────────────────────────────────────────
describe('ProductSearchService.searchLocal', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns found on exact match', async () => {
    (prisma.$queryRaw as Mock).mockResolvedValueOnce([makeRawProduct()]);

    const result = await ProductSearchService.searchLocal('leche entera', 20, false);

    expect(result.decision).toBe('found');
    expect(result.product?.name).toBe('Leche Entera');
    expect(result.source).toBe('local');
  });

  it('skips low-quality LLM exact match and falls through to fuzzy', async () => {
    const llmLowQuality = makeRawProduct({ source: 'llm', image_url: null, description: null });
    // First $queryRaw = exact match (low quality LLM) → skip
    // Second $queryRaw = fuzzy similarity → empty
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([llmLowQuality])  // exact
      .mockResolvedValueOnce([]);               // fuzzy

    const result = await ProductSearchService.searchLocal('refresco cola', 20, false);

    expect(result.decision).toBe('none');
  });

  it('returns list for short query (startsWith path)', async () => {
    // Short query (<3 chars) uses Prisma findMany
    (prisma.$queryRaw as Mock).mockResolvedValueOnce([]); // no exact match
    (prisma.product.findMany as Mock).mockResolvedValueOnce([makePrismaProduct()]);

    const result = await ProductSearchService.searchLocal('le', 20, false);

    expect(result.decision).toBe('list');
    expect(result.products).toHaveLength(1);
  });

  it('returns list for long query (similarity path)', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])  // no exact match
      .mockResolvedValueOnce([{ ...makeRawProduct(), _sim: 0.8 }]); // fuzzy

    const result = await ProductSearchService.searchLocal('leche entera pascual', 20, false);

    expect(result.decision).toBe('list');
    expect(result.products).toHaveLength(1);
  });

  it('promotes perfect match in fuzzy results to found', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])  // no exact
      .mockResolvedValueOnce([
        { ...makeRawProduct(), name: 'leche entera', _sim: 0.9 },  // normalized matches q
        { ...makeRawProduct(), name: 'Leche Semidesnatada', id: 'xyz', _sim: 0.5 },
      ]);

    const result = await ProductSearchService.searchLocal('leche entera', 20, false);

    expect(result.decision).toBe('found');
    expect(result.product?.name).toBe('leche entera');
  });

  it('returns none when no results', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])  // no exact
      .mockResolvedValueOnce([]); // no fuzzy

    const result = await ProductSearchService.searchLocal('xyzabc123', 20, false);

    expect(result.decision).toBe('none');
  });
});

// ─────────────────────────────────────────────
// searchByName
// ─────────────────────────────────────────────
describe('ProductSearchService.searchByName', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (redisCache.get as Mock).mockResolvedValue(undefined);
    (redisCache.set as Mock).mockResolvedValue(true);
  });

  it('returns found immediately when local exact match', async () => {
    (prisma.$queryRaw as Mock).mockResolvedValueOnce([makeRawProduct()]);

    const result = await ProductSearchService.searchByName('leche entera', 'es', 'user-1');

    expect(result.decision).toBe('found');
    expect(result.source).toBe('local');
    expect(ProductAPIService.searchOpenFoodFacts).not.toHaveBeenCalled();
  });

  it('returns list from local fuzzy without calling OFF when fast mode', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])  // no exact
      .mockResolvedValueOnce([{ ...makeRawProduct(), _sim: 0.7 }]); // fuzzy

    const result = await ProductSearchService.searchByName('leche', 'es', 'user-1', 'fast');

    expect(result.decision).toBe('list');
    expect(result.source).toBe('local');
    expect(ProductAPIService.searchOpenFoodFacts).not.toHaveBeenCalled();
  });

  it('calls OFF when local misses in smart mode', async () => {
    // local: no exact, no fuzzy
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    (ProductAPIService.searchOpenFoodFacts as Mock).mockResolvedValueOnce([
      { name: 'Leche Entera Asturiana', brand: 'Asturiana', barcode: '123', source: 'openfoodfacts', isVerified: false, allergens: [], nutritionalInfo: {} },
    ]);

    const result = await ProductSearchService.searchByName('leche entera asturiana', 'es', 'user-1', 'smart');

    expect(result.decision).toBe('list');
    expect(result.source).toBe('external');
    expect(ProductAPIService.searchOpenFoodFacts).toHaveBeenCalledOnce();
  });

  it('returns local fallback when OFF times out but local has results', async () => {
    // local: fuzzy hit
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])  // no exact
      .mockResolvedValueOnce([{ ...makeRawProduct(), _sim: 0.6 }]);

    // OFF: never resolves within timeout
    (ProductAPIService.searchOpenFoodFacts as Mock).mockImplementation(
      () => new Promise(() => {}) // hangs forever
    );

    const result = await ProductSearchService.searchByName('leche', 'es', 'user-1', 'smart');

    // Should return local results after OFF timeout
    expect(result.decision).toBe('list');
    expect(result.source).toBe('local');
  }, 5000);

  it('blocks LLM for anonymous users', async () => {
    // local: miss, OFF: miss
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (ProductAPIService.searchOpenFoodFacts as Mock).mockResolvedValueOnce([]);

    // No userId → LLM gate
    const result = await ProductSearchService.searchByName('xyzProductoRaro', 'es', undefined, 'smart');

    expect(result.decision).toBe('none');
    expect(LLMProductGenerator.generateGenericProduct).not.toHaveBeenCalled();
  });

  it('skips OFF for generic terms and returns local results', async () => {
    // "tomate" is generic → OFF must be skipped, local has fuzzy results
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...makeRawProduct(), name: 'Tomate Pera', _sim: 0.7 }]);

    const result = await ProductSearchService.searchByName('tomates', 'es', 'user-1');

    expect(result.decision).toBe('list');
    expect(ProductAPIService.searchOpenFoodFacts).not.toHaveBeenCalled();
  });

  it('calls LLM when all local and OFF miss, user authenticated', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])  // no exact
      .mockResolvedValueOnce([])  // no fuzzy
      .mockResolvedValueOnce([]); // LLM dedup check
    (ProductAPIService.searchOpenFoodFacts as Mock).mockResolvedValueOnce([]);
    (LLMProductGenerator.generateGenericProduct as Mock).mockResolvedValueOnce(makeLlmProduct());
    (prisma.product.create as Mock).mockResolvedValueOnce(
      makePrismaProduct({ name: 'Refresco de Cola Genérico', source: 'llm', isVerified: false, imageUrl: null, description: 'Refresco de cola sin marca' })
    );

    const result = await ProductSearchService.searchByName('refresco cola rara', 'es', 'user-1');

    expect(result.decision).toBe('generated');
    expect(result.source).toBe('llm');
    expect(LLMProductGenerator.generateGenericProduct).toHaveBeenCalledOnce();
  });

  it('deduplicates LLM: returns existing product if normalised name matches', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([])  // no local exact
      .mockResolvedValueOnce([])  // no local fuzzy
      .mockResolvedValueOnce([{ id: 'existing-llm-id' }]); // dedup check finds existing
    (ProductAPIService.searchOpenFoodFacts as Mock).mockResolvedValueOnce([]);
    (LLMProductGenerator.generateGenericProduct as Mock).mockResolvedValueOnce(makeLlmProduct());
    (prisma.product.findUnique as Mock).mockResolvedValueOnce(
      makePrismaProduct({ id: 'existing-llm-id', source: 'llm', name: 'Refresco de Cola Genérico' })
    );

    const result = await ProductSearchService.searchByName('refresco cola rara', 'es', 'user-1');

    expect(result.decision).toBe('generated');
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(result.product?.id).toBe('existing-llm-id');
  });

  it('returns cached top-level result without hitting DB', async () => {
    const cached = { decision: 'list' as const, products: [{ name: 'Cached Product' } as any], source: 'local' };
    (redisCache.get as Mock).mockResolvedValueOnce(cached);

    const result = await ProductSearchService.searchByName('leche', 'es', 'user-1', 'smart');

    expect(result).toEqual(cached);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns none for empty query', async () => {
    const result = await ProductSearchService.searchByName('', 'es', 'user-1');
    expect(result.decision).toBe('none');
  });
});

// ─────────────────────────────────────────────
// searchLocalPaginated
// ─────────────────────────────────────────────
describe('ProductSearchService.searchLocalPaginated', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns products and real total for long query', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([{ count: BigInt(42) }])         // COUNT
      .mockResolvedValueOnce([makeRawProduct(), makeRawProduct()]); // SELECT

    const result = await ProductSearchService.searchLocalPaginated('leche', 2, 0);

    expect(result.decision).toBe('list');
    expect(result.products).toHaveLength(2);
    expect(result.total).toBe(42);
  });

  it('returns total 0 and none for no results', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([{ count: BigInt(0) }])
      .mockResolvedValueOnce([]);

    const result = await ProductSearchService.searchLocalPaginated('xyzunknown', 20, 0);

    expect(result.decision).toBe('none');
    expect(result.total).toBe(0);
  });

  it('uses Prisma findMany + count for short queries', async () => {
    (prisma.product.findMany as Mock).mockResolvedValueOnce([makePrismaProduct()]);
    (prisma.product.count as Mock).mockResolvedValueOnce(7);

    const result = await ProductSearchService.searchLocalPaginated('le', 10, 0);

    expect(result.total).toBe(7);
    expect(prisma.product.findMany).toHaveBeenCalledOnce();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('passes offset to the SQL query', async () => {
    (prisma.$queryRaw as Mock)
      .mockResolvedValueOnce([{ count: BigInt(100) }])
      .mockResolvedValueOnce([makeRawProduct()]);

    await ProductSearchService.searchLocalPaginated('leche', 10, 20);

    // Second $queryRaw call should include OFFSET 20
    const sqlCall = (prisma.$queryRaw as Mock).mock.calls[1];
    const sqlParts = sqlCall[0] as TemplateStringsArray;
    expect(sqlParts.join(' ')).toContain('OFFSET');
  });
});
