/**
 * Component-level unit tests for FoodScorer (Phase 4.1)
 *
 * Since the sub-scorers (calculateNutritionScore, calculateIngredientsScore,
 * calculateProcessingScore, penalizarSal, detectarSnackFrito) are private,
 * each test exercises them through the public calculateScore() API while
 * crafting inputs that isolate a single component or behaviour at a time.
 * Assertions target breakdown.{nutrition,ingredients,processing} and
 * details.{penalties,positives}[].key values.
 *
 * All numeric assertions are exact and derived from manual trace of the engine
 * logic — do NOT replace them with toBeDefined() or approximate matchers
 * unless the engine intentionally changes.
 *
 * ENGINE_VERSION: 2  (component tests added in Phase 4)
 *
 * ── Behavioral surprises flagged (do NOT fix here) ──────────────────────────
 * FLAG-1: UPF_EXCEPTIONS (e.g. "aroma" in yogurt context) is defined at module
 *         level but is NOT applied in the calculateProcessingScore loop. The
 *         exception object exists but has no effect on the UPF score.  Yogurt
 *         products with enough suspicious terms are incorrectly pushed to NOVA 4.
 *
 * FLAG-2: The substring-matching strategy for UPF_SUSPICIOUS_TERMS means that
 *         a single ingredient word can match multiple list entries. For example,
 *         "colorante" in ingredient text matches both "colorante" (+1) and
 *         "colorant" (+1) from the list, yielding 2 suspicious-term points for
 *         one actual ingredient.
 *
 * FLAG-3: penalizarSal tier 1 (-5) does NOT add a penalty key to
 *         details.penalties; only tier 2 and tier 3 push keys
 *         ('penalties.highSodium' and 'penalties.highSodiumSevere'). Tier 0 and
 *         tier 1 are silent (no key).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest';
import scorer from '../services/NutritionCalculator';

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Pick penalty keys from details.penalties for concise assertions. */
function penaltyKeys(result: ReturnType<typeof scorer.calculateScore>): string[] {
  return result.details.penalties.map(p => p.key);
}

