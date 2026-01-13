import { Product } from "@prisma/client";

// --- Tipos de Datos ---
export interface NutritionInput {
  energy?: number;          // kcal per 100g
  sugars?: number;         // g per 100g
  saturatedFat?: number;   // g per 100g
  sodium?: number;         // mg per 100g (or salt * 400)
  fiber?: number;          // g per 100g
  protein?: number;        // g per 100g
  fruitsVegetablesNuts?: number; // % estimated
}

export interface IngredientInput {
  ingredients?: string[];
  additives?: string[]; // E-codes, e.g. ["E102", "E330"]
}

export interface ProcessingInput {
  novaGroup?: number; // 1-4
}

export interface HealthScoreMessage {
  key: string;
  params?: Record<string, any>;
}

export interface HealthScoreResult {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  breakdown: {
    nutrition: number; // 0-50
    ingredients: number; // 0-30
    processing: number; // 0-20
  };
  details: {
    penalties: HealthScoreMessage[];
    positives: HealthScoreMessage[];
  };
}

// --- Listas de Referencia ---

// Mapeo detallado de aditivos y riesgos
const CONTROVERSIAL_ADDITIVES: Record<string, { risk: "low" | "moderate" | "high" | "severe"; concerns: string[] }> = {
  // COLORANTES ARTIFICIALES
  "E102": { risk: "high", concerns: ["hiperactividad infantil", "alergias"] },
  "E104": { risk: "high", concerns: ["hiperactividad", "posible genotoxicidad"] },
  "E110": { risk: "high", concerns: ["hiperactividad", "alergias", "posible carcinógeno"] },
  "E122": { risk: "high", concerns: ["hiperactividad", "asma", "urticaria"] },
  "E124": { risk: "high", concerns: ["hiperactividad", "posible carcinógeno"] },
  "E129": { risk: "high", concerns: ["hiperactividad", "alergias"] },
  "E133": { risk: "moderate", concerns: ["hiperactividad", "alergias"] },
  
  // CONSERVANTES
  "E202": { risk: "low", concerns: ["hipersensibilidad"] },
  "E211": { risk: "moderate", concerns: ["hiperactividad", "posible formación de benceno"] },
  "E212": { risk: "moderate", concerns: ["hiperactividad", "alergias"] },
  "E213": { risk: "moderate", concerns: ["hiperactividad"] },
  "E220": { risk: "moderate", concerns: ["asma", "dolor de cabeza", "irritación gastrointestinal"] },
  "E221": { risk: "moderate", concerns: ["asma", "reacciones alérgicas"] },
  "E250": { risk: "high", concerns: ["formación de nitrosaminas (cancerígenas)", "migrañas"] },
  "E251": { risk: "high", concerns: ["conversión a nitritos", "posible carcinógeno"] },
  "E252": { risk: "high", concerns: ["mismo riesgo que E-251"] },
  
  // ANTIOXIDANTES
  "E320": { risk: "high", concerns: ["posible carcinógeno", "alteraciones endocrinas"] },
  "E321": { risk: "high", concerns: ["posible carcinógeno", "daño hepático"] },
  
  // EDULCORANTES ARTIFICIALES
  "E951": { risk: "moderate", concerns: ["dolores de cabeza", "migrañas"] },
  "E950": { risk: "moderate", concerns: ["posible carcinógeno", "controversia seguridad"] },
  "E955": { risk: "moderate", concerns: ["alteración microbiota intestinal"] },
  "E954": { risk: "low", concerns: ["sabor metálico"] },
  
  // POTENCIADORES DE SABOR
  "E621": { risk: "moderate", concerns: ["síndrome del restaurante chino", "sensibilidad"] },
  "E627": { risk: "moderate", concerns: ["asma", "evitar en niños"] },
  "E631": { risk: "moderate", concerns: ["gota", "evitar en niños"] },
  "E635": { risk: "moderate", concerns: ["similar a E-627"] },
  
  // EMULGENTES
  "E433": { risk: "moderate", concerns: ["inflamación intestinal"] },
  "E466": { risk: "moderate", concerns: ["inflamación intestinal"] },
  "E407": { risk: "high", concerns: ["inflamación intestinal", "posible carcinógeno"] },
  
  // ESPESANTES
  "E415": { risk: "low", concerns: ["distensión abdominal"] },
  "E412": { risk: "low", concerns: ["obstrucción intestinal altas dosis"] },
  
  // REGULADORES ACIDEZ
  "E338": { risk: "moderate", concerns: ["desmineralización ósea"] },
  "E339": { risk: "moderate", concerns: ["desequilibrio calcio/fósforo"] },
  
  // OTROS
  "E551": { risk: "low", concerns: ["posible acumulación pulmonar"] },
  "E420": { risk: "low", concerns: ["efecto laxante"] },
  "E421": { risk: "low", concerns: ["efecto laxante"] },
  "E536": { risk: "moderate", concerns: ["liberación de cianuro"] },
  "E927": { risk: "high", concerns: ["asma ocupacional", "posible carcinógeno"] },
  "E924": { risk: "severe", concerns: ["cancerígeno demostrado"] },
  "E123": { risk: "high", concerns: ["posible carcinógeno"] },
  "E127": { risk: "high", concerns: ["cáncer de tiroides"] },
  "E154": { risk: "high", concerns: ["toxicidad hepática"] },
  "E173": { risk: "moderate", concerns: ["neurotoxicidad"] },
  "E142": { risk: "moderate", concerns: ["hiperactividad"] },
  "E330": { risk: "low", concerns: [] }, // Común
  "E322": { risk: "low", concerns: [] }, // Común
};

