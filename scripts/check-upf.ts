
import NutritionCalculator from '../src/services/NutritionCalculator';

const CASES = [
  {
    name: "Sabor Campesinas (Industrial)",
    expectation: "NOVA 4",
    ingredients: {
      ingredients: [
        "patatas", "aceites vegetales", "aroma a vegetales", "azúcar", 
        "sal", "potenciador del sabor", "colorante", "emulgente"
      ]
    },
    processing: { novaGroup: 1 } // False NOVA 1 to test override
  },
  {
    name: "Yogur Natural (Natural)",
    expectation: "NOVA 1/3 (Not 4)",
    ingredients: {
      ingredients: ["leche", "fermentos lácticos"]
    },
    processing: { novaGroup: 1 }
  },
  {
    name: "Galletas 'Caseras' (Ultra)",
    expectation: "NOVA 4",
    ingredients: {
     ingredients: ["harina", "azúcar", "aceite de palma hidrogenado", "jarabe de glucosa", "sal"]
    },
    processing: { novaGroup: 3 }
  }
];

async function run() {
    console.log("🧬 Testing Advanced UPF Detection Logic...\n");
    
    for (const test of CASES) {
        const result = NutritionCalculator.calculateScore({}, test.ingredients, test.processing);
        const processingScore = result.breakdown.processing;
        const isNova4 = processingScore === 0; // 0 points = NOVA 4
        
        console.log(`📦 Product: ${test.name}`);
        console.log(`   Ingredients: ${test.ingredients.ingredients.join(", ")}`);
        console.log(`   Expected: ${test.expectation}`);
        console.log(`   Result Score: ${processingScore}/20`);
        console.log(`   Detected NOVA 4? ${isNova4 ? "YES 🚨" : "NO ✅"}`);
        
        const penalties = result.details.penalties.map(p => p.key);
        if (penalties.length > 0) console.log(`   Penalties: ${penalties.join(", ")}`);
        
        console.log("-".repeat(40));
    }
}

run();