/** Pick positive keys from details.positives for concise assertions. */
function positiveKeys(result: ReturnType<typeof scorer.calculateScore>): string[] {
  return result.details.positives.map(p => p.key);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NUTRITION SUB-SCORE (breakdown.nutrition, max 50)
// ─────────────────────────────────────────────────────────────────────────────

describe('nutrition sub-score — sugar penalties', () => {
  /**
   * Isolation strategy for highSugar:
   * energy=2000 kcal keeps emptyCal = (21+0+0)/(20)*10 = 10.5 ≤ 20 → no emptyCalories.
   * kcal > 400 non-snack fires -5 but adds no penalty key.
   * sugars > 20 fires -10 AND pushes 'penalties.highSugar'.
   * score = 50 - 5 - 10 = 35.
   */
  it('sugars > 20 fires penalties.highSugar and reduces nutrition score', () => {
    const result = scorer.calculateScore(
      { energy: 2000, sugars: 21, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.nutrition).toBe(35);
    expect(penaltyKeys(result)).toContain('penalties.highSugar');
  });

  /**
   * sugars > 10 but ≤ 20: -5 silent penalty (no key pushed).
   * energy=2000 keeps emptyCal low.
   * score = 50 - 5(kcal>400) - 5(10<sugar≤20) = 40.
   */
  it('sugars between 10 and 20 applies -5 without a penalty key', () => {
    const result = scorer.calculateScore(
      { energy: 2000, sugars: 15, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.nutrition).toBe(40);
    expect(penaltyKeys(result)).not.toContain('penalties.highSugar');
  });

  it('sugars ≤ 10 does not fire highSugar', () => {
    const result = scorer.calculateScore(
      { energy: 2000, sugars: 10, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(penaltyKeys(result)).not.toContain('penalties.highSugar');
  });
});

describe('nutrition sub-score — saturated fat penalty', () => {
  /**
   * Isolation strategy:
   * energy=550, satFat=11, sugars=0, sodium=0.
   * emptyCal = (0+11+0)/(550/100)*10 = 11/5.5*10 = 20.0 → NOT > 20 → no emptyCalories.
   * kcal=550 > 400 → non-snack calorie penalty -5 (no key pushed).
   * satFat > 10 → -8 AND 'penalties.saturatedFat'.
   * score = 50 - 5 - 8 = 37.
   */
  it('saturatedFat > 10 fires penalties.saturatedFat', () => {
    const result = scorer.calculateScore(
      { energy: 550, sugars: 0, fat: 11, saturatedFat: 11, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.nutrition).toBe(37);
    expect(penaltyKeys(result)).toContain('penalties.saturatedFat');
  });

  it('saturatedFat ≤ 10 does not fire saturatedFat penalty', () => {
    const result = scorer.calculateScore(
      { energy: 550, sugars: 0, fat: 10, saturatedFat: 10, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(penaltyKeys(result)).not.toContain('penalties.saturatedFat');
  });
});

describe('nutrition sub-score — calorie density branches', () => {
  /**
   * Snack (category=snacks) with kcal > 400, protein < 5 AND fiber < 3:
   * fires 'penalties.highCalorieDensity' (-15).
   * No fat penalty (totalFat ≤ 20). No salt/sugar/emptyCal (all zero).
   * score = 50 - 15 = 35.
   */
  it('snack kcal > 400 with low protein & fiber fires highCalorieDensity (-15)', () => {
    const result = scorer.calculateScore(
      { energy: 450, sugars: 0, fat: 5, saturatedFat: 0, sodium: 0, fiber: 0, protein: 2 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
      'snacks',
      'test snack',
    );

    expect(result.breakdown.nutrition).toBe(35);
    expect(penaltyKeys(result)).toContain('penalties.highCalorieDensity');
  });

  /**
   * Snack kcal > 400 with protein ≥ 5: fires the lesser -10 branch (no key).
   * No other penalties.
   * score = 50 - 10 = 40.
   */
  it('snack kcal > 400 with protein >= 5 applies -10 (no highCalorieDensity key)', () => {
    const result = scorer.calculateScore(
      { energy: 450, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 5 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
      'snacks',
      'test snack',
    );

    expect(result.breakdown.nutrition).toBe(40);
    expect(penaltyKeys(result)).not.toContain('penalties.highCalorieDensity');
  });

  /**
   * Non-snack kcal > 400: only -5 (no key).
   * All other inputs zero → no emptyCal (kcal > 0 but sugars+satFat+sodium/400 = 0).
   * score = 50 - 5 = 45.
   */
  it('non-snack kcal > 400 applies only -5 with no calorie penalty key', () => {
    const result = scorer.calculateScore(
      { energy: 450, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.nutrition).toBe(45);
    expect(penaltyKeys(result)).not.toContain('penalties.highCalorieDensity');
  });

  /**
   * Snack kcal > 350 but ≤ 400: fires the 350-tier (-8, no key).
   * score = 50 - 8 = 42.
   */
  it('snack 350 < kcal <= 400 applies -8 without highCalorieDensity key', () => {
    const result = scorer.calculateScore(
      { energy: 380, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
      'snacks',
      'test snack',
    );

    expect(result.breakdown.nutrition).toBe(42);
    expect(penaltyKeys(result)).not.toContain('penalties.highCalorieDensity');
  });
});

describe('nutrition sub-score — penalizarSal tiers (non-snack, general limit 1.5 g salt)', () => {
  /**
   * All tests use energy=0 so the emptyCal block is skipped, giving clean isolation.
   * General limit = 1.5 g salt → threshold sodium values (sodium mg / 400 = salt g):
   *   tier 0 (no penalty, no key) : salt ≤ 0.75 g → sodium ≤ 300 mg
   *   tier 1 (-5, no key)         : salt ≤ 1.5 g  → sodium ≤ 600 mg
   *   tier 2 (-10, highSodium)    : salt ≤ 2.25 g → sodium ≤ 900 mg
   *   tier 3 (-15, highSodiumSevere): salt > 2.25 g → sodium > 900 mg
   *
   * FLAG-3: tier 1 is silent (no key in details.penalties).
   */

  it('sodium 200 mg (tier 0): no salt deduction, no penalty key', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 200, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.nutrition).toBe(50);
    expect(penaltyKeys(result)).not.toContain('penalties.highSodium');
    expect(penaltyKeys(result)).not.toContain('penalties.highSodiumSevere');
  });

  it('sodium 400 mg (tier 1): -5 deduction, no penalty key pushed (silent tier)', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 400, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    // score = 50 - 5 = 45
    expect(result.breakdown.nutrition).toBe(45);
    // FLAG-3: tier 1 pushes no key — confirmed by exact assertion
    expect(penaltyKeys(result)).not.toContain('penalties.highSodium');
    expect(penaltyKeys(result)).not.toContain('penalties.highSodiumSevere');
  });

  it('sodium 700 mg (tier 2): -10 deduction and penalties.highSodium key', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 700, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    // score = 50 - 10 = 40
    expect(result.breakdown.nutrition).toBe(40);
    expect(penaltyKeys(result)).toContain('penalties.highSodium');
  });

  it('sodium 1000 mg (tier 3): -15 deduction and penalties.highSodiumSevere key', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 1000, fiber: 0, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    // score = 50 - 15 = 35
    expect(result.breakdown.nutrition).toBe(35);
    expect(penaltyKeys(result)).toContain('penalties.highSodiumSevere');
  });
});

describe('nutrition sub-score — fiber bonus for non-snacks', () => {
  /**
   * fiber > 5 AND non-snack → +5 bonus (positives.fiber key).
   * With all inputs zero and energy=0, score starts at 50 and the +5 bonus
   * pushes it to 55, which is capped at 50. So score=50 but the key is present.
   */
  it('fiber > 5 in non-snack adds positives.fiber key (capped at 50)', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 6, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.nutrition).toBe(50);
    expect(positiveKeys(result)).toContain('positives.fiber');
  });

  it('fiber > 5 in a snack (category=snacks) does NOT add fiber bonus', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 6, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
      'snacks',
      'test snack',
    );

    expect(positiveKeys(result)).not.toContain('positives.fiber');
  });

  it('fiber = 5 (not > 5) does NOT trigger fiber bonus', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 5, protein: 0 },
      { ingredients: [], additives: [] },
      { novaGroup: 1 },
    );

    expect(positiveKeys(result)).not.toContain('positives.fiber');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. INGREDIENTS SUB-SCORE (breakdown.ingredients, max 30)
// ─────────────────────────────────────────────────────────────────────────────

describe('ingredients sub-score — additive detection via OFF tag', () => {
  /**
   * E250 (nitrito de sodio) classified as risk=high → -10.
   * Tag format: 'en:e250' → extracted to 'E250'.
   * Using 6 neutral ingredient items (> 5) to suppress the shortList bonus.
   * score = 30 - 10 = 20.
   */
  it('E250 via OFF tag "en:e250" → risks.high penalty, score 20', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['agua', 'harina', 'leche', 'huevo', 'sal', 'especias'],
        additives: ['en:e250'],
      },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(20);
    expect(penaltyKeys(result)).toContain('risks.high');
    const e250penalty = result.details.penalties.find(p => p.key === 'risks.high');
    expect(e250penalty?.params?.code).toBe('E250');
  });

  /**
   * E924 (cancerígeno demostrado) classified as risk=severe → -15.
   * Using 6 neutral ingredient items (> 5) to suppress the shortList bonus.
   * score = 30 - 15 = 15.
   */
  it('E924 via OFF tag → risks.severe penalty (-15), score 15', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['harina', 'agua', 'leche', 'huevo', 'sal', 'especias'],
        additives: ['en:e924'],
      },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(15);
    expect(penaltyKeys(result)).toContain('risks.severe');
    const e924penalty = result.details.penalties.find(p => p.key === 'risks.severe');
    expect(e924penalty?.params?.code).toBe('E924');
  });
});