const PENALIZED_INGREDIENTS = [
  "aceite de palma",
  "aceite de palma hidrogenado",
  "jarabe de maíz de alta fructosa",
  "azúcar añadido",
  "grasas trans",
  "edulcorantes artificiales",
  "glutamato monosódico",
  "nitritos",
  "nitratos",
  "colza", // opcional
  "polidextrosa"
];

const ADDITIVE_SYNONYMS: Record<string, string[]> = {
  // COLORANTES
  "E102": ["tartrazina", "tartracina", "amarillo 5", "amarillo tartrazina", "ci 19140", "fd&c yellow 5"],
  "E110": ["amarillo ocaso fcf", "amarillo 6", "amarillo anaranjado s", "ci 15985", "fd&c yellow 6", "amarillo sunset"],
  "E120": ["carmin", "acido carminico", "cochinilla", "rojo natural 4", "ci 75470", "carmin de cochinilla", "carmine", "cochineal", "carminic acid"],
  "E129": ["rojo allura ac", "rojo 40", "rojo allura", "ci 16035", "fd&c red 40", "rojo allura ac"],
  "E133": ["azul brillante fcf", "azul 1", "azul brillante", "ci 42090", "fd&c blue 1", "blue 1", "brilliant blue fcf", "azul brilhante fcf", "bleu brillant fcf"],
  "E150d": ["caramelo amonico sulfito", "caramelo iv", "caramelo sulfito amonico", "colorante caramelo", "caramelo de sulfito amonico", "corante caramelo", "colorant caramel"],
  "E171": ["dioxido de titanio", "oxido de titanio", "titanio", "blanco de titanio", "ci 77891", "titanio dioxide", "dioxido de titanio", "dioxyde de titane"],

  // CONSERVANTES
  "E200": ["acido sorbico", "sorbico", "2,4-hexadienoico", "sorbic acid"],
  "E202": ["sorbato de potasio", "sorbato potasico", "sorbato potásico", "2,4-hexadienoato de potasio", "potassium sorbate", "sorbato de potassio", "sorbate de potassium"],
  "E210": ["acido benzoico", "benzoico", "benzoic acid", "acido benzoico", "acide benzoique"],
  "E211": ["benzoato de sodio", "benzoato sodico", "benzoato sódico", "sodium benzoate", "benzoato de sodio", "benzoate de sodium"],
  "E212": ["benzoato de potasio", "benzoato potasico", "benzoato potásico", "benzoato de potassio", "benzoate de potassium"],
  "E213": ["benzoato de calcio", "benzoato calcico", "benzoato cálcico", "benzoato de calcio", "benzoate de calcium"],
  "E220": ["dioxido de azufre", "anhidrido sulfuroso", "so2", "oxido de azufre", "dioxido de enxofre", "dioxyde de soufre"],
  "E221": ["sulfito de sodio", "sulfito sodico", "sulfito sódico", "social sulfite", "sulfito de sodio", "sulfite de sodium"],
  "E222": ["bisulfito de sodio", "hidrogenosulfito de sodio", "bisulfito sodico", "bisulfito sódico"],
  "E223": ["metabisulfito de sodio", "pirosulfito de sodio", "metabisulfito sodico", "metabisulfito sódico"],
  "E224": ["metabisulfito de potasio", "pirosulfito de potasio", "metabisulfito potasico", "metabisulfito potásico"],
  "E228": ["bisulfito de potasio", "hidrogenosulfito de potasio", "bisulfito potasico", "bisulfito potásico"],
  "E250": ["nitrito de sodio", "nitrito sodico", "nitrito sódico", "sodium nitrite"],
  "E251": ["nitrato de sodio", "nitrato sodico", "nitrato sódico", "sodium nitrate"],
  "E252": ["nitrato de potasio", "nitrato potasico", "nitrato potásico", "sal nitro", "salitre", "potassium nitrate", "saltpeter"],

  // ANTIOXIDANTES
  "E320": ["bha", "butilhidroxianisol", "hidroxianisol butilado", "butylated hydroxyanisole", "butilhidroxianisol", "butylhydroxyanisole"],
  "E321": ["bht", "butilhidroxitolueno", "hidroxitolueno butilado", "butylated hydroxytoluene", "butil-hidroxi-tolueno", "butylhydroxytoluene"],
  "E385": ["edta calcico disodico", "edta calcio disodio", "sal disodica de calcio edta", "etilendiaminotetraacetato de calcio y disodio"],

  // POTENCIADORES
  "E621": ["glutamato monosodico", "glutamato de sodio", "glutamato sodico", "gms", "msg", "glutamato", "umami", "ajinomoto", "monosodium glutamate", "glutamato monossodico", "glutamate monosodique"],
  "E627": ["guamilato disodico", "guamilato de disodio", "5'-guamilato de sodio", "gmp disodico"],
  "E631": ["inosinato disodico", "inosinato de disodio", "5'-inosinato de sodio", "imp disodico"],

  // EDULCORANTES
  "E950": ["acesulfamo k", "acesulfamo potasico", "acesulfamo de potasio", "acesulfame k", "acesulfame potassium", "acesulfame k", "acesulfame k"],
  "E951": ["aspartamo", "aspartame", "l-aspartil-l-fenilalanina metil ester", "nutrasweet", "canderel", "aspartame", "aspartame"],
  "E954": ["sacarina", "sacarinas", "saccharin", "sacarina sodica", "sacarina de sodio", "sacarinas sodicas", "sodium saccharin", "sacarina", "saccharine"],
  "E955": ["sucralosa", "splenda", "trichlorogalactosucrose", "1,6-dicloro-1,6-dideoxi-beta-d-fructofuranosil-4-cloro-4-deoxi-alfa-d-galactopiranosido", "sucralose", "sucralose", "sucralose"],
  "E960": ["glucosidos de esteviol", "estevia", "esteviol glucosidos", "stevia", "rebaudiosido a", "esteviosido"],

  // EMULGENTES/ESPESANTES
  "E407": ["carragenanos", "carragenanos", "carragenina", "carrageenan", "407"],
  "E415": ["goma xantana", "xantana", "goma xanthan", "xanthan gum", "polysaccharide b-1459"],
  "E433": ["polisorbato 80", "monooleato de polioxietileno sorbitan", "tween 80", "poxi 80"],
  "E466": ["carboximetilcelulosa", "cmc", "celulosa gum", "carmelosa", "celulose gum"],

  // OTROS
  "E330": ["acido citrico", "citrico", "2-hidroxi-1,2,3-propanotricarboxilico", "citric acid", "acido citrico", "acide citrique"],
  "E338": ["acido fosforico", "fosforico", "orthophosphoric acid", "phosphoric acid"],
  "E551": ["dioxido de silicio", "silicio", "silica", "oxido de silicio", "arena coloidal"]
};

