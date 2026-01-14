
import NutritionCalculator from './src/services/NutritionCalculator';
import { NutritionInput } from './src/services/NutritionCalculator';

console.log("--- Testing Real Products with Strict Logic (User Provided) ---");

const testCases = [
    {
        name: "Lay's Al Punto de Sal (Fried Snack)",
        desc: "Should detect 'Fried Snack' -> NOVA 4 -> Score ~40-50 (C/D)",
        nutrition: {
            energy: 564, 
            sugars: 0.6,
            fat: 32, // High fat penalty
            saturatedFat: 4.4,
            sodium: 1200, // High salt penalty (3g salt)
            fiber: 4.3,
            protein: 6.3
        },
        ingredients: ["patatas", "aceite de maíz", "sal"],
        category: "Snacks"
    },
    {
        name: "Tuna Canned (Healthy)",
        desc: "Should be 'A' (>80)",
        nutrition: {
            energy: 116,
            sugars: 0,
            fat: 1,
            saturatedFat: 0.3,
            sodium: 300, // <1g salt
            fiber: 0,
            protein: 26
        },
        ingredients: ["atún claro", "agua", "sal"],
        category: "fish"
    },
    {
        name: "Coca Cola (Sugar Bomb)",
        desc: "Should be 'E' (<20)",
        nutrition: {
            energy: 42,
            sugars: 10.6, // High sugar
            fat: 0,
            saturatedFat: 0,
            sodium: 0,
            fiber: 0,
            protein: 0
        },
        ingredients: ["agua carbonatada", "azúcar", "colorante E-150d", "acidulante ácido fosfórico", "aromas naturales"],
        category: "beverages"
    },
    {
        name: "Walnuts (Healthy Fat)",
        desc: "Should be 'A' (>80) despite high calories",
        nutrition: {
            energy: 654,
            sugars: 2.6,
            fat: 65,
            saturatedFat: 6,
            sodium: 2,
            fiber: 6.7,
            protein: 15
        },
        ingredients: ["nuces"],
        category: "nuts"
    },
    {
        name: "Ganchitos (Fried Snack Check)",
        desc: "Ultaprocessed snack - Should be penalized heavily",
        nutrition: {
           energy: 450,
           fat: 25,
           saturatedFat: 12, // High sat fat
           sugars: 2,
           sodium: 900 // High salt
        },
        ingredients: ["semola de maiz", "aceite de girasol", "sal", "aroma"],
        category: "snacks"
    }
];

testCases.forEach(t => {
    console.log(`\n------------------------------------------------`);
    console.log(`Product: ${t.name}`);
    console.log(`Expected: ${t.desc}`);
    
    // Normalize nutrition keys
    const nutInput: NutritionInput = {
        ...t.nutrition,
        // Ensure inputs are correct
    };

    const score = NutritionCalculator.calculateScore(
        nutInput,
        { ingredients: t.ingredients, additives: [] },
        {}, // Let heuristic work
        t.category,
        t.name // Pass name for heuristic
    );

    console.log(`SCORE: ${score.score} [${score.grade}]`);
    console.log(`Breakdown: Nutrition=${score.breakdown.nutrition}, Ingredients=${score.breakdown.ingredients}, Processing=${score.breakdown.processing}`);
    console.log(`Penalties: ${score.details.penalties.map(p => p.key).join(', ')}`);
});