describe('ingredients sub-score — additive detection via regex in ingredient text', () => {
  /**
   * 'E-250' in ingredient text matches the regex /\b(?:E|INS)[-\s]?(\d{3,4}[a-z]?)\b/gi
   * → detected as E250 (high risk) → -10.
   * additives: [] so only the text regex path is exercised.
   * Using 6 ingredient items (> 5) to suppress the shortList bonus.
   * score = 30 - 10 = 20.
   */
  it('"E-250" in ingredient text detected as E250 (high risk), score 20', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['carne', 'agua', 'harina', 'leche', 'especias', 'E-250'], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(20);
    expect(penaltyKeys(result)).toContain('risks.high');
  });

  /**
   * 'INS 250' format also matches the regex → E250 detected.
   * Using 6 ingredient items (> 5) to suppress the shortList bonus.
   */
  it('"INS 250" in ingredient text detected as E250, score 20', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['carne de cerdo', 'agua', 'harina', 'leche', 'especias', 'INS 250'],
        additives: [],
      },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(20);
    expect(penaltyKeys(result)).toContain('risks.high');
  });
});

describe('ingredients sub-score — additive detection via synonym name', () => {
  /**
   * 'nitrito de sodio' is a synonym for E250 in ADDITIVE_SYNONYMS.
   * Detection goes through the synonym path (no tag, no E-code in text).
   * E250 risk=high → -10.
   * Using 6 ingredient items (> 5) to suppress the shortList bonus.
   * score = 30 - 10 = 20.
   */
  it('"nitrito de sodio" in ingredients list resolved to E250 via synonym, score 20', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['carne', 'agua', 'harina', 'leche', 'especias', 'nitrito de sodio'],
        additives: [],
      },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(20);
    expect(penaltyKeys(result)).toContain('risks.high');
    const highPenalty = result.details.penalties.find(p => p.key === 'risks.high');
    expect(highPenalty?.params?.code).toBe('E250');
  });

  /**
   * 'tartrazina' resolves to E102 (high risk, -10).
   * Using 6 ingredient items (> 5) to suppress the shortList bonus.
   * score = 30 - 10 = 20.
   */
  it('"tartrazina" resolved to E102 via synonym, score 20', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['azucar', 'gelatina', 'agua', 'harina', 'huevo', 'tartrazina'],
        additives: [],
      },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(20);
    const highPenalty = result.details.penalties.find(p => p.key === 'risks.high');
    expect(highPenalty?.params?.code).toBe('E102');
  });
});

