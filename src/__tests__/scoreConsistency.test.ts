/**
 * Score Consistency Tests
 *
 * PURPOSE: Prove that `buildScoreInputs` → `calculateScore` (the recalc path)
 * produces the EXACT same score/grade/breakdown that the import path produces
 * when given the same underlying OpenFoodFacts data.
 *
 * Each test simulates what happens during import (build the persisted
 * nutritionalInfo with novaGroup / additivesTags / fruitsVegetablesNuts)
 * then verifies that feeding that persisted object back through
 * buildScoreInputs reproduces the identical result.
 *
 * Additional smoke-test: a sugary soda must NOT produce energy=0 or sugars=0
 * on recalc (the bug that existed before this fix).
 */

import { describe, it, expect } from 'vitest';
import scorer from '../services/NutritionCalculator';
import { buildScoreInputs, splitIngredients } from '../services/scoreInputs';

// ---------------------------------------------------------------------------
// Helper: simulate what the import path does
// (mirrors the logic now in ProductAPIService.normalizeOpenFoodFactsData)
// ---------------------------------------------------------------------------
function simulateImport(rawData: {
  nutriments: Record<string, number | undefined>;
  nova_group?: number;
  additives_tags?: string[];
  ingredients_text?: string;
  product_name?: string;
  category?: string;
}) {
  const n = rawData.nutriments;
  const fruitsVegetablesNuts: number | undefined =
    n['fruits-vegetables-nuts-estimate-from-ingredients_100g'] ??
    n['fruits-vegetables-nuts_100g'] ??
    undefined;

  // This is what gets stored as nutritionalInfo in the DB
  const persistedNI = {
    calories: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? undefined,
    protein: n.proteins_100g ?? n.proteins ?? undefined,
    carbohydrates: n.carbohydrates_100g ?? n.carbohydrates ?? undefined,
    fat: n.fat_100g ?? n.fat ?? undefined,
    fiber: n.fiber_100g ?? n.fiber ?? undefined,
    sugar: n.sugars_100g ?? n.sugars ?? undefined,
    sodium: n.sodium_100g ?? n.sodium ?? undefined,
    saturatedFat: n['saturated-fat_100g'] ?? n['saturated-fat'] ?? undefined,
    novaGroup: rawData.nova_group ?? undefined,
    additivesTags: rawData.additives_tags ?? [],
    ...(fruitsVegetablesNuts !== undefined ? { fruitsVegetablesNuts } : {}),
  };

  const ingredientsList = splitIngredients(rawData.ingredients_text ?? null);

  // Import score (computed fresh from raw data, also via persisted NI fields)
  const importScore = scorer.calculateScore(
    {
      energy: persistedNI.calories ?? 0,
      sugars: persistedNI.sugar ?? 0,
      fat: persistedNI.fat ?? 0,
      saturatedFat: persistedNI.saturatedFat ?? 0,
      sodium: persistedNI.sodium ?? 0,
      fiber: persistedNI.fiber ?? 0,
      protein: persistedNI.protein ?? 0,
      fruitsVegetablesNuts: persistedNI.fruitsVegetablesNuts,
    },
    {
      ingredients: ingredientsList,
      additives: persistedNI.additivesTags ?? [],
    },
    { novaGroup: persistedNI.novaGroup },
    rawData.category,
    rawData.product_name ?? '',
  );

  return { persistedNI, ingredientsText: ingredientsList.join(', '), importScore };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scoreConsistency — import path === recalc path', () => {
  // ─── 1. Agua mineral — simplest case ─────────────────────────────────────
  it('agua mineral: recalc reproduces import score exactly', () => {
    const raw = {
      nutriments: {
        'energy-kcal_100g': 0,
        proteins_100g: 0,
        carbohydrates_100g: 0,
        fat_100g: 0,
        fiber_100g: 0,
        sugars_100g: 0,
        sodium_100g: 0,
      },
      nova_group: 1,
      additives_tags: [] as string[],
      ingredients_text: 'agua',
      product_name: 'Agua Mineral',
      category: undefined as string | undefined,
    };

    const { persistedNI, ingredientsText, importScore } = simulateImport(raw);
    const { nutrition, ingredients, processing } = buildScoreInputs(persistedNI, ingredientsText);
    const recalcScore = scorer.calculateScore(nutrition, ingredients, processing, raw.category, raw.product_name);

    expect(recalcScore.score).toBe(importScore.score);
    expect(recalcScore.grade).toBe(importScore.grade);
    expect(recalcScore.breakdown).toEqual(importScore.breakdown);
  });

  // ─── 2. Coca-Cola — high sugar, nova 4, additives tags ───────────────────
  it('coca-cola: recalc reproduces import score; energy and sugars are non-zero', () => {
    const raw = {
      nutriments: {
        'energy-kcal_100g': 42,
        proteins_100g: 0,
        carbohydrates_100g: 10.6,
        fat_100g: 0,
        fiber_100g: 0,
        sugars_100g: 10.6,
        sodium_100g: 10,
      },
      nova_group: 4,
      additives_tags: ['en:e150d', 'en:e338'],
      ingredients_text: 'agua carbonatada, azucar, color caramelo, acido fosforico, aromas, cafeina',
      product_name: 'Coca-Cola',
      category: 'beverages',
    };

    const { persistedNI, ingredientsText, importScore } = simulateImport(raw);
    const { nutrition, ingredients, processing } = buildScoreInputs(persistedNI, ingredientsText);
    const recalcScore = scorer.calculateScore(nutrition, ingredients, processing, raw.category, raw.product_name);

    // The recalc score must match the import score
    expect(recalcScore.score).toBe(importScore.score);
    expect(recalcScore.grade).toBe(importScore.grade);
    expect(recalcScore.breakdown).toEqual(importScore.breakdown);

    // Smoke-test: energy and sugars must be non-zero (bug regression check)
    expect(nutrition.energy).toBeGreaterThan(0);
    expect(nutrition.sugars).toBeGreaterThan(0);
  });

  // ─── 3. Jamón cocido con E250 — high-risk additive tag ───────────────────
  it('jamon cocido con E250: recalc reproduces import score including additive penalty', () => {
    const raw = {
      nutriments: {
        'energy-kcal_100g': 120,
        proteins_100g: 18,
        carbohydrates_100g: 1,
        fat_100g: 5,
        fiber_100g: 0,
        sugars_100g: 1,
        sodium_100g: 800,
        'saturated-fat_100g': 2,
      },
      nova_group: 3,
      additives_tags: ['en:e250'],
      ingredients_text: 'carne de cerdo, agua, sal, azucar, especias',
      product_name: 'Jamon Cocido',
      category: undefined as string | undefined,
    };

    const { persistedNI, ingredientsText, importScore } = simulateImport(raw);
    const { nutrition, ingredients, processing } = buildScoreInputs(persistedNI, ingredientsText);
    const recalcScore = scorer.calculateScore(nutrition, ingredients, processing, raw.category, raw.product_name);

    expect(recalcScore.score).toBe(importScore.score);
    expect(recalcScore.grade).toBe(importScore.grade);
    expect(recalcScore.breakdown).toEqual(importScore.breakdown);

    // additivesTags must be preserved round-trip
    expect(ingredients.additives).toContain('en:e250');
  });

  // ─── 4. Manzana con fruitsVegetablesNuts ─────────────────────────────────
  it('manzana (fruitsVegetablesNuts=100): recalc reproduces import score', () => {
    const raw = {
      nutriments: {
        'energy-kcal_100g': 52,
        proteins_100g: 0.3,
        carbohydrates_100g: 14,
        fat_100g: 0.2,
        fiber_100g: 2.4,
        sugars_100g: 10.4,
        sodium_100g: 1,
        'saturated-fat_100g': 0,
        'fruits-vegetables-nuts-estimate-from-ingredients_100g': 100,
      },
      nova_group: 1,
      additives_tags: [] as string[],
      ingredients_text: 'manzana',
      product_name: 'Manzana',
      category: undefined as string | undefined,
    };

    const { persistedNI, ingredientsText, importScore } = simulateImport(raw);

    // fruitsVegetablesNuts must be persisted
    expect(persistedNI.fruitsVegetablesNuts).toBe(100);

    const { nutrition, ingredients, processing } = buildScoreInputs(persistedNI, ingredientsText);
    const recalcScore = scorer.calculateScore(nutrition, ingredients, processing, raw.category, raw.product_name);

    expect(recalcScore.score).toBe(importScore.score);
    expect(recalcScore.grade).toBe(importScore.grade);
    expect(recalcScore.breakdown).toEqual(importScore.breakdown);

    // fruitsVegetablesNuts must survive the round-trip
    expect(nutrition.fruitsVegetablesNuts).toBe(100);
  });

  // ─── 5. Cereales azucarados — NOVA 4, multiple additives, high sugar ─────
  it('cereales azucarados (NOVA 4, multiple additives): recalc reproduces import score', () => {
    const raw = {
      nutriments: {
        'energy-kcal_100g': 380,
        proteins_100g: 7,
        carbohydrates_100g: 80,
        fat_100g: 2,
        fiber_100g: 5,
        sugars_100g: 35,
        sodium_100g: 400,
        'saturated-fat_100g': 0.5,
      },
      nova_group: 4,
      additives_tags: ['en:e330', 'en:e322'],
      ingredients_text: 'maiz, azucar, harina de trigo, sal, vitaminas, colorante, aroma',
      product_name: 'Cereales de Desayuno',
      category: undefined as string | undefined,
    };

    const { persistedNI, ingredientsText, importScore } = simulateImport(raw);
    const { nutrition, ingredients, processing } = buildScoreInputs(persistedNI, ingredientsText);
    const recalcScore = scorer.calculateScore(nutrition, ingredients, processing, raw.category, raw.product_name);

    expect(recalcScore.score).toBe(importScore.score);
    expect(recalcScore.grade).toBe(importScore.grade);
    expect(recalcScore.breakdown).toEqual(importScore.breakdown);

    // novaGroup must survive
    expect(processing.novaGroup).toBe(4);
  });

  // ─── 6. Soda azucarada — regression: recalc must NOT produce sugar=0 ─────
  it('soda azucarada regression: buildScoreInputs must not produce energy=0 or sugars=0', () => {
    // Simulates a product where the old buggy recalc (passing nutritionalInfo
    // directly as NutritionInput) would have produced energy=0 and sugars=0.
    const persistedNI = {
      calories: 180,   // stored as "calories" (not "energy")
      sugar: 44,        // stored as "sugar" (not "sugars")
      fat: 0,
      saturatedFat: 0,
      sodium: 30,
      fiber: 0,
      protein: 0,
      novaGroup: 4,
      additivesTags: [] as string[],
    };

    const { nutrition } = buildScoreInputs(persistedNI, 'agua, azucar, aroma');

    // These would have been 0 under the old broken code
    expect(nutrition.energy).toBe(180);
    expect(nutrition.sugars).toBe(44);
  });
});

// ---------------------------------------------------------------------------
// splitIngredients — canonical rule unit tests
// ---------------------------------------------------------------------------
describe('splitIngredients', () => {
  it('splits on comma', () => {
    expect(splitIngredients('agua, sal, azucar')).toEqual(['agua', 'sal', 'azucar']);
  });

  it('splits on semicolon', () => {
    expect(splitIngredients('agua; sal; azucar')).toEqual(['agua', 'sal', 'azucar']);
  });

  it('trims whitespace', () => {
    expect(splitIngredients('  agua  ,  sal  ')).toEqual(['agua', 'sal']);
  });

  it('drops empty tokens', () => {
    expect(splitIngredients('agua,,sal')).toEqual(['agua', 'sal']);
  });

  it('returns empty array for null', () => {
    expect(splitIngredients(null)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(splitIngredients('')).toEqual([]);
  });

  it('returns single item for no delimiter', () => {
    expect(splitIngredients('agua')).toEqual(['agua']);
  });
});
