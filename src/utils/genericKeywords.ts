// Generic/fresh-produce keyword detection for search.
//
// Used to skip OpenFoodFacts for queries that describe raw produce or staples:
// their catalogue returns irrelevant branded results for generic terms (e.g.
// searching "apple" returns gum, not apples).
//
// Detection uses normalizeTokens() so:
//   - Singularization: "tomates" → "tomate" → match
//   - Stopwords stripped: "huevos de corral" → ["huevo", "corral"] → no match (not all-generic)
//   - Diacritics removed: "ñame" → "name" → match if in list

import { normalizeTokens } from '../services/tokenUtils';

const GENERIC_KEYWORDS_BY_LANG: Record<string, Set<string>> = {
  es: new Set([
    // Vegetables
    'lechuga','ensalada','tomate','pepino','pimiento','zanahoria','cebolla','ajo',
    'brocoli','coliflor','espinaca','apio','nabo','ñame','puerro','alcachofa',
    'berenjena','calabacin','calabaza','champiñon','seta',
    // Fruits
    'manzana','platano','banana','naranja','limon','pera','uva','fresa','melon','sandia',
    'kiwi','mango','papaya','pina','ciruela','cereza','albaricoque','higo','granada',
    // Meat / fish / eggs
    'carne','pollo','pescado','cerdo','ternera','cordero','huevo',
    'salmon','atun','bacalao','merluza','gamba','langostino','mejillon',
    // Grains / legumes
    'pan','harina','arroz','lentejas','garbanzos','judias','frijoles','avena','pasta',
    // Dairy
    'leche','yogur','queso','mantequilla','nata',
    // Pantry staples
    'aceite','sal','azucar','vinagre','cafe','te',
  ]),
  en: new Set([
    // Vegetables
    'lettuce','salad','tomato','cucumber','pepper','carrot','onion','garlic',
    'broccoli','cauliflower','spinach','celery','turnip','leek','artichoke',
    'eggplant','zucchini','pumpkin','mushroom',
    // Fruits
    'apple','banana','orange','lemon','pear','grape','strawberry','melon','watermelon',
    'kiwi','mango','papaya','pineapple','plum','cherry','apricot','fig',
    // Meat / fish / eggs
    'meat','chicken','fish','pork','beef','lamb','egg',
    'salmon','tuna','cod','prawn','shrimp','mussel',
    // Grains / legumes
    'bread','flour','rice','lentil','chickpea','bean','oat','pasta',
    // Dairy
    'milk','yogurt','cheese','butter','cream',
    // Pantry staples
    'oil','salt','sugar','vinegar','coffee','tea',
  ]),
  fr: new Set([
    'laitue','salade','tomate','concombre','poivron','carotte','oignon','ail',
    'brocoli','choufleur','epinard','celeri','navet','poireau','artichaut',
    'aubergine','courgette','citrouille','champignon',
    'pomme','banane','orange','citron','poire','raisin','fraise','melon','pasteque',
    'kiwi','mangue','papaye','ananas','prune','cerise','abricot','figue',
    'viande','poulet','poisson','porc','boeuf','agneau','oeuf',
    'saumon','thon','cabillaud','crevette','moule',
    'pain','farine','riz','lentille','pois','haricot','avoine','pate',
    'lait','yaourt','fromage','beurre','creme',
    'huile','sel','sucre','vinaigre','cafe','the',
  ]),
  pt: new Set([
    'alface','salada','tomate','pepino','pimento','cenoura','cebola','alho',
    'brocolo','couve','espinafre','aipo','nabo','alho-frances','alcachofra',
    'beringela','courgette','abobora','cogumelo',
    'maca','banana','laranja','limao','pera','uva','morango','melao','melancia',
    'kiwi','manga','mamao','abacaxi','ameixa','cereja','damasco','figo',
    'carne','frango','peixe','porco','vaca','borrego','ovo',
    'salmao','atum','bacalhau','camrao','mexilhao',
    'pao','farinha','arroz','lentilha','grao','feijao','aveia','massa',
    'leite','iogurte','queijo','manteiga','nata',
    'azeite','sal','acucar','vinagre','cafe','cha',
  ]),
};

/**
 * Returns true when the query looks like a generic ingredient or fresh produce term
 * that should not be sent to OpenFoodFacts.
 *
 * Logic: ALL non-stopword tokens must map to generic keywords in the query language.
 * "huevos" → ["huevo"] → all generic → true
 * "huevos kinder" → ["huevo", "kinder"] → "kinder" not generic → false
 */
export function looksGenericOrFresh(query: string, language: string = 'es'): boolean {
  const tokens = normalizeTokens(query); // already lower + unaccented + singularized + no stopwords
  if (tokens.length === 0) return false;

  const keywords = GENERIC_KEYWORDS_BY_LANG[language] ?? GENERIC_KEYWORDS_BY_LANG['es']!;
  return tokens.every(tok => keywords.has(tok));
}
