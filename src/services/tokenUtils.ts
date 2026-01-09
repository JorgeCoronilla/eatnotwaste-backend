// Token utilities for product search
// Normalizes a query string and returns an array of tokens (words)
// Handles lower‑casing, accent removal, simple singularization (remove trailing 's'), and removes common stopwords.

const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'para', 'por', 'en', 'un', 'una', 'unos', 'unas',
]);

export function normalizeTokens(query: string): string[] {
  // Basic normalization: lower case, remove diacritics, trim
  const normalized = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

  // Split on whitespace
  const rawTokens = normalized.split(/\s+/).filter(Boolean);

  // Simple singularization: remove trailing 's' if word length > 3
  const singularized = rawTokens.map(tok => {
    if (tok.length > 3 && tok.endsWith('s')) {
      return tok.slice(0, -1);
    }
    return tok;
  });

  // Remove stopwords
  return singularized.filter(tok => !STOPWORDS.has(tok));
}