// --- NOVA 4 Detection Constants (Weighted System) ---

// 1. DEFINITIVOS (Score: 2 pts) - Garantizan prácticamente NOVA 4
const UPF_DEFINITIVE_TERMS = [
  // Grases industriales
  "hidrogenado", "hydrogenated", "hydrogéné", "interesterificado", "interesterified", 
  "margarina", "margarine", "shortening", "grasas trans", "trans fat", 
  "aceite vegetal refinado", "refined vegetable oil",
  
  // Azúcares industriales
  "jarabe de maíz", "high fructose corn syrup", "jmaf", "hfcs", "glucose-fructose", "glucosa-fructosa", 
  "jarabe de glucosa", "glucose syrup", "sirop de glucose", "jarabe de fructosa", "fructose syrup",
  "azúcar invertido", "inverted sugar", "sucre inverti",
  "dextrosa", "dextrose", "maltodextrina", "maltodextrin", "maltodextrine", "polidextrosa",
  
  // Potenciadores / Saborizantes sintéticos claros
  "glutamato", "glutamate", "gms", "msg", "ribonucleotide", "inosinato", "guanilato",
  "saborizante artificial", "artificial flavor", "aroma artificial",
  
  // Proteínas ultraprocesadas
  "aislado de", "isolate", "concentrado de prote", "protein concentrate", 
  "proteína texturizada", "textured protein", "proteína hidrolizada", "hydrolyzed protein", 
  "caseinato", "caseinate", "suero de leche en polvo", "whey powder", "gluten vital",
  
  // Aditivos industriales
  "carboximetilcelulosa", "poligoésteres", "estearoil", "polisorbato", "carragenanos",
  "amidon modifie", "almidón modificado", "modified starch", "almidon modificado"
];