describe('ingredients sub-score — excess additives', () => {
  /**
   * > 4 additives with NO hazardous risk (all low-risk) triggers excessAdditives.
   * Using 5 low-risk additives: E202, E330, E322, E415, E412.
   * Each low-risk costs -2. After 5 × -2 = -10, the excessAdditives check fires
   * (!hasHazard AND detectedAdditives.size > 4) → -5 more.
   * Using 6 ingredient items (> 5) to suppress the shortList bonus.
   * score = 30 - 10 - 5 = 15.
   */
  it('5 low-risk additives with no hazard fires penalties.excessAdditives, score 15', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['agua', 'harina', 'leche', 'huevo', 'sal', 'especias'],
        additives: ['en:e202', 'en:e330', 'en:e322', 'en:e415', 'en:e412'],
      },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(15);
    expect(penaltyKeys(result)).toContain('penalties.excessAdditives');
  });

  /**
   * 4 low-risk additives (not > 4): excessAdditives must NOT fire.
   */
  it('exactly 4 low-risk additives does NOT fire excessAdditives', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['agua', 'harina', 'leche', 'huevo', 'sal', 'especias'],
        additives: ['en:e202', 'en:e330', 'en:e322', 'en:e415'],
      },
      { novaGroup: 1 },
    );

    expect(penaltyKeys(result)).not.toContain('penalties.excessAdditives');
  });

  /**
   * A high-risk additive sets hasHazard=true, which suppresses excessAdditives
   * even when total detectedAdditives.size > 4.
   */
  it('5 additives with 1 high-risk does NOT fire excessAdditives (hasHazard suppresses it)', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['agua', 'harina', 'leche', 'huevo', 'sal', 'especias'],
        // E250 is high-risk → hasHazard=true → excessAdditives suppressed
        additives: ['en:e250', 'en:e202', 'en:e330', 'en:e322', 'en:e415'],
      },
      { novaGroup: 1 },
    );

    expect(penaltyKeys(result)).not.toContain('penalties.excessAdditives');
  });
});

