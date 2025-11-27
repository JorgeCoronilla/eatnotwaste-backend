import { prisma } from '../config/database';
import ProductAPIService from './ProductAPIService';
import LLMProductGenerator from './LLMProductGenerator';
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
  return GENERIC_KEYWORDS.some(k => nq.includes(k));
};

const hasBrandIndicators = (q: string): boolean => {
  // Heurística simple: si hay palabras como 'heinz', 'nestle', 'danone', 'coca cola', etc.
  const brands = ['heinz','nestle','danone','coca cola','pepsi','barilla','kellogg','colgate','kraft','gallo','hacendado','carrefour'];
  const nq = normalize(q);
  return brands.some(b => nq.includes(b));
};

export class ProductSearchService {
  static async searchByName(query: string, language: string = 'es', userId?: string): Promise<SearchResult> {
    const q = normalize(query);

    if (!q) {
      return { decision: 'none', message: 'Consulta vacía' };
    }

    // 1) Intento de match claro en BD local
    const localExact = await prisma.product.findFirst({
      where: { name: { equals: query, mode: 'insensitive' } },
    });
    if (localExact) {
      return { decision: 'found', product: localExact, source: 'local' };
    }

    // 2) Búsqueda en BD local por contains (lista corta)
    const localCandidates = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
    });
    if (localCandidates.length === 1) {
      return { decision: 'found', product: localCandidates[0], source: 'local' };
    }
    if (localCandidates.length > 1) {
      return { decision: 'list', products: localCandidates, source: 'local' };
    }

    // 3) OpenFoodFacts por nombre
    const offResults = await ProductAPIService.searchOpenFoodFacts(query, language, 10);
    if (offResults.length === 1) {
      return { decision: 'found', product: offResults[0], source: 'openfoodfacts' };
    }
    if (offResults.length > 1) {
      const withBrand = offResults.filter(p => !!p.brand);
      if (withBrand.length > 0) {
        // Devolver lista reducida, priorizando con marca
        const top = withBrand.slice(0, 10);
        return { decision: 'list', products: top, source: 'openfoodfacts' };
      }
      // Ambiguo sin marca: pedir aclaración
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

    // 4) Sin resultados OFF. ¿Es genérico/fresco?
    if (looksGenericOrFresh(query) || !hasBrandIndicators(query)) {
      const generated = await LLMProductGenerator.generateGenericProduct(query, language);
      if (generated) {
        // Persistir en BD (isVerified: false) usando ProductSource.llm directamente
        const newProduct = await prisma.product.create({
          data: {
            name: generated.name,
            brand: null,
            category: generated.category || null,
            subcategory: generated.subcategory || null,
            description: generated.description || null,
            imageUrl: null,
            nutritionalInfo: generated.nutritionalInfo || {},
            allergens: generated.allergens || [],
            ingredients: generated.ingredients || null,
            source: 'llm' as unknown as ProductSource,
            isVerified: false,
            createdById: userId || null,
          },
        });
        return { decision: 'generated', product: newProduct, source: 'llm' };
      }
    }

    // 5) Solicitar clarificación si no genérico
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