// 2. SOSPECHOSOS (Score: 1 pt) - Sugieren procesamiento, pero necesitan contexto
const UPF_SUSPICIOUS_TERMS = [
  // Aditivos funcionales (Cosméticos)
  "aroma", "flavor", "saborizante", "flavour", "arôme", // Flavorings
  "colorante", "corante", "colorant", "colour", // Colors
  "emulgente", "emulsificante", "emulsifier", "emulsionante", // Emulsifiers
  "espesante", "espessante", "thickener", "l'epaississant", // Thickeners
  "estabilizante", "stabilizer", "stabilisant", // Stabilizers
  "edulcorante", "sweetener", "adoçante", "edulcorant", // Sweeteners
  "potenciador", "enhancer", "exhausteur", // Flavor enhancers
  
  // Otros términos
  "extracto de levadura", "yeast extract",
  "fibra añadida", "added fiber", "fibra de", // Fiber usually OK, but "added" implies processing
  "leche en polvo", "milk powder", // Can be NOVA 3 or 4
  "reconstituido", "reconstituted",
  "enriquecido", "fortificado", "fortified", 
  "deshidratado", "dehydrated"
];

// 3. EXCEPCIONES - Contextos donde un término sospechoso NO penaliza
const UPF_EXCEPTIONS: Record<string, string[]> = {
  // Si encontramos "aroma" pero el producto es...
  "aroma": ["yogur", "yogurt", "té", "tea", "café", "coffee", "infusión", "tisane", "vinagre", "vinegar", "mantequilla", "butter"],
  "flavor": ["yogur", "yogurt", "tea", "coffee", "vinegar"],
  "arôme": ["yaourt", "thé", "café", "vinaigre"],
  "aromas": ["yogur", "te", "cafe", "vinagre"],
  
  // Colorantes naturales en contextos específicos
  "colorante": ["queso", "cheese", "fromage", "mantequilla", "butter", "beurre"], // Annatto/Carotenos en quesos/mantequilla usan ser aceptados en NOVA 3
  "colorant": ["fromage", "beurre"]
};

