import { vi, describe, it, expect, beforeEach } from 'vitest';

// Set up env variables before any import
vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaSyFakeKey12345');

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => {
      return {
        getGenerativeModel: mockGetGenerativeModel,
      };
    }),
  };
});

// Import ai service
import {
  generateIntro,
  generatePlayerPart,
  generateBridge,
  generateIntroFallback,
  generatePlayerPartFallback,
  generateBridgeFallback,
} from '../src/services/ai';

describe('AI Services and Fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fallback Generators', () => {
    it('generateIntroFallback returns a random intro text', () => {
      const intro = generateIntroFallback();
      expect(intro).toBeTypeOf('string');
      expect(intro.length).toBeGreaterThan(0);
    });

    it('generatePlayerPartFallback returns a text for any requested genre', () => {
      const genres = ['Horror', 'SF', 'Fantasy', 'Comedie', 'Dramă', 'Mister', 'Romance', 'Aventură'];
      genres.forEach((genre) => {
        const text = generatePlayerPartFallback('', genre);
        expect(text).toBeTypeOf('string');
        expect(text.length).toBeGreaterThan(0);
      });
    });

    it('generatePlayerPartFallback falls back to Mister for unknown genres', () => {
      const text = generatePlayerPartFallback('', 'MysteryThrillerNonExistent');
      expect(text).toBeTypeOf('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('generatePlayerPartFallback prevents duplicate text from previous turn', () => {
      const genre = 'Horror';
      // First, get a fallback
      const prevText = generatePlayerPartFallback('', genre);
      // Generate a new one passing the previous text as context
      const nextText = generatePlayerPartFallback(prevText, genre);
      // They should be different
      expect(nextText).not.toBe(prevText);
    });

    it('generateBridgeFallback returns a bridge text for any requested genre', () => {
      const genres = ['Horror', 'SF', 'Fantasy', 'Comedie', 'Dramă', 'Mister', 'Romance', 'Aventură'];
      genres.forEach((genre) => {
        const bridge = generateBridgeFallback('', genre);
        expect(bridge).toBeTypeOf('string');
        expect(bridge.length).toBeGreaterThan(0);
      });
    });

    it('generateBridgeFallback falls back to Mister for unknown genres', () => {
      const bridge = generateBridgeFallback('', 'UnknownGenre');
      expect(bridge).toBeTypeOf('string');
      expect(bridge.length).toBeGreaterThan(0);
    });

    it('generateBridgeFallback prevents duplicate bridge text', () => {
      const genre = 'Fantasy';
      const prevBridge = generateBridgeFallback('', genre);
      const nextBridge = generateBridgeFallback(prevBridge, genre);
      expect(nextBridge).not.toBe(prevBridge);
    });
  });

  describe('Main AI API Methods', () => {
    it('generateIntro calls getGenerativeModel and returns AI response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'A fost odată ca niciodată...',
        },
      });

      const intro = await generateIntro(['SF', 'Horror']);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-1.5-flash' });
      expect(intro).toBe('A fost odată ca niciodată...');
    });

    it('generateIntro falls back to fallback generator on AI failure', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API quota exceeded'));

      const intro = await generateIntro(['SF', 'Horror']);
      expect(intro).toBeTypeOf('string');
      expect(intro.length).toBeGreaterThan(0);
    });

    it('generatePlayerPart calls getGenerativeModel and returns AI response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Nava spațială s-a defectat brusc.',
        },
      });

      const text = await generatePlayerPart('Ceața s-a lăsat peste oraș.', 'SF');
      expect(text).toBe('Nava spațială s-a defectat brusc.');
    });

    it('generatePlayerPart falls back to fallback generator on AI failure', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Network error'));

      const text = await generatePlayerPart('Ceața s-a lăsat peste oraș.', 'Horror');
      expect(text).toBeTypeOf('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('generateBridge calls getGenerativeModel and returns AI response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Dar o lumină ciudată a început să strălucească.',
        },
      });

      const bridge = await generateBridge('Omul se plimba pe stradă.', 'Fantasy');
      expect(bridge).toBe('Dar o lumină ciudată a început să strălucească.');
    });

    it('generateBridge falls back to fallback generator on AI failure', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Timeout'));

      const bridge = await generateBridge('Omul se plimba pe stradă.', 'Comedie');
      expect(bridge).toBeTypeOf('string');
      expect(bridge.length).toBeGreaterThan(0);
    });
  });
});
