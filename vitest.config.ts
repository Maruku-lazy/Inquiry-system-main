import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate from vite.config.ts deliberately — that file's dev-server proxy
// settings are irrelevant to tests, and keeping them apart avoids any
// accidental interaction between "how the dev server runs" and "how tests
// run."
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // jsdom simulates a browser DOM in Node — no real browser needed to
    // test that a button click updates state, a select renders its
    // options, etc. (Vitest's other option, 'node', has no DOM at all —
    // fine for pure logic, useless for React components.)
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
