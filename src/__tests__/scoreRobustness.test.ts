/**
 * Robustness edge-case tests for NutritionCalculator (Phase 3)
 *
 * These tests verify that the engine handles dirty / missing inputs gracefully
 * without altering results for clean inputs (which are locked by the golden
 * characterization tests in NutritionCalculator.test.ts).
 */

import { describe, it, expect } from 'vitest';
import scorer from '../services/NutritionCalculator';
import { buildScoreInputs } from '../services/scoreInputs';

// ---------------------------------------------------------------------------
// 3.1 — Defensive input sanitization (coerceNumber)
// ---------------------------------------------------------------------------

describe('coerceNumber sanitization — dirty inputs become 0, clean inputs unchanged', () => {
  it('NaN energy field is treated as 0 (no NaN in output score)', () => {
    const result = scorer.calculateScore(
      { energy: NaN, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
    );
    expect(isNaN(result.score)).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('negative sodium is treated as 0 (no penalty for imaginary negative sodium)', () => {
    const resultNeg = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: -999, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
    );
    const resultZero = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
    );
    // Negative sodium must produce the same result as sodium=0
    expect(resultNeg.score).toBe(resultZero.score);
    expect(resultNeg.breakdown.nutrition).toBe(resultZero.breakdown.nutrition);
  });

  it('undefined fields all produce a finite score (no crash, no NaN)', () => {
    // Pass a completely empty NutritionInput — every field is undefined
    const result = scorer.calculateScore(
      {},
      { ingredients: [], additives: [] },
      {},
    );
    expect(isNaN(result.score)).toBe(false);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('string-where-number energy field does not propagate NaN', () => {
    // TypeScript prevents this at compile time but runtime data from OFF can be strings.
    const result = scorer.calculateScore(
      { energy: 'N/A' as unknown as number, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
    );
    expect(isNaN(result.score)).toBe(false);
    // String energy coerced to 0 → same as zero-energy water
    expect(result.breakdown.nutrition).toBe(50);
  });

  it('Infinity energy is treated as 0 (isFinite guard)', () => {
    const result = scorer.calculateScore(
      { energy: Infinity, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
    );
    expect(isNaN(result.score)).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('negative sugars are treated as 0 (no phantom bonus from inverted penalty logic)', () => {
    const resultNeg = scorer.calculateScore(
      { energy: 100, sugars: -50, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      {},
    );
    const resultZeroSugar = scorer.calculateScore(
      { energy: 100, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      {},
    );
    expect(resultNeg.breakdown.nutrition).toBe(resultZeroSugar.breakdown.nutrition);
  });
});

// ---------------------------------------------------------------------------
// 3.2 — Salt (g) → Sodium (mg) derivation in extractNutrition
// ---------------------------------------------------------------------------

describe('salt→sodium derivation in buildScoreInputs / extractNutrition', () => {
  it('salt-only product: sodium derived from salt_g × 400 produces a non-zero sodium in mg', () => {
    // Simulate what buildScoreInputs receives after extractNutrition ran:
    // sodium_100g absent, salt_100g = 1.5 g → sodium = 1.5 × 400 = 600 mg
    // We test the score engine side: passing 600 mg sodium should apply a penalty,
    // whereas 0 mg would not. This confirms the derivation matters for scoring.
    const withSodium = scorer.calculateScore(
      { energy: 200, sugars: 0, fat: 0, saturatedFat: 0, sodium: 600, fiber: 0, protein: 0 },
      { ingredients: ['harina', 'agua', 'sal'], additives: [] },
      {},
    );
    const withoutSodium = scorer.calculateScore(
      { energy: 200, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['harina', 'agua'], additives: [] },
      {},
    );
    // With 600 mg sodium the salt penalty fires; without sodium it doesn't
    expect(withSodium.breakdown.nutrition).toBeLessThan(withoutSodium.breakdown.nutrition);
  });

  it('buildScoreInputs round-trip: sodium_100g in g is stored as-is; engine sees mg after coerce', () => {
    // If extractNutrition already converted to mg and stored in persistedNI.sodium,
    // then buildScoreInputs should pass it through unchanged.
    const persistedNI = {
      calories: 120,
      sugar: 1,
      fat: 5,
      saturatedFat: 2,
      sodium: 800, // already in mg (as stored after extraction)
      fiber: 0,
      protein: 18,
      novaGroup: 3,
      additivesTags: [] as string[],
    };
    const { nutrition } = buildScoreInputs(persistedNI, 'carne de cerdo, agua, sal');
    expect(nutrition.sodium).toBe(800);
  });
});

// ---------------------------------------------------------------------------
// 3.3 — No-data detection and confidence field
// ---------------------------------------------------------------------------

describe('no-data detection — confidence field', () => {
  it('fully empty NutritionInput (all undefined) → confidence: low', () => {
    const result = scorer.calculateScore(
      {},
      { ingredients: [], additives: [] },
      {},
    );
    expect(result.confidence).toBe('low');
  });

  it('product with explicit zero values → confidence NOT low (real data present)', () => {
    // Mineral water: all zeros — this is real measured data, not missing data
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
    );
    // confidence should be absent (or 'full') — NOT 'low'
    expect(result.confidence).not.toBe('low');
  });

  it('partial data (only energy provided) → confidence NOT low', () => {
    const result = scorer.calculateScore(
      { energy: 200 },
      { ingredients: [], additives: [] },
      {},
    );
    expect(result.confidence).not.toBe('low');
  });

  it('fully empty product does NOT produce a naive perfect score with full confidence', () => {
    const result = scorer.calculateScore(
      {},
      { ingredients: [], additives: [] },
      {},
    );
    // Score may still be 100 due to defaults, but confidence MUST be 'low'
    // so consumers know not to trust it
    expect(result.confidence).toBe('low');
  });

  it('agua mineral golden: score=100, grade=A, confidence absent (not low)', () => {
    // Confirm the golden product is unaffected
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0, fruitsVegetablesNuts: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
      undefined,
      'Agua Mineral',
    );
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.confidence).not.toBe('low');
  });

  it('only fruitsVegetablesNuts provided with rest undefined → confidence low (fvn not a key field)', () => {
    // fruitsVegetablesNuts is NOT one of the 7 key fields — if only it is present
    // the no-data detection should still fire
    const result = scorer.calculateScore(
      { fruitsVegetablesNuts: 80 },
      { ingredients: [], additives: [] },
      {},
    );
    expect(result.confidence).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// 3.4 — splitIngredients used in LLM path (integration smoke test via scoreInputs)
// ---------------------------------------------------------------------------

describe('splitIngredients — LLM path consistency', () => {
  it('splitIngredients handles semicolons as well as commas', () => {
    // The LLM may generate ingredients with semicolons; the old .split(',') would not handle them
    const { ingredients } = buildScoreInputs(
      { calories: 100, sugar: 2, fat: 1, saturatedFat: 0.3, sodium: 50, fiber: 1, protein: 3 },
      'agua; sal; azucar',
    );
    expect(ingredients.ingredients).toEqual(['agua', 'sal', 'azucar']);
  });

  it('splitIngredients trims whitespace around items', () => {
    const { ingredients } = buildScoreInputs(
      { calories: 100, sugar: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      '  agua  ,  sal  ',
    );
    expect(ingredients.ingredients).toEqual(['agua', 'sal']);
  });

  it('null ingredients string → empty array (no crash)', () => {
    const { ingredients } = buildScoreInputs({}, null);
    expect(ingredients.ingredients).toEqual([]);
  });
});
