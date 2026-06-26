import { describe, it, expect } from 'vitest';
import { normalizeTokens } from '../services/tokenUtils';

describe('normalizeTokens', () => {
  it('lowercases and removes diacritics', () => {
    expect(normalizeTokens('Ñoño')).toEqual(['nono']); // NFD decomposition removes ALL diacritics: ñ→n, ó→o
  });

  it('splits on whitespace', () => {
    expect(normalizeTokens('coca cola')).toEqual(['coca', 'cola']);
  });

  it('removes stopwords', () => {
    expect(normalizeTokens('leche de vaca')).toEqual(['leche', 'vaca']);
  });

  it('singularizes words longer than 3 chars ending in s', () => {
    expect(normalizeTokens('tomates')).toEqual(['tomate']);
    expect(normalizeTokens('huevos')).toEqual(['huevo']);
  });

  it('does NOT singularize short words (<= 3 chars)', () => {
    expect(normalizeTokens('los')).toEqual([]); // stopword removed first anyway
    expect(normalizeTokens('gas')).toEqual(['gas']); // 3 chars: not singularized
  });

  it('returns empty array for empty string', () => {
    expect(normalizeTokens('')).toEqual([]);
  });

  it('handles multi-word with stopwords and diacritics', () => {
    const result = normalizeTokens('Aceite de Oliva');
    // 'de' is stopword, 'aceite' and 'oliva' remain, 'aceite' > 3 chars ends in 'e' not 's'
    expect(result).toEqual(['aceite', 'oliva']);
  });
});
