import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock speechSynthesis
if (typeof window !== 'undefined') {
  window.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn().mockReturnValue([]),
  };
}
