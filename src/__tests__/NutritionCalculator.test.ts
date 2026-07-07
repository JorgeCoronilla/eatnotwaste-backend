/**
 * Golden / Characterization Tests for NutritionCalculator
 *
 * PURPOSE: Freeze the CURRENT behavior (including any bugs) so that future
 * changes to the scoring engine are visible as test failures.
 * Do NOT assert what scores *should* be — assert what the engine returns TODAY.
 * Do NOT modify any source file when these tests fail; fix them only when the
 * engine intentionally changes during a refactor phase.
 *
 * Captured: 2026-07-07  Engine version: 1
 *
 * ── VERSION HISTORY ─────────────────────────────────────────────────────────
 * ENGINE_VERSION 1  → initial golden capture (2026-07-07, Phase 0)
 * ENGINE_VERSION 2  → frozen as of Phase 4 (2026-07-07)
 *   Phases 1-3 changed DATA-FLOW, EXTRACTION UNITS, and DEFENSIVE GUARDS only.
 *   The engine's scoring logic, thresholds, and response to any given set of
 *   inputs were NOT changed. Therefore all 10 golden numeric values below are
 *   IDENTICAL to the original capture and are expected to remain stable across
 *   any further data-flow or extraction refactors.
 *   Only a deliberate change to calculateNutritionScore / calculateIngredientsScore /
 *   calculateProcessingScore / penalizarSal / detectarSnackFrito should ever
 *   require updating these values.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest';
import scorer from '../services/NutritionCalculator';

describe('NutritionCalculator — golden characterization tests', () => {
  // ─── 1. Agua mineral ──────────────────────────────────────────────────────
  it('agua mineral (all zeros, nova 1) — perfect score', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0, fruitsVegetablesNuts: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
      undefined,
      'Agua Mineral'
    );

    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.breakdown.nutrition).toBe(50);
    expect(result.breakdown.ingredients).toBe(30);
    expect(result.breakdown.processing).toBe(20);
  });

  // ─── 2. Aceite de oliva ───────────────────────────────────────────────────
  // NOTE (suspicious): 900 kcal/100 g, 99 g fat, 14 g sat fat scores A (87).
  // The sat-fat penalty (-8 pts) fires but calorie density penalty is mild (-5).
  // High fat in a non-snack context barely moves the needle — flag for Phase 1.
  it('aceite de oliva (high kcal/fat, low sugar, nova 1) — scores A despite heavy fat', () => {
    const result = scorer.calculateScore(
      { energy: 900, sugars: 0, fat: 99, saturatedFat: 14, sodium: 0, fiber: 0, protein: 0, fruitsVegetablesNuts: 0 },
      { ingredients: ['aceite de oliva'], additives: [] },
      { novaGroup: 1 },
      undefined,
      'Aceite de Oliva'
    );

    expect(result.score).toBe(87);
    expect(result.grade).toBe('A');
    expect(result.breakdown.nutrition).toBe(37);
    expect(result.breakdown.ingredients).toBe(30);
    expect(result.breakdown.processing).toBe(20);
  });

  // ─── 3. Coca-Cola (refresco de cola) ─────────────────────────────────────
  it('coca-cola (high sugar, nova 4, beverage category) — scores C', () => {
    const result = scorer.calculateScore(
      { energy: 42, sugars: 10.6, fat: 0, saturatedFat: 0, sodium: 10, fiber: 0, protein: 0, fruitsVegetablesNuts: 0 },
      {
        ingredients: ['agua carbonatada', 'azucar', 'color caramelo', 'acido fosforico', 'aromas', 'cafeina'],
        additives: ['en:e150d', 'en:e338']
      },
      { novaGroup: 4 },
      'beverages',
      'Coca-Cola'
    );

    expect(result.score).toBe(50);
    expect(result.grade).toBe('C');
    expect(result.breakdown.nutrition).toBe(25);
    expect(result.breakdown.ingredients).toBe(25);
    expect(result.breakdown.processing).toBe(0);
  });

  // ─── 4. Patatas fritas / chips ────────────────────────────────────────────
  // NOTE (suspicious): 536 kcal, 35 g fat, 500 mg sodium, nova 4, category=snacks
  // scores C (55). Ingredients sub-score stays at 30 (no additives) which props
  // the overall score up significantly despite zero processing points.
  it('patatas fritas (fried snack — high kcal/fat/salt, nova 4) — scores C', () => {
    const result = scorer.calculateScore(
      { energy: 536, sugars: 0.5, fat: 35, saturatedFat: 3, sodium: 500, fiber: 4, protein: 6, fruitsVegetablesNuts: 0 },
      { ingredients: ['patatas', 'aceite de girasol', 'sal'], additives: [] },
      { novaGroup: 4 },
      'snacks',
      'Patatas Fritas'
    );

    expect(result.score).toBe(55);
    expect(result.grade).toBe('C');
    expect(result.breakdown.nutrition).toBe(25);
    expect(result.breakdown.ingredients).toBe(30);
    expect(result.breakdown.processing).toBe(0);
  });

  // ─── 5. Yogur natural ────────────────────────────────────────────────────
  // NOTE (suspicious): yogur natural scores A (80) yet emptyCaloriesSevere
  // penalty fires. The severity flag seems disproportionate for plain yogurt.
  it('yogur natural (moderate nutrients, nova 1) — scores A despite emptyCaloriesSevere', () => {
    const result = scorer.calculateScore(
      { energy: 61, sugars: 4.7, fat: 3.5, saturatedFat: 2.3, sodium: 50, fiber: 0, protein: 3.5, fruitsVegetablesNuts: 0 },
      { ingredients: ['leche desnatada', 'fermentos lacteos'], additives: [] },
      { novaGroup: 1 },
      undefined,
      'Yogur Natural'
    );

    expect(result.score).toBe(80);
    expect(result.grade).toBe('A');
    expect(result.breakdown.nutrition).toBe(30);
    expect(result.breakdown.ingredients).toBe(30);
    expect(result.breakdown.processing).toBe(20);
  });

  // ─── 6. Cereales de desayuno azucarados ──────────────────────────────────
  it('cereales azucarados (35 g sugar, nova 4) — scores C', () => {
    const result = scorer.calculateScore(
      { energy: 380, sugars: 35, fat: 2, saturatedFat: 0.5, sodium: 400, fiber: 5, protein: 7, fruitsVegetablesNuts: 0 },
      {
        ingredients: ['maiz', 'azucar', 'harina de trigo', 'sal', 'vitaminas', 'colorante', 'aroma'],
        additives: ['en:e330', 'en:e322']
      },
      { novaGroup: 4 },
      undefined,
      'Cereales de Desayuno'
    );

    expect(result.score).toBe(41);
    expect(result.grade).toBe('C');
    expect(result.breakdown.nutrition).toBe(15);
    expect(result.breakdown.ingredients).toBe(26);
    expect(result.breakdown.processing).toBe(0);
  });

  // ─── 7. Jamón cocido con nitritos ─────────────────────────────────────────
  // E250 (nitrito sódico) is classified risk=high → -10 pts on ingredients.
  it('jamon cocido con E250 (nitrito sodico, high-risk) — scores C', () => {
    const result = scorer.calculateScore(
      { energy: 120, sugars: 1, fat: 5, saturatedFat: 2, sodium: 800, fiber: 0, protein: 18, fruitsVegetablesNuts: 0 },
      {
        ingredients: ['carne de cerdo', 'agua', 'sal', 'azucar', 'especias'],
        additives: ['en:e250']
      },
      { novaGroup: 3 },
      undefined,
      'Jamon Cocido'
    );

    expect(result.score).toBe(52);
    expect(result.grade).toBe('C');
    expect(result.breakdown.nutrition).toBe(20);
    expect(result.breakdown.ingredients).toBe(22);
    expect(result.breakdown.processing).toBe(10);
  });

  // ─── 8. Manzana fresca ───────────────────────────────────────────────────
  // NOTE (suspicious): a fresh apple (nova 1, single ingredient, low everything)
  // scores B (75) not A because emptyCaloriesSevere fires on 10.4 g natural sugar.
  // Natural fruit sugar triggering "empty calories severe" looks like a bug.
  it('manzana fresca (nova 1, natural fruit) — scores B due to emptyCaloriesSevere on natural sugar', () => {
    const result = scorer.calculateScore(
      { energy: 52, sugars: 10.4, fat: 0.2, saturatedFat: 0, sodium: 1, fiber: 2.4, protein: 0.3, fruitsVegetablesNuts: 100 },
      { ingredients: ['manzana'], additives: [] },
      { novaGroup: 1 },
      undefined,
      'Manzana'
    );

    expect(result.score).toBe(75);
    expect(result.grade).toBe('B');
    expect(result.breakdown.nutrition).toBe(25);
    expect(result.breakdown.ingredients).toBe(30);
    expect(result.breakdown.processing).toBe(20);
  });

  // ─── 9. Producto con varios aditivos (E102 + E621 + E330) ────────────────
  // E102 = high (-10), E621 = moderate (-5), E330 = low (-2) → ingredients 13
  it('snack con E102+E621+E330 (multiple additives via tags) — scores C', () => {
    const result = scorer.calculateScore(
      { energy: 250, sugars: 5, fat: 10, saturatedFat: 2, sodium: 600, fiber: 1, protein: 5, fruitsVegetablesNuts: 0 },
      {
        ingredients: ['harina', 'aceite', 'sal', 'azucar', 'potenciador del sabor', 'colorante artificial'],
        additives: ['en:e102', 'en:e621', 'en:e330']
      },
      { novaGroup: 4 },
      'snacks',
      'Snack Artificioso'
    );

    expect(result.score).toBe(43);
    expect(result.grade).toBe('C');
    expect(result.breakdown.nutrition).toBe(30);
    expect(result.breakdown.ingredients).toBe(13);
    expect(result.breakdown.processing).toBe(0);
  });

  // ─── 10. Aditivo detectado por sinónimo en texto de ingredientes ──────────
  // "tartrazina" in ingredients text must be resolved to E102 (high risk).
  // "acido citrico" in text must resolve to E330 (low risk).
  // Both detected with additives: [] — exercises the synonym detection path.
  it('tartrazina en texto de ingredientes detectada como E102 (sinonimo path) — scores C', () => {
    const result = scorer.calculateScore(
      { energy: 200, sugars: 20, fat: 3, saturatedFat: 1, sodium: 100, fiber: 0, protein: 2, fruitsVegetablesNuts: 0 },
      {
        ingredients: ['azucar', 'gelatina', 'tartrazina', 'acido citrico'],
        additives: []  // intentionally empty — additive detected via synonym only
      },
      { novaGroup: 3 },
      undefined,
      'Gominola Colorida'
    );

    expect(result.score).toBe(55);
    expect(result.grade).toBe('C');
    expect(result.breakdown.nutrition).toBe(25);
    expect(result.breakdown.ingredients).toBe(20);
    expect(result.breakdown.processing).toBe(10);
  });
});
