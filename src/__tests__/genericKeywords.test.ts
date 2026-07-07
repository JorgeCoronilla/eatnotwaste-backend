import { describe, it, expect } from 'vitest';
import { looksGenericOrFresh } from '../utils/genericKeywords';

describe('looksGenericOrFresh', () => {
  // --- Spanish ---
  describe('es', () => {
    it('matches a single generic term', () => {
      expect(looksGenericOrFresh('tomate', 'es')).toBe(true);
    });

    it('matches after singularisation (tomates → tomate)', () => {
      expect(looksGenericOrFresh('tomates', 'es')).toBe(true);
    });

    it('matches after diacritic removal', () => {
      expect(looksGenericOrFresh('lechón', 'es')).toBe(false); // not in list
      expect(looksGenericOrFresh('leche', 'es')).toBe(true);
    });

    it('does NOT match a branded product', () => {
      expect(looksGenericOrFresh('huevo kinder', 'es')).toBe(false);
    });

    it('does NOT match a branded milk', () => {
      expect(looksGenericOrFresh('leche pascual', 'es')).toBe(false);
    });

    it('matches "huevos" via singularisation', () => {
      expect(looksGenericOrFresh('huevos', 'es')).toBe(true);
    });

    it('does NOT match a purely unknown term', () => {
      expect(looksGenericOrFresh('quinoa proteica', 'es')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(looksGenericOrFresh('', 'es')).toBe(false);
    });

    it('matches stopword-only query as false (no meaningful tokens)', () => {
      // "de" is a stopword → normalizeTokens("de") = [] → no tokens → false
      expect(looksGenericOrFresh('de', 'es')).toBe(false);
    });
  });

  // --- English ---
  describe('en', () => {
    it('matches a single generic term', () => {
      expect(looksGenericOrFresh('lettuce', 'en')).toBe(true);
    });

    it('matches plural (apples → apple)', () => {
      expect(looksGenericOrFresh('apples', 'en')).toBe(true);
    });

    it('does NOT match a branded product', () => {
      expect(looksGenericOrFresh('coca cola', 'en')).toBe(false);
    });

    it('does NOT match a flavoured variant', () => {
      expect(looksGenericOrFresh('chocolate milk', 'en')).toBe(false);
    });

    it('matches "milk" alone', () => {
      expect(looksGenericOrFresh('milk', 'en')).toBe(true);
    });
  });

  // --- French ---
  describe('fr', () => {
    it('matches a generic French term', () => {
      expect(looksGenericOrFresh('lait', 'fr')).toBe(true);
    });

    it('does NOT match a branded French product', () => {
      expect(looksGenericOrFresh('lait danone', 'fr')).toBe(false);
    });
  });

  // --- Portuguese ---
  describe('pt', () => {
    it('matches a generic Portuguese term', () => {
      expect(looksGenericOrFresh('leite', 'pt')).toBe(true);
    });

    it('does NOT match a branded Portuguese product', () => {
      expect(looksGenericOrFresh('leite mimosa', 'pt')).toBe(false);
    });
  });

  // --- Language fallback ---
  it('falls back to "es" for unknown language', () => {
    expect(looksGenericOrFresh('tomate', 'zh')).toBe(true); // falls back to es
  });
});