describe('ingredients sub-score — penalized ingredients', () => {
  /**
   * 'aceite de palma' is in PENALIZED_INGREDIENTS list → -3 and 'penalties.contains' key.
   * No additives, no excess, no snackFrito.
   * Using 6 ingredient items (> 5) to suppress the shortList bonus.
   * score = 30 - 3 = 27. Also positives.noAdditives is present.
   */
  it('"aceite de palma" fires penalties.contains and costs -3, score 27', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['harina', 'azucar', 'leche', 'huevo', 'levadura', 'aceite de palma'],
        additives: [],
      },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(27);
    expect(penaltyKeys(result)).toContain('penalties.contains');
    const containsPenalty = result.details.penalties.find(p => p.key === 'penalties.contains');
    expect(containsPenalty?.params?.ingredient).toBe('aceite de palma');
    expect(positiveKeys(result)).toContain('positives.noAdditives');
  });
});

describe('ingredients sub-score — short-list bonus', () => {
  /**
   * ≤ 5 ingredients, no fried snack, no triad → +2 bonus → score = 32 → capped at 30.
   * positives.shortList must be present.
   */
  it('≤ 5 clean ingredients grant positives.shortList (capped at 30)', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['leche', 'fermentos lacteos'], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.ingredients).toBe(30); // 30 + 2 → capped at 30
    expect(positiveKeys(result)).toContain('positives.shortList');
  });

  /**
   * Potato/oil/salt triad with ≤ 3 ingredients suppresses the shortList bonus.
   * Ingredients: ['patatas', 'aceite', 'sal'] → triad detected → allowBonus=false.
   * No additives → noAdditives positive is still present.
   * score = 30 (no bonus).
   */
  it('potato+oil+salt triad (≤ 3 ingredients) suppresses positives.shortList', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['patatas', 'aceite', 'sal'], additives: [] },
      { novaGroup: 1 },
      undefined,
      'Galleta Baja en Calorías', // not a snack name → isSnackFrito only from snack keywords
    );

    expect(result.breakdown.ingredients).toBe(30);
    expect(positiveKeys(result)).not.toContain('positives.shortList');
  });

  /**
   * Fried snack detection (detectarSnackFrito) sets isSnackFrito=true, which
   * hard-suppresses the shortList bonus regardless of ingredient count.
   * productName includes 'chip' (snack keyword) + oil in top 3 → snackFrito.
   */
  it('fried snack (isSnackFrito) suppresses positives.shortList', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['patatas', 'aceite de girasol', 'sal'], additives: [] },
      { novaGroup: 4 },
      undefined,
      'Chips de Patata', // 'chip' keyword triggers esSnack; oil in top 3 → snackFrito
    );

    expect(positiveKeys(result)).not.toContain('positives.shortList');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROCESSING SUB-SCORE (breakdown.processing, max 20)
