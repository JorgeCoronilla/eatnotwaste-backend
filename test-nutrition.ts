import NutritionCalculator from './src/services/NutritionCalculator';
import { NutritionInput, HealthScoreMessage } from './src/services/NutritionCalculator';

const testCases = [
  {
    name: 'Olive Oil',
    nutrition: {
        energy: 884,
        sugars: 0,
        saturatedFat: 14,
        sodium: 0,
        fiber: 0,
        protein: 0,
        fruitsVegetablesNuts: 0
    },
    ingredients: { ingredients: ['olive oil'] },
    processing: {}
  },
  {
      name: 'Walnuts',
      nutrition: {
          energy: 654,
          sugars: 2.6,
          saturatedFat: 6,
          sodium: 2,
          fiber: 6.7,
          protein: 15,
          fruitsVegetablesNuts: 100
      },
      ingredients: { ingredients: ['walnuts'] },
      processing: {}
  },
  {
      name: 'Potato Chips',
      nutrition: {
          energy: 536,
          sugars: 0.3,
          saturatedFat: 10,
          sodium: 520,
          fiber: 3,
          protein: 7,
          fruitsVegetablesNuts: 60
      },
      ingredients: { ingredients: ['potatoes', 'oil', 'salt'] },
      processing: { novaGroup: 4 }
  },
  {
      name: 'Cola',
      nutrition: {
          energy: 42,
          sugars: 10.6,
          saturatedFat: 0,
          sodium: 0,
          fiber: 0,
          protein: 0,
          fruitsVegetablesNuts: 0
      },
      ingredients: { ingredients: ['water', 'sugar', 'flavor'] },
      processing: { novaGroup: 4 }
  }
];

testCases.forEach(tc => {
    const result = NutritionCalculator.calculateScore(tc.nutrition as NutritionInput, tc.ingredients, tc.processing);
    console.log(`\nProduct: ${tc.name}`);
    console.log(`Score: ${result.score} (${result.grade})`);
    console.log('Breakdown:', result.breakdown);
    console.log('Penalties:', result.details.penalties.map((p: HealthScoreMessage) => p.key));
    console.log('Positives:', result.details.positives.map((p: HealthScoreMessage) => p.key));
});
