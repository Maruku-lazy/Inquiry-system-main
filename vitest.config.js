// This backend is CommonJS ("type": "commonjs" in package.json), but
// Vitest itself is an ESM package — it cannot be require()'d directly
// inside a test file (`const { describe } = require('vitest')` fails).
// globals: true makes describe/test/expect ambient globals instead, so
// test files never need to import anything from vitest at all — they
// just require() the actual app code under test, same as any other file.
//
// A plain object export (not vitest/config's defineConfig helper) is
// used deliberately — defineConfig is optional IDE/type-hint sugar only,
// and importing it here triggers an unrelated Vite CJS deprecation
// warning with no functional benefit for a plain JS config like this.
module.exports = {
  test: {
    globals: true,
    environment: 'node',
  },
};