// ─────────────────────────────────────────────────────────────────────────────

describe('processing sub-score — explicit NOVA group', () => {
  /**
   * NOVA 1 → score=20 (full points) AND positives.processing.nova1.
   * No ingredient text that would trigger UPF detection.
   */
  it('novaGroup 1 → processing score 20 and processing.nova1 positive', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua'], additives: [] },
      { novaGroup: 1 },
    );

    expect(result.breakdown.processing).toBe(20);
    expect(positiveKeys(result)).toContain('processing.nova1');
  });

  /**
   * NOVA 3 → score=10 AND penalties.processing.nova3.
   * Ingredient text is benign to avoid UPF override.
   */
  it('novaGroup 3 → processing score 10 and processing.nova3 penalty', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['carne', 'agua', 'sal', 'especias'], additives: [] },
      { novaGroup: 3 },
    );

    expect(result.breakdown.processing).toBe(10);
    expect(penaltyKeys(result)).toContain('processing.nova3');
  });

  /**
   * NOVA 4 (explicit, no fried snack) → score=0 AND penalties.processing.nova4.
   * Ingredient text is benign; UPF heuristic would not change the already-4 NOVA.
   */
  it('novaGroup 4 → processing score 0 and processing.nova4 penalty', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua', 'sal'], additives: [] },
      { novaGroup: 4 },
    );

    expect(result.breakdown.processing).toBe(0);
    expect(penaltyKeys(result)).toContain('processing.nova4');
  });
});

describe('processing sub-score — fried snack forced to NOVA 4', () => {
  /**
   * detectarSnackFrito returns true when:
   *   esSnack (keyword in productName or 'snack' in joined ingredients) AND
   *   oil in the top-3 ingredients.
   * When true, nova is overridden to 4 and 'processing.ultraProcessedIng' is pushed.
   * Even if novaGroup was 1, processing score becomes 0.
   */
  it('fried snack overrides NOVA to 4 and fires processing.ultraProcessedIng', () => {
    // 'chip' keyword in productName (snack trigger); 'aceite' in index 1 (top 3)
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['patatas', 'aceite de girasol', 'sal'], additives: [] },
      { novaGroup: 1 }, // would be 20 but snack override → 0
      undefined,
      'Chips de Patata',
    );

    expect(result.breakdown.processing).toBe(0);
    expect(penaltyKeys(result)).toContain('processing.ultraProcessedIng');
    // nova4 key is suppressed because ultraProcessedIng is already there
    expect(penaltyKeys(result)).not.toContain('processing.nova4');
  });
});

