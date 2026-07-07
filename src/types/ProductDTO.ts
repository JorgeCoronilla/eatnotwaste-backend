// Unified product shape returned by all search paths:
//   - local exact/fuzzy ($queryRaw → snake_case)
//   - local Prisma ORM (camelCase)
//   - OpenFoodFacts (normalizeOpenFoodFactsData → camelCase)
//   - LLM generated (saved to DB → Prisma camelCase)
//
// All callers go through toProductDTO() so the frontend always sees this shape.

export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
  vitaminA?: number;
  [key: string]: number | undefined;
}

export interface ProductDTO {
  id?: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  nutritionalInfo: NutritionalInfo;
  allergens: string[];
  ingredients?: string | null;
  source: string;
  sourceId?: string | null;
  isVerified: boolean;
  healthScore?: Record<string, unknown> | null;
  healthScoreVersion?: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

/**
 * Normalises any product shape to ProductDTO.
 * Handles:
 *   - snake_case rows from $queryRaw (Postgres direct)
 *   - camelCase objects from Prisma ORM
 *   - OFF normalised objects (already camelCase, but may have extra fields)
 */
export function toProductDTO(raw: Record<string, any>): ProductDTO {
  return {
    id: raw.id ?? undefined,
    barcode: raw.barcode ?? null,
    name: raw.name,
    brand: raw.brand ?? null,
    category: raw.category ?? null,
    subcategory: raw.subcategory ?? null,
    description: raw.description ?? null,
    imageUrl: raw.imageUrl ?? raw.image_url ?? null,
    nutritionalInfo: (raw.nutritionalInfo ?? raw.nutritional_info ?? {}) as NutritionalInfo,
    allergens: Array.isArray(raw.allergens) ? raw.allergens : [],
    ingredients: raw.ingredients ?? null,
    source: raw.source ?? 'unknown',
    sourceId: raw.sourceId ?? raw.source_id ?? null,
    isVerified: raw.isVerified ?? raw.is_verified ?? false,
    healthScore: (raw.healthScore ?? raw.health_score ?? null) as Record<string, unknown> | null,
    healthScoreVersion: raw.healthScoreVersion ?? raw.health_score_version ?? 0,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
  };
}