class FoodScorer {

  // --- 1. Nutrition Score (50 pts) ---
  private calculateNutritionScore(nutrition: NutritionInput) {
    let score = 35; // Base score (out of 50)
    const penalties: HealthScoreMessage[] = [];
    const positives: HealthScoreMessage[] = [];

    // Penalizaciones
    if ((nutrition.sugars || 0) > 15) {
      score -= 10;
      penalties.push({ key: 'penalties.highSugar' });
    } else if ((nutrition.sugars || 0) > 5) {
       score -= 5;
    }

    if ((nutrition.saturatedFat || 0) > 5) {
      score -= 8;
      penalties.push({ key: 'penalties.saturatedFat' });
    }

    const sodium = nutrition.sodium || 0;
    if (sodium > 800) { // aprox 2g sal
      score -= 10;
      penalties.push({ key: 'penalties.highSodium' });
    } else if (sodium > 400) { // aprox 1g sal
      score -= 5;
    }

    // Energy density penalty
    if ((nutrition.energy || 0) > 400) { // High calorie density
        score -= 5;
    }

    // Bonificaciones
    if ((nutrition.fiber || 0) > 3) {
      score += 5;
      positives.push({ key: 'positives.fiber' });
    }
    
    if ((nutrition.protein || 0) > 8) {
      score += 5;
      positives.push({ key: 'positives.protein' });
    }
    
    // Fruit/Veg bonus (conditional: only if sugar AND saturated fat are not excessive)
    // Avoid rewarding "Ketchup" (Sugar) or "Fried Veggie Chips" (Sat Fat)
    // Walnuts (~6g sat fat) should still pass. Threshold 10g seems safe.
    const fruitVeg = nutrition.fruitsVegetablesNuts || 0;
    if (fruitVeg > 40) {
        if ((nutrition.sugars || 0) <= 15 && (nutrition.saturatedFat || 0) <= 10) { 
             score += 5;
             positives.push({ 
                 key: 'positives.fruitVeg', 
                 params: { percent: Math.round(fruitVeg) } 
             });
        }
    }

    // Clamp 0-50
    return {
        score: Math.max(0, Math.min(50, score)),
        penalties,
        positives
    };
  }