describe('processing sub-score — UPF weighted detector', () => {
  /**
   * Definitive terms weight 2 each; suspicious terms weight 1 each.
   * Threshold: upfScore >= 3 → forced NOVA 4.
   *
   * Two definitive terms: 'glutamato' (+2) and 'dextrose' (+2) = 4 pts ≥ 3 → NOVA 4.
   * novaGroup=2 is provided but overridden.
   * Note: 'glutamato' also matches 'glutamate' (separate definitive entry)? No —
   *   the normalized text 'glutamato monosodico' includes 'glutamato' but not 'glutamate'.
   */
  it('two definitive UPF terms (score ≥ 3) override NOVA to 4 via heuristic', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['harina', 'glutamato monosodico', 'dextrose'],
        additives: [],
      },
      { novaGroup: 2 },
    );

    expect(result.breakdown.processing).toBe(0);
    expect(penaltyKeys(result)).toContain('processing.ultraProcessedIng');
  });

  /**
   * Three suspicious terms each score 1 pt → upfScore = 3 ≥ 3 → NOVA 4.
   * Uses 'emulgente', 'espesante', 'estabilizante' (no substring overlap with each other
   * or with definitive terms).
   */
  it('three suspicious UPF terms (upfScore = 3) override NOVA to 4', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['agua', 'emulgente lecitina', 'espesante goma guar', 'estabilizante'],
        additives: [],
      },
      { novaGroup: 2 },
    );

    expect(result.breakdown.processing).toBe(0);
    expect(penaltyKeys(result)).toContain('processing.ultraProcessedIng');
  });

  /**
   * One definitive term alone gives 2 pts < 3 → NOVA NOT overridden (stays at 3).
   * Checking the secondary heuristic: upfScore >= 2 AND ingredients.length > 5 → NOVA 4.
   * With only 3 ingredients + upfScore=2: length NOT > 5, so stays NOVA 3.
   */
  it('one definitive term (upfScore=2) with ≤ 5 ingredients does NOT override NOVA 3', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['harina', 'dextrose', 'sal'],  // 3 items, upfScore=2
        additives: [],
      },
      { novaGroup: 3 },
    );

    // NOVA 3 stays → processing = 10
    expect(result.breakdown.processing).toBe(10);
    expect(penaltyKeys(result)).toContain('processing.nova3');
    expect(penaltyKeys(result)).not.toContain('processing.ultraProcessedIng');
  });

  /**
   * Secondary heuristic: upfScore >= 2 AND ingredients.length > 5 → NOVA 4.
   * One definitive term ('dextrose', +2) + 6 total ingredients → overrides NOVA 3.
   */
  it('one definitive term + 6 ingredients (secondary heuristic) overrides NOVA to 4', () => {
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['harina', 'dextrose', 'agua', 'sal', 'azucar', 'levadura'],  // 6 items
        additives: [],
      },
      { novaGroup: 3 },
    );

    expect(result.breakdown.processing).toBe(0);
    expect(penaltyKeys(result)).toContain('processing.ultraProcessedIng');
  });

  /**
   * FLAG-1: UPF_EXCEPTIONS is defined (e.g. "aroma" exempt in yogurt context)
   * but NOT applied in calculateProcessingScore. This test documents ACTUAL behavior:
   * 'aroma' in a yogurt product with enough other suspicious terms still pushes NOVA 4.
   *
   * Note: This test asserts the CURRENT (buggy) behavior and would flip if exceptions
   * are ever implemented.
   */
  it('FLAG-1: "aroma" in yogurt context is NOT excepted — still counted as suspicious (UPF_EXCEPTIONS unused)', () => {
    // 'aroma' (+1) + 'colorante' (+1) + 'colorant' (+1 via substring) + 'estabilizante' (+1) = 4 ≥ 3 → NOVA 4
    // If exceptions were applied, 'aroma' would be exempt → upfScore drops but may still hit 3
    const result = scorer.calculateScore(
      { energy: 0, sugars: 0, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['yogur natural', 'leche', 'aroma', 'colorante artificial', 'estabilizante'],
        additives: [],
      },
      { novaGroup: 2 },
      undefined,
      'Yogur con Aroma',
    );

    // Actual behavior: UPF_EXCEPTIONS not applied → NOVA 4 override fires
    expect(result.breakdown.processing).toBe(0);
    expect(penaltyKeys(result)).toContain('processing.ultraProcessedIng');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GRADE BOUNDARIES
// ─────────────────────────────────────────────────────────────────────────────

describe('getGrade — boundary assertions', () => {
  /**
   * Boundary: score >= 80 → 'A'.
   * Using yogur-natural-like inputs (same as golden test #5):
   *   nutrition=30, ingredients=30, processing=20 → total=80 → exactly at A boundary.
   */
  it('total score = 80 → grade A (lower A boundary)', () => {
    const result = scorer.calculateScore(
      { energy: 61, sugars: 4.7, fat: 3.5, saturatedFat: 2.3, sodium: 50, fiber: 0, protein: 3.5 },
      { ingredients: ['leche desnatada', 'fermentos lacteos'], additives: [] },
      { novaGroup: 1 },
      undefined,
      'Yogur Natural',
    );

    expect(result.score).toBe(80);
    expect(result.grade).toBe('A');
  });

  /**
   * Boundary: score < 80 → 'B'. Use nova3 instead of nova1 to lose 10 points:
   *   nutrition=30 (yogur-like), ingredients=30 (clean, 2 items → shortList capped at 30),
   *   processing=10 (nova3) → total=70 → grade B.
   */
  it('total score = 70 → grade B', () => {
    const result = scorer.calculateScore(
      { energy: 61, sugars: 4.7, fat: 3.5, saturatedFat: 2.3, sodium: 50, fiber: 0, protein: 3.5 },
      { ingredients: ['leche desnatada', 'fermentos lacteos'], additives: [] },
      { novaGroup: 3 },
      undefined,
      'Yogur Natural',
    );

    expect(result.score).toBe(70);
    expect(result.grade).toBe('B');
  });

  /**
   * Boundary: score >= 40 but < 60 → 'C'.
   * energy=100, sugars=15: emptyCal = 150 > 40 → severe (-20); sugar > 10 → -5.
   * nutrition = 50 - 20 - 5 = 25.
   * ingredients=30 (no additives, 2 items → shortList capped at 30).
   * processing=0 (nova4).
   * total = 25 + 30 + 0 = 55 → grade C.
   */
  it('total score = 55 → grade C', () => {
    const result = scorer.calculateScore(
      { energy: 100, sugars: 15, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      { ingredients: ['agua', 'azucar'], additives: [] },
      { novaGroup: 4 },
    );

    expect(result.score).toBe(55);
    expect(result.grade).toBe('C');
  });

  /**
   * Boundary: score >= 20 but < 40 → 'D'.
   * energy=100, sugars=25: emptyCal = 250 > 40 → severe (-20); sugar > 20 → -10.
   * nutrition = 50 - 20 - 10 = 20.
   * ingredients: E250 (high -10) + E102 (high -10) → 30 - 20 = 10. hasHazard=true.
   * Using 6 ingredient items (> 5) to suppress the shortList bonus.
   * processing=0 (nova4).
   * total = 20 + 10 + 0 = 30 → grade D.
   */
  it('total score = 30 → grade D', () => {
    const result = scorer.calculateScore(
      { energy: 100, sugars: 25, fat: 0, saturatedFat: 0, sodium: 0, fiber: 0, protein: 0 },
      {
        ingredients: ['agua', 'harina', 'leche', 'huevo', 'sal', 'especias'],
        additives: ['en:e250', 'en:e102'],
      },
      { novaGroup: 4 },
    );

    expect(result.score).toBe(30);
    expect(result.grade).toBe('D');
  });

  /**
   * Boundary: score < 20 → 'E'.
   * energy=100, sugars=25, sodium=1000:
   *   highSodiumSevere (-15); sugar > 20 (-10);
   *   emptyCal = (25+0+2.5)/(1)*10 = 275 → severe (-20).
   *   nutrition = max(0, 50-15-10-20) = 5.
   * ingredients: E924 (severe -15) + E102 (high -10) → 30-25=5. hasHazard=true.
   * Using 6 ingredient items (> 5) to suppress the shortList bonus.
   * processing=0 (nova4).
   * total = 5 + 5 + 0 = 10 → grade E.
   */
  it('total score = 10 → grade E', () => {
    const result = scorer.calculateScore(
      { energy: 100, sugars: 25, fat: 0, saturatedFat: 0, sodium: 1000, fiber: 0, protein: 0 },
      {
        ingredients: ['agua', 'harina', 'leche', 'huevo', 'sal', 'especias'],
        additives: ['en:e924', 'en:e102'],
      },
      { novaGroup: 4 },
    );

    expect(result.score).toBe(10);
    expect(result.grade).toBe('E');
  });
});
