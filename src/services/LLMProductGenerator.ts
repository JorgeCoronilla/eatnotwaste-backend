import axios from 'axios';
import { logger } from '../utils/logger';

interface GeneratedProduct {
  name: string;
  brand?: string | null;
  category?: string;
  subcategory?: string;
  description?: string;
  ingredients?: string | null; // string requerida por especificación
  allergens?: string[];
  nutritionalInfo?: Record<string, number>;
  imageUrl?: string | null;
}

export class LLMProductGenerator {
  static async generateGenericProduct(query: string, language: string = 'es'): Promise<GeneratedProduct | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OPENAI_API_KEY no configurado, no se puede generar producto genérico');
      return null;
    }

    const system = language === 'es'
      ? 'Eres un asistente experto en nutrición y supermercado. Solo generas productos genéricos cuando no hay datos reales. No mezcles datos inventados con fuentes reales. El resultado debe ser plausible pero estimado. No inventes marcas ni datos excesivamente específicos. Devuelve SOLO JSON válido con la estructura exacta solicitada.'
      : 'You are a nutrition and grocery expert. Only generate generic products when no real data exists. Do not mix invented data with real sources. Output should be plausible but estimated. Do not invent brands or overly specific data. Return ONLY valid JSON with the exact required structure.';

    const userPrompt = language === 'es'
      ? `Genera un objeto JSON con la siguiente estructura para un producto genérico no verificado basado en: "${query}".
IMPORTANTE: Si la entrada incluye una marca (ej: "Coca Cola", "Leche Pascual"), IGNORA LA MARCA y genera el producto genérico equivalente (ej: "Refresco de Cola", "Leche Entera").
{
  "name": "...",
  "brand": null,
  "category": "...",
  "subcategory": "...",
  "description": "...",
  "imageUrl": null,
  "nutritionalInfo": { "calories": ..., "protein": ..., "carbohydrates": ..., "fat": ..., "fiber": ..., "sugar": ..., "sodium": ... },
  "allergens": [ ... ],
  "ingredients": "...",
  "source": "llm",
  "sourceId": null,
  "isVerified": false
}
El resultado debe ser plausible pero puede ser estimado.
Si tiene marca, genera un nombre genérico.
No inventes datos excesivamente específicos.
Devuelve SOLO el JSON, sin texto adicional.`
      : `Generate a JSON object with the following structure for an unverified generic product based on: "${query}".
IMPORTANT: If the input includes a brand (e.g., "Coca Cola", "Heinz Ketchup"), IGNORE THE BRAND and generate the equivalent generic product (e.g., "Cola Soda", "Ketchup").
{
  "name": "...",
  "brand": null,
  "category": "...",
  "subcategory": "...",
  "description": "...",
  "imageUrl": null,
  "nutritionalInfo": { "calories": ..., "protein": ..., "carbohydrates": ..., "fat": ..., "fiber": ..., "sugar": ..., "sodium": ... },
  "allergens": [ ... ],
  "ingredients": "...",
  "source": "llm",
  "sourceId": null,
  "isVerified": false
}
Output must be plausible but may be estimated.
If it has a brand, generate a generic name.
Avoid overly specific data.
Return ONLY the JSON, no additional text.`;

    try {
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
      }, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000, // 8 seconds timeout
      });

      const content = resp.data?.choices?.[0]?.message?.content?.trim();
      if (!content) return null;

      // Intentar parsear JSON directo
      try {
        const data = JSON.parse(content);
        return {
          name: data.name,
          brand: data.brand ?? null,
          category: data.category,
          subcategory: data.subcategory,
          description: data.description,
          ingredients: data.ingredients ?? null,
          allergens: Array.isArray(data.allergens) ? data.allergens : [],
          nutritionalInfo: data.nutritionalInfo,
          imageUrl: data.imageUrl ?? null,
        } as GeneratedProduct;
      } catch {
        // Si viene con texto, extraer bloque JSON
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const data = JSON.parse(match[0]);
          return {
            name: data.name,
            brand: data.brand ?? null,
            category: data.category,
            subcategory: data.subcategory,
            description: data.description,
            ingredients: data.ingredients ?? null,
            allergens: Array.isArray(data.allergens) ? data.allergens : [],
            nutritionalInfo: data.nutritionalInfo,
            imageUrl: data.imageUrl ?? null,
          } as GeneratedProduct;
        }
        return null;
      }
    } catch (error: any) {
      console.error('Error generating LLM product:', error?.response?.data || error?.message || error);
      logger.warn('Error generando producto genérico con LLM:', error?.message || error);
      return null;
    }
  }
}

export default LLMProductGenerator;