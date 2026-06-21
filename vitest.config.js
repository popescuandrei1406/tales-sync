import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/ai.js', 'src/components/Timer.jsx'],
      exclude: ['node_modules/', 'src/main.jsx', 'src/App.jsx'],
      all: true
    }
  }
});
