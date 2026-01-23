import { Product } from "@prisma/client";

// --- Tipos de Datos ---
export interface NutritionInput {
  energy?: number;          // kcal per 100g
  sugars?: number;         // g per 100g
  fat?: number;            // g per 100g
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
  public readonly ENGINE_VERSION = 1;

  // --- Helpers ---
  private detectarSnackFrito(ingredients: string[], nombre: string): boolean {
    const keywordsSnack = ['patata frita', 'chip', 'snack', 'crocante', 'frito', 'fried', 'palomitas', 'popcorn', 'ganchitos'];
    const keywordsAceite = ['aceite', 'oil', 'grasa', 'fat', 'oleo'];
    
    // Normalize checks
    const nombreNorm = nombre.toLowerCase();
    const ingNorm = ingredients.map(i => i.toLowerCase());

    const esSnack = keywordsSnack.some(kw => 
      nombreNorm.includes(kw) || 
      ingNorm.join(' ').includes('snack')
    );
    
    // Check if oil is in top 3 ingredients
    const tieneAceitePrincipal = ingNorm.slice(0, 3).some(ing => 
      keywordsAceite.some(aceite => ing.includes(aceite))
    );
    
    return esSnack && tieneAceitePrincipal;
  }

  private penalizarSal(sodioMg: number, category?: string, isSnack: boolean = false): { score: number, penalty?: HealthScoreMessage } {
     // Default limits (g salt)
     let limit = 1.5; // General: 1.5g salt (600mg sodium)
     
     if (isSnack) limit = 1.25; // Snack: 1.25g salt (500mg sodium)
     else if (category?.toLowerCase().includes('salsa')) limit = 0.75; // Salsas: 0.75g
     
     const saltGrams = sodioMg / 400; // Approx conversion
     
     if (saltGrams <= limit * 0.5) return { score: 0 };
     if (saltGrams <= limit) return { score: -5 };
     if (saltGrams <= limit * 1.5) return { score: -10, penalty: { key: 'penalties.highSodium' } };
     
     return { score: -15, penalty: { key: 'penalties.highSodiumSevere' } };
  }

  // --- 1. Nutrition Score (50 pts) ---
  private calculateNutritionScore(nutrition: NutritionInput, category?: string, productName: string = '') {
    let score = 50; 
    const penalties: HealthScoreMessage[] = [];
    const positives: HealthScoreMessage[] = [];

    const isSnack = (category && ['snacks', 'aperitivos', 'sweets', 'dulces', 'beverages', 'bebidas'].some(c => category.toLowerCase().includes(c))) ||
                    productName.toLowerCase().includes('snack') ||
                    productName.toLowerCase().includes('chip');

    // A. Densidad Calórica
    const kcal = nutrition.energy || 0;
    const protein = nutrition.protein || 0;
    const fiber = nutrition.fiber || 0;

    if (kcal > 400) {
        if (isSnack) {
            if (protein < 5 && fiber < 3) {
                score -= 15; // Snack vacío hipercalórico
                penalties.push({ key: 'penalties.highCalorieDensity' });
            } else {
                score -= 10; // Snack calórico
            }
        } else {
             // General foods (Nuts, Oil) - less severe if nutrient dense (handled by Ratio below)
             // But raw calorie penalty still applies slightly
             score -= 5;
        }
    } else if (kcal > 350 && isSnack) {
        score -= 8;
    }

    // B. Grasa Total (Snacks)
    const totalFat = nutrition.fat || 0;
    if (isSnack) {
        if (totalFat > 20) {
             score -= 10;
             penalties.push({ key: 'penalties.highFat' });
        } else if (totalFat > 15) {
             score -= 5;
        }
    }

    // C. Límites Estrictos
    // Sal
    const sodium = nutrition.sodium || 0;
    const saltRes = this.penalizarSal(sodium, category, isSnack || false);
    score += saltRes.score;
    if (saltRes.penalty) penalties.push(saltRes.penalty);

    // Azúcar (Original Logic is fine, maybe stricter?)
    const sugars = nutrition.sugars || 0;
    if (sugars > 20) {
         score -= 10;
         penalties.push({ key: 'penalties.highSugar' });
    } else if (sugars > 10) {
         score -= 5;
    }

    // Sat Fat
    const satFat = nutrition.saturatedFat || 0;
    if (satFat > 10) {
         score -= 8;
         penalties.push({ key: 'penalties.saturatedFat' });
    }

    // D. Ratio Calorías Vacías
    if (kcal > 0) {
        const dens = kcal / 100;
        // Sodium in g approx for this ratio: sodium/400
        const emptyCal = (sugars + satFat + (sodium/400)) / dens * 10; // Scale x10
        if (emptyCal > 40) {
             score -= 20;
             penalties.push({ key: 'penalties.emptyCaloriesSevere' });
        } else if (emptyCal > 20) {
             score -= 10;
             penalties.push({ key: 'penalties.emptyCalories' });
        }
    }

    // Legacy Bonus (Fiber) - OK to keep but careful not to over-reward
    if (fiber > 5 && !isSnack) { 
         score += 5;
         positives.push({ key: 'positives.fiber' });
    }

    return {
        score: Math.max(0, Math.min(50, score)),
        penalties,
        positives
    };
  }

