/**
 * scoreInputs.ts — Single source of truth for building NutritionCalculator arguments
 * from a persisted nutritionalInfo blob + ingredients string.
 *
 * Both the import path (ProductAPIService) and the recalc-on-read path
 * (productController) MUST derive their calculateScore arguments through
 * this module so they always agree.
 */

import type { NutritionInput, IngredientInput, ProcessingInput } from './NutritionCalculator';

/**
 * The shape of a persisted nutritionalInfo object.
 * Matches NutritionalInfo from src/types/ProductDTO.ts but is declared
 * locally here to avoid a circular import through src/types/index.ts.
 */
export interface PersistedNutritionInfo {
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
  // Score-engine inputs persisted at import time
  novaGroup?: number;
  additivesTags?: string[];
  fruitsVegetablesNuts?: number;
  [key: string]: number | string[] | undefined;
}

export interface ScoreInputs {
  nutrition: NutritionInput;
  ingredients: IngredientInput;
  processing: ProcessingInput;
}

/**
 * Canonical ingredient-splitting rule used across every code path.
 * Splits on comma or semicolon, trims whitespace, drops empty tokens.
 */
export function splitIngredients(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Build the three argument objects required by NutritionCalculator.calculateScore
 * from a persisted nutritionalInfo blob and the product's ingredients string.
 *
 * @param ni            The nutritionalInfo JSON stored in the DB.
 * @param ingredientsText  The raw ingredients string stored on the product row.
 */
export function buildScoreInputs(
  ni: PersistedNutritionInfo | null | undefined,
  ingredientsText: string | null | undefined,
): ScoreInputs {
  const info = ni ?? {};

  const nutrition: NutritionInput = {
    energy: info.calories ?? 0,
    sugars: info.sugar ?? 0,
    fat: info.fat ?? 0,
    saturatedFat: info.saturatedFat ?? 0,
    sodium: info.sodium ?? 0,
    fiber: info.fiber ?? 0,
    protein: info.protein ?? 0,
    ...(typeof info.fruitsVegetablesNuts === 'number'
      ? { fruitsVegetablesNuts: info.fruitsVegetablesNuts }
      : {}),
  };

  const ingredients: IngredientInput = {
    ingredients: splitIngredients(ingredientsText),
    additives: Array.isArray(info.additivesTags) ? info.additivesTags : [],
  };

  const processing: ProcessingInput = {
    ...(typeof info.novaGroup === 'number' ? { novaGroup: info.novaGroup } : {}),
  };

  return { nutrition, ingredients, processing };
}
