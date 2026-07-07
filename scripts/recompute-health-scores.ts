/**
 * recompute-health-scores.ts
 *
 * Recomputes the healthScore for every product row using the current scoring
 * engine (ENGINE_VERSION 2), reading inputs exclusively from the persisted
 * nutritionalInfo + ingredients columns — the same path the on-read recalc
 * uses in production.
 *
 * KNOWN LIMITATIONS (local recompute):
 *   (a) Products imported before Phase 2 may lack additivesTags / novaGroup in
 *       their stored nutritionalInfo. The ingredient-text search recovers some
 *       additive signal, but OFF-derived NOVA and additive tags not previously
 *       persisted are lost. Full correction of these rows requires the separate
 *       OFF re-fetch job.
 *   (b) The sodium unit fix (grams → mg) introduced in Phase 2 is NOT
 *       retroactively applied here, because the stale value is baked into the
 *       stored nutritionalInfo. Products with a legacy sodium value stored in
 *       grams will still receive an inflated sodium reading until their row is
 *       refreshed via the OFF re-fetch job.
 *
 * USAGE:
 *   Dry-run (default — safe, no DB writes):
 *     npx ts-node scripts/recompute-health-scores.ts
 *
 *   Apply mode (writes updated scores to the database):
 *     npx ts-node scripts/recompute-health-scores.ts --apply
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';
import NutritionCalculator from '../src/services/NutritionCalculator';
import { buildScoreInputs } from '../src/services/scoreInputs';
import type { PersistedNutritionInfo } from '../src/services/scoreInputs';
import type { HealthScoreResult } from '../src/services/NutritionCalculator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'none';

interface StoredHealthScore {
  score?: number;
  grade?: string;
}

interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  ingredients: string | null;
  nutritionalInfo: unknown;
  healthScore: unknown;
  healthScoreVersion: number;
}

interface ProductDelta {
  id: string;
  name: string;
  oldScore: number | null;
  newScore: number;
  oldGrade: Grade;
  newGrade: Grade;
  absDelta: number;
  confidence: 'full' | 'low' | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseStoredScore(raw: unknown): StoredHealthScore | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;
  return raw as StoredHealthScore;
}

function oldGrade(stored: StoredHealthScore | null): Grade {
  if (!stored) return 'none';
  const g = stored.grade;
  if (g === 'A' || g === 'B' || g === 'C' || g === 'D' || g === 'E') return g;
  return 'none';
}

function buildGradeTable(grades: Grade[]): Record<Grade, number> {
  const table: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, none: 0 };
  for (const g of grades) {
    table[g] += 1;
  }
  return table;
}

function printGradeTable(label: string, table: Record<Grade, number>): void {
  console.log(`\n  ${label}`);
  console.log('  -----------------------------------------------');
  console.log(`  ${'Grade'.padEnd(10)} ${'Count'.padStart(6)}`);
  console.log('  -----------------------------------------------');
  for (const g of ['A', 'B', 'C', 'D', 'E', 'none'] as Grade[]) {
    console.log(`  ${g.padEnd(10)} ${String(table[g]).padStart(6)}`);
  }
  console.log('  -----------------------------------------------');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const applyMode = process.argv.includes('--apply');

  // --- Banner ---
  console.log('');
  console.log('=================================================================');
  if (applyMode) {
    console.log('  RECOMPUTE HEALTH SCORES — APPLY MODE');
    console.log('  Database WILL be updated with new scores.');
  } else {
    console.log('  RECOMPUTE HEALTH SCORES — DRY-RUN MODE (default)');
    console.log('  No database writes will occur.');
    console.log('  Re-run with --apply to persist changes.');
  }
  console.log(`  Engine version: ${NutritionCalculator.ENGINE_VERSION}`);
  console.log('=================================================================');
  console.log('');

  // --- Fetch all products ---
  console.log('Fetching all products from database...');
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      ingredients: true,
      nutritionalInfo: true,
      healthScore: true,
      healthScoreVersion: true,
    },
  }) as ProductRow[];

  console.log(`Found ${products.length} product(s) to process.`);

  // --- Process each product ---
  const deltas: ProductDelta[] = [];
  let lowConfidenceCount = 0;
  let changedGrade = 0;
  let scoreUp = 0;
  let scoreDown = 0;
  let unchanged = 0;

  const beforeGrades: Grade[] = [];
  const afterGrades: Grade[] = [];

  for (const p of products) {
    // Build score inputs from persisted data
    const ni = p.nutritionalInfo as PersistedNutritionInfo | null;
    const { nutrition, ingredients, processing } = buildScoreInputs(ni, p.ingredients);

    // Compute new score
    const newResult: HealthScoreResult = NutritionCalculator.calculateScore(
      nutrition,
      ingredients,
      processing,
      p.category ?? undefined,
      p.name,
    );

    // Parse old score
    const stored = parseStoredScore(p.healthScore);
    const prevGrade = oldGrade(stored);
    const prevScore = stored?.score !== undefined ? stored.score : null;

    const newG: Grade = newResult.grade;
    const absDelta = prevScore !== null ? Math.abs(newResult.score - prevScore) : newResult.score;

    // Accumulate stats
    beforeGrades.push(prevGrade);
    afterGrades.push(newG);

    if (prevGrade !== newG) changedGrade += 1;
    if (prevScore !== null) {
      if (newResult.score > prevScore) scoreUp += 1;
      else if (newResult.score < prevScore) scoreDown += 1;
      else unchanged += 1;
    }

    if (newResult.confidence === 'low') lowConfidenceCount += 1;

    deltas.push({
      id: p.id,
      name: p.name,
      oldScore: prevScore,
      newScore: newResult.score,
      oldGrade: prevGrade,
      newGrade: newG,
      absDelta,
      confidence: newResult.confidence,
    });

    // --- Apply mode: persist ---
    if (applyMode) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          healthScore: newResult as unknown as import('@prisma/client').Prisma.InputJsonValue,
          healthScoreVersion: NutritionCalculator.ENGINE_VERSION,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  const total = products.length;

  console.log('');
  console.log('=================================================================');
  console.log('  REPORT');
  console.log('=================================================================');
  console.log('');
  console.log(`  Total products processed : ${total}`);
  console.log(`  Changed grade            : ${changedGrade}`);
  console.log(`  Score went UP            : ${scoreUp}`);
  console.log(`  Score went DOWN          : ${scoreDown}`);
  console.log(`  Score unchanged          : ${unchanged}`);
  console.log(`  No previous score        : ${total - scoreUp - scoreDown - unchanged}`);
  console.log(`  Low-confidence scores    : ${lowConfidenceCount}  (no nutritional data in stored row)`);

  // Grade distribution tables
  const beforeTable = buildGradeTable(beforeGrades);
  const afterTable = buildGradeTable(afterGrades);

  printGradeTable('Grade distribution BEFORE recompute', beforeTable);
  printGradeTable('Grade distribution AFTER  recompute', afterTable);

  // Top 20 by absolute score delta
  const top20 = deltas
    .slice()
    .sort((a, b) => b.absDelta - a.absDelta)
    .slice(0, 20);

  console.log('');
  console.log('  Top 20 products by absolute score delta');
  console.log('  ----------------------------------------------------------------------------------');
  console.log(
    `  ${'Product name'.padEnd(40)} ${'Old score'.padStart(9)} ${'New score'.padStart(9)} ${'Old grade'.padStart(9)} ${'New grade'.padStart(9)}`,
  );
  console.log('  ----------------------------------------------------------------------------------');
  for (const d of top20) {
    const oldScoreStr = d.oldScore !== null ? String(d.oldScore) : 'n/a';
    console.log(
      `  ${d.name.substring(0, 40).padEnd(40)} ${oldScoreStr.padStart(9)} ${String(d.newScore).padStart(9)} ${d.oldGrade.padStart(9)} ${d.newGrade.padStart(9)}`,
    );
  }
  console.log('  ----------------------------------------------------------------------------------');

  // ---------------------------------------------------------------------------
  // Disclosure block
  // ---------------------------------------------------------------------------

  console.log('');
  console.log('=================================================================');
  console.log('  KNOWN LIMITATIONS — LOCAL RECOMPUTE');
  console.log('=================================================================');
  console.log('');
  console.log('  This script reads the ALREADY-PERSISTED nutritionalInfo column.');
  console.log('  Two categories of legacy rows are NOT fully corrected:');
  console.log('');
  console.log('  (a) ADDITIVE / NOVA SIGNAL LOSS');
  console.log('      Products imported before Phase 2 may be missing');
  console.log('      additivesTags and/or novaGroup in their stored');
  console.log('      nutritionalInfo. The ingredient-text search recovers');
  console.log('      some additive signal via synonyms, but OFF-derived NOVA');
  console.log('      and additive tags that were never persisted cannot be');
  console.log('      recovered by this script.');
  console.log('');
  console.log('  (b) SODIUM UNIT BUG (grams → mg) NOT RETROACTIVE');
  console.log('      The sodium unit fix introduced in Phase 2 is NOT applied');
  console.log('      here. Legacy rows still carry the stale value baked into');
  console.log('      stored nutritionalInfo. Products with sodium stored in');
  console.log('      grams instead of mg will still receive an inflated sodium');
  console.log('      penalty until their row is refreshed via the OFF re-fetch.');
  console.log('');
  console.log('  FULL CORRECTION requires the separate OFF re-fetch job, which');
  console.log('  re-fetches each product from OpenFoodFacts and re-imports with');
  console.log('  the Phase 2 normalisation logic.');
  console.log('');
  if (applyMode) {
    console.log(`  Mode: APPLY — ${total} product(s) updated in the database.`);
  } else {
    console.log('  Mode: DRY-RUN — no database writes were made.');
    console.log('  Run with --apply to persist the computed scores.');
  }
  console.log('=================================================================');
  console.log('');
}

main()
  .catch((err) => {
    console.error('Fatal error in recompute-health-scores:', err);
    throw err;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