  // --- 2. Ingredients Score (30 pts) ---
  private calculateIngredientsScore(ingredients: IngredientInput, isSnackFrito: boolean) {
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
        Object.entries(ADDITIVE_SYNONYMS).forEach(([code, synonyms]) => {
            if (synonyms.some(syn => {
                const normSyn = normalize(syn);
                return normalizedText.includes(normSyn);
            })) {
                detectedAdditives.add(code);
            }
        });
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
        
        // Bonus for simple list (Conditional)
        if (ingredients.ingredients.length <= 5 && ingredients.ingredients.length > 0) {
            // Anti-Deceptive Triad Check
            let allowBonus = true;
            
            if (isSnackFrito) allowBonus = false; // Never bonus fried snacks

            if (allowBonus && ingredients.ingredients.length <= 3) {
            if (allowBonus && ingredients.ingredients.length <= 3) {
                 // Check EN, ES, FR, PT
                 const ingLower = ingredients.ingredients.map(i => i.toLowerCase());
                 
                 // Logic: Must have (Potato OR Corn) AND (Oil) AND (Salt)
                 const hasPotato = ingLower.some(i => 
                    i.includes('patata') || i.includes('potato') || // ES/EN
                    i.includes('pomme de terre') || i.includes('batata') // FR/PT
                 );
                 
                 const hasCorn = ingLower.some(i => 
                    i.includes('maíz') || i.includes('corn') || i.includes('maiz') || // ES/EN
                    i.includes('mais') || i.includes('milho') // FR/PT
                 );
                 
                 const hasOil = ingLower.some(i => 
                    i.includes('aceite') || i.includes('oil') || i.includes('grasa') || i.includes('fat') || // ES/EN
                    i.includes('huile') || i.includes('graisse') || // FR
                    i.includes('óleo') || i.includes('azeite') || i.includes('gordura') // PT
                 );
                 
                 const hasSalt = ingLower.some(i => 
                    i.includes('sal') || i.includes('salt') || i.includes('sodio') || i.includes('sodium') || // ES/EN/PT
                    i.includes('sel') // FR
                 );

                 if ((hasPotato || hasCorn) && hasOil && hasSalt) {
                     allowBonus = false;
                 }
            }
            }

            if (allowBonus) {
                score += 2;
                positives.push({ key: 'positives.shortList' });
            }
        }
    }

    return {
        score: Math.max(0, Math.min(30, score)),
        penalties,
        positives
    };
  }

   // --- 3. Processing Score (20 pts) ---
   private calculateProcessingScore(processing: ProcessingInput, ingredients?: IngredientInput, isSnackFrito: boolean = false) {
     let score = 20; // Start perfect
     const penalties: HealthScoreMessage[] = [];
     const positives: HealthScoreMessage[] = [];
     
     // Default to provided NOVA group
     let nova = processing.novaGroup;
 
     // --- Advanced Heuristic Override ---
     
     // 0. Fried Snack = NOVA 4 (Instant)
     if (isSnackFrito) {
         nova = 4;
         penalties.push({ key: 'processing.ultraProcessedIng' }); 
     }

     // If NOVA is missing or low (1-3), verify against our UPF detector
     else if ((!nova || nova < 4) && ingredients?.ingredients) {
          const normalizedIngredients = ingredients.ingredients.map(i => i.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
          const normalizedText = normalizedIngredients.join(" ");
          
          let upfScore = 0;

          // A. Check DEFINITIVE terms (Weight: 2)
          UPF_DEFINITIVE_TERMS.forEach(term => {
              if (normalizedText.includes(term)) {
                  upfScore += 2;
              }
          });

          // B. Check SUSPICIOUS terms (Weight: 1)
          UPF_SUSPICIOUS_TERMS.forEach(term => {
              if (normalizedText.includes(term)) {
                  upfScore += 1;
              }
          });

          // C. Heuristic Rules
          if (upfScore >= 3) {
              nova = 4;
              penalties.push({ key: 'processing.ultraProcessedIng' }); 
          }
          else if (upfScore >= 2 && ingredients.ingredients.length > 5) {
               nova = 4;
               penalties.push({ key: 'processing.ultraProcessedIng' });
          }
     }
 
     if (nova) {
         if (nova === 4) {
             score = 0; // Lost all processing points
             const alreadyHasUpf = penalties.some(p => p.key === 'processing.ultraProcessedIng');
             if (!alreadyHasUpf) {
                  penalties.push({ key: 'processing.nova4' });
             }
         } else if (nova === 3) {
             score = 10;
             penalties.push({ key: 'processing.nova3' });
         } else if (nova === 1) {
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
    processing: ProcessingInput,
    category?: string,
    productName: string = '' // Add product name
  ): HealthScoreResult {
    
    // Detect Fried Snack Context
    const isSnackFrito = this.detectarSnackFrito(ingredients.ingredients || [], productName);

    const nutritionScore = this.calculateNutritionScore(nutrition, category, productName); // Max 50
    const ingredientsScore = this.calculateIngredientsScore(ingredients, isSnackFrito); // Max 30
    const processingScore = this.calculateProcessingScore(processing, ingredients, isSnackFrito); // Max 20

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