  // --- 2. Ingredients Score (30 pts) ---
  private calculateIngredientsScore(ingredients: IngredientInput) {
    let score = 30; // Start perfect
    const penalties: HealthScoreMessage[] = [];
    const positives: HealthScoreMessage[] = [];
    
    // Check specific additives (from Tags + Deep Search)
    const detectedAdditives = new Set<string>();
    
    // Helper: Normalize text (remove accents, lowercase)
    const normalize = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // 1. Tags from OpenFoodFacts (e.g. "en:e102")
    if (ingredients.additives && ingredients.additives.length > 0) {
        ingredients.additives.forEach(tag => {
            // Flexible regex: matches E102, E-102, E 102, INS 102
            const match = tag.match(/\b(?:E|INS)[-\s]?(\d{3,4}[a-z]?)\b/i);
            if (match && match[1]) {
                detectedAdditives.add("E" + match[1].toUpperCase());
            } else if (tag.toUpperCase().startsWith("E")) {
                 // Fallback for simple "E102"
                 detectedAdditives.add(tag.toUpperCase());
            }
        });
    }

    // 2. Deep Text Search in Ingredients List
    if (ingredients.ingredients && ingredients.ingredients.length > 0) {
        const rawText = ingredients.ingredients.join(" ");
        const normalizedText = normalize(rawText);
        
        // A. Regex Search in Text (finds "E-202", "E 202" hidden in text)
        const regexGlobal = /\b(?:E|INS)[-\s]?(\d{3,4}[a-z]?)\b/gi;
        let match;
        while ((match = regexGlobal.exec(rawText)) !== null) {
             if (match[1]) {
                 detectedAdditives.add("E" + match[1].toUpperCase());
             }
        }

        // B. Search by Synonym Name
        // We iterate over our known list. 
        // OPTIMIZATION: For long text, this is O(N*M). acceptable for current scale.
        
        // Scan Synonyms (already normalized in our logic assumption, but lets be safe)
        Object.entries(ADDITIVE_SYNONYMS).forEach(([code, synonyms]) => {
            if (synonyms.some(syn => {
                const normSyn = normalize(syn);
                // Use token-based check or exact substring?
                // Substring is safer for compound words like "sorbato..." but riskier for "ana".
                // "tartrazina" -> unique enough.
                return normalizedText.includes(normSyn);
            })) {
                detectedAdditives.add(code);
            }
        });

        // Scan Main Names (REMOVED: Now we rely only on the Synonym List and direct Code matching)
        // Since we removed 'name' from CONTROVERSIAL_ADDITIVES, we should ensure ADDITIVE_SYNONYMS covers the main name too.
        // For this refactor, we assume ADDITIVE_SYNONYMS is comprehensive enough.
    }

    // Evaluate risks
    let hasHazard = false;
    detectedAdditives.forEach(code => {
        const additive = CONTROVERSIAL_ADDITIVES[code];
        if (additive) {
            if (additive.risk === "severe") {
                score -= 15;
                penalties.push({ 
                    key: 'risks.severe', 
                    params: { code } 
                });
                hasHazard = true;
            } else if (additive.risk === "high") {
                score -= 10;
                penalties.push({ 
                    key: 'risks.high', 
                    params: { code } 
                });
                hasHazard = true;
            } else if (additive.risk === "moderate") {
                score -= 5;
                penalties.push({ 
                    key: 'risks.moderate', 
                    params: { code } 
                });
                hasHazard = true;
            } else {
                score -= 2; 
                 penalties.push({ 
                    key: 'risks.low', 
                    params: { code } 
                });
            }
        }
    });

    // Check for "excess" count (penalize > 4 additives)
    if (!hasHazard && detectedAdditives.size > 4) {
            score -= 5;
            penalties.push({ key: 'penalties.excessAdditives' });
    }

    if (detectedAdditives.size === 0) {
         positives.push({ key: 'positives.noAdditives' });
    }


    // Check Ingredient text list for general "Bad" ingredients
    if (ingredients.ingredients && ingredients.ingredients.length > 0) {
        const text = normalize(ingredients.ingredients.join(" "));
        PENALIZED_INGREDIENTS.forEach(bad => {
            if (text.includes(normalize(bad))) {
                score -= 3;
                penalties.push({ 
                    key: 'penalties.contains', 
                    params: { ingredient: bad } 
                });
            }
        });
        
        // Bonus for simple list
        if (ingredients.ingredients.length <= 5 && ingredients.ingredients.length > 0) {
            score += 2; // Small bonus
            positives.push({ key: 'positives.shortList' });
        }
    }

    return {
        score: Math.max(0, Math.min(30, score)),
        penalties,
        positives
    };
  }

   // --- 3. Processing Score (20 pts) ---
   private calculateProcessingScore(processing: ProcessingInput, ingredients?: IngredientInput) {
     let score = 20; // Start perfect
     const penalties: HealthScoreMessage[] = [];
     const positives: HealthScoreMessage[] = [];
     
     // Default to provided NOVA group
     let nova = processing.novaGroup;
 
     // --- Advanced Heuristic Override ---
     // If NOVA is missing or low (1-3), verify against our UPF detector
     if ((!nova || nova < 4) && ingredients?.ingredients) {
          const text = ingredients.ingredients.join(" ").toLowerCase();
          const normalizedIngredients = ingredients.ingredients.map(i => i.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
          
          let upfScore = 0;
          let reasons: string[] = [];

          const normalizedText = normalizedIngredients.join(" ");

          // A. Check DEFINITIVE terms (Weight: 2)
          UPF_DEFINITIVE_TERMS.forEach(term => {
              if (normalizedText.includes(term)) {
                  upfScore += 2;
                  reasons.push(term);
              }
          });

          // B. Check SUSPICIOUS terms (Weight: 1)
          // For suspicious terms, we check exceptions!
          // We need a vague idea of product category or name to check exceptions. 
          // Since we don't have 'productName' here easily without changing signature, 
          // we will use a simplified approach: assume no exception unless we passed category context (future improvement).
          // For now, strict check.
          
          UPF_SUSPICIOUS_TERMS.forEach(term => {
              if (normalizedText.includes(term)) {
                   // Check basic exceptions within the ingredient string itself? 
                   // No, exceptions are usually Category-based (e.g. Yogurt). 
                   // Without category, we count it. 
                   // IMPROVEMENT: Pass category/name to calculateScore? 
                   // For now, let's just count them.
                  upfScore += 1;
              }
          });

          // C. Heuristic Rules
          // Rule 1: High Score -> NOVA 4
          if (upfScore >= 3) {
              nova = 4;
              penalties.push({ key: 'processing.ultraProcessedIng' }); 
          }
          // Rule 2: Moderate Score + Complex List -> NOVA 4
          // If we have some markers (score >= 2) AND long list (>5 ingredients) -> Likely Industrial
          else if (upfScore >= 2 && ingredients.ingredients.length > 5) {
               nova = 4;
               penalties.push({ key: 'processing.ultraProcessedIng' });
          }
     }
 
     if (nova) {
         if (nova === 4) {
             score = 0; // Lost all processing points
             // Avoid double messaging if heuristic already triggered
             const alreadyHasUpf = penalties.some(p => p.key === 'healthScore.processing.ultraProcessedIng') || 
                                   penalties.some(p => p.key === 'processing.ultraProcessedIng');
             if (!alreadyHasUpf) {
                  penalties.push({ key: 'processing.nova4' });
             }
         } else if (nova === 3) {
             score = 10;
             penalties.push({ key: 'processing.nova3' });
         } else if (nova === 1) {
              // Only give bonus if we haven't already pushed penalties
             if (score === 20) positives.push({ key: 'processing.nova1' });
         }
     }
 
     return {
         score: Math.max(0, Math.min(20, score)),
         penalties,
         positives
     };
   }

  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'E';
  }

  // Actualizar firma principal
  public calculateScore(
    nutrition: NutritionInput,
    ingredients: IngredientInput,
    processing: ProcessingInput
  ): HealthScoreResult {
    const nutritionScore = this.calculateNutritionScore(nutrition); // Max 50
    const ingredientsScore = this.calculateIngredientsScore(ingredients); // Max 30
    // Pass ingredients to processing for heuristic check
    const processingScore = this.calculateProcessingScore(processing, ingredients); // Max 20

    const totalScore = Math.max(0, Math.min(100, nutritionScore.score + ingredientsScore.score + processingScore.score));
    
    // Unificar detalles
    const allPenalties = [
      ...nutritionScore.penalties,
      ...ingredientsScore.penalties,
      ...processingScore.penalties
    ];
    
    const allPositives = [
      ...nutritionScore.positives,
      ...ingredientsScore.positives,
      ...processingScore.positives
    ];

    return {
      score: Math.round(totalScore),
      grade: this.getGrade(totalScore),
      breakdown: {
        nutrition: Math.round(nutritionScore.score),
        ingredients: Math.round(ingredientsScore.score),
        processing: Math.round(processingScore.score)
      },
      details: {
        penalties: allPenalties,
        positives: allPositives
      }
    };
  }
}

export default new FoodScorer();